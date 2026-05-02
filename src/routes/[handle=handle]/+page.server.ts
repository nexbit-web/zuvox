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
            select: { id: true, title: true, slug: true },
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
}): Promise<HandleData> => {
  const session = await auth.api.getSession({ headers: request.headers })
  const isAuthenticated = !!session

  const username = params.handle.slice(1).toLowerCase()

  const user = await prisma.user.findUnique({
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

  if (!user) throw error(404, 'Користувача не знайдено')

  if (session && user.id === session.user.id) {
    throw redirect(302, '/dashboard')
  }

  // ─── CLIENT: приватність ───
  if (user.role === 'CLIENT') {
    if (!session) throw error(404, 'Користувача не знайдено')

    if (session.user.role !== 'FREELANCER') {
      throw error(404, 'Користувача не знайдено')
    }

    const sharedChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { members: { some: { userId: session.user.id } } },
          { members: { some: { userId: user.id } } },
        ],
      },
      select: { id: true },
    })

    if (!sharedChat) throw error(404, 'Користувача не знайдено')

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
      isOwner: false,
      isAuthenticated: true,
      user: clientUser,
    }
  }

  // ─── FREELANCER ───
  let isFollowing = false
  if (session) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: user.id,
        },
      },
      select: { id: true },
    })
    isFollowing = !!follow
  }

  const fp = user.freelancerProfile
  const totalOrders = fp?.totalOrders ?? 0
  const completedOrders = fp?.completedOrders ?? 0
  const successRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  const portfolio = user.portfolioImages.map((url, i) => ({
    id: String(i),
    imageUrl: url,
  }))

  const phone = isAuthenticated ? (user.phone ?? undefined) : undefined

  const gigsForUi = user.gigs.map((g) => ({
    id: g.id,
    title: g.title,
    slug: g.slug,
    price:
      g.packages.length > 0 ? Math.round(g.packages[0].priceCents / 100) : 0,
  }))

  const reviews = await loadFreelancerReviews(user.id)

  const profileUser: FreelancerProfileData = {
    id: user.id,
    name: user.name ?? '',
    username: user.username ?? undefined,
    avatar: user.avatar ?? undefined,
    bio: user.bio ?? undefined,
    city: user.city ?? undefined,
    phone,
    createdAt: user.createdAt.toISOString(),

    verificationStatus: user.verificationStatus,
    verificationRejectReason: null,

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
    isOwner: false,
    isAuthenticated,
    isFollowing,
    user: profileUser,
  }
}
