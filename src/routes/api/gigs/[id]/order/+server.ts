// src/routes/api/gigs/[id]/order/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { limit } from '$lib/rate-limit'
import { calcGigCommission } from '$lib/server/pricing'
import { debit, hasBalance, Money } from '$lib/server/wallet'
import type { RequestHandler } from './$types'

/**
 * POST /api/gigs/[id]/order
 *
 * Body: { tier: 'BASIC' | 'STANDARD' | 'PREMIUM', requirements?: string }
 *
 * Створює замовлення на конкретний пакет гіга.
 * Атомарно списує 10% комісії з балансу фрілансера.
 *
 * Перевірки:
 *   • Юзер залогінений
 *   • Не свій власний гіг
 *   • Гіг ACTIVE
 *   • Пакет існує
 *   • У фрілансера достатньо коштів на балансі для комісії
 *
 * Статус замовлення: NEGOTIATING (фрілансер має явно прийняти).
 * Це захищає фрілансера від ситуації коли він на канікулах і не може взяти заказ.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  // Rate limit
  const rl = limit(`gig:order:${session.user.id}`, {
    points: 20,
    duration: 60 * 60_000,
  })
  if (!rl.success) throw error(429, 'Занадто багато замовлень')

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const tier = String(body.tier ?? '').toUpperCase()
  if (!['BASIC', 'STANDARD', 'PREMIUM'].includes(tier)) {
    throw error(400, 'Невірний тип пакету')
  }

  const requirements = body.requirements
    ? String(body.requirements).trim().slice(0, 5000)
    : ''

  // Знаходимо гіг + пакет в одному запиті
  const gig = await prisma.gig.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
    },
    select: {
      id: true,
      title: true,
      sellerId: true,
      status: true,
      packages: {
        where: { tier: tier as any },
        select: {
          id: true,
          tier: true,
          priceCents: true,
          deliveryDays: true,
        },
        take: 1,
      },
    },
  })

  if (!gig) throw error(404, 'Послугу не знайдено')
  if (gig.status !== 'ACTIVE') throw error(400, 'Послуга наразі недоступна')
  if (gig.sellerId === session.user.id) {
    throw error(400, 'Не можна замовити свою послугу')
  }
  if (gig.packages.length === 0) {
    throw error(400, `Пакет ${tier} відсутній у цього гіга`)
  }

  const pkg = gig.packages[0]
  const priceCents = pkg.priceCents
  const commissionCents = calcGigCommission(priceCents)

  // ─── ПЕРЕВІРКА БАЛАНСУ фрілансера ───
  // Якщо у нього недостатньо для комісії — блокуємо замовлення.
  // Альтернатива: дозволити овердрафт, але це проблема для платформи.
  const enoughBalance = await hasBalance(gig.sellerId, commissionCents)
  if (!enoughBalance) {
    throw error(
      402, // Payment Required
      'Майстер не може прийняти замовлення зараз — недостатньо коштів на балансі',
    )
  }

  // Гарантуємо чат — якщо ще не існує, створюємо
  // (для DIRECT message-based flow)
  const existingChat = await prisma.chat.findFirst({
    where: {
      AND: [
        { members: { some: { userId: session.user.id } } },
        { members: { some: { userId: gig.sellerId } } },
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
          create: [{ userId: session.user.id }, { userId: gig.sellerId }],
        },
      },
      select: { id: true },
    })
    chatId = newChat.id
  }

  // ─── СТВОРЮЄМО ЗАМОВЛЕННЯ + СПИСУЄМО КОМІСІЮ В ОДНІЙ ТРАНЗАКЦІЇ ───
  const deadlineAt = new Date(
    Date.now() + pkg.deliveryDays * 24 * 60 * 60 * 1000,
  )

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        clientId: session.user.id,
        freelancerId: gig.sellerId,
        gigId: gig.id,
        source: 'GIG_PURCHASE',
        title: `${gig.title} — ${tierLabel(tier)}`,
        description: requirements || `Замовлення пакету ${tierLabel(tier)}`,
        priceCents,
        currency: 'UAH',
        deliveryDays: pkg.deliveryDays,
        deadlineAt,
        status: 'NEGOTIATING',
        chatId,
        leadFeeCents: commissionCents, // зберігаємо для прозорості
      },
      select: {
        id: true,
        title: true,
        priceCents: true,
        currency: true,
        status: true,
        deliveryDays: true,
        deadlineAt: true,
        chatId: true,
        clientId: true,
        freelancerId: true,
      },
    })

    // Списуємо комісію з балансу фрілансера
    await debit(
      {
        userId: gig.sellerId,
        amountCents: commissionCents,
        type: 'GIG_COMMISSION',
        description: `Комісія 10% за замовлення гіга "${gig.title}"`,
        orderId: created.id,
      },
      tx,
    )

    // Інкремент orders count гіга
    await tx.gig.update({
      where: { id: gig.id },
      data: { ordersCount: { increment: 1 } },
    })

    // Audit log
    await tx.orderEvent.create({
      data: {
        orderId: created.id,
        type: 'CREATED',
        actorId: session.user.id,
        payload: {
          source: 'GIG_PURCHASE',
          tier,
          commissionCents,
        } as any,
      },
    })

    return created
  })

  return json({ order }, { status: 201 })
}

function tierLabel(tier: string): string {
  switch (tier) {
    case 'BASIC':
      return 'Базовий'
    case 'STANDARD':
      return 'Стандартний'
    case 'PREMIUM':
      return 'Преміум'
    default:
      return tier
  }
}
