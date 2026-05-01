// src/lib/orders/labels.ts

/**
 * Лейбли і кольори для статусів замовлення.
 * Використовуються у UI компонентах.
 */

export interface StatusInfo {
  label: string
  short: string
  color: string
  bg: string
  description: string
}

export const ORDER_STATUS: Record<string, StatusInfo> = {
  NEGOTIATING: {
    label: 'Узгодження',
    short: 'Узгодження',
    color: '#f59e0b',
    bg: 'color-mix(in srgb, #f59e0b 12%, transparent)',
    description: 'Очікує підтвердження майстра',
  },
  ACCEPTED: {
    label: 'У роботі',
    short: 'В роботі',
    color: '#2563eb',
    bg: 'color-mix(in srgb, #2563eb 12%, transparent)',
    description: 'Майстер працює над замовленням',
  },
  DELIVERED: {
    label: 'Здано на перевірку',
    short: 'На перевірці',
    color: '#9333ea',
    bg: 'color-mix(in srgb, #9333ea 12%, transparent)',
    description: 'Робота здана. Очікує підтвердження клієнта.',
  },
  COMPLETED: {
    label: 'Завершено',
    short: 'Завершено',
    color: '#16a34a',
    bg: 'color-mix(in srgb, #16a34a 12%, transparent)',
    description: 'Замовлення успішно закрито',
  },
  CANCELLED: {
    label: 'Скасовано',
    short: 'Скасовано',
    color: 'var(--muted-foreground)',
    bg: 'var(--muted)',
    description: 'Замовлення скасовано',
  },
  DISPUTED: {
    label: 'Спір',
    short: 'Спір',
    color: '#dc2626',
    bg: 'color-mix(in srgb, #dc2626 12%, transparent)',
    description: 'Розгляд спірної ситуації',
  },
}

export const ORDER_SOURCE: Record<string, string> = {
  DIRECT: 'З чату',
  GIG_PURCHASE: 'З гіга',
  JOB_PROPOSAL: 'З заявки',
}

export const EVENT_LABELS: Record<string, { icon: string; text: string }> = {
  CREATED: { icon: '📝', text: 'Замовлення створено' },
  ACCEPTED: { icon: '✅', text: 'Майстер прийняв замовлення' },
  DELIVERED: { icon: '📤', text: 'Майстер здав роботу' },
  REVISION_REQUESTED: { icon: '↩️', text: 'Клієнт запросив правки' },
  COMPLETED: { icon: '🎉', text: 'Замовлення завершено' },
  CANCELLED: { icon: '❌', text: 'Замовлення скасовано' },
  AUTO_COMPLETED: { icon: '⏱️', text: 'Авто-завершення (минуло 7 днів)' },
  DISPUTED: { icon: '⚠️', text: 'Відкрито спір' },
}

export function formatMoney(cents: number, currency = 'UAH'): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelative(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)
  if (diffMin < 1) return 'щойно'
  if (diffMin < 60) return `${diffMin} хв тому`
  if (diffHr < 24) return `${diffHr} год тому`
  if (diffDays < 7)
    return `${diffDays} ${diffDays === 1 ? 'день' : 'днів'} тому`
  return date.toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'short',
  })
}
