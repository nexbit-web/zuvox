<script lang="ts">
  import { Search, X, ArrowRight } from 'lucide-svelte'
  import { fly, fade } from 'svelte/transition'
  import { backOut } from 'svelte/easing'
  import { allServices, type Service } from '$lib/data/categories'
  import { onMount } from 'svelte'

  const popularTags = ['Лендінг', 'Логотип', 'SEO', 'Ремонт', 'Репетитор']
  const placeholders = [
    'Полагодити кран...',
    'Розробити сайт...',
    'Зробити логотип...',
  ]

  let placeholderIndex = $state(0)
  let placeholderVisible = $state(true)
  let mounted = $state(false)

  onMount(() => {
    mounted = true
    const interval = setInterval(() => {
      placeholderVisible = false
      setTimeout(() => {
        placeholderIndex = (placeholderIndex + 1) % placeholders.length
        placeholderVisible = true
      }, 250)
    }, 3000)
    return () => clearInterval(interval)
  })

  let searchValue = $state('')
  let searchQuery = $state('')
  let focused = $state(false)
  let inputEl = $state<HTMLInputElement | undefined>(undefined)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  function handleInput() {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      searchQuery = searchValue
    }, 100)
  }

  const suggestions: Service[] = $derived(
    (() => {
      const q = searchQuery.trim().toLowerCase()
      if (!q) return []
      return allServices
        .filter(
          (s) =>
            s.text.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
        )
        .slice(0, 6)
    })(),
  )

  const showSuggestions = $derived(
    focused && searchValue.trim().length > 0 && suggestions.length > 0,
  )
  const showEmpty = $derived(
    focused && searchQuery.trim().length > 0 && suggestions.length === 0,
  )

  function handleSearch(value?: string) {
    const q = (value ?? searchValue).trim()
    if (!q) return
    window.location.href = `/gigs?q=${encodeURIComponent(q)}`
  }

  function clear() {
    searchValue = ''
    searchQuery = ''
    inputEl?.focus()
  }
</script>

<section
  class="relative flex flex-col justify-center items-center overflow-visible z-50 select-none px-4"
  style="background-color: var(--background); height: 90vh;"
>
  <!-- Быстрое появление фона -->
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
      <!-- 1. Индикатор Online -->
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

      <!-- 2. Заголовок -->
      <h1
        in:fly={{ y: 15, duration: 500, delay: 150, easing: backOut }}
        class="text-4xl md:text-7xl font-bold tracking-tighter leading-tight md:leading-none mb-6"
        style="color: var(--foreground)"
      >
        Онлайн-сервіс замовлення послуг
      </h1>

      <!-- 3. Подзаголовок -->
      <p
        in:fly={{ y: 10, duration: 500, delay: 250 }}
        class="text-sm md:text-lg opacity-50 font-medium mb-10 max-w-[280px] md:max-w-none"
      >
        Надійні фахівці для вашого бізнесу та дому.
      </p>

      <!-- 4. Инпут -->
      <div
        in:fly={{ y: 20, duration: 600, delay: 350, easing: backOut }}
        class="w-full max-w-xl relative"
      >
        <div
          class="flex items-center transition-all duration-300 rounded-lg border shadow-sm"
          style="height: 56px; background-color: var(--card); border-color: focused ? var(--foreground) : var(--border);"
        >
          <div class="pl-4 md:pl-5 pr-2">
            <Search size={18} class="opacity-30" />
          </div>

          <div class="flex-1 relative h-full">
            {#if !searchValue && !focused}
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
              class="w-full h-full bg-transparent outline-none text-sm md:text-base cursor-text"
              style="color: var(--foreground)"
              onfocus={() => (focused = true)}
              onblur={() => setTimeout(() => (focused = false), 150)}
              oninput={handleInput}
            />
          </div>

          {#if searchValue}
            <button
              onclick={clear}
              class="p-2 opacity-30 hover:opacity-100 cursor-pointer"
            >
              <X size={16} />
            </button>
          {/if}

          <div class="pr-1.5">
            <button
              onclick={() => handleSearch()}
              class="h-10 px-6 md:px-8 rounded-md font-bold text-xs md:text-sm transition-all hover:brightness-110 active:scale-95 cursor-pointer"
              style="background-color: var(--primary); color: var(--primary-foreground)"
            >
              Знайти
            </button>
          </div>
        </div>

        <!-- Меню поиска -->
        {#if showSuggestions || showEmpty}
          <div
            transition:fade={{ duration: 100 }}
            class="absolute top-[62px] left-0 right-0 rounded-lg border overflow-hidden z-[100] text-left"
            style="background-color: var(--card); border-color: var(--border); box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1)"
          >
            {#if showSuggestions}
              {#each suggestions as s}
                <button
                  onclick={() => handleSearch(s.text)}
                  class="w-full flex items-center justify-between p-4 hover:bg-[var(--accent)] transition-colors border-b last:border-0 group cursor-pointer"
                  style="border-color: var(--border)"
                >
                  <span class="font-bold text-sm">{s.text}</span>
                  <ArrowRight
                    size={14}
                    class="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0"
                  />
                </button>
              {/each}
            {:else}
              <div class="p-8 text-center opacity-40 text-sm font-medium">
                Нічого не знайдено
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- 5. Теги -->
      <div
        in:fade={{ duration: 400, delay: 500 }}
        class="mt-8 flex flex-wrap justify-center gap-2 max-w-[320px] md:max-w-none"
      >
        {#each popularTags as tag}
          <button
            onclick={() => handleSearch(tag)}
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
</style>
