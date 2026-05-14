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

  // Категорія + підкатегорія (по одній)
  categories?: string[] // масив через зворотну сумісність, але максимум 1 елемент
  subcategory?: string | null // slug підкатегорії

  skills?: string[]
  hourlyRate?: number
  experience?: string
  languages?: string[]
  portfolioUrl?: string

  // ─── НОВЕ: формат роботи ───
  worksOnline?: boolean
  worksOffline?: boolean
  worksOnSite?: boolean

  // ─── НОВЕ: географія ───
  serviceCities?: string[]
  willTravel?: boolean
  travelRadiusKm?: number | null

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
const SLUG_RE = /^[a-z0-9-]{1,80}$/
const PHONE_RE = /^[\d\s+()-]{8,20}$/

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

// ─── Ліміти (синхронізовані з фронтом) ───
const LIMITS = {
  BIO_MAX: 922,
  NAME_MAX: 80,
  CITY_MAX: 60,
  CATEGORIES_MAX: 1,
  SKILLS_MAX: 20,
  LANGUAGES_MAX: 10,
  SERVICE_CITIES_MAX: 20,
  TRAVEL_RADIUS_MAX: 500,
  HOURLY_RATE_MAX: 1_000_000,
} as const

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

  // ═══════ Валідація скалярів ═══════
  if (body.role && !['CLIENT', 'FREELANCER'].includes(body.role)) {
    return json({ error: 'Invalid role' }, { status: 400 })
  }

  if (body.hourlyRate !== undefined) {
    if (
      typeof body.hourlyRate !== 'number' ||
      !Number.isFinite(body.hourlyRate) ||
      body.hourlyRate < 0 ||
      body.hourlyRate > LIMITS.HOURLY_RATE_MAX
    ) {
      return json({ error: 'Invalid hourly rate' }, { status: 400 })
    }
  }

  if (body.bio !== undefined && body.bio.length > LIMITS.BIO_MAX) {
    return json({ error: 'Bio too long' }, { status: 400 })
  }

  if (
    body.name !== undefined &&
    (body.name.length < 1 || body.name.length > LIMITS.NAME_MAX)
  ) {
    return json({ error: 'Invalid name length' }, { status: 400 })
  }

  if (body.city !== undefined && body.city.length > LIMITS.CITY_MAX) {
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

  // ─── Категорія: тепер ОДНА (масив із 0-1 елементом) ───
  if (body.categories !== undefined) {
    if (
      !Array.isArray(body.categories) ||
      body.categories.length > LIMITS.CATEGORIES_MAX
    ) {
      return json({ error: 'Invalid categories' }, { status: 400 })
    }
    // Категорія тепер це slug
    if (
      !body.categories.every((c) => typeof c === 'string' && SLUG_RE.test(c))
    ) {
      return json({ error: 'Invalid category slug' }, { status: 400 })
    }
  }

  // ─── Підкатегорія ───
  if (body.subcategory !== undefined && body.subcategory !== null) {
    if (
      typeof body.subcategory !== 'string' ||
      !SLUG_RE.test(body.subcategory)
    ) {
      return json({ error: 'Invalid subcategory slug' }, { status: 400 })
    }
  }

  // ─── Skills ───
  if (body.skills !== undefined) {
    if (!Array.isArray(body.skills) || body.skills.length > LIMITS.SKILLS_MAX) {
      return json({ error: 'Invalid skills' }, { status: 400 })
    }
    if (!body.skills.every((s) => typeof s === 'string' && SLUG_RE.test(s))) {
      return json({ error: 'Invalid skill slugs' }, { status: 400 })
    }
  }

  // ─── Languages ───
  if (body.languages !== undefined) {
    if (
      !Array.isArray(body.languages) ||
      body.languages.length > LIMITS.LANGUAGES_MAX
    ) {
      return json({ error: 'Invalid languages' }, { status: 400 })
    }
  }

  // ─── Формат роботи ───
  if (body.worksOnline !== undefined && typeof body.worksOnline !== 'boolean') {
    return json({ error: 'Invalid worksOnline' }, { status: 400 })
  }
  if (
    body.worksOffline !== undefined &&
    typeof body.worksOffline !== 'boolean'
  ) {
    return json({ error: 'Invalid worksOffline' }, { status: 400 })
  }
  if (body.worksOnSite !== undefined && typeof body.worksOnSite !== 'boolean') {
    return json({ error: 'Invalid worksOnSite' }, { status: 400 })
  }

  // ─── Географія ───
  if (body.serviceCities !== undefined) {
    if (
      !Array.isArray(body.serviceCities) ||
      body.serviceCities.length > LIMITS.SERVICE_CITIES_MAX
    ) {
      return json({ error: 'Invalid serviceCities' }, { status: 400 })
    }
    if (
      !body.serviceCities.every((c) => typeof c === 'string' && c.length <= 60)
    ) {
      return json({ error: 'Invalid serviceCities content' }, { status: 400 })
    }
  }

  if (body.willTravel !== undefined && typeof body.willTravel !== 'boolean') {
    return json({ error: 'Invalid willTravel' }, { status: 400 })
  }

  if (body.travelRadiusKm !== undefined && body.travelRadiusKm !== null) {
    if (
      typeof body.travelRadiusKm !== 'number' ||
      !Number.isFinite(body.travelRadiusKm) ||
      body.travelRadiusKm < 1 ||
      body.travelRadiusKm > LIMITS.TRAVEL_RADIUS_MAX
    ) {
      return json({ error: 'Invalid travelRadiusKm' }, { status: 400 })
    }
  }

  // ═══════ Username ═══════
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

  // ═══════ Резолвимо skill slug → id ═══════
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

  // ═══════ Перевіряємо що категорія/підкатегорія існують ═══════
  if (body.categories !== undefined && body.categories.length > 0) {
    const found = await prisma.category.count({
      where: { slug: body.categories[0], status: 'ACTIVE' },
    })
    if (found === 0) {
      return json({ error: 'Category not found' }, { status: 400 })
    }
  }

  if (body.subcategory) {
    // Перевіряємо що підкатегорія належить обраній категорії
    const categorySlug = body.categories?.[0]
    if (!categorySlug) {
      return json(
        { error: 'Cannot set subcategory without category' },
        { status: 400 },
      )
    }
    const sub = await prisma.subcategory.findFirst({
      where: {
        slug: body.subcategory,
        status: 'ACTIVE',
        category: { slug: categorySlug },
      },
      select: { id: true },
    })
    if (!sub) {
      return json(
        { error: 'Subcategory not found in selected category' },
        { status: 400 },
      )
    }
  }

  // ═══════ User update ═══════
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

  // ═══════ FreelancerProfile ═══════
  const hasFreelancerData =
    body.categories !== undefined ||
    body.subcategory !== undefined ||
    body.skills !== undefined ||
    body.hourlyRate !== undefined ||
    body.experience !== undefined ||
    body.languages !== undefined ||
    body.portfolioUrl !== undefined ||
    body.worksOnline !== undefined ||
    body.worksOffline !== undefined ||
    body.worksOnSite !== undefined ||
    body.serviceCities !== undefined ||
    body.willTravel !== undefined ||
    body.travelRadiusKm !== undefined

  if (hasFreelancerData) {
    const scalarUpdate: Prisma.FreelancerProfileUpdateInput = {}

    if (body.categories !== undefined) scalarUpdate.categories = body.categories
    if (body.subcategory !== undefined)
      scalarUpdate.subcategory = body.subcategory ?? null
    if (body.hourlyRate !== undefined) scalarUpdate.hourlyRate = body.hourlyRate
    if (body.languages !== undefined) scalarUpdate.languages = body.languages
    if (body.portfolioUrl !== undefined)
      scalarUpdate.portfolioUrl = body.portfolioUrl
    if (body.experience !== undefined)
      scalarUpdate.experience = experienceMap[body.experience]

    // ─── НОВЕ: формат роботи ───
    if (body.worksOnline !== undefined)
      scalarUpdate.worksOnline = body.worksOnline
    if (body.worksOffline !== undefined)
      scalarUpdate.worksOffline = body.worksOffline
    if (body.worksOnSite !== undefined)
      scalarUpdate.worksOnSite = body.worksOnSite

    // ─── НОВЕ: географія ───
    if (body.serviceCities !== undefined)
      scalarUpdate.serviceCities = body.serviceCities
    if (body.willTravel !== undefined) scalarUpdate.willTravel = body.willTravel
    if (body.travelRadiusKm !== undefined)
      scalarUpdate.travelRadiusKm = body.travelRadiusKm

    // primaryCity = основне місто юзера (синхронізуємо з User.city)
    if (body.city) scalarUpdate.primaryCity = body.city

    const scalarCreate: Prisma.FreelancerProfileUncheckedCreateInput = {
      userId,
      ...(body.categories !== undefined && { categories: body.categories }),
      ...(body.subcategory !== undefined && {
        subcategory: body.subcategory ?? null,
      }),
      ...(body.hourlyRate !== undefined && { hourlyRate: body.hourlyRate }),
      ...(body.languages !== undefined && { languages: body.languages }),
      ...(body.portfolioUrl !== undefined && {
        portfolioUrl: body.portfolioUrl,
      }),
      ...(body.experience !== undefined && {
        experience: experienceMap[body.experience],
      }),
      ...(body.worksOnline !== undefined && { worksOnline: body.worksOnline }),
      ...(body.worksOffline !== undefined && {
        worksOffline: body.worksOffline,
      }),
      ...(body.worksOnSite !== undefined && { worksOnSite: body.worksOnSite }),
      ...(body.serviceCities !== undefined && {
        serviceCities: body.serviceCities,
      }),
      ...(body.willTravel !== undefined && { willTravel: body.willTravel }),
      ...(body.travelRadiusKm !== undefined && {
        travelRadiusKm: body.travelRadiusKm,
      }),
      ...(body.city && { primaryCity: body.city }),
    }

    await prisma.$transaction(async (tx) => {
      const profile = await tx.freelancerProfile.upsert({
        where: { userId },
        create: scalarCreate,
        update: scalarUpdate,
        select: { id: true },
      })

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
