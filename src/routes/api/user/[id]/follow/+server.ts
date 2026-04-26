// src/routes/api/user/[id]/follow/+server.ts
import { json, error } from '@sveltejs/kit'
import { Prisma } from '../../../../../generated/prisma/client'
import { prisma } from '$lib/prisma'
import { auth } from '$lib/auth'
import { limit } from '$lib/rate-limit'
import type { RequestHandler } from './$types'

/**
 * POST   /api/user/[id]/follow → підписатись
 * DELETE /api/user/[id]/follow → відписатись
 *
 * Бізнес-правила:
 * - Підписуватись можна ТІЛЬКИ на FREELANCER (на клієнтів — не можна)
 * - Не можна підписатись на самого себе
 * - Rate-limit: 60 операцій/хв на юзера (антиспам)
 * - Транзакція: створити/видалити Follow + інкрем/декрем followers counter
 * - Ідемпотентно: повторний POST на те саме не падає; DELETE без запису теж
 */

async function requireAuthAndValidate(request: Request, targetId: string) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  if (session.user.id === targetId) {
    throw error(400, 'Cannot follow yourself')
  }

  const rl = limit(`follow:${session.user.id}`, {
    points: 60,
    duration: 60_000,
  })
  if (!rl.success) throw error(429, 'Too many requests')

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  })
  if (!target) throw error(404, 'User not found')
  if (target.role !== 'FREELANCER') {
    throw error(400, 'Cannot follow this user')
  }

  return session.user.id
}

export const POST: RequestHandler = async ({ params, request }) => {
  const userId = await requireAuthAndValidate(request, params.id)

  try {
    await prisma.$transaction([
      prisma.follow.create({
        data: { followerId: userId, followingId: params.id },
      }),
      prisma.freelancerProfile.update({
        where: { userId: params.id },
        data: { followers: { increment: 1 } },
      }),
    ])
  } catch (err) {
    // P2002 — unique conflict → вже підписаний → ОК (ідемпотентно)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return json({ ok: true, following: true, alreadyFollowing: true })
    }
    throw err
  }

  return json({ ok: true, following: true })
}

export const DELETE: RequestHandler = async ({ params, request }) => {
  const userId = await requireAuthAndValidate(request, params.id)

  // deleteMany не падає, якщо запису немає
  const result = await prisma.follow.deleteMany({
    where: { followerId: userId, followingId: params.id },
  })

  // Декрементуємо тільки якщо реально видалили
  if (result.count > 0) {
    await prisma.freelancerProfile
      .update({
        where: { userId: params.id },
        data: { followers: { decrement: 1 } },
      })
      .catch(() => {
        // Якщо FreelancerProfile випадково зник — не ламаємо unfollow
      })
  }

  return json({ ok: true, following: false })
}
