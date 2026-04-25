// src/routes/(auth)/profile/setup/client/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

function suggestFromEmail(email: string | null | undefined): string {
  if (!email) return ''
  const local = email.split('@')[0] ?? ''
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
  if (!/^[a-z]/.test(cleaned)) return ''
  return cleaned.length >= 3 ? cleaned : ''
}

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      username: true,
      phone: true,
      city: true,
      bio: true,
      avatar: true,
      role: true,
    },
  })

  if (!user) throw redirect(302, '/user/login')

  const username = user.username ?? suggestFromEmail(user.email)

  return {
    prefill: {
      name: user.name ?? session.user.name ?? '',
      username,
      phone: user.phone ?? '',
      city: user.city ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
      isExistingClient: user.role === 'CLIENT',
    },
  }
}