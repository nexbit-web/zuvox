// src/lib/components/profile/types.ts

// ═══════════════════════════════════════════════════════
// Спільні типи для профільних компонентів і server loaders
// ═══════════════════════════════════════════════════════

export type VerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'

// ─── Фрілансер ─────────────────────────────────────────

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
  /** Реальні розміри фото для PhotoSwipe (якщо невідомі — 1600/1200) */
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
  phone?: string
  createdAt: string | Date

  verificationStatus: VerificationStatus
  verificationRejectReason?: string | null

  categories: string[]
  skills: string[]
  languages: string[]
  experience?: string | null
  hourlyRate?: number | null
  portfolioUrl?: string | null

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
