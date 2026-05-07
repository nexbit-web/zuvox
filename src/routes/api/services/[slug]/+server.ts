// src/routes/api/services/[slug]/+server.ts
import { json, error } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'
import type { Prisma } from '../../../../generated/prisma/client'
import type {
  MasterCard,
  ServicesPageResponse,
  SortOption,
  ServiceType,
} from '$lib/types/services'

const PAGE_SIZE = 24
const MAX_PAGE = 100
const SLUG_RE = /^[a-z0-9-]{1,80}$/
const CITY_SLUG_RE = /^[a-z0-9-]{1,40}$/

const SORT_VALUES: SortOption[] = [
  'rating',
  'priceAsc',
  'priceDesc',
  'newest',
  'popular',
]

const TYPE_VALUES: readonly ServiceType[] = [
  'online',
  'offline',
  'visit',
] as const

const experienceLabels: Record<string, string> = {
  LT_1: 'менше 1 року',
  Y_1_2: '1–2 роки',
  Y_3_5: '3–5 років',
  Y_5_10: '5–10 років',
  Y_10_PLUS: '10+ років',
}

export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
  // ─── Валідація slug ───
  const slug = params.slug.toLowerCase()
  if (!SLUG_RE.test(slug)) throw error(404, 'Категорію не знайдено')

  // ─── Категорія + підкатегорії ───
  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      subcategories: {
        where: { status: 'ACTIVE' },
        orderBy: { sortOrder: 'asc' },
        select: { slug: true, name: true },
      },
    },
  })

  if (!category) throw error(404, 'Категорію не знайдено')

  // ─── Парсимо фільтри з URL ───
  const subSlug = url.searchParams.get('sub')?.toLowerCase() ?? null
  const citySlug = url.searchParams.get('city')?.toLowerCase() ?? null
  const typeParam = url.searchParams.get('type')?.toLowerCase() ?? null
  const minRateRaw = url.searchParams.get('minRate')
  const maxRateRaw = url.searchParams.get('maxRate')
  const minRatingRaw = url.searchParams.get('minRating')
  const sortRaw = url.searchParams.get('sort') ?? 'rating'
  const pageRaw = url.searchParams.get('page') ?? '1'

  // Валідація — невалідне просто ігноруємо
  const validSub =
    subSlug && SLUG_RE.test(subSlug)
      ? (category.subcategories.find((s) => s.slug === subSlug)?.slug ?? null)
      : null

  const validCity =
    citySlug && citySlug !== 'all' && CITY_SLUG_RE.test(citySlug)
      ? citySlug
      : null

  const validType =
    typeParam && (TYPE_VALUES as readonly string[]).includes(typeParam)
      ? (typeParam as ServiceType)
      : null

  const minRate =
    minRateRaw && /^\d{1,7}$/.test(minRateRaw) ? parseInt(minRateRaw, 10) : null
  const maxRate =
    maxRateRaw && /^\d{1,7}$/.test(maxRateRaw) ? parseInt(maxRateRaw, 10) : null
  const minRating =
    minRatingRaw && /^[0-5](\.\d)?$/.test(minRatingRaw)
      ? parseFloat(minRatingRaw)
      : null

  const sort: SortOption = SORT_VALUES.includes(sortRaw as SortOption)
    ? (sortRaw as SortOption)
    : 'rating'

  const page =
    pageRaw && /^\d{1,3}$/.test(pageRaw)
      ? Math.max(1, Math.min(MAX_PAGE, parseInt(pageRaw, 10)))
      : 1

  // ─── where для FreelancerProfile ───
  const profileWhere: Prisma.FreelancerProfileWhereInput = {
    categories: { has: category.name },
  }

  if (minRate !== null) {
    profileWhere.hourlyRate = {
      ...(profileWhere.hourlyRate as object),
      gte: minRate,
    }
  }
  if (maxRate !== null) {
    profileWhere.hourlyRate = {
      ...(profileWhere.hourlyRate as object),
      lte: maxRate,
    }
  }
  if (minRating !== null) {
    profileWhere.avgRating = { gte: minRating }
  }

  // ─── city → name через таблицю City ───
  let cityName: string | null = null
  if (validCity) {
    const cityRow = await prisma.city.findUnique({
      where: { slug: validCity },
      select: { name: true },
    })
    cityName = cityRow?.name ?? null
  }

  // ─── where для User ───
  // Security-by-default: тільки VERIFIED майстри в каталозі.
  const userWhere: Prisma.UserWhereInput = {
    role: 'FREELANCER',
    verificationStatus: 'VERIFIED',
    freelancerProfile: { is: profileWhere },
  }

  if (cityName) {
    userWhere.city = cityName
  }

  // type фільтр — поки no-op (тип роботи на рівні Gig, не профілю)
  void validType

  // ─── Сортування ───
  const orderBy: Prisma.UserOrderByWithRelationInput[] = (() => {
    switch (sort) {
      case 'priceAsc':
        return [{ freelancerProfile: { hourlyRate: 'asc' } }]
      case 'priceDesc':
        return [{ freelancerProfile: { hourlyRate: 'desc' } }]
      case 'newest':
        return [{ createdAt: 'desc' }]
      case 'popular':
        return [{ freelancerProfile: { totalOrders: 'desc' } }]
      case 'rating':
      default:
        return [
          { freelancerProfile: { avgRating: 'desc' } },
          { freelancerProfile: { reviewsCount: 'desc' } },
        ]
    }
  })()

  // ─── Запити: майстри + total + cities — паралельно ───
  const [masters, total, allCities] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        city: true,
        verificationStatus: true,
        freelancerProfile: {
          select: {
            categories: true,
            hourlyRate: true,
            avgRating: true,
            reviewsCount: true,
            totalOrders: true,
            experience: true,
          },
        },
      },
    }),
    prisma.user.count({ where: userWhere }),
    prisma.city.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { slug: true, name: true },
    }),
  ])

  const items: MasterCard[] = masters.map((u) => {
    const fp = u.freelancerProfile
    return {
      id: u.id,
      name: u.name ?? '',
      username: u.username,
      avatar: u.avatar,
      bio: u.bio,
      city: u.city,
      categories: fp?.categories ?? [],
      rating: fp?.avgRating ?? 0,
      reviewsCount: fp?.reviewsCount ?? 0,
      ordersCount: fp?.totalOrders ?? 0,
      hourlyRate: fp?.hourlyRate ?? null,
      experience: fp?.experience
        ? (experienceLabels[fp.experience] ?? null)
        : null,
      isVerified: u.verificationStatus === 'VERIFIED',
    }
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // ─── Cache: публічна сторінка категорії ───
  setHeaders({
    'cache-control':
      'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
  })

  const response: ServicesPageResponse = {
    category,
    cities: [{ slug: 'all', name: 'Вся Україна' }, ...allCities],
    items,
    total,
    page,
    totalPages,
    pageSize: PAGE_SIZE,
    filters: {
      sub: validSub,
      city: validCity,
      type: validType,
      minRate,
      maxRate,
      minRating,
      sort,
    },
  }

  return json(response)
}
