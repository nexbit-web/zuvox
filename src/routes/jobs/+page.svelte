<!-- src/routes/jobs/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    Search,
    Plus,
    SlidersHorizontal,
    ChevronDown,
    X,
    Briefcase,
  } from 'lucide-svelte'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import JobCard from '$lib/components/jobs/job-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // Local state
  let searchInput = $state(data.filters.q)
  let category = $state(data.filters.category)
  let type = $state(data.filters.type || 'ANY')
  let city = $state(data.filters.city)
  let budgetMin = $state(data.filters.budgetMin)
  let budgetMax = $state(data.filters.budgetMax)
  let sort = $state(data.filters.sort || 'recent')

  function applyFilters() {
    const params = new URLSearchParams()
    if (searchInput) params.set('q', searchInput)
    if (category) params.set('category', category)
    if (type && type !== 'ANY') params.set('type', type)
    if (city) params.set('city', city)
    if (budgetMin) params.set('budgetMin', budgetMin)
    if (budgetMax) params.set('budgetMax', budgetMax)
    if (sort && sort !== 'recent') params.set('sort', sort)
    const qs = params.toString()
    goto(qs ? `/jobs?${qs}` : '/jobs')
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
    if (e.key === 'Enter') applyFilters()
  }

  const hasFilters = $derived(
    !!(
      searchInput ||
      category ||
      (type && type !== 'ANY') ||
      city ||
      budgetMin ||
      budgetMax
    ),
  )

  const SORT_OPTIONS = [
    { value: 'recent', label: 'Свіжі' },
    { value: 'budget-desc', label: 'Бюджет ↓' },
    { value: 'budget-asc', label: 'Бюджет ↑' },
    { value: 'popular', label: 'Популярні' },
  ]

  const TYPE_OPTIONS = [
    { value: 'ANY', label: 'Будь-який' },
    { value: 'ONLINE', label: 'Онлайн' },
    { value: 'OFFLINE', label: 'Офлайн' },
    { value: 'VISIT', label: 'Виїзд' },
  ]

  const CATEGORY_OPTIONS = [
    'Розробка',
    'Дизайн',
    'Маркетинг',
    'Тексти',
    'Відео',
    'Аудіо',
    'Бізнес',
    'Адміністрування',
    'Послуги',
    'Інше',
  ]

  const CITY_OPTIONS = [
    'Київ',
    'Львів',
    'Одеса',
    'Харків',
    'Дніпро',
    'Запоріжжя',
    'Вінниця',
    'Чернівці',
    'Івано-Франківськ',
    'Тернопіль',
  ]

  const sortLabel = $derived(
    SORT_OPTIONS.find((o) => o.value === sort)?.label ?? 'Свіжі',
  )
  const typeLabel = $derived(
    TYPE_OPTIONS.find((o) => o.value === type)?.label ?? 'Будь-який',
  )
</script>

