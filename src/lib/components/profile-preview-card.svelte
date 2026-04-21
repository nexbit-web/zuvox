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
    /** Категорії — показуються бейджами внизу фото (до 3 шт) */
    categories?: string[]
    /** @deprecated використовуй categories */
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
    actionLabel = 'Перейти до профілю',
    action,
    topAction,
    preview = false,
  }: Props = $props()

  const initial = $derived(name?.charAt(0).toUpperCase() ?? '?')

  // Підтримка і старого category, і нового categories
  const categoryList = $derived(
    categories?.length
      ? categories.slice(0, 3)
      : category
        ? [category]
        : [],
  )

  function formatOrders(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
    return String(n)
  }
</script>

<article
  class="relative rounded-3xl border overflow-hidden"
  style="background-color: var(--card);
         border-color: color-mix(in oklch, var(--foreground) 6%, transparent);
         box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04);"
>
  <!-- ───── PHOTO ───── -->
  <div class="p-2.5 pb-0">
    <div
      class="relative aspect-square rounded-2xl overflow-hidden"
      style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent)"
    >
      {#if photoUrl}
        <img
          src={photoUrl}
          alt={name}
          class="w-full h-full object-cover"
        />
      {:else}
        <div class="absolute inset-0 flex items-center justify-center">
          {#if preview}
            <div class="flex flex-col items-center gap-1.5">
              <div
                class="size-10 rounded-full flex items-center justify-center"
                style="background-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
              >
                <User
                  class="size-4"
                  style="color: var(--muted-foreground); opacity: 0.5"
                />
              </div>
              <span
                class="text-[11px]"
                style="color: var(--muted-foreground); opacity: 0.6"
              >
                Фото профілю
              </span>
            </div>
          {:else}
            <span
              class="text-4xl font-bold"
              style="color: color-mix(in oklch, var(--primary) 40%, var(--card))"
            >
              {initial}
            </span>
          {/if}
        </div>
      {/if}

      <!-- Категорії як бейджі внизу фото -->
      {#if categoryList.length > 0}
        <!-- градієнт для читабельності бейджів -->
        <div
          class="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style="background: linear-gradient(180deg, transparent, rgba(0,0,0,0.55))"
        ></div>

        <div class="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap gap-1.5">
          {#each categoryList as cat}
            <Badge
              class="rounded-full border-0 px-2.5 py-1 text-[11px] font-medium backdrop-blur-md"
              style="background-color: rgba(255,255,255,0.2); color: white"
            >
              {cat}
            </Badge>
          {/each}
        </div>
      {/if}

      {#if topAction}
        <div class="absolute top-2.5 right-2.5">
          {@render topAction()}
        </div>
      {/if}
    </div>
  </div>

  <!-- ───── INFO ───── -->
  <div class="px-3.5 pt-3 pb-3.5">
    <!-- Name + status -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-1 min-w-0">
        <h2
          class="text-[15px] font-semibold tracking-tight truncate"
          style="color: var(--foreground)"
        >
          {name || (preview ? 'Ваше ім’я' : '')}
        </h2>

        {#if verificationStatus === 'VERIFIED'}
          <BadgeCheck
            class="size-4 shrink-0"
            style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
          />
        {/if}
      </div>

      {#if verificationStatus === 'PENDING'}
        <span
          class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium shrink-0"
          style="background-color: color-mix(in oklch, #f59e0b 15%, transparent);
                 color: #b45309;
                 border: 1px solid color-mix(in oklch, #f59e0b 30%, transparent)"
        >
          <Clock class="size-2.5" />
          На модерації
        </span>
      {:else if verificationStatus === 'REJECTED'}
        <span
          class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium shrink-0"
          style="background-color: color-mix(in oklch, var(--destructive) 12%, transparent);
                 color: var(--destructive);
                 border: 1px solid color-mix(in oklch, var(--destructive) 25%, transparent)"
        >
          <ShieldAlert class="size-2.5" />
          Відхилено
        </span>
      {/if}
    </div>

    <!-- Meta: місто · досвід -->
    {#if city || experience}
      <div
        class="flex items-center gap-x-2.5 gap-y-0.5 flex-wrap mt-1 text-[10.5px]"
        style="color: var(--muted-foreground)"
      >
        {#if city}
          <span class="inline-flex items-center gap-0.5">
            <MapPin class="size-2.5" />
            {city}
          </span>
        {/if}
        {#if experience}
          <span class="inline-flex items-center gap-0.5">
            <Briefcase class="size-2.5" />
            {experience}
          </span>
        {/if}
      </div>
    {/if}

    <!-- Bio -->
    <p
      class="text-[12px] leading-snug mt-2 bio-clamp"
      style="color: var(--muted-foreground)"
    >
      {#if bio}
        {bio}
      {:else if preview}
        <span style="opacity: 0.5">Ваш опис з’явиться тут…</span>
      {/if}
    </p>

    <!-- Stats -->
    <div
      class="grid grid-cols-3 mt-2.5 rounded-lg"
      style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent)"
    >
      <div class="px-1.5 py-2 text-center">
        <div class="flex items-center justify-center gap-0.5">
          <Star
            class="size-2.5"
            style="color: {rating ? '#f5a623' : 'var(--muted-foreground)'};
                   fill: {rating ? '#f5a623' : 'none'};
                   opacity: {rating ? 1 : 0.4}"
          />
          <span
            class="text-[12px] font-semibold tabular-nums"
            style="color: var(--foreground)"
          >
            {rating !== null && rating > 0 ? rating.toFixed(1) : '—'}
          </span>
        </div>
        <div
          class="text-[9px] mt-0.5"
          style="color: var(--muted-foreground)"
        >
          Rating
        </div>
      </div>

      <div
        class="px-1.5 py-2 text-center border-x"
        style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      >
        <div
          class="text-[12px] font-semibold tabular-nums"
          style="color: var(--foreground)"
        >
          {ordersCount > 0 ? formatOrders(ordersCount) : '—'}
        </div>
        <div
          class="text-[9px] mt-0.5"
          style="color: var(--muted-foreground)"
        >
          Замовлень
        </div>
      </div>

      <div class="px-1.5 py-2 text-center">
        <div
          class="text-[12px] font-semibold tabular-nums"
          style="color: var(--foreground)"
        >
          {#if hourlyRate !== null && hourlyRate > 0}
            {hourlyRate}₴
          {:else}
            —
          {/if}
        </div>
        <div
          class="text-[9px] mt-0.5"
          style="color: var(--muted-foreground)"
        >
          Ставка/год
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="mt-2.5">
      {#if action}
        {@render action()}
      {:else}
        <Button
          onclick={onAction}
          disabled={preview}
          class="w-full h-9 rounded-full gap-1.5 font-medium text-[13px]"
        >
          {actionLabel}
          <ArrowUpRight class="size-3.5" />
        </Button>
      {/if}
    </div>
  </div>
</article>

<style>
  .bio-clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    overflow-wrap: anywhere;
    word-break: break-word;
    min-height: 2.5em;
  }
</style>