// src/lib/server/slug.ts
import { prisma } from '$lib/prisma'

/**
 * Транслітерація кирилиці → латиниця (українська + російська).
 * Для seo-friendly URL гігів.
 */
const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ie',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'iu',
  я: 'ia',
  // Русские эквиваленты
  ы: 'y',
  э: 'e',
  ё: 'io',
  ъ: '',
}

/**
 * Перетворює рядок на slug.
 *   "Розробка лендінга на Tilda" → "rozrobka-lendinha-na-tilda"
 */
export function slugify(input: string): string {
  const lower = input.toLowerCase().trim()

  // Транслітерація
  let result = ''
  for (const ch of lower) {
    if (TRANSLIT[ch] !== undefined) result += TRANSLIT[ch]
    else if (/[a-z0-9]/.test(ch)) result += ch
    else if (/\s|[-_.,!?:;()]/.test(ch)) result += '-'
    // Інші символи — пропускаємо
  }

  // Прибираємо повторні дефіси і обрізаємо краї
  return result.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80) // обмежуємо довжину slug
}

/**
 * Генерує унікальний slug для гіга. Якщо такий уже є — додає -2, -3 і т.д.
 */
export async function generateUniqueSlug(
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title) || 'gig'
  let candidate = base
  let counter = 1

  while (true) {
    const existing = await prisma.gig.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })

    if (!existing || existing.id === excludeId) {
      return candidate
    }

    counter++
    candidate = `${base}-${counter}`

    // Захист від нескінченного циклу
    if (counter > 100) {
      return `${base}-${Date.now().toString(36)}`
    }
  }
}
