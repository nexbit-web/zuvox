<!-- src/lib/components/gigs/gig-card.svelte -->
<script lang="ts">
  import { Star, ShoppingBag, Edit, Eye, EyeOff } from 'lucide-svelte'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'

  interface Pkg {
    tier: string
    priceCents: number
    deliveryDays: number
  }

  interface Seller {
    id: string
    name: string | null
    username: string | null
    avatar: string | null
    verificationStatus?: string
  }

  interface Props {
    gig: {
      id: string
      slug: string
      title: string
      shortDescription?: string | null
      images: string[]
      status: string
      avgRating: number
      reviewsCount: number
      ordersCount: number
      packages: Pkg[]
      seller?: Seller
    }
    /** Показувати інформацію про продавця (для каталога) або ні (для dashboard) */
    showSeller?: boolean
    /** Показувати статус (для dashboard свого) */
    showStatus?: boolean
  }

  let { gig, showSeller = true, showStatus = false }: Props = $props()

  function formatMoney(cents: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const minPrice = $derived(
    gig.packages.length > 0
      ? Math.min(...gig.packages.map((p) => p.priceCents))
      : 0,
  )

  const statusLabel = $derived(
    gig.status === 'ACTIVE'
      ? 'Опубліковано'
      : gig.status === 'DRAFT'
        ? 'Чернетка'
        : gig.status === 'PAUSED'
          ? 'Призупинено'
          : gig.status === 'ARCHIVED'
            ? 'Архів'
            : gig.status,
  )

  const statusColor = $derived(
    gig.status === 'ACTIVE'
      ? '#16a34a'
      : gig.status === 'DRAFT'
        ? '#f59e0b'
        : 'var(--muted-foreground)',
  )
</script>

<a
  href={`/gigs/${gig.slug}`}
  class="block rounded-xl overflow-hidden transition-all hover:opacity-95"
  style="background-color: var(--card); border: 1px solid var(--border)"
>
  <!-- Cover -->
  <div
    class="aspect-[4/3] overflow-hidden"
    style="background-color: var(--muted)"
  >
    {#if gig.images[0]}
      <img
        src={gig.images[0]}
        alt={gig.title}
        class="w-full h-full object-cover"
        loading="lazy"
      />
    {:else}
      <div
        class="w-full h-full flex items-center justify-center text-xs"
        style="color: var(--muted-foreground)"
      >
        Без фото
      </div>
    {/if}
  </div>

  <div class="p-3">
    {#if showSeller && gig.seller}
      <div class="flex items-center gap-2 mb-2">
        <Avatar class="size-6">
          <AvatarImage
            src={gig.seller.avatar ?? ''}
            alt={gig.seller.name ?? ''}
          />
          <AvatarFallback
            class="text-[10px] font-semibold"
            style="background-color: var(--muted); color: var(--foreground)"
          >
            {gig.seller.name?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <span
          class="text-xs font-medium truncate"
          style="color: var(--foreground)"
        >
          {gig.seller.name}
        </span>
      </div>
    {/if}

    <h3
      class="text-sm font-medium leading-snug line-clamp-2 mb-2 min-h-[2.5em]"
      style="color: var(--foreground)"
    >
      {gig.title}
    </h3>

    <div class="flex items-center justify-between gap-2 mb-2">
      {#if gig.avgRating > 0}
        <div class="flex items-center gap-1">
          <Star class="size-3.5" style="color: #f59e0b; fill: #f59e0b" />
          <span class="text-xs font-semibold" style="color: var(--foreground)">
            {gig.avgRating.toFixed(1)}
          </span>
          <span class="text-[10px]" style="color: var(--muted-foreground)">
            ({gig.reviewsCount})
          </span>
        </div>
      {:else}
        <span class="text-xs" style="color: var(--muted-foreground)">
          Новий гіг
        </span>
      {/if}
      {#if showStatus}
        <span
          class="text-[10px] font-semibold uppercase tracking-wide"
          style="color: {statusColor}"
        >
          {statusLabel}
        </span>
      {/if}
    </div>

    <div
      class="flex items-baseline justify-between gap-2 pt-2"
      style="border-top: 1px solid var(--border)"
    >
      <span class="text-[10px]" style="color: var(--muted-foreground)">
        ВІД
      </span>
      <span
        class="text-base font-bold tabular-nums"
        style="color: var(--foreground)"
      >
        {formatMoney(minPrice)}
      </span>
    </div>
  </div>
</a>
