<script lang="ts">
  import * as Avatar from '$lib/components/ui/avatar'
  import { Badge } from '$lib/components/ui/badge'
  import { Button } from '$lib/components/ui/button'
  import { BadgeCheck, MapPin, Briefcase, Star } from 'lucide-svelte'
  import type { Snippet } from 'svelte'

  interface Category {
    name: string
  }

  interface Props {
    name: string
    username?: string
    bio?: string
    avatarUrl?: string
    avatarFallback?: string
    bannerUrl?: string
    verified?: boolean
    city?: string
    experience?: string
    rating?: number | null
    reviewsCount?: number
    hourlyRate?: number | null
    categories?: Category[]
    /** кнопка справа в світлій зоні (напр. Follow / Замовити) */
    action?: Snippet
    /** контент у правому верхньому куті банера (напр. соц-іконки) */
    bannerExtra?: Snippet
    /** режим прев’ю — показує плейсхолдери замість порожнечі */
    preview?: boolean
  }

  let {
    name,
    username,
    bio,
    avatarUrl,
    avatarFallback,
    bannerUrl,
    verified = false,
    city,
    experience,
    rating = null,
    reviewsCount = 0,
    hourlyRate = null,
    categories = [],
    action,
    bannerExtra,
    preview = false,
  }: Props = $props()

  const initial = $derived(
    avatarFallback ?? name?.charAt(0).toUpperCase() ?? '?',
  )
</script>

<article
  class="relative overflow-hidden rounded-[28px] border shadow-sm"
  style="background-color: var(--card); border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
>
  <!-- ───── BANNER ───── -->
  <div
    class="relative h-40 md:h-44 w-full"
    style="background-color: #0a0a0a;
           {bannerUrl
      ? `background-image: url(${bannerUrl}); background-size: cover; background-position: center;`
      : ''}"
  >
    {#if !bannerUrl}
      <!-- тихий градієнтний декор замість плоского чорного -->
      <div
        class="absolute inset-0"
        style="background: radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.06), transparent 60%),
                           radial-gradient(80% 60% at 100% 100%, rgba(255,255,255,0.03), transparent 50%)"
      ></div>
    {/if}

    {#if bannerExtra}
      <div class="absolute top-5 right-5">
        {@render bannerExtra()}
      </div>
    {/if}
  </div>

  <!-- ───── BODY ───── -->
  <div class="relative px-6 pb-6">
    <!-- Avatar (перекриває банер) -->
    <div class="flex items-start justify-between -mt-12 mb-4">
      <Avatar.Root
        class="size-24 ring-4 shadow-md"
        style="--tw-ring-color: var(--card)"
      >
        {#if avatarUrl}
          <Avatar.Image src={avatarUrl} alt={name} />
        {/if}
        <Avatar.Fallback
          class="text-2xl font-semibold"
          style="background-color: color-mix(in oklch, var(--primary) 12%, var(--card)); color: var(--primary)"
        >
          {initial}
        </Avatar.Fallback>
      </Avatar.Root>

      {#if action}
        <div class="mt-14">
          {@render action()}
        </div>
      {/if}
    </div>

    <!-- Name + verified -->
    <div class="flex items-center gap-1.5">
      <h2
        class="text-xl font-semibold tracking-tight truncate"
        style="color: var(--foreground)"
      >
        {name || (preview ? 'Ваше ім’я' : '')}
      </h2>
      {#if verified}
        <BadgeCheck
          class="size-5 shrink-0"
          style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
        />
      {/if}
    </div>

    {#if username}
      <p class="text-sm mt-0.5" style="color: var(--muted-foreground)">
        @{username}
      </p>
    {/if}

    <!-- Meta row -->
    {#if city || experience || rating !== null}
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs"
        style="color: var(--muted-foreground)"
      >
        {#if city}
          <span class="inline-flex items-center gap-1.5">
            <MapPin class="size-3.5" />
            {city}
          </span>
        {/if}
        {#if experience}
          <span class="inline-flex items-center gap-1.5">
            <Briefcase class="size-3.5" />
            {experience}
          </span>
        {/if}
        {#if rating !== null && rating > 0}
          <span class="inline-flex items-center gap-1.5">
            <Star class="size-3.5" style="color: #f5a623; fill: #f5a623" />
            <span class="font-semibold" style="color: var(--foreground)">
              {rating.toFixed(1)}
            </span>
            {#if reviewsCount}
              <span>({reviewsCount})</span>
            {/if}
          </span>
        {/if}
      </div>
    {/if}

    <!-- Bio -->
    {#if bio}
      <p
        class="text-sm leading-relaxed mt-4 line-clamp-3"
        style="color: var(--muted-foreground)"
      >
        {bio}
      </p>
    {:else if preview}
      <div class="mt-4 space-y-1.5" aria-hidden="true">
        <div
          class="h-3 w-full rounded-full"
          style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent)"
        ></div>
        <div
          class="h-3 w-4/5 rounded-full"
          style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent)"
        ></div>
      </div>
    {/if}

    <!-- Categories as chips (без emoji) -->
    {#if categories.length > 0}
      <div class="flex flex-wrap gap-1.5 mt-4">
        {#each categories as cat}
          <Badge
            variant="secondary"
            class="rounded-full font-normal text-xs py-1 px-2.5"
          >
            {cat.name}
          </Badge>
        {/each}
      </div>
    {/if}

    <!-- Footer: hourly rate -->
    {#if hourlyRate !== null && hourlyRate > 0}
      <div
        class="mt-5 pt-5 border-t flex items-baseline justify-between"
        style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      >
        <span class="text-xs" style="color: var(--muted-foreground)">
          Ставка
        </span>
        <span class="text-sm">
          <span
            class="text-base font-semibold"
            style="color: var(--foreground)"
          >
            від {hourlyRate.toLocaleString('uk-UA')} грн
          </span>
          <span style="color: var(--muted-foreground)">/год</span>
        </span>
      </div>
    {/if}
  </div>
</article>
