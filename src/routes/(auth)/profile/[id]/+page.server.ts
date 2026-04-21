// src/routes/(auth)/profile/[id]/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

const experienceLabels: Record<string, string> = {
  LT_1: 'менше 1 року',
  Y_1_2: '1–2 роки',
  Y_3_5: '3–5 років',
  Y_5_10: '5–10 років',
  Y_10_PLUS: '10+ років',
}

export const load: PageServerLoad = async ({ params, request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  const isAuthenticated = !!session

  // Якщо свій id — на /dashboard
  if (session && params.id === session.user.id) {
    throw redirect(302, '/dashboard')
  }

  // Приймаємо і id, і username
  const where = params.id.startsWith('@')
    ? { username: params.id.slice(1) }
    : { id: params.id }

  const user = await prisma.user.findUnique({
    where,
    select: {
      id: true,
      name: true,
      username: true,
      avatar: true,
      bio: true,
      city: true,
      phone: true,
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

  const fp = user.freelancerProfile
  const totalOrders = fp?.totalOrders ?? 0
  const completedOrders = fp?.completedOrders ?? 0
  const successRate =
    totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0

  const portfolio = user.portfolioImages.map((url, i) => ({
    id: String(i),
    imageUrl: url,
  }))

  // TODO: коли буде модель Follow
  const isFollowing = false

  // ⚠️ Телефон віддаємо тільки авторизованим. Гість побачить CTA «Увійти».
  // verificationRejectReason ЗАВЖДИ приховуємо від чужих.
  const phone = isAuthenticated ? (user.phone ?? undefined) : undefined

  return {
    user: {
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
      reviews: [] as never[],
      portfolio,
    },
    isFollowing,
    isAuthenticated,
  }
}
