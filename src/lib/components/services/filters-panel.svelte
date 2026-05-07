<!-- src/lib/components/services/filters-panel.svelte -->
<script lang="ts" module>
  // ─── Module-level кеш для міст ───
  // Спільний між усіма маунтами компонента. Живе доти, доки відкрита вкладка.
  interface CityRef {
    slug: string
    name: string
  }

  let citiesCache: CityRef[] | null = null
  let citiesPromise: Promise<CityRef[]> | null = null

  async function fetchCities(): Promise<CityRef[]> {
    if (citiesCache) return citiesCache
    if (citiesPromise) return citiesPromise

    citiesPromise = (async () => {
      try {
        const res = await fetch('/api/cities')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        const arr: CityRef[] = Array.isArray(json)
          ? json
          : (json.cities ?? json.data ?? [])
        citiesCache = arr
        return arr
      } catch (err) {
        console.error('[filters-panel] failed to load cities:', err)
        citiesPromise = null
        throw err
      }
    })()

    return citiesPromise
  }

  // ─── Константи валідації ───
  const RATE_MIN = 0
  const RATE_MAX = 100_000

  /**
   * Парсить рядок як невід'ємне ціле число.
   * Повертає null якщо: пусто, не число, від'ємне, або більше RATE_MAX.
   */
  function parseRate(input: string): number | null {
    const trimmed = input.trim()
    if (!trimmed) return null
    if (!/^\d{1,7}$/.test(trimmed)) return null
    const n = parseInt(trimmed, 10)
    if (!Number.isFinite(n) || n < RATE_MIN || n > RATE_MAX) return null
    return n
  }
</script>

