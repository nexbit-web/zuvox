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
    CircleUserRound,
  } from 'lucide-svelte'
  import { signOut } from '$lib/auth-client'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'

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

  const messageCount = 3
  const notifCount = 5

  async function handleSignOut() {
    await signOut()
    await invalidateAll()
    goto('/')
  }
</script>

<div class="flex items-center gap-2 shrink-0">
  {#if !isLoggedIn}
    <Button
      variant="ghost"
      size="sm"
      class="hidden sm:flex text-sm cursor-pointer text-foreground/70 hover:text-foreground"
      onclick={() => onnavigate('/user/login')}
    >
      Увійти
    </Button>
    <Button
      size="sm"
      class="text-xs sm:text-sm cursor-pointer"
      onclick={() => onnavigate('/user/register')}
    >
      Реєстрація
    </Button>
  {:else}
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
      {#if notifCount > 0}
        <span
          class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 pointer-events-none"
          style="border-color: var(--bg-header)"
        >
          {notifCount > 99 ? '99+' : notifCount}
        </span>
      {/if}
    </div>

    <!-- Профіль дропдаун -->
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          type="button"
          class="w-11 h-11 flex items-center justify-center rounded-xl transition-colors cursor-pointer bg-primary/20 hover:bg-primary/30"
        >
          {#if user?.avatar}
            <Avatar class="h-8 w-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback
                class="bg-primary/20 text-primary text-xs font-semibold"
              >
                {user.initials}
              </AvatarFallback>
            </Avatar>
          {:else}
            <CircleUserRound class="w-5 h-5 text-primary" />
          {/if}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content class="w-56 mt-1" align="end">
        <!-- Юзер інфо -->
        <div class="px-3 py-3 flex items-center gap-2.5">
          <Avatar class="h-8 w-8 shrink-0">
            <AvatarImage src={user?.avatar ?? ''} alt={user?.name ?? ''} />
            <AvatarFallback
              class="bg-primary/20 text-primary text-xs font-semibold"
            >
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
            onclick={() => onnavigate('/profile')}
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
          onclick={handleSignOut}
        >
          <LogOut class="w-3.5 h-3.5" />
          <span>Вийти</span>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
</div>
