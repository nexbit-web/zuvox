<!-- src/lib/components/header/user-menu.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import * as Popover from '$lib/components/ui/popover'
  import {
    Bell,
    MessageSquare,
    MessageCircle,
    User,
    LogOut,
    Settings,
    Plus,
    CircleUserRound,
    Briefcase,
    Wallet,
  } from 'lucide-svelte'
  import { signOut } from '$lib/auth-client'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'
  import { chatStore } from '$lib/stores/chat-store.svelte'
  import { getPusher } from '$lib/pusher-client'

  let { onnavigate }: { onnavigate: (url: string) => void } = $props()

  const session = $derived($page.data.session)
  const isLoggedIn = $derived(!!session?.user)
  const isFreelancer = $derived(session?.user?.role === 'FREELANCER')

  const user = $derived(
    session?.user
      ? {
          name: session.user.name ?? 'Користувач',
          email: session.user.email ?? '',
          avatar: session.user.image ?? '',
          initials: (session.user.name ?? 'U')[0].toUpperCase(),
        }
      : null,
  )

  // ─── Реальні лічильники з chatStore ───
  const messageCount = $derived(chatStore.totalUnread)

  // ─── Notifications ───
  interface Notification {
    id: string
    type: string
    title: string
    body: string | null
    orderId: string | null
    proposalId: string | null
    jobId: string | null
    chatId: string | null
    isRead: boolean
    createdAt: string
  }

  let notifications = $state<Notification[]>([])
  let notifUnreadCount = $state(0)
  let notifPopoverOpen = $state(false)
  let notifLoading = $state(false)
  let notifInitialized = $state(false)
  let pusherChannel: any = null

  async function loadNotifications() {
    if (!session?.user?.id) return
    notifLoading = true
    try {
      const res = await fetch('/api/notifications?limit=20')
      if (!res.ok) return
      const json = await res.json()
      notifications = json.items
      notifUnreadCount = json.unreadCount
      notifInitialized = true
    } catch {
      // ignore
    } finally {
      notifLoading = false
    }
  }

  async function markNotifRead(id: string) {
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, isRead: true } : n,
    )
    if (notifications.find((n) => n.id === id && n.isRead)) {
      // вже відмічений — нічого
    } else {
      notifUnreadCount = Math.max(0, notifUnreadCount - 1)
    }
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-read', ids: [id] }),
    }).catch(() => {})
  }

  async function markAllNotifRead() {
    notifications = notifications.map((n) => ({ ...n, isRead: true }))
    notifUnreadCount = 0
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-all-read' }),
    }).catch(() => {})
  }

  function notifLink(n: Notification): string {
    if (n.orderId) return `/orders/${n.orderId}`
    // PROPOSAL_NEW — клієнт отримує сповіщення → ведемо на свою job-сторінку
    if (n.type === 'PROPOSAL_NEW' && n.jobId) return `/jobs/${n.jobId}`
    // PROPOSAL_ACCEPTED/REJECTED — фрілансер отримує → у dashboard
    if (n.proposalId) return '/dashboard/proposals'
    if (n.jobId) return `/jobs/${n.jobId}`
    if (n.chatId) return `/messages/${n.chatId}`
    return '/notifications'
  }

  async function handleNotifClick(n: Notification) {
    if (!n.isRead) await markNotifRead(n.id)
    notifPopoverOpen = false
    goto(notifLink(n))
  }

  function notifIconFor(type: string): typeof Briefcase {
    if (type.startsWith('ORDER_')) return Briefcase
    if (type.startsWith('PROPOSAL_')) return MessageSquare
    if (type === 'WALLET_LOW') return Wallet
    if (type === 'REVIEW_RECEIVED') return Bell
    return Bell
  }

  function formatRelativeShort(iso: string): string {
    const date = new Date(iso)
    const diffMs = Date.now() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHr / 24)
    if (diffMin < 1) return 'щойно'
    if (diffMin < 60) return `${diffMin} хв`
    if (diffHr < 24) return `${diffHr} год`
    return `${diffDays} д`
  }

  // ─── Підписка на Pusher для real-time оновлення notifications ───
  onMount(() => {
    if (session?.user.id && !chatStore.initialized) {
      // Прелоадимо список чатів щоб бейдж був точним
      fetch('/api/chats')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.chats) chatStore.setChats(j.chats)
        })
        .catch(() => {})
      chatStore.subscribeToUserEvents(session.user.id)
    }

    if (session?.user?.id) {
      // Завантажуємо notifications
      loadNotifications()

      // Підписка на real-time notifications
      try {
        const pusher = getPusher()
        pusherChannel = pusher.subscribe(`private-user-${session.user.id}`)
        pusherChannel.bind('notification', (data: Notification) => {
          notifications = [data, ...notifications].slice(0, 50)
          notifUnreadCount++
          // Опційний звук
          try {
            const audio = new Audio('/notification.mp3')
            audio.volume = 0.3
            audio.play().catch(() => {})
          } catch {
            // ignore
          }
        })
      } catch {
        // Pusher може бути недоступний
      }
    }
  })

  onDestroy(() => {
    if (pusherChannel) {
      try {
        pusherChannel.unbind('notification')
        // Не unsubscribe — інші компоненти теж слухають private-user-*
      } catch {
        // ignore
      }
    }
  })

  // Перезавантажити при відкритті popover (якщо ще не ініціалізовано)
  $effect(() => {
    if (notifPopoverOpen && !notifInitialized) {
      loadNotifications()
    }
  })

  async function handleSignOut() {
    chatStore.unsubscribeAll()
    if (pusherChannel) {
      try {
        pusherChannel.unbind('notification')
      } catch {
        // ignore
      }
    }
    await signOut()
    await invalidateAll()
    goto('/')
  }

  function formatBadge(n: number): string {
    return n > 99 ? '99+' : String(n)
  }
