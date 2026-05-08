<script lang="ts">
  import {
    Search,
    X,
    ArrowRight,
    LoaderCircle,
    Layers,
    Folder,
  } from 'lucide-svelte'
  import { fly, fade } from 'svelte/transition'
  import { backOut } from 'svelte/easing'
  import { onMount, onDestroy } from 'svelte'
  import { goto } from '$app/navigation'

  // ─── Типи ───
  interface SearchResult {
    type: 'category' | 'subcategory'
    slug: string
    name: string
    parentSlug?: string
    parentName?: string
    icon?: string | null
  }

  const popularTags = ['AI', 'Логотип', 'SEO', 'Ремонт', 'Перевезення']
  const placeholders = [
    'Полагодити кран...',
    'Розробити сайт...',
    'Зробити логотип...',
  ]

  let placeholderIndex = $state(0)
  let placeholderVisible = $state(true)
  let mounted = $state(false)

  // ─── Search state ───
  let searchValue = $state('')
  let inputEl = $state<HTMLInputElement | undefined>(undefined)
  let containerEl = $state<HTMLDivElement | undefined>(undefined)

  let results = $state<SearchResult[]>([])
  let loading = $state(false)
  let highlightedIndex = $state(-1)

  // ─── Явний контроль меню ───
  // НЕ залежить від focused — це і ламало все. Меню керується явно:
  // відкривається коли є валідний запит, закривається коли:
  //  - юзер натиснув Escape
  //  - юзер клікнув ПОЗА компонентом
  //  - юзер вибрав результат (відкривається перехід)
  //  - searchValue став < QUERY_MIN символів
  let menuOpen = $state(false)

  // ─── Debounce + кеш + abort ───
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let abortController: AbortController | null = null
  let activeRequestId = 0 // захист від race conditions
  const cache = new Map<string, SearchResult[]>()
  const CACHE_MAX_SIZE = 100

  const DEBOUNCE_MS = 400
  const QUERY_MIN = 2

  function cacheSet(key: string, value: SearchResult[]) {
    if (cache.size >= CACHE_MAX_SIZE) {
      const firstKey = cache.keys().next().value
      if (firstKey) cache.delete(firstKey)
    }
    cache.set(key, value)
  }

  async function performSearch(query: string) {
    const q = query.trim()

    if (q.length < QUERY_MIN) {
      results = []
      loading = false
      highlightedIndex = -1
      menuOpen = false
      return
    }

    // ─── Cache hit ───
    const cached = cache.get(q.toLowerCase())
    if (cached) {
      results = cached
      loading = false
      highlightedIndex = -1
      menuOpen = true
      return
    }

    // ─── Race protection ───
    // Кожен запит отримує свій ID. Якщо до нашого finally прийшов новіший запит —
    // ігноруємо результат. Це додатковий захист поверх AbortController.
    const requestId = ++activeRequestId

    // Скасовуємо попередній запит
    if (abortController) abortController.abort()
    abortController = new AbortController()

    loading = true
    menuOpen = true // відкриваємо меню одразу — буде показаний loading-стан

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: abortController.signal,
      })

      // Якщо за час запиту юзер ввів нові символи — ігноруємо
      if (requestId !== activeRequestId) return

      if (!res.ok) {
        results = []
        return
      }

      const data: { results: SearchResult[] } = await res.json()

      // Ще раз перевіряємо актуальність — JSON міг парситись довго
      if (requestId !== activeRequestId) return

      results = data.results ?? []
      cacheSet(q.toLowerCase(), results)
      highlightedIndex = -1
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      if (requestId !== activeRequestId) return
      console.error('[search] failed:', err)
      results = []
    } finally {
      // Loading знімаємо тільки якщо це актуальний запит
      if (requestId === activeRequestId) {
        loading = false
      }
    }
  }

  function handleInput() {
    if (searchTimer) clearTimeout(searchTimer)

    const q = searchValue.trim()
    if (q.length < QUERY_MIN) {
      // Миттєво очищаємо без debounce
      results = []
      loading = false
      menuOpen = false
      highlightedIndex = -1
      // Скасовуємо будь-який pending запит
      if (abortController) abortController.abort()
      activeRequestId++ // інвалідуємо
      return
    }

    // Відкриваємо меню одразу — поки результати чекаються, юзер бачить loading
    menuOpen = true

    searchTimer = setTimeout(() => {
      performSearch(searchValue)
    }, DEBOUNCE_MS)
  }

  function clear() {
    searchValue = ''
    results = []
    highlightedIndex = -1
    menuOpen = false
    if (searchTimer) clearTimeout(searchTimer)
    if (abortController) abortController.abort()
    activeRequestId++
    inputEl?.focus()
  }

  function closeMenu() {
    menuOpen = false
    highlightedIndex = -1
  }

  function reopenMenuIfNeeded() {
    // При фокусі повертаємо меню, якщо є валідний запит з результатами
    if (searchValue.trim().length >= QUERY_MIN && results.length > 0) {
      menuOpen = true
    } else if (searchValue.trim().length >= QUERY_MIN) {
      // Якщо немає результатів, але є запит — пробуємо ще раз
      performSearch(searchValue)
    }
  }

  // ─── Click outside ───
  function handleClickOutside(e: MouseEvent) {
    if (!containerEl) return
    const target = e.target as Node
    if (!containerEl.contains(target)) {
      closeMenu()
    }
  }

  // ─── Keyboard navigation ───
  function onKeydown(e: KeyboardEvent) {
    // Працює тільки коли input у фокусі
    if (document.activeElement !== inputEl) return

    if (!menuOpen) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        menuOpen = true
        e.preventDefault()
      }
      return
    }

    if (e.key === 'ArrowDown' && results.length > 0) {
      e.preventDefault()
      highlightedIndex = (highlightedIndex + 1) % results.length
    } else if (e.key === 'ArrowUp' && results.length > 0) {
      e.preventDefault()
      highlightedIndex =
        highlightedIndex <= 0 ? results.length - 1 : highlightedIndex - 1
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlightedIndex >= 0 && results[highlightedIndex]) {
        navigateToResult(results[highlightedIndex])
      } else if (searchValue.trim()) {
        navigateToFallback(searchValue.trim())
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      closeMenu()
      inputEl?.blur()
    }
  }

  function navigateToResult(r: SearchResult) {
    closeMenu()
    if (r.type === 'category') {
      goto(`/services/${r.slug}`)
    } else {
      goto(`/services/${r.parentSlug}?sub=${r.slug}`)
    }
  }

  function navigateToFallback(query: string) {
    closeMenu()
    goto(`/services?q=${encodeURIComponent(query)}`)
  }

  // ─── Computed ───
  const showLoading = $derived(menuOpen && loading && results.length === 0)
  const showResultsList = $derived(menuOpen && !loading && results.length > 0)
  const showEmpty = $derived(
    menuOpen &&
      !loading &&
      results.length === 0 &&
      searchValue.trim().length >= QUERY_MIN,
  )

  // ─── Mount/Destroy ───
  onMount(() => {
    mounted = true

    const interval = setInterval(() => {
      placeholderVisible = false
      setTimeout(() => {
        placeholderIndex = (placeholderIndex + 1) % placeholders.length
        placeholderVisible = true
      }, 250)
    }, 3000)

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      clearInterval(interval)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  })

  onDestroy(() => {
    if (searchTimer) clearTimeout(searchTimer)
    if (abortController) abortController.abort()
  })
