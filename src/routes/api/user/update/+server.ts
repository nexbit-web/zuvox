// src/routes/api/user/update/+server.ts
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

interface UpdatePayload {
  // User fields
  role?: 'CLIENT' | 'FREELANCER'
  name?: string
  phone?: string
  city?: string
  bio?: string

  // FreelancerProfile fields
  categories?: string[]
  skills?: string[]
  hourlyRate?: number
  experience?: string // LT_1 | 1_2 | 3_5 | 5_10 | 10_PLUS
  languages?: string[]
  portfolioUrl?: string

  /** Якщо true — встановлює verificationStatus = PENDING (фрілансер завершив онбординг) */
  submitForReview?: boolean
}

// Мапінг з UI-значень у enum
const experienceMap: Record<string, string> = {
  LT_1: 'LT_1',
  '1_2': 'Y_1_2',
  '3_5': 'Y_3_5',
  '5_10': 'Y_5_10',
  '10_PLUS': 'Y_10_PLUS',
}

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json()) as UpdatePayload
  const userId = session.user.id

  // ─── Валідація ───
  if (body.role && !['CLIENT', 'FREELANCER'].includes(body.role)) {
    return json({ error: 'Invalid role' }, { status: 400 })
  }
  if (body.hourlyRate !== undefined && body.hourlyRate < 0) {
    return json({ error: 'Invalid hourly rate' }, { status: 400 })
  }
  if (body.bio && body.bio.length > 500) {
    return json({ error: 'Bio too long' }, { status: 400 })
  }
  if (body.experience && !experienceMap[body.experience]) {
    return json({ error: 'Invalid experience' }, { status: 400 })
  }

  // ─── Оновлення User ───
  const userData: Record<string, unknown> = {}
  if (body.role) userData.role = body.role
  if (body.name) userData.name = body.name
  if (body.phone) userData.phone = body.phone
  if (body.city) userData.city = body.city
  if (body.bio !== undefined) userData.bio = body.bio

  // Якщо юзер надсилає профіль на перевірку — ставимо PENDING
  // (але не відкочуємо VERIFIED назад у PENDING при звичайних оновленнях)
  if (body.submitForReview) {
    userData.verificationStatus = 'PENDING'
    userData.verificationRejectReason = null
  }

  if (Object.keys(userData).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: userData,
    })
  }

  // ─── Оновлення/створення FreelancerProfile ───
  const isFreelancerData =
    body.categories !== undefined ||
    body.skills !== undefined ||
    body.hourlyRate !== undefined ||
    body.experience !== undefined ||
    body.languages !== undefined ||
    body.portfolioUrl !== undefined

  if (isFreelancerData) {
    const profileData: Record<string, unknown> = {}
    if (body.categories !== undefined) profileData.categories = body.categories
    if (body.skills !== undefined) profileData.skills = body.skills
    if (body.hourlyRate !== undefined) profileData.hourlyRate = body.hourlyRate
    if (body.languages !== undefined) profileData.languages = body.languages
    if (body.portfolioUrl !== undefined)
      profileData.portfolioUrl = body.portfolioUrl
    if (body.experience !== undefined) {
      profileData.experience = experienceMap[body.experience]
    }

    await prisma.freelancerProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...profileData,
      },
      update: profileData,
    })
  }

  return json({ ok: true })
}
