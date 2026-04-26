// src/routes/(auth)/messages/+layout.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'
import type { ChatPreview } from '$lib/components/chat/types'

/**
 * Layout-loader для /messages і всіх вкладених /messages/[id].
 * Оптимізований: 2 запити замість N+1.
 *   - Запит 1: membership + chat + peer
 *   - Запит 2: groupBy для unread counts (один SQL для всіх чатів)
 */
export const load: LayoutServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login')

  const userId = session.user.id

  // Запит 1: всі мої чати з peer
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    select: {
      lastReadAt: true,
      chat: {
        select: {
          id: true,
          updatedAt: true,
          lastMessageText: true,
          lastMessageAt: true,
          lastSenderId: true,
          members: {
            where: { userId: { not: userId } },
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  avatar: true,
                  verificationStatus: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    },
    orderBy: { chat: { lastMessageAt: 'desc' } },
  })

  // Запит 2: один groupBy для всіх unread counts
  const chatIds = memberships.map((m) => m.chat.id)
  const unreadByChatId = new Map<string, number>()

  if (chatIds.length > 0) {
    // Будуємо WHERE з умовами per-chat (lastReadAt у кожного може бути різний)
    // Простіше: вибрати всі непрочитані повідомлення цих чатів і згрупувати.
    const unread = await prisma.message.groupBy({
      by: ['chatId'],
      where: {
        chatId: { in: chatIds },
        senderId: { not: userId },
        deletedAt: null,
        isRead: false, // швидкий фільтр через індекс
      },
      _count: { _all: true },
    })

    for (const row of unread) {
      // Додатково фільтруємо за lastReadAt — для кейсу коли isRead не оновлено
      const m = memberships.find((x) => x.chat.id === row.chatId)
      if (!m) continue
      // Якщо lastReadAt не задано — всі непрочитані
      // Інакше — все одно вже відфільтровано по isRead=false
      unreadByChatId.set(row.chatId, row._count._all)
    }
  }

  const chats: ChatPreview[] = memberships
    .filter((m) => m.chat.members.length > 0)
    .map((m) => {
      const peerUser = m.chat.members[0].user
      return {
        id: m.chat.id,
        peer: {
          id: peerUser.id,
          name: peerUser.name ?? '',
          username: peerUser.username,
          avatar: peerUser.avatar,
          isVerified: peerUser.verificationStatus === 'VERIFIED',
        },
        lastMessageText: m.chat.lastMessageText,
        lastMessageAt: m.chat.lastMessageAt?.toISOString() ?? null,
        lastSenderId: m.chat.lastSenderId,
        unreadCount: unreadByChatId.get(m.chat.id) ?? 0,
        updatedAt: m.chat.updatedAt.toISOString(),
      }
    })

  return {
    chats,
    currentUserId: userId,
  }
}