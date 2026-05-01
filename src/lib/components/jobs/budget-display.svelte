<!-- src/lib/components/jobs/budget-display.svelte -->
<script lang="ts">
  interface Props {
    budgetType: string
    budgetMinCents: number | null
    budgetMaxCents: number | null
    currency?: string
    /** Размер: sm для карточек, md для деталей */
    size?: 'sm' | 'md'
  }

  let {
    budgetType,
    budgetMinCents,
    budgetMaxCents,
    currency = 'UAH',
    size = 'sm',
  }: Props = $props()

  function formatMoney(cents: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const display = $derived.by(() => {
    if (budgetType === 'NEGOTIABLE') return 'Договірна'
    if (budgetType === 'RANGE' && budgetMinCents && budgetMaxCents) {
      return `${formatMoney(budgetMinCents)} – ${formatMoney(budgetMaxCents)}`
    }
    if (budgetMaxCents) return formatMoney(budgetMaxCents)
    return '—'
  })
</script>

<span
  class="font-bold tabular-nums"
  class:text-base={size === 'sm'}
  class:text-2xl={size === 'md'}
  style="color: var(--foreground)"
>
  {display}
</span>
