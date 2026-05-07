// src/lib/types/services.ts

/**
 * Типи для сторінки каталогу послуг (/services/[slug]) і відповідного API.
 *
 * Загальне місце для типів, які використовуються одночасно у:
 *  • src/routes/api/services/[slug]/+server.ts (генерує дані)
 *  • src/routes/services/[slug]/+page.server.ts (передає у UI)
 *  • src/routes/services/[slug]/+page.svelte (рендерить)
 *  • src/lib/components/services/* (компоненти каталогу)
 */

export type SortOption =
  | 'rating'
  | 'priceAsc'
  | 'priceDesc'
  | 'newest'
  | 'popular'

export type ServiceType = 'online' | 'offline' | 'visit'

export interface CategoryRef {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  subcategories: { slug: string; name: string }[]
}

export interface CityRef {
  slug: string
  name: string
}

export interface MasterCard {
  id: string
  name: string
  username: string | null
  avatar: string | null
  bio: string | null
  city: string | null
  categories: string[]
  rating: number
  reviewsCount: number
  ordersCount: number
  hourlyRate: number | null
  experience: string | null
  isVerified: boolean
}

export interface ServicesFilters {
  sub: string | null
  city: string | null
  type: ServiceType | null
  minRate: number | null
  maxRate: number | null
  minRating: number | null
  sort: SortOption
  verified?: string | boolean | null
}

export interface ServicesPageResponse {
  category: CategoryRef
  cities: CityRef[]
  items: MasterCard[]
  total: number
  page: number
  totalPages: number
  pageSize: number
  filters: ServicesFilters
}
