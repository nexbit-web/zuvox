<script lang="ts">
  import * as Resizable from '$lib/components/ui/resizable'
  import { MessageSquare } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { chats } from './types'
  import ChatList from './chat-list.svelte'
  import ChatWindow from './chat-window.svelte'

  const STORAGE_KEY = 'messages-sidebar-size'
  const CHAT_KEY = 'messages-selected-chat'
  const DEFAULT_SIZE = 25

  let sidebarSize = $state(DEFAULT_SIZE)
  let mounted = $state(false)
  let loading = $state(true)
  let isMobile = $state(false)
  let mobileShowChat = $state(false)
  let selectedId = $state<string | null>(null)

  onMount(() => {
    try {
      const savedSize = localStorage.getItem(STORAGE_KEY)
      if (savedSize) {
        const parsed = parseFloat(savedSize)
        if (!isNaN(parsed) && parsed >= 18 && parsed <= 40) sidebarSize = parsed
      }

      const savedChat = localStorage.getItem(CHAT_KEY)
      if (savedChat && chats.find((c) => c.id === savedChat)) {
        selectedId = savedChat
      }
    } catch {}

    function checkMobile() {
      isMobile = window.innerWidth < 768
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)

    setTimeout(() => {
      loading = false
    }, 800)
    mounted = true

    return () => window.removeEventListener('resize', checkMobile)
  })

  function handleLayoutChange(sizes: number[]) {
    if (sizes[0] !== undefined) {
      sidebarSize = sizes[0]
      try {
        localStorage.setItem(STORAGE_KEY, String(sizes[0]))
      } catch {}
    }
  }

  function handleSelect(id: string) {
    selectedId = id
    mobileShowChat = true
    try {
      localStorage.setItem(CHAT_KEY, id)
    } catch {}
  }
</script>

{#if mounted}
  <div
    class="overflow-hidden"
    style="height: calc(100dvh - 64px); background-color: var(--bg-header)"
  >
    {#if isMobile}
      <!-- МОБІЛЬ -->
    <div class="h-full">
    {#if !mobileShowChat}
      <ChatList bind:selectedId {loading} onselect={handleSelect} />
    {:else if selectedId}
      <ChatWindow
        chatId={selectedId}
        {loading}
        showBackButton={true}
        onback={() => { mobileShowChat = false; selectedId = null }}
      />
    {/if}
  </div>
    {:else}
      <!-- ДЕСКТОП -->
      <Resizable.PaneGroup
        direction="horizontal"
        class="h-full"
        onLayoutChange={handleLayoutChange}
      >
        <Resizable.Pane defaultSize={sidebarSize} minSize={18} maxSize={40}>
          <ChatList bind:selectedId {loading} onselect={handleSelect} />
        </Resizable.Pane>

        <Resizable.Handle
          class="w-px transition-colors"
          style="background-color: var(--border)"
        />

        <Resizable.Pane>
          {#if selectedId}
            <ChatWindow chatId={selectedId} {loading} />
          {:else}
            <!-- Порожній стан — нічого не вибрано -->
            <div
              class="h-full flex flex-col items-center justify-center gap-4"
              style="background-color: var(--background)"
            >
              <div
                class="w-16 h-16 rounded-2xl flex items-center justify-center"
                style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
              >
                <MessageSquare
                  class="w-7 h-7"
                  style="color: var(--primary); opacity: 0.5"
                />
              </div>
              <div class="text-center">
                <p
                  class="text-sm font-medium"
                  style="color: var(--foreground); opacity: 0.5"
                >
                  Оберіть чат
                </p>
                <p class="text-xs mt-1" style="color: var(--muted-foreground)">
                  Виберіть розмову зі списку зліва
                </p>
              </div>
            </div>
          {/if}
        </Resizable.Pane>
      </Resizable.PaneGroup>
    {/if}
  </div>
{/if}
