// src/lib/server/pricing.ts
import { Money } from './wallet'

/**
 * Тарифи Zunor.
 *
 * MVP: фіксовані числа. У майбутньому — таблиця у БД щоб адмін
 * міг змінювати без deploy.
 */

/**
 * Комісія платформи з покупки гіга (% від ціни).
 * Списується з балансу фрілансера у момент створення замовлення.
 */
export const GIG_COMMISSION_PERCENT = 10

/**
 * Lead fee — фіксована плата фрілансера за відгук на заявку клієнта.
 * Залежить від категорії (на майбутнє). Зараз — fallback default.
 */
export const DEFAULT_LEAD_FEE_CENTS = Money.toCents(50) // 50 грн

/**
 * Мінімальна сума замовлення (захист від спаму "замовлень на 1 грн").
 */
export const MIN_ORDER_AMOUNT_CENTS = Money.toCents(100) // 100 грн

/**
 * Максимальна сума замовлення для MVP (без юр. оформлень).
 * Коли підключимо платежі — підвищимо.
 */
export const MAX_ORDER_AMOUNT_CENTS = Money.toCents(50_000) // 50k грн

/**
 * Скільки днів від DELIVERED до автоматичного COMPLETED якщо клієнт
 * не реагує. Запобігає вічному висінню.
 */
export const AUTO_COMPLETE_DAYS = 7

/**
 * Розраховує комісію з покупки гіга.
 */
export function calcGigCommission(orderPriceCents: number): number {
  return Math.round((orderPriceCents * GIG_COMMISSION_PERCENT) / 100)
}

/**
 * Lead fee для категорії. У MVP — фіксована.
 */
export function getLeadFee(_categoryName?: string): number {
  return DEFAULT_LEAD_FEE_CENTS
}

/**
 * Валідація суми замовлення.
 * @returns null якщо ок, або текст помилки
 */
export function validateOrderAmount(cents: number): string | null {
  if (!Number.isInteger(cents)) return 'Сума має бути цілим числом'
  if (cents < MIN_ORDER_AMOUNT_CENTS) {
    return `Мінімальна сума: ${Money.format(MIN_ORDER_AMOUNT_CENTS)}`
  }
  if (cents > MAX_ORDER_AMOUNT_CENTS) {
    return `Максимальна сума: ${Money.format(MAX_ORDER_AMOUNT_CENTS)}`
  }
  return null
}
