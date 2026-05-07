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

// Білий список символів для username — узгоджений з валідацією на /api/user/update.
// Захист від SQL-injection (Prisma і так захищає, але як defense-in-depth)
// та від спроб дотягнутися до службових ендпоінтів через дивні URL.
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

export const load: PageServerLoad = async ({
  params,
  request,
  setHeaders,
}): Promise<HandleData> => {
  // ─── 1. Парсинг і валідація username ───
  // params.handle приходить як "@nickname" (matcher гарантує @-префікс)
  const raw = params.handle.startsWith('@')
    ? params.handle.slice(1)
    : params.handle

  const username = raw.trim().toLowerCase()

  // Якщо формат не валідний — 404 без походу в БД (захист від мусорних URL,
  // sql probes, спроб ентерпрайзу через ../../ і т.п.)
  if (!USERNAME_RE.test(username)) {
    throw error(404, 'Користувача не знайдено')
  }

  // ─── 2. Сесія + основний запит — ПАРАЛЕЛЬНО ───
  // Сесія читається з cookies, profile — з БД. Незалежні I/O = можна паралельно.
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
            skills: {
              select: {
                skill: { select: { slug: true, name: true } },
              },
            },
            languages: true,
            experience: true,
            hourlyRate: true,
            portfolioUrl: true,
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

  // Власник — редірект на dashboard, не показуємо чужий публічний URL
  if (session && user.id === session.user.id) {
    throw redirect(302, '/dashboard')
  }

  // ─── 3. CLIENT: приватність (без змін у логіці) ───
  if (user.role === 'CLIENT') {
    if (!session) throw error(404, 'Користувача не знайдено')
    if (session.user.role !== 'FREELANCER') {
      throw error(404, 'Користувача не знайдено')
    }

    // Перевірка спільного чату + завантаження відгуків — паралельно
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

    // Клієнтські профілі — приватні, забороняємо кешування у CDN/проксі.
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
  // isFollowing + reviews — теж паралельно
  const [followRow, reviews] = await Promise.all([
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
  ])

  const isFollowing = !!followRow

  const fp = user.freelancerProfile
  const totalOrders = fp?.totalOrders ?? 0
  const completedOrders = fp?.completedOrders ?? 0
  const successRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  const portfolio = user.portfolioImages.map((url, i) => ({
    id: String(i),
    imageUrl: url,
  }))

  // ─── ВАЖЛИВО: phone більше НЕ передається у HTML.
  // Юзер запитує його окремо через GET /api/user/[id]/phone з лімітами.
  // Тут лише прапор "має телефон чи ні" — щоб UI знав, чи показувати кнопку.
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

  // ─── Кеш-заголовки для фрілансерів ───
  // VERIFIED + публічна сторінка → дозволяємо CDN короткий public-кеш (60с).
  // SWR ще 5 хвилин — швидкі повторні візити.
  // Для невиверифікованих — приватно, бо інакше CDN може кешувати "сирий" профіль.
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
    // Причину відмови НЕ показуємо чужим — це конфіденційна інформація.
    verificationRejectReason: null,

    categories: fp?.categories ?? [],
    skills: skillsForUi,
    languages: fp?.languages ?? [],
    experience: fp?.experience ? experienceLabels[fp.experience] : null,
    hourlyRate: fp?.hourlyRate ?? null,
    portfolioUrl: fp?.portfolioUrl ?? null,

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
