<script lang="ts">
  import {
    ArrowRight,
    Search,
    X,
    SlidersHorizontal,
    Check,
    ChevronsUpDown,
    Plus,
    RotateCcw,
    LoaderCircle,
  } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { fade, scale, fly } from 'svelte/transition'
  import { backOut } from 'svelte/easing'

  // UI Components (shadcn)
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Skeleton } from '$lib/components/ui/skeleton'
  import * as Command from '$lib/components/ui/command'
  import * as Popover from '$lib/components/ui/popover'

  // --- ТИПЫ ---
  interface Item {
    value: string
    label: string
  }
  interface SubItem {
    slug: string
    name: string
  }
  interface Category {
    slug: string
    name: string
    icon?: string | null
    description?: string | null
    subs: SubItem[]
  }
  interface CityFromApi {
    slug: string
    name: string
    region: string | null
    isCapital: boolean
  }

  // --- СТАТИЧНЫЕ ДАННЫЕ ---
  const types: Item[] = [
    { value: 'all', label: 'Всі типи' },
    { value: 'online', label: 'Онлайн' },
    { value: 'offline', label: 'Офлайн' },
    { value: 'visit', label: 'Виїзд до клієнта' },
  ]

  // --- СОСТОЯНИЕ (Runes) ---
  let categories = $state<Category[]>([])
  // Дефолтное значение пока города грузятся — чтобы Popover-кнопка не показала "undefined"
  let cities = $state<Item[]>([{ value: 'all', label: 'Вся Україна' }])

  let loaded = $state(false)
  let citiesLoaded = $state(false)
  let loadError = $state<string | null>(null)

  let search = $state('')
  let city = $state('all')
  let type = $state('all')

  let draftSearch = $state('')
  let draftCity = $state('all')
  let draftType = $state('all')

  let dialogOpen = $state(false)
  let cityPopoverOpen = $state(false)

  // --- ЗАГРУЗКА ДАННЫХ ИЗ API ---
  async function loadData() {
    loaded = false
    citiesLoaded = false
    loadError = null

    try {
      const [catsRes, citiesRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/cities'),
      ])

      if (!catsRes.ok) throw new Error(`categories HTTP ${catsRes.status}`)
      if (!citiesRes.ok) throw new Error(`cities HTTP ${citiesRes.status}`)

      const catsData = await catsRes.json()
      const citiesData = await citiesRes.json()

      categories = catsData.categories ?? []

      // Маппимо City з БД у формат, який чекає UI ({ value, label })
      cities = (citiesData.cities ?? []).map((c: CityFromApi) => ({
        value: c.slug,
        label: c.name,
      }))
    } catch (err) {
      console.error('Failed to load data:', err)
      loadError = 'Не вдалося завантажити дані'
      categories = []
    } finally {
      loaded = true
      citiesLoaded = true
    }
  }

  onMount(() => {
    loadData()
  })

  // --- ЛОГИКА ---
  const activeCount = $derived(
    (search.trim() ? 1 : 0) +
      (city !== 'all' ? 1 : 0) +
      (type !== 'all' ? 1 : 0),
  )

  const filtered = $derived(
    (() => {
      const q = search.trim().toLowerCase()
      if (!q) return categories
      return categories
        .map((cat) => {
          const matchName = cat.name.toLowerCase().includes(q)
          const matchSubs = cat.subs.filter((s) =>
            s.name.toLowerCase().includes(q),
          )
          if (!matchName && !matchSubs.length) return null
          return {
            slug: cat.slug,
            name: cat.name,
            icon: cat.icon,
            description: cat.description,
            subs: matchName ? cat.subs : matchSubs,
          }
        })
        .filter(Boolean) as Category[]
    })(),
  )

  // Лейбл для кнопки выбора города — реагирует на загрузку
  const selectedCityLabel = $derived(
    cities.find((c) => c.value === draftCity)?.label ?? 'Вся Україна',
  )

  function openFilters() {
    draftSearch = search
    draftCity = city
    draftType = type
    dialogOpen = true
  }

  function applyFilters() {
    search = draftSearch
    city = draftCity
    type = draftType
    dialogOpen = false
  }

  function resetDrafts() {
    draftSearch = ''
    draftCity = 'all'
    draftType = 'all'
  }

  function resetAll() {
    search = ''
    city = 'all'
    type = 'all'
    resetDrafts()
    dialogOpen = false
  }
