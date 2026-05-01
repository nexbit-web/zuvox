// src/routes/api/orders/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { limit } from '$lib/rate-limit'
import { Money } from '$lib/server/wallet'
import {
  validateOrderAmount,
  AUTO_COMPLETE_DAYS,
  calcGigCommission,
} from '$lib/server/pricing'
import { debit } from '$lib/server/wallet'
import type { RequestHandler } from './$types'

/**
 * GET /api/orders?role=client|freelancer&status=ACTIVE|COMPLETED|CANCELLED
 * Повертає мої замовлення.
 */
export const GET: RequestHandler = async ({ request, url }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const role = url.searchParams.get('role') ?? 'all'
  const statusFilter = url.searchParams.get('status') ?? 'all'
  const userId = session.user.id

  // Які статуси показуємо
  let statusList: string[] | undefined
  if (statusFilter === 'ACTIVE') {
    statusList = ['NEGOTIATING', 'ACCEPTED', 'DELIVERED']
  } else if (statusFilter === 'COMPLETED') {
    statusList = ['COMPLETED']
  } else if (statusFilter === 'CANCELLED') {
    statusList = ['CANCELLED']
  }

  const where = {
    AND: [
      role === 'client'
        ? { clientId: userId }
        : role === 'freelancer'
          ? { freelancerId: userId }
          : { OR: [{ clientId: userId }, { freelancerId: userId }] },
      statusList ? { status: { in: statusList as any } } : {},
    ],
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      priceCents: true,
      currency: true,
      status: true,
      source: true,
      deadlineAt: true,
      createdAt: true,
      updatedAt: true,
      acceptedAt: true,
      deliveredAt: true,
      completedAt: true,
      clientId: true,
      freelancerId: true,
      client: {
        select: { id: true, name: true, username: true, avatar: true },
      },
      freelancer: {
        select: { id: true, name: true, username: true, avatar: true },
      },
      gig: {
        select: { id: true, title: true },
      },
    },
    take: 100,
  })

  return json({ orders })
}

/**
 * POST /api/orders
 * Створити замовлення (Direct, з чату).
 *
 * Body:
 *   {
 *     freelancerId: string
 *     title: string
 *     description: string
 *     priceUah: number          (у гривнях, конвертуємо в копійки)
 *     deliveryDays?: number
 *     chatId?: string
 *   }
 *
 * Хто може створити: тільки клієнт. Чи має він чат з фрілансером —
 * перевіряємо. Списувань на цьому етапі немає (DIRECT order не списує
 * lead fee — лід вже є по факту їхнього спілкування).
 */
export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  // Rate-limit: 10 заказів / годину
  const rl = limit(`order:create:${session.user.id}`, {
    points: 10,
    duration: 60 * 60_000,
  })
  if (!rl.success) throw error(429, 'Too many orders')

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const freelancerId = String(body.freelancerId ?? '')
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const priceUah = Number(body.priceUah)
  const deliveryDays = body.deliveryDays
    ? Math.max(1, Math.min(180, Number(body.deliveryDays)))
    : null
  const chatId = body.chatId ? String(body.chatId) : null

  // Валідація
  if (!freelancerId) throw error(400, 'freelancerId required')
  if (freelancerId === session.user.id) {
    throw error(400, 'Не можна створити замовлення для себе')
  }
  if (title.length < 5) throw error(400, 'Заголовок занадто короткий')
  if (title.length > 200) throw error(400, 'Заголовок занадто довгий')
  if (description.length < 20) {
    throw error(400, 'Опис занадто короткий (мінімум 20 символів)')
  }
  if (description.length > 5000) {
    throw error(400, 'Опис занадто довгий')
  }
  if (!Number.isFinite(priceUah) || priceUah <= 0) {
    throw error(400, 'Невірна ціна')
  }

  const priceCents = Money.toCents(priceUah)
  const amountErr = validateOrderAmount(priceCents)
  if (amountErr) throw error(400, amountErr)

  // Перевірка фрілансера
  const freelancer = await prisma.user.findUnique({
    where: { id: freelancerId },
    select: { id: true, role: true, name: true },
  })
  if (!freelancer || freelancer.role !== 'FREELANCER') {
    throw error(404, 'Майстра не знайдено')
  }

  // Перевірка чату — обов'язково має бути спільний чат
  // (захист від спаму замовленнями невідомим людям)
  if (chatId) {
    const member = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: session.user.id } },
      select: { id: true },
    })
    if (!member) throw error(403, 'Ви не учасник цього чату')
  } else {
    // Без chatId — перевіряємо чи взагалі є спільний чат
    const sharedChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { members: { some: { userId: session.user.id } } },
          { members: { some: { userId: freelancerId } } },
        ],
      },
      select: { id: true },
    })
    if (!sharedChat) {
      throw error(403, 'Спочатку напишіть майстру у чат')
    }
  }

  // Deadline розрахунок
  const deadlineAt = deliveryDays
    ? new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000)
    : null

  // Створюємо у транзакції з audit log
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        clientId: session.user.id,
        freelancerId,
        title,
        description,
        priceCents,
        currency: 'UAH',
        deliveryDays,
        deadlineAt,
        chatId,
        source: 'DIRECT',
        status: 'NEGOTIATING',
      },
      select: {
        id: true,
        title: true,
        priceCents: true,
        currency: true,
        status: true,
        clientId: true,
        freelancerId: true,
        chatId: true,
        createdAt: true,
      },
    })

    await tx.orderEvent.create({
      data: {
        orderId: created.id,
        type: 'CREATED',
        actorId: session.user.id,
        payload: { source: 'DIRECT' } as any,
      },
    })

    return created
  })

  return json({ order }, { status: 201 })
}
