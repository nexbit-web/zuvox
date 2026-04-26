<!-- src/lib/components/chat/chat-list-sidebar.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Search, BadgeCheck, MessageSquare } from 'lucide-svelte'
  import { chatStore } from '$lib/stores/chat-store.svelte'
  import type { ChatPreview } from './types'

  interface Props {
    activeChatId?: string | null
    currentUserId: string
  }

  let { activeChatId = null, currentUserId }: Props = $props()

  let search = $state('')

  const chats = $derived(chatStore.chats)

  const filtered = $derived(
    search.trim()
      ? chats.filter(
          (c) =>
            c.peer.name.toLowerCase().includes(search.toLowerCase()) ||
            (c.peer.username?.toLowerCase().includes(search.toLowerCase()) ??
              false),
        )
      : chats,
  )

  function formatTime(iso: string | null): string {
    if (!iso) return ''
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    if (diffMin < 1) return 'щойно'
    if (diffMin < 60) return `${diffMin} хв`

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dDate = new Date(date)
    dDate.setHours(0, 0, 0, 0)
    if (dDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('uk-UA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (dDate.getTime() === yesterday.getTime()) return 'вчора'

    return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })
  }

  function previewLabel(c: ChatPreview): string {
    if (!c.lastMessageText) return 'Чат створено'
    if (c.lastSenderId === currentUserId) return `Ви: ${c.lastMessageText}`
    return c.lastMessageText
  }
</script>

<div
  class="flex flex-col h-full"
  style="background-color: var(--background);
         border-right: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent)"
>
  <!-- Header -->
  <div class="px-4 pt-4 pb-3 shrink-0">
    <h1
      class="text-2xl font-semibold mb-3 tracking-tight"
      style="color: var(--foreground)"
    >
      Повідомлення
    </h1>

    <div class="relative">
      <Search
        class="size-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style="color: var(--muted-foreground)"
      />
      <input
        type="text"
        bind:value={search}
        placeholder="Пошук"
        class="w-full h-10 pl-10 pr-4 rounded-full text-sm outline-none"
        style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent);
               color: var(--foreground)"
      />
    </div>
  </div>

  <!-- List -->
  <div class="flex-1 overflow-y-auto">
    {#if !chatStore.initialized}
      <!-- Скелетон -->
      <div class="px-2 space-y-1">
        {#each Array(6) as _}
          <div class="flex items-center gap-3 p-3">
            <div class="size-12 rounded-full bg-muted animate-pulse"></div>
            <div class="flex-1 space-y-1.5">
              <div class="h-3 w-2/3 bg-muted rounded animate-pulse"></div>
              <div class="h-3 w-1/2 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        {/each}
      </div>
    {:else if filtered.length === 0}
      <div
        class="flex flex-col items-center justify-center h-full text-center px-6"
      >
        <div
          class="size-12 mb-3 rounded-full flex items-center justify-center"
          style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
        >
          <MessageSquare class="size-5" style="color: var(--primary)" />
        </div>
        <p class="text-sm font-medium" style="color: var(--foreground)">
          {search ? 'Нічого не знайдено' : 'У вас ще немає чатів'}
        </p>
        <p class="text-xs mt-1" style="color: var(--muted-foreground)">
          {search
            ? 'Спробуйте інший запит'
            : 'Знайдіть майстра і напишіть йому'}
        </p>
      </div>
    {:else}
      <div class="px-2 pb-2">
        {#each filtered as chat (chat.id)}
          {@const isActive = chat.id === activeChatId}
          <button
            type="button"
            onclick={() => goto(`/messages/${chat.id}`)}
            class="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors cursor-pointer"
            style="background-color: {isActive
              ? 'color-mix(in oklch, var(--primary) 8%, transparent)'
              : 'transparent'}"
            onmouseenter={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  'color-mix(in oklch, var(--foreground) 4%, transparent)'
            }}
            onmouseleave={(e) => {
              if (!isActive)
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  'transparent'
            }}
          >
            <Avatar class="size-12 shrink-0">
              <AvatarImage src={chat.peer.avatar ?? ''} alt={chat.peer.name} />
              <AvatarFallback
                class="text-sm font-semibold"
                style="background-color: var(--secondary); color: var(--secondary-foreground)"
              >
                {chat.peer.name?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>

            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between gap-2 mb-0.5">
                <div class="flex items-center gap-1 min-w-0">
                  <p
                    class="text-sm font-semibold truncate"
                    style="color: var(--foreground)"
                  >
                    {chat.peer.name}
                  </p>
                  {#if chat.peer.isVerified}
                    <BadgeCheck
                      class="size-3.5 shrink-0"
                      style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
                    />
                  {/if}
                </div>
                <span
                  class="text-[11px] tabular-nums shrink-0"
                  style="color: var(--muted-foreground)"
                >
                  {formatTime(chat.lastMessageAt)}
                </span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <p
                  class="text-xs truncate"
                  style="color: {chat.unreadCount > 0
                    ? 'var(--foreground)'
                    : 'var(--muted-foreground)'};
                         font-weight: {chat.unreadCount > 0 ? '500' : '400'}"
                >
                  {previewLabel(chat)}
                </p>
                {#if chat.unreadCount > 0}
                  <span
                    class="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center tabular-nums"
                    style="background-color: var(--primary); color: var(--primary-foreground)"
                  >
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </span>
                {/if}
              </div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
