// src/routes/api/gigs/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { limit } from '$lib/rate-limit'
import { generateUniqueSlug } from '$lib/server/slug'
import { Money } from '$lib/server/wallet'
import { validateOrderAmount } from '$lib/server/pricing'
import type { RequestHandler } from './$types'

/**
 * GET /api/gigs
 *
 * Параметри запиту:
 *   ?category=Розробка+сайтів
 *   ?q=сайт                 — пошук по назві/опису
 *   ?sellerId=cuid          — гіги конкретного фрілансера (включно зі своїми DRAFT)
 *   ?page=1&limit=20
 *   ?sort=popular|recent|price-asc|price-desc
 *
 * За замовчуванням повертає тільки ACTIVE гіги.
 * Виняток: якщо sellerId === current user — показуємо ВСІ статуси.
 */
export const GET: RequestHandler = async ({ url, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  const userId = session?.user.id

  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')?.trim()
  const sellerId = url.searchParams.get('sellerId')
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const pageSize = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get('limit') ?? 20)),
  )
  const sort = url.searchParams.get('sort') ?? 'recent'

  const isOwnList = sellerId && userId && sellerId === userId

  const where: any = {
    AND: [
      isOwnList ? {} : { status: 'ACTIVE' },
      category ? { category } : {},
      sellerId ? { sellerId } : {},
      q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {},
    ],
  }

  const orderBy =
    sort === 'popular'
      ? [{ ordersCount: 'desc' as const }, { avgRating: 'desc' as const }]
      : sort === 'price-asc'
        ? [{ packages: { _count: 'asc' as const } }] // приблизно — точне сортування зробимо у Заході 4
        : sort === 'price-desc'
          ? [{ packages: { _count: 'desc' as const } }]
          : [{ createdAt: 'desc' as const }]

  const [items, total] = await Promise.all([
    prisma.gig.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        category: true,
        subcategory: true,
        images: true,
        status: true,
        avgRating: true,
        reviewsCount: true,
        ordersCount: true,
        createdAt: true,
        seller: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            verificationStatus: true,
          },
        },
        packages: {
          orderBy: { priceCents: 'asc' },
          select: {
            id: true,
            tier: true,
            priceCents: true,
            deliveryDays: true,
          },
        },
      },
    }),
    prisma.gig.count({ where }),
  ])

  return json({
    items,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  })
}

/**
 * POST /api/gigs — створити новий гіг (DRAFT за замовчуванням).
 *
 * Перевірки:
 *   • Юзер залогінений
 *   • role === FREELANCER
 *   • verificationStatus === VERIFIED
 *   • Rate limit: 5 гігів на годину
 */
