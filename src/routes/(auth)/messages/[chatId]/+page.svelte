<!-- src/routes/(auth)/messages/[chatId]/+page.svelte -->
<script lang="ts">
  import ChatListSidebar from '$lib/components/chat/chat-list-sidebar.svelte'
  import ChatWindow from '$lib/components/chat/chat-window.svelte'
  import type { PageData } from './$types'

  // PageData вже включає дані з +layout.server.ts (chats, currentUserId)
  // SvelteKit автоматично об'єднує LayoutData + PageServerLoad → PageData
  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>{data.chat.peer.name} · Zunor</title>
</svelte:head>

<div
  class="flex h-[calc(100vh-72px)]"
  style="background-color: var(--background)"
>
  <aside class="hidden md:block md:w-[360px] md:shrink-0">
    <ChatListSidebar
      activeChatId={data.chat.id}
      currentUserId={data.currentUserId}
    />
  </aside>

  <main class="flex-1 min-w-0">
    <ChatWindow
      chatId={data.chat.id}
      chat={data.chat}
      initialMessages={data.initialMessages}
      initialNextCursor={data.initialNextCursor}
      currentUserId={data.currentUserId}
    />
  </main>
</div>
