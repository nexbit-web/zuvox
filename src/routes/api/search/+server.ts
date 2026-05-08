// src/routes/api/search/+server.ts
import { json } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'

const QUERY_MIN = 2
const QUERY_MAX = 50
const RESULTS_LIMIT = 8

export interface SearchResult {
  type: 'category' | 'subcategory'
  slug: string
  name: string
  /** Slug батьківської категорії — для побудови URL підкатегорії */
  parentSlug?: string
  /** Назва батьківської категорії — для відображення контексту */
  parentName?: string
  icon?: string | null
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
}

/**
 * Sanitize query: тільки літери, цифри, пробіли, дефіс, апостроф.
 * Захист від XSS, SQL/RegExp injection (хоча Prisma і так параметризує).
 */
function sanitizeQuery(input: string): string {
  return input
    .replace(/[^\p{L}\p{N}\s'-]/gu, '')
    .trim()
    .slice(0, QUERY_MAX)
}

export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const rawQuery = url.searchParams.get('q') ?? ''
  const query = sanitizeQuery(rawQuery)

  // Замало символів — повертаємо пусто без запиту в БД
  if (query.length < QUERY_MIN) {
    return json({ results: [], query } satisfies SearchResponse)
  }

  // ─── Паралельний пошук в обох таблицях ───
  // case-insensitive contains через PostgreSQL ILIKE.
  const [categories, subcategories] = await Promise.all([
    prisma.category.findMany({
      where: {
        status: 'ACTIVE',
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { sortOrder: 'asc' },
      take: RESULTS_LIMIT,
      select: {
        slug: true,
        name: true,
        icon: true,
      },
    }),
    prisma.subcategory.findMany({
      where: {
        status: 'ACTIVE',
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { sortOrder: 'asc' },
      take: RESULTS_LIMIT,
      select: {
        slug: true,
        name: true,
        category: {
          select: { slug: true, name: true, icon: true },
        },
      },
    }),
  ])

  // ─── Маппимо у єдиний формат ───
  const categoryResults: SearchResult[] = categories.map((c) => ({
    type: 'category' as const,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
  }))

  const subcategoryResults: SearchResult[] = subcategories.map((s) => ({
    type: 'subcategory' as const,
    slug: s.slug,
    name: s.name,
    parentSlug: s.category.slug,
    parentName: s.category.name,
    icon: s.category.icon,
  }))

  // ─── Дедуплікація підкатегорій по slug ───
  // Якщо є кілька з однаковим slug — залишаємо першу (за sortOrder це найбільш релевантна).
  const seenSubSlugs = new Set<string>()
  const uniqueSubcategoryResults = subcategoryResults.filter((s) => {
    if (seenSubSlugs.has(s.slug)) return false
    seenSubSlugs.add(s.slug)
    return true
  })

  // Категорії спочатку, потім унікальні підкатегорії
  const results = [...categoryResults, ...uniqueSubcategoryResults].slice(
    0,
    RESULTS_LIMIT,
  )

  // Кеш в CDN: запити популярні, але результати рідко змінюються
  setHeaders({
    'cache-control':
      'public, max-age=30, s-maxage=60, stale-while-revalidate=300',
  })

  return json({ results, query } satisfies SearchResponse)
}
