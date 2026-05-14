// src/lib/components/profile/setup/types.ts

export type CategoryDomain = 'ONLINE_ONLY' | 'OFFLINE_ONLY' | 'BOTH'
export type WorkFormat = 'ONLINE' | 'OFFLINE' | 'VISIT'
export type GeographyMode = 'ONE_CITY' | 'MULTI_CITY' | 'ALL_UKRAINE'

export interface PortfolioItem {
  url: string
  publicId: string
}

export interface ServiceFromApi {
  slug: string
  name: string
  avgPriceCents: number | null
}

export interface SubcategoryFromApi {
  slug: string
  name: string
  items: ServiceFromApi[]
}

export interface SkillFromApi {
  slug: string
  name: string
}

export interface CategoryFromApi {
  slug: string
  name: string
  icon?: string | null
  description?: string | null
  domain?: CategoryDomain
  subs: SubcategoryFromApi[]
  skills: SkillFromApi[]
}

export interface CityFromApi {
  slug: string
  name: string
  region: string | null
  isCapital: boolean
}

export const experienceOptions = [
  { value: 'LT_1', label: 'Початківець', hint: 'менше 1 року' },
  { value: '1_2', label: 'Середній', hint: '1–2 роки' },
  { value: '3_5', label: 'Досвідчений', hint: '3–5 років' },
  { value: '5_10', label: 'Експерт', hint: '5–10 років' },
  { value: '10_PLUS', label: 'Майстер', hint: '10+ років' },
] as const

export const languageOptions = [
  'Українська',
  'English',
  'Polski',
  'Русский',
  'Deutsch',
  'Français',
  'Español',
] as const

// ─── Ліміти (синхронізовані з бекендом) ───
export const LIMITS = {
  BIO_MIN: 40,
  BIO_MAX: 922,
  SKILLS_MAX: 20,
  SERVICE_CITIES_MAX: 20,
} as const
