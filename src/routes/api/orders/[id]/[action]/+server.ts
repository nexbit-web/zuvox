// src/routes/api/orders/[id]/[action]/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import {
  canTransition,
  getActor,
  nextStatus,
  type OrderTransition,
} from '$lib/server/order-state-machine'
import { AUTO_COMPLETE_DAYS } from '$lib/server/pricing'
import { postOrderSystemMessage } from '$lib/server/system-message'
import { Notify, notify } from '$lib/server/notifications'
import type { RequestHandler } from './$types'

/**
 * POST /api/orders/[id]/[action]
 *
 * action ∈ ['accept', 'deliver', 'complete', 'revise', 'cancel']
 *
 * Універсальний endpoint для всіх переходів між статусами замовлення.
 * Логіка дозволу — у `order-state-machine.ts`.
 *
 * Безпека:
 *   • Перевірка членства у замовленні
 *   • Перевірка стану через state machine
 *   • Перевірка ролі (CLIENT/FREELANCER) через state machine
 *   • Атомарний перехід через prisma.$transaction
 *   • Audit log у OrderEvent
 *
 * Після успішного переходу (поза транзакцією, fail-soft):
 *   • System message у чат
 *   • Notification контрагенту
 */

const ACTION_TO_TRANSITION: Record<string, OrderTransition> = {
  accept: 'ACCEPT',
  deliver: 'DELIVER',
  complete: 'COMPLETE',
  revise: 'REQUEST_REVISION',
  cancel: 'CANCEL',
}

/** Перетворення transition → OrderEventType + system message type */
function transitionToEventType(transition: OrderTransition): string {
  switch (transition) {
    case 'ACCEPT':
      return 'ACCEPTED'
    case 'DELIVER':
      return 'DELIVERED'
    case 'COMPLETE':
      return 'COMPLETED'
    case 'CANCEL':
      return 'CANCELLED'
    case 'REQUEST_REVISION':
      return 'REVISION_REQUESTED'
    default:
      return 'CREATED'
  }
}

