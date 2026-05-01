<!-- src/routes/gigs/[slug]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import {
    BadgeCheck,
    Star,
    Clock,
    Eye,
    ShoppingBag,
    Edit,
    MapPin,
    MessageSquare,
    Check,
  } from 'lucide-svelte'
  import * as Tabs from '$lib/components/ui/tabs'
  import GigPackageCard from '$lib/components/gigs/gig-package-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let activeTab = $state('BASIC')
  let activeImageIdx = $state(0)
  let orderingTier = $state<string | null>(null)
  let orderError = $state('')

  const seller = $derived(data.gig.seller)
  const packages = $derived(data.gig.packages)

  function tierLabel(tier: string): string {
    return tier === 'BASIC'
      ? 'Базовий'
      : tier === 'STANDARD'
        ? 'Стандартний'
        : 'Преміум'
  }

  // Початково обираємо BASIC якщо є, інакше перший доступний
  $effect(() => {
    if (packages.length > 0 && !packages.find((p) => p.tier === activeTab)) {
      activeTab = packages[0].tier
    }
  })

  async function handleOrder(tier: string) {
    if (!data.isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(`/gigs/${data.gig.slug}`))
      return
    }
    if (data.isOwner) {
      orderError = 'Не можна замовити свій гіг'
      return
    }

    orderingTier = tier
    orderError = ''

    try {
      const res = await fetch(`/api/gigs/${data.gig.id}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Помилка замовлення')
      }

      const { order } = await res.json()
      // Переходимо у чат — там буде кнопка переходу до замовлення
      if (order.chatId) {
        goto(`/messages/${order.chatId}`)
      } else {
        goto('/orders')
      }
    } catch (err) {
      orderError = err instanceof Error ? err.message : 'Помилка'
    } finally {
      orderingTier = null
    }
  }

  // Швидкий перехід на чат із сторінки гіга
  async function startChat() {
    if (!data.isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(`/gigs/${data.gig.slug}`))
      return
    }
    try {
      const res = await fetch('/api/chats/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: seller.id }),
      })
      if (!res.ok) return
      const { chatId } = await res.json()
      goto(`/messages/${chatId}`)
    } catch (err) {
      console.error(err)
    }
  }

  function formatMoney(cents: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const minPrice = $derived(
    packages.length > 0 ? Math.min(...packages.map((p) => p.priceCents)) : 0,
  )
</script>

<svelte:head>
  <title>{data.gig.title} · Zunor</title>
  {#if data.gig.shortDescription}
    <meta name="description" content={data.gig.shortDescription} />
  {/if}
  {#if data.gig.images[0]}
    <meta property="og:image" content={data.gig.images[0]} />
  {/if}
</svelte:head>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
  {#if data.gig.status !== 'ACTIVE'}
    <div
      class="rounded-xl px-4 py-3 mb-4 text-sm"
      style="background-color: color-mix(in srgb, #f59e0b 15%, transparent);
             border: 1px solid #f59e0b;
             color: var(--foreground)"
    >
      {#if data.gig.status === 'DRAFT'}
        Це чернетка. Опублікуйте гіг щоб його бачили клієнти.
      {:else if data.gig.status === 'PAUSED'}
        Гіг призупинено. Клієнти його не бачать.
      {:else if data.gig.status === 'ARCHIVED'}
        Гіг архівовано.
      {/if}
      {#if data.isOwner}
        <a
          href={`/dashboard/gigs/${data.gig.id}/edit`}
          class="ml-2 underline font-medium"
        >
          Редагувати
        </a>
      {/if}
    </div>
  {/if}

  <div class="grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-10">
    <!-- ─── ЛІВА ЧАСТИНА: контент ─── -->
    <div class="min-w-0">
      <!-- Категорія + breadcrumb -->
      <div class="text-xs mb-2" style="color: var(--muted-foreground)">
        {data.gig.category}
        {#if data.gig.subcategory}/ {data.gig.subcategory}{/if}
      </div>

      <!-- Title -->
      <h1
        class="text-2xl sm:text-3xl font-bold tracking-tight mb-4 leading-tight"
        style="color: var(--foreground)"
      >
        {data.gig.title}
      </h1>

      <!-- Seller mini -->
      <a
        href={seller.username ? `/@${seller.username}` : '#'}
        class="inline-flex items-center gap-2.5 mb-5 group"
      >
        <Avatar class="size-9">
          <AvatarImage src={seller.avatar ?? ''} alt={seller.name ?? ''} />
          <AvatarFallback
            class="text-xs font-semibold"
            style="background-color: var(--muted); color: var(--foreground)"
          >
            {seller.name?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div>
          <div class="flex items-center gap-1">
            <span
              class="text-sm font-semibold group-hover:underline"
              style="color: var(--foreground)"
            >
              {seller.name}
            </span>
            {#if seller.verificationStatus === 'VERIFIED'}
              <BadgeCheck
                class="size-3.5"
                style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
              />
            {/if}
          </div>
          <div
            class="flex items-center gap-2 text-xs"
            style="color: var(--muted-foreground)"
          >
            {#if seller.freelancerProfile && seller.freelancerProfile.reviewsCount > 0}
              <span class="inline-flex items-center gap-0.5">
                <Star class="size-3" style="fill: currentColor" />
                {seller.freelancerProfile.avgRating.toFixed(1)}
                ({seller.freelancerProfile.reviewsCount})
              </span>
            {/if}
            {#if seller.city}
              <span class="inline-flex items-center gap-0.5">
                <MapPin class="size-3" />
                {seller.city}
              </span>
            {/if}
          </div>
        </div>
      </a>

      <!-- Gallery -->
      {#if data.gig.images.length > 0}
        <div class="mb-6">
          <div
            class="aspect-video rounded-2xl overflow-hidden mb-3"
            style="background-color: var(--muted)"
          >
            <img
              src={data.gig.images[activeImageIdx]}
              alt={data.gig.title}
              class="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          {#if data.gig.images.length > 1}
            <div class="flex gap-2 overflow-x-auto">
              {#each data.gig.images as img, i}
                <button
                  type="button"
                  onclick={() => (activeImageIdx = i)}
                  class="size-16 shrink-0 rounded-lg overflow-hidden transition-opacity"
                  style="opacity: {activeImageIdx === i ? 1 : 0.55};
                         {activeImageIdx === i
                    ? 'box-shadow: 0 0 0 2px var(--ring)'
                    : ''}"
                >
                  <img
                    src={img}
                    alt=""
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Stats line -->
      <div
        class="flex flex-wrap gap-4 mb-6 pb-6"
        style="border-bottom: 1px solid var(--border)"
      >
        {#if data.gig.avgRating > 0}
          <div class="flex items-center gap-1.5">
            <Star class="size-4" style="color: #f59e0b; fill: #f59e0b" />
            <span
              class="text-sm font-semibold"
              style="color: var(--foreground)"
            >
              {data.gig.avgRating.toFixed(1)}
            </span>
            <span class="text-xs" style="color: var(--muted-foreground)">
              ({data.gig.reviewsCount})
            </span>
          </div>
        {/if}
        <div class="flex items-center gap-1.5">
          <ShoppingBag class="size-4" style="color: var(--muted-foreground)" />
          <span class="text-sm" style="color: var(--foreground)">
            {data.gig.ordersCount}
          </span>
          <span class="text-xs" style="color: var(--muted-foreground)">
            замовлень
          </span>
        </div>
        <div class="flex items-center gap-1.5">
          <Eye class="size-4" style="color: var(--muted-foreground)" />
          <span class="text-sm" style="color: var(--foreground)">
            {data.gig.viewCount}
          </span>
          <span class="text-xs" style="color: var(--muted-foreground)">
            переглядів
          </span>
        </div>
      </div>

      <!-- Description -->
      <h2 class="text-lg font-semibold mb-3" style="color: var(--foreground)">
        Про послугу
      </h2>
      <div
        class="text-[14.5px] leading-relaxed whitespace-pre-wrap mb-6"
        style="color: var(--foreground)"
      >
        {data.gig.description}
      </div>

      <!-- Tags -->
      {#if data.gig.tags.length > 0}
        <div class="flex flex-wrap gap-1.5 mb-6">
          {#each data.gig.tags as tag}
            <span
              class="px-2.5 py-1 rounded-full text-xs"
              style="background-color: var(--muted); color: var(--muted-foreground)"
            >
              #{tag}
            </span>
          {/each}
        </div>
      {/if}
    </div>

    <!-- ─── ПРАВА ЧАСТИНА: пакети + замовлення ─── -->
    <aside class="lg:sticky lg:top-6 lg:self-start">
      {#if packages.length === 0}
        <div
          class="rounded-2xl p-6 text-center"
          style="background-color: var(--muted)"
        >
          <p class="text-sm" style="color: var(--muted-foreground)">
            Немає доступних пакетів
          </p>
        </div>
      {:else}
        <div
          class="rounded-2xl overflow-hidden"
          style="border: 1px solid var(--border)"
        >
          <Tabs.Root bind:value={activeTab}>
            <Tabs.List class="w-full grid grid-cols-3 rounded-none">
              {#each packages as pkg}
                <Tabs.Trigger value={pkg.tier} class="text-xs">
                  {tierLabel(pkg.tier)}
                </Tabs.Trigger>
              {/each}
            </Tabs.List>
            {#each packages as pkg}
              <Tabs.Content value={pkg.tier} class="p-5 mt-0">
                <GigPackageCard
                  pkg={{
                    tier: pkg.tier,
                    name: pkg.name,
                    description: pkg.description,
                    priceCents: pkg.priceCents,
                    deliveryDays: pkg.deliveryDays,
                    revisions: pkg.revisions,
                    features: pkg.features,
                  }}
                  loading={orderingTier === pkg.tier}
                  disabled={data.isOwner || orderingTier !== null}
                  onOrder={() => handleOrder(pkg.tier)}
                />
              </Tabs.Content>
            {/each}
          </Tabs.Root>
        </div>

        {#if orderError}
          <p class="mt-3 text-xs text-center" style="color: var(--destructive)">
            {orderError}
          </p>
        {/if}

        {#if data.isOwner}
          <a
            href={`/dashboard/gigs/${data.gig.id}/edit`}
            class="mt-3 w-full inline-flex items-center justify-center gap-2 h-10 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
            style="background-color: var(--muted); color: var(--foreground)"
          >
            <Edit class="size-4" />
            Редагувати гіг
          </a>
        {:else}
          <button
            type="button"
            onclick={startChat}
            class="mt-3 w-full inline-flex items-center justify-center gap-2 h-10 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
            style="background-color: var(--muted); color: var(--foreground)"
          >
            <MessageSquare class="size-4" />
            Написати майстру
          </button>
        {/if}
      {/if}
    </aside>
  </div>
</div>
