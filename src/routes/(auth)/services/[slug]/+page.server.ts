// src/routes/services/[slug]/+page.server.ts
import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import type { ServicesPageResponse } from '$lib/types/services'

export const load: PageServerLoad = async ({ params, url, fetch }) => {
  // ─── Викликаємо API через event.fetch ───
  // Це НЕ робить реальний HTTP-запит — SvelteKit викликає handler endpoint'а
  // напряму у тій самій memory. Швидко, працює SSR, працює SEO.
  const qs = url.searchParams.toString()
  const apiUrl = `/api/services/${params.slug}${qs ? '?' + qs : ''}`

  const res = await fetch(apiUrl)

  if (res.status === 404) {
    throw error(404, 'Категорію не знайдено')
  }

  if (!res.ok) {
    throw error(res.status, 'Не вдалося завантажити категорію')
  }

  return (await res.json()) as ServicesPageResponse
}
