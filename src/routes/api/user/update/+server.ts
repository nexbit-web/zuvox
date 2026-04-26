// src/routes/api/user/update/+server.ts
import { json } from '@sveltejs/kit'
import { Prisma, ExperienceLevel, VerificationStatus, Role } from '../../../../generated/prisma/client'
import { prisma } from '$lib/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

interface UpdatePayload {
  role?: 'CLIENT' | 'FREELANCER'
  username?: string
  name?: string
  phone?: string
  city?: string
  bio?: string

  categories?: string[]
  skills?: string[]
  hourlyRate?: number
  experience?: string
  languages?: string[]
  portfolioUrl?: string

  submitForReview?: boolean
}

const experienceMap: Record<string, ExperienceLevel> = {
  LT_1: ExperienceLevel.LT_1,
  '1_2': ExperienceLevel.Y_1_2,
  '3_5': ExperienceLevel.Y_3_5,
  '5_10': ExperienceLevel.Y_5_10,
  '10_PLUS': ExperienceLevel.Y_10_PLUS,
}

// Повторна перевірка username на сервері — не довіряємо клієнту
const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/

const RESERVED = new Set([
  'admin', 'root', 'api', 'support', 'help', 'zunor', 'system',
  'user', 'users', 'profile', 'dashboard', 'settings', 'login',
  'register', 'signup', 'logout', 'moderation', 'verified',
  'null', 'undefined', 'anonymous',
])

// Валідація phone: тільки цифри, +, пробіли, дужки, дефіси; 8-20 символів
const PHONE_RE = /^[\d\s+()-]{8,20}$/

// Валідація URL: https:// тільки (щоб не пропустити javascript: URI)
function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

export const POST: RequestHandler = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return json({ error: 'Unauthorized' }, { status: 401 })

  let body: UpdatePayload
  try {
    body = (await request.json()) as UpdatePayload
  } catch {
    return json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const userId = session.user.id

  // ─── Валідація ───
  if (body.role && !['CLIENT', 'FREELANCER'].includes(body.role)) {
    return json({ error: 'Invalid role' }, { status: 400 })
  }
  if (body.hourlyRate !== undefined) {
    if (
      typeof body.hourlyRate !== 'number' ||
      !Number.isFinite(body.hourlyRate) ||
      body.hourlyRate < 0 ||
      body.hourlyRate > 1_000_000
    ) {
      return json({ error: 'Invalid hourly rate' }, { status: 400 })
    }
  }
  if (body.bio !== undefined && body.bio.length > 500) {
    return json({ error: 'Bio too long' }, { status: 400 })
  }
  if (body.name !== undefined && (body.name.length < 1 || body.name.length > 80)) {
    return json({ error: 'Invalid name length' }, { status: 400 })
  }
  if (body.city !== undefined && body.city.length > 60) {
    return json({ error: 'Invalid city' }, { status: 400 })
  }
  if (body.phone !== undefined && body.phone && !PHONE_RE.test(body.phone)) {
    return json({ error: 'Invalid phone' }, { status: 400 })
  }
  if (body.experience && !experienceMap[body.experience]) {
    return json({ error: 'Invalid experience' }, { status: 400 })
  }
  if (
    body.portfolioUrl !== undefined &&
    body.portfolioUrl &&
    !isValidUrl(body.portfolioUrl)
  ) {
    return json({ error: 'Invalid portfolio URL' }, { status: 400 })
  }
  if (body.categories !== undefined) {
    if (!Array.isArray(body.categories) || body.categories.length > 3) {
      return json({ error: 'Invalid categories' }, { status: 400 })
    }
  }
  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills) || body.skills.length > 10) {
      return json({ error: 'Invalid skills' }, { status: 400 })
    }
  }
  if (body.languages !== undefined) {
    if (!Array.isArray(body.languages) || body.languages.length > 10) {
      return json({ error: 'Invalid languages' }, { status: 400 })
    }
  }

  // ─── Username — окрема валідація ───
  if (body.username !== undefined) {
    const u = body.username.trim().toLowerCase()
    if (!USERNAME_RE.test(u)) {
      return json(
        { error: 'Invalid username format', field: 'username' },
        { status: 400 },
      )
    }
    if (RESERVED.has(u)) {
      return json(
        { error: 'Username is reserved', field: 'username' },
        { status: 400 },
      )
    }
    // нормалізуємо
    body.username = u
  }

  // ─── Оновлення User ───
  const userData: Prisma.UserUpdateInput = {}
  if (body.role) userData.role = body.role as Role
  if (body.name) userData.name = body.name
  if (body.phone !== undefined) userData.phone = body.phone
  if (body.city) userData.city = body.city
  if (body.bio !== undefined) userData.bio = body.bio
  if (body.username !== undefined) userData.username = body.username

  if (body.submitForReview) {
    userData.verificationStatus = VerificationStatus.PENDING
    userData.verificationRejectReason = null
  }

  if (Object.keys(userData).length > 0) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: userData,
      })
    } catch (err) {
      // P2002 — unique constraint (username вже зайнято)
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        return json(
          { error: 'Username already taken', field: 'username' },
          { status: 409 },
        )
      }
      throw err
    }
  }

  // ─── FreelancerProfile ───
  const isFreelancerData =
    body.categories !== undefined ||
    body.skills !== undefined ||
    body.hourlyRate !== undefined ||
    body.experience !== undefined ||
    body.languages !== undefined ||
    body.portfolioUrl !== undefined

  if (isFreelancerData) {
    // UPDATE — часткове оновлення
    const updateData: Prisma.FreelancerProfileUpdateInput = {}
    if (body.categories !== undefined) updateData.categories = body.categories
    if (body.skills !== undefined) updateData.skills = body.skills
    if (body.hourlyRate !== undefined) updateData.hourlyRate = body.hourlyRate
    if (body.languages !== undefined) updateData.languages = body.languages
    if (body.portfolioUrl !== undefined) updateData.portfolioUrl = body.portfolioUrl
    if (body.experience !== undefined) updateData.experience = experienceMap[body.experience]

    // CREATE — використовуємо UncheckedCreateInput, бо він дозволяє userId
    // напряму (без connect-syntax). Дефолти ([], null) виставить Prisma.
    const createData: Prisma.FreelancerProfileUncheckedCreateInput = {
      userId,
      ...(body.categories !== undefined && { categories: body.categories }),
      ...(body.skills !== undefined && { skills: body.skills }),
      ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate }),
      ...(body.languages !== undefined && { languages: body.languages }),
      ...(body.portfolioUrl !== undefined && { portfolioUrl: body.portfolioUrl }),
      ...(body.experience !== undefined && { experience: experienceMap[body.experience] }),
    }

    await prisma.freelancerProfile.upsert({
      where: { userId },
      create: createData,
      update: updateData,
    })
  }

  return json({ ok: true })
}