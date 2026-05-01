// src/routes/api/jobs/+server.ts
import { json, error } from '@sveltejs/kit'
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { limit } from '$lib/rate-limit'
import { Money } from '$lib/server/wallet'
import { validateOrderAmount } from '$lib/server/pricing'
import type { RequestHandler } from './$types'

const PROPOSAL_DEADLINE_DAYS = 30

/**
 * GET /api/jobs
 *
 * Параметри:
 *   ?category=Розробка+сайтів
 *   ?q=логотип
 *   ?type=ONLINE|OFFLINE|VISIT|ANY
 *   ?city=Київ
 *   ?budgetMin=500&budgetMax=10000     (у гривнях)
 *   ?role=client                       (мої заявки як клієнта — включно з CLOSED/EXPIRED)
 *   ?page=1&limit=20
 *   ?sort=recent|budget-desc|budget-asc|popular
 *
 * За замовчуванням: тільки OPEN заявки, відсортовано за свіжістю.
 */
export const GET: RequestHandler = async ({ url, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })

  const category = url.searchParams.get('category')
  const q = url.searchParams.get('q')?.trim()
  const type = url.searchParams.get('type')
  const city = url.searchParams.get('city')
  const budgetMin = url.searchParams.get('budgetMin')
  const budgetMax = url.searchParams.get('budgetMax')
  const role = url.searchParams.get('role')
  const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const pageSize = Math.min(
    50,
    Math.max(1, Number(url.searchParams.get('limit') ?? 20)),
  )
  const sort = url.searchParams.get('sort') ?? 'recent'

  // Якщо запит від клієнта про власні заявки — показуємо ВСЕ
  const isOwnList = role === 'client' && session
  const userId = session?.user.id

  const where: any = {
    AND: [
      isOwnList ? { clientId: userId } : { status: 'OPEN' },
      category ? { category } : {},
      type && type !== 'ANY' ? { type } : {},
      city ? { city: { contains: city, mode: 'insensitive' } } : {},
      budgetMin
        ? {
            OR: [
              { budgetMaxCents: { gte: Money.toCents(Number(budgetMin)) } },
              { budgetType: 'NEGOTIABLE' },
            ],
          }
        : {},
      budgetMax
        ? {
            OR: [
              { budgetMinCents: { lte: Money.toCents(Number(budgetMax)) } },
              { budgetMaxCents: { lte: Money.toCents(Number(budgetMax)) } },
              { budgetType: 'NEGOTIABLE' },
            ],
          }
        : {},
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
    sort === 'budget-desc'
      ? [{ budgetMaxCents: 'desc' as const }]
      : sort === 'budget-asc'
        ? [{ budgetMaxCents: 'asc' as const }]
        : sort === 'popular'
          ? [{ proposalsCount: 'desc' as const }]
          : [{ createdAt: 'desc' as const }]

  const [items, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        subcategory: true,
        tags: true,
        budgetType: true,
        budgetMinCents: true,
        budgetMaxCents: true,
        currency: true,
        deliveryDays: true,
        type: true,
        city: true,
        status: true,
        proposalsCount: true,
        createdAt: true,
        expiresAt: true,
        client: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ])

  // Обрізаємо опис до 300 символів для списку
  const trimmed = items.map((j) => ({
    ...j,
    description:
      j.description.length > 300
        ? j.description.slice(0, 300) + '…'
        : j.description,
  }))

  return json({
    items: trimmed,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  })
}

/**
 * POST /api/jobs — створити заявку.
 *
 * Хто може: будь-хто залогінений (клієнти і фрілансери — теж можуть наймати
 * на субпідряд). Якщо хочете обмежити — додайте role check.
 *
 * Rate limit: 5 заявок на годину.
 */
export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw error(401, 'Unauthorized')

  const rl = limit(`job:create:${session.user.id}`, {
    points: 5,
    duration: 60 * 60_000,
  })
  if (!rl.success) throw error(429, 'Занадто багато заявок')

  const body = await request.json().catch(() => null)
  if (!body) throw error(400, 'Invalid JSON')

  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const category = String(body.category ?? '').trim()
  const subcategory = body.subcategory ? String(body.subcategory).trim() : null
  const type = String(body.type ?? 'ANY').toUpperCase()
  const city = body.city ? String(body.city).trim() : null
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase().trim())
        .filter(Boolean)
        .slice(0, 10)
    : []

  // ─── Валідація ───
  if (title.length < 10 || title.length > 200) {
    throw error(400, 'Назва: 10-200 символів')
  }
  if (description.length < 50 || description.length > 10_000) {
    throw error(400, 'Опис: 50-10000 символів')
  }
  if (!category) throw error(400, 'Виберіть категорію')
  if (!['ONLINE', 'OFFLINE', 'VISIT', 'ANY'].includes(type)) {
    throw error(400, 'Невірний тип роботи')
  }

  // ─── Бюджет ───
  const budgetType = String(body.budgetType ?? 'FIXED').toUpperCase()
  if (!['FIXED', 'RANGE', 'NEGOTIABLE'].includes(budgetType)) {
    throw error(400, 'Невірний тип бюджету')
  }

  let budgetMinCents: number | null = null
  let budgetMaxCents: number | null = null

  if (budgetType === 'FIXED') {
    const priceUah = Number(body.budgetMaxUah ?? body.budgetUah)
    if (!Number.isFinite(priceUah) || priceUah <= 0) {
      throw error(400, 'Вкажіть бюджет')
    }
    budgetMaxCents = Money.toCents(priceUah)
    const errMsg = validateOrderAmount(budgetMaxCents)
    if (errMsg) throw error(400, errMsg)
  } else if (budgetType === 'RANGE') {
    const minUah = Number(body.budgetMinUah)
    const maxUah = Number(body.budgetMaxUah)
    if (
      !Number.isFinite(minUah) ||
      !Number.isFinite(maxUah) ||
      minUah <= 0 ||
      maxUah <= 0
    ) {
      throw error(400, 'Вкажіть діапазон бюджету')
    }
    if (minUah >= maxUah) {
      throw error(400, 'Мінімум має бути менше за максимум')
    }
    budgetMinCents = Money.toCents(minUah)
    budgetMaxCents = Money.toCents(maxUah)
    const errMin = validateOrderAmount(budgetMinCents)
    const errMax = validateOrderAmount(budgetMaxCents)
    if (errMin) throw error(400, `Мін: ${errMin}`)
    if (errMax) throw error(400, `Макс: ${errMax}`)
  }
  // NEGOTIABLE — обидва null

  const deliveryDays = body.deliveryDays
    ? Math.max(1, Math.min(180, Number(body.deliveryDays)))
    : null
  const deadlineAt = body.deadlineAt ? new Date(body.deadlineAt) : null
  if (deadlineAt && isNaN(deadlineAt.getTime())) {
    throw error(400, 'Невірна дата дедлайну')
  }

  const expiresAt = new Date(
    Date.now() + PROPOSAL_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
  )

  const job = await prisma.job.create({
    data: {
      title,
      description,
      category,
      subcategory,
      tags,
      budgetType: budgetType as any,
      budgetMinCents,
      budgetMaxCents,
      currency: 'UAH',
      deliveryDays,
      deadlineAt,
      expiresAt,
      type: type as any,
      city,
      status: 'OPEN',
      clientId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      status: true,
      budgetType: true,
      budgetMaxCents: true,
      proposalsCount: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  return json({ job }, { status: 201 })
}
