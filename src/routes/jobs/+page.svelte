<!-- src/routes/jobs/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import {
    Search,
    Plus,
    X,
    Briefcase,
    Sparkles,
    ChevronDown,
    Check,
    LoaderCircle,
    AlertCircle,
    SlidersHorizontal,
  } from 'lucide-svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Card } from '$lib/components/ui/card'
  import JobCard from '$lib/components/jobs/job-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // ═══════════════════════════════════════════════════════════
  // Types
  // ═══════════════════════════════════════════════════════════

  interface CategoryOption {
    id: string
    name: string
    slug: string
  }

  interface CityOption {
    id: string
    name: string
  }

  // ═══════════════════════════════════════════════════════════
  // Module-level cache (зберігається між монтуваннями)
  // ═══════════════════════════════════════════════════════════

  let categoriesCache: CategoryOption[] | null = null
  let citiesCache: CityOption[] | null = null
  let categoriesPromise: Promise<CategoryOption[]> | null = null
  let citiesPromise: Promise<CityOption[]> | null = null

  // ═══════════════════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════════════════

  const FETCH_TIMEOUT_MS = 8_000

  const SORT_OPTIONS = [
    { value: 'recent', label: 'Свіжі' },
    { value: 'budget-desc', label: 'Бюджет ↓' },
    { value: 'budget-asc', label: 'Бюджет ↑' },
    { value: 'popular', label: 'Популярні' },
  ] as const

  const TYPE_OPTIONS = [
    { value: 'ANY', label: 'Будь-який' },
    { value: 'ONLINE', label: 'Онлайн' },
    { value: 'OFFLINE', label: 'Офлайн' },
    { value: 'VISIT', label: 'Виїзд' },
  ] as const

  // ═══════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════

  let searchInput = $state(data.filters.q)
  let category = $state(data.filters.category)
  let type = $state(data.filters.type || 'ANY')
  let city = $state(data.filters.city)
  let budgetMin = $state(data.filters.budgetMin)
  let budgetMax = $state(data.filters.budgetMax)
  let sort = $state(data.filters.sort || 'recent')

  // Async data — стартуємо з кешем якщо є
  let categories = $state<CategoryOption[]>(categoriesCache ?? [])
  let cities = $state<CityOption[]>(citiesCache ?? [])
  let categoriesLoading = $state(false)
  let citiesLoading = $state(false)
  let categoriesError = $state(false)
  let citiesError = $state(false)
  let categoriesLoaded = $state(!!categoriesCache)
  let citiesLoaded = $state(!!citiesCache)

  // Search inside dropdowns
  let categorySearch = $state('')
  let citySearch = $state('')

  let categoriesAbort: AbortController | null = null
  let citiesAbort: AbortController | null = null

  // ═══════════════════════════════════════════════════════════
  // Derived
  // ═══════════════════════════════════════════════════════════

  const isClient = $derived(data.session?.user?.role === 'CLIENT')
  const showFilters = $derived(!isClient)

  const titleText = $derived(
    isClient ? 'Заявки фрілансерів' : 'Заявки клієнтів',
  )

  const subtitle = $derived(
    isClient
      ? 'Тут фрілансери шукають роботу. Опублікуйте свою заявку — отримайте відгуки.'
      : 'Знайдіть роботу під ваші навички.',
  )

  const activeFiltersCount = $derived(
    [
      data.filters.category,
      data.filters.type && data.filters.type !== 'ANY' ? data.filters.type : '',
      data.filters.city,
      data.filters.budgetMin,
      data.filters.budgetMax,
    ].filter(Boolean).length,
  )

  const hasAppliedFilters = $derived(activeFiltersCount > 0 || !!data.filters.q)

  const sortLabel = $derived(
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Свіжі',
  )
  const typeLabel = $derived(
    TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Будь-який',
  )

  // Категорія в pill: якщо ще не загрузили — показуємо slug,
  // після завантаження автоматично оновиться на name.
  const categoryLabel = $derived.by(() => {
    if (!category) return 'Категорія'
    if (categories.length === 0) return category
    const found = categories.find((c) => c.slug === category)
    return found?.name ?? category
  })

  const totalLabel = $derived.by(() => {
    const t = data.total
    if (t === 1) return 'результат'
    if (t >= 2 && t <= 4) return 'результати'
    return 'результатів'
  })

  // Filtered lists
  const filteredCategories = $derived.by(() => {
    const q = categorySearch.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  })

  const filteredCities = $derived.by(() => {
    const q = citySearch.trim().toLowerCase()
    if (!q) return cities
    return cities.filter((c) => c.name.toLowerCase().includes(q))
  })

  // Track unapplied changes
  const draftSnapshot = $derived(
    JSON.stringify({
      q: searchInput.trim(),
      category,
      type,
      city,
      budgetMin,
      budgetMax,
      sort,
    }),
  )

  const appliedSnapshot = $derived(
    JSON.stringify({
      q: data.filters.q,
      category: data.filters.category,
      type: data.filters.type || 'ANY',
      city: data.filters.city,
      budgetMin: data.filters.budgetMin,
      budgetMax: data.filters.budgetMax,
      sort: data.filters.sort || 'recent',
    }),
  )

  const hasUnappliedChanges = $derived(draftSnapshot !== appliedSnapshot)

  // ═══════════════════════════════════════════════════════════
  // Lazy data loading (тільки при відкритті dropdown)
  // ═══════════════════════════════════════════════════════════

  async function fetchCategoriesData(): Promise<CategoryOption[]> {
    if (categoriesCache) return categoriesCache
    if (categoriesPromise) return categoriesPromise

    categoriesPromise = (async () => {
      if (categoriesAbort) categoriesAbort.abort()
      categoriesAbort = new AbortController()
      const timeoutId = setTimeout(
        () => categoriesAbort?.abort(),
        FETCH_TIMEOUT_MS,
      )

      try {
        const res = await fetch('/api/categories', {
          signal: categoriesAbort.signal,
        })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        const raw = Array.isArray(json) ? json : (json.categories ?? [])

        const items: CategoryOption[] = raw
          .map((c: any, idx: number) => {
            const name = String(c?.name ?? c?.title ?? '').trim()
            const slug = String(c?.slug ?? c?.id ?? '').trim()
            const id = String(c?.id ?? slug ?? `cat-${idx}`).trim()
            return { id, name, slug }
          })
          .filter((c: CategoryOption) => c.name && c.slug)

        const seen = new Set<string>()
        const deduped = items.filter((c) => {
          if (seen.has(c.slug)) return false
          seen.add(c.slug)
          return true
        })

        categoriesCache = deduped
        return deduped
      } catch (err) {
        categoriesPromise = null // дозволити retry
        throw err
      } finally {
        clearTimeout(timeoutId)
      }
    })()

    return categoriesPromise
  }

  async function fetchCitiesData(): Promise<CityOption[]> {
    if (citiesCache) return citiesCache
    if (citiesPromise) return citiesPromise

    citiesPromise = (async () => {
      if (citiesAbort) citiesAbort.abort()
      citiesAbort = new AbortController()
      const timeoutId = setTimeout(() => citiesAbort?.abort(), FETCH_TIMEOUT_MS)

      try {
        const res = await fetch('/api/cities', {
          signal: citiesAbort.signal,
        })
        clearTimeout(timeoutId)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        const raw = Array.isArray(json) ? json : (json.cities ?? [])

        const items: CityOption[] = raw
          .map((c: any, idx: number) => {
            const name =
              typeof c === 'string'
                ? c.trim()
                : String(c?.name ?? c?.title ?? '').trim()
            const id = String(c?.id ?? name ?? `city-${idx}`).trim()
            return { id, name }
          })
          .filter((c: CityOption) => c.name)

        const seen = new Set<string>()
        const deduped = items.filter((c) => {
          if (seen.has(c.name)) return false
          seen.add(c.name)
          return true
        })

        citiesCache = deduped
        return deduped
      } catch (err) {
        citiesPromise = null
        throw err
      } finally {
        clearTimeout(timeoutId)
      }
    })()

    return citiesPromise
  }

  // Викликається ТІЛЬКИ коли юзер відкриває dropdown
  async function ensureCategoriesLoaded() {
    if (categoriesLoaded || categoriesLoading) return

    categoriesLoading = true
    categoriesError = false

    try {
      const items = await fetchCategoriesData()
      categories = items
      categoriesLoaded = true
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[categories] failed:', err)
        categoriesError = true
      }
    } finally {
      categoriesLoading = false
    }
  }

  async function ensureCitiesLoaded() {
    if (citiesLoaded || citiesLoading) return

    citiesLoading = true
    citiesError = false

    try {
      const items = await fetchCitiesData()
      cities = items
      citiesLoaded = true
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('[cities] failed:', err)
        citiesError = true
      }
    } finally {
      citiesLoading = false
    }
  }

  function onCategoryDropdownChange(open: boolean) {
    if (open) {
      ensureCategoriesLoaded()
    } else {
      categorySearch = ''
    }
  }

  function onCityDropdownChange(open: boolean) {
    if (open) {
      ensureCitiesLoaded()
    } else {
      citySearch = ''
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Filter actions
  // ═══════════════════════════════════════════════════════════

  function applyFilters() {
    const params = new URLSearchParams()
    const q = searchInput.trim()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (type && type !== 'ANY') params.set('type', type)
    if (city) params.set('city', city)
    if (budgetMin) params.set('budgetMin', budgetMin)
    if (budgetMax) params.set('budgetMax', budgetMax)
    if (sort && sort !== 'recent') params.set('sort', sort)
    const qs = params.toString()
    goto(qs ? `/jobs?${qs}` : '/jobs', { keepFocus: true, noScroll: true })
  }

  function resetDrafts() {
    searchInput = data.filters.q
    category = data.filters.category
    type = data.filters.type || 'ANY'
    city = data.filters.city
    budgetMin = data.filters.budgetMin
    budgetMax = data.filters.budgetMax
    sort = data.filters.sort || 'recent'
  }

  function clearAll() {
    searchInput = ''
    category = ''
    type = 'ANY'
    city = ''
    budgetMin = ''
    budgetMax = ''
    sort = 'recent'
    goto('/jobs')
  }

  function onSearchKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      applyFilters()
    } else if (e.key === 'Escape' && searchInput) {
      searchInput = ''
    }
  }

  // ─── Numeric only ───
  function sanitizeDigits(value: string): string {
    return value.replace(/\D/g, '').slice(0, 7)
  }

  function onBudgetMinInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement
    const clean = sanitizeDigits(target.value)
    if (clean !== target.value) target.value = clean
    budgetMin = clean
  }

  function onBudgetMaxInput(e: Event) {
    const target = e.currentTarget as HTMLInputElement
    const clean = sanitizeDigits(target.value)
    if (clean !== target.value) target.value = clean
    budgetMax = clean
  }

  function onBudgetKeyDown(e: KeyboardEvent) {
    const allowed = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ]
    if (allowed.includes(e.key)) {
      if (e.key === 'Enter') {
        e.preventDefault()
        applyFilters()
      }
      return
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())
    ) {
      return
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault()
    }
  }

  // ─── Selectors ───
  function selectCategory(slug: string) {
    category = slug
    categorySearch = ''
  }

  function selectCity(name: string) {
    city = name
    citySearch = ''
  }

  function selectType(value: string) {
    type = value
  }

  function selectSort(value: string) {
    sort = value
  }

  function loadMore() {
    const params = new URLSearchParams(window.location.search)
    params.set('page', String(data.page + 1))
    goto(`/jobs?${params.toString()}`, { keepFocus: true })
  }

  // ═══════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════

  onDestroy(() => {
    if (categoriesAbort) categoriesAbort.abort()
    if (citiesAbort) citiesAbort.abort()
  })
