<!-- src/lib/components/home/hero-section.svelte -->
<script lang="ts">
  import { Search, X, ArrowRight } from 'lucide-svelte'
  import { Button } from '$lib/components/ui/button'
  import { fly, fade } from 'svelte/transition'
  import { allServices, type Service } from '$lib/data/categories'
  import { onMount } from 'svelte'

  const popularTags = [
    'Лендінг',
    'Логотип',
    'SEO',
    'Ремонт',
    'Репетитор',
    'Фото',
  ]

  const placeholders = [
    'Що вам потрібно?',
    'Розробити сайт...',
    'Зробити логотип...',
    'Написати текст...',
    'Полагодити кран...',
    'Знайти репетитора...',
  ]

  let placeholderIndex = $state(0)
  let placeholderVisible = $state(true)

  onMount(() => {
    const interval = setInterval(() => {
      placeholderVisible = false
      setTimeout(() => {
        placeholderIndex = (placeholderIndex + 1) % placeholders.length
        placeholderVisible = true
      }, 300)
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
    }, 120)
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
    focused = false
    searchValue = value ?? searchValue
    window.location.href = `/gigs?q=${encodeURIComponent(q)}`
  }

  function clear() {
    searchValue = ''
    searchQuery = ''
    inputEl?.focus()
  }
</script>

<section
  class="relative flex flex-col justify-center"
  style="background-color: var(--bg-header); height: 100dvh; padding-top: 64px"
>
  <!-- Декор -->
  <div
    class="absolute top-0 right-0 w-[700px] h-[700px] rounded-full opacity-[0.04] blur-3xl pointer-events-none"
  ></div>
  <div
    class="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-[0.03] blur-3xl pointer-events-none"
    style="background: var(--primary); transform: translate(-35%, 35%)"
  ></div>

  <div
    class="max-w-4xl mx-auto px-4 sm:px-6 w-full relative z-10 flex flex-col items-center text-center"
  >
    <!-- Заголовок -->
    <h1
      class="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-4 tracking-tight"
      style="color: var(--foreground)"
    >
      Знайдіть майстра<br />
      на <span style="color: var(--primary)">будь-яке</span> завдання
    </h1>

    <p
      class="text-base md:text-lg mb-10 max-w-sm leading-relaxed"
      style="color: var(--muted-foreground)"
    >
      Онлайн-сервіс замовлення послуг
    </p>

    <!-- Інпут + підказки -->
    <div class="w-full max-w-xl mb-5 relative z-[60]">
      <!-- Поле вводу -->
      <div
        class="flex items-center border transition-all duration-200"
        class:rounded-2xl={!showSuggestions && !showEmpty}
        class:rounded-t-2xl={showSuggestions || showEmpty}
        style="
          height: 56px;
          background-color: color-mix(in oklch, var(--foreground) 5%, transparent);
          border-color: color-mix(in oklch, var(--foreground) 10%, transparent);
        "
      >
        <Search
          class="w-4 h-4 shrink-0 ml-4"
          style="color: var(--muted-foreground)"
        />

        <div class="flex-1 relative h-full">
          {#if !searchValue && !focused}
            <span
              class="absolute left-3 top-1/2 -translate-y-1/2 text-sm pointer-events-none select-none transition-opacity duration-300"
              style="color: var(--muted-foreground); opacity: {placeholderVisible
                ? 1
                : 0}"
            >
              {placeholders[placeholderIndex]}
            </span>
          {/if}
          <input
            bind:this={inputEl}
            bind:value={searchValue}
            type="text"
            placeholder={focused ? 'Що вам потрібно?' : ''}
            class="w-full h-full px-3 bg-transparent outline-none text-sm"
            style="color: var(--foreground)"
            onfocus={() => (focused = true)}
            onblur={() => setTimeout(() => (focused = false), 200)}
            oninput={handleInput}
            onkeydown={(e) => {
              if (e.key === 'Enter') handleSearch()
              if (e.key === 'Escape') {
                focused = false
                inputEl?.blur()
              }
            }}
          />
        </div>

        {#if searchValue}
          <button
            type="button"
            onclick={clear}
            class="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 cursor-pointer transition-opacity hover:opacity-70"
            style="color: var(--muted-foreground)"
          >
            <X class="w-3.5 h-3.5" />
          </button>
        {/if}

        <div class="pr-2 shrink-0">
          <Button
            onclick={() => handleSearch()}
            class="h-10 px-6 rounded-xl text-sm font-medium"
          >
            Знайти
          </Button>
        </div>
      </div>

      <!-- Підказки з результатами -->
      {#if showSuggestions}
        <div
          transition:fly={{ y: -4, duration: 150 }}
          class="absolute top-full left-0 right-0 rounded-b-2xl overflow-hidden border border-t-0"
          style="
            background-color: var(--bg-header);
            border-color: color-mix(in oklch, var(--foreground) 10%, transparent);
            box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          "
        >
          {#each suggestions as s, i}
            <button
              type="button"
              onclick={() => handleSearch(s.text)}
              class="w-full flex items-center justify-between gap-3 px-4 py-3 text-left cursor-pointer group transition-colors"
              style="border-top: {i === 0
                ? 'none'
                : '1px solid color-mix(in oklch, var(--foreground) 5%, transparent)'}"
              onmouseenter={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  'color-mix(in oklch, var(--foreground) 4%, transparent)')}
              onmouseleave={(e) =>
                ((e.currentTarget as HTMLElement).style.backgroundColor =
                  'transparent')}
            >
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style="background-color: color-mix(in oklch, var(--primary) 8%, transparent)"
                >
                  <Search class="w-3 h-3" style="color: var(--primary)" />
                </div>
                <div class="min-w-0 text-left">
                  <p
                    class="text-sm font-medium truncate"
                    style="color: var(--foreground)"
                  >
                    {s.text}
                  </p>
                  <p
                    class="text-xs truncate"
                    style="color: var(--muted-foreground)"
                  >
                    {s.category}
                  </p>
                </div>
              </div>
              <ArrowRight
                class="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-150 -translate-x-1 group-hover:translate-x-0"
                style="color: var(--primary)"
              />
            </button>
          {/each}
        </div>
      {/if}

      <!-- Порожній стан -->
      {#if showEmpty}
        <div
          transition:fade={{ duration: 150 }}
          class="absolute top-full left-0 right-0 rounded-b-2xl py-7 flex flex-col items-center gap-1.5 border border-t-0"
          style="
            background-color: var(--bg-header);
            border-color: color-mix(in oklch, var(--foreground) 10%, transparent);
            box-shadow: 0 12px 40px rgba(0,0,0,0.12);
          "
        >
          <Search
            class="w-6 h-6 mb-1"
            style="color: var(--muted-foreground); opacity: 0.25"
          />
          <p class="text-sm" style="color: var(--muted-foreground)">
            Нічого не знайдено для
            <span class="font-medium" style="color: var(--foreground)"
              >«{searchValue}»</span
            >
          </p>
          <p
            class="text-xs"
            style="color: var(--muted-foreground); opacity: 0.5"
          >
            Спробуйте інший запит
          </p>
        </div>
      {/if}
    </div>

    <!-- Теги -->
    <div class="flex flex-wrap justify-center items-center gap-2">
      <span class="text-xs" style="color: var(--muted-foreground)"
        >Наприклад:</span
      >
      {#each popularTags as tag}
        <button
          type="button"
          onclick={() => handleSearch(tag)}
          class="text-xs px-3 py-1.5 rounded-full border transition-all hover:opacity-70 cursor-pointer"
          style="
            border-color: color-mix(in oklch, var(--foreground) 12%, transparent);
            color: var(--muted-foreground);
            background-color: color-mix(in oklch, var(--foreground) 4%, transparent)
          "
        >
          {tag}
        </button>
      {/each}
    </div>
  </div>
</section>
