<!-- src/lib/components/chat/chat-window.svelte -->
<script lang="ts">
  import { tick, untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import {
    BadgeCheck,
    ChevronLeft,
    Volume2,
    VolumeX,
  } from 'lucide-svelte'
  import { getPusher } from '$lib/pusher-client'
  import {
    playMessageSound,
    playSentSound,
    isMuted,
    setMuted,
    unlockAudio,
  } from '$lib/sound/notification'
  import { chatStore } from '$lib/stores/chat-store.svelte'
  import MessageBubble from './message-bubble.svelte'
  import MessageComposer from './message-composer.svelte'
  import TypingIndicator from './typing-indicator.svelte'
  import type {
    ChatMessage,
    ChatDetails,
    MessageNewPayload,
    MessageReadPayload,
    TypingPayload,
  } from './types'

  interface Props {
    chatId: string
    chat: ChatDetails
    initialMessages: ChatMessage[]
    initialNextCursor: string | null
    currentUserId: string
  }

  let {
    chatId,
    chat,
    initialMessages,
    initialNextCursor,
    currentUserId,
  }: Props = $props()

  let messages = $state<ChatMessage[]>([...initialMessages].reverse())
  let nextCursor = $state(initialNextCursor)
  let loadingMore = $state(false)
  let peerLastReadAt = $state<Date | null>(null)
  let typingPeer = $state<string | null>(null)
  let typingTimer: ReturnType<typeof setTimeout> | null = null
  let muted = $state(isMuted())
  let scrollContainer = $state<HTMLDivElement | undefined>(undefined)
  let replyTo = $state<ChatMessage | null>(null)
  let error = $state('')
  /** Set tmp-id повідомлень які ще летять на сервер */
  let pendingIds = $state<Set<string>>(new Set())
  /** Set tmp-id які впали — показуємо як failed */
  let failedIds = $state<Set<string>>(new Set())

  const peer = $derived(chat.peer)

  let lastInitChatId = ''
  $effect(() => {
    const id = chatId
    if (id === lastInitChatId) return
    lastInitChatId = id

    untrack(() => {
      messages = [...initialMessages].reverse()
      nextCursor = initialNextCursor
      peerLastReadAt = chat.myLastReadAt ? new Date(chat.myLastReadAt) : null
      typingPeer = null
      replyTo = null
      error = ''
      pendingIds = new Set()
      failedIds = new Set()
    })
    tick().then(() => scrollToBottom('auto'))
  })

  $effect(() => {
    if (typeof window === 'undefined') return
    const id = chatId

    untrack(() => {
      chatStore.activeChatId = id
    })

    const pusher = getPusher()
    const channelName = `private-chat-${id}`
    const channel = pusher.subscribe(channelName)

    const onNew = (data: MessageNewPayload) => {
      // Не дублюємо своє підтверджене (вже додане через onSendConfirmed)
      if (data.message.senderId === currentUserId) return
      if (untrack(() => messages.some((m) => m.id === data.message.id))) return

      messages = [...messages, data.message]
      tick().then(() => {
        if (document.visibilityState === 'visible') {
          playMessageSound()
          markRead()
        }
        if (isNearBottom()) scrollToBottom()
      })
    }

    const onRead = (data: MessageReadPayload) => {
      if (data.readerId !== currentUserId) {
        peerLastReadAt = new Date(data.lastReadAt)
      }
    }

    const onTypingEvt = (data: TypingPayload) => {
      if (data.userId === currentUserId) return
      typingPeer = data.userName
      if (typingTimer) clearTimeout(typingTimer)
      typingTimer = setTimeout(() => (typingPeer = null), 3000)
    }

    channel.bind('message:new', onNew)
    channel.bind('message:read', onRead)
    channel.bind('client-typing', onTypingEvt)

    markRead()

    const onVis = () => {
      if (document.visibilityState === 'visible') markRead()
    }
    document.addEventListener('visibilitychange', onVis)
    document.addEventListener('click', unlockAudio, { once: true })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      document.removeEventListener('visibilitychange', onVis)
      if (typingTimer) {
        clearTimeout(typingTimer)
        typingTimer = null
      }
      untrack(() => {
        if (chatStore.activeChatId === id) chatStore.activeChatId = null
      })
    }
  })

  // ─── Optimistic handlers ───
  function handleSendOptimistic(msg: ChatMessage) {
    messages = [...messages, msg]
    pendingIds = new Set([...pendingIds, msg.id])
    tick().then(() => scrollToBottom())
  }

  function handleSendConfirmed(tmpId: string, real: ChatMessage) {
    const idx = messages.findIndex((m) => m.id === tmpId)
    if (idx === -1) {
      messages = [...messages, real]
    } else {
      messages = messages.map((m, i) => (i === idx ? real : m))
    }
    const newPending = new Set(pendingIds)
    newPending.delete(tmpId)
    pendingIds = newPending
    playSentSound()
  }

  function handleSendFailed(tmpId: string, errMsg: string) {
    if (!tmpId) {
      // Помилка ще до optimistic (наприклад файл занадто великий)
      error = errMsg
      setTimeout(() => (error = ''), 4000)
      return
    }
    const newPending = new Set(pendingIds)
    newPending.delete(tmpId)
    pendingIds = newPending
    failedIds = new Set([...failedIds, tmpId])
    error = errMsg
    setTimeout(() => (error = ''), 5000)
  }

  async function markRead() {
    untrack(() => chatStore.markChatRead(chatId))
    try {
      await fetch(`/api/chats/${chatId}/read`, { method: 'POST' })
    } catch {
      // ignore
    }
  }

  let lastTypingSent = 0
  function onTyping() {
    const now = Date.now()
    if (now - lastTypingSent < 2000) return
    lastTypingSent = now
    try {
      const pusher = getPusher()
      const channel = pusher.channel(`private-chat-${chatId}`)
      channel?.trigger('client-typing', {
        userId: currentUserId,
        userName: 'співрозмовник',
      })
    } catch {
      // Pusher може бути недоступний
    }
  }

  function isNearBottom(): boolean {
    if (!scrollContainer) return true
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer
    return scrollHeight - scrollTop - clientHeight < 200
  }

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    if (!scrollContainer) return
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior,
    })
  }

  async function loadMore() {
    if (loadingMore || !nextCursor) return
    loadingMore = true
    const prevHeight = scrollContainer?.scrollHeight ?? 0
    try {
      const res = await fetch(
        `/api/chats/${chatId}/messages?cursor=${nextCursor}`,
      )
      if (!res.ok) return
      const json = await res.json()
      const older = (json.messages as ChatMessage[]).reverse()
      messages = [...older, ...messages]
      nextCursor = json.nextCursor
      await tick()
      if (scrollContainer) {
        const newHeight = scrollContainer.scrollHeight
        scrollContainer.scrollTop = newHeight - prevHeight
      }
    } finally {
      loadingMore = false
    }
  }

  function onScroll(e: Event) {
    const el = e.currentTarget as HTMLDivElement
    if (el.scrollTop < 100 && !loadingMore && nextCursor) loadMore()
  }

  function toggleMute() {
    muted = !muted
    setMuted(muted)
    if (!muted) unlockAudio()
  }

  function isLastInGroup(idx: number): boolean {
    const m = messages[idx]
    const next = messages[idx + 1]
    if (!next) return true
    if (next.senderId !== m.senderId) return true
    const diff =
      new Date(next.createdAt).getTime() - new Date(m.createdAt).getTime()
    return diff > 2 * 60 * 1000
  }

  function isReadByPeer(msg: ChatMessage): boolean {
    if (!peerLastReadAt) return false
    return new Date(msg.createdAt) <= peerLastReadAt
  }

  function shouldShowDateSeparator(idx: number): string | null {
    const m = messages[idx]
    const prev = messages[idx - 1]
    const date = new Date(m.createdAt)
    if (!prev) return formatDate(date)
    const prevDate = new Date(prev.createdAt)
    if (date.toDateString() !== prevDate.toDateString()) return formatDate(date)
    return null
  }

  function formatDate(d: Date): string {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const dDate = new Date(d)
    dDate.setHours(0, 0, 0, 0)

    if (dDate.getTime() === today.getTime()) return 'Сьогодні'
    if (dDate.getTime() === yesterday.getTime()) return 'Вчора'
    return d.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }
