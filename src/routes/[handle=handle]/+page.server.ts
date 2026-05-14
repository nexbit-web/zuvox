// src/routes/[handle=handle]/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import type {
  FreelancerProfileData,
  ClientProfileData,
} from '$lib/components/profile/types'

const experienceLabels: Record<string, string> = {
  LT_1: 'менше 1 року',
  Y_1_2: '1–2 роки',
  Y_3_5: '3–5 років',
  Y_5_10: '5–10 років',
  Y_10_PLUS: '10+ років',
}

const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/

interface FreelancerHandleData {
  profileType: 'freelancer'
  isOwner: false
  isAuthenticated: boolean
  isFollowing: boolean
  user: FreelancerProfileData
}

interface ClientHandleData {
  profileType: 'client'
  isOwner: false
  isAuthenticated: true
  user: ClientProfileData
}

type HandleData = FreelancerHandleData | ClientHandleData

async function loadFreelancerReviews(freelancerId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      direction: 'CLIENT_TO_FREELANCER',
      order: { freelancerId },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  })

  return reviews.map((r) => {
    const name = r.author.name ?? 'Користувач'
    return {
      id: r.id,
      authorName: name,
      authorInitials: name[0]?.toUpperCase() ?? '?',
      rating: r.rating,
      text: r.comment ?? '',
      createdAt: r.createdAt.toISOString(),
    }
  })
}

async function loadClientReviews(clientId: string) {
  const reviews = await prisma.review.findMany({
    where: {
      direction: 'FREELANCER_TO_CLIENT',
      order: { clientId },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
      order: {
        select: {
          gig: {
            select: { title: true },
          },
        },
      },
    },
  })

  return reviews.map((r) => {
    const name = r.author.name ?? 'Майстер'
    return {
      id: r.id,
      masterName: name,
      masterInitials: name[0]?.toUpperCase() ?? '?',
      rating: r.rating,
      text: r.comment ?? '',
      createdAt: r.createdAt.toISOString(),
      gig: r.order.gig?.title ?? '',
    }
  })
}

/**
 * Резолвить slug категорії та підкатегорії у читані назви.
 * Робиться в одному запиті: дістаємо категорію разом із її підкатегоріями
 * і потім шукаємо потрібну підкатегорію локально. Це швидше ніж два окремі
 * запити, бо ходимо в БД один раз.
 */
async function resolveCategoryNames(
  categorySlug: string | undefined,
  subcategorySlug: string | null | undefined,
): Promise<{ categoryName: string | null; subcategoryName: string | null }> {
  if (!categorySlug) {
    return { categoryName: null, subcategoryName: null }
  }

  const cat = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: {
      name: true,
      subcategories: subcategorySlug
        ? {
            where: { slug: subcategorySlug },
            select: { name: true },
            take: 1,
          }
        : false,
    },
  })

  if (!cat) {
    return { categoryName: null, subcategoryName: null }
  }

  return {
    categoryName: cat.name,
    subcategoryName:
      subcategorySlug && Array.isArray(cat.subcategories)
        ? (cat.subcategories[0]?.name ?? null)
        : null,
  }
}

