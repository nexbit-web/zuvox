<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Button } from '$lib/components/ui/button'
  import {
    Bell,
    MessageSquare,
    User,
    LogOut,
    Settings,
    Plus,
    MessageCircle,
    UserRound,
    CircleUserRound,
  } from 'lucide-svelte'

  let {
    role,
    user,
    hasNotifications,
    onnavigate,
  }: {
    role: 'guest' | 'client' | 'freelancer'
    user: { name: string; username: string; avatar: string }
    hasNotifications: boolean
    onnavigate: (url: string) => void
  } = $props()

  const isGuest = $derived(role === 'guest')
  const isFreelancer = $derived(role === 'freelancer')
  const isLoggedIn = $derived(role === 'client' || role === 'freelancer')

  // Фейкові лічильники — замінити на реальні дані
  const messageCount = 3
  const notifCount = 5
</script>

<div class="flex items-center gap-2 shrink-0">
  {#if isGuest}
    <Button
      variant="ghost"
      size="sm"
      class="hidden sm:flex text-sm cursor-pointer text-foreground/70 hover:text-foreground"
      onclick={() => onnavigate('/login')}
    >
      Увійти
    </Button>
    <Button
      size="sm"
      class="text-xs sm:text-sm cursor-pointer"
      onclick={() => onnavigate('/register')}
    >
      Реєстрація
    </Button>
  {/if}

  {#if isLoggedIn}
    <!-- Повідомлення -->
    <div class="relative">
      <button
        type="button"
        onclick={() => onnavigate('/messages')}
        class="w-11 h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer bg-primary/20 hover:bg-primary/30"
      >
        <MessageCircle class="w-5 h-5 text-primary" />
      </button>
      {#if messageCount > 0}
        <span
          class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 pointer-events-none"
          style="border-color: var(--bg-header)"
        >
          {messageCount > 99 ? '99+' : messageCount}
        </span>
      {/if}
    </div>

    <!-- Сповіщення -->
    <div class="relative">
      <button
        type="button"
        class="w-11 h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer bg-primary/20 hover:bg-primary/30"
      >
        <Bell class="w-5 h-5 text-primary" />
      </button>
      {#if hasNotifications && notifCount > 0}
        <span
          class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 pointer-events-none"
          style="border-color: var(--bg-header)"
        >
          {notifCount > 99 ? '99+' : notifCount}
        </span>
      {/if}
    </div>

    <!-- Профіль -->
    <DropdownMenu.Root>
      <!-- Профіль — замінюєш тільки кнопку тригера -->
      <DropdownMenu.Trigger>
        <button
          type="button"
          class="w-11 h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer bg-primary/20 hover:bg-primary/30"
        >
          <CircleUserRound class="w-5 h-5 text-primary" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content class="w-56 mt-1" align="end">
        <!-- Юзер інфо -->
        <div class="px-3 py-3 flex items-center gap-2.5">
          <Avatar class="h-8 w-8 shrink-0">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback
              class="bg-primary/20 text-primary text-xs font-semibold"
            >
              {user.name[0]}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{user.name}</p>
            <p class="text-xs text-muted-foreground truncate">
              {user.username}
            </p>
          </div>
        </div>

        <DropdownMenu.Separator />

        <DropdownMenu.Group>
          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => onnavigate('/dashboard')}
          >
            <User class="w-3.5 h-3.5 text-muted-foreground" />
            <span>Мій профіль</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => onnavigate('/messages')}
          >
            <MessageSquare class="w-3.5 h-3.5 text-muted-foreground" />
            <span>Повідомлення</span>
            {#if messageCount > 0}
              <span
                class="ml-auto text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full"
              >
                {messageCount}
              </span>
            {/if}
          </DropdownMenu.Item>

          {#if isFreelancer}
            <DropdownMenu.Item
              class="gap-2 cursor-pointer"
              onclick={() => onnavigate('/gigs/create')}
            >
              <Plus class="w-3.5 h-3.5 text-muted-foreground" />
              <span>Новий гіг</span>
            </DropdownMenu.Item>
          {/if}

          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => onnavigate('/settings')}
          >
            <Settings class="w-3.5 h-3.5 text-muted-foreground" />
            <span>Налаштування</span>
          </DropdownMenu.Item>
        </DropdownMenu.Group>

        <DropdownMenu.Separator />

        <DropdownMenu.Item
          class="gap-2 cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut class="w-3.5 h-3.5" />
          <span>Вийти</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
