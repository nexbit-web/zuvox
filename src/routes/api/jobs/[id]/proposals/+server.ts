// src/routes/api/jobs/[id]/proposals/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { limit } from '$lib/rate-limit'
import { debit, hasBalance, Money } from '$lib/server/wallet'
import { getLeadFee, validateOrderAmount } from '$lib/server/pricing'
import { Notify } from '$lib/server/notifications'
import type { RequestHandler } from './$types'

/**
 * POST /api/jobs/[id]/proposals — відправити proposal на job.
 *
 * НАЙВАЖЛИВІШИЙ endpoint в системі лідів. Тут ми атомарно:
 *   1. Перевіряємо що job існує і OPEN
 *   2. Перевіряємо що фрілансер ще НЕ відправляв proposal на цей job
 *   3. Перевіряємо що є БАЛАНС для lead fee
 *   4. Створюємо Proposal
 *   5. Списуємо lead fee
 *   6. Інкрементимо proposalsCount
 *
 * Якщо хоча б один крок падає — нічого не змінюється.
 *
 * Перевірки безпеки:
 *   • Юзер залогінений
 *   • role === FREELANCER (тільки фрілансери відгукуються)
 *   • Не свій job
 *   • Job статус OPEN
 *   • Job не expired
 *   • Унікальність (jobId, freelancerId)
 *   • Достатньо коштів для lead fee (50 грн)
 *
 * Після успіху (поза транзакцією, fail-soft):
 *   • Сповіщення клієнту про новий відгук
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  // Rate limit
  const rl = limit(`proposal:${session.user.id}`, {
    points: 30,
    duration: 60 * 60_000,
  })
  if (!rl.success) throw error(429, 'Занадто багато відгуків')

  // Перевіряємо що юзер фрілансер
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  if (!me || me.role !== 'FREELANCER') {
    throw error(403, 'Тільки фрілансери можуть відгукуватись на заявки')
  }

  // Парсимо body
  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const coverLetter = String(body.coverLetter ?? '').trim()
  const proposedPriceUah = Number(body.proposedPriceUah)
  const proposedDays = Number(body.proposedDays)

  if (coverLetter.length < 30) {
    throw error(400, 'Мотиваційний лист занадто короткий (мінімум 30 символів)')
  }
  if (coverLetter.length > 5000) {
    throw error(400, 'Мотиваційний лист занадто довгий')
  }
  if (!Number.isFinite(proposedPriceUah) || proposedPriceUah <= 0) {
    throw error(400, 'Вкажіть ціну')
  }
  const proposedPriceCents = Money.toCents(proposedPriceUah)
  const priceErr = validateOrderAmount(proposedPriceCents)
  if (priceErr) throw error(400, priceErr)

  if (
    !Number.isInteger(proposedDays) ||
    proposedDays < 1 ||
    proposedDays > 180
  ) {
    throw error(400, 'Невірний термін (1-180 днів)')
  }

  // Знаходимо job
  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      clientId: true,
      status: true,
      expiresAt: true,
      category: true,
    },
  })
  if (!job) throw error(404, 'Заявку не знайдено')
  if (job.clientId === session.user.id) {
    throw error(400, 'Не можна відгукнутись на свою заявку')
  }
  if (job.status !== 'OPEN') {
    throw error(400, 'Заявка більше не приймає відгуки')
  }
  if (job.expiresAt < new Date()) {
    throw error(400, 'Термін подачі відгуків минув')
  }

  // Чи вже відправляв
  const existing = await prisma.proposal.findUnique({
    where: {
      jobId_freelancerId: {
        jobId: job.id,
        freelancerId: session.user.id,
      },
    },
    select: { id: true, status: true },
  })
  if (existing) {
    if (existing.status === 'WITHDRAWN') {
      throw error(400, 'Ви вже відкликали свій відгук на цю заявку')
    }
    throw error(400, 'Ви вже відправили відгук на цю заявку')
  }

  // ─── ПЕРЕВІРКА БАЛАНСУ ───
  const leadFeeCents = getLeadFee(job.category)
  const enoughBalance = await hasBalance(session.user.id, leadFeeCents)
  if (!enoughBalance) {
    throw error(
      402,
      `Недостатньо коштів. Потрібно ${Money.format(leadFeeCents)} для відгуку. Поповніть баланс.`,
    )
  }

  // ─── СТВОРЮЄМО PROPOSAL + СПИСУЄМО LEAD FEE ───
  const proposal = await prisma.$transaction(async (tx) => {
    // 1. Створюємо proposal
    const created = await tx.proposal.create({
      data: {
        jobId: job.id,
        freelancerId: session.user.id,
        coverLetter,
        proposedPriceCents,
        proposedDays,
        status: 'SUBMITTED',
        leadFeeCents,
      },
      select: {
        id: true,
        coverLetter: true,
        proposedPriceCents: true,
        proposedDays: true,
        status: true,
        leadFeeCents: true,
        createdAt: true,
      },
    })

    // 2. Списуємо lead fee
    await debit(
      {
        userId: session.user.id,
        amountCents: leadFeeCents,
        type: 'LEAD_FEE',
        description: `Лід за заявку: ${job.id}`,
      },
      tx,
    )

    // 3. Інкрементимо лічильник
    await tx.job.update({
      where: { id: job.id },
      data: { proposalsCount: { increment: 1 } },
    })

    return created
  })

  // ─── Поза транзакцією: сповіщення клієнту (fail-soft) ───
  try {
    await Notify.proposalNew(job.clientId, job.id, proposal.id)
  } catch (err) {
    console.error('[proposal:new] notification error', err)
  }

  return json({ proposal }, { status: 201 })
}

/**
 * GET /api/jobs/[id]/proposals — список proposals для job.
 *
 * Доступ:
 *   • Власник job — бачить всі
 *   • Інші — 403
 */
export const GET: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const job = await prisma.job.findUnique({
    where: { id: params.id },
    select: { id: true, clientId: true },
  })
  if (!job) throw error(404, 'Не знайдено')
  if (job.clientId !== session.user.id) {
    throw error(403, 'Доступ заборонено')
  }

  const proposals = await prisma.proposal.findMany({
    where: { jobId: job.id },
    orderBy: { createdAt: 'desc' },
    include: {
      freelancer: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          verificationStatus: true,
          freelancerProfile: {
            select: {
              avgRating: true,
              reviewsCount: true,
              completedOrders: true,
              hourlyRate: true,
              experience: true,
              languages: true,
            },
          },
        },
      },
    },
  })

  return json({ proposals })
}
