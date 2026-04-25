<!-- src/lib/components/profile/client-profile-view.svelte -->
<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import {
    BadgeCheck,
    Copy,
    Check,
    MapPin,
    Calendar,
    ShoppingBag,
    Star,
    MessageSquare,
    User,
    MessageCircle,
    Pencil,
    Repeat,
    Sparkles,
    ArrowRight,
  } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import type { ClientProfileData } from '$lib/components/profile/types'

  interface Props {
    user: ClientProfileData
    isOwner: boolean
    isAuthenticated: boolean
    onMessage?: () => void
  }

  let { user, isOwner, onMessage }: Props = $props()

  const memberSince = $derived(
    new Date(user.createdAt).toLocaleDateString('uk-UA', {
      month: 'short',
      year: 'numeric',
    }),
  )

  const avgRating = $derived(
    user.reviews.length > 0
      ? (
          user.reviews.reduce((sum, r) => sum + r.rating, 0) /
          user.reviews.length
        ).toFixed(1)
      : '0.0',
  )

  let copied = $state(false)
  function copyUsername() {
    if (!user.username) return
    navigator.clipboard.writeText('@' + user.username)
    copied = true
    setTimeout(() => (copied = false), 1200)
  }

  function goEdit() {
    goto('/profile/setup/client')
  }

  function becomeFreelancer() {
    goto('/profile/setup/freelancer')
  }
</script>

<!-- CEO -->
<svelte:head>
  <!-- TITLE -->
  <title>
    {`${user.name || 'Користувач'} — замовник ${
      user.city ? `з ${user.city}` : ''
    } | Zunor`}
  </title>

  <!-- DESCRIPTION -->
  <meta
    name="description"
    content={`${user.name || 'Користувач'} — замовник послуг на Zunor. ${
      user.city ? `Місто: ${user.city}.` : ''
    } ${user.totalOrders} замовлень, ${
      user.reviews.length
    } відгуків від виконавців.`}
  />

  <!-- OPEN GRAPH -->
  <meta
    property="og:title"
    content={`${user.name || 'Користувач'} — замовник | Zunor`}
  />
  <meta
    property="og:description"
    content={`Профіль замовника на Zunor. ${user.totalOrders} замовлень.`}
  />
  <meta property="og:type" content="profile" />
  <meta property="og:image" content={user.avatar || '/default-avatar.png'} />

  <!-- CANONICAL -->
  <link rel="canonical" href={`https://zunor.com/profile/${user.id}`} />

  <!-- JSON-LD -->
  <script type="application/ld+json">
    {JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Person",
      name: user.name,
      image: user.avatar,
      url: `https://zunor.com/profile/${user.id}`,
      address: user.city
        ? {
            "@type": "PostalAddress",
            addressLocality: user.city,
            addressCountry: "UA"
          }
        : undefined,
      description: `Замовник на платформі Zunor`,
    })}
  </script>
</svelte:head>