export const POST: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const transition = ACTION_TO_TRANSITION[params.action]
  if (!transition) throw error(400, 'Невідома дія')

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      status: true,
      clientId: true,
      freelancerId: true,
      acceptedAt: true,
      priceCents: true,
    },
  })
  if (!order) throw error(404, 'Замовлення не знайдено')

  const actor = getActor(session.user.id, order)
  if (!actor) throw error(403, 'Ви не учасник цього замовлення')

  // Перевіряємо state machine
  const errMsg = canTransition(order.status, transition, actor)
  if (errMsg) throw error(400, errMsg)

  const newStatus = nextStatus(transition)

  // Парсимо body для додаткових параметрів
  const body = await request.json().catch(() => ({}) as Record<string, unknown>)

  // ─── Виконуємо перехід у транзакції ───
  const updated = await prisma.$transaction(async (tx) => {
    const now = new Date()
    const data: any = { status: newStatus, updatedAt: now }

    switch (transition) {
      case 'ACCEPT': {
        data.acceptedAt = now
        break
      }
      case 'DELIVER': {
        data.deliveredAt = now
        // Авто-завершення через 7 днів
        data.autoCompleteAt = new Date(
          now.getTime() + AUTO_COMPLETE_DAYS * 24 * 60 * 60 * 1000,
        )

        // Сданные работы (опційно)
        if (Array.isArray(body.deliverables)) {
          data.deliverables = body.deliverables
            .filter((u: unknown) => typeof u === 'string')
            .slice(0, 20) // ліміт 20 файлів
        }
        if (typeof body.deliveryNote === 'string') {
          data.deliveryNote = body.deliveryNote.slice(0, 5000)
        }
        break
      }
      case 'COMPLETE': {
        data.completedAt = now
        data.autoCompleteAt = null

        // Інкремент лічильників фрілансера
        await tx.freelancerProfile.update({
          where: { userId: order.freelancerId },
          data: {
            completedOrders: { increment: 1 },
          },
        })
        break
      }
      case 'REQUEST_REVISION': {
        // Повертаємось у ACCEPTED — фрілансер знову працює
        // Скидаємо deliveredAt? Ні, щоб історія залишилась.
        // Просто змінюємо статус.
        data.autoCompleteAt = null
        break
      }
      case 'CANCEL': {
        data.cancelledAt = now
        data.cancelledById = session.user.id
        const reason = String(body.reason ?? '').trim()
        if (reason.length > 500) throw error(400, 'Причина занадто довга')
        data.cancelReason = reason || null

        // Якщо замовлення ще не було ACCEPTED — фрілансер не отримує
        // нічого і клієнт ніколи не платив, тому нічого не робимо.
        // Якщо було ACCEPTED — теж нічого: гроші ще не йшли.
        // (При escrow-моделі тут був би refund.)
        break
      }
    }

    // Інкрементуємо totalOrders фрілансера при першому переході у ACCEPTED
    if (transition === 'ACCEPT') {
      await tx.freelancerProfile.update({
        where: { userId: order.freelancerId },
        data: { totalOrders: { increment: 1 } },
      })
    }

    const result = await tx.order.update({
      where: { id: order.id },
      data,
      select: {
        id: true,
        status: true,
        priceCents: true,
        currency: true,
        title: true,
        clientId: true,
        freelancerId: true,
        acceptedAt: true,
        deliveredAt: true,
        completedAt: true,
        cancelledAt: true,
        cancelReason: true,
        deliverables: true,
        deliveryNote: true,
        autoCompleteAt: true,
        chatId: true,
      },
    })

    // Audit log
    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        type: transitionToEventType(transition) as any,
        actorId: session.user.id,
        payload:
          transition === 'CANCEL'
            ? ({ reason: data.cancelReason } as any)
            : null,
      },
    })

    return result
  })

  // ─── Поза транзакцією: system message + notification (fail-soft) ───
  // Цей блок не повинен ламати основну операцію якщо щось піде не так,
  // тому помилки тут просто логуються.

  const eventType = transitionToEventType(transition)

  // 1. System message у чат
  if (updated.chatId) {
    try {
      await postOrderSystemMessage({
        chatId: updated.chatId,
        eventType,
        orderId: updated.id,
        actorId: session.user.id,
        extra:
          transition === 'CANCEL' && updated.cancelReason
            ? updated.cancelReason
            : undefined,
      })
    } catch (err) {
      console.error('[order-action] system message error', err)
    }
  }

  // 2. Notification контрагенту
  // Визначаємо хто отримує сповіщення
  try {
    const recipientId =
      actor === 'CLIENT' ? updated.freelancerId : updated.clientId

    switch (transition) {
      case 'ACCEPT':
        // Майстер прийняв → клієнт дізнається
        await Notify.orderAccepted(updated.clientId, updated.id)
        break
      case 'DELIVER':
        // Майстер здав → клієнт перевіряє
        await Notify.orderDelivered(updated.clientId, updated.id)
        break
      case 'COMPLETE':
        // Клієнт прийняв → фрілансер радіє
        await Notify.orderCompleted(updated.freelancerId, updated.id)
        break
      case 'REQUEST_REVISION':
        // Клієнт запросив правки → фрілансер бачить
        await notify({
          userId: updated.freelancerId,
          type: 'ORDER_REVISION',
          title: 'Запит на правки',
          body: 'Клієнт попросив внести правки',
          orderId: updated.id,
        })
        break
      case 'CANCEL':
        // Сповіщаємо ту сторону яка НЕ скасовувала
        await notify({
          userId: recipientId,
          type: 'ORDER_CANCELLED',
          title: 'Замовлення скасовано',
          body: updated.cancelReason ?? 'Замовлення скасовано контрагентом',
          orderId: updated.id,
        })
        break
    }
  } catch (err) {
    console.error('[order-action] notification error', err)
  }

  return json({ order: updated })
}
