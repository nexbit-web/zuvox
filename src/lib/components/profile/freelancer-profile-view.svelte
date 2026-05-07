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
    LoaderCircle,
  } from 'lucide-svelte'

  import type { FreelancerProfileData as ProfileData } from '$lib/components/profile/types'
  import { Spinner } from '../ui/spinner'

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

  // ─── Production-safe defaults для зворотної сумісності ───
  // Якщо backend ще не змігрував skills у обʼєкти — захищаємо UI
  const safeSkills = $derived(
    Array.isArray(user.skills)
      ? user.skills
          .map((s) =>
            typeof s === 'string'
              ? { slug: s, name: s }
              : s && typeof s === 'object' && 'name' in s
                ? s
                : null,
          )
          .filter((s): s is { slug: string; name: string } => s !== null)
      : [],
  )

  // ─── Derived (memoized) ───
  const memberSince = $derived(
    new Date(user.createdAt).toLocaleDateString('uk-UA', {
      month: 'short',
      year: 'numeric',
    }),
  )

  const memberSinceISO = $derived(new Date(user.createdAt).toISOString())

  const bannerUrl = $derived(getBannerForCategories(user.categories))

  const portfolioHost = $derived(
    user.portfolioUrl
      ? user.portfolioUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
      : null,
  )

  // Канонічний URL профілю (для JSON-LD)
  const profileUrl = $derived(
    user.username ? `/@${user.username}` : `/profile/${user.id}`,
  )

  // SEO: JSON-LD Person schema
  const personJsonLd = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: user.name,
      ...(user.username && {
        alternateName: `@${user.username}`,
        url: profileUrl,
      }),
      ...(user.avatar && { image: user.avatar }),
      ...(user.bio && { description: user.bio }),
      ...(user.city && {
        address: {
          '@type': 'PostalAddress',
          addressLocality: user.city,
          addressCountry: 'UA',
        },
      }),
      ...(user.skills.length > 0 && {
        knowsAbout: safeSkills.map((s) => s.name),
      }),
      ...(user.reviewsCount > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: user.avgRating,
          reviewCount: user.reviewsCount,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    }),
  )

  // ─── Стан завантаження картинок ───
  let bannerLoaded = $state(false)
  let avatarLoaded = $state(false)
  let loadedPortfolio = $state<Set<string>>(new Set())

  function onPortfolioLoad(id: string) {
    loadedPortfolio = new Set([...loadedPortfolio, id])
  }

  // ─── Показати номер (через API з лімітами) ───
  let phoneRevealed = $state(false)
  let revealedPhone = $state<string | null>(null)
  let phoneError = $state<string | null>(null)
  let phoneLoading = $state(false)

  async function togglePhone() {
    if (!isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(profileUrl))
      return
    }

    // Якщо вже відкрито — приховуємо (ваша логіка)
    if (phoneRevealed) {
      phoneRevealed = false
      return
    }

    // Якщо номер вже завантажений — просто показуємо (ваша логіка)
    if (revealedPhone) {
      phoneRevealed = true
      return
    }

    phoneLoading = true
    phoneError = null

    try {
      const res = await fetch(`/api/user/${user.id}/phone`)

      // Отримуємо JSON один раз
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Ваша мапа помилок
        const errorMap: Record<string, string> = {
          UNAUTHORIZED: 'Увійдіть, щоб побачити номер',
          DAILY_LIMIT: 'Денний ліміт вичерпано',
          SELF_LOOKUP: 'Це ваш власний профіль',
          NOT_AVAILABLE: 'Номер недоступний для перегляду',
          NOT_VERIFIED: 'Фрілансер ще не пройшов модерацію', // Додано для нового бекенду
          NO_PHONE: 'Номер не вказано',
        }

        // Виводимо або конкретне повідомлення з сервера, або з мапи, або стандартне
        phoneError = data.message || errorMap[data.error] || 'Помилка доступу'
        return
      }

      revealedPhone = data.phone
      phoneRevealed = true
    } catch {
      phoneError = 'Помилка зʼєднання'
    } finally {
      phoneLoading = false
    }
  }

  // ─── Копіювати ───
  let copiedLabel = $state<'username' | 'phone' | null>(null)
  async function copy(text: string, label: 'username' | 'phone') {
    try {
      await navigator.clipboard.writeText(text)
      copiedLabel = label
      setTimeout(() => (copiedLabel = null), 1200)
    } catch {
      // clipboard може бути заблокований у iframe — silently fail
    }
  }

  function goEdit() {
    goto('/profile/setup/freelancer')
  }

  // ─── PhotoSwipe ───
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

  // ─── Helpers ───
  const initials = $derived(
    (user.name ?? '?')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?',
  )

  // Безпечне відображення кількості відгуків з відмінками
  function reviewsLabel(n: number): string {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return 'відгук'
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100))
      return 'відгуки'
    return 'відгуків'
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe.css"
  />
  <!-- Person JSON-LD для SEO. Інші meta теги (title, description, og:*) — у +page.svelte -->
  {@html `<script type="application/ld+json">${personJsonLd}</script>`}
