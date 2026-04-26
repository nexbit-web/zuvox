// src/lib/data/category-banners.ts

/**
 * Мапа: назва категорії → шлях до банера в /static/banners/
 *
 * Покладіть картинки у папку static/banners/ з цими іменами.
 * Рекомендований розмір: 1600×400 (4:1), формат .webp або .jpg, до 200 КБ.
 */
export const categoryBanners: Record<string, string> = {
  'Веб-розробка': '/banners/web-development.gif',
  'UI/UX Дизайн': '/banners/ui-ux-design.jpg',
  'Мобільні застосунки': '/banners/mobile-apps.jpg',
  'SEO та маркетинг': '/banners/seo-marketing.jpg',
  Копірайтинг: '/banners/copywriting.jpg',
  'Відео та анімація': '/banners/video-animation.jpg',
  'Фото та графіка': '/banners/photo-graphics.jpg',
  'Бізнес-послуги': '/banners/business.jpg',
  'Освіта та навчання': '/banners/education.jpg',
  'Аудіо та музика': '/banners/audio-music.gif',
}

export const defaultBanner = '/banners/default.jpg'

export function getBannerForCategories(
  categories: string[] | undefined | null,
): string {
  if (!categories?.length) return defaultBanner
  return categoryBanners[categories[0]] ?? defaultBanner
}
