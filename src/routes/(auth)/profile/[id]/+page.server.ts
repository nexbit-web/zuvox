// src/routes/(auth)/profile/[id]/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

/**
 * Legacy роут /profile/[id]:
 *   - Свій id → /dashboard
 *   - Чужий id з username → 301 на /@{username} (нова канонічна URL)
 *   - Чужий id без username → 404 (рідкісний кейс — не зашкодить)
 *
 * Цей роут лишається для зворотної сумісності зі старими посиланнями.
 * Усі нові посилання у проекті мають вести на /@{username}.
 */
export const load: PageServerLoad = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })

  if (session && params.id === session.user.id) {
    throw redirect(302, '/dashboard')
  }

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { username: true, role: true },
  })

  if (!user) throw error(404, 'Користувача не знайдено')
  if (user.role === 'CLIENT') throw error(404, 'Користувача не знайдено')
  if (!user.username) throw error(404, 'Профіль не має нікнейма')

  // 301 — permanent redirect, щоб пошуковики оновили посилання
  throw redirect(301, `/@${user.username}`)
}