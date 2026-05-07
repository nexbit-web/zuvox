// src/routes/api/user/update/+server.ts
import { json } from '@sveltejs/kit'
import {
  Prisma,
  ExperienceLevel,
  VerificationStatus,
  Role,
} from '../../../../generated/prisma/client'
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
  skills?: string[] // ← тепер це slug-и навичок, не імена
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

const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/

const RESERVED = new Set([
  'admin',
  'root',
  'api',
  'support',
  'help',
  'zunor',
  'system',
  'user',
  'users',
  'profile',
  'dashboard',
  'settings',
  'login',
  'register',
  'signup',
  'logout',
  'moderation',
  'verified',
  'null',
  'undefined',
  'anonymous',
])

const PHONE_RE = /^[\d\s+()-]{8,20}$/

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
  if (
    body.name !== undefined &&
    (body.name.length < 1 || body.name.length > 80)
  ) {
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
    // Перевірка формату slug
    const validSlug = /^[a-z0-9-]{1,80}$/
    if (!body.skills.every((s) => typeof s === 'string' && validSlug.test(s))) {
      return json({ error: 'Invalid skill slugs' }, { status: 400 })
    }
  }
  if (body.languages !== undefined) {
    if (!Array.isArray(body.languages) || body.languages.length > 10) {
      return json({ error: 'Invalid languages' }, { status: 400 })
    }
  }

  // ─── Username ───
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
    body.username = u
  }

  // ─── Якщо прийшли skills — заздалегідь резолвимо slug → id,
  //     щоб не валити решту операцій якщо щось не так
  let resolvedSkillIds: string[] | null = null
  if (body.skills !== undefined) {
    if (body.skills.length === 0) {
      resolvedSkillIds = []
    } else {
      const skills = await prisma.skill.findMany({
        where: { slug: { in: body.skills } },
        select: { id: true, slug: true },
      })

      if (skills.length !== body.skills.length) {
        const found = new Set(skills.map((s) => s.slug))
        const missing = body.skills.filter((s) => !found.has(s))
        return json(
          { error: 'Some skills not found', missing },
          { status: 400 },
        )
      }

      resolvedSkillIds = skills.map((s) => s.id)
    }
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
    // Скаляри FreelancerProfile (без skills — вони тепер relation)
    const scalarUpdate: Prisma.FreelancerProfileUpdateInput = {}
    if (body.categories !== undefined) scalarUpdate.categories = body.categories
    if (body.hourlyRate !== undefined) scalarUpdate.hourlyRate = body.hourlyRate
    if (body.languages !== undefined) scalarUpdate.languages = body.languages
    if (body.portfolioUrl !== undefined)
      scalarUpdate.portfolioUrl = body.portfolioUrl
    if (body.experience !== undefined)
      scalarUpdate.experience = experienceMap[body.experience]

    const scalarCreate: Prisma.FreelancerProfileUncheckedCreateInput = {
      userId,
      ...(body.categories !== undefined && { categories: body.categories }),
      ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate }),
      ...(body.languages !== undefined && { languages: body.languages }),
      ...(body.portfolioUrl !== undefined && {
        portfolioUrl: body.portfolioUrl,
      }),
      ...(body.experience !== undefined && {
        experience: experienceMap[body.experience],
      }),
    }

    // Транзакція: upsert профілю + перезапис скілів
    await prisma.$transaction(async (tx) => {
      const profile = await tx.freelancerProfile.upsert({
        where: { userId },
        create: scalarCreate,
        update: scalarUpdate,
        select: { id: true },
      })

      // Якщо прийшли skills — повністю перезаписуємо звʼязки
      if (resolvedSkillIds !== null) {
        await tx.freelancerSkill.deleteMany({
          where: { freelancerId: profile.id },
        })

        if (resolvedSkillIds.length > 0) {
          await tx.freelancerSkill.createMany({
            data: resolvedSkillIds.map((skillId) => ({
              freelancerId: profile.id,
              skillId,
            })),
            skipDuplicates: true,
          })
        }
      }
    })
  }

  return json({ ok: true })
}
