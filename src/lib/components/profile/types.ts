// src/lib/components/profile/types.ts

export type VerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface ProfileSkill {
  slug: string
  name: string
}

export interface ProfileGig {
  id: string
  title: string
  price: number
  rating?: number
  orders?: number
}

export interface ProfileReview {
  id: string
  authorName: string
  authorInitials: string
  rating: number
  text: string
  createdAt: string | Date
}

export interface ProfilePortfolioItem {
  id: string
  title?: string
  imageUrl: string
  width?: number
  height?: number
}

export interface FreelancerProfileData {
  id: string
  name: string
  username?: string
  avatar?: string
  bio?: string
  city?: string
  hasPhone: boolean
  createdAt: string | Date

  verificationStatus: VerificationStatus
  verificationRejectReason?: string | null

  // ─── Категорія + підкатегорія ───
  // categories: масив slug-ів (зворотна сумісність, зазвичай 1 елемент)
  // categoryName / subcategoryName — людиночитані назви, резолвить бек із БД.
  // Якщо бек ще не резолвить — виводимо slug як fallback.
  categories: string[]
  categoryName?: string | null
  subcategory?: string | null
  subcategoryName?: string | null

  skills: ProfileSkill[]
  languages: string[]
  experience?: string | null
  hourlyRate?: number | null
  portfolioUrl?: string | null

  // ─── Формат роботи ───
  worksOnline?: boolean
  worksOffline?: boolean
  worksOnSite?: boolean

  // ─── Географія ───
  serviceCities?: string[]
  willTravel?: boolean
  travelRadiusKm?: number | null

  avgRating: number
  reviewsCount: number
  totalOrders: number
  completedOrders: number
  responseTimeHrs?: number | null
  repeatClientsPct: number
  followers: number
  successRate: number

  gigs: ProfileGig[]
  reviews: ProfileReview[]
  portfolio: ProfilePortfolioItem[]
}

// ─── Клієнт ────────────────────────────────────────────

export interface ClientReview {
  id: string
  masterName: string
  masterInitials: string
  gig: string
  rating: number
  text: string
  createdAt: string | Date
}

export interface ClientProfileData {
  id: string
  name: string
  username?: string
  avatar?: string
  bio?: string
  city?: string
  createdAt: string | Date
  verificationStatus: VerificationStatus
  totalOrders: number
  completedOrders: number
  reviews: ClientReview[]
}

export interface FollowingFreelancer {
  id: string
  username: string | null
  name: string
  avatar: string | null
  bio: string | null
  city: string | null
  categories: string[]
  hourlyRate: number | null
  avgRating: number
  reviewsCount: number
  isVerified: boolean
}