<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import { Button } from '$lib/components/ui/button'
  import * as Popover from '$lib/components/ui/popover'
  import * as Command from '$lib/components/ui/command'
  import {
    Star,
    RotateCcw,
    Check,
    ChevronsUpDown,
    LoaderCircle,
  } from 'lucide-svelte'
  import { onMount, tick } from 'svelte'

  interface Filters {
    sub: string | null
    city: string | null
    type: string | null
    minRate: number | null
    maxRate: number | null
    minRating: number | null
    sort: string
  }

  interface Props {
    filters: Filters
    onApply: (next: Record<string, string | null>) => void
  }

  let { filters, onApply }: Props = $props()

  // ─── Cities ───
  let cities = $state<CityRef[]>(citiesCache ?? [])
  let citiesLoading = $state(!citiesCache)
  let citiesError = $state<string | null>(null)

  onMount(async () => {
    if (citiesCache) return
    try {
      cities = await fetchCities()
      citiesLoading = false
    } catch {
      citiesError = 'Не вдалося завантажити міста'
      citiesLoading = false
    }
  })

  // ─── Drafts ───
  // Ініціалізація з props.
  let draftCity = $state(filters.city ?? 'all')
  let draftType = $state(filters.type ?? 'all')
  let draftMinRate = $state(filters.minRate?.toString() ?? '')
  let draftMaxRate = $state(filters.maxRate?.toString() ?? '')
  let draftMinRating = $state<number | null>(filters.minRating)

  // ─── Синхронізація drafts з props при зміні URL ───
  // Коли юзер натискає "Застосувати" → goto оновлює URL → SvelteKit ре-рендерить
  // сторінку → передає нові filters → треба оновити drafts, інакше старі
  // значення затруть нові при наступному "Застосувати".
  let lastFiltersSnapshot = $state(JSON.stringify(filters))
  $effect(() => {
    const currentSnapshot = JSON.stringify(filters)
    if (currentSnapshot !== lastFiltersSnapshot) {
      lastFiltersSnapshot = currentSnapshot
      draftCity = filters.city ?? 'all'
      draftType = filters.type ?? 'all'
      draftMinRate = filters.minRate?.toString() ?? ''
      draftMaxRate = filters.maxRate?.toString() ?? ''
      draftMinRating = filters.minRating
    }
  })

  // ─── City picker ───
  let cityOpen = $state(false)
  let cityTriggerRef = $state<HTMLButtonElement | null>(null)

  const types = [
    { value: 'all', label: 'Будь-який' },
    { value: 'online', label: 'Онлайн' },
    { value: 'offline', label: 'Офлайн' },
    { value: 'visit', label: 'Виїзд' },
  ]

  const ratings = [
    { value: 4.5, label: '4.5+' },
    { value: 4, label: '4+' },
    { value: 3, label: '3+' },
  ]

  const selectedCityLabel = $derived(
    cities.find((c) => c.slug === draftCity)?.name ?? 'Вся Україна',
  )

  function selectCity(slug: string) {
    draftCity = slug
    cityOpen = false
    tick().then(() => cityTriggerRef?.focus())
  }

  function apply() {
    // ─── Валідація ціни ───
    const minRateNum = parseRate(draftMinRate)
    const maxRateNum = parseRate(draftMaxRate)

    // Якщо обидва задані і min > max — нормалізуємо (свопаємо)
    let finalMin = minRateNum
    let finalMax = maxRateNum
    if (finalMin !== null && finalMax !== null && finalMin > finalMax) {
      ;[finalMin, finalMax] = [finalMax, finalMin]
      // І оновлюємо drafts щоб юзер бачив нормалізований стан
      draftMinRate = finalMin.toString()
      draftMaxRate = finalMax.toString()
    }

    onApply({
      city: draftCity === 'all' ? null : draftCity,
      type: draftType === 'all' ? null : draftType,
      minRate: finalMin === null ? null : String(finalMin),
      maxRate: finalMax === null ? null : String(finalMax),
      minRating: draftMinRating === null ? null : String(draftMinRating),
    })
  }

  function reset() {
    draftCity = 'all'
    draftType = 'all'
    draftMinRate = ''
    draftMaxRate = ''
    draftMinRating = null
    onApply({
      city: null,
      type: null,
      minRate: null,
      maxRate: null,
      minRating: null,
    })
  }

  // ─── Submit на Enter ───
  function onRateKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      apply()
    }
  }

  // ─── Перевірка чи є зміни порівняно з застосованими фільтрами ───
  const hasUnappliedChanges = $derived(
    draftCity !== (filters.city ?? 'all') ||
      draftType !== (filters.type ?? 'all') ||
      draftMinRate !== (filters.minRate?.toString() ?? '') ||
      draftMaxRate !== (filters.maxRate?.toString() ?? '') ||
      draftMinRating !== filters.minRating,
  )
</script>

