<!-- src/lib/components/header/search-bar.svelte -->
<script lang="ts">
  import { Search, X } from 'lucide-svelte'
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

  $effect(() => {
    isOpen = showSuggestions
  })

  function clear() {
    searchValue = ''
    searchQuery = ''
    searchRef?.focus()
  }

  function submit() {
    if (searchValue.trim())
      onnavigate(`/gigs?q=${encodeURIComponent(searchValue)}`)
  }
</script>

<div data-search class="flex justify-center w-full">
  <div class="relative w-full max-w-xl">
    <!-- Інпут: pill з тонкою білою рамкою на чорному фоні -->
    <div
      class="flex items-center h-11 rounded-xl overflow-hidden transition-all"
      class:rounded-b-none={showSuggestions}
      class:border-b-transparent={showSuggestions}
      style="background-color: rgba(255,255,255,0.06);
             border: 1px solid {searchFocused
        ? 'rgba(255,255,255,0.22)'
        : 'rgba(255,255,255,0.14)'};"
    >
      <!-- Іконка пошуку зліва -->
      <div class="flex items-center justify-center pl-4 pr-2.5 shrink-0">
        <Search
          class="size-4"
          strokeWidth={2}
          style="color: rgba(255,255,255,0.7)"
        />
      </div>

      <!-- Інпут -->
      <input
        bind:this={searchRef}
        type="text"
        placeholder="Що потрібно зробити?"
        bind:value={searchValue}
        onfocus={() => (searchFocused = true)}
        onblur={() => setTimeout(() => (searchFocused = false), 200)}
        oninput={handleInput}
        onkeydown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') {
            searchFocused = false
            searchRef?.blur()
          }
        }}
        class="flex-1 h-11 pr-3 text-sm bg-transparent border-none outline-none"
        style="color: white;"
      />

      <!-- Хрестик -->
      {#if searchValue}
        <button
          type="button"
          onclick={clear}
          class="size-8 mr-1.5 flex items-center justify-center rounded-full transition-colors cursor-pointer shrink-0"
          style="color: rgba(255,255,255,0.55)"
          onmouseenter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              'rgba(255,255,255,0.08)')}
          onmouseleave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              'transparent')}
          aria-label="Очистити"
        >
          <X class="size-3.5" strokeWidth={2} />
        </button>
      {/if}
    </div>

    <!-- Підказки -->
    {#if showSuggestions}
      <div
        transition:fly={{ y: -4, duration: 150 }}
        class="absolute top-full left-0 right-0 z-50 overflow-hidden"
        style="background-color: #0a0a0a;
               border: 1px solid rgba(255,255,255,0.14);
               border-top: none;
               border-radius: 0 0 1.5rem 1.5rem;
               box-shadow: 0 24px 48px rgba(0,0,0,0.5);"
      >
        {#if hasResults}
          {#each suggestions as s (s.text + s.category)}
            <button
              type="button"
              onclick={() => onnavigate(`/gigs?q=${encodeURIComponent(s.text)}`)}
              class="w-full flex items-center gap-3 px-5 py-3 transition-colors cursor-pointer text-left"
              onmouseenter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  'rgba(255,255,255,0.05)')}
              onmouseleave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  'transparent')}
            >
              <Search
                class="size-4 shrink-0"
                style="color: rgba(255,255,255,0.4)"
              />
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium leading-snug" style="color: white">
                  {s.text}
                </p>
                {#if s.category}
                  <p
                    class="text-xs truncate mt-0.5"
                    style="color: rgba(255,255,255,0.5)"
                  >
                    {s.category}
                  </p>
                {/if}
              </div>
            </button>
          {/each}
        {:else}
          <div class="flex flex-col items-center py-10 gap-2">
            <Search class="size-8" style="color: rgba(255,255,255,0.2)" />
            <p class="text-sm text-center" style="color: rgba(255,255,255,0.6)">
              Нічого не знайдено для
              <span class="font-medium" style="color: white">«{searchValue}»</span>
            </p>
            <p class="text-xs" style="color: rgba(255,255,255,0.4)">
              Спробуйте інший запит
            </p>
          </div>
        {/if}
        <div class="h-2"></div>
      </div>
    {/if}
  </div>
</div>