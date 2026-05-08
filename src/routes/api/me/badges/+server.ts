import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import { auth } from '$lib/auth'
import { dev } from '$app/environment'
import type { RequestHandler } from './$types'

// ═══════════════════════════════════════════════════════════
// Константи
// ═══════════════════════════════════════════════════════════

const QUERY_TIMEOUT_MS = 3000 // 3 сек — badges не критичні, не чекаємо довго
const CACHE_MAX_AGE = 10 // секунди — короткий кеш для responsive UX

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

interface BadgesResponse {
  unreadMessages: number
  unreadNotifications: number
}

const EMPTY_RESPONSE: BadgesResponse = {
  unreadMessages: 0,
  unreadNotifications: 0,
}

/**
 * Запускає Promise з таймаутом.
 * Якщо БД зависне — повертаємо 0 замість блокування на пів секунди.
 *
 * Це badge-лічильник: краще показати 0, ніж тримати юзера у завантаженні.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ═══════════════════════════════════════════════════════════
// GET /api/me/badges
// ═══════════════════════════════════════════════════════════

export const GET: RequestHandler = async ({ request, setHeaders }) => {
  // ─── 1. Сесія ───
  let userId: string | undefined
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    userId = session?.user?.id
  } catch (err) {
    if (dev) console.error('[badges] session check failed:', err)
    // Для гостей повертаємо нулі — без помилки
    return json(EMPTY_RESPONSE, {
      headers: { 'cache-control': 'no-store' },
    })
  }

  // ─── 2. Гість → 0/0 ───
  if (!userId) {
    return json(EMPTY_RESPONSE, {
      headers: { 'cache-control': 'no-store' },
    })
  }

  // ─── 3. Паралельні COUNT-запити з таймаутом ───
  // Окремі try/catch для кожного — якщо messages впаде, notifications все одно покажемо.
  const messagesPromise = prisma.message
    .count({
      where: {
        chat: {
          members: {
            some: { userId },
          },
        },
        senderId: { not: userId },
        isRead: false,
      },
    })
    .catch((err) => {
      if (dev) console.error('[badges] messages count failed:', err)
      return 0
    })

  const notificationsPromise = prisma.notification
    .count({
      where: {
        userId,
        isRead: false,
      },
    })
    .catch((err) => {
      if (dev) console.error('[badges] notifications count failed:', err)
      return 0
    })

  // Загальний таймаут на обидва — щоб не блокувати юзера якщо БД повільна.
  const [unreadMessages, unreadNotifications] = await Promise.all([
    withTimeout(messagesPromise, QUERY_TIMEOUT_MS, 0),
    withTimeout(notificationsPromise, QUERY_TIMEOUT_MS, 0),
  ])

  // ─── 4. Cache headers ───
  // private  — кешуємо тільки в браузері юзера (не на CDN), бо user-specific
  // max-age  — браузер не запитує повторно протягом N секунд
  // must-revalidate — після max-age перевіряти на сервері (а не показувати stale)
  setHeaders({
    'cache-control': `private, max-age=${CACHE_MAX_AGE}, must-revalidate`,
    // Vary: Cookie — якщо юзер вийшов і зайшов з іншого акаунту, кеш не спрацює
    vary: 'Cookie',
  })

  return json({
    unreadMessages,
    unreadNotifications,
  } satisfies BadgesResponse)
}
