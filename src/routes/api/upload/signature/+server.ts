// src/routes/api/upload/signature/+server.ts
import { json } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { signUploadParams } from '$lib/cloudinary'
import { limit } from '$lib/rate-limit'
import type { RequestHandler } from './$types'

/**
 * Універсальний signature endpoint.
 *
 * Підтримує два формати тіла:
 *   1. { kind: 'avatar' | 'portfolio' }     — для onboarding
 *   2. { folder: string, resourceType?: 'image'|'raw'|'auto' }  — для чату/гігів/deliverables
 *
 * Повертає:
 *   { signature, timestamp, apiKey, cloudName, folder, resourceType }
 *
 * Клієнт робить POST у https://api.cloudinary.com/v1_1/{cloudName}/{resourceType}/upload
 * з полями file, api_key, timestamp, signature, folder.
 */

const ALLOWED_FOLDERS = [
  'zunor/users',
  'zunor/chat',
  'zunor/avatars',
  'zunor/portfolio',
  'zunor/gigs',
  'zunor/deliverables',
]

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate-limit: 30 signature/хв на юзера
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

  const body = (await request.json().catch(() => null)) as {
    kind?: 'avatar' | 'portfolio'
    folder?: string
    resourceType?: 'image' | 'raw' | 'auto'
  } | null

  if (!body) {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // ─── Шлях 1: legacy kind ───
  if (body.kind === 'avatar' || body.kind === 'portfolio') {
    const folder = `zunor/users/${session.user.id}/${body.kind}`
    return json(signUploadParams({ folder, resourceType: 'image' }))
  }

  // ─── Шлях 2: explicit folder + resourceType ───
  if (body.folder) {
    // Валідація folder — тільки наші префікси, не дозволяємо довільні
    const isAllowed = ALLOWED_FOLDERS.some((p) => body.folder!.startsWith(p))
    if (!isAllowed) {
      return json({ error: 'Folder not allowed' }, { status: 400 })
    }

    const resourceType =
      body.resourceType === 'image' ||
      body.resourceType === 'raw' ||
      body.resourceType === 'auto'
        ? body.resourceType
        : 'auto'

    return json(signUploadParams({ folder: body.folder, resourceType }))
  }

  return json({ error: 'Missing kind or folder' }, { status: 400 })
}
