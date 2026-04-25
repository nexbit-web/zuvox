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

type DashboardData =
  | {
      profileType: 'freelancer'
      isOwner: true
      isAuthenticated: true
      user: FreelancerProfileData
    }
  | {
      profileType: 'client'
      isOwner: true
      isAuthenticated: true
      user: ClientProfileData
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
        where: { isActive: true },
        select: { id: true, title: true, price: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!user) throw redirect(302, '/user/login')

  // ─── КЛІЄНТ ───
  if (user.role === 'CLIENT') {
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
      reviews: [],
    }

    return {
      profileType: 'client',
      isOwner: true,
      isAuthenticated: true,
      user: clientUser,
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

    gigs: user.gigs,
    reviews: [],
    portfolio,
  }

  return {
    profileType: 'freelancer',
    isOwner: true,
    isAuthenticated: true,
    user: freelancerUser,
  }
}