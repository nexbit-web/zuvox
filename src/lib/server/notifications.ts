// src/lib/server/notifications.ts
import { prisma } from '$lib/prisma'
import { safeTrigger } from './pusher'
import type { PrismaTx } from './wallet'

/**
 * Створює notification у БД і відправляє Pusher event для real-time.
 *
 * Використовується після важливих подій (новий заказ, прийнято, тощо).
 *
 * @param tx — опційно, всередині існуючої транзакції
 */
export async function notify(
  params: {
    userId: string
    type: string
    title: string
    body?: string
    orderId?: string
    proposalId?: string
    jobId?: string
    chatId?: string
  },
  tx?: PrismaTx,
): Promise<void> {
  const db = tx ?? prisma

  try {
    const notification = await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type as any,
        title: params.title,
        body: params.body,
        orderId: params.orderId,
        proposalId: params.proposalId,
        jobId: params.jobId,
        chatId: params.chatId,
      },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        orderId: true,
        proposalId: true,
        jobId: true,
        chatId: true,
        createdAt: true,
      },
    })

    // Pusher event (fire and forget, поза транзакцією)
    setTimeout(() => {
      safeTrigger(`private-user-${params.userId}`, 'notification', {
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      })
    }, 0)
  } catch (err) {
    console.error('[notifications] error', err)
    // Не падаємо — нотифікації не мають ламати основну транзакцію
  }
}

/**
 * Шорткати для типових подій
 */
export const Notify = {
  orderCreated: (userId: string, orderId: string, chatId?: string) =>
    notify({
      userId,
      type: 'ORDER_CREATED',
      title: 'Нове замовлення',
      body: 'Вам створили нове замовлення',
      orderId,
      chatId,
    }),

  orderAccepted: (userId: string, orderId: string) =>
    notify({
      userId,
      type: 'ORDER_ACCEPTED',
      title: 'Замовлення прийнято',
      body: 'Майстер взявся за вашу задачу',
      orderId,
    }),

  orderDelivered: (userId: string, orderId: string) =>
    notify({
      userId,
      type: 'ORDER_DELIVERED',
      title: 'Робота здана',
      body: 'Перевірте результат і прийміть або запросіть правки',
      orderId,
    }),

  orderCompleted: (userId: string, orderId: string) =>
    notify({
      userId,
      type: 'ORDER_COMPLETED',
      title: 'Замовлення завершено',
      body: 'Клієнт прийняв роботу. Дякуємо!',
      orderId,
    }),

  proposalNew: (userId: string, jobId: string, proposalId: string) =>
    notify({
      userId,
      type: 'PROPOSAL_NEW',
      title: 'Новий відгук',
      body: 'На вашу заявку відгукнувся фрілансер',
      jobId,
      proposalId,
    }),

  proposalAccepted: (userId: string, orderId: string, jobId: string) =>
    notify({
      userId,
      type: 'PROPOSAL_ACCEPTED',
      title: 'Вас обрали!',
      body: 'Клієнт обрав ваш відгук. Перевірте замовлення.',
      orderId,
      jobId,
    }),

  reviewReceived: (userId: string, orderId: string) =>
    notify({
      userId,
      type: 'REVIEW_RECEIVED',
      title: 'Новий відгук',
      body: 'Клієнт залишив відгук про вашу роботу',
      orderId,
    }),
}
