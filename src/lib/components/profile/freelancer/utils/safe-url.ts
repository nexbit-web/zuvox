// src/lib/components/profile/freelancer/utils/safe-url.ts

/**
 * Перевіряє що URL — це безпечний http(s) URL.
 * Захист від javascript:, data:, vbscript: URL.
 */
export function isSafeHttpUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Витягує hostname для відображення без протоколу.
 */
export function getDisplayHost(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