</script>

<div class="flex flex-col h-full" style="background-color: var(--background)">
  <header
    class="flex items-center gap-3 px-3 sm:px-4 h-14 shrink-0"
    style="background-color: var(--card);
           border-bottom: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent)"
  >
    <button
      type="button"
      onclick={() => goto('/messages')}
      class="size-9 rounded-full flex items-center justify-center cursor-pointer md:hidden"
      style="color: var(--muted-foreground)"
      aria-label="Назад"
    >
      <ChevronLeft class="size-5" />
    </button>

    <button
      type="button"
      onclick={() => peer.username && goto(`/@${peer.username}`)}
      class="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer text-left"
    >
      <Avatar class="size-9 shrink-0">
        <AvatarImage src={peer.avatar ?? ''} alt={peer.name} />
        <AvatarFallback
          class="text-xs font-semibold"
          style="background-color: var(--secondary); color: var(--secondary-foreground)"
        >
          {peer.name?.[0]?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <div class="min-w-0">
        <div class="flex items-center gap-1">
          <p class="text-sm font-semibold truncate" style="color: var(--foreground)">
            {peer.name}
          </p>
          {#if peer.isVerified}
            <BadgeCheck
              class="size-3.5 shrink-0"
              style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
            />
          {/if}
        </div>
        {#if typingPeer}
          <p class="text-xs" style="color: var(--primary)">друкує...</p>
        {:else if peer.username}
          <p class="text-xs truncate" style="color: var(--muted-foreground)">
            @{peer.username}
          </p>
        {/if}
      </div>
    </button>

    <button
      type="button"
      onclick={toggleMute}
      class="size-9 rounded-full flex items-center justify-center cursor-pointer transition-colors"
      style="color: var(--muted-foreground)"
      aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
    >
      {#if muted}
        <VolumeX class="size-4" />
      {:else}
        <Volume2 class="size-4" />
      {/if}
    </button>
  </header>

  <div
    bind:this={scrollContainer}
    onscroll={onScroll}
    class="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1.5"
    style="background-color: var(--background)"
  >
    {#if loadingMore}
      <div class="flex justify-center py-2">
        <div
          class="size-5 rounded-full border-2 border-t-transparent animate-spin"
          style="border-color: var(--primary); border-top-color: transparent"
        ></div>
      </div>
    {/if}

    {#if messages.length === 0}
      <div class="flex flex-col items-center justify-center h-full text-center">
        <p class="text-sm" style="color: var(--muted-foreground)">
          Це початок вашого чату з {peer.name}
        </p>
        <p class="text-xs mt-1" style="color: var(--muted-foreground)">
          Напишіть перше повідомлення
        </p>
      </div>
    {:else}
      {#each messages as msg, idx (msg.id)}
        {@const dateLabel = shouldShowDateSeparator(idx)}
        {#if dateLabel}
          <div class="flex justify-center py-3">
            <span
              class="text-[11px] px-3 py-1 rounded-full"
              style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent);
                     color: var(--muted-foreground)"
            >
              {dateLabel}
            </span>
          </div>
        {/if}
        <MessageBubble
          message={msg}
          isMine={msg.senderId === currentUserId}
          isLastInGroup={isLastInGroup(idx)}
          showReadStatus={msg.senderId === currentUserId &&
            idx === messages.length - 1}
          isRead={isReadByPeer(msg)}
          isPending={pendingIds.has(msg.id)}
          isFailed={failedIds.has(msg.id)}
          onReply={(m) => (replyTo = m)}
        />
      {/each}
    {/if}

    {#if typingPeer}
      <TypingIndicator />
    {/if}
  </div>

  {#if error}
    <div
      class="px-4 py-2 text-xs text-center"
      style="background-color: color-mix(in oklch, var(--destructive) 10%, transparent);
             color: var(--destructive)"
    >
      {error}
    </div>
  {/if}

  <MessageComposer
    {chatId}
    {currentUserId}
    {replyTo}
    onCancelReply={() => (replyTo = null)}
    onSendOptimistic={handleSendOptimistic}
    onSendConfirmed={handleSendConfirmed}
    onSendFailed={handleSendFailed}
    {onTyping}
  />
</div>