export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const rl = limit(`gig:create:${session.user.id}`, {
    points: 5,
    duration: 60 * 60_000,
  })
  if (!rl.success) throw error(429, 'Занадто багато гігів. Спробуйте пізніше.')

  // Перевіряємо роль і верифікацію
  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, verificationStatus: true },
  })
  if (!me || me.role !== 'FREELANCER') {
    throw error(403, 'Тільки фрілансери можуть створювати гіги')
  }
  if (me.verificationStatus !== 'VERIFIED') {
    throw error(
      403,
      'Спочатку пройдіть верифікацію щоб публікувати свої послуги',
    )
  }

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const shortDescription = String(body.shortDescription ?? '').trim()
  const category = String(body.category ?? '').trim()
  const subcategory = body.subcategory ? String(body.subcategory).trim() : null
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 10)
    : []
  const images = Array.isArray(body.images)
    ? (body.images as unknown[])
        .filter((u): u is string => typeof u === 'string')
        .slice(0, 10)
    : []
  const imagesPublicIds = Array.isArray(body.imagesPublicIds)
    ? (body.imagesPublicIds as unknown[])
        .filter((u): u is string => typeof u === 'string')
        .slice(0, 10)
    : []

  // Валідація
  if (title.length < 10) {
    throw error(400, 'Назва занадто коротка (мінімум 10 символів)')
  }
  if (title.length > 120) {
    throw error(400, 'Назва занадто довга')
  }
  if (description.length < 50) {
    throw error(400, 'Опис занадто короткий (мінімум 50 символів)')
  }
  if (description.length > 10_000) {
    throw error(400, 'Опис занадто довгий')
  }
  if (shortDescription.length > 280) {
    throw error(400, 'Короткий опис до 280 символів')
  }
  if (!category) throw error(400, 'Виберіть категорію')

  // ─── Пакети ───
  // Очікуємо масив { tier, priceUah, deliveryDays, revisions, features, name?, description? }
  const rawPackages = Array.isArray(body.packages) ? body.packages : []
  if (rawPackages.length === 0) {
    throw error(400, 'Потрібен хоча б базовий пакет')
  }
  if (rawPackages.length > 3) {
    throw error(400, 'Максимум 3 пакети')
  }

  const validTiers = ['BASIC', 'STANDARD', 'PREMIUM'] as const
  const seenTiers = new Set<string>()
  const packagesData: Array<{
    tier: 'BASIC' | 'STANDARD' | 'PREMIUM'
    name: string
    description: string | null
    priceCents: number
    deliveryDays: number
    revisions: number
    features: string[]
  }> = []

  for (const p of rawPackages) {
    const tier = String(p?.tier ?? '').toUpperCase()
    if (!validTiers.includes(tier as any)) {
      throw error(400, `Невідомий тип пакету: ${tier}`)
    }
    if (seenTiers.has(tier)) {
      throw error(400, `Пакет ${tier} вже є — кожен tier тільки один раз`)
    }
    seenTiers.add(tier)

    const priceUah = Number(p?.priceUah)
    if (!Number.isFinite(priceUah) || priceUah <= 0) {
      throw error(400, `Невірна ціна для пакету ${tier}`)
    }
    const priceCents = Money.toCents(priceUah)
    const amountErr = validateOrderAmount(priceCents)
    if (amountErr) throw error(400, `Пакет ${tier}: ${amountErr}`)

    const deliveryDays = Number(p?.deliveryDays)
    if (
      !Number.isInteger(deliveryDays) ||
      deliveryDays < 1 ||
      deliveryDays > 180
    ) {
      throw error(400, `Невірний термін виконання (1-180 днів)`)
    }

    const revisions = Number(p?.revisions ?? 1)
    if (!Number.isInteger(revisions) || revisions < -1 || revisions > 10) {
      throw error(400, 'Невірна кількість правок (-1 = unlimited, 0-10)')
    }

    const features = Array.isArray(p?.features)
      ? (p.features as unknown[])
          .filter((f): f is string => typeof f === 'string')
          .map((f) => f.trim())
          .filter(Boolean)
          .slice(0, 15)
      : []

    packagesData.push({
      tier: tier as any,
      name: String(p?.name ?? '')
        .trim()
        .slice(0, 60),
      description: p?.description
        ? String(p.description).trim().slice(0, 500)
        : null,
      priceCents,
      deliveryDays,
      revisions,
      features,
    })
  }

  // ─── BASIC пакет обов'язковий (мінімальний рівень) ───
  if (!seenTiers.has('BASIC')) {
    throw error(400, "Базовий пакет обов'язковий")
  }

  // Якщо є кілька пакетів — кожен наступний tier має бути дорожчим
  const sortedByTierOrder = packagesData.sort(
    (a, b) =>
      validTiers.indexOf(a.tier as any) - validTiers.indexOf(b.tier as any),
  )
  for (let i = 1; i < sortedByTierOrder.length; i++) {
    if (
      sortedByTierOrder[i].priceCents <= sortedByTierOrder[i - 1].priceCents
    ) {
      throw error(
        400,
        `Кожен наступний пакет має коштувати дорожче за попередній`,
      )
    }
  }

  // ─── Створюємо гіг + пакети у транзакції ───
  const slug = await generateUniqueSlug(title)

  const gig = await prisma.gig.create({
    data: {
      title,
      slug,
      description,
      shortDescription: shortDescription || null,
      category,
      subcategory,
      tags,
      images,
      imagesPublicIds,
      status: 'DRAFT',
      isActive: false,
      sellerId: session.user.id,
      packages: {
        create: packagesData,
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      packages: {
        orderBy: { priceCents: 'asc' },
        select: {
          id: true,
          tier: true,
          priceCents: true,
          deliveryDays: true,
        },
      },
    },
  })

  return json({ gig }, { status: 201 })
}
