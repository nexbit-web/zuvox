// src/routes/api/gigs/[id]/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { generateUniqueSlug } from '$lib/server/slug'
import { Money } from '$lib/server/wallet'
import { validateOrderAmount } from '$lib/server/pricing'
import type { RequestHandler } from './$types'

/**
 * GET /api/gigs/[id]
 * params.id може бути або id, або slug.
 */
export const GET: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })

  // Шукаємо за id або за slug
  const gig = await prisma.gig.findFirst({
    where: {
      OR: [{ id: params.id }, { slug: params.id }],
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          bio: true,
          city: true,
          verificationStatus: true,
          createdAt: true,
          freelancerProfile: {
            select: {
              avgRating: true,
              reviewsCount: true,
              completedOrders: true,
              responseTimeHrs: true,
              languages: true,
            },
          },
        },
      },
      packages: {
        orderBy: { priceCents: 'asc' },
      },
    },
  })

  if (!gig) throw error(404, 'Послугу не знайдено')

  // Доступ: ACTIVE — всі. DRAFT/PAUSED — тільки автор.
  const isOwner = session?.user.id === gig.sellerId
  if (gig.status !== 'ACTIVE' && !isOwner) {
    throw error(404, 'Послугу не знайдено')
  }

  // Інкрементуємо viewCount тільки для не-власників
  if (!isOwner && gig.status === 'ACTIVE') {
    // Робимо без await — не блокуємо response
    prisma.gig
      .update({
        where: { id: gig.id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {
        /* ignore */
      })
  }

  return json({ gig, isOwner })
}

/**
 * PATCH /api/gigs/[id] — редагування або зміна статусу.
 *
 * Body може містити:
 *   • title, description, shortDescription, tags, images, imagesPublicIds
 *   • category, subcategory
 *   • packages — повний replace (старі пакети видаляються, нові створюються)
 *   • status — 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
 *
 * Доступ: тільки seller (автор гіга).
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    select: { id: true, sellerId: true, title: true, status: true },
  })
  if (!gig) throw error(404, 'Не знайдено')
  if (gig.sellerId !== session.user.id) throw error(403, 'Не ваш гіг')
  if (gig.status === 'ARCHIVED') {
    throw error(400, 'Архівований гіг не можна редагувати')
  }

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  // Перевіряємо verification якщо публікують
  if (body.status === 'ACTIVE') {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { verificationStatus: true },
    })
    if (me?.verificationStatus !== 'VERIFIED') {
      throw error(403, 'Потрібна верифікація для публікації')
    }
  }

  const data: any = {}

  if (typeof body.title === 'string') {
    const title = body.title.trim()
    if (title.length < 10 || title.length > 120) {
      throw error(400, 'Назва: 10-120 символів')
    }
    data.title = title
    // Перегенеровуємо slug якщо назва змінилась
    if (title !== gig.title) {
      data.slug = await generateUniqueSlug(title, gig.id)
    }
  }

  if (typeof body.description === 'string') {
    const desc = body.description.trim()
    if (desc.length < 50 || desc.length > 10_000) {
      throw error(400, 'Опис: 50-10000 символів')
    }
    data.description = desc
  }

  if (typeof body.shortDescription === 'string') {
    const sd = body.shortDescription.trim()
    if (sd.length > 280) throw error(400, 'Короткий опис до 280 символів')
    data.shortDescription = sd || null
  }

  if (typeof body.category === 'string') {
    data.category = body.category.trim()
  }

  if (body.subcategory !== undefined) {
    data.subcategory = body.subcategory ? String(body.subcategory).trim() : null
  }

  if (Array.isArray(body.tags)) {
    data.tags = (body.tags as unknown[])
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.toLowerCase().trim())
      .filter(Boolean)
      .slice(0, 10)
  }

  if (Array.isArray(body.images)) {
    data.images = (body.images as unknown[])
      .filter((u): u is string => typeof u === 'string')
      .slice(0, 10)
  }
  if (Array.isArray(body.imagesPublicIds)) {
    data.imagesPublicIds = (body.imagesPublicIds as unknown[])
      .filter((u): u is string => typeof u === 'string')
      .slice(0, 10)
  }

  if (
    body.status &&
    ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'].includes(body.status)
  ) {
    data.status = body.status
    data.isActive = body.status === 'ACTIVE'
    if (body.status === 'ACTIVE' && !data.publishedAt) {
      // Ставимо publishedAt тільки при першій публікації
      const existing = await prisma.gig.findUnique({
        where: { id: gig.id },
        select: { publishedAt: true },
      })
      if (!existing?.publishedAt) {
        data.publishedAt = new Date()
      }
    }
  }

  // Оновлюємо у транзакції щоб і пакети синхронізувати
  const updated = await prisma.$transaction(async (tx) => {
    if (Array.isArray(body.packages)) {
      // Replace всіх пакетів
      const validTiers = ['BASIC', 'STANDARD', 'PREMIUM'] as const
      const seenTiers = new Set<string>()
      const packagesData = body.packages.map((p: any) => {
        const tier = String(p?.tier ?? '').toUpperCase()
        if (!validTiers.includes(tier as any)) {
          throw error(400, `Невідомий tier: ${tier}`)
        }
        if (seenTiers.has(tier)) {
          throw error(400, `Дубль tier: ${tier}`)
        }
        seenTiers.add(tier)

        const priceUah = Number(p?.priceUah)
        if (!Number.isFinite(priceUah) || priceUah <= 0) {
          throw error(400, `Невірна ціна для ${tier}`)
        }
        const priceCents = Money.toCents(priceUah)
        const amountErr = validateOrderAmount(priceCents)
        if (amountErr) throw error(400, `${tier}: ${amountErr}`)

        return {
          tier,
          name: String(p?.name ?? '').slice(0, 60),
          description: p?.description
            ? String(p.description).slice(0, 500)
            : null,
          priceCents,
          deliveryDays: Math.max(
            1,
            Math.min(180, Number(p?.deliveryDays) || 7),
          ),
          revisions: Math.max(-1, Math.min(10, Number(p?.revisions ?? 1))),
          features: Array.isArray(p?.features)
            ? p.features
                .filter((f: unknown): f is string => typeof f === 'string')
                .map((f: string) => f.trim())
                .filter(Boolean)
                .slice(0, 15)
            : [],
        }
      })

      if (!seenTiers.has('BASIC')) {
        throw error(400, "Базовий пакет обов'язковий")
      }

      await tx.gigPackage.deleteMany({ where: { gigId: gig.id } })
      await tx.gigPackage.createMany({
        data: packagesData.map((p: any) => ({ ...p, gigId: gig.id })),
      })
    }

    return tx.gig.update({
      where: { id: gig.id },
      data,
      include: {
        packages: { orderBy: { priceCents: 'asc' } },
      },
    })
  })

  return json({ gig: updated })
}

/**
 * DELETE /api/gigs/[id] — soft delete (status = ARCHIVED).
 *
 * Якщо у гіга є завершені/активні замовлення — НЕ видаляємо повністю,
 * щоб історія замовлень не зламалася. Просто архівуємо (status=ARCHIVED).
 */
export const DELETE: RequestHandler = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const gig = await prisma.gig.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      sellerId: true,
      _count: { select: { orders: true } },
    },
  })
  if (!gig) throw error(404, 'Не знайдено')
  if (gig.sellerId !== session.user.id) throw error(403, 'Не ваш гіг')

  if (gig._count.orders > 0) {
    // М'яке видалення — щоб історія замовлень не зламалась
    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'ARCHIVED', isActive: false },
    })
    return json({ ok: true, archived: true })
  }

  // Жорстке видалення — якщо немає жодного замовлення
  await prisma.gig.delete({ where: { id: gig.id } })
  return json({ ok: true, deleted: true })
}
