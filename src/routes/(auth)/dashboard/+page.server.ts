// src/routes/(auth)/dashboard/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
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

export interface FollowingFreelancer {
  id: string
  username: string | null
  name: string
  avatar: string | null
  bio: string | null
  city: string | null
  categories: string[]
  hourlyRate: number | null
  avgRating: number
  reviewsCount: number
  isVerified: boolean
}

type DashboardData =
  | {
      profileType: 'freelancer'
      isOwner: true
      isAuthenticated: true
      user: FreelancerProfileData
      following: FollowingFreelancer[]
    }
  | {
      profileType: 'client'
      isOwner: true
      isAuthenticated: true
      user: ClientProfileData
      following: FollowingFreelancer[]
    }

async function loadFollowing(userId: string): Promise<FollowingFreelancer[]> {
  const follows = await prisma.follow.findMany({
    where: { followerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      following: {
        select: {
          id: true,
          username: true,
          name: true,
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
            },
          },
        },
      },
    },
  })

  return follows.map((f) => ({
    id: f.following.id,
    username: f.following.username,
    name: f.following.name ?? '',
    avatar: f.following.avatar,
    bio: f.following.bio,
    city: f.following.city,
    categories: f.following.freelancerProfile?.categories ?? [],
    hourlyRate: f.following.freelancerProfile?.hourlyRate ?? null,
    avgRating: f.following.freelancerProfile?.avgRating ?? 0,
    reviewsCount: f.following.freelancerProfile?.reviewsCount ?? 0,
    isVerified: f.following.verificationStatus === 'VERIFIED',
  }))
}

/**
 * Завантажує відгуки про фрілансера (CLIENT_TO_FREELANCER).
 */
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
      author: {
        select: {
          id: true,
          name: true,
        },
      },
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

/**
 * Завантажує відгуки про клієнта (FREELANCER_TO_CLIENT).
 * Автор — фрілансер (master).
 */
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
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      order: {
        select: {
          gig: {
            select: {
              id: true,
              title: true,
              slug: true,
            },
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
  request,
}): Promise<DashboardData> => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
      verificationRejectReason: true,
      portfolioImages: true,
      clientAvgRating: true,
      clientReviewsCount: true,
      freelancerProfile: {
        select: {
          categories: true,
          skills: true,
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
  })

  if (!user) throw redirect(302, '/user/login')

  const following = await loadFollowing(user.id)

  // ─── КЛІЄНТ ───
  if (user.role === 'CLIENT') {
    const reviews = await loadClientReviews(user.id)

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
      isOwner: true,
      isAuthenticated: true,
      user: clientUser,
      following,
    }
  }

  // ─── ФРІЛАНСЕР ───
  const fp = user.freelancerProfile
  const totalOrders = fp?.totalOrders ?? 0
  const completedOrders = fp?.completedOrders ?? 0
  const successRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  const portfolio = user.portfolioImages.map((url, i) => ({
    id: String(i),
    imageUrl: url,
  }))

  const gigsForUi = user.gigs.map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    price:
      g.packages.length > 0 ? Math.round(g.packages[0].priceCents / 100) : 0,
  }))

  const reviews = await loadFreelancerReviews(user.id)

  const freelancerUser: FreelancerProfileData = {
    id: user.id,
    name: user.name ?? '',
    username: user.username ?? undefined,
    avatar: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
    city: user.city ?? undefined,
    phone: user.phone ?? undefined,
    createdAt: user.createdAt.toISOString(),

    verificationStatus: user.verificationStatus,
    verificationRejectReason: user.verificationRejectReason,

    categories: fp?.categories ?? [],
    skills: fp?.skills ?? [],
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
    isOwner: true,
    isAuthenticated: true,
    user: freelancerUser,
    following,
  }
}