</script>

<svelte:head>
  <title>Заявки · Zunor</title>
  <meta
    name="description"
    content="Знайдіть роботу або опублікуйте заявку на Zunor"
  />
</svelte:head>

<div
  class="min-h-screen antialiased"
  style="background-color: var(--background)"
>
  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <!-- ━━━ HEADER ━━━ -->
    <header class="flex items-start justify-between gap-4 mb-6">
      <div class="min-w-0 flex-1">
        <h1
          class="text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] leading-tight"
          style="color: var(--foreground)"
        >
          {titleText}
        </h1>
        <p
          class="text-[13px] sm:text-sm mt-1 leading-snug"
          style="color: var(--muted-foreground)"
        >
          {subtitle}
        </p>
      </div>

      {#if data.isAuthenticated}
        <Button
          onclick={() => goto('/jobs/new')}
          class="h-11 px-4 sm:px-5 rounded-full font-semibold cursor-pointer shrink-0"
        >
          <Plus class="size-4 mr-2" strokeWidth={2.5} />
          <span class="hidden sm:inline">Опублікувати заявку</span>
          <span class="sm:hidden">Заявка</span>
        </Button>
      {/if}
    </header>

    <!-- ━━━ CLIENT CTA BANNER ━━━ -->
    {#if isClient}
      <Card class="flex items-center gap-4 p-5 mb-5 rounded-3xl shadow-sm">
        <div
          class="size-11 rounded-full flex items-center justify-center shrink-0"
          style="background-color: color-mix(in srgb, #FF9500 12%, transparent)"
        >
          <Sparkles class="size-5" style="color: #FF9500" strokeWidth={2} />
        </div>
        <div class="flex-1 min-w-0">
          <p
            class="text-[15px] font-semibold leading-snug text-center"
            style="color: var(--foreground)"
          >
            Швидкий шлях до результату
          </p>
          <p
            class="text-[13px] mt-0.5 leading-snug"
            style="color: var(--muted-foreground)"
          >
            Опишіть задачу — фрілансери надішлють відгуки  
          </p>
        </div>
        <Button
          onclick={() => goto('/jobs/new')}
          class="hidden sm:inline-flex h-10 px-5 rounded-full font-semibold cursor-pointer shrink-0"
        >
          <Plus class="size-4 mr-1.5" strokeWidth={2.5} />
          Створити
        </Button>
      </Card>
    {/if}

    <!-- ━━━ FILTERS ━━━ -->
    {#if showFilters}
      <!-- Search bar -->
      <div class="relative mb-3">
        <Search
          class="size-[18px] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10"
          style="color: var(--muted-foreground)"
        />
        <Input
          type="text"
          bind:value={searchInput}
          onkeydown={onSearchKey}
          placeholder="Пошук заявок (Enter — застосувати)"
          maxlength={100}
          autocomplete="off"
          spellcheck="false"
          class="h-11 pl-11 pr-10 rounded-2xl text-[15px]"
        />
        {#if searchInput}
          <button
            type="button"
            onclick={() => (searchInput = '')}
            class="absolute right-3 top-1/2 -translate-y-1/2 size-6 rounded-full flex items-center justify-center cursor-pointer transition-colors hover:opacity-80 z-10"
            style="background-color: color-mix(in srgb, var(--foreground) 8%, transparent)"
            aria-label="Очистити пошук"
          >
            <X class="size-3.5" style="color: var(--muted-foreground)" />
          </button>
        {/if}
      </div>

      <!-- Filter pills row -->
      <div
        class="flex gap-2 mb-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none"
      >
        <!-- ─── Category ─── -->
        <DropdownMenu.Root onOpenChange={onCategoryDropdownChange}>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                class="ios-pill"
                class:ios-pill-active={!!category}
              >
                <span class="truncate max-w-[140px]">{categoryLabel}</span>
                <ChevronDown class="size-3.5 shrink-0 opacity-60" />
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            class="w-72 rounded-2xl p-0 overflow-hidden"
            sideOffset={6}
          >
            {#if categoriesLoading}
              <div class="flex items-center justify-center py-8">
                <LoaderCircle
                  class="size-4 animate-spin"
                  style="color: var(--muted-foreground)"
                />
              </div>
            {:else if categoriesError}
              <div class="flex flex-col items-center gap-2 py-8 px-4">
                <AlertCircle class="size-5" style="color: var(--destructive)" />
                <p
                  class="text-xs text-center"
                  style="color: var(--muted-foreground)"
                >
                  Не вдалось завантажити
                </p>
                <button
                  type="button"
                  onclick={ensureCategoriesLoaded}
                  class="text-xs font-medium cursor-pointer hover:underline"
                  style="color: var(--primary)"
                >
                  Спробувати ще раз
                </button>
              </div>
            {:else if categories.length === 0}
              <p
                class="text-xs text-center py-6"
                style="color: var(--muted-foreground)"
              >
                Немає категорій
              </p>
            {:else}
              <div class="dropdown-search-wrap">
                <Search class="dropdown-search-icon size-3.5" />
                <input
                  type="text"
                  bind:value={categorySearch}
                  placeholder="Пошук категорії"
                  autocomplete="off"
                  spellcheck="false"
                  class="dropdown-search-input"
                  onkeydown={(e) => e.stopPropagation()}
                />
              </div>

              <div class="max-h-72 overflow-y-auto py-1">
                {#if category && !categorySearch}
                  <DropdownMenu.Item
                    class="cursor-pointer text-sm rounded-lg mx-1"
                    onclick={() => selectCategory('')}
                  >
                    <span style="color: var(--muted-foreground)"
                      >Усі категорії</span
                    >
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                {/if}

                {#if filteredCategories.length === 0}
                  <p
                    class="text-xs text-center py-4"
                    style="color: var(--muted-foreground)"
                  >
                    Нічого не знайдено
                  </p>
                {:else}
                  {#each filteredCategories as cat, i (cat.slug || cat.id || i)}
                    <DropdownMenu.Item
                      class="cursor-pointer text-sm rounded-lg mx-1 flex items-center justify-between"
                      onclick={() => selectCategory(cat.slug)}
                    >
                      <span class="truncate">{cat.name}</span>
                      {#if category === cat.slug}
                        <Check
                          class="size-3.5 shrink-0"
                          style="color: var(--primary)"
                        />
                      {/if}
                    </DropdownMenu.Item>
                  {/each}
                {/if}
              </div>
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <!-- ─── City ─── -->
        <DropdownMenu.Root onOpenChange={onCityDropdownChange}>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                class="ios-pill"
                class:ios-pill-active={!!city}
              >
                <span class="truncate max-w-[120px]">{city || 'Місто'}</span>
                <ChevronDown class="size-3.5 shrink-0 opacity-60" />
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content
            class="w-72 rounded-2xl p-0 overflow-hidden"
            sideOffset={6}
          >
            {#if citiesLoading}
              <div class="flex items-center justify-center py-8">
                <LoaderCircle
                  class="size-4 animate-spin"
                  style="color: var(--muted-foreground)"
                />
              </div>
            {:else if citiesError}
              <div class="flex flex-col items-center gap-2 py-8 px-4">
                <AlertCircle class="size-5" style="color: var(--destructive)" />
                <p
                  class="text-xs text-center"
                  style="color: var(--muted-foreground)"
                >
                  Не вдалось завантажити
                </p>
                <button
                  type="button"
                  onclick={ensureCitiesLoaded}
                  class="text-xs font-medium cursor-pointer hover:underline"
                  style="color: var(--primary)"
                >
                  Спробувати ще раз
                </button>
              </div>
            {:else if cities.length === 0}
              <p
                class="text-xs text-center py-6"
                style="color: var(--muted-foreground)"
              >
                Немає міст
              </p>
            {:else}
              <div class="dropdown-search-wrap">
                <Search class="dropdown-search-icon size-3.5" />
                <input
                  type="text"
                  bind:value={citySearch}
                  placeholder="Пошук міста"
                  autocomplete="off"
                  spellcheck="false"
                  class="dropdown-search-input"
                  onkeydown={(e) => e.stopPropagation()}
                />
              </div>

              <div class="max-h-72 overflow-y-auto py-1">
                {#if city && !citySearch}
                  <DropdownMenu.Item
                    class="cursor-pointer text-sm rounded-lg mx-1"
                    onclick={() => selectCity('')}
                  >
                    <span style="color: var(--muted-foreground)">Усі міста</span
                    >
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator />
                {/if}

                {#if filteredCities.length === 0}
                  <p
                    class="text-xs text-center py-4"
                    style="color: var(--muted-foreground)"
                  >
                    Нічого не знайдено
                  </p>
                {:else}
                  {#each filteredCities as c, i (c.name || c.id || i)}
                    <DropdownMenu.Item
                      class="cursor-pointer text-sm rounded-lg mx-1 flex items-center justify-between"
                      onclick={() => selectCity(c.name)}
                    >
                      <span class="truncate">{c.name}</span>
                      {#if city === c.name}
                        <Check
                          class="size-3.5 shrink-0"
                          style="color: var(--primary)"
                        />
                      {/if}
                    </DropdownMenu.Item>
                  {/each}
                {/if}
              </div>
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <!-- ─── Type ─── -->
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                class="ios-pill"
                class:ios-pill-active={type !== 'ANY'}
              >
                <span class="truncate">{typeLabel}</span>
                <ChevronDown class="size-3.5 shrink-0 opacity-60" />
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-48 rounded-2xl">
            {#each TYPE_OPTIONS as opt (opt.value)}
              <DropdownMenu.Item
                class="cursor-pointer text-sm rounded-lg flex items-center justify-between"
                onclick={() => selectType(opt.value)}
              >
                <span>{opt.label}</span>
                {#if type === opt.value}
                  <Check class="size-3.5" style="color: var(--primary)" />
                {/if}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>

        <!-- ─── Sort ─── -->
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <button
                {...props}
                type="button"
                class="ios-pill"
                class:ios-pill-active={sort !== 'recent'}
              >
                <SlidersHorizontal class="size-3.5 opacity-60" />
                <span class="truncate">{sortLabel}</span>
                <ChevronDown class="size-3.5 shrink-0 opacity-60" />
              </button>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content class="w-48 rounded-2xl">
            {#each SORT_OPTIONS as opt (opt.value)}
              <DropdownMenu.Item
                class="cursor-pointer text-sm rounded-lg flex items-center justify-between"
                onclick={() => selectSort(opt.value)}
              >
                <span>{opt.label}</span>
                {#if sort === opt.value}
                  <Check class="size-3.5" style="color: var(--primary)" />
                {/if}
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>

      <!-- Budget inputs -->
      <div class="grid grid-cols-2 gap-2 mb-3">
        <Input
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          value={budgetMin}
          oninput={onBudgetMinInput}
          onkeydown={onBudgetKeyDown}
          placeholder="Бюджет від, ₴"
          maxlength={7}
          autocomplete="off"
          class="h-11 rounded-2xl text-[14px] tabular-nums"
        />
        <Input
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          value={budgetMax}
          oninput={onBudgetMaxInput}
          onkeydown={onBudgetKeyDown}
          placeholder="Бюджет до, ₴"
          maxlength={7}
          autocomplete="off"
          class="h-11 rounded-2xl text-[14px] tabular-nums"
        />
      </div>

      <!-- Apply / Cancel -->
      {#if hasUnappliedChanges}
        <div
          in:fade={{ duration: 150 }}
          class="flex items-center gap-2 mb-4 flex-wrap"
        >
          <Button
            onclick={applyFilters}
            class="h-10 px-5 rounded-full font-semibold cursor-pointer"
          >
            Застосувати фільтри
          </Button>
          <button
            type="button"
            onclick={resetDrafts}
            class="text-[13px] cursor-pointer hover:underline px-2"
            style="color: var(--muted-foreground)"
          >
            Скасувати
          </button>
        </div>
      {/if}

      <!-- Active filters / counter -->
      {#if hasAppliedFilters}
        <div
          in:fade={{ duration: 150 }}
          class="flex items-center justify-between mb-5 flex-wrap gap-2"
        >
          <div
            class="ios-island flex items-center gap-2.5 h-9 pl-4 pr-1.5 rounded-full"
          >
            <span class="text-[13px] font-medium tabular-nums">
              {data.total}
              {totalLabel}
            </span>
            <button
              type="button"
              onclick={clearAll}
              class="ios-island-btn inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[12px] font-medium cursor-pointer"
            >
              <X class="size-3" strokeWidth={2.5} />
              Очистити
            </button>
          </div>
          {#if activeFiltersCount > 0}
            <span
              class="text-[12px] tabular-nums"
              style="color: var(--muted-foreground)"
            >
              {activeFiltersCount}
              {activeFiltersCount === 1 ? 'фільтр' : 'фільтри'}
            </span>
          {/if}
        </div>
      {:else}
        <div class="flex items-center justify-between mb-5">
          <span
            class="text-[12px] tabular-nums"
            style="color: var(--muted-foreground)"
          >
            Знайдено: {data.total}
          </span>
        </div>
      {/if}
    {/if}

    <!-- ━━━ RESULTS ━━━ -->
    {#if data.items.length === 0}
      <Card class="py-16 px-6 text-center rounded-3xl shadow-sm">
        <div
          class="size-14 rounded-full mx-auto mb-4 flex items-center justify-center"
          style="background-color: color-mix(in srgb, var(--foreground) 6%, transparent)"
        >
          <Briefcase
            class="size-6"
            style="color: var(--muted-foreground)"
            strokeWidth={1.75}
          />
        </div>
        <p
          class="text-[16px] font-semibold mb-1"
          style="color: var(--foreground)"
        >
          {isClient
            ? 'Поки немає опублікованих заявок'
            : 'Немає заявок під ваш запит'}
        </p>
        <p
          class="text-[13px] max-w-sm mx-auto leading-relaxed"
          style="color: var(--muted-foreground)"
        >
          {isClient
            ? 'Опублікуйте першу — фрілансери чекають'
            : 'Спробуйте змінити фільтри або повернутись пізніше'}
        </p>
        {#if hasAppliedFilters}
          <button
            type="button"
            onclick={clearAll}
            class="mt-4 text-[13px] font-medium cursor-pointer hover:underline"
            style="color: var(--primary)"
          >
            Скинути фільтри
          </button>
        {/if}
      </Card>
    {:else}
      <div class="space-y-3">
        {#each data.items as job (job.id)}
          <JobCard {job} />
        {/each}
      </div>

      {#if data.hasMore}
        <div class="flex justify-center mt-8">
          <Button
            variant="outline"
            onclick={loadMore}
            class="h-11 px-6 rounded-full font-semibold cursor-pointer"
          >
            Показати ще
          </Button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  :global(.ios-pill) {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 18px;
    background-color: color-mix(in srgb, var(--foreground) 6%, transparent);
    color: var(--foreground);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color 120ms ease,
      transform 120ms ease;
    flex-shrink: 0;
    border: none;
  }
  :global(.ios-pill:hover) {
    background-color: color-mix(in srgb, var(--foreground) 10%, transparent);
  }
  :global(.ios-pill:active) {
    transform: scale(0.97);
  }
  :global(.ios-pill-active) {
    background-color: var(--foreground) !important;
    color: var(--background) !important;
  }

  :global(.ios-island) {
    background-color: #111111;
    color: #ffffff;
  }
  :global(.ios-island-btn) {
    background-color: rgba(255, 255, 255, 0.12);
    color: #ffffff;
    transition: background-color 120ms ease;
  }
  :global(.ios-island-btn:hover) {
    background-color: rgba(255, 255, 255, 0.2);
  }

  :global(.dropdown-search-wrap) {
    position: relative;
    padding: 8px;
    border-bottom: 1px solid var(--border);
  }
  :global(.dropdown-search-icon) {
    position: absolute;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted-foreground);
    pointer-events: none;
  }
  :global(.dropdown-search-input) {
    width: 100%;
    height: 36px;
    padding: 0 12px 0 32px;
    border-radius: 12px;
    background-color: color-mix(in srgb, var(--foreground) 5%, transparent);
    color: var(--foreground);
    font-size: 13px;
    border: none;
    outline: none;
  }
  :global(.dropdown-search-input::placeholder) {
    color: var(--muted-foreground);
  }
  :global(.dropdown-search-input:focus) {
    background-color: color-mix(in srgb, var(--foreground) 8%, transparent);
  }

  :global(.scrollbar-none) {
    scrollbar-width: none;
  }
  :global(.scrollbar-none::-webkit-scrollbar) {
    display: none;
  }
</style>
