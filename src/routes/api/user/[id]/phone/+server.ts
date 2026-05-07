import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import { auth } from '$lib/auth'
import type { RequestHandler } from './$types'

const DAILY_LIMIT = 5

export const GET: RequestHandler = async ({
  params,
  request,
  getClientAddress,
}) => {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    return json(
      { error: 'UNAUTHORIZED', message: 'Будь ласка, увійдіть в систему' },
      { status: 401 },
    )
  }

  const targetId = params.id
  // Покращений regex для CUID (підтримує різні довжини)
  if (!/^[a-z0-9\-_]{15,40}$/i.test(targetId)) {
    return json(
      { error: 'INVALID_ID', message: 'Невірний формат ID користувача' },
      { status: 400 },
    )
  }

  if (targetId === session.user.id) {
    return json(
      {
        error: 'SELF_LOOKUP',
        message: 'Ви не можете переглядати власний номер через API',
      },
      { status: 400 },
    )
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      phone: true,
      role: true,
      verificationStatus: true,
    },
  })

  if (!target) {
    return json(
      { error: 'NOT_FOUND', message: 'Користувача не знайдено' },
      { status: 404 },
    )
  }

  // Перевірка Ролі
  if (target.role !== 'FREELANCER') {
    return json(
      {
        error: 'NOT_AVAILABLE',
        message: 'Цей користувач не є фрілансером',
      },
      { status: 403 },
    )
  }

  // Перевірка Верифікації
  if (target.verificationStatus !== 'VERIFIED') {
    return json(
      {
        error: 'NOT_VERIFIED',
        message: 'Фрілансер ще не пройшов модерацію (статус не VERIFIED)',
      },
      { status: 403 },
    )
  }

  if (!target.phone) {
    return json(
      { error: 'NO_PHONE', message: 'Фрілансер не вказав номер телефону' },
      { status: 404 },
    )
  }

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Перевірка, чи вже дивилися цей номер[cite: 1]
  const existing = await prisma.phoneReveal.findFirst({
    where: {
      viewerId: session.user.id,
      targetId,
      createdAt: { gte: dayAgo },
    },
  })

  if (existing) {
    return json({ phone: target.phone, fromCache: true })
  }

  // Ліміт унікальних переглядів[cite: 1]
  const uniqueTargets = await prisma.phoneReveal.groupBy({
    by: ['targetId'],
    where: {
      viewerId: session.user.id,
      createdAt: { gte: dayAgo },
    },
  })

  if (uniqueTargets.length >= DAILY_LIMIT) {
    return json(
      {
        error: 'DAILY_LIMIT',
        message: `Денний ліміт ${DAILY_LIMIT} номерів вичерпано. Спробуйте завтра.`,
      },
      { status: 429 },
    )
  }

  const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 500)
  let ipAddress: string | null = null
  try {
    ipAddress = getClientAddress()
  } catch {
    ipAddress = null
  }

  await prisma.phoneReveal.create({
    data: {
      viewerId: session.user.id,
      targetId,
      ipAddress,
      userAgent,
    },
  })

  return json({ phone: target.phone, fromCache: false })
}