</script>

<svelte:window onkeydown={onKeydown} />

<section
  class="relative flex flex-col justify-center items-center overflow-visible z-40 select-none px-4"
  style="background-color: var(--background); height: 90vh;"
>
  {#if mounted}
    <div
      in:fade={{ duration: 500 }}
      class="absolute inset-0 pointer-events-none opacity-[0.04]"
      style="background-image: 
        linear-gradient(var(--foreground) 1px, transparent 1px), 
        linear-gradient(90deg, var(--foreground) 1px, transparent 1px); 
        background-size: 40px 40px;"
    ></div>
  {/if}

  <div
    class="max-w-4xl mx-auto w-full relative z-10 flex flex-col items-center text-center"
  >
    {#if mounted}
      <div
        in:fly={{ y: -10, duration: 400, delay: 50, easing: backOut }}
        class="flex items-center gap-2 mb-6 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--card)] shadow-sm"
      >
        <span class="relative flex h-2 w-2">
          <span
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"
          ></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"
          ></span>
        </span>
        <span class="text-[10px] font-bold uppercase tracking-widest opacity-70"
          >онлайн</span
        >
      </div>

      <h1
        in:fly={{ y: 15, duration: 500, delay: 150, easing: backOut }}
        class="text-4xl md:text-7xl font-bold tracking-tighter leading-tight md:leading-none mb-6"
        style="color: var(--foreground)"
      >
        Онлайн-сервіс замовлення послуг
      </h1>

      <p
        in:fly={{ y: 10, duration: 500, delay: 250 }}
        class="text-sm md:text-lg opacity-50 font-medium mb-10 max-w-[280px] md:max-w-none"
      >
        Надійні фахівці для вашого бізнесу та дому.
      </p>

      <!-- ─── Search container ─── -->
      <div
        bind:this={containerEl}
        in:fly={{ y: 20, duration: 600, delay: 350, easing: backOut }}
        class="w-full max-w-xl relative"
      >
        <div
          class="flex items-center transition-all duration-300 rounded-lg border shadow-sm"
          style="height: 56px; background-color: var(--card); border-color: var(--border);"
        >
          <div class="pl-4 md:pl-5 pr-2">
            {#if loading}
              <LoaderCircle size={18} class="opacity-60 animate-spin" />
            {:else}
              <Search size={18} class="opacity-30" />
            {/if}
          </div>

          <div class="flex-1 relative h-full">
            {#if !searchValue}
              <span
                class="absolute left-0 top-1/2 -translate-y-1/2 text-sm md:text-base pointer-events-none transition-opacity duration-200"
                style="color: var(--foreground); opacity: {placeholderVisible
                  ? 0.35
                  : 0}"
              >
                {placeholders[placeholderIndex]}
              </span>
            {/if}
            <input
              bind:this={inputEl}
              bind:value={searchValue}
              type="text"
              autocomplete="off"
              spellcheck="false"
              maxlength={50}
              role="combobox"
              aria-expanded={menuOpen}
              aria-autocomplete="list"
              aria-controls="search-results-list"
              aria-activedescendant={highlightedIndex >= 0
                ? `search-result-${highlightedIndex}`
                : undefined}
              class="w-full h-full bg-transparent outline-none text-sm md:text-base cursor-text"
              style="color: var(--foreground)"
              onfocus={reopenMenuIfNeeded}
              oninput={handleInput}
            />
          </div>

          {#if searchValue}
            <button
              onclick={clear}
              type="button"
              class="p-2 opacity-30 hover:opacity-100 cursor-pointer"
              aria-label="Очистити"
            >
              <X size={16} />
            </button>
          {/if}

          <div class="pr-1.5">
            <button
              onclick={() => {
                if (results[0]) navigateToResult(results[0])
                else if (searchValue.trim())
                  navigateToFallback(searchValue.trim())
              }}
              type="button"
              class="h-10 px-6 md:px-8 rounded-md font-bold text-xs md:text-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              style="background-color: var(--primary); color: var(--primary-foreground)"
            >
              Знайти
            </button>
          </div>
        </div>

        <!-- ═══════ Меню результатів ═══════ -->
        {#if menuOpen && (showLoading || showResultsList || showEmpty)}
          <div
            transition:fade={{ duration: 100 }}
            id="search-results-list"
            role="listbox"
            class="absolute top-[62px] left-0 right-0 rounded-lg border overflow-y-auto overflow-x-hidden z-[100] text-left search-scroll"
            style="background-color: var(--card); border-color: var(--border); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1); max-height: min(360px, 60vh);"
          >
            {#if showLoading}
              <div class="p-8 text-center">
                <LoaderCircle
                  size={20}
                  class="mx-auto animate-spin opacity-40"
                />
              </div>
            {:else if showResultsList}
              {#each results as r, i (r.type + ':' + r.slug + ':' + (r.parentSlug ?? ''))}
                <button
                  id="search-result-{i}"
                  role="option"
                  aria-selected={i === highlightedIndex}
                  onmouseenter={() => (highlightedIndex = i)}
                  onmousedown={(e) => {
                    e.preventDefault()
                    navigateToResult(r)
                  }}
                  type="button"
                  class="w-full flex items-center justify-between gap-3 p-4 transition-colors border-b last:border-0 group cursor-pointer"
                  style="border-color: var(--border); background-color: {i ===
                  highlightedIndex
                    ? 'var(--accent)'
                    : 'transparent'}"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="size-7 rounded-md flex items-center justify-center shrink-0"
                      style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent)"
                    >
                      {#if r.type === 'category'}
                        <Layers size={14} class="opacity-50" />
                      {:else}
                        <Folder size={14} class="opacity-50" />
                      {/if}
                    </div>
                    <div class="min-w-0 text-left">
                      <p class="font-bold text-sm truncate">{r.name}</p>
                      {#if r.parentName}
                        <p class="text-[11px] opacity-50 truncate">
                          у {r.parentName}
                        </p>
                      {/if}
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    class="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 shrink-0"
                  />
                </button>
              {/each}
            {:else if showEmpty}
              <div class="p-8 text-center opacity-40 text-sm font-medium">
                Нічого не знайдено
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- ─── Tags ─── -->
      <div
        in:fade={{ duration: 400, delay: 500 }}
        class="mt-8 flex flex-wrap justify-center gap-2 max-w-[320px] md:max-w-none"
      >
        {#each popularTags as tag}
          <button
            onclick={() => {
              searchValue = tag
              if (searchTimer) clearTimeout(searchTimer)
              performSearch(tag)
              inputEl?.focus()
            }}
            type="button"
            class="tag-item text-[10px] md:text-xs font-bold px-4 py-1.5 rounded-md border transition-all cursor-pointer"
            style="border-color: var(--border); color: var(--foreground); background-color: var(--card);"
          >
            {tag}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-10">
    <div class="w-[1px] h-8 bg-current"></div>
  </div>
</section>

<style>
  .cursor-pointer {
    cursor: pointer !important;
  }
  h1 {
    letter-spacing: -0.04em;
  }
  .tag-item:hover {
    border-color: var(--foreground) !important;
    transform: translateY(-2px);
  }
  .rounded-lg {
    border-radius: 0.75rem;
  }
  .rounded-md {
    border-radius: 0.5rem;
  }

  .search-scroll {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklch, var(--foreground) 20%, transparent)
      transparent;
    overscroll-behavior: contain;
  }
  .search-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .search-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .search-scroll::-webkit-scrollbar-thumb {
    background: color-mix(in oklch, var(--foreground) 15%, transparent);
    border-radius: 999px;
  }
  .search-scroll::-webkit-scrollbar-thumb:hover {
    background: color-mix(in oklch, var(--foreground) 25%, transparent);
  }
</style>
