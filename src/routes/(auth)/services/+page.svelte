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
  interface Category {
    name: string
    subs: string[]
  }

  // --- ДАННЫЕ ---
  const rawCategories: Category[] = [
    {
      name: 'Домашній майстер',
      subs: [
        'Сантехнік',
        'Електрик',
        'Чоловік на годину',
        'Столяр',
        'Слюсар',
        'Монтажник',
        'Дезінфектор',
      ],
    },
    {
      name: 'Ремонт техніки',
      subs: [
        'Ремонт побутової техніки',
        "Комп'ютерна допомога",
        'Ремонт цифрової техніки',
        'Ремонт телефонів',
        'Ремонт великої техніки',
      ],
    },
    {
      name: 'Оздоблювальні роботи',
      subs: [
        'Ремонт квартир',
        'Укладання плитки',
        'Штукатурні роботи',
        'Утеплення',
        'Монтаж опалення',
      ],
    },
    {
      name: 'Будівельні роботи',
      subs: [
        'Різноробочі',
        'Зварювальні роботи',
        'Токарні роботи',
        'Металообробка',
        'Тесляр',
      ],
    },
    {
      name: 'Меблеві роботи',
      subs: [
        'Виготовлення меблів',
        'Ремонт меблів',
        'Збірка меблів',
        'Реставрація',
        'Перетяжка',
      ],
    },
    {
      name: 'Клінінгові послуги',
      subs: [
        'Прибирання квартир',
        'Генеральне прибирання',
        'Прибирання після ремонту',
        'Хімчистка',
        'Прибирання будинків',
      ],
    },
    {
      name: 'Енергозбереження',
      subs: [
        'Перепаковка акумуляторів',
        'Ремонт повербанків',
        'Ремонт UPS',
        'Підключення генераторів',
      ],
    },
  ]

  const categories = rawCategories.map((c) => ({
    ...c,
    subs: [...new Set(c.subs)],
  }))

  const cities: Item[] = [
    { value: 'all', label: 'Вся Україна' },
    { value: 'kyiv', label: 'Київ' },
    { value: 'kharkiv', label: 'Харків' },
    { value: 'odesa', label: 'Одеса' },
    { value: 'dnipro', label: 'Дніпро' },
    { value: 'lviv', label: 'Львів' },
  ]

  const types: Item[] = [
    { value: 'all', label: 'Всі типи' },
    { value: 'online', label: 'Онлайн' },
    { value: 'offline', label: 'Офлайн' },
    { value: 'visit', label: 'Виїзд до клієнта' },
  ]

  // --- СОСТОЯНИЕ (Runes) ---
  let search = $state('')
  let city = $state('all')
  let type = $state('all')

  let draftSearch = $state('')
  let draftCity = $state('all')
  let draftType = $state('all')

  let dialogOpen = $state(false)
  let loaded = $state(false)
  let cityPopoverOpen = $state(false)

  onMount(() => {
    setTimeout(() => (loaded = true), 400)
  })

  // --- ЛОГИКА ---
  const activeCount = $derived(
    (search.trim() ? 1 : 0) +
      (city !== 'all' ? 1 : 0) +
      (type !== 'all' ? 1 : 0),
  )

  // Исправлено название переменной для шаблона
  const filtered = $derived(
    (() => {
      const q = search.trim().toLowerCase()
      if (!q) return categories
      return categories
        .map((cat) => {
          const matchName = cat.name.toLowerCase().includes(q)
          const matchSubs = cat.subs.filter((s) => s.toLowerCase().includes(q))
          if (!matchName && !matchSubs.length) return null
          return { name: cat.name, subs: matchName ? cat.subs : matchSubs }
        })
        .filter(Boolean) as Category[]
    })(),
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
          Знайдено {filtered.length} напрямків
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
        {#each filtered as cat, i (cat.name)}
          <div
            in:fly={{ y: 20, duration: 400, delay: i * 30 }}
            class="group flex flex-col h-full p-6 rounded-2xl border border-border bg-card transition-all hover:border-foreground/20 shadow-sm"
          >
            <a
              href="/gigs?category={encodeURIComponent(cat.name)}"
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
              {#each cat.subs.slice(0, 5) as sub}
                <li>
                  <a
                    href="/gigs?category={encodeURIComponent(
                      cat.name,
                    )}&sub={encodeURIComponent(sub)}"
                    class="text-sm font-medium opacity-50 hover:opacity-100 hover:text-primary transition-all block text-foreground"
                  >
                    {sub}
                  </a>
                </li>
              {/each}
            </ul>

            {#if cat.subs.length > 5}
              <a
                href="/gigs?category={encodeURIComponent(cat.name)}"
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
                class="w-full h-11 justify-between bg-muted/40 border-transparent rounded-2xl px-4 hover:bg-muted/60 transition-all font-medium"
              >
                <span class={draftCity === 'all' ? 'opacity-40' : ''}>
                  {cities.find((c) => c.value === draftCity)?.label}
                </span>
                <ChevronsUpDown class="w-4 h-4 opacity-30" />
              </Button>
            {/snippet}
          </Popover.Trigger>
          <Popover.Content
            class="w-[332px] p-1 bg-popover border-border rounded-2xl shadow-xl"
            align="start"
          >
            <Command.Root>
              <Command.Input placeholder="Шукати місто..." />
              <Command.List class="max-h-40">
                <Command.Empty>Не знайдено</Command.Empty>
                <Command.Group>
                  {#each cities as c}
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
