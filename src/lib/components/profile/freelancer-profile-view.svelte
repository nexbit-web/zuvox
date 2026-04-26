<!-- src/lib/components/profile/freelancer-profile-view.svelte -->
<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import { Skeleton } from '$lib/components/ui/skeleton'
  import { goto } from '$app/navigation'
  import { onMount, onDestroy } from 'svelte'
  import { getBannerForCategories } from '$lib/data/category-banners'
  import {
    BadgeCheck,
    Copy,
    Check,
    ExternalLink,
    MapPin,
    Clock,
    Star,
    RefreshCw,
    ArrowUpRight,
    Calendar,
    Zap,
    Briefcase,
    ImageIcon,
    MessageSquare,
    User,
    Globe,
    Pencil,
    Send,
    UserPlus,
    UserCheck,
    ShieldAlert,
    Phone,
    LogIn,
    Sparkles,
    Expand,
  } from 'lucide-svelte'

  // Типи у спільному файлі — щоб імпортувалися і компонентом, і server loaders
  import type { FreelancerProfileData as ProfileData } from '$lib/components/profile/types'

  interface Props {
    user: ProfileData
    isOwner: boolean
    isAuthenticated: boolean
    isFollowing?: boolean
    onFollow?: () => void
    onOfferWork?: () => void
  }

  let {
    user,
    isOwner,
    isAuthenticated,
    isFollowing = false,
    onFollow,
    onOfferWork,
  }: Props = $props()

  const memberSince = $derived(
    new Date(user.createdAt).toLocaleDateString('uk-UA', {
      month: 'short',
      year: 'numeric',
    }),
  )

  const bannerUrl = $derived(getBannerForCategories(user.categories))

  const portfolioHost = $derived(
    user.portfolioUrl
      ? user.portfolioUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
      : null,
  )

  // ─── Стан завантаження картинок ───
  let bannerLoaded = $state(false)
  let avatarLoaded = $state(false)
  let loadedPortfolio = $state<Set<string>>(new Set())

  function onPortfolioLoad(id: string) {
    loadedPortfolio = new Set([...loadedPortfolio, id])
  }

  // ─── Показати номер ───
  let phoneRevealed = $state(false)
  function togglePhone() {
    if (!isAuthenticated) {
      const returnUrl = user.username
        ? `/@${user.username}`
        : `/profile/${user.id}`
      goto('/user/login?next=' + encodeURIComponent(returnUrl))
      return
    }
    phoneRevealed = !phoneRevealed
  }

  // ─── Копіювати ───
  let copiedLabel = $state<'username' | 'phone' | null>(null)
  function copy(text: string, label: 'username' | 'phone') {
    navigator.clipboard.writeText(text)
    copiedLabel = label
    setTimeout(() => (copiedLabel = null), 1200)
  }

  function goEdit() {
    goto('/profile/setup/freelancer')
  }

  // ═══════════════════════════════════════════════════════
  // PhotoSwipe lightbox
  // ═══════════════════════════════════════════════════════
  let lightbox: { init: () => void; destroy: () => void } | null = null

  onMount(async () => {
    if (user.portfolio.length === 0) return

    try {
      const { default: PhotoSwipeLightbox } =
        await import('photoswipe/lightbox')

      lightbox = new PhotoSwipeLightbox({
        gallery: '#zunor-portfolio',
        children: 'a.pswp-item',
        pswpModule: () => import('photoswipe'),
        bgOpacity: 0.92,
        showHideAnimationType: 'fade',
        padding: { top: 40, bottom: 40, left: 20, right: 20 },
      })
      lightbox.init()
    } catch (err) {
      console.error('[PhotoSwipe] failed to load:', err)
    }
  })

  onDestroy(() => {
    lightbox?.destroy()
    lightbox = null
  })
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe.css"
  />
</svelte:head>

<div
  class="min-h-screen pb-20 md:pb-10"
  style="background-color: var(--background)"