</script>

<div class="min-h-screen relative overflow-hidden bg-background">
  <!-- Клеточный фон -->
  <div
    class="absolute inset-0 pointer-events-none opacity-[0.03]"
    style="background-image: linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px); background-size: 40px 40px;"
  ></div>

  <div class="max-w-6xl mx-auto px-6 py-12 relative z-10">
    <!-- Header -->
    <header
      class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
    >
      <div in:fly={{ y: 20, duration: 500, easing: backOut }}>
        <h1 class="text-4xl md:text-5xl font-bold tracking-tighter mb-2">
          Всі послуги
        </h1>
        <p class="text-sm font-medium opacity-40">
          {#if !loaded}
            Завантаження…
          {:else}
            Знайдено {filtered.length} напрямків
          {/if}
        </p>
      </div>

      <Button
        variant="outline"
        onclick={openFilters}
        class="rounded-full gap-2.5 border-muted-foreground/20 hover:bg-secondary transition-all active:scale-95"
      >
        <SlidersHorizontal size={14} class="opacity-60" />
        <span class="text-sm font-semibold">Фільтри</span>
        {#if activeCount > 0}
          <span
            class="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold"
            in:scale
          >
            {activeCount}
          </span>
        {/if}
      </Button>
    </header>

    <!-- Сетка -->
    {#if !loaded}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each Array(6) as _}
          <div
            class="h-[280px] p-6 rounded-2xl border border-border bg-card/50"
          >
            <Skeleton class="h-6 w-2/3 mb-6" />
            <div class="space-y-4">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-3/4" />
              <Skeleton class="h-4 w-5/6" />
            </div>
          </div>
        {/each}
      </div>
    {:else if loadError}
      <div class="py-32 text-center" in:fade>
        <X size={48} class="mx-auto mb-4 opacity-20 text-destructive" />
        <h3 class="text-lg font-bold text-foreground">{loadError}</h3>
        <button
          onclick={loadData}
          class="text-sm text-primary font-bold mt-2 cursor-pointer hover:underline"
        >
          Спробувати ще раз
        </button>
      </div>
    {:else if filtered.length === 0}
      <div class="py-32 text-center" in:fade>
        <Search size={48} class="mx-auto mb-4 opacity-10" />
        <h3 class="text-lg font-bold text-foreground">Нічого не знайдено</h3>
        <button
          onclick={resetAll}
          class="text-sm text-primary font-bold mt-2 cursor-pointer hover:underline"
        >
          Скинути пошук
        </button>
      </div>
    {:else}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each filtered as cat, i (cat.slug)}
          <div
            in:fly={{ y: 20, duration: 400, delay: i * 30 }}
            class="group flex flex-col h-full p-6 rounded-2xl border border-border bg-card transition-all hover:border-foreground/20 shadow-sm"
          >
            <a
              href="/services/{cat.slug}"
              class="flex items-start justify-between mb-5"
            >
              <h2 class="text-lg font-extrabold leading-tight text-foreground">
                {cat.name}
              </h2>
              <ArrowRight
                size={18}
                class="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary"
              />
            </a>

            <ul class="flex-1 space-y-2">
              {#each cat.subs.slice(0, 5) as sub (sub.slug)}
                <li>
                  <a
                    href="/services/{cat.slug}?sub={sub.slug}"
                    class="text-sm font-medium opacity-50 hover:opacity-100 hover:text-primary transition-all block text-foreground"
                  >
                    {sub.name}
                  </a>
                </li>
              {/each}
            </ul>

            {#if cat.subs.length > 5}
              <a
                href="/services/{cat.slug}"
                class="mt-4 pt-4 border-t border-border flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity text-foreground"
              >
                <Plus size={12} /> Ще {cat.subs.length - 5} категорій
              </a>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content
    class="max-w-[380px] p-0 border-none bg-card shadow-2xl rounded-[32px] overflow-hidden"
  >
    <div class="px-6 pt-6 pb-2 flex items-center justify-between">
      <Dialog.Title class="text-xl font-bold tracking-tight"
        >Налаштування</Dialog.Title
      >
      <button
        onclick={() => (dialogOpen = false)}
        class="p-2 rounded-full hover:bg-muted opacity-40 hover:opacity-100 transition-all"
      >
        <X size={20} />
      </button>
    </div>

    <div class="p-6 space-y-7">
      <!-- Поиск -->
      <div class="space-y-2.5">
        <label
          class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
          >Послуга</label
        >
        <div class="relative group">
          <Search
            class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30 group-focus-within:opacity-100 group-focus-within:text-primary transition-all"
          />
          <Input
            bind:value={draftSearch}
            placeholder="Наприклад: Сантехнік"
            class="h-11 pl-10 bg-muted/40 border-transparent focus:border-primary/30 focus:bg-background rounded-2xl transition-all"
          />
        </div>
      </div>

      <!-- Город -->
      <div class="space-y-2.5">
        <label
          class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
          >Локація</label
        >
        <Popover.Root bind:open={cityPopoverOpen}>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="outline"
                disabled={!citiesLoaded}
                class="w-full h-11 justify-between bg-muted/40 border-transparent rounded-2xl px-4 hover:bg-muted/60 transition-all font-medium disabled:opacity-60"
              >
                <span class={draftCity === 'all' ? 'opacity-40' : ''}>
                  {selectedCityLabel}
                </span>
                {#if !citiesLoaded}
                  <LoaderCircle class="w-4 h-4 opacity-50 animate-spin" />
                {:else}
                  <ChevronsUpDown class="w-4 h-4 opacity-30" />
                {/if}
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content
            class="w-[332px] p-1 bg-popover border-border rounded-2xl shadow-xl"
            align="start"
          >
            <Command.Root>
              <Command.Input placeholder="Шукати місто..." />
              <Command.List class="max-h-60">
                {#if !citiesLoaded}
                  <div
                    class="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
                    in:fade={{ duration: 150 }}
                  >
                    <LoaderCircle class="w-4 h-4 animate-spin" />
                    <span>Завантаження міст…</span>
                  </div>
                {:else}
                  <Command.Empty>Не знайдено</Command.Empty>
                  <Command.Group>
                    {#each cities as c (c.value)}
                      <Command.Item
                        value={c.label}
                        onSelect={() => {
                          draftCity = c.value
                          cityPopoverOpen = false
                        }}
                        class="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer aria-selected:bg-accent transition-colors text-foreground"
                      >
                        <div class="w-4 flex items-center justify-center">
                          {#if draftCity === c.value}
                            <span in:scale={{ duration: 150, start: 0.5 }}
                              ><Check class="w-4 h-4 text-primary" /></span
                            >
                          {/if}
                        </div>
                        <span class="text-sm font-medium">{c.label}</span>
                      </Command.Item>
                    {/each}
                  </Command.Group>
                {/if}
              </Command.List>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>

      <!-- Формат -->
      <div class="space-y-2.5">
        <label
          class="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1"
          >Формат</label
        >
        <div class="flex flex-wrap gap-2">
          {#each types as t}
            <button
              onclick={() => (draftType = t.value)}
              class="px-4 py-1.5 rounded-full text-xs font-bold transition-all border shrink-0 {draftType ===
              t.value
                ? 'active-chip'
                : 'inactive-chip'}"
            >
              {t.label}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div
      class="p-5 bg-muted/20 border-t border-border/50 flex items-center gap-4"
    >
      <button
        onclick={resetDrafts}
        class="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tight opacity-30 hover:opacity-100 transition-opacity"
      >
        <RotateCcw size={12} /> Скинути
      </button>
      <Button
        onclick={applyFilters}
        class="flex-1 h-11 rounded-2xl bg-foreground text-background font-bold hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Застосувати
      </Button>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .active-chip {
    background-color: var(--foreground);
    color: var(--background);
    border-color: var(--foreground);
  }
  .inactive-chip {
    background-color: transparent;
    color: var(--foreground);
    border-color: var(--border);
    opacity: 0.5;
  }
  .inactive-chip:hover {
    opacity: 1;
    background-color: var(--muted);
  }

  :global([data-dialog-close]) {
    display: none !important;
  }
</style>
