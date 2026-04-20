// src/lib/data/category-banners.ts

/**
 * Мапа: назва категорії → шлях до банера в /static/banners/
 *
 * Покладіть картинки у папку static/banners/ з цими іменами.
 * Рекомендований розмір: 1200×400, формат .jpg або .webp.
 */
export const categoryBanners: Record<string, string> = {
  'Веб-розробка': '/banners/web-development.jpg',
  'UI/UX Дизайн': '/banners/ui-ux-design.jpg',
  'Мобільні застосунки': '/banners/mobile-apps.jpg',
  'SEO та маркетинг': '/banners/seo-marketing.jpg',
  Копірайтинг: '/banners/copywriting.jpg',
  'Відео та анімація': '/banners/video-animation.jpg',
  'Фото та графіка': '/banners/photo-graphics.jpg',
  'Бізнес-послуги': '/banners/business.jpg',
  'Освіта та навчання': '/banners/education.jpg',
  'Аудіо та музика': '/banners/audio-music.jpg',
}

/** Дефолтний банер якщо немає відповідності */
export const defaultBanner = '/banners/default.jpg'

/**
 * Повертає URL банера для заданого списку категорій.
 * Використовується перша категорія зі списку.
 * Якщо категорій немає або файл відсутній — повертає null.
 */
export function getBannerForCategories(
  categories: string[] | undefined,
): string | null {
  if (!categories?.length) return null
  const first = categories[0]
  return categoryBanners[first] ?? null
}
