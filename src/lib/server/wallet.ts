// src/lib/server/wallet.ts
import { prisma } from '$lib/prisma'
import type { Prisma, TxType } from '../../generated/prisma/client'

/**
 * Wallet utility — створення гаманця, списання, поповнення.
 *
 * ВАЖЛИВО: всі операції з балансом ОБОВ'ЯЗКОВО атомарні (через
 * prisma.$transaction або всередині існуючої транзакції). Це
 * захищає від race conditions при паралельних запитах.
 *
 * Усі суми у копійках (cents): 1 грн = 100 cents. Це уникає
 * floating-point помилок (0.1 + 0.2 !== 0.3).
 */

export type PrismaTx = Omit<
  Prisma.TransactionClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/**
 * Гарантує наявність Wallet для юзера. Створює якщо немає.
 */
export async function ensureWallet(
  userId: string,
  tx: PrismaTx = prisma as unknown as PrismaTx,
) {
  const existing = await tx.wallet.findUnique({ where: { userId } })
  if (existing) return existing

  return tx.wallet.create({
    data: { userId, balanceCents: 0, heldCents: 0 },
  })
}

/**
 * Списати з балансу. Кидає Error якщо недостатньо коштів.
 *
 * Виконує атомарну операцію:
 *   1. Перевіряє наявність балансу
 *   2. Зменшує balanceCents
 *   3. Створює WalletTransaction
 *
 * @param amountCents позитивне число (буде записано як від'ємне)
 */
export async function debit(
  params: {
    userId: string
    amountCents: number
    type: TxType
    description?: string
    orderId?: string
    externalRef?: string
  },
  tx: PrismaTx = prisma as unknown as PrismaTx,
) {
  if (params.amountCents <= 0) {
    throw new Error('Amount must be positive')
  }

  const wallet = await ensureWallet(params.userId, tx)

  if (wallet.balanceCents < params.amountCents) {
    throw new Error('INSUFFICIENT_FUNDS')
  }

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balanceCents: { decrement: params.amountCents } },
  })

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amountCents: -params.amountCents, // мінус для списання
      type: params.type,
      description: params.description,
      orderId: params.orderId,
      externalRef: params.externalRef,
      status: 'SUCCESS',
    },
  })

  return updated
}

/**
 * Поповнити баланс.
 *
 * @param amountCents позитивне число
 */
export async function credit(
  params: {
    userId: string
    amountCents: number
    type: TxType
    description?: string
    orderId?: string
    externalRef?: string
  },
  tx: PrismaTx = prisma as unknown as PrismaTx,
) {
  if (params.amountCents <= 0) {
    throw new Error('Amount must be positive')
  }

  const wallet = await ensureWallet(params.userId, tx)

  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: { balanceCents: { increment: params.amountCents } },
  })

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      amountCents: params.amountCents,
      type: params.type,
      description: params.description,
      orderId: params.orderId,
      externalRef: params.externalRef,
      status: 'SUCCESS',
    },
  })

  return updated
}

/**
 * Чи має юзер достатньо коштів. Не блокуючий read.
 */
export async function hasBalance(
  userId: string,
  amountCents: number,
): Promise<boolean> {
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { balanceCents: true },
  })
  return (wallet?.balanceCents ?? 0) >= amountCents
}

/**
 * Helper для конвертації грн ↔ копійки.
 */
export const Money = {
  toCents: (uah: number): number => Math.round(uah * 100),
  toUah: (cents: number): number => cents / 100,
  format: (cents: number, currency = 'UAH'): string => {
    const uah = cents / 100
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(uah)
  },
}
