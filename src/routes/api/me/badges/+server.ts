// src/routes/api/me/badges/+server.ts
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import { auth } from '$lib/auth' // ← перевір шлях до better-auth instance
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ request, setHeaders }) => {
  // ─── Беремо сесію через better-auth ───
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user?.id

  if (!userId) {
    return json({ unreadMessages: 0, unreadNotifications: 0 })
  }

  try {
    // ─── Паралельні легкі COUNT-запити ───
    const [unreadMessages, unreadNotifications] = await Promise.all([
      // Непрочитані повідомлення у чатах де юзер є членом
      prisma.message.count({
        where: {
          chat: {
            members: {
              some: { userId },
            },
          },
          senderId: { not: userId },
          readAt: null,
        },
      }),
      // Непрочитані сповіщення
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ])

    // ─── Кеш на 10 секунд (private — це user-specific) ───
    setHeaders({
      'cache-control': 'private, max-age=10',
    })

    return json({ unreadMessages, unreadNotifications })
  } catch (err) {
    console.error('[badges] failed:', err)
    return json({ unreadMessages: 0, unreadNotifications: 0 })
  }
}
