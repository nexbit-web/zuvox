<script lang="ts">
  import { Search, X, ChevronRight } from 'lucide-svelte'
  import { fly } from 'svelte/transition'
  import { allServices, type Service } from '$lib/data/categories'

  let {
    onnavigate,
    isOpen = $bindable(false),
  }: {
    onnavigate: (url: string) => void
    isOpen: boolean
  } = $props()

  let searchValue = $state('')
  let searchQuery = $state('')
  let searchFocused = $state(false)
  let searchRef = $state<HTMLInputElement | undefined>(undefined)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  function handleInput() {
    if (searchValue.trim()) searchFocused = true
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      searchQuery = searchValue
    }, 120)
  }

  const suggestions: Service[] = $derived(
    (() => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return []
      return allServices
        .filter(
          (s: Service) =>
            s.text.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
        )
        .slice(0, 7)
    })(),
  )

  const showSuggestions = $derived(
    searchFocused && searchValue.trim().length > 0,
  )
  const hasResults = $derived(suggestions.length > 0)

  // Синхронізуємо з батьківським компонентом
  $effect(() => {
    isOpen = showSuggestions
  })

  function clear() {
    searchValue = ''
    searchQuery = ''
    searchRef?.focus()
  }
</script>

<div data-search class="flex justify-center w-full">
  <div class="relative w-full max-w-2xl z-50">
    <div
      class="flex items-center h-11 border rounded-xl overflow-hidden transition-colors
    {showSuggestions
        ? 'border-white/20'
        : 'border-white/10 hover:border-white/20'}"
      style="background-color: var(--background)"
    >
      <!-- Лого + Всюди -->
      <div
        class="flex items-center gap-1.5 h-11 pl-3 pr-3 shrink-0 border-r border-border/40"
      >
        
        <span class="text-sm font-medium text-primary whitespace-nowrap"
          >Всюди</span
        >
        <ChevronRight class="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
      </div>

      <!-- Інпут -->
      <input
        bind:this={searchRef}
        type="text"
        placeholder="Яку послугу шукаєте?"
        bind:value={searchValue}
        onfocus={() => (searchFocused = true)}
        onblur={() => setTimeout(() => (searchFocused = false), 200)}
        oninput={handleInput}
        class="flex-1 h-11 px-3 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground text-foreground"
      />

      <!-- Хрестик -->
      {#if searchValue}
        <button
          type="button"
          onclick={clear}
          class="w-9 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          <X class="w-4 h-4" />
        </button>
      {/if}

      <!-- Пошук -->
      <button
        type="button"
        onclick={() => {
          if (searchValue.trim())
            onnavigate(`/gigs?q=${encodeURIComponent(searchValue)}`)
        }}
        class="w-11 h-11 flex items-center justify-center text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0 border-l border-border/40"
      >
        <Search class="w-4 h-4" />
      </button>
    </div>

    <!-- Підказки -->
    {#if showSuggestions}
      <div
        transition:fly={{ y: -4, duration: 150 }}
        class="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl overflow-hidden z-50 shadow-lg"
      >
        {#if hasResults}
          {#each suggestions as s (s.text + s.category)}
            <button
              type="button"
              onclick={() =>
                onnavigate(`/gigs?q=${encodeURIComponent(s.text)}`)}
              class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors cursor-pointer text-left"
            >
              <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-sm text-foreground">{s.text}</p>
                <p class="text-xs text-muted-foreground truncate">
                  {s.category}
                </p>
              </div>
            </button>
          {/each}
        {:else}
          <div class="flex flex-col items-center py-8 gap-2">
            <Search class="w-8 h-8 text-muted-foreground/30" />
            <p class="text-sm text-muted-foreground text-center">
              Послугу <span class="font-medium text-foreground"
                >«{searchValue}»</span
              > не знайдено
            </p>
            <p class="text-xs text-muted-foreground">
              Спробуйте інший запит або перегляньте каталог
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
