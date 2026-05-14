// src/lib/components/profile/freelancer/utils/json-ld.ts

/**
 * JSON.stringify не екранує небезпечні послідовності всередині інлайн <script>:
 *   - "</" + "script"  → закриває script-тег браузера
 *   - "<!" + "--"      → відкриває HTML-коментар і ламає парсинг
 * Це класична XSS у JSON-LD. Без екранування зловмисник може записати у bio
 * рядок "</" + "script><script>alert(1)<" + "/script>" і він виконається.
 *
 * Зверніть увагу: ми НЕ можемо мати у вихідному коді .svelte файлу літеральну
 * послідовність "<" + "/script" — Svelte-компілятор бачить її як кінець свого
 * <script> блоку. Тому регулярка будується через new RegExp.
 */
export function safeJsonForScript(obj: unknown): string {
  const closeTag = new RegExp('<' + '\\/script', 'gi')
  const commentOpen = /<!--/g
  return JSON.stringify(obj)
    .replace(closeTag, '<\\/script')
    .replace(commentOpen, '<\\!--')
}

interface PersonLdInput {
  name: string
  username?: string
  avatar?: string
  bio?: string
  city?: string
  profileUrl: string
  skills: Array<{ name: string }>
  avgRating: number
  reviewsCount: number
}

export function buildPersonJsonLd(u: PersonLdInput): string {
  return safeJsonForScript({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: u.name,
    ...(u.username && {
      alternateName: `@${u.username}`,
      url: u.profileUrl,
    }),
    ...(u.avatar && { image: u.avatar }),
    ...(u.bio && { description: u.bio }),
    ...(u.city && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: u.city,
        addressCountry: 'UA',
      },
    }),
    ...(u.skills.length > 0 && {
      knowsAbout: u.skills.map((s) => s.name),
    }),
    ...(u.reviewsCount > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: u.avgRating,
        reviewCount: u.reviewsCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  })
}
