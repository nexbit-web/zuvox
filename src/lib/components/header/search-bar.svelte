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
    searchTimer = setTimeout(() => { searchQuery = searchValue }, 120)
  }

  const suggestions: Service[] = $derived(
    (() => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return []
      return allServices
        .filter((s: Service) =>
          s.text.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q)
        )
        .slice(0, 7)
    })()
  )

  const showSuggestions = $derived(searchFocused && searchValue.trim().length > 0)
  const hasResults = $derived(suggestions.length > 0)

  $effect(() => { isOpen = showSuggestions })

  function clear() {
    searchValue = ''
    searchQuery = ''
    searchRef?.focus()
  }
</script>

<div data-search class="flex justify-center w-full">
  <div class="relative w-full max-w-2xl z-50">

    <!-- Інпут -->
    <div
      class="flex items-center h-12 rounded-2xl overflow-hidden transition-all
        {showSuggestions ? 'rounded-b-none' : ''}"
      style="background-color: var(--background)"
    >

      <!-- Всюди -->
      <div class="flex items-center gap-1 h-12 pl-3 pr-2 shrink-0">
        <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl" style="background-color: var(--bg-header)">
          <!-- місце для лого -->
          <div class="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span class="text-[8px] font-bold text-white">Z</span>
          </div>
          <span class="text-sm font-medium text-primary whitespace-nowrap">Всюди</span>
          <ChevronRight class="w-3 h-3 text-primary/60 shrink-0" />
        </div>
      </div>

      <!-- Інпут -->
      <input
        bind:this={searchRef}
        type="text"
        placeholder="Яку послугу шукаєте?"
        bind:value={searchValue}
        onfocus={() => searchFocused = true}
        onblur={() => setTimeout(() => searchFocused = false, 200)}
        oninput={handleInput}
        class="flex-1 h-12 px-2 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground text-foreground"
      />

      <!-- Хрестик -->
      {#if searchValue}
        <button
          type="button"
          onclick={clear}
          class="w-9 h-12 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
        >
          <X class="w-4 h-4" />
        </button>
      {/if}

      <!-- Пошук -->
      <div class="flex items-center h-12 pr-2 shrink-0">
        <button
          type="button"
          onclick={() => { if (searchValue.trim()) onnavigate(`/gigs?q=${encodeURIComponent(searchValue)}`) }}
          class="flex items-center justify-center w-9 h-9 rounded-xl cursor-pointer transition-colors"
          style="background-color: var(--bg-header)"
        >
          <Search class="w-4 h-4 text-primary" />
        </button>
      </div>

    </div>

    <!-- Підказки — як на Wikkeo -->
    {#if showSuggestions}
      <div
        transition:fly={{ y: -4, duration: 150 }}
        class="absolute top-full left-0 right-0 z-50 shadow-2xl rounded-b-2xl overflow-hidden"
        style="background-color: var(--background)"
      >
        <!-- Розділювач -->
        <div class="mx-4 border-t border-white/5"></div>

        {#if hasResults}
          {#each suggestions as s (s.text + s.category)}
            <button
              type="button"
              onclick={() => onnavigate(`/gigs?q=${encodeURIComponent(s.text)}`)}
              class="w-full flex items-center gap-4 px-5 py-3 hover:bg-white/5 transition-colors cursor-pointer text-left"
            >
              <Search class="w-4 h-4 text-muted-foreground/50 shrink-0" />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-foreground leading-snug">{s.text}</p>
                {#if s.category}
                  <p class="text-xs text-muted-foreground truncate mt-0.5">{s.category}</p>
                {/if}
              </div>
            </button>
          {/each}
        {:else}
          <div class="flex flex-col items-center py-10 gap-2">
            <Search class="w-8 h-8 text-muted-foreground/20" />
            <p class="text-sm text-muted-foreground text-center">
              Послугу <span class="font-medium text-foreground">«{searchValue}»</span> не знайдено
            </p>
            <p class="text-xs text-muted-foreground/60">
              Спробуйте інший запит або перегляньте каталог
            </p>
          </div>
        {/if}

        <!-- Відступ знизу -->
        <div class="h-2"></div>
      </div>
    {/if}

  </div>
</div>