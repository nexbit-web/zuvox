// src/routes/api/upload/signature/+server.ts
import { json } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { signUploadParams } from '$lib/cloudinary'
import type { RequestHandler } from './$types'

type Kind = 'avatar' | 'portfolio'

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  const { kind } = (await request.json()) as { kind?: Kind }
  if (kind !== 'avatar' && kind !== 'portfolio') {
    return json({ error: 'Invalid kind' }, { status: 400 })
  }

  const folder = `zuvox/users/${session.user.id}/${kind}`
  const signed = signUploadParams({ folder })

  return json({ ...signed, folder })
}