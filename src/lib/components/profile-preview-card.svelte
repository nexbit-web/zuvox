<!-- src/lib/components/profile-preview-card.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import {
    BadgeCheck,
    Star,
    ArrowUpRight,
    User,
    MapPin,
    Briefcase,
    Clock,
    ShieldAlert,
  } from 'lucide-svelte'
  import type { Snippet } from 'svelte'

  export type VerificationStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'

  interface Props {
    name: string
    bio?: string
    photoUrl?: string
    verificationStatus?: VerificationStatus
    categories?: string[]
    category?: string
    city?: string
    experience?: string
    rating?: number | null
    ordersCount?: number
    hourlyRate?: number | null
    onAction?: () => void
    actionLabel?: string
    action?: Snippet
    topAction?: Snippet
    preview?: boolean
  }

  let {
    name,
    bio,
    photoUrl,
    verificationStatus = 'NONE',
    categories,
    category,
    city,
    experience,
    rating = null,
    ordersCount = 0,
    hourlyRate = null,
    onAction,
    actionLabel = 'Профіль',
    action,
    topAction,
    preview = false,
  }: Props = $props()

  const initial = $derived(name?.charAt(0).toUpperCase() ?? '?')

  const categoryList = $derived(
    categories?.length ? categories : category ? [category] : [],
  )

  function formatOrders(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
  }
</script>

<article
  class="group relative rounded-2xl border transition-all hover:shadow-md"
  style="background-color: var(--card);
         border-color: color-mix(in oklch, var(--foreground) 8%, transparent);"
>
  <div class="flex flex-col">
    <!-- ───── PHOTO SECTION ───── -->
    <div
      class="relative h-32 w-full overflow-hidden rounded-t-[15px] bg-muted/30"
    >
      {#if photoUrl}
        <img
          src={photoUrl}
          alt={name}
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      {:else}
        <div class="flex h-full items-center justify-center bg-muted/20">
          <span class="text-2xl font-bold opacity-20">{initial}</span>
        </div>
      {/if}

      <!-- Status Labels -->
      <div class="absolute top-2 left-2">
        {#if verificationStatus === 'VERIFIED'}
          <div
            class="flex size-6 items-center justify-center rounded-full bg-primary shadow-sm"
          >
            <BadgeCheck class="size-4 text-primary-foreground" />
          </div>
        {/if}
      </div>

      {#if topAction}
        <div class="absolute top-2 right-2">{@render topAction()}</div>
      {/if}

      <!-- Категорії (звичайний регістр, як і було) -->
      <div class="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
        {#each categoryList as cat}
          <span
            class="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-md"
          >
            {cat}
          </span>
        {/each}
      </div>
    </div>

    <!-- ───── CONTENT SECTION ───── -->
    <div class="p-3">
      <div class="flex items-center justify-between gap-1">
        <h2
          class="truncate text-[14px] font-bold tracking-tight text-foreground"
        >
          {name || (preview ? 'Ваше ім’я' : 'Анонім')}
        </h2>

        {#if verificationStatus === 'PENDING'}
          <Clock class="size-3 text-amber-500" />
        {:else if verificationStatus === 'REJECTED'}
          <ShieldAlert class="size-3 text-destructive" />
        {/if}
      </div>

      <div
        class="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground"
      >
        {#if city}
          <span class="flex items-center gap-0.5"
            ><MapPin class="size-2.5" />{city}</span
          >
        {/if}
        {#if experience}
          <span class="flex items-center gap-0.5"
            ><Briefcase class="size-2.5" />{experience}</span
          >
        {/if}
      </div>

      <p
        class="mt-2 h-4 truncate text-[11px] leading-none text-muted-foreground/80"
      >
        {bio || (preview ? 'Ваш короткий опис...' : '')}
      </p>

      <!-- Статистика (з нулями замість прочерків) -->
      <div
        class="mt-3 flex items-center justify-between border-t border-border/50 pt-3"
      >
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <Star class="size-3 fill-amber-400 text-amber-400" />
            <span class="text-[12px] font-bold">
              {rating && rating > 0 ? rating.toFixed(1) : '0'}
            </span>
          </div>
          <div class="text-[11px] text-muted-foreground">
            <span class="font-semibold text-foreground"
              >{ordersCount > 0 ? formatOrders(ordersCount) : '0'}</span
            > робіт
          </div>
        </div>

        <div class="text-right">
          <div class="text-[13px] font-bold text-primary">
            {hourlyRate && hourlyRate > 0 ? `${hourlyRate}₴` : '0₴'}
          </div>
        </div>
      </div>

      <div class="mt-3">
        {#if action}
          {@render action()}
        {:else}
          <Button
            onclick={onAction}
            disabled={preview}
            variant="secondary"
            class="h-8 w-full rounded-xl gap-1 text-[11px] font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {actionLabel}
            <ArrowUpRight class="size-3" />
          </Button>
        {/if}
      </div>
    </div>
  </div>
</article>
