// src/routes/api/cities/+server.ts
import { json, error } from '@sveltejs/kit'
import { prisma } from '$lib/prisma'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ setHeaders }) => {
  try {
    const cities = await prisma.city.findMany({
      where: { status: 'ACTIVE' }, // якщо немає Status — приберіть рядок
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        slug: true,
        name: true,
        region: true,
        isCapital: true,
      },
    })

    // Кеш на 1 годину — список міст змінюється рідко
    setHeaders({
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    })

    return json({ cities })
  } catch (err) {
    console.error('GET /api/cities failed:', err)
    throw error(500, 'Не вдалося завантажити міста')
  }
}
