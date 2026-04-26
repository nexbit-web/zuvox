<!-- src/routes/(auth)/messages/+page.svelte -->
<script lang="ts">
  import ChatListSidebar from '$lib/components/chat/chat-list-sidebar.svelte'
  import { MessageSquare } from 'lucide-svelte'
  import type { PageData } from './$types'

  // Сторінка не має власного +page.server.ts, тож PageData дорівнює
  // LayoutData з +layout.server.ts (chats, currentUserId)
  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>Повідомлення · Zunor</title>
</svelte:head>

<div
  class="flex h-[calc(100vh-72px)]"
  style="background-color: var(--background)"
>
  <aside class="w-full md:w-[360px] md:shrink-0">
    <ChatListSidebar currentUserId={data.currentUserId} />
  </aside>

  <main
    class="hidden md:flex flex-1 items-center justify-center"
    style="background-color: color-mix(in oklch, var(--foreground) 2%, transparent)"
  >
    <div class="text-center max-w-sm px-6">
      <div
        class="size-16 mx-auto mb-4 rounded-full flex items-center justify-center"
        style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
      >
        <MessageSquare class="size-7" style="color: var(--primary)" />
      </div>
      <h2 class="text-xl font-semibold mb-2" style="color: var(--foreground)">
        Оберіть чат
      </h2>
      <p class="text-sm" style="color: var(--muted-foreground)">
        Виберіть розмову зі списку зліва або знайдіть майстра і напишіть йому
        перший раз.
      </p>
    </div>
  </main>
</div>
