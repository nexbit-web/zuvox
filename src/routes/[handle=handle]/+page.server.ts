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

/**
 * /@username
 *
 * Правила доступу:
 *   • FREELANCER → публічний, дивиться всі (навіть гості)
 *   • CLIENT     → приватний за замовчуванням (404 для всіх)
 *     ВИНЯТОК: якщо поточний user-фрілансер має чат з цим клієнтом —
 *     дозволяємо перегляд. Це для випадку коли клієнт написав
 *     фрілансеру і той хоче подивитися хто це.
 *
 * Свій профіль завжди → /dashboard.
 */
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

  if (!user) throw error(404, 'Користувача не знайдено')

  // Свій профіль → редірект на /dashboard
  if (session && user.id === session.user.id) {
    throw redirect(302, '/dashboard')
  }

  // ─── CLIENT: перевірка приватності ───
  if (user.role === 'CLIENT') {
    // Гість — завжди 404
    if (!session) throw error(404, 'Користувача не знайдено')

    // Перевіряємо чи поточний юзер є фрілансером
    // (тільки фрілансери можуть бачити клієнтів)
    if (session.user.role !== 'FREELANCER') {
      throw error(404, 'Користувача не знайдено')
    }

    // Перевіряємо чи між ними є чат (DM з рівно 2 учасниками)
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

    // ─── Дозволено: рендеримо клієнтський профіль ───
    const clientUser: ClientProfileData = {
      id: user.id,
      name: user.name ?? '',
      username: user.username ?? undefined,
      avatar: user.avatar ?? undefined,
      bio: user.bio ?? undefined,
      city: user.city ?? undefined,
      createdAt: user.createdAt.toISOString(),
      verificationStatus: user.verificationStatus,
      // Замовлення/відгуки покажемо коли буде Order модель
      totalOrders: 0,
      completedOrders: 0,
      reviews: [],
    }

    return {
      profileType: 'client',
      isOwner: false,
      isAuthenticated: true,
      user: clientUser,
    }
  }

  // ─── FREELANCER: публічний, рендеримо завжди ───
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

  // Phone тільки для авторизованих
  const phone = isAuthenticated ? (user.phone ?? undefined) : undefined

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

    gigs: user.gigs,
    reviews: [],
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
