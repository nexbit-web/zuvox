// src/lib/server/system-message.ts
import { prisma } from '$lib/prisma'
import { safeTrigger } from './pusher'
import type { PrismaTx } from './wallet'

/**
 * Хелпер для відправки SYSTEM повідомлень у чат при подіях замовлення.
 *
 * Використовується у /api/orders/[id]/[action]/+server.ts після успішного
 * переходу статусу.
 *
 * НЕ обов'язковий — UI замовлення показує всі статуси на /orders/[id].
 * Це просто додатковий UX, щоб клієнт і фрілансер бачили зміни в чаті.
 */

const SYSTEM_TEMPLATES: Record<string, string> = {
  CREATED: '📝 Створено замовлення',
  ACCEPTED: '✅ Майстер прийняв замовлення',
  DELIVERED: '📤 Майстер здав роботу',
  REVISION_REQUESTED: '↩️ Клієнт запросив правки',
  COMPLETED: '🎉 Замовлення завершено',
  CANCELLED: '❌ Замовлення скасовано',
  AUTO_COMPLETED: '⏱️ Замовлення автоматично завершено',
}

/**
 * Створює SYSTEM повідомлення у чаті і відправляє Pusher event.
 *
 * @param chatId — чат в який слати
 * @param eventType — тип події заказа (CREATED, ACCEPTED, ...)
 * @param orderId — для побудови посилання у клієнті
 * @param tx — опційно, всередині існуючої транзакції
 */
export async function postOrderSystemMessage(
  params: {
    chatId: string
    eventType: string
    orderId: string
    actorId: string
    extra?: string // додатковий текст (наприклад причина скасування)
  },
  tx?: PrismaTx,
): Promise<void> {
  const { chatId, eventType, orderId, actorId, extra } = params

  const template = SYSTEM_TEMPLATES[eventType]
  if (!template) return // невідомий event — пропускаємо

  let text = template
  if (extra) text += ` · ${extra}`

  const db = tx ?? prisma

  try {
    const message = await db.message.create({
      data: {
        type: 'SYSTEM',
        text,
        chatId,
        senderId: actorId,
      },
      select: {
        id: true,
        type: true,
        text: true,
        chatId: true,
        senderId: true,
        createdAt: true,
      },
    })

    // Оновлюємо last message чата
    await db.chat.update({
      where: { id: chatId },
      data: {
        lastMessageText: text,
        lastMessageAt: message.createdAt,
        lastSenderId: actorId,
        updatedAt: message.createdAt,
      },
    })

    // Pusher events (поза транзакцією — fire and forget)
    setTimeout(async () => {
      try {
        const members = await prisma.chatMember.findMany({
          where: { chatId },
          select: { userId: true },
        })

        await safeTrigger(`private-chat-${chatId}`, 'messageNew', {
          ...message,
          createdAt: message.createdAt.toISOString(),
          orderId, // клієнт зможе зробити посилання
        })

        // Сповіщення для кожного юзера у чаті
        for (const m of members) {
          await safeTrigger(`private-user-${m.userId}`, 'chatUpdate', {
            chatId,
            lastMessageText: text,
            lastMessageAt: message.createdAt.toISOString(),
          })
        }
      } catch (err) {
        console.error('[system-message] pusher error', err)
      }
    }, 0)
  } catch (err) {
    console.error('[system-message] create error', err)
    // Не кидаємо помилку — system message це додаток, основна транзакція
    // не має падати через нього.
  }
}
