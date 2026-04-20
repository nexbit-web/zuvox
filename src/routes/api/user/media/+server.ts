// src/routes/api/user/media/+server.ts
import { json } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'

/**
 * Зберігає URL аватара або банера після успішного завантаження в Cloudinary.
 * Приймаємо тільки Cloudinary URLs — захист від підміни.
 */
export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  const { kind, url } = (await request.json()) as {
    kind?: 'avatar' | 'banner'
    url?: string
  }

  if (kind !== 'avatar' && kind !== 'banner') {
    return json({ error: 'Invalid kind' }, { status: 400 })
  }

  if (!url || !/^https:\/\/res\.cloudinary\.com\//.test(url)) {
    return json({ error: 'Invalid url' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: kind === 'avatar' ? { avatar: url } : { banner: url },
  })

  return json({ ok: true, url })
}
