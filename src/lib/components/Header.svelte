<script lang="ts">
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Button } from '$lib/components/ui/button'
  import {
    Bell, MessageSquare, User, LogOut,
    Settings, Plus, ChevronRight,
    X, Search, LayoutGrid
  } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { fly, fade } from 'svelte/transition'

  type Role = 'guest' | 'client' | 'freelancer'

  interface Service { text: string; category: string }
  interface SubCategory { title: string; items: string[] }
  interface Category { name: string; icon: string; subs: SubCategory[] }

  let role = $state<Role>('freelancer')
  let hasNotifications = $state(true)
  let searchValue = $state('')
  let scrolled = $state(false)
  let visible = $state(true)
  let catalogOpen = $state(false)
  let activeCategory = $state(0)
  let searchFocused = $state(false)
  let searchRef = $state<HTMLInputElement | undefined>(undefined)
  let lastScrollY = 0
  let scrollTimer: ReturnType<typeof setTimeout> | null = null
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let searchQuery = $state('')

  const categories: Category[] = [
    {
      name: 'Веб-розробка', icon: '💻',
      subs: [
        { title: 'Frontend', items: ['React / Next.js', 'Vue / Nuxt', 'SvelteKit', 'HTML / CSS', 'TypeScript'] },
        { title: 'Backend', items: ['Node.js', 'Python / Django', 'PHP / Laravel', 'API інтеграція', 'GraphQL'] },
        { title: 'CMS', items: ['WordPress', 'Webflow', 'Shopify', 'Strapi', 'Sanity'] },
      ],
    },
    {
      name: 'UI/UX Дизайн', icon: '🎨',
      subs: [
        { title: 'Веб-дизайн', items: ['Лендінги', 'Корпоративні сайти', 'Інтернет-магазини', 'Dashboard'] },
        { title: 'Мобільний', items: ['iOS дизайн', 'Android дизайн', 'Прототипування', 'Анімації Figma'] },
        { title: 'Брендинг', items: ['Логотипи', 'Фірмовий стиль', 'Гайдлайни', 'Упаковка'] },
      ],
    },
    {
      name: 'Мобільні застосунки', icon: '📱',
      subs: [
        { title: 'iOS', items: ['Swift', 'React Native', 'Flutter', 'Expo'] },
        { title: 'Android', items: ['Kotlin', 'React Native', 'Flutter', 'Java'] },
        { title: 'Крос-платформа', items: ['Flutter', 'React Native', 'Ionic', 'Capacitor'] },
      ],
    },
    {
      name: 'SEO та маркетинг', icon: '📈',
      subs: [
        { title: 'SEO', items: ['Технічний SEO', 'Контентний SEO', 'Локальний SEO', 'Аудит сайту'] },
        { title: 'Реклама', items: ['Google Ads', 'Facebook Ads', 'TikTok Ads', 'Таргетинг'] },
        { title: 'SMM', items: ['Instagram', 'TikTok', 'LinkedIn', 'Telegram'] },
      ],
    },
    {
      name: 'Копірайтинг', icon: '✍️',
      subs: [
        { title: 'Тексти', items: ['Статті та блоги', 'SEO-тексти', 'Описи товарів', 'Прес-релізи'] },
        { title: 'Реклама', items: ['Рекламні тексти', 'Email-розсилки', 'Скрипти продажів', 'Слогани'] },
        { title: 'Переклади', items: ['Укр / Англ', 'Технічні', 'Юридичні', 'Субтитри'] },
      ],
    },
    {
      name: 'Відео та анімація', icon: '🎬',
      subs: [
        { title: 'Відео', items: ['Монтаж', 'Відеографія', 'Reels / Shorts', 'YouTube'] },
        { title: 'Анімація', items: ['2D анімація', '3D анімація', 'Motion graphics', 'Лого анімація'] },
        { title: 'Озвучення', items: ['Дикторське озвучення', 'Подкасти', 'Аудіокниги', 'Реклама'] },
      ],
    },
    {
      name: 'Фото та графіка', icon: '📷',
      subs: [
        { title: 'Фото', items: ['Предметна зйомка', 'Портретна', 'Репортажна', 'Обробка фото'] },
        { title: 'Графіка', items: ['Ілюстрації', 'Іконки', 'Інфографіка', 'Банери'] },
        { title: 'Поліграфія', items: ['Флаєри', 'Візитки', 'Плакати', 'Презентації'] },
      ],
    },
    {
      name: 'Бізнес-послуги', icon: '💼',
      subs: [
        { title: 'Консалтинг', items: ['Бізнес-аналіз', 'Стратегія', 'Фінансовий аналіз', 'HR'] },
        { title: 'Юридичні', items: ['Договори', 'Реєстрація ФОП', 'Патенти', 'Авторські права'] },
        { title: 'Бухгалтерія', items: ['Облік', 'Звітність', '1С', 'Аудит'] },
      ],
    },
    {
      name: 'Освіта та навчання', icon: '🎓',
      subs: [
        { title: 'IT навчання', items: ['Програмування', 'Дизайн', 'Верстка', 'DevOps'] },
        { title: 'Мови', items: ['Англійська', 'Польська', 'Німецька', 'Іспанська'] },
        { title: 'Шкільні предмети', items: ['Математика', 'ЗНО / НМТ', 'Фізика', 'Хімія'] },
      ],
    },
    {
      name: 'Аудіо та музика', icon: '🎵',
      subs: [
        { title: 'Створення', items: ['Написання треків', 'Аранжування', 'Мікшування', 'Мастеринг'] },
        { title: 'Запис', items: ['Вокал', 'Подкаст', 'Аудіокнига', 'Джингл'] },
        { title: 'Партитури', items: ['Ноти', 'Транскрипція', 'Табулатури', 'MIDI'] },
      ],
    },
  ]

  const allServices: Service[] = categories.flatMap(cat =>
    cat.subs.flatMap(sub =>
      sub.items.map(item => ({
        text: item,
        category: `${cat.name} / ${sub.title}`,
      }))
    )
  )

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

  $effect(() => {
    document.body.style.overflow = catalogOpen ? 'hidden' : ''
  })

  const user = { name: 'Олексій Коваль', username: '@alexkoval', avatar: '' }

  const isGuest = $derived(role === 'guest')
  const isFreelancer = $derived(role === 'freelancer')
  const isLoggedIn = $derived(role === 'client' || role === 'freelancer')

  function closeAll() {
    catalogOpen = false
    searchFocused = false
  }

  function navigate(url: string) {
    closeAll()
    window.location.href = url
  }

  onMount(() => {
    lastScrollY = window.scrollY

    function handleScroll() {
      if (scrollTimer) return
      scrollTimer = setTimeout(() => {
        scrollTimer = null
        const currentY = window.scrollY
        scrolled = currentY > 10
        if (currentY < 10) {
          visible = true
        } else if (currentY > lastScrollY + 8) {
          visible = false
          closeAll()
        } else if (currentY < lastScrollY - 8) {
          visible = true
        }
        lastScrollY = currentY
      }, 50)
    }

    function handleClickOutside(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (!t.closest('[data-catalog]')) catalogOpen = false
      if (!t.closest('[data-search]')) searchFocused = false
    }

    function handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeAll()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleKeydown)
      document.body.style.overflow = ''
      if (scrollTimer) clearTimeout(scrollTimer)
      if (searchTimer) clearTimeout(searchTimer)
    }
  })
