// src/routes/api/user/update/+server.ts
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  const { role, phone, city, bio, portfolioUrl, experience } =
    await request.json()

  if (role && !['CLIENT', 'FREELANCER'].includes(role)) {
    return json({ error: 'Invalid role' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(role && { role }),
      ...(phone && { phone }),
      ...(city && { city }),
      ...(bio !== undefined && { bio }),
    },
  })

  return json({ ok: true })
}
