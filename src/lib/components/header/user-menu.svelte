<!-- src/lib/components/header/user-menu.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import {
    Bell,
    MessageSquare,
    MessageCircle,
    User,
    LogOut,
    Settings,
    Plus,
    CircleUserRound,
  } from 'lucide-svelte'
  import { signOut } from '$lib/auth-client'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'
  import { chatStore } from '$lib/stores/chat-store.svelte'

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
  const notifCount = 0 // TODO: коли буде Notification модель

  // Підписатись на персональний канал коли юзер залогінений
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
  })

  async function handleSignOut() {
    chatStore.unsubscribeAll()
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
    <button
      type="button"
      onclick={() => onnavigate('/notifications')}
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
        {#if notifCount > 0}
          <span
            class="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-1 pointer-events-none"
            style="background-color: red; color: white;"
          >
            {formatBadge(notifCount)}
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

          {#if isFreelancer}
            <DropdownMenu.Item
              class="gap-2 cursor-pointer"
              onclick={() => goto('/gigs/new')}
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
