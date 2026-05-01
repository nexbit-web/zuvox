// src/routes/(auth)/dashboard/gigs/new/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect, error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login?next=/dashboard/gigs/new')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, verificationStatus: true },
  })
  if (!user) throw error(404, 'User not found')
  if (user.role !== 'FREELANCER') throw redirect(302, '/dashboard')
  if (user.verificationStatus !== 'VERIFIED') {
    throw redirect(302, '/dashboard/gigs')
  }

  return {}
}