<svelte:head>
  <title>Заявки клієнтів · Zunor</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
  <!-- ━━━ HEADER ━━━ -->
  <div class="flex items-start justify-between gap-4 mb-5">
    <div>
      <h1
        class="text-2xl sm:text-[28px] font-bold tracking-tight"
        style="color: var(--foreground)"
      >
        Заявки клієнтів
      </h1>
      <p
        class="text-sm mt-1"
        style="color: var(--muted-foreground)"
      >
        Знайдіть роботу, яка вам підходить
      </p>
    </div>
    {#if data.isAuthenticated}
      <button
        type="button"
        onclick={() => goto('/jobs/new')}
        class="inline-flex items-center gap-2 h-10 px-4 sm:px-5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90 shrink-0"
        style="background-color: var(--primary); color: var(--primary-foreground)"
      >
        <Plus class="size-4" />
        <span class="hidden sm:inline">Опублікувати заявку</span>
        <span class="sm:hidden">Заявка</span>
      </button>
    {/if}
  </div>

  <!-- ━━━ FILTERS CARD ━━━ -->
  <div
    class="rounded-xl p-4 mb-5"
    style="background-color: var(--card); border: 1px solid var(--border)"
  >
    <!-- Row 1: search + category + city -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
      <!-- Search -->
      <div class="relative">
        <Search
          class="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style="color: var(--muted-foreground)"
        />
        <input
          type="text"
          bind:value={searchInput}
          onkeydown={onSearchKey}
          placeholder="Пошук заявок"
          class="w-full h-11 pl-10 pr-3 rounded-lg text-sm outline-none transition-colors"
          style="background-color: var(--muted);
                 border: 1px solid transparent;
                 color: var(--foreground)"
          onfocus={(e) => {
            ;(e.currentTarget as HTMLInputElement).style.borderColor =
              'var(--ring)'
          }}
          onblur={(e) => {
            ;(e.currentTarget as HTMLInputElement).style.borderColor =
              'transparent'
          }}
        />
      </div>

      <!-- Category dropdown -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              type="button"
              class="w-full h-11 px-4 rounded-lg text-sm cursor-pointer transition-colors flex items-center justify-between gap-2"
              style="background-color: var(--muted);
                     color: {category ? 'var(--foreground)' : 'var(--muted-foreground)'}"
            >
              <span class="truncate">{category || 'Категорія'}</span>
              <ChevronDown
                class="size-4 shrink-0"
                style="color: var(--muted-foreground)"
              />
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
          {#if category}
            <DropdownMenu.Item
              class="cursor-pointer text-sm"
              onclick={() => {
                category = ''
                applyFilters()
              }}
            >
              <span style="color: var(--muted-foreground)">Усі категорії</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
          {/if}
          {#each CATEGORY_OPTIONS as cat}
            <DropdownMenu.Item
              class="cursor-pointer text-sm"
              onclick={() => {
                category = cat
                applyFilters()
              }}
            >
              {cat}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <!-- City dropdown -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              type="button"
              class="w-full h-11 px-4 rounded-lg text-sm cursor-pointer transition-colors flex items-center justify-between gap-2"
              style="background-color: var(--muted);
                     color: {city ? 'var(--foreground)' : 'var(--muted-foreground)'}"
            >
              <span class="truncate">{city || 'Місто'}</span>
              <ChevronDown
                class="size-4 shrink-0"
                style="color: var(--muted-foreground)"
              />
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-[var(--radix-dropdown-menu-trigger-width)] max-h-72 overflow-y-auto">
          {#if city}
            <DropdownMenu.Item
              class="cursor-pointer text-sm"
              onclick={() => {
                city = ''
                applyFilters()
              }}
            >
              <span style="color: var(--muted-foreground)">Усі міста</span>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
          {/if}
          {#each CITY_OPTIONS as c}
            <DropdownMenu.Item
              class="cursor-pointer text-sm"
              onclick={() => {
                city = c
                applyFilters()
              }}
            >
              {c}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Row 2: budget min/max + type + sort -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <input
        type="number"
        bind:value={budgetMin}
        onkeydown={onSearchKey}
        placeholder="Бюджет від, ₴"
        min="0"
        class="h-11 px-4 rounded-lg text-sm outline-none transition-colors"
        style="background-color: var(--muted);
               border: 1px solid transparent;
               color: var(--foreground)"
        onfocus={(e) => {
          ;(e.currentTarget as HTMLInputElement).style.borderColor =
            'var(--ring)'
        }}
        onblur={(e) => {
          ;(e.currentTarget as HTMLInputElement).style.borderColor =
            'transparent'
        }}
      />
      <input
        type="number"
        bind:value={budgetMax}
        onkeydown={onSearchKey}
        placeholder="Бюджет до, ₴"
        min="0"
        class="h-11 px-4 rounded-lg text-sm outline-none transition-colors"
        style="background-color: var(--muted);
               border: 1px solid transparent;
               color: var(--foreground)"
        onfocus={(e) => {
          ;(e.currentTarget as HTMLInputElement).style.borderColor =
            'var(--ring)'
        }}
        onblur={(e) => {
          ;(e.currentTarget as HTMLInputElement).style.borderColor =
            'transparent'
        }}
      />

      <!-- Type -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              type="button"
              class="h-11 px-4 rounded-lg text-sm cursor-pointer transition-colors flex items-center justify-between gap-2"
              style="background-color: var(--muted); color: var(--foreground)"
            >
              <span class="truncate">{typeLabel}</span>
              <ChevronDown
                class="size-4 shrink-0"
                style="color: var(--muted-foreground)"
              />
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-[var(--radix-dropdown-menu-trigger-width)]">
          {#each TYPE_OPTIONS as opt}
            <DropdownMenu.Item
              class="cursor-pointer text-sm"
              onclick={() => {
                type = opt.value
                applyFilters()
              }}
            >
              {opt.label}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <!-- Sort -->
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              type="button"
              class="h-11 px-4 rounded-lg text-sm cursor-pointer transition-colors flex items-center justify-between gap-2"
              style="background-color: var(--muted); color: var(--foreground)"
            >
              <span class="truncate">Сорт: {sortLabel}</span>
              <ChevronDown
                class="size-4 shrink-0"
                style="color: var(--muted-foreground)"
              />
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content class="w-[var(--radix-dropdown-menu-trigger-width)]">
          {#each SORT_OPTIONS as opt}
            <DropdownMenu.Item
              class="cursor-pointer text-sm"
              onclick={() => {
                sort = opt.value
                applyFilters()
              }}
            >
              {opt.label}
            </DropdownMenu.Item>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>

    <!-- Row 3: actions + counter -->
    <div class="flex items-center justify-between gap-2 mt-3">
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={applyFilters}
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium cursor-pointer transition-colors"
          style="background-color: var(--muted); color: var(--foreground)"
        >
          <SlidersHorizontal class="size-3.5" />
          Застосувати
        </button>
        {#if hasFilters}
          <button
            type="button"
            onclick={clearAll}
            class="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm cursor-pointer transition-colors"
            style="color: var(--muted-foreground)"
          >
            <X class="size-3.5" />
            Очистити
          </button>
        {/if}
      </div>
      <span class="text-xs" style="color: var(--muted-foreground)">
        Знайдено: {data.total}
      </span>
    </div>
  </div>

  <!-- ━━━ RESULTS ━━━ -->
  {#if data.items.length === 0}
    <div
      class="rounded-xl py-16 px-6 text-center"
      style="background-color: var(--card); border: 1px solid var(--border)"
    >
      <div
        class="size-12 rounded-full mx-auto mb-4 flex items-center justify-center"
        style="background-color: var(--muted)"
      >
        <Briefcase class="size-5" style="color: var(--muted-foreground)" />
      </div>
      <p
        class="text-base font-semibold mb-1"
        style="color: var(--foreground)"
      >
        Немає заявок під ваш запит
      </p>
      <p class="text-sm" style="color: var(--muted-foreground)">
        Спробуйте змінити фільтри або повернутись пізніше
      </p>
    </div>
  {:else}
    <div class="space-y-2.5">
      {#each data.items as job (job.id)}
        <JobCard {job} />
      {/each}
    </div>

    {#if data.hasMore}
      <div class="flex justify-center mt-8">
        <button
          type="button"
          onclick={() => {
            const params = new URLSearchParams(window.location.search)
            params.set('page', String(data.page + 1))
            goto(`/jobs?${params.toString()}`)
          }}
          class="h-10 px-6 rounded-full text-sm font-medium cursor-pointer transition-colors"
          style="background-color: var(--card); color: var(--foreground); border: 1px solid var(--border)"
        >
          Показати ще
        </button>
      </div>
    {/if}
  {/if}
</div>