</script>

<div class="flex items-center gap-1 shrink-0">
  {#if !isLoggedIn}
    <button
      type="button"
      onclick={() => onnavigate('/user/login')}
      class="hidden sm:flex items-center h-11 px-4 rounded-full text-sm font-medium cursor-pointer transition-colors"
      style="color: white"
      onmouseenter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          'rgba(255,255,255,0.06)')}
      onmouseleave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          'transparent')}
    >
      Увійти
    </button>
    <button
      type="button"
      onclick={() => onnavigate('/user/register')}
      class="inline-flex items-center h-11 px-5 rounded-full text-sm font-semibold cursor-pointer transition-colors"
      style="background-color: white; color: black;"
      onmouseenter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = '#e5e5e5')}
      onmouseleave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor = 'white')}
    >
      Реєстрація
    </button>
  {:else}
    <!-- Повідомлення -->
    <button
      type="button"
      onclick={() => onnavigate('/messages')}
      class="group relative flex flex-col items-center justify-center h-16 w-16 rounded-xl cursor-pointer transition-colors"
      aria-label="Повідомлення"
      onmouseenter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          'rgba(255,255,255,0.06)')}
      onmouseleave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          'transparent')}
    >
      <div class="relative">
        <MessageCircle class="size-[22px]" strokeWidth={1.75} color="white" />
        {#if messageCount > 0}
          <span
            class="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 pointer-events-none"
            style="background-color: white; color: black; border: 1.5px solid white;"
          >
            {formatBadge(messageCount)}
          </span>
        {/if}
      </div>
      <span
        class="text-[10px] font-medium mt-1.5 leading-none"
        style="color: rgba(255,255,255,0.85)"
      >
        Чат
      </span>
    </button>

    <!-- Сповіщення -->
    <Popover.Root bind:open={notifPopoverOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            class="group relative flex flex-col items-center justify-center h-16 w-16 rounded-xl cursor-pointer transition-colors"
            aria-label="Сповіщення"
            onmouseenter={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor =
                'rgba(255,255,255,0.06)')}
            onmouseleave={(e) =>
              ((e.currentTarget as HTMLElement).style.backgroundColor =
                'transparent')}
          >
            <div class="relative">
              <Bell class="size-[22px]" strokeWidth={1.75} color="white" />
              {#if notifUnreadCount > 0}
                <span
                  class="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 pointer-events-none"
                  style="background-color: #ef4444; color: white;"
                >
                  {formatBadge(notifUnreadCount)}
                </span>
              {/if}
            </div>
            <span
              class="text-[10px] font-medium mt-1.5 leading-none"
              style="color: rgba(255,255,255,0.85)"
            >
              Сповіщення
            </span>
          </button>
        {/snippet}
      </Popover.Trigger>

      <Popover.Content class="w-80 p-0" align="end" sideOffset={8}>
        <div
          class="flex items-center justify-between px-4 py-3"
          style="border-bottom: 1px solid var(--border)"
        >
          <h3 class="text-sm font-semibold" style="color: var(--foreground)">
            Сповіщення
          </h3>
          {#if notifUnreadCount > 0}
            <button
              type="button"
              onclick={markAllNotifRead}
              class="text-xs cursor-pointer hover:underline"
              style="color: var(--primary)"
            >
              Прочитати всі
            </button>
          {/if}
        </div>

        <div class="max-h-[400px] overflow-y-auto">
          {#if !notifInitialized && notifLoading}
            <div class="p-8 text-center">
              <p class="text-xs" style="color: var(--muted-foreground)">
                Завантаження…
              </p>
            </div>
          {:else if notifications.length === 0}
            <div class="p-8 text-center">
              <Bell
                class="size-8 mx-auto mb-2"
                style="color: var(--muted-foreground); opacity: 0.5"
              />
              <p class="text-xs" style="color: var(--muted-foreground)">
                Немає сповіщень
              </p>
            </div>
          {:else}
            {#each notifications as n (n.id)}
              {@const Icon = notifIconFor(n.type)}
              <button
                type="button"
                onclick={() => handleNotifClick(n)}
                class="w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer transition-colors hover:bg-[var(--accent)]"
                style="border-bottom: 1px solid var(--border);
                       background-color: {n.isRead
                  ? 'transparent'
                  : 'color-mix(in srgb, var(--primary) 5%, transparent)'}"
              >
                {#if !n.isRead}
                  <div
                    class="size-2 rounded-full shrink-0 mt-2"
                    style="background-color: var(--primary)"
                  ></div>
                {:else}
                  <div class="size-2 shrink-0 mt-2"></div>
                {/if}
                <div
                  class="size-8 rounded-full shrink-0 flex items-center justify-center"
                  style="background-color: var(--muted)"
                >
                  <Icon class="size-4" style="color: var(--muted-foreground)" />
                </div>
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-medium leading-snug"
                    style="color: var(--foreground)"
                  >
                    {n.title}
                  </p>
                  {#if n.body}
                    <p
                      class="text-xs mt-0.5 leading-snug line-clamp-2"
                      style="color: var(--muted-foreground)"
                    >
                      {n.body}
                    </p>
                  {/if}
                  <p
                    class="text-[10px] mt-1"
                    style="color: var(--muted-foreground)"
                  >
                    {formatRelativeShort(n.createdAt)}
                  </p>
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </Popover.Content>
    </Popover.Root>

    <!-- Профіль -->
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <div
          class="group flex flex-col items-center justify-center h-16 w-16 rounded-xl cursor-pointer transition-colors"
          onmouseenter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              'rgba(255,255,255,0.06)')}
          onmouseleave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor =
              'transparent')}
        >
          {#if user?.avatar}
            <Avatar class="size-[22px]">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback
                class="text-[9px] font-semibold"
                style="background-color: rgba(255,255,255,0.12); color: white"
              >
                {user.initials}
              </AvatarFallback>
            </Avatar>
          {:else}
            <CircleUserRound
              class="size-[22px]"
              strokeWidth={1.75}
              color="white"
            />
          {/if}
          <span
            class="text-[10px] font-medium mt-1.5 leading-none"
            style="color: rgba(255,255,255,0.85)"
          >
            Профіль
          </span>
        </div>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content class="w-56 mt-2" align="end">
        <div class="px-3 py-3 flex items-center gap-2.5">
          <Avatar class="size-9 shrink-0">
            <AvatarImage src={user?.avatar ?? ''} alt={user?.name ?? ''} />
            <AvatarFallback class="text-xs font-semibold">
              {user?.initials ?? 'U'}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{user?.name}</p>
            <p class="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <DropdownMenu.Separator />

        <DropdownMenu.Group>
          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => goto('/dashboard')}
          >
            <User class="size-3.5 text-muted-foreground" />
            <span>Мій профіль</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => goto('/messages')}
          >
            <MessageSquare class="size-3.5 text-muted-foreground" />
            <span>Повідомлення</span>
            {#if messageCount > 0}
              <span
                class="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style="background-color: var(--foreground); color: var(--background)"
              >
                {messageCount}
              </span>
            {/if}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => goto('/orders')}
          >
            <Briefcase class="size-3.5 text-muted-foreground" />
            <span>Замовлення</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => goto('/dashboard/wallet')}
          >
            <Wallet class="size-3.5 text-muted-foreground" />
            <span>Гаманець</span>
          </DropdownMenu.Item>

          {#if isFreelancer}
            <DropdownMenu.Item
              class="gap-2 cursor-pointer"
              onclick={() => goto('/dashboard/gigs/new')}
            >
              <Plus class="size-3.5 text-muted-foreground" />
              <span>Новий гіг</span>
            </DropdownMenu.Item>
          {/if}

          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => goto('/settings')}
          >
            <Settings class="size-3.5 text-muted-foreground" />
            <span>Налаштування</span>
          </DropdownMenu.Item>
        </DropdownMenu.Group>

        <DropdownMenu.Separator />

        <DropdownMenu.Item
          class="gap-2 cursor-pointer text-destructive focus:text-destructive"
          onclick={handleSignOut}
        >
          <LogOut class="size-3.5" />
          <span>Вийти</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
