// src/lib/server/order-state-machine.ts

import type { OrderStatus } from "../../generated/prisma/client"

/**
 * Order state machine — централізована логіка переходів між статусами.
 *
 * Правила безпеки:
 *   • Переходи описані ЯВНО в дозволеній мапі — будь-який інший вважається помилкою
 *   • Кожен перехід знає хто його може ініціювати (CLIENT / FREELANCER / SYSTEM)
 *   • TERMINAL стани (COMPLETED, CANCELLED) не мають виходів
 *   • Валідація відбувається ДО запису в БД, у тій самій транзакції
 */

export type Actor = 'CLIENT' | 'FREELANCER' | 'SYSTEM'

export type OrderTransition =
  | 'ACCEPT'
  | 'DELIVER'
  | 'COMPLETE'
  | 'REQUEST_REVISION'
  | 'CANCEL'
  | 'AUTO_COMPLETE'

interface TransitionRule {
  from: OrderStatus
  to: OrderStatus
  allowedActors: Actor[]
}

const TRANSITIONS: Record<OrderTransition, TransitionRule> = {
  ACCEPT: {
    from: 'NEGOTIATING',
    to: 'ACCEPTED',
    allowedActors: ['FREELANCER'],
  },
  DELIVER: {
    from: 'ACCEPTED',
    to: 'DELIVERED',
    allowedActors: ['FREELANCER'],
  },
  COMPLETE: {
    from: 'DELIVERED',
    to: 'COMPLETED',
    allowedActors: ['CLIENT'],
  },
  AUTO_COMPLETE: {
    from: 'DELIVERED',
    to: 'COMPLETED',
    allowedActors: ['SYSTEM'],
  },
  REQUEST_REVISION: {
    from: 'DELIVERED',
    to: 'ACCEPTED',
    allowedActors: ['CLIENT'],
  },
  // CANCEL обробляється окремо — дозволений з NEGOTIATING/ACCEPTED/DELIVERED
  CANCEL: {
    from: 'NEGOTIATING', // буде перевірятись окремо
    to: 'CANCELLED',
    allowedActors: ['CLIENT', 'FREELANCER'],
  },
}

/**
 * Перевіряє чи дозволений конкретний перехід.
 *
 * @returns null якщо дозволено, або рядок з причиною помилки
 */
export function canTransition(
  currentStatus: OrderStatus,
  transition: OrderTransition,
  actor: Actor,
): string | null {
  // CANCEL — спецкейс, дозволений з кількох станів
  if (transition === 'CANCEL') {
    const cancellableStates: OrderStatus[] = [
      'NEGOTIATING',
      'ACCEPTED',
      'DELIVERED',
    ]
    if (!cancellableStates.includes(currentStatus)) {
      return `Не можна скасувати замовлення зі стану ${currentStatus}`
    }
    if (!TRANSITIONS.CANCEL.allowedActors.includes(actor)) {
      return 'Тільки клієнт або фрілансер може скасувати'
    }
    return null
  }

  const rule = TRANSITIONS[transition]
  if (!rule) return 'Невідомий перехід'

  if (rule.from !== currentStatus) {
    return `Перехід "${transition}" дозволений тільки зі стану ${rule.from}, а зараз ${currentStatus}`
  }

  if (!rule.allowedActors.includes(actor)) {
    return `Цей перехід може зробити тільки: ${rule.allowedActors.join(', ')}`
  }

  return null
}

/**
 * Повертає цільовий статус для дозволеного переходу.
 */
export function nextStatus(transition: OrderTransition): OrderStatus {
  return TRANSITIONS[transition].to
}

/**
 * Визначає роль юзера у замовленні.
 */
export function getActor(
  userId: string,
  order: { clientId: string; freelancerId: string },
): Actor | null {
  if (userId === order.clientId) return 'CLIENT'
  if (userId === order.freelancerId) return 'FREELANCER'
  return null
}

/**
 * Чи є стан термінальним (не можна вийти).
 */
export function isTerminal(status: OrderStatus): boolean {
  return status === 'COMPLETED' || status === 'CANCELLED'
}