export const load: PageServerLoad = async ({
  params,
  request,
  setHeaders,
}): Promise<HandleData> => {
  // ─── 1. Парсинг і валідація username ───
  const raw = params.handle.startsWith('@')
    ? params.handle.slice(1)
    : params.handle

  const username = raw.trim().toLowerCase()

  if (!USERNAME_RE.test(username)) {
    throw error(404, 'Користувача не знайдено')
  }

  // ─── 2. Сесія + основний запит — ПАРАЛЕЛЬНО ───
  const [session, user] = await Promise.all([
    auth.api.getSession({ headers: request.headers }),
    prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        city: true,
        phone: true,
        role: true,
        createdAt: true,
        verificationStatus: true,
        portfolioImages: true,
        clientAvgRating: true,
        clientReviewsCount: true,
        freelancerProfile: {
          select: {
            categories: true,
            subcategory: true, // ← ДОДАНО
            skills: {
              select: {
                skill: { select: { slug: true, name: true } },
              },
            },
            languages: true,
            experience: true,
            hourlyRate: true,
            portfolioUrl: true,

            // ─── ДОДАНО: формат роботи ───
            worksOnline: true,
            worksOffline: true,
            worksOnSite: true,

            // ─── ДОДАНО: географія ───
            serviceCities: true,
            willTravel: true,
            travelRadiusKm: true,
            primaryCity: true,

            avgRating: true,
            reviewsCount: true,
            totalOrders: true,
            completedOrders: true,
            responseTimeHrs: true,
            repeatClientsPct: true,
            followers: true,
          },
        },
        gigs: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            title: true,
            slug: true,
            packages: {
              orderBy: { priceCents: 'asc' },
              select: { priceCents: true },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    }),
  ])

  const isAuthenticated = !!session

  if (!user) throw error(404, 'Користувача не знайдено')

  if (session && user.id === session.user.id) {
    throw redirect(302, '/dashboard')
  }

  // ─── 3. CLIENT ───
  if (user.role === 'CLIENT') {
    if (!session) throw error(404, 'Користувача не знайдено')
    if (session.user.role !== 'FREELANCER') {
      throw error(404, 'Користувача не знайдено')
    }

    const [sharedChat, reviews] = await Promise.all([
      prisma.chat.findFirst({
        where: {
          AND: [
            { members: { some: { userId: session.user.id } } },
            { members: { some: { userId: user.id } } },
          ],
        },
        select: { id: true },
      }),
      loadClientReviews(user.id),
    ])

    if (!sharedChat) throw error(404, 'Користувача не знайдено')

    setHeaders({
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    })

    const clientUser: ClientProfileData = {
      id: user.id,
      name: user.name ?? '',
      username: user.username ?? undefined,
      avatar: user.avatar ?? undefined,
      bio: user.bio ?? undefined,
      city: user.city ?? undefined,
      createdAt: user.createdAt.toISOString(),
      verificationStatus: user.verificationStatus,
      totalOrders: 0,
      completedOrders: 0,
      reviews,
    }

    return {
      profileType: 'client',
      isOwner: false,
      isAuthenticated: true,
      user: clientUser,
    }
  }

  // ─── 4. FREELANCER ───
  const fp = user.freelancerProfile

  // Резолв категорії/підкатегорії — паралельно з рештою запитів
  const categorySlug = fp?.categories?.[0]
  const subcategorySlug = fp?.subcategory ?? null

  const [followRow, reviews, categoryNames] = await Promise.all([
    session
      ? prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.user.id,
              followingId: user.id,
            },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    loadFreelancerReviews(user.id),
    resolveCategoryNames(categorySlug, subcategorySlug),
  ])

  const isFollowing = !!followRow

  const totalOrders = fp?.totalOrders ?? 0
  const completedOrders = fp?.completedOrders ?? 0
  const successRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  const portfolio = user.portfolioImages.map((url, i) => ({
    id: String(i),
    imageUrl: url,
  }))

  const hasPhone =
    isAuthenticated && user.verificationStatus === 'VERIFIED' && !!user.phone

  const gigsForUi = user.gigs.map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    price:
      g.packages.length > 0 ? Math.round(g.packages[0].priceCents / 100) : 0,
  }))

  const skillsForUi =
    fp?.skills.map((fs) => ({
      slug: fs.skill.slug,
      name: fs.skill.name,
    })) ?? []

  if (user.verificationStatus === 'VERIFIED') {
    setHeaders({
      'cache-control':
        'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
    })
  } else {
    setHeaders({
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    })
  }

  const profileUser: FreelancerProfileData = {
    id: user.id,
    name: user.name ?? '',
    username: user.username ?? undefined,
    avatar: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
    city: user.city ?? undefined,
    hasPhone,
    createdAt: user.createdAt.toISOString(),

    verificationStatus: user.verificationStatus,
    verificationRejectReason: null,

    // ─── Категорія + підкатегорія: slug + name ───
    categories: fp?.categories ?? [],
    categoryName: categoryNames.categoryName,
    subcategory: fp?.subcategory ?? null,
    subcategoryName: categoryNames.subcategoryName,

    skills: skillsForUi,
    languages: fp?.languages ?? [],
    experience: fp?.experience ? experienceLabels[fp.experience] : null,
    hourlyRate: fp?.hourlyRate ?? null,
    portfolioUrl: fp?.portfolioUrl ?? null,

    // ─── Формат роботи ───
    worksOnline: fp?.worksOnline ?? false,
    worksOffline: fp?.worksOffline ?? false,
    worksOnSite: fp?.worksOnSite ?? false,

    // ─── Географія ───
    serviceCities: fp?.serviceCities ?? [],
    willTravel: fp?.willTravel ?? false,
    travelRadiusKm: fp?.travelRadiusKm ?? null,

    avgRating: fp?.avgRating ?? 0,
    reviewsCount: fp?.reviewsCount ?? 0,
    totalOrders,
    completedOrders,
    responseTimeHrs: fp?.responseTimeHrs ?? null,
    repeatClientsPct: fp?.repeatClientsPct ?? 0,
    followers: fp?.followers ?? 0,
    successRate,

    gigs: gigsForUi,
    reviews,
    portfolio,
  }

  return {
    profileType: 'freelancer',
    isOwner: false,
    isAuthenticated,
    isFollowing,
    user: profileUser,
  }
}
