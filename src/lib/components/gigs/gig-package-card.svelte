<!-- src/lib/components/gigs/gig-package-card.svelte -->
<script lang="ts">
  import { Clock, RefreshCw, Check, Loader2 } from 'lucide-svelte'

  interface Pkg {
    tier: string
    name: string
    description: string | null
    priceCents: number
    deliveryDays: number
    revisions: number
    features: string[]
  }

  interface Props {
    pkg: Pkg
    loading?: boolean
    disabled?: boolean
    onOrder?: () => void
  }

  let { pkg, loading = false, disabled = false, onOrder }: Props = $props()

  function formatMoney(cents: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  function tierLabel(tier: string): string {
    return tier === 'BASIC'
      ? 'Базовий'
      : tier === 'STANDARD'
        ? 'Стандартний'
        : 'Преміум'
  }

  const revisionsLabel = $derived(
    pkg.revisions === -1
      ? 'Необмежено'
      : pkg.revisions === 0
        ? 'Без правок'
        : `${pkg.revisions} ${pkg.revisions === 1 ? 'правка' : 'правки'}`,
  )
</script>

<div>
  <!-- Назва + ціна -->
  <div class="flex items-baseline justify-between gap-3 mb-2">
    <h3 class="text-base font-semibold" style="color: var(--foreground)">
      {pkg.name || tierLabel(pkg.tier)}
    </h3>
    <p class="text-2xl font-bold tabular-nums" style="color: var(--foreground)">
      {formatMoney(pkg.priceCents)}
    </p>
  </div>

  {#if pkg.description}
    <p class="text-sm mb-4 leading-snug" style="color: var(--muted-foreground)">
      {pkg.description}
    </p>
  {/if}

  <!-- Delivery + revisions -->
  <div class="flex items-center gap-4 mb-4">
    <div class="flex items-center gap-1.5">
      <Clock class="size-3.5" style="color: var(--muted-foreground)" />
      <span class="text-xs" style="color: var(--foreground)">
        {pkg.deliveryDays}
        {pkg.deliveryDays === 1 ? 'день' : 'днів'}
      </span>
    </div>
    <div class="flex items-center gap-1.5">
      <RefreshCw class="size-3.5" style="color: var(--muted-foreground)" />
      <span class="text-xs" style="color: var(--foreground)">
        {revisionsLabel}
      </span>
    </div>
  </div>

  <!-- Features -->
  {#if pkg.features.length > 0}
    <ul class="space-y-2 mb-5">
      {#each pkg.features as feature}
        <li class="flex items-start gap-2">
          <Check
            class="size-4 shrink-0 mt-0.5"
            style="color: var(--foreground)"
          />
          <span class="text-sm leading-snug" style="color: var(--foreground)">
            {feature}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Action -->
  {#if onOrder}
    <button
      type="button"
      onclick={onOrder}
      {disabled}
      class="w-full h-11 rounded-full text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2"
      style="background-color: {disabled ? 'var(--muted)' : 'var(--primary)'};
             color: {disabled
        ? 'var(--muted-foreground)'
        : 'var(--primary-foreground)'};
             cursor: {disabled ? 'not-allowed' : 'pointer'};
             opacity: {disabled && !loading ? 0.6 : 1}"
    >
      {#if loading}
        <Loader2 class="size-4 animate-spin" />
        Оформлення…
      {:else}
        Замовити за {formatMoney(pkg.priceCents)}
      {/if}
    </button>
  {/if}
</div>