>
  <!-- ═══════ БАНЕР ═══════ -->
  <div class="px-4 pt-4 sm:px-6 sm:pt-6">
    <div
      class="relative w-full h-40 sm:h-52 rounded-2xl overflow-hidden"
      style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent)"
    >
      {#if !bannerLoaded}
        <div class="absolute inset-0">
          <Skeleton class="w-full h-full rounded-2xl" />
        </div>
      {/if}
      <img
        src={bannerUrl}
        alt=""
        class="w-full h-full object-cover transition-opacity duration-300"
        style="opacity: {bannerLoaded ? 1 : 0}"
        loading="eager"
        fetchpriority="high"
        onload={() => (bannerLoaded = true)}
        onerror={() => (bannerLoaded = true)}
      />
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35))"
      ></div>
    </div>
  </div>

  <div class="max-w-2xl mx-auto px-4 sm:px-8">
    <!-- ═══════ АВАТАР + CTA ═══════ -->
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
              alt={user.name}
              onload={() => (avatarLoaded = true)}
              onerror={() => (avatarLoaded = true)}
            />
          {/if}
          <AvatarFallback
            class="text-3xl sm:text-4xl font-semibold cursor-default"
            style="background-color: var(--primary); color: var(--primary-foreground)"
          >
            {user.name?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
      </div>

      <div class="hidden sm:flex items-center gap-2 mt-4">
        {#if isOwner}
          <Button onclick={goEdit} class="h-10 rounded-full gap-1.5">
            <Pencil class="size-3.5" />
            Редагувати профіль
          </Button>
        {:else}
          <Button
            variant={isFollowing ? 'outline' : 'default'}
            onclick={onFollow}
            class="h-10 rounded-full gap-1.5"
          >
            {#if isFollowing}
              <UserCheck class="size-3.5" />
              Підписаний
            {:else}
              <UserPlus class="size-3.5" />
              Підписатись
            {/if}
          </Button>
          <Button
            onclick={onOfferWork}
            variant="outline"
            class="h-10 rounded-full gap-1.5"
          >
            <Send class="size-3.5" />
            Запропонувати роботу
          </Button>
        {/if}
      </div>
    </div>

    <!-- ═══════ Ім'я + статус ═══════ -->
    <div class="mt-3 mb-5">
      <div class="flex items-start justify-between gap-2 mb-1">
        <div class="flex items-center gap-1.5 min-w-0">
          <h1
            class="text-xl font-semibold truncate"
            style="color: var(--foreground)"
          >
            {user.name}
          </h1>
          {#if user.verificationStatus === 'VERIFIED'}
            <BadgeCheck
              class="size-5 shrink-0"
              style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
            />
          {/if}
        </div>

        {#if user.verificationStatus === 'VERIFIED'}
          <span
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style="background-color: color-mix(in oklch, var(--primary) 10%, transparent);
                   color: var(--primary);
                   border: 1px solid color-mix(in oklch, var(--primary) 30%, transparent)"
          >
            <BadgeCheck class="size-3" />
            VERIFIED
          </span>
        {:else if user.verificationStatus === 'PENDING'}
          <span
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style="background-color: color-mix(in oklch, #f59e0b 15%, transparent);
                   color: #b45309;
                   border: 1px solid color-mix(in oklch, #f59e0b 30%, transparent)"
          >
            <Clock class="size-3" />
            НА МОДЕРАЦІЇ
          </span>
        {:else if user.verificationStatus === 'REJECTED'}
          <span
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style="background-color: color-mix(in oklch, var(--destructive) 12%, transparent);
                   color: var(--destructive);
                   border: 1px solid color-mix(in oklch, var(--destructive) 25%, transparent)"
          >
            <ShieldAlert class="size-3" />
            ВІДХИЛЕНО
          </span>
        {/if}
      </div>

      {#if user.username}
        <p
          class="text-sm flex items-center gap-1.5 mb-2"
          style="color: var(--muted-foreground)"
        >
          <span>@{user.username}</span>
          <button
            type="button"
            onclick={() => copy('@' + user.username, 'username')}
            class="cursor-pointer transition-colors hover:text-foreground"
            aria-label="Копіювати нікнейм"
          >
            {#if copiedLabel === 'username'}
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
            style="color: color-mix(in oklch, var(--foreground) 20%, transparent)"
          >
            ·
          </span>
          <span
            class="flex items-center gap-1 text-xs"
            style="color: var(--muted-foreground)"
          >
            <MapPin class="size-3" />
            {user.city}
          </span>
        {/if}
      </div>

      <p class="text-sm" style="color: var(--muted-foreground)">
        <span class="font-medium" style="color: var(--foreground)">
          {user.followers}
        </span>
        підписників ·
        <span class="font-medium" style="color: var(--primary)">
          {user.reviewsCount}
        </span>
        {user.reviewsCount === 1 ? 'відгук' : 'відгуків'}
      </p>

      <div class="flex sm:hidden flex-col gap-2 mt-4">
        {#if isOwner}
          <Button onclick={goEdit} class="w-full h-11 rounded-full gap-2">
            <Pencil class="size-4" />
            Редагувати профіль
          </Button>
        {:else}
          <div class="grid grid-cols-2 gap-2">
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              onclick={onFollow}
              class="h-11 rounded-full gap-1.5"
            >
              {#if isFollowing}
                <UserCheck class="size-4" />
                Підписаний
              {:else}
                <UserPlus class="size-4" />
                Підписатись
              {/if}
            </Button>
            <Button
              onclick={onOfferWork}
              variant="outline"
              class="h-11 rounded-full gap-1.5"
            >
              <Send class="size-4" />
              Робота
            </Button>
          </div>
        {/if}
      </div>
    </div>

    <!-- Причина відхилення — тільки owner -->
    {#if isOwner && user.verificationStatus === 'REJECTED' && user.verificationRejectReason}
      <div
        class="p-4 rounded-xl mb-5"
        style="background-color: color-mix(in oklch, var(--destructive) 8%, transparent);
               border: 1px solid color-mix(in oklch, var(--destructive) 20%, transparent)"
      >
        <p
          class="text-sm font-medium flex items-center gap-1.5 mb-1"
          style="color: var(--destructive)"
        >
          <ShieldAlert class="size-4" />
          Профіль відхилено модератором
        </p>
        <p
          class="text-sm leading-relaxed"
          style="color: var(--muted-foreground)"
        >
          {user.verificationRejectReason}
        </p>
      </div>
    {/if}

    <!-- ═══════ КОНТАКТИ ═══════ -->
    {#if !isOwner && user.phone}
      <div
        class="mb-5 p-4 rounded-2xl border"
        style="background-color: var(--card);
               border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-10 rounded-full flex items-center justify-center shrink-0"
              style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
            >
              <Phone class="size-4" style="color: var(--primary)" />
            </div>
            <div class="min-w-0">
              {#if phoneRevealed && isAuthenticated}
                <p
                  class="text-base font-semibold tabular-nums"
                  style="color: var(--foreground)"
                >
                  {user.phone}
                </p>
                <button
                  type="button"
                  onclick={() => copy(user.phone!, 'phone')}
                  class="text-xs inline-flex items-center gap-1 cursor-pointer hover:opacity-70"
                  style="color: var(--muted-foreground)"
                >
                  {#if copiedLabel === 'phone'}
                    <Check class="size-3" style="color: #10b981" />
                    Скопійовано
                  {:else}
                    <Copy class="size-3" />
                    Копіювати
                  {/if}
                </button>
              {:else}
                <p class="text-sm font-medium" style="color: var(--foreground)">
                  Контактний номер
                </p>
                <p class="text-xs" style="color: var(--muted-foreground)">
                  {isAuthenticated
                    ? 'Натисніть щоб побачити'
                    : 'Увійдіть, щоб побачити номер'}
                </p>
              {/if}
            </div>
          </div>
          <Button
            onclick={togglePhone}
            variant={phoneRevealed && isAuthenticated ? 'outline' : 'default'}
            class="h-9 rounded-full gap-1.5 shrink-0"
          >
            {#if !isAuthenticated}
              <LogIn class="size-3.5" />
              Увійти
            {:else if phoneRevealed}
              Приховати
            {:else}
              <Phone class="size-3.5" />
              Показати
            {/if}
          </Button>
        </div>
      </div>
    {/if}

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Про себе ═══════ -->
    <div class="py-5 space-y-4">
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
          {isOwner ? 'Ви ще не додали опис.' : 'Користувач ще не додав опис.'}
        </p>
      {/if}

      {#if user.categories.length > 0}
        <div class="flex items-start justify-between gap-4">
          <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
            Категорії
          </span>
          <div class="flex flex-wrap gap-1.5 justify-end">
            {#each user.categories as cat}
              <Badge
                class="rounded-full text-xs font-normal"
                style="background-color: color-mix(in oklch, var(--primary) 12%, transparent);
                       color: var(--primary);
                       border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent)"
              >
                {cat}
              </Badge>
            {/each}
          </div>
        </div>
      {/if}

      {#if user.experience}
        <div class="flex items-center justify-between">
          <span class="text-sm" style="color: var(--muted-foreground)"
            >Досвід</span
          >
          <span class="text-sm" style="color: var(--foreground)">
            {user.experience}
          </span>
        </div>
      {/if}

      {#if user.languages.length > 0}
        <div class="flex items-start justify-between gap-4">
          <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
            Мови
          </span>
          <div class="flex gap-2 flex-wrap justify-end">
            {#each user.languages as lang, i}
              <span class="text-sm" style="color: var(--foreground)">
                {lang}{i < user.languages.length - 1 ? ',' : ''}
              </span>
            {/each}
          </div>
        </div>
      {/if}

      {#if user.hourlyRate}
        <div class="flex items-center justify-between">
          <span class="text-sm" style="color: var(--muted-foreground)"
            >Ставка</span
          >
          <span class="text-sm" style="color: var(--foreground)">
            від <span class="font-semibold">
              {user.hourlyRate.toLocaleString('uk-UA')} грн
            </span>
            <span style="color: var(--muted-foreground)">/ год</span>
          </span>
        </div>
      {/if}
    </div>

    <!-- ═══════ НАВИЧКИ ═══════ -->
    {#if user.skills.length > 0}
      <div
        class="border-t"
        style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      ></div>
      <div class="py-5">
        <p
          class="text-[11px] font-medium tracking-widest uppercase mb-3 flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <Sparkles class="size-3.5" /> Навички
        </p>
        <div class="flex flex-wrap gap-1.5">
          {#each user.skills as skill}
            <span
              class="text-xs px-3 py-1.5 rounded-full border"
              style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                     border-color: color-mix(in oklch, var(--foreground) 10%, transparent);
                     color: var(--foreground)"
            >
              {skill}
            </span>
          {/each}
        </div>
      </div>
    {/if}

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Статистика ═══════ -->
    <div class="py-5">
      <p
        class="text-[11px] font-medium tracking-widest uppercase mb-4 flex items-center gap-1.5"
        style="color: var(--muted-foreground)"
      >
        <Zap class="size-3.5" /> Статистика
      </p>
      <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div
          class="rounded-lg px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <p
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <Star class="size-3" /> Рейтинг
          </p>
          <p
            class="text-xl font-semibold tabular-nums"
            style="color: var(--foreground)"
          >
            {user.avgRating.toFixed(1)}
            <span
              class="text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              / 5.0
            </span>
          </p>
        </div>

        <div
          class="rounded-lg px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <p
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <BadgeCheck class="size-3" /> Виконано
          </p>
          <p
            class="text-xl font-semibold tabular-nums"
            style="color: var(--foreground)"
          >
            {user.totalOrders}
            <span
              class="text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              замовлень
            </span>
          </p>
        </div>

        <div
          class="rounded-lg px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <p
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <Clock class="size-3" /> Відповідь
          </p>
          <p
            class="text-xl font-semibold tabular-nums"
            style="color: var(--foreground)"
          >
            ~{user.responseTimeHrs ?? 0}
            <span
              class="text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              год
            </span>
          </p>
        </div>

        <div
          class="rounded-lg px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <p
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <RefreshCw class="size-3" /> Повторні
          </p>
          <p
            class="text-xl font-semibold tabular-nums"
            style="color: var(--foreground)"
          >
            {user.repeatClientsPct}%
            <span
              class="text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              клієнтів
            </span>
          </p>
        </div>
      </div>

      <div
        class="flex items-center justify-between px-4 py-3 rounded-lg"
        style="background-color: color-mix(in oklch, #10b981 8%, transparent);
               border: 1px solid color-mix(in oklch, #10b981 20%, transparent)"
      >
        <span
          class="text-sm flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <BadgeCheck class="size-3.5" style="color: #10b981" />
          Успішних замовлень
        </span>
        <span class="text-sm font-semibold tabular-nums" style="color: #059669">
          {user.successRate}%
        </span>
      </div>
    </div>

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Послуги ═══════ -->
    <div class="py-5">
      <div class="flex items-center justify-between mb-4">
        <p
          class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <Briefcase class="size-3.5" /> Послуги
        </p>
        {#if isOwner}
          <button
            onclick={() => goto('/gigs/new')}
            class="text-xs cursor-pointer transition-opacity hover:opacity-70"
            style="color: var(--primary)"
          >
            + Додати
          </button>
        {/if}
      </div>

      {#if user.gigs.length > 0}
        <div>
          {#each user.gigs as gig, i}
            <a
              href="/gigs/{gig.id}"
              class="flex items-center gap-4 py-3.5 transition-opacity hover:opacity-70 cursor-pointer group"
              style="border-top: {i === 0
                ? 'none'
                : '1px solid color-mix(in oklch, var(--foreground) 5%, transparent)'}"
            >
              <div
                class="size-8 flex items-center justify-center rounded-lg shrink-0 border"
                style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                       border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
              >
                <Briefcase
                  class="size-3.5"
                  style="color: var(--muted-foreground)"
                />
              </div>
              <div class="flex-1 min-w-0">
                <p
                  class="text-sm font-medium truncate"
                  style="color: var(--foreground)"
                >
                  {gig.title}
                </p>
                {#if gig.rating !== undefined && gig.orders !== undefined}
                  <p
                    class="text-xs mt-0.5 flex items-center gap-1"
                    style="color: var(--muted-foreground)"
                  >
                    <Star
                      class="size-3"
                      style="color: #f5a623; fill: #f5a623"
                    />
                    {gig.rating} · {gig.orders} замовлень
                  </p>
                {/if}
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <span
                  class="text-sm font-medium whitespace-nowrap"
                  style="color: var(--primary)"
                >
                  від {gig.price.toLocaleString('uk-UA')} грн
                </span>
                <ArrowUpRight
                  class="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style="color: var(--muted-foreground)"
                />
              </div>
            </a>
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
              ? 'У вас ще немає активних послуг'
              : 'У користувача ще немає активних послуг'}
          </p>
          {#if isOwner}
            <button
              onclick={() => goto('/gigs/new')}
              class="text-xs mt-2 cursor-pointer transition-opacity hover:opacity-70"
              style="color: var(--primary)"
            >
              Створити першу послугу →
            </button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- ═══════ Портфоліо (PhotoSwipe lightbox) ═══════ -->
    {#if user.portfolio.length > 0 || user.portfolioUrl}
      <div
        class="border-t"
        style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      ></div>

      <div class="py-5">
        <div class="flex items-center justify-between mb-4">
          <p
            class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <ImageIcon class="size-3.5" /> Портфоліо
          </p>
        </div>

        <!-- Посилання як помітна плашка -->
        {#if user.portfolioUrl && portfolioHost}
          <a
            href={user.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            class="flex items-center justify-between gap-3 px-4 py-3 mb-3 rounded-xl border transition-all hover:opacity-80 group cursor-pointer"
            style="background-color: color-mix(in oklch, var(--primary) 5%, transparent);
                   border-color: color-mix(in oklch, var(--primary) 20%, transparent)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="size-9 rounded-full flex items-center justify-center shrink-0"
                style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
              >
                <Globe class="size-4" style="color: var(--primary)" />
              </div>
              <div class="min-w-0">
                <p class="text-xs" style="color: var(--muted-foreground)">
                  Сайт / портфоліо
                </p>
                <p
                  class="text-sm font-medium truncate"
                  style="color: var(--foreground)"
                >
                  {portfolioHost}
                </p>
              </div>
            </div>
            <ExternalLink
              class="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              style="color: var(--primary)"
            />
          </a>
        {/if}

        {#if user.portfolio.length > 0}
          <div
            id="zunor-portfolio"
            class="grid grid-cols-2 sm:grid-cols-3 gap-2"
          >
            {#each user.portfolio as item}
              {@const loaded = loadedPortfolio.has(item.id)}
              <!--
                ⚠️ Ключове для PhotoSwipe:
                  — НЕМАЄ target="_blank" (він ламає preventDefault)
                  — data-pswp-width / height ОБОВʼЯЗКОВІ
                  — клас pswp-item співпадає з селектором у options.children
              -->
              <a
                href={item.imageUrl}
                data-pswp-width={item.width ?? 1600}
                data-pswp-height={item.height ?? 1200}
                class="pswp-item aspect-video rounded-xl overflow-hidden cursor-zoom-in group relative block"
                aria-label="Відкрити {item.title ?? 'фото'} у повному розмірі"
                style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent)"
              >
                {#if !loaded}
                  <div class="absolute inset-0">
                    <Skeleton class="w-full h-full rounded-xl" />
                  </div>
                {/if}
                <img
                  src={item.imageUrl}
                  alt={item.title ?? 'portfolio'}
                  class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  style="opacity: {loaded ? 1 : 0}"
                  loading="lazy"
                  onload={() => onPortfolioLoad(item.id)}
                  onerror={() => onPortfolioLoad(item.id)}
                />

                <!-- Оверлей з іконкою розгортання -->
                <div
                  class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                  style="background: linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6))"
                >
                  <div
                    class="size-10 rounded-full flex items-center justify-center"
                    style="background-color: rgba(255,255,255,0.15); backdrop-filter: blur(8px)"
                  >
                    <Expand class="size-4 text-white" />
                  </div>
                </div>

                {#if item.title}
                  <div
                    class="absolute inset-x-0 bottom-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style="background: linear-gradient(180deg, transparent, rgba(0,0,0,0.75))"
                  >
                    <span class="text-white text-xs font-medium">
                      {item.title}
                    </span>
                  </div>
                {/if}
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Відгуки ═══════ -->
    <div class="py-5">
      <div class="flex items-center justify-between mb-6">
        <p
          class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <MessageSquare class="size-3.5" /> Відгуки
        </p>
        <span
          class="text-xs flex items-center gap-1"
          style="color: var(--muted-foreground)"
        >
          <Star class="size-3" style="color: #f5a623; fill: #f5a623" />
          {user.avgRating.toFixed(1)} · {user.reviewsCount}
          {user.reviewsCount === 1 ? 'відгук' : 'відгуків'}
        </span>
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
                  class="size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border"
                  style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                         border-color: color-mix(in oklch, var(--foreground) 8%, transparent);
                         color: var(--primary)"
                >
                  {review.authorInitials}
                </div>
                <span
                  class="text-sm font-medium"
                  style="color: var(--foreground)"
                >
                  {review.authorName}
                </span>
                <div class="flex ml-auto gap-0.5">
                  {#each Array(review.rating) as _}
                    <Star
                      class="size-3"
                      style="color: #f5a623; fill: #f5a623"
                    />
                  {/each}
                </div>
              </div>
              <p
                class="text-sm leading-relaxed pl-9"
                style="color: var(--muted-foreground); overflow-wrap: anywhere"
              >
                {review.text}
              </p>
              <p
                class="text-[11px] mt-2 pl-9"
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
            Ще немає відгуків
          </p>
        </div>
      {/if}
    </div>
  </div>
</div>
