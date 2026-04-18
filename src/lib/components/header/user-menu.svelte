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
</script>

<div class="flex items-center gap-1 shrink-0">
  {#if isGuest}
    <Button
      variant="ghost"
      size="sm"
      class="hidden sm:flex text-sm cursor-pointer"
      onclick={() => onnavigate('/login')}
    >
      Увійти
    </Button>
    <Button
      variant="outline"
      size="sm"
      class="text-xs sm:text-sm cursor-pointer"
      onclick={() => onnavigate('/register')}
    >
      Реєстрація
    </Button>
  {/if}

  {#if isLoggedIn}
    <button
      onclick={() => onnavigate('/messages')}
      class="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/20 hover:bg-primary/50  hover:text-foreground transition-colors cursor-pointer"
    >
      <MessageCircle class="w-5 h-5" />
    </button>

    <div class="relative">
      <button
        class="w-10 h-10 flex items-center justify-center rounded-xl hover:text-foreground bg-primary/20 hover:bg-primary/50  transition-colors cursor-pointer"
      >
        <Bell class="w-5 h-5" />
      </button>
      {#if hasNotifications}
        <span
          class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-600 text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center   border-background pointer-events-none"
        >
          5
        </span>
      {/if}
    </div>

    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/20 hover:bg-primary/50  transition-colors cursor-pointer"
        >
          <Avatar class="h-7 w-7">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback
              class="  text-primary text-[11px] font-semibold"
            >
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
          <DropdownMenu.Item
            class="gap-2 cursor-pointer"
            onclick={() => onnavigate('/dashboard')}
          >
            <User class="w-3.5 h-3.5 text-muted-foreground" />
            <span>Мій профіль</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            class="sm:hidden gap-2 cursor-pointer"
            onclick={() => onnavigate('/messages')}
          >
            <MessageSquare class="w-3.5 h-3.5 text-muted-foreground" />
            <span>Повідомлення</span>
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
