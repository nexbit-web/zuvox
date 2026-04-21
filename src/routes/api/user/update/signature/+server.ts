// src/routes/api/upload/signature/+server.ts
import { json } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { signUploadParams } from '$lib/cloudinary'
import { limit } from '$lib/rate-limit'
import type { RequestHandler } from './$types'

type Kind = 'avatar' | 'portfolio'

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  // Rate-limit по user.id (не по IP) — 30 підписів на хвилину.
  // Це обмежує спам-завантажень.
  const rl = limit(`upload-sign:${session.user.id}`, {
    points: 30,
    duration: 60_000,
  })

  if (!rl.success) {
    return new Response(
      JSON.stringify({ error: 'Too many uploads. Please wait.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    )
  }

  const { kind } = (await request.json()) as { kind?: Kind }
  if (kind !== 'avatar' && kind !== 'portfolio') {
    return json({ error: 'Invalid kind' }, { status: 400 })
  }

  const folder = `zuvox/users/${session.user.id}/${kind}`
  const signed = signUploadParams({ folder })

  return json({ ...signed, folder })
}