</script>

{#if showSuggestions || catalogOpen}
  <div
    transition:fade={{ duration: 150 }}
    class="fixed inset-0 bg-black/30 z-40"
    onclick={closeAll}
    role="presentation"
  ></div>
{/if}

<div
  class="fixed top-0 left-0 right-0 z-50 transition-transform duration-300 will-change-transform
    {visible ? 'translate-y-0' : '-translate-y-full'}"
>
  <header
    class="border-b border-border/40 transition-colors duration-300
      {scrolled ? 'bg-background/90 backdrop-blur-md shadow-sm' : 'bg-background'}"
  >
    <div class="max-w-7xl mx-auto h-16 px-4 sm:px-6 grid grid-cols-[auto_1fr_auto] items-center gap-4">

      <!-- Ліва частина: каталог + лого -->
      <div class="flex items-center gap-3 shrink-0">

        <!-- Іконка каталогу -->
        <div data-catalog>
          <button
            onclick={() => {
              catalogOpen = !catalogOpen
              searchFocused = false
              activeCategory = 0
            }}
            class="w-10 h-10 flex items-center justify-center rounded-xl transition-colors cursor-pointer
              {catalogOpen
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
          >
            {#if catalogOpen}
              <X class="w-5 h-5" />
            {:else}
              <LayoutGrid class="w-5 h-5" />
            {/if}
          </button>
        </div>

        <!-- Лого — місце для логотипу -->
        <a href="/" class="font-bold text-2xl tracking-tight">
          Zuvox
        </a>

      </div>

      <!-- Центр: інпут по центру -->
      <div data-search class="flex justify-center">
        <div class="relative w-full max-w-2xl">

          <!-- Інпут блок -->
          <div
            class="flex items-center h-11 border border-border/60 rounded-xl overflow-hidden transition-colors
              {showSuggestions
                ? 'border-border bg-background'
                : 'bg-muted/40 hover:border-border/80'}"
          >

            <!-- Назва категорії зліва — тільки текст без іконки -->
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <button
                  class="flex items-center gap-1 h-11 pl-4 pr-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 border-r border-border/40 whitespace-nowrap"
                >
                  Всі категорії
                  <ChevronRight class="w-3.5 h-3.5 opacity-50 rotate-90 shrink-0" />
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content class="w-56" align="start">
                <DropdownMenu.Label class="text-xs text-muted-foreground">
                  Категорії послуг
                </DropdownMenu.Label>
                <DropdownMenu.Separator />
                {#each categories as cat, i}
                  <DropdownMenu.Item
                    class="gap-2.5 cursor-pointer text-sm"
                    onclick={() => activeCategory = i}
                  >
                    <span class="text-base">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </DropdownMenu.Item>
                {/each}
              </DropdownMenu.Content>
            </DropdownMenu.Root>

            <!-- Текстовий інпут -->
            <input
              bind:this={searchRef}
              type="text"
              placeholder="Яку послугу шукаєте?"
              bind:value={searchValue}
              onfocus={() => { searchFocused = true; catalogOpen = false }}
              onblur={() => setTimeout(() => searchFocused = false, 200)}
              oninput={handleInput}
              class="flex-1 h-11 px-3 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground text-foreground"
            />

            <!-- Хрестик -->
            {#if searchValue}
              <button
                onclick={() => { searchValue = ''; searchQuery = ''; searchRef?.focus() }}
                class="w-9 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
              >
                <X class="w-4 h-4" />
              </button>
            {/if}

            <!-- Іконка пошуку справа -->
            <button
              onclick={() => { if (searchValue.trim()) navigate(`/gigs?q=${encodeURIComponent(searchValue)}`) }}
              class="w-11 h-11 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 border-l border-border/40"
            >
              <Search class="w-4 h-4" />
            </button>

          </div>

          <!-- Підказки пошуку -->
          {#if showSuggestions}
            <div
              transition:fly={{ y: -4, duration: 150 }}
              class="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-xl overflow-hidden z-50 shadow-lg"
            >
              {#if hasResults}
                {#each suggestions as s (s.text + s.category)}
                  <button
                    onclick={() => navigate(`/gigs?q=${encodeURIComponent(s.text)}`)}
                    class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors cursor-pointer text-left"
                  >
                    <Search class="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div class="min-w-0 flex-1">
                      <p class="text-sm text-foreground">{s.text}</p>
                      <p class="text-xs text-muted-foreground truncate">{s.category}</p>
                    </div>
                  </button>
                {/each}
              {:else}
                <div class="flex flex-col items-center py-8 gap-2">
                  <Search class="w-8 h-8 text-muted-foreground/30" />
                  <p class="text-sm text-muted-foreground text-center">
                    Послугу <span class="font-medium text-foreground">«{searchValue}»</span> не знайдено
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

      <!-- Права частина: тільки іконки -->
      <div class="flex items-center gap-1 shrink-0">

        {#if isGuest}
          <Button
            variant="ghost"
            size="sm"
            class="hidden sm:flex text-sm cursor-pointer"
            onclick={() => navigate('/login')}
          >
            Увійти
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="text-xs sm:text-sm cursor-pointer"
            onclick={() => navigate('/register')}
          >
            Реєстрація
          </Button>
        {/if}

        {#if isLoggedIn}

          <button
            onclick={() => navigate('/messages')}
            class="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <MessageSquare class="w-5 h-5" />
          </button>

          <div class="relative">
            <button
              class="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <Bell class="w-5 h-5" />
            </button>
            {#if hasNotifications}
              <span class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background pointer-events-none">
                5
              </span>
            {/if}
          </div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <button
                class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors cursor-pointer"
              >
                <Avatar class="h-7 w-7">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback class="bg-primary/10 text-primary text-[11px] font-semibold">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Content class="w-52 mt-1" align="end">
              <div class="px-3 py-2.5">
                <p class="text-sm font-medium truncate">{user.name}</p>
                <p class="text-xs text-muted-foreground truncate">{user.username}</p>
              </div>
              <DropdownMenu.Separator />
              <DropdownMenu.Group>
                <DropdownMenu.Item class="gap-2 cursor-pointer" onclick={() => navigate('/dashboard')}>
                  <User class="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Мій профіль</span>
                </DropdownMenu.Item>
                <DropdownMenu.Item class="sm:hidden gap-2 cursor-pointer" onclick={() => navigate('/messages')}>
                  <MessageSquare class="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Повідомлення</span>
                </DropdownMenu.Item>
                {#if isFreelancer}
                  <DropdownMenu.Item class="gap-2 cursor-pointer" onclick={() => navigate('/gigs/create')}>
                    <Plus class="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Новий гіг</span>
                  </DropdownMenu.Item>
                {/if}
                <DropdownMenu.Item class="gap-2 cursor-pointer" onclick={() => navigate('/settings')}>
                  <Settings class="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Налаштування</span>
                </DropdownMenu.Item>
              </DropdownMenu.Group>
              <DropdownMenu.Separator />
              <DropdownMenu.Item class="gap-2 cursor-pointer text-destructive focus:text-destructive">
                <LogOut class="w-3.5 h-3.5" />
                <span>Вийти</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>

        {/if}
      </div>
    </div>
  </header>

  <!-- Каталог -->
  {#if catalogOpen}
    <div
      data-catalog
      transition:fly={{ y: -8, duration: 200 }}
      class="catalog-wrap flex bg-background border-b border-border/40 shadow-md"
      style="height: 90vh"
    >
      <div class="catalog-sidebar w-64 border-r border-border/40 shrink-0 py-3">
        {#each categories as cat, i}
          <button
            onmouseenter={() => activeCategory = i}
            onclick={() => navigate(`/gigs?category=${encodeURIComponent(cat.name)}`)}
            class="w-full flex items-center justify-between px-5 py-3 text-sm transition-colors cursor-pointer
              {activeCategory === i
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}"
          >
            <span class="flex items-center gap-3">
              <span class="text-base leading-none">{cat.icon}</span>
              <span>{cat.name}</span>
            </span>
            <ChevronRight class="w-4 h-4 shrink-0 {activeCategory === i ? 'opacity-60' : 'opacity-30'}" />
          </button>
        {/each}
      </div>

      <div class="catalog-content flex-1 px-8 py-6">
        {#key activeCategory}
          <div transition:fade={{ duration: 100 }}>
            <a
              href="/gigs?category={encodeURIComponent(categories[activeCategory].name)}"
              onclick={() => closeAll()}
              class="flex items-center gap-3 mb-6 group cursor-pointer w-fit"
            >
              <span class="text-2xl">{categories[activeCategory].icon}</span>
              <h2 class="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
                {categories[activeCategory].name}
              </h2>
              <ChevronRight class="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>

            <div class="grid grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
              {#each categories[activeCategory].subs as sub}
                <div>
                  <h3 class="text-sm font-semibold text-foreground mb-3">{sub.title}</h3>
                  <div class="space-y-2">
                    {#each sub.items as item}
                       <a
                        href="/gigs?sub={encodeURIComponent(item)}"
                        onclick={() => closeAll()}
                        class="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {item}
                      </a>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/key}
      </div>
    </div>
  {/if}

</div>

 

<style>
  .catalog-sidebar {
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }
  .catalog-content {
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }
  .catalog-sidebar:hover {
    scrollbar-color: color-mix(in oklch, currentColor 20%, transparent) transparent;
  }
  .catalog-content:hover {
    scrollbar-color: color-mix(in oklch, currentColor 20%, transparent) transparent;
  }
  .catalog-sidebar::-webkit-scrollbar,
  .catalog-content::-webkit-scrollbar { width: 4px; }
  .catalog-sidebar::-webkit-scrollbar-track,
  .catalog-content::-webkit-scrollbar-track { background: transparent; }
  .catalog-sidebar::-webkit-scrollbar-thumb,
  .catalog-content::-webkit-scrollbar-thumb { background: transparent; border-radius: 999px; }
  .catalog-sidebar:hover::-webkit-scrollbar-thumb,
  .catalog-content:hover::-webkit-scrollbar-thumb { background: hsl(var(--border)); }
  .catalog-sidebar:hover::-webkit-scrollbar-thumb:hover,
  .catalog-content:hover::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.4); }
</style>