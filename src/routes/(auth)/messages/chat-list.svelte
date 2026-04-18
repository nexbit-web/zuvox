<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Skeleton } from '$lib/components/ui/skeleton'
  import { Search, X, Edit } from 'lucide-svelte'
  import { chats, initials, type Chat } from './types'

  let {
    selectedId = $bindable<string | null>(null),
    loading = false,
    onselect,
  }: {
    selectedId: string | null
    loading: boolean
    onselect: (id: string) => void
  } = $props()

  let searchValue = $state('')

  const filtered = $derived(
    searchValue.trim()
      ? chats.filter(
          (c) =>
            c.name.toLowerCase().includes(searchValue.toLowerCase()) ||
            c.lastMessage.toLowerCase().includes(searchValue.toLowerCase()),
        )
      : chats,
  )
</script>

<aside
  class="h-full flex flex-col border-r"
  style="border-color: var(--border); background-color: var(--bg-header)"
>
  <div class="px-4 pt-5 pb-3 shrink-0 flex items-center justify-between">
    <h1 class="text-base font-semibold" style="color: var(--foreground)">
      Чати
    </h1>
    <button
      type="button"
      class="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer hover:opacity-70 transition-colors"
      style="color: var(--muted-foreground)"
    >
      <Edit class="w-4 h-4" />
    </button>
  </div>

  <!-- Пошук -->
  <div class="px-3 pb-2 shrink-0">
    <div class="relative">
      <Search
        class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
        style="color: var(--muted-foreground)"
      />
      <input
        bind:value={searchValue}
        type="text"
        placeholder="Пошук чатів..."
        class="w-full h-8 pl-8 pr-7 text-xs rounded-lg outline-none border border-transparent transition-colors"
        style="background-color: color-mix(in oklch, var(--foreground) 6%, transparent); color: var(--foreground)"
      />
      {#if searchValue}
        <button
          type="button"
          onclick={() => (searchValue = '')}
          class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
          style="color: var(--muted-foreground)"
        >
          <X class="w-3 h-3" />
        </button>
      {/if}
    </div>
  </div>

  <!-- Список -->
  <div class="flex-1 overflow-y-auto py-1 sidebar-scroll">
    {#if loading}
      {#each Array(5) as _}
        <div class="px-2 mb-0.5">
          <div class="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <Skeleton class="h-10 w-10 rounded-full shrink-0" />
            <div class="flex-1 space-y-1.5">
              <Skeleton class="h-3 w-24 rounded" />
              <Skeleton class="h-2.5 w-36 rounded" />
            </div>
          </div>
        </div>
      {/each}
    {:else}
      {#each filtered as chat}
        {@const active = selectedId === chat.id}
        <div class="px-2 mb-0.5">
          <button
            type="button"
            onclick={() => onselect(chat.id)}
            class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-left transition-colors"
            style="background-color: {active
              ? 'color-mix(in oklch, var(--primary) 10%, transparent)'
              : 'transparent'}"
            onmouseenter={(e) => {
              if (!active)
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  'color-mix(in oklch, var(--foreground) 5%, transparent)'
            }}
            onmouseleave={(e) => {
              if (!active)
                (e.currentTarget as HTMLElement).style.backgroundColor = active
                  ? 'color-mix(in oklch, var(--primary) 10%, transparent)'
                  : 'transparent'
            }}
          >
            <div class="relative shrink-0">
              <Avatar class="h-10 w-10">
                <AvatarImage src={chat.avatar} alt={chat.name} />
                <AvatarFallback
                  class="text-sm font-semibold"
                  style="background-color: {active
                    ? 'var(--primary)'
                    : 'color-mix(in oklch, var(--primary) 15%, transparent)'}; color: {active
                    ? 'white'
                    : 'var(--primary)'}"
                >
                  {initials(chat.name)}
                </AvatarFallback>
              </Avatar>
              {#if chat.online}
                <span
                  class="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 pointer-events-none"
                  style="border-color: var(--bg-header)"
                ></span>
              {/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-0.5">
                <span
                  class="text-[13px] font-semibold truncate"
                  style="color: var(--foreground)">{chat.name}</span
                >
                <span
                  class="text-[10px] shrink-0 ml-2"
                  style="color: var(--muted-foreground)">{chat.time}</span
                >
              </div>
              <div class="flex items-center justify-between gap-2">
                <span
                  class="text-xs truncate"
                  style="color: var(--muted-foreground)"
                  >{chat.lastMessage}</span
                >
                {#if chat.unread > 0}
                  <span
                    class="shrink-0 min-w-[16px] h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1"
                    >{chat.unread}</span
                  >
                {/if}
              </div>
            </div>
          </button>
        </div>
      {/each}
      {#if filtered.length === 0}
        <div class="flex flex-col items-center py-12 gap-2">
          <Search
            class="w-7 h-7"
            style="color: var(--muted-foreground); opacity: 0.4"
          />
          <p class="text-xs" style="color: var(--muted-foreground)">
            Нічого не знайдено
          </p>
        </div>
      {/if}
    {/if}
  </div>
</aside>

<style>
  .sidebar-scroll {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }
  .sidebar-scroll:hover {
    scrollbar-color: color-mix(in oklch, currentColor 20%, transparent)
      transparent;
  }
  .sidebar-scroll::-webkit-scrollbar {
    width: 3px;
  }
  .sidebar-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .sidebar-scroll::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
  }
  .sidebar-scroll:hover::-webkit-scrollbar-thumb {
    background: color-mix(in oklch, currentColor 20%, transparent);
  }
</style>