<div class="bg-background min-h-screen pb-24 sm:pb-12">
  <div class="max-w-2xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12">
    <!-- Аватар + CTA -->
    <div class="flex items-start justify-between mb-4 mt-1">
      <Avatar class="h-20 w-20 sm:h-24 sm:w-24 border-2 border-background">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback
          class="text-2xl sm:text-3xl font-semibold cursor-default"
          style="background-color: var(--secondary); color: var(--secondary-foreground)"
        >
          {user.name?.[0]?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>

      <div class="hidden sm:flex gap-2 mt-2">
        {#if isOwner}
          <Button onclick={goEdit} class="h-9 rounded-full gap-1.5 text-sm">
            <Pencil class="size-3.5" />
            Редагувати профіль
          </Button>
        {:else}
          <Button
            onclick={onMessage}
            variant="outline"
            class="h-9 rounded-full gap-1.5 text-sm"
          >
            <MessageCircle class="size-3.5" />
            Написати
          </Button>
        {/if}
      </div>
    </div>

    <!-- Імʼя + статус -->
    <div class="mb-6">
      <div class="flex items-start justify-between gap-2 mb-1">
        <div class="flex items-center gap-1.5 min-w-0">
          <h1
            class="text-[18px] font-semibold truncate"
            style="color: var(--foreground)"
          >
            {user.name || 'Без імені'}
          </h1>
          {#if user.verificationStatus === 'VERIFIED'}
            <BadgeCheck
              class="size-[18px] shrink-0"
              style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
            />
          {/if}
        </div>

        {#if user.verificationStatus === 'VERIFIED'}
          <span
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style="background-color: color-mix(in oklch, #10b981 12%, transparent);
                   color: #059669;
                   border: 1px solid color-mix(in oklch, #10b981 30%, transparent)"
          >
            <BadgeCheck class="size-3" />
            VERIFIED
          </span>
        {/if}
      </div>

      {#if user.username}
        <p
          class="text-xs flex items-center gap-1 mb-2"
          style="color: var(--muted-foreground)"
        >
          <span>@{user.username}</span>
          <button
            type="button"
            onclick={copyUsername}
            class="cursor-pointer transition-colors hover:opacity-70"
            aria-label="Копіювати"
          >
            {#if copied}
              <Check class="size-3" style="color: #10b981" />
            {:else}
              <Copy class="size-3" />
            {/if}
          </button>
        </p>
      {/if}

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span
          class="flex items-center gap-1 text-xs"
          style="color: var(--muted-foreground)"
        >
          <Calendar class="size-3" />
          З {memberSince}
        </span>
        {#if user.city}
          <span
            class="text-xs"
            style="color: color-mix(in oklch, var(--muted-foreground) 40%, transparent)"
            >·</span
          >
          <span
            class="flex items-center gap-1 text-xs"
            style="color: var(--muted-foreground)"
          >
            <MapPin class="size-3" />
            {user.city}
          </span>
        {/if}
      </div>

      <p class="text-sm mb-4" style="color: var(--muted-foreground)">
        <span class="font-medium" style="color: var(--foreground)">
          {user.totalOrders}
        </span>
        замовлень
        {#if user.reviews.length > 0}
          ·
          <span class="font-medium" style="color: var(--primary)">
            {user.reviews.length} відгуків
          </span>
          ·
          <span style="color: #f5a623; font-weight: 500">★ {avgRating}</span>
        {/if}
      </p>

      <!-- Бейджи -->
      <div class="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          class="rounded-full text-xs font-normal px-3 py-1 cursor-default gap-1.5"
        >
          <ShoppingBag class="size-3" />
          Клієнт
        </Badge>
        {#if user.completedOrders >= 10}
          <Badge
            variant="outline"
            class="rounded-full text-xs font-normal px-3 py-1 cursor-default gap-1.5"
          >
            <Repeat class="size-3" />
            Постійний клієнт
          </Badge>
        {/if}
      </div>

      <!-- Mobile CTA -->
      {#if isOwner}
        <div class="flex sm:hidden mt-4">
          <Button onclick={goEdit} class="w-full h-11 rounded-full gap-2">
            <Pencil class="size-4" />
            Редагувати профіль
          </Button>
        </div>
      {/if}
    </div>

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
    ></div>

    <!-- Про себе -->
    {#if user.bio || isOwner}
      <div class="py-5 space-y-3">
        <p
          class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <User class="size-3.5" /> Про себе
        </p>
        {#if user.bio}
          <p
            class="text-sm leading-relaxed"
            style="color: var(--muted-foreground); overflow-wrap: anywhere"
          >
            {user.bio}
          </p>
        {:else}
          <p
            class="text-sm italic"
            style="color: var(--muted-foreground); opacity: 0.6"
          >
            Ви ще не додали опис.
          </p>
        {/if}
      </div>
      <div
        class="border-t"
        style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
      ></div>
    {/if}

    <!-- Відгуки -->
    <div class="py-5">
      <div class="flex items-center justify-between mb-6">
        <p
          class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <MessageSquare class="size-3.5" /> Відгуки від майстрів
        </p>
        {#if user.reviews.length > 0}
          <span
            class="text-xs flex items-center gap-1"
            style="color: var(--muted-foreground)"
          >
            <Star class="size-3" style="color: #f5a623; fill: #f5a623" />
            {avgRating} · {user.reviews.length}
            {user.reviews.length === 1 ? 'відгук' : 'відгуків'}
          </span>
        {/if}
      </div>

      {#if user.reviews.length > 0}
        <div>
          {#each user.reviews as review, i}
            <div
              class="py-5 first:pt-0"
              style="border-top: {i === 0
                ? 'none'
                : '1px solid color-mix(in oklch, var(--foreground) 5%, transparent)'}"
            >
              <div class="flex items-center gap-2 mb-2">
                <div
                  class="size-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style="background-color: var(--muted); color: var(--muted-foreground)"
                >
                  {review.masterInitials}
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-medium"
                    style="color: var(--foreground)"
                  >
                    {review.masterName}
                  </p>
                  <p
                    class="text-xs truncate"
                    style="color: var(--muted-foreground)"
                  >
                    {review.gig}
                  </p>
                </div>
                <div class="flex gap-0.5 shrink-0">
                  {#each Array(review.rating) as _}
                    <Star
                      class="size-3"
                      style="color: #f5a623; fill: #f5a623"
                    />
                  {/each}
                </div>
              </div>
              <p
                class="text-sm leading-relaxed pl-10"
                style="color: var(--muted-foreground); overflow-wrap: anywhere"
              >
                {review.text}
              </p>
              <p
                class="text-[11px] mt-2 pl-10"
                style="color: color-mix(in oklch, var(--muted-foreground) 60%, transparent)"
              >
                {new Date(review.createdAt).toLocaleDateString('uk-UA', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          {/each}
        </div>
      {:else}
        <div
          class="text-center py-8 rounded-xl"
          style="background-color: color-mix(in oklch, var(--foreground) 2%, transparent)"
        >
          <p
            class="text-sm"
            style="color: var(--muted-foreground); opacity: 0.7"
          >
            {isOwner
              ? 'Поки ще немає відгуків. Зробіть перше замовлення — і майстри почнуть лишати відгуки.'
              : 'Ще немає відгуків'}
          </p>
          {#if isOwner}
            <button
              onclick={() => goto('/services')}
              class="text-xs mt-2 cursor-pointer transition-opacity hover:opacity-70 font-medium"
              style="color: var(--primary)"
            >
              Знайти майстра →
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- ═══════ Стати майстром (тільки owner, на сторінці клієнта) ═══════ -->
    {#if isOwner}
      <div
        class="border-t"
        style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
      ></div>
      <div class="py-6">
        <button
          type="button"
          onclick={becomeFreelancer}
          class="w-full flex items-center justify-between gap-4 p-5 rounded-xl border transition-all hover:opacity-90 cursor-pointer text-left"
          style="background-color: color-mix(in oklch, var(--primary) 5%, transparent);
                 border-color: color-mix(in oklch, var(--primary) 20%, transparent)"
        >
          <div class="flex items-center gap-4 min-w-0">
            <div
              class="size-11 rounded-full flex items-center justify-center shrink-0"
              style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
            >
              <Sparkles class="size-5" style="color: var(--primary)" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-semibold" style="color: var(--foreground)">
                Хочете заробляти?
              </p>
              <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">
                Створіть профіль майстра і пропонуйте свої послуги.
              </p>
            </div>
          </div>
          <ArrowRight class="size-5 shrink-0" style="color: var(--primary)" />
        </button>
      </div>
    {/if}
  </div>

  <!-- Sticky CTA на мобільному (тільки для чужого профілю) -->
  {#if !isOwner}
    <div
      class="sm:hidden fixed bottom-[68px] left-0 right-0 px-4 py-3 z-40"
      style="background-color: color-mix(in oklch, var(--background) 95%, transparent);
             backdrop-filter: blur(8px);
             border-top: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent);"
    >
      <Button
        onclick={onMessage}
        variant="outline"
        class="w-full h-11 rounded-full gap-2 text-sm"
      >
        <MessageCircle class="size-4" />
        Написати
      </Button>
    </div>
  {/if}
</div>
