<!-- src/lib/components/wallet/wallet-balance-badge.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Wallet } from 'lucide-svelte'

  interface Props {
    /** Поточний баланс у копійках */
    balanceCents: number
    /** Валюта (за замовчуванням UAH) */
    currency?: string
    /** Розмір — компактний (для дропдауну) або повний (для широких місць) */
    size?: 'sm' | 'md'
    /** Показати лише іконку якщо балансу немає */
    hideIfEmpty?: boolean
  }

  let {
    balanceCents,
    currency = 'UAH',
    size = 'sm',
    hideIfEmpty = false,
  }: Props = $props()

  const balanceUah = $derived(balanceCents / 100)
  const isLow = $derived(balanceCents < 5000) // менше 50 грн

  function format(cents: number): string {
    const uah = cents / 100
    if (uah >= 1000) {
      return `${(uah / 1000).toFixed(uah % 1000 === 0 ? 0 : 1)}k ₴`
    }
    return `${uah.toFixed(0)} ₴`
  }

  const visible = $derived(!hideIfEmpty || balanceCents > 0)
</script>

{#if visible}
  <button
    type="button"
    onclick={() => goto('/dashboard/wallet')}
    class="inline-flex items-center gap-1.5 rounded-full transition-colors cursor-pointer"
    class:px-3={size === 'md'}
    class:py-1.5={size === 'md'}
    class:px-2.5={size === 'sm'}
    class:py-1={size === 'sm'}
    style="background-color: {isLow
      ? 'color-mix(in srgb, var(--destructive) 12%, transparent)'
      : 'var(--muted)'};
           color: {isLow ? 'var(--destructive)' : 'var(--foreground)'}"
    title="Перейти у гаманець"
  >
    <Wallet class={size === 'md' ? 'size-4' : 'size-3.5'} />
    <span
      class="font-semibold tabular-nums"
      class:text-sm={size === 'md'}
      class:text-xs={size === 'sm'}
    >
      {format(balanceCents)}
    </span>
  </button>
{/if}
