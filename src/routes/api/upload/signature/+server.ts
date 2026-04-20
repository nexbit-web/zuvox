// src/routes/api/upload/signature/+server.ts
import { json } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { signUploadParams } from '$lib/cloudinary'
import type { RequestHandler } from './$types'

/**
 * Повертає тимчасовий підпис для прямого завантаження файлу з клієнта в Cloudinary.
 * Підписуємо тільки наш folder — це обмежує куди юзер може лити.
 */
export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  const { kind } = (await request.json()) as { kind?: 'avatar' | 'banner' }
  if (kind !== 'avatar' && kind !== 'banner') {
    return json({ error: 'Invalid kind' }, { status: 400 })
  }

  // кожен користувач має свою папку
  const folder = `zuvox/users/${session.user.id}/${kind}`

  const signed = signUploadParams({ folder })

  return json({ ...signed, folder })
}
