// src/routes/api/chats/start/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { channels, events, safeTrigger } from '$lib/server/pusher'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const body = await request.json().catch(() => null)
  const peerId = body?.peerId
  if (!peerId || typeof peerId !== 'string') {
    throw error(400, 'peerId required')
  }
  if (peerId === session.user.id) {
    throw error(400, 'Cannot chat with yourself')
  }

  const peer = await prisma.user.findUnique({
    where: { id: peerId },
    select: { id: true },
  })
  if (!peer) throw error(404, 'User not found')

  const userId = session.user.id

  const existing = await prisma.chat.findFirst({
    where: {
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: peerId } } },
      ],
      members: { every: { userId: { in: [userId, peerId] } } },
    },
    select: {
      id: true,
      _count: { select: { members: true } },
    },
  })

  if (existing && existing._count.members === 2) {
    return json({ chatId: existing.id, isNew: false })
  }

  const chat = await prisma.chat.create({
    data: {
      members: {
        create: [{ userId }, { userId: peerId }],
      },
    },
    select: { id: true },
  })

  await safeTrigger(channels.user(peerId), events.chatUpdate, {
    chatId: chat.id,
    lastMessageText: null,
    lastMessageAt: null,
    lastSenderId: null,
  })

  return json({ chatId: chat.id, isNew: true })
}
