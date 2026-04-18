<script lang="ts">
  import { Home, LayoutGrid, Bell, User, MessageCircle } from 'lucide-svelte'
  import { page } from '$app/stores'

  let {
    onnavigate,
    oncatalog,
    hasNotifications = false,
  }: {
    onnavigate: (url: string) => void
    oncatalog: () => void
    hasNotifications: boolean
  } = $props()

  const items = [
    {
      id: 'home',
      icon: Home,
      label: 'Головна',
      href: '/',
      action: () => onnavigate('/'),
    },
    {
      id: 'catalog',
      icon: LayoutGrid,
      label: 'Каталог',
      href: null,
      action: () => oncatalog(),
    },
    {
      id: 'messages',
      icon: MessageCircle,
      label: 'Чат',
      href: '/messages',
      action: () => onnavigate('/messages'),
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Сповіщення',
      href: '/notifications',
      badge: true,
      action: () => onnavigate('/notifications'),
    },
    {
      id: 'profile',
      icon: User,
      label: 'Профіль',
      href: '/dashboard',
      action: () => onnavigate('/dashboard'),
    },
  ]

  // Визначаємо активний пункт з URL
  function isActive(item: (typeof items)[0]): boolean {
    if (item.id === 'catalog') return false
    if (item.href === '/') return $page.url.pathname === '/'
    return item.href ? $page.url.pathname.startsWith(item.href) : false
  }
</script>

<nav
  class="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 flex items-center"
  style="background-color: var(--bg-header); padding-bottom: env(safe-area-inset-bottom, 0px)"
>
  {#each items as item}
    <button
      type="button"
      onclick={item.action}
      class="flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors cursor-pointer relative"
    >
      {#if isActive(item)}
        <span
          class="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full"
        ></span>
      {/if}

      <div class="relative">
        <item.icon
          class="w-5 h-5 transition-colors
            {isActive(item) ? 'text-primary' : 'text-foreground/50'}"
        />
        {#if item.badge && hasNotifications}
          <span
            class="absolute -top-1 -right-1.5 w-3.5 h-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center border border-[var(--bg-header)]"
          >
            5
          </span>
        {/if}
      </div>

      <span
        class="text-[10px] font-medium leading-none transition-colors
          {isActive(item) ? 'text-primary' : 'text-foreground/50'}"
      >
        {item.label}
      </span>
    </button>
  {/each}
</nav>

<div class="md:hidden h-8"></div>