<div class="flex flex-col gap-7">
  <!-- ─── Місто ─── -->
  <div class="flex flex-col gap-2">
    <label class="text-xs font-medium" style="color: var(--muted-foreground)">
      Місто
    </label>

    <Popover.Root bind:open={cityOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            bind:ref={cityTriggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={cityOpen}
            disabled={citiesLoading || !!citiesError}
            class="w-full h-11 justify-between rounded-lg px-3.5 font-normal text-sm cursor-pointer"
          >
            {#if citiesLoading}
              <span class="inline-flex items-center gap-2 opacity-60">
                <LoaderCircle class="size-3.5 animate-spin" />
                Завантаження…
              </span>
            {:else if citiesError}
              <span style="color: var(--destructive)">{citiesError}</span>
            {:else}
              <span class:opacity-50={draftCity === 'all'}>
                {selectedCityLabel}
              </span>
              <ChevronsUpDown class="size-4 opacity-40 shrink-0" />
            {/if}
          </Button>
        {/snippet}
      </Popover.Trigger>

      <Popover.Content
        class="w-[--bits-popover-anchor-width] p-0 rounded-lg"
        align="start"
        sideOffset={4}
      >
        <Command.Root>
          <Command.Input placeholder="Пошук міста…" class="h-10 text-sm" />
          <Command.List class="max-h-64">
            <Command.Empty class="py-6 text-center text-sm opacity-60">
              Не знайдено
            </Command.Empty>
            <Command.Group>
              {#each cities as c (c.slug)}
                <Command.Item
                  value={c.name}
                  onSelect={() => selectCity(c.slug)}
                  class="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer text-sm"
                >
                  <div class="w-4 flex items-center justify-center shrink-0">
                    {#if draftCity === c.slug}
                      <Check class="size-4" style="color: var(--primary)" />
                    {/if}
                  </div>
                  <span>{c.name}</span>
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
  </div>

  <!-- ─── Тип роботи ─── -->
  <div class="flex flex-col gap-2">
    <label class="text-xs font-medium" style="color: var(--muted-foreground)">
      Тип роботи
    </label>
    <div class="flex flex-wrap gap-1.5">
      {#each types as t (t.value)}
        <button
          type="button"
          onclick={() => (draftType = t.value)}
          class="px-3.5 py-1.5 rounded-full text-[13px] font-medium leading-none transition-colors border cursor-pointer"
          style={draftType === t.value
            ? 'background-color: var(--foreground); color: var(--background); border-color: var(--foreground);'
            : 'background-color: transparent; color: var(--foreground); border-color: color-mix(in oklch, var(--foreground) 14%, transparent);'}
        >
          {t.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- ─── Ціна ─── -->
  <div class="flex flex-col gap-2">
    <label class="text-xs font-medium" style="color: var(--muted-foreground)">
      Ставка / год, грн
    </label>
    <div class="grid grid-cols-2 gap-2">
      <Input
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength={7}
        placeholder="Від"
        bind:value={draftMinRate}
        onkeydown={onRateKeydown}
        class="h-11 rounded-lg tabular-nums text-sm"
      />
      <Input
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        maxlength={7}
        placeholder="До"
        bind:value={draftMaxRate}
        onkeydown={onRateKeydown}
        class="h-11 rounded-lg tabular-nums text-sm"
      />
    </div>
  </div>

  <!-- ─── Рейтинг ─── -->
  <div class="flex flex-col gap-2">
    <label class="text-xs font-medium" style="color: var(--muted-foreground)">
      Рейтинг
    </label>
    <div class="flex flex-wrap gap-1.5">
      <button
        type="button"
        onclick={() => (draftMinRating = null)}
        class="px-3.5 py-1.5 rounded-full text-[13px] font-medium leading-none transition-colors border cursor-pointer"
        style={draftMinRating === null
          ? 'background-color: var(--foreground); color: var(--background); border-color: var(--foreground);'
          : 'background-color: transparent; color: var(--foreground); border-color: color-mix(in oklch, var(--foreground) 14%, transparent);'}
      >
        Будь-який
      </button>
      {#each ratings as r (r.value)}
        <button
          type="button"
          onclick={() => (draftMinRating = r.value)}
          class="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] font-medium leading-none transition-colors border cursor-pointer"
          style={draftMinRating === r.value
            ? 'background-color: var(--foreground); color: var(--background); border-color: var(--foreground);'
            : 'background-color: transparent; color: var(--foreground); border-color: color-mix(in oklch, var(--foreground) 14%, transparent);'}
        >
          <Star class="size-3" style="fill: currentColor" />
          {r.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- ─── Інформер ─── -->
  <p class="text-xs leading-relaxed" style="color: var(--muted-foreground)">
    У каталозі лише
    <span style="color: var(--foreground)" class="font-medium"
      >верифіковані майстри</span
    >
    — кожен пройшов перевірку особистості.
  </p>

  <!-- ─── Actions ─── -->
  <div
    class="flex gap-2 pt-4 border-t"
    style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
  >
    <Button
      onclick={apply}
      disabled={!hasUnappliedChanges}
      class="flex-1 h-11 rounded-lg font-medium text-sm cursor-pointer disabled:cursor-not-allowed"
    >
      {hasUnappliedChanges ? 'Застосувати' : 'Застосовано'}
    </Button>
    <Button
      variant="outline"
      onclick={reset}
      class="h-11 w-11 rounded-lg p-0 shrink-0 cursor-pointer"
      title="Скинути фільтри"
      aria-label="Скинути фільтри"
    >
      <RotateCcw class="size-4" />
    </Button>
  </div>
</div>
