<!-- src/routes/services/[slug]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import {
    SlidersHorizontal,
    ChevronRight,
    Home,
    Filter,
    X,
    ArrowUpDown,
  } from 'lucide-svelte'
  import { fly, fade } from 'svelte/transition'
  import type { ServicesPageResponse } from '$lib/types/services'
  import ProfilePreviewCard from '$lib/components/profile-preview-card.svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Sheet from '$lib/components/ui/sheet'
  import * as Select from '$lib/components/ui/select'
  import FiltersPanel from '$lib/components/services/filters-panel.svelte'
  import type { PageData } from './$types'

  let { data }: { data: ServicesPageResponse } = $props()

  let mobileFiltersOpen = $state(false)

  const sortOptions = [
    { value: 'rating', label: 'За рейтингом' },
    { value: 'popular', label: 'Популярні' },
    { value: 'priceAsc', label: 'Спочатку дешеві' },
    { value: 'priceDesc', label: 'Спочатку дорогі' },
    { value: 'newest', label: 'Новачки' },
  ] as const

  // ─── Підрахунок активних фільтрів ───
  const activeFiltersCount = $derived(
    (data.filters.sub ? 1 : 0) +
      (data.filters.city ? 1 : 0) +
      (data.filters.type ? 1 : 0) +
      (data.filters.minRate !== null || data.filters.maxRate !== null ? 1 : 0) +
      (data.filters.minRating !== null ? 1 : 0) +
      (data.filters.verified ? 1 : 0),
  )

  function applyFilters(
    next: Record<string, string | number | boolean | null>,
  ) {
    // 1. Беремо поточні параметри
    const params = new URLSearchParams(page.url.searchParams)

    // 2. Оновлюємо параметри на основі отриманих даних
    Object.entries(next).forEach(([key, value]) => {
      if (
        value === null ||
        value === '' ||
        value === 'all' ||
        value === false
      ) {
        params.delete(key)
      } else {
        // Перетворюємо все в рядок, бо URLSearchParams приймає тільки рядки
        params.set(key, String(value))
      }
    })

    // 3. Скидаємо сторінку на 1, якщо це не перемикання самої пагінації
    if (!next.hasOwnProperty('page')) {
      params.delete('page')
    }

    const qs = params.toString()
    const newUrl = `/services/${data.category.slug}${qs ? '?' + qs : ''}`

    // 4. Використовуємо goto з правильними налаштуваннями
    goto(newUrl, {
      keepFocus: true,
      noScroll: false,
      replaceState: false, // Важливо, щоб працювала кнопка "Назад" у браузері
    })
  }

  function changeSort(value: string) {
    applyFilters({ sort: value })
  }

  function changePage(p: number) {
    applyFilters({ page: String(p) })
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function clearAllFilters() {
    goto(`/services/${data.category.slug}`)
  }

  // ─── SEO derived ───
  const seoTitle = $derived(
    data.filters.city && data.cities.find((c) => c.slug === data.filters.city)
      ? `${data.category.name} в ${data.cities.find((c) => c.slug === data.filters.city)?.name} — майстри на Zunor`
      : `${data.category.name} — майстри на Zunor`,
  )

  const seoDescription = $derived(
    data.category.description
      ? `${data.category.description.slice(0, 160)}`
      : `Знайдіть майстрів у категорії «${data.category.name}» на Zunor. ${data.total} ${data.total === 1 ? 'майстер' : 'майстрів'}.`,
  )

  const canonicalUrl = $derived(
    `${page.url.origin}/services/${data.category.slug}`,
  )
</script>

<svelte:head>
  <title>{seoTitle}</title>
  <meta name="description" content={seoDescription} />
  <link rel="canonical" href={canonicalUrl} />

  <meta property="og:type" content="website" />
  <meta property="og:title" content={seoTitle} />
  <meta property="og:description" content={seoDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta name="robots" content="index, follow" />
</svelte:head>

<div class="min-h-screen bg-background">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
    <!-- ═══════ Хлібні крихти ═══════ -->
    <nav
      aria-label="Хлібні крихти"
      class="flex items-center gap-1.5 text-sm mb-4"
      style="color: var(--muted-foreground)"
    >
      <a
        href="/"
        class="hover:opacity-100 opacity-60 inline-flex items-center gap-1"
      >
        <Home class="size-3.5" />
        <span class="hidden sm:inline">Головна</span>
      </a>
      <ChevronRight class="size-3.5 opacity-40" />
      <a href="/services" class="hover:opacity-100 opacity-60">Категорії</a>
      <ChevronRight class="size-3.5 opacity-40" />
      <span style="color: var(--foreground)" class="font-medium truncate">
        {data.category.name}
      </span>
    </nav>

    <!-- ═══════ Заголовок ═══════ -->
    <header class="mb-8" in:fly={{ y: 8, duration: 300 }}>
      <h1
        class="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tighter mb-2"
        style="color: var(--foreground)"
      >
        {data.category.name}
      </h1>
      {#if data.category.description}
        <p
          class="text-sm sm:text-base max-w-2xl"
          style="color: var(--muted-foreground)"
        >
          {data.category.description}
        </p>
      {/if}
      <p class="text-sm font-medium opacity-50 mt-3">
        {data.total}
        {data.total === 1 ? 'майстер' : data.total < 5 ? 'майстри' : 'майстрів'}
      </p>
    </header>

    <!-- ═══════ Підкатегорії — wrap у декілька рядків ═══════ -->
    {#if data.category.subcategories.length > 0}
      <div class="mb-8">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            onclick={() => applyFilters({ sub: null })}
            class="sub-chip"
            class:active={!data.filters.sub}
          >
            Усі
          </button>
          {#each data.category.subcategories as sub (sub.slug)}
            <button
              type="button"
              onclick={() => applyFilters({ sub: sub.slug })}
              class="sub-chip"
              class:active={data.filters.sub === sub.slug}
            >
              {sub.name}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- ═══════ Toolbar: фільтри + сортування ═══════ -->
    <div
      class="flex items-center justify-between gap-3 mb-6 pb-4 border-b"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    >
      <!-- Кнопка фільтрів — тільки мобайл -->
      <Button
        variant="outline"
        onclick={() => (mobileFiltersOpen = true)}
        class="lg:hidden h-10 rounded-full gap-2"
      >
        <SlidersHorizontal class="size-4" />
        Фільтри
        {#if activeFiltersCount > 0}
          <span
            class="size-5 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold"
          >
            {activeFiltersCount}
          </span>
        {/if}
      </Button>

      <!-- Скинути все — десктоп тільки якщо є активні -->
      {#if activeFiltersCount > 0}
        <button
          type="button"
          onclick={clearAllFilters}
          class="hidden lg:inline-flex items-center gap-1 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity"
          style="color: var(--foreground)"
        >
          <X class="size-3" />
          Скинути все ({activeFiltersCount})
        </button>
      {:else}
        <span class="hidden lg:block"></span>
      {/if}

      <!-- Сортування -->
      <div class="flex items-center gap-2">
        <ArrowUpDown
          class="size-4 hidden sm:block"
          style="color: var(--muted-foreground)"
        />
        <Select.Root
          type="single"
          value={data.filters.sort}
          onValueChange={(v) => v && changeSort(v)}
        >
          <Select.Trigger class="h-10 rounded-full px-4 text-sm w-[180px]">
            {sortOptions.find((s) => s.value === data.filters.sort)?.label ??
              'Сортування'}
          </Select.Trigger>
          <Select.Content>
            {#each sortOptions as opt (opt.value)}
              <Select.Item value={opt.value}>{opt.label}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <!-- ═══════ Layout: filters sidebar + grid ═══════ -->
    <div class="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-10">
      <!-- ─── Sidebar (десктоп) ─── -->
      <aside class="hidden lg:block">
        <div class="sticky top-6">
          <FiltersPanel filters={data.filters} onApply={applyFilters} />
        </div>
      </aside>

      <!-- ─── Сітка майстрів ─── -->
      <main>
        {#if data.items.length === 0}
          <div
            class="text-center py-16 sm:py-24 rounded-2xl"
            style="background-color: color-mix(in oklch, var(--foreground) 2%, transparent)"
            in:fade
          >
            <Filter
              class="size-12 mx-auto mb-4 opacity-20"
              style="color: var(--foreground)"
            />
            <h2 class="text-lg font-bold mb-1" style="color: var(--foreground)">
              Майстрів за фільтрами не знайдено
            </h2>
            <p class="text-sm" style="color: var(--muted-foreground)">
              Спробуйте змінити параметри пошуку
            </p>
            {#if activeFiltersCount > 0}
              <button
                type="button"
                onclick={clearAllFilters}
                class="mt-4 text-sm font-medium hover:underline"
                style="color: var(--primary)"
              >
                Скинути всі фільтри
              </button>
            {/if}
          </div>
        {:else}
          <div
            class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5"
          >
            {#each data.items as master, i (master.id)}
              <div
                in:fly={{ y: 16, duration: 280, delay: Math.min(i * 25, 500) }}
              >
                <ProfilePreviewCard
                  name={master.name}
                  bio={master.bio ?? undefined}
                  photoUrl={master.avatar ?? undefined}
                  verificationStatus={master.isVerified ? 'VERIFIED' : 'NONE'}
                  categories={master.categories.slice(0, 3)}
                  city={master.city ?? undefined}
                  experience={master.experience ?? undefined}
                  rating={master.rating > 0 ? master.rating : null}
                  ordersCount={master.ordersCount}
                  hourlyRate={master.hourlyRate}
                  onAction={() =>
                    goto(
                      master.username
                        ? `/@${master.username}`
                        : `/profile/${master.id}`,
                    )}
                  actionLabel="Переглянути профіль"
                />
              </div>
            {/each}
          </div>

          <!-- ═══════ Пагінація ═══════ -->
          {#if data.totalPages > 1}
            <nav
              aria-label="Пагінація"
              class="flex items-center justify-center gap-2 mt-10 pt-6 border-t"
              style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
            >
              <Button
                variant="outline"
                disabled={data.page <= 1}
                onclick={() => changePage(data.page - 1)}
                class="h-10 rounded-full"
              >
                ← Назад
              </Button>

              <span
                class="text-sm font-medium px-4 tabular-nums"
                style="color: var(--muted-foreground)"
              >
                {data.page} / {data.totalPages}
              </span>

              <Button
                variant="outline"
                disabled={data.page >= data.totalPages}
                onclick={() => changePage(data.page + 1)}
                class="h-10 rounded-full"
              >
                Вперед →
              </Button>
            </nav>
          {/if}
        {/if}
      </main>
    </div>
  </div>
</div>

<!-- ═══════ Mobile filters bottom sheet ═══════ -->
<Sheet.Root bind:open={mobileFiltersOpen}>
  <Sheet.Content
    side="bottom"
    class="rounded-t-2xl max-h-[88vh] overflow-y-auto px-5 pb-8"
  >
    <Sheet.Header class="text-left px-0 pt-4 pb-2">
      <Sheet.Title class="text-xl">Фільтри</Sheet.Title>
      <Sheet.Description class="text-sm">
        Категорія «{data.category.name}»
      </Sheet.Description>
    </Sheet.Header>

    <div class="pt-4">
      <FiltersPanel
        filters={data.filters}
        onApply={(next) => {
          applyFilters(next)
          mobileFiltersOpen = false
        }}
      />
    </div>
  </Sheet.Content>
</Sheet.Root>

<style>
  /* ─── Підкатегорії-чіпи ─── */
  .sub-chip {
    padding: 0.5rem 0.875rem;
    border-radius: 9999px;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    color: color-mix(in oklch, var(--foreground) 70%, transparent);
    background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
    border: 1px solid transparent;
    transition:
      background-color 120ms ease,
      color 120ms ease,
      border-color 120ms ease;
    cursor: pointer;
  }
  .sub-chip:hover {
    color: var(--foreground);
    background-color: color-mix(in oklch, var(--foreground) 8%, transparent);
  }
  .sub-chip.active {
    background-color: var(--foreground);
    color: var(--background);
    border-color: var(--foreground);
  }
  .sub-chip.active:hover {
    /* активний — не змінюємо при hover, він уже у максимумі */
    background-color: var(--foreground);
  }

  /* ─── (старі стилі для горизонтального скролу можна залишити, якщо їх ще десь використовуєте) ─── */
  .scrollbar-hide {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
