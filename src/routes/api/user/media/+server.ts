// src/routes/api/user/media/+server.ts
import { json } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { cloudinary } from '$lib/cloudinary'
import type { RequestHandler } from './$types'

interface AvatarPayload {
  kind: 'avatar'
  url: string
  publicId: string
}

interface PortfolioAddPayload {
  kind: 'portfolio-add'
  url: string
  publicId: string
}

interface PortfolioRemovePayload {
  kind: 'portfolio-remove'
  publicId: string
}

type Payload = AvatarPayload | PortfolioAddPayload | PortfolioRemovePayload

function isValidCloudinaryUrl(url: string): boolean {
  return /^https:\/\/res\.cloudinary\.com\//.test(url)
}

/**
 * Безпечно видаляє актив із Cloudinary.
 * Помилки логуємо, але не блокуємо основний потік —
 * якщо видалення впало, користувач усе одно отримає оновлене фото.
 */
async function safeDestroy(publicId: string) {
  if (!publicId) return
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true })
  } catch (err) {
    console.error('[cloudinary] destroy failed:', publicId, err)
  }
}

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  const payload = (await request.json()) as Payload

  // ─── AVATAR ───
  if (payload.kind === 'avatar') {
    if (!payload.url || !isValidCloudinaryUrl(payload.url)) {
      return json({ error: 'Invalid url' }, { status: 400 })
    }
    if (!payload.publicId) {
      return json({ error: 'publicId required' }, { status: 400 })
    }

    // дістаємо старий public_id щоб видалити попереднє фото
    const prev = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarPublicId: true },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        avatar: payload.url,
        avatarPublicId: payload.publicId,
      },
    })

    // видаляємо старе (у фоні, не блокуємо відповідь)
    if (prev?.avatarPublicId && prev.avatarPublicId !== payload.publicId) {
      void safeDestroy(prev.avatarPublicId)
    }

    return json({ ok: true, url: payload.url })
  }

  // ─── PORTFOLIO ADD ───
  if (payload.kind === 'portfolio-add') {
    if (!payload.url || !isValidCloudinaryUrl(payload.url)) {
      return json({ error: 'Invalid url' }, { status: 400 })
    }
    if (!payload.publicId) {
      return json({ error: 'publicId required' }, { status: 400 })
    }

    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { portfolioImages: true, portfolioImagesPublicIds: true },
    })

    // ліміт — 5 робіт
    if ((current?.portfolioImages?.length ?? 0) >= 5) {
      return json({ error: 'Максимум 5 робіт' }, { status: 400 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        portfolioImages: {
          push: payload.url,
        },
        portfolioImagesPublicIds: {
          push: payload.publicId,
        },
      },
    })

    return json({ ok: true, url: payload.url })
  }

  // ─── PORTFOLIO REMOVE ───
  if (payload.kind === 'portfolio-remove') {
    if (!payload.publicId) {
      return json({ error: 'publicId required' }, { status: 400 })
    }

    const current = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { portfolioImages: true, portfolioImagesPublicIds: true },
    })

    if (!current) return json({ error: 'Not found' }, { status: 404 })

    const idx = current.portfolioImagesPublicIds.indexOf(payload.publicId)
    if (idx === -1) return json({ error: 'Image not found' }, { status: 404 })

    const nextUrls = [
      ...current.portfolioImages.slice(0, idx),
      ...current.portfolioImages.slice(idx + 1),
    ]
    const nextIds = [
      ...current.portfolioImagesPublicIds.slice(0, idx),
      ...current.portfolioImagesPublicIds.slice(idx + 1),
    ]

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        portfolioImages: nextUrls,
        portfolioImagesPublicIds: nextIds,
      },
    })

    void safeDestroy(payload.publicId)

    return json({ ok: true })
  }

  return json({ error: 'Invalid kind' }, { status: 400 })
}