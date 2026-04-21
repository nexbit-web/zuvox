// src/routes/(auth)/profile/setup/freelancer/+page.server.ts
import { auth } from '$lib/auth'
import { prisma } from '$lib/prisma'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) throw redirect(302, '/user/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
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

  // Мапінг enum з БД у UI-значення
  const experienceReverse: Record<string, string> = {
    LT_1: 'LT_1',
    Y_1_2: '1_2',
    Y_3_5: '3_5',
    Y_5_10: '5_10',
    Y_10_PLUS: '10_PLUS',
  }

  return {
    prefill: {
      name: user?.name ?? session.user.name ?? '',
      phone: user?.phone ?? '',
      city: user?.city ?? '',
      bio: user?.bio ?? '',
      avatar: user?.avatar ?? '',
      portfolio,
      verificationStatus: user?.verificationStatus ?? 'NONE',
      categories: user?.freelancerProfile?.categories ?? [],
      skills: user?.freelancerProfile?.skills ?? [],
      experience: user?.freelancerProfile?.experience
        ? experienceReverse[user.freelancerProfile.experience] ?? ''
        : '',
      languages: user?.freelancerProfile?.languages ?? [],
      hourlyRate: user?.freelancerProfile?.hourlyRate?.toString() ?? '',
      portfolioUrl: user?.freelancerProfile?.portfolioUrl ?? '',
    },
  }
}