</svelte:head>

<article
  class="min-h-screen pb-20 md:pb-10"
  style="background-color: var(--background)"
  itemscope
  itemtype="https://schema.org/Person"
>
  <!-- ═══════ БАНЕР ═══════ -->
  <header class="px-4 pt-4 sm:px-6 sm:pt-6">
    <div
      class="relative w-full h-32 xs:h-40 sm:h-52 rounded-2xl overflow-hidden"
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
        role="presentation"
        class="w-full h-full object-cover transition-opacity duration-300"
        style="opacity: {bannerLoaded ? 1 : 0}"
        loading="eager"
        fetchpriority="high"
        decoding="async"
        onload={() => (bannerLoaded = true)}
        onerror={() => (bannerLoaded = true)}
      />
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35))"
      ></div>
    </div>
  </header>

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
              alt="Аватар {user.name}"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              onload={() => (avatarLoaded = true)}
              onerror={() => (avatarLoaded = true)}
            />
            <meta itemprop="image" content={user.avatar} />
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
          <Button onclick={goEdit} class="h-10 rounded-full gap-1.5">
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

    <!-- ═══════ Імʼя + статус ═══════ -->
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

        {#if user.verificationStatus === 'VERIFIED'}
          <span
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style="background-color: color-mix(in oklch, var(--primary) 10%, transparent);
                   color: var(--primary);
                   border: 1px solid color-mix(in oklch, var(--primary) 30%, transparent)"
            role="status"
          >
            <BadgeCheck class="size-3" aria-hidden="true" />
            VERIFIED
          </span>
        {:else if user.verificationStatus === 'PENDING'}
          <span
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style="background-color: color-mix(in oklch, #f59e0b 15%, transparent);
                   color: #b45309;
                   border: 1px solid color-mix(in oklch, #f59e0b 30%, transparent)"
            role="status"
          >
            <Clock class="size-3" aria-hidden="true" />
            НА МОДЕРАЦІЇ
          </span>
        {:else if user.verificationStatus === 'REJECTED'}
          <span
            class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0"
            style="background-color: color-mix(in oklch, var(--destructive) 12%, transparent);
                   color: var(--destructive);
                   border: 1px solid color-mix(in oklch, var(--destructive) 25%, transparent)"
            role="status"
          >
            <ShieldAlert class="size-3" aria-hidden="true" />
            ВІДХИЛЕНО
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
            onclick={() => copy('@' + user.username, 'username')}
            class="cursor-pointer transition-colors hover:text-foreground"
            aria-label="Скопіювати нікнейм"
          >
            {#if copiedLabel === 'username'}
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
            aria-hidden="true"
          >
            ·
          </span>
          <span
            class="flex items-center gap-1 text-xs"
            style="color: var(--muted-foreground)"
            itemprop="address"
            itemscope
            itemtype="https://schema.org/PostalAddress"
          >
            <MapPin class="size-3" aria-hidden="true" />
            <span itemprop="addressLocality">{user.city}</span>
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
        {reviewsLabel(user.reviewsCount)}
      </p>

      <!-- Mobile CTA -->
      <nav
        aria-label="Дії з профілем"
        class="flex sm:hidden flex-col gap-2 mt-4"
      >
        {#if isOwner}
          <Button onclick={goEdit} class="w-full h-11 rounded-full gap-2">
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

    <!-- Причина відхилення — тільки owner -->
    {#if isOwner && user.verificationStatus === 'REJECTED' && user.verificationRejectReason}
      <aside
        class="p-4 rounded-xl mb-5"
        style="background-color: color-mix(in oklch, var(--destructive) 8%, transparent);
               border: 1px solid color-mix(in oklch, var(--destructive) 20%, transparent)"
        role="alert"
      >
        <p
          class="text-sm font-medium flex items-center gap-1.5 mb-1"
          style="color: var(--destructive)"
        >
          <ShieldAlert class="size-4" aria-hidden="true" />
          Профіль відхилено модератором
        </p>
        <p
          class="text-sm leading-relaxed"
          style="color: var(--muted-foreground); overflow-wrap: anywhere"
        >
          {user.verificationRejectReason}
        </p>
      </aside>
    {/if}

    <!-- ═══════ КОНТАКТИ ═══════ -->
    {#if !isOwner && user.hasPhone}
      <section
        class="mb-5 p-4 rounded-2xl border"
        style="background-color: var(--card);
           border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        aria-label="Контакти"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="size-10 rounded-full flex items-center justify-center shrink-0"
              style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
            >
              <Phone
                class="size-4"
                style="color: var(--primary)"
                aria-hidden="true"
              />
            </div>
            <div class="min-w-0">
              {#if phoneRevealed && revealedPhone}
                <a
                  href={`tel:${revealedPhone.replace(/[^\d+]/g, '')}`}
                  class="text-base font-semibold tabular-nums hover:underline"
                  style="color: var(--foreground)"
                  itemprop="telephone"
                >
                  {revealedPhone}
                </a>
                <button
                  type="button"
                  onclick={() => copy(revealedPhone!, 'phone')}
                  class="text-xs inline-flex items-center gap-1 cursor-pointer hover:opacity-70 mt-0.5"
                  style="color: var(--muted-foreground)"
                  aria-label="Скопіювати номер"
                >
                  {#if copiedLabel === 'phone'}
                    <Check
                      class="size-3"
                      style="color: #10b981"
                      aria-hidden="true"
                    />
                    Скопійовано
                  {:else}
                    <Copy class="size-3" aria-hidden="true" />
                    Копіювати
                  {/if}
                </button>
              {:else if phoneError}
                <p
                  class="text-sm font-medium"
                  style="color: var(--destructive)"
                >
                  {phoneError}
                </p>
                <p
                  class="text-xs mt-0.5"
                  style="color: var(--muted-foreground)"
                >
                  Спробуйте пізніше
                </p>
              {:else}
                <p class="text-sm font-medium" style="color: var(--foreground)">
                  Контактний номер
                </p>
                <p class="text-xs" style="color: var(--muted-foreground)">
                  {isAuthenticated
                    ? 'Ліміт: 5 переглядів на добу'
                    : 'Увійдіть, щоб побачити номер'}
                </p>
              {/if}
            </div>
          </div>
          <Button
            onclick={togglePhone}
            disabled={phoneLoading}
            variant={phoneRevealed && revealedPhone ? 'outline' : 'default'}
            class="h-9 rounded-full gap-1.5 shrink-0"
          >
            {#if phoneLoading}
              <Spinner />
            {:else if !isAuthenticated}
              <LogIn class="size-3.5" aria-hidden="true" />
              Увійти
            {:else if phoneRevealed && revealedPhone}
              Приховати
            {:else}
              <Phone class="size-3.5" aria-hidden="true" />
              Показати
            {/if}
          </Button>
        </div>
      </section>
    {/if}

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Про себе ═══════ -->
    <section class="py-5 space-y-4" aria-labelledby="about-heading">
      <h2
        id="about-heading"
        class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
        style="color: var(--muted-foreground)"
      >
        <User class="size-3.5" aria-hidden="true" /> Про себе
      </h2>

      {#if user.bio}
        <p
          class="text-sm leading-relaxed"
          style="color: var(--muted-foreground); overflow-wrap: anywhere"
          itemprop="description"
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
          <ul class="flex flex-wrap gap-1.5 justify-end list-none p-0 m-0">
            {#each user.categories as cat (cat)}
              <li>
                <Badge
                  class="rounded-full text-xs font-normal"
                  style="background-color: color-mix(in oklch, var(--primary) 12%, transparent);
                         color: var(--primary);
                         border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent)"
                >
                  {cat}
                </Badge>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if user.experience}
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
            Досвід
          </span>
          <span class="text-sm text-right" style="color: var(--foreground)">
            {user.experience}
          </span>
        </div>
      {/if}

      {#if user.languages.length > 0}
        <div class="flex items-start justify-between gap-4">
          <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
            Мови
          </span>
          <ul class="flex gap-2 flex-wrap justify-end list-none p-0 m-0">
            {#each user.languages as lang, i (lang)}
              <li class="text-sm" style="color: var(--foreground)">
                {lang}{i < user.languages.length - 1 ? ',' : ''}
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if user.hourlyRate}
        <div class="flex items-center justify-between gap-4">
          <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
            Ставка
          </span>
          <span class="text-sm text-right" style="color: var(--foreground)">
            від
            <span class="font-semibold">
              {user.hourlyRate.toLocaleString('uk-UA')} грн
            </span>
            <span style="color: var(--muted-foreground)">/ год</span>
          </span>
        </div>
      {/if}
    </section>

    <!-- ═══════ НАВИЧКИ ═══════ -->
    {#if safeSkills.length > 0}
      <div
        class="border-t"
        style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      ></div>
      <section class="py-5" aria-labelledby="skills-heading">
        <h2
          id="skills-heading"
          class="text-[11px] font-medium tracking-widest uppercase mb-3 flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <Sparkles class="size-3.5" aria-hidden="true" /> Навички
        </h2>
        <ul class="flex flex-wrap gap-1.5 list-none p-0 m-0">
          {#each safeSkills as skill (skill.slug)}
            <li
              class="text-xs px-3 py-1.5 rounded-full border"
              style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                     border-color: color-mix(in oklch, var(--foreground) 10%, transparent);
                     color: var(--foreground)"
              itemprop="knowsAbout"
            >
              {skill.name}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Статистика ═══════ -->
    <section class="py-5" aria-labelledby="stats-heading">
      <h2
        id="stats-heading"
        class="text-[11px] font-medium tracking-widest uppercase mb-4 flex items-center gap-1.5"
        style="color: var(--muted-foreground)"
      >
        <Zap class="size-3.5" aria-hidden="true" /> Статистика
      </h2>

      <dl class="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div
          class="rounded-lg px-3 sm:px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <dt
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <Star class="size-3" aria-hidden="true" /> Рейтинг
          </dt>
          <dd
            class="text-lg sm:text-xl font-semibold tabular-nums m-0"
            style="color: var(--foreground)"
          >
            {user.avgRating.toFixed(1)}
            <span
              class="text-xs sm:text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              / 5.0
            </span>
          </dd>
        </div>

        <div
          class="rounded-lg px-3 sm:px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <dt
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <BadgeCheck class="size-3" aria-hidden="true" /> Виконано
          </dt>
          <dd
            class="text-lg sm:text-xl font-semibold tabular-nums m-0"
            style="color: var(--foreground)"
          >
            {user.totalOrders}
            <span
              class="text-xs sm:text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              замовлень
            </span>
          </dd>
        </div>

        <div
          class="rounded-lg px-3 sm:px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <dt
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <Clock class="size-3" aria-hidden="true" /> Відповідь
          </dt>
          <dd
            class="text-lg sm:text-xl font-semibold tabular-nums m-0"
            style="color: var(--foreground)"
          >
            ~{user.responseTimeHrs ?? 0}
            <span
              class="text-xs sm:text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              год
            </span>
          </dd>
        </div>

        <div
          class="rounded-lg px-3 sm:px-4 py-3 border"
          style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <dt
            class="text-xs mb-1 flex items-center gap-1.5"
            style="color: var(--muted-foreground)"
          >
            <RefreshCw class="size-3" aria-hidden="true" /> Повторні
          </dt>
          <dd
            class="text-lg sm:text-xl font-semibold tabular-nums m-0"
            style="color: var(--foreground)"
          >
            {user.repeatClientsPct}%
            <span
              class="text-xs sm:text-sm font-normal"
              style="color: var(--muted-foreground)"
            >
              клієнтів
            </span>
          </dd>
        </div>
      </dl>

      <div
        class="flex items-center justify-between gap-2 px-4 py-3 rounded-lg"
        style="background-color: color-mix(in oklch, #10b981 8%, transparent);
               border: 1px solid color-mix(in oklch, #10b981 20%, transparent)"
      >
        <span
          class="text-sm flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <BadgeCheck
            class="size-3.5"
            style="color: #10b981"
            aria-hidden="true"
          />
          Успішних замовлень
        </span>
        <span class="text-sm font-semibold tabular-nums" style="color: #059669">
          {user.successRate}%
        </span>
      </div>
    </section>

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Послуги ═══════ -->
    <section class="py-5" aria-labelledby="gigs-heading">
      <div class="flex items-center justify-between mb-4">
        <h2
          id="gigs-heading"
          class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <Briefcase class="size-3.5" aria-hidden="true" /> Послуги
        </h2>
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
        <ul class="list-none p-0 m-0">
          {#each user.gigs as gig, i (gig.id)}
            <li>
              <a
                href="/gigs/{gig.id}"
                class="flex items-center gap-3 sm:gap-4 py-3.5 transition-opacity hover:opacity-70 cursor-pointer group"
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
                    aria-hidden="true"
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
                        aria-hidden="true"
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
                    aria-hidden="true"
                  />
                </div>
              </a>
            </li>
          {/each}
        </ul>
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
    </section>

    <!-- ═══════ Портфоліо ═══════ -->
    {#if user.portfolio.length > 0 || user.portfolioUrl}
      <div
        class="border-t"
        style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      ></div>

      <section class="py-5" aria-labelledby="portfolio-heading">
        <h2
          id="portfolio-heading"
          class="text-[11px] font-medium tracking-widest uppercase mb-4 flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <ImageIcon class="size-3.5" aria-hidden="true" /> Портфоліо
        </h2>

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
                <Globe
                  class="size-4"
                  style="color: var(--primary)"
                  aria-hidden="true"
                />
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
              aria-hidden="true"
            />
          </a>
        {/if}

        {#if user.portfolio.length > 0}
          <div
            id="zunor-portfolio"
            class="grid grid-cols-2 sm:grid-cols-3 gap-2"
          >
            {#each user.portfolio as item (item.id)}
              {@const loaded = loadedPortfolio.has(item.id)}
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
                  alt={item.title ?? 'Робота з портфоліо'}
                  class="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  style="opacity: {loaded ? 1 : 0}"
                  loading="lazy"
                  decoding="async"
                  onload={() => onPortfolioLoad(item.id)}
                  onerror={() => onPortfolioLoad(item.id)}
                />

                <div
                  class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none"
                  style="background: linear-gradient(180deg, rgba(0,0,0,0.3), rgba(0,0,0,0.6))"
                  aria-hidden="true"
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
      </section>
    {/if}

    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>

    <!-- ═══════ Відгуки ═══════ -->
    <section class="py-5" aria-labelledby="reviews-heading">
      <div class="flex items-center justify-between mb-6">
        <h2
          id="reviews-heading"
          class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <MessageSquare class="size-3.5" aria-hidden="true" /> Відгуки
        </h2>
        <span
          class="text-xs flex items-center gap-1"
          style="color: var(--muted-foreground)"
        >
          <Star
            class="size-3"
            style="color: #f5a623; fill: #f5a623"
            aria-hidden="true"
          />
          {user.avgRating.toFixed(1)} · {user.reviewsCount}
          {reviewsLabel(user.reviewsCount)}
        </span>
      </div>

      {#if user.reviews.length > 0}
        <ul class="list-none p-0 m-0">
          {#each user.reviews as review, i (review.id ?? i)}
            <li
              class="py-5 first:pt-0"
              style="border-top: {i === 0
                ? 'none'
                : '1px solid color-mix(in oklch, var(--foreground) 5%, transparent)'}"
              itemprop="review"
              itemscope
              itemtype="https://schema.org/Review"
            >
              <div class="flex items-center gap-2 mb-2">
                <div
                  class="size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border"
                  style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                         border-color: color-mix(in oklch, var(--foreground) 8%, transparent);
                         color: var(--primary)"
                  aria-hidden="true"
                >
                  {review.authorInitials}
                </div>
                <span
                  class="text-sm font-medium"
                  style="color: var(--foreground)"
                  itemprop="author"
                >
                  {review.authorName}
                </span>
                <div
                  class="flex ml-auto gap-0.5"
                  itemprop="reviewRating"
                  itemscope
                  itemtype="https://schema.org/Rating"
                  aria-label="Рейтинг: {review.rating} з 5"
                >
                  <meta
                    itemprop="ratingValue"
                    content={String(review.rating)}
                  />
                  <meta itemprop="bestRating" content="5" />
                  {#each Array(review.rating) as _}
                    <Star
                      class="size-3"
                      style="color: #f5a623; fill: #f5a623"
                      aria-hidden="true"
                    />
                  {/each}
                </div>
              </div>
              <p
                class="text-sm leading-relaxed pl-9"
                style="color: var(--muted-foreground); overflow-wrap: anywhere"
                itemprop="reviewBody"
              >
                {review.text}
              </p>
              <p
                class="text-[11px] mt-2 pl-9"
                style="color: color-mix(in oklch, var(--muted-foreground) 60%, transparent)"
              >
                <time datetime={new Date(review.createdAt).toISOString()}>
                  {new Date(review.createdAt).toLocaleDateString('uk-UA', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </time>
              </p>
            </li>
          {/each}
        </ul>
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
    </section>
  </div>
</article>
