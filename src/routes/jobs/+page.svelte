<!-- src/routes/jobs/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Search, Plus, X, Filter, Briefcase } from 'lucide-svelte'
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import * as Select from '$lib/components/ui/select'
  import JobCard from '$lib/components/jobs/job-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // Local form state — копія з data.filters
  let searchInput = $state(data.filters.q)
  let category = $state(data.filters.category)
  let type = $state(data.filters.type || 'ANY')
  let city = $state(data.filters.city)
  let budgetMin = $state(data.filters.budgetMin)
  let budgetMax = $state(data.filters.budgetMax)
  let sort = $state(data.filters.sort)

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

  function clearFilters() {
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
</script>

<svelte:head>
  <title>Заявки клієнтів · Zunor</title>
  <meta name="description" content="Каталог відкритих заявок на послуги" />
</svelte:head>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
  <!-- Header -->
  <div class="flex items-start justify-between gap-4 mb-5">
    <div>
      <h1
        class="text-2xl font-semibold tracking-tight"
        style="color: var(--foreground)"
      >
        Заявки клієнтів
      </h1>
      <p class="text-sm mt-1" style="color: var(--muted-foreground)">
        Знайдіть роботу яка вам підходить
      </p>
    </div>
    {#if data.isAuthenticated}
      <Button onclick={() => goto('/jobs/new')}>
        <Plus class="size-4 mr-1" />
        Опублікувати заявку
      </Button>
    {/if}
  </div>

  <!-- Filters bar -->
  <div
    class="rounded-xl p-4 mb-5"
    style="background-color: var(--muted); border: 1px solid var(--border)"
  >
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      <div class="relative lg:col-span-2">
        <Search
          class="size-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style="color: var(--muted-foreground)"
        />
        <Input
          type="text"
          bind:value={searchInput}
          onkeydown={onSearchKey}
          placeholder="Пошук заявок"
          class="pl-9"
        />
      </div>

      <Input type="text" bind:value={category} placeholder="Категорія" />

      <Input type="text" bind:value={city} placeholder="Місто" />
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Input
        type="number"
        bind:value={budgetMin}
        placeholder="Бюджет від, ₴"
        min={0}
      />
      <Input
        type="number"
        bind:value={budgetMax}
        placeholder="Бюджет до, ₴"
        min={0}
      />
      <select
        bind:value={type}
        class="h-9 rounded-md text-sm px-3 outline-none"
        style="background-color: var(--background); border: 1px solid var(--border); color: var(--foreground)"
      >
        {#each TYPE_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
      <select
        bind:value={sort}
        class="h-9 rounded-md text-sm px-3 outline-none"
        style="background-color: var(--background); border: 1px solid var(--border); color: var(--foreground)"
      >
        {#each SORT_OPTIONS as opt}
          <option value={opt.value}>Сорт: {opt.label}</option>
        {/each}
      </select>
    </div>

    <div class="flex items-center gap-2 mt-3">
      <Button onclick={applyFilters} size="sm">
        <Filter class="size-3.5 mr-1" />
        Застосувати
      </Button>
      {#if hasFilters}
        <Button onclick={clearFilters} variant="outline" size="sm">
          <X class="size-3.5 mr-1" />
          Очистити
        </Button>
      {/if}
      <span class="ml-auto text-xs" style="color: var(--muted-foreground)">
        Знайдено: {data.total}
      </span>
    </div>
  </div>

  <!-- Results -->
  {#if data.items.length === 0}
    <div
      class="rounded-xl p-12 text-center"
      style="background-color: var(--muted); border: 1px solid var(--border)"
    >
      <Briefcase
        class="size-10 mx-auto mb-3"
        style="color: var(--muted-foreground)"
      />
      <p class="text-sm font-medium mb-1" style="color: var(--foreground)">
        Немає заявок під ваш запит
      </p>
      <p class="text-xs" style="color: var(--muted-foreground)">
        Спробуйте змінити фільтри або повернутись пізніше
      </p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each data.items as job (job.id)}
        <JobCard {job} />
      {/each}
    </div>

    {#if data.hasMore}
      <div class="flex justify-center mt-6">
        <Button
          variant="outline"
          onclick={() => {
            const params = new URLSearchParams(window.location.search)
            params.set('page', String(data.page + 1))
            goto(`/jobs?${params.toString()}`)
          }}
        >
          Показати ще
        </Button>
      </div>
    {/if}
  {/if}
</div>
