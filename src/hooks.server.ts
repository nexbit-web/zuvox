// src/hooks.server.ts
import { auth } from '$lib/auth'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { building } from '$app/environment'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

/**
 * Better-auth handler
 */
const authHandle: Handle = async ({ event, resolve }) => {
  return svelteKitHandler({ event, resolve, auth, building })
}

/**
 * Security headers — захист від XSS, clickjacking, MIME-sniffing.
 * Для production додайте HSTS на рівні Nginx/Cloudflare.
 */
const securityHeaders: Handle = async ({ event, resolve }) => {
  const response = await resolve(event)

  // Clickjacking protection
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')

  // MIME-type sniffing protection
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer — не віддаємо повний URL у зовнішні сервіси
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions-Policy — забороняємо доступ до камери/мікрофона/геолокації
  // за замовчуванням (включайте точково коли треба).
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  )

  // Cross-Origin Resource Policy — наші ресурси тільки для нашого origin
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // Content Security Policy
  // ⚠️ Налаштуйте під свій продакшн-домен, зараз ліберальна для dev.
  // 'unsafe-inline' для стилів — Tailwind inline-styles + Svelte scoped.
  // 'unsafe-eval' НЕ додаємо — це розвʼязує руки XSS-атакам.
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`,
    `style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net`,
    `img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.cloudinary.com`,
    `frame-ancestors 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const handle = sequence(authHandle, securityHeaders)