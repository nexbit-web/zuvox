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

/**
 * Якщо у юзера ще немає username — пропонуємо дефолтне значення з email
 * (тільки нормалізоване). UsernameInput перевірить доступність і якщо зайнято —
 * запропонує суфіксоване.
 */
function suggestFromEmail(email: string | null | undefined): string {
  if (!email) return ''
  const local = email.split('@')[0] ?? ''
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20)
  // username має починатися з літери
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
      portfolioImages: true,
      portfolioImagesPublicIds: true,
      verificationStatus: true,
      freelancerProfile: {
        select: {
          categories: true,
          skills: true,
          experience: true,
          languages: true,
          hourlyRate: true,
          portfolioUrl: true,
        },
      },
    },
  })

  const portfolio = (user?.portfolioImages ?? []).map((url, i) => ({
    url,
    publicId: user?.portfolioImagesPublicIds?.[i] ?? '',
  }))

  // Якщо username ще немає — пропонуємо значення з email. UsernameInput
  // автоматично перевірить доступність при першому рендері.
  const username = user?.username ?? suggestFromEmail(user?.email)

  return {
    prefill: {
      name: user?.name ?? session.user.name ?? '',
      username,
      phone: user?.phone ?? '',
      city: user?.city ?? '',
      bio: user?.bio ?? '',
      avatar: user?.avatar ?? '',
      portfolio,
      verificationStatus: user?.verificationStatus ?? 'NONE',
      categories: user?.freelancerProfile?.categories ?? [],
      skills: user?.freelancerProfile?.skills ?? [],
      experience: user?.freelancerProfile?.experience
        ? (experienceReverse[user.freelancerProfile.experience] ?? '')
        : '',
      languages: user?.freelancerProfile?.languages ?? [],
      hourlyRate: user?.freelancerProfile?.hourlyRate?.toString() ?? '',
      portfolioUrl: user?.freelancerProfile?.portfolioUrl ?? '',
    },
  }
}