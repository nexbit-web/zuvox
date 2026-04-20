// src/routes/(auth)/profile/setup/freelancer/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      phone: true,
      city: true,
      bio: true,
      avatar: true,
      banner: true,
    },
  })

  return {
    prefill: {
      name: user?.name ?? session.user.name ?? '',
      phone: user?.phone ?? '',
      city: user?.city ?? '',
      bio: user?.bio ?? '',
      avatar: user?.avatar ?? '',
      banner: user?.banner ?? '',
    },
  }
}
