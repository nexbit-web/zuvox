<!-- src/routes/(auth)/messages/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { chatStore } from '$lib/stores/chat-store.svelte'
  import { unlockAudio, loadMutePreference } from '$lib/sound/notification'
  import type { LayoutData } from './$types'

  let {
    data,
    children,
  }: { data: LayoutData; children: import('svelte').Snippet } = $props()

  // Ініціалізуємо store ОДИН раз при монтуванні. Подальші оновлення
  // приходять через Pusher (chat:update / message:new) — не треба
  // синхронізувати з server-data, бо це створює нескінченний цикл
  // реактивності.
  onMount(() => {
    chatStore.setChats(data.chats)
    chatStore.subscribeToUserEvents(data.currentUserId)
    loadMutePreference()
    document.addEventListener('click', unlockAudio, { once: true })
  })
</script>

{@render children()}
