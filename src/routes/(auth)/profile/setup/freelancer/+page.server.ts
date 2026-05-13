// src/routes/(auth)/profile/setup/freelancer/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

const experienceReverse: Record<string, string> = {
  LT_1: 'LT_1',
  Y_1_2: '1_2',
  Y_3_5: '3_5',
  Y_5_10: '5_10',
  Y_10_PLUS: '10_PLUS',
}

function suggestFromEmail(email: string | null | undefined): string {
  if (!email) return ''
  const local = email.split('@')[0] ?? ''
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
  if (!/^[a-z]/.test(cleaned)) return ''
  return cleaned.length >= 3 ? cleaned : ''
}

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      username: true,
      phone: true,
      city: true,
      bio: true,
      avatar: true,
      role: true,
      portfolioImages: true,
      portfolioImagesPublicIds: true,
      verificationStatus: true,
      freelancerProfile: {
        select: {
          categories: true,
          experience: true,
          languages: true,
          hourlyRate: true,
          portfolioUrl: true,

          // ─── НОВЕ: формат роботи ───
          worksOnline: true,
          worksOffline: true,
          worksOnSite: true,

          // ─── НОВЕ: географія ───
          primaryCity: true,
          serviceCities: true,
          willTravel: true,
          travelRadiusKm: true,
          travelFeeCents: true,

          // ─── НОВЕ: доступність ───
          isAvailable: true,
          unavailableUntil: true,

          // ─── НОВЕ: розклад ───
          workingHours: true,

          // skills через relation
          skills: {
            select: {
              skill: {
                select: { slug: true },
              },
            },
          },
        },
      },
    },
  })

  if (!user) throw redirect(302, '/user/login')

  // ⚠️ НЕ блокуємо доступ за статусом — юзер має право редагувати свій
  // профіль у будь-якому стані.

  const portfolio = (user.portfolioImages ?? []).map((url, i) => ({
    url,
    publicId: user.portfolioImagesPublicIds?.[i] ?? '',
  }))

  const username = user.username ?? suggestFromEmail(user.email)

  const skillSlugs =
    user.freelancerProfile?.skills.map((fs) => fs.skill.slug) ?? []

  const profile = user.freelancerProfile

  return {
    prefill: {
      // ─── User fields ───
      name: user.name ?? session.user.name ?? '',
      username,
      phone: user.phone ?? '',
      city: user.city ?? '',
      bio: user.bio ?? '',
      avatar: user.avatar ?? '',
      portfolio,
      verificationStatus: user.verificationStatus,
      isExistingFreelancer: user.role === 'FREELANCER',

      // ─── Profile fields ───
      categories: profile?.categories ?? [],
      skills: skillSlugs,
      experience: profile?.experience
        ? (experienceReverse[profile.experience] ?? '')
        : '',
      languages: profile?.languages ?? [],
      hourlyRate: profile?.hourlyRate?.toString() ?? '',
      portfolioUrl: profile?.portfolioUrl ?? '',

      // ─── НОВЕ: формат роботи (boolean → string для UI) ───
      worksOnline: profile?.worksOnline ?? true, // по дефолту онлайн
      worksOffline: profile?.worksOffline ?? false,
      worksOnSite: profile?.worksOnSite ?? false,

      // ─── НОВЕ: географія ───
      primaryCity: profile?.primaryCity ?? user.city ?? '',
      serviceCities: profile?.serviceCities ?? [],
      willTravel: profile?.willTravel ?? false,
      travelRadiusKm: profile?.travelRadiusKm?.toString() ?? '',
      travelFeeCents: profile?.travelFeeCents ?? null,

      // ─── НОВЕ: доступність ───
      isAvailable: profile?.isAvailable ?? true,
      unavailableUntil: profile?.unavailableUntil?.toISOString() ?? null,

      // ─── НОВЕ: розклад ───
      workingHours: profile?.workingHours ?? null,
    },
  }
}
