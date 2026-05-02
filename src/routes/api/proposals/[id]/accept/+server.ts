// src/routes/api/proposals/[id]/accept/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { Notify } from '$lib/server/notifications'
import type { RequestHandler } from './$types'

/**
 * POST /api/proposals/[id]/accept
 *
 * Клієнт обирає цей proposal. Атомарно:
 *   1. Створюється Order зі статусом NEGOTIATING
 *      (фрілансер ще має явно прийняти конкретні деталі)
 *   2. Цей Proposal → ACCEPTED
 *   3. Усі інші Proposals на цей Job → REJECTED
 *   4. Job → CLOSED + selectedOrderId
 *   5. Створюється чат якщо немає
 *   6. Audit log в OrderEvent
 *
 * Після успіху (поза транзакцією, fail-soft):
 *   • Сповіщення обраному фрілансеру про те що його обрали
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const proposal = await prisma.proposal.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      jobId: true,
      freelancerId: true,
      coverLetter: true,
      proposedPriceCents: true,
      proposedDays: true,
      status: true,
      job: {
        select: {
          id: true,
          title: true,
          description: true,
          clientId: true,
          status: true,
        },
      },
    },
  })

  if (!proposal) throw error(404, 'Proposal не знайдено')

  // Доступ — тільки клієнт-власник
  if (proposal.job.clientId !== session.user.id) {
    throw error(403, 'Тільки замовник може обрати фрілансера')
  }

  if (proposal.job.status !== 'OPEN') {
    throw error(400, 'Заявка вже закрита')
  }
  if (proposal.status !== 'SUBMITTED') {
    throw error(400, 'Цей відгук вже неактивний')
  }

  // ─── Гарантуємо чат між клієнтом і фрілансером ───
  const existingChat = await prisma.chat.findFirst({
    where: {
      AND: [
        { members: { some: { userId: session.user.id } } },
        { members: { some: { userId: proposal.freelancerId } } },
      ],
    },
    select: { id: true, _count: { select: { members: true } } },
  })

  let chatId: string
  if (existingChat && existingChat._count.members === 2) {
    chatId = existingChat.id
  } else {
    const newChat = await prisma.chat.create({
      data: {
        members: {
          create: [
            { userId: session.user.id },
            { userId: proposal.freelancerId },
          ],
        },
      },
      select: { id: true },
    })
    chatId = newChat.id
  }

  // ─── Розраховуємо deadline ───
  const deadlineAt = new Date(
    Date.now() + proposal.proposedDays * 24 * 60 * 60 * 1000,
  )

  // ─── Атомарно створюємо все ───
  const result = await prisma.$transaction(async (tx) => {
    // 1. Створюємо Order
    const order = await tx.order.create({
      data: {
        clientId: session.user.id,
        freelancerId: proposal.freelancerId,
        source: 'JOB_PROPOSAL',
        title: proposal.job.title,
        description: proposal.job.description,
        priceCents: proposal.proposedPriceCents,
        currency: 'UAH',
        deliveryDays: proposal.proposedDays,
        deadlineAt,
        chatId,
        status: 'NEGOTIATING',
        // gigId не вказуємо — це не з gig
      },
      select: {
        id: true,
        title: true,
        priceCents: true,
        currency: true,
        status: true,
        chatId: true,
        clientId: true,
        freelancerId: true,
      },
    })

    // 2. Помічаємо вибраний proposal як ACCEPTED
    await tx.proposal.update({
      where: { id: proposal.id },
      data: { status: 'ACCEPTED' },
    })

    // 3. Помічаємо всі інші proposals на цей job як REJECTED
    await tx.proposal.updateMany({
      where: {
        jobId: proposal.jobId,
        id: { not: proposal.id },
        status: 'SUBMITTED',
      },
      data: { status: 'REJECTED' },
    })

    // 4. Закриваємо job
    await tx.job.update({
      where: { id: proposal.jobId },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        selectedOrderId: order.id,
      },
    })

    // 5. Audit log
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: 'CREATED',
        actorId: session.user.id,
        payload: {
          source: 'JOB_PROPOSAL',
          jobId: proposal.jobId,
          proposalId: proposal.id,
        } as any,
      },
    })

    return order
  })

  // ─── Поза транзакцією: сповіщення обраному фрілансеру (fail-soft) ───
  try {
    await Notify.proposalAccepted(
      proposal.freelancerId,
      result.id,
      proposal.jobId,
    )
  } catch (err) {
    console.error('[proposal:accept] notification error', err)
  }

  return json({ order: result }, { status: 201 })
}
