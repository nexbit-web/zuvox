<!-- src/lib/components/profile/freelancer/parts/ProfileHeader.svelte -->
<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import { Skeleton } from '$lib/components/ui/skeleton'
  import {
    BadgeCheck,
    Clock,
    ShieldAlert,
    Calendar,
    MapPin,
    Copy,
    Check,
    Pencil,
    Send,
    UserPlus,
    UserCheck,
  } from 'lucide-svelte'
  import type {
    FreelancerProfileData,
    VerificationStatus,
  } from '$lib/components/profile/types'

  interface Props {
    user: FreelancerProfileData
    isOwner: boolean
    isFollowing: boolean
    onFollow?: () => void
    onOfferWork?: () => void
    onEdit: () => void
  }

  let { user, isOwner, isFollowing, onFollow, onOfferWork, onEdit }: Props =
    $props()

  let avatarLoaded = $state(false)
  let copiedUsername = $state(false)
  let copyTimer: ReturnType<typeof setTimeout> | null = null

  const initials = $derived(
    (user.name ?? '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?',
  )

  const memberSince = $derived(
    new Date(user.createdAt).toLocaleDateString('uk-UA', {
      month: 'short',
      year: 'numeric',
    }),
  )

  const memberSinceISO = $derived(new Date(user.createdAt).toISOString())

  function reviewsLabel(n: number): string {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return 'відгук'
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100))
      return 'відгуки'
    return 'відгуків'
  }

  async function copyUsername() {
    if (!user.username) return
    try {
      await navigator.clipboard.writeText('@' + user.username)
      copiedUsername = true
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => (copiedUsername = false), 1200)
    } catch {
      // silent
    }
  }

  function statusBadge(status: VerificationStatus) {
    if (status === 'VERIFIED')
      return {
        label: 'VERIFIED',
        icon: BadgeCheck,
        bg: 'color-mix(in oklch, var(--primary) 10%, transparent)',
        fg: 'var(--primary)',
        border: 'color-mix(in oklch, var(--primary) 30%, transparent)',
      }
    if (status === 'PENDING')
      return {
        label: 'НА МОДЕРАЦІЇ',
        icon: Clock,
        bg: 'color-mix(in oklch, #f59e0b 15%, transparent)',
        fg: '#b45309',
        border: 'color-mix(in oklch, #f59e0b 30%, transparent)',
      }
    if (status === 'REJECTED')
      return {
        label: 'ВІДХИЛЕНО',
        icon: ShieldAlert,
        bg: 'color-mix(in oklch, var(--destructive) 12%, transparent)',
        fg: 'var(--destructive)',
        border: 'color-mix(in oklch, var(--destructive) 25%, transparent)',
      }
    return null
  }

  const badge = $derived(statusBadge(user.verificationStatus))
</script>

<!-- Аватар + Desktop CTA -->
<div class="flex items-start justify-between gap-3">
  <div class="-mt-12 sm:-mt-14 relative">
    {#if user.avatar && !avatarLoaded}
      <div
        class="absolute inset-0 size-24 sm:size-32 rounded-full border-4 overflow-hidden z-10"
        style="border-color: var(--background)"
      >
        <Skeleton class="w-full h-full rounded-full" />
      </div>
    {/if}
    <Avatar
      class="size-24 sm:size-32 border-4 shadow-lg"
      style="border-color: var(--background)"
    >
      {#if user.avatar}
        <AvatarImage
          src={user.avatar}
          alt="Аватар {user.name}"
          loading="eager"
          fetchpriority="high"
          decoding="async"
          onload={() => (avatarLoaded = true)}
          onerror={() => (avatarLoaded = true)}
        />
      {/if}
      <AvatarFallback
        class="text-3xl sm:text-4xl font-semibold cursor-default"
        style="background-color: var(--primary); color: var(--primary-foreground)"
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  </div>

  <nav
    aria-label="Дії з профілем"
    class="hidden sm:flex items-center gap-2 mt-4"
  >
    {#if isOwner}
      <Button onclick={onEdit} class="h-10 rounded-full gap-1.5">
        <Pencil class="size-3.5" aria-hidden="true" />
        Редагувати профіль
      </Button>
    {:else}
      <Button
        variant={isFollowing ? 'outline' : 'default'}
        onclick={onFollow}
        class="h-10 rounded-full gap-1.5"
        aria-pressed={isFollowing}
      >
        {#if isFollowing}
          <UserCheck class="size-3.5" aria-hidden="true" />
          Підписаний
        {:else}
          <UserPlus class="size-3.5" aria-hidden="true" />
          Підписатись
        {/if}
      </Button>
      <Button
        onclick={onOfferWork}
        variant="outline"
        class="h-10 rounded-full gap-1.5"
      >
        <Send class="size-3.5" aria-hidden="true" />
        Запропонувати роботу
      </Button>
    {/if}
  </nav>
</div>

<!-- Имя + статус + meta -->
<section class="mt-3 mb-5" aria-label="Основна інформація">
  <div class="flex items-start justify-between gap-2 mb-1">
    <div class="flex items-center gap-1.5 min-w-0">
      <h1
        class="text-xl font-semibold truncate"
        style="color: var(--foreground)"
        itemprop="name"
      >
        {user.name}
      </h1>
      {#if user.verificationStatus === 'VERIFIED'}
        <BadgeCheck
          class="size-5 shrink-0"
          style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
          aria-label="Верифікований"
        />
      {/if}
    </div>

    {#if badge}
      {@const Icon = badge.icon}
      <span
        class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
        style="background-color: {badge.bg}; color: {badge.fg}; border: 1px solid {badge.border}"
        role="status"
      >
        <Icon class="size-3" aria-hidden="true" />
        {badge.label}
      </span>
    {/if}
  </div>

  {#if user.username}
    <p
      class="text-sm flex items-center gap-1.5 mb-2"
      style="color: var(--muted-foreground)"
    >
      <span itemprop="alternateName">@{user.username}</span>
      <button
        type="button"
        onclick={copyUsername}
        class="cursor-pointer transition-colors hover:text-foreground"
        aria-label="Скопіювати нікнейм"
      >
        {#if copiedUsername}
          <Check class="size-3" style="color: #10b981" aria-hidden="true" />
        {:else}
          <Copy class="size-3" aria-hidden="true" />
        {/if}
      </button>
    </p>
  {/if}

  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
    <span
      class="flex items-center gap-1 text-xs"
      style="color: var(--muted-foreground)"
    >
      <Calendar class="size-3" aria-hidden="true" />
      З <time datetime={memberSinceISO}>{memberSince}</time>
    </span>
    {#if user.city}
      <span
        class="text-xs"
        style="color: color-mix(in oklch, var(--foreground) 20%, transparent)"
        aria-hidden="true">·</span
      >
      <span
        class="flex items-center gap-1 text-xs"
        style="color: var(--muted-foreground)"
      >
        <MapPin class="size-3" aria-hidden="true" />
        {user.city}
      </span>
    {/if}
  </div>

  <p class="text-sm" style="color: var(--muted-foreground)">
    <span class="font-medium" style="color: var(--foreground)"
      >{user.followers}</span
    >
    підписників ·
    <span class="font-medium" style="color: var(--primary)"
      >{user.reviewsCount}</span
    >
    {reviewsLabel(user.reviewsCount)}
  </p>

  <!-- Mobile CTA -->
  <nav aria-label="Дії з профілем" class="flex sm:hidden flex-col gap-2 mt-4">
    {#if isOwner}
      <Button onclick={onEdit} class="w-full h-11 rounded-full gap-2">
        <Pencil class="size-4" aria-hidden="true" />
        Редагувати профіль
      </Button>
    {:else}
      <div class="grid grid-cols-2 gap-2">
        <Button
          variant={isFollowing ? 'outline' : 'default'}
          onclick={onFollow}
          class="h-11 rounded-full gap-1.5"
          aria-pressed={isFollowing}
        >
          {#if isFollowing}
            <UserCheck class="size-4" aria-hidden="true" />
            Підписаний
          {:else}
            <UserPlus class="size-4" aria-hidden="true" />
            Підписатись
          {/if}
        </Button>
        <Button
          onclick={onOfferWork}
          variant="outline"
          class="h-11 rounded-full gap-1.5"
        >
          <Send class="size-4" aria-hidden="true" />
          Робота
        </Button>
      </div>
    {/if}
  </nav>
</section>
