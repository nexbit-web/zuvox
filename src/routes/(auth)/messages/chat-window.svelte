<script lang="ts">
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'
  import { Skeleton } from '$lib/components/ui/skeleton'
  import {
    Search, Send, Paperclip, Smile, MoreVertical,
    X, Check, CheckCheck, ArrowLeft
  } from 'lucide-svelte'
  import { tick } from 'svelte'
  import { chats, initials, highlightText } from './types'
  import ChatSearch from './chat-search.svelte'

let {
  chatId,
  loading = false,
  showBackButton = false,
  onback,
}: {
  chatId: string
  loading: boolean
  showBackButton?: boolean
  onback?: () => void
} = $props()

  const chat = $derived(chats.find(c => c.id === chatId)!)

  let messagesEl = $state<HTMLDivElement | undefined>(undefined)
  let textareaEl = $state<HTMLTextAreaElement | undefined>(undefined)
  let messageText = $state('')
  let chatSearchOpen = $state(false)
  let chatSearchValue = $state('')
  let chatSearchRef = $state<ChatSearch | undefined>(undefined)
  let highlightedIndex = $state(-1)

  const searchMatches = $derived(
    chatSearchValue.trim() && chat
      ? chat.messages
          .map((m, i) => ({ i, match: m.text.toLowerCase().includes(chatSearchValue.toLowerCase()) }))
          .filter(x => x.match).map(x => x.i)
      : []
  )

  function sendMessage() {
    if (!messageText.trim()) return
    messageText = ''
    if (textareaEl) textareaEl.style.height = 'auto'
  }

  function autoResize(e: Event) {
    const el = e.target as HTMLTextAreaElement
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 128) + 'px'
  }

  async function toggleChatSearch() {
    chatSearchOpen = !chatSearchOpen
    chatSearchValue = ''
    highlightedIndex = -1
    if (chatSearchOpen) {
      await tick()
      chatSearchRef?.focus()
    }
  }

  function scrollToMatch(idx: number) {
    if (!messagesEl || !chat) return
    const id = chat.messages[searchMatches[idx]]?.id
    if (!id) return
    messagesEl.querySelector(`[data-msg-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    highlightedIndex = idx
  }

  function searchNext() { if (searchMatches.length) scrollToMatch((highlightedIndex + 1) % searchMatches.length) }
  function searchPrev() { if (searchMatches.length) scrollToMatch((highlightedIndex - 1 + searchMatches.length) % searchMatches.length) }

  const btnIcon = `w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer`
</script>

<main class="h-full flex flex-col" style="background-color: var(--background)">

  <!-- Хедер -->
  <div
    class="flex items-center gap-2 px-3 h-14 border-b shrink-0"
    style="border-color: var(--border); background-color: var(--bg-header)"
  >

    <!-- Кнопка назад — тільки на мобілі -->
    {#if showBackButton}
      <button
        type="button"
        onclick={onback}
        class="{btnIcon} shrink-0"
        style="color: var(--muted-foreground)"
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
    {/if}

    <!-- Аватар -->
    <div class="relative shrink-0">
      <Avatar class="h-8 w-8">
        <AvatarImage src={chat.avatar} alt={chat.name} />
        <AvatarFallback
          class="text-xs font-semibold"
          style="background-color: color-mix(in oklch, var(--primary) 15%, transparent); color: var(--primary)"
        >
          {initials(chat.name)}
        </AvatarFallback>
      </Avatar>
      {#if chat.online}
        <span
          class="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full border-2 pointer-events-none"
          style="border-color: var(--bg-header)"
        ></span>
      {/if}
    </div>

    <!-- Ім'я + статус -->
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold leading-tight" style="color: var(--foreground)">{chat.name}</p>
      <p class="text-[11px] leading-tight" style="color: {chat.online ? 'rgb(52,211,153)' : 'var(--muted-foreground)'}">
        {chat.online ? 'Онлайн' : 'Не в мережі'}
      </p>
    </div>

    <!-- Іконки -->
    <div class="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onclick={toggleChatSearch}
        class={btnIcon}
        style="color: {chatSearchOpen ? 'var(--primary)' : 'var(--muted-foreground)'}; background-color: {chatSearchOpen ? 'color-mix(in oklch, var(--primary) 10%, transparent)' : 'transparent'}"
        onmouseenter={(e) => { if (!chatSearchOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in oklch, var(--foreground) 7%, transparent)' }}
        onmouseleave={(e) => { if (!chatSearchOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
      >
        <Search class="w-4 h-4" />
      </button>
      <button
        type="button"
        class={btnIcon}
        style="color: var(--muted-foreground)"
        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'color-mix(in oklch, var(--foreground) 7%, transparent)'}
        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
      >
        <MoreVertical class="w-4 h-4" />
      </button>
    </div>

  </div>

  <!-- Пошук в чаті -->
  {#if chatSearchOpen}
    <ChatSearch
      bind:this={chatSearchRef}
      bind:value={chatSearchValue}
      matchCount={searchMatches.length}
      currentIndex={highlightedIndex}
      onnext={searchNext}
      onprev={searchPrev}
      onclose={toggleChatSearch}
    />
  {/if}

  <!-- Повідомлення -->
  <div
    bind:this={messagesEl}
    class="flex-1 overflow-y-auto px-4 py-4 messages-scroll"
    style="display: flex; flex-direction: column; gap: 2px;"
  >
    {#if loading}
      {#each Array(5) as _, i}
        <div class="flex {i % 2 === 0 ? 'justify-start' : 'justify-end'} items-end gap-2 {i > 0 ? 'mt-2' : ''}">
          {#if i % 2 === 0}<Skeleton class="h-6 w-6 rounded-full shrink-0" />{/if}
          <Skeleton class="h-10 rounded-2xl" style="width: {140 + i * 25}px" />
        </div>
      {/each}
    {:else}
      {#each chat.messages as msg, i}
        {@const prev = chat.messages[i - 1]}
        {@const next = chat.messages[i + 1]}
        {@const isFirst = !prev || prev.isMe !== msg.isMe}
        {@const isLast = !next || next.isMe !== msg.isMe}
        {@const isHighlighted = !!(chatSearchValue.trim() && msg.text.toLowerCase().includes(chatSearchValue.toLowerCase()))}

        {#if isFirst && i !== 0}<div class="h-3"></div>{/if}

        <div data-msg-id={msg.id} class="flex {msg.isMe ? 'justify-end' : 'justify-start'} items-end gap-2">
          {#if !msg.isMe}
            <div class="w-6 h-6 shrink-0">
              {#if isLast}
                <Avatar class="h-6 w-6">
                  <AvatarImage src={chat.avatar} />
                  <AvatarFallback class="text-[9px] font-semibold" style="background-color: color-mix(in oklch, var(--primary) 15%, transparent); color: var(--primary)">
                    {initials(chat.name)}
                  </AvatarFallback>
                </Avatar>
              {/if}
            </div>
          {/if}

          <div class="flex flex-col {msg.isMe ? 'items-end' : 'items-start'}" style="max-width: {showBackButton ? '75%' : '60%'}">
            <div
              class="px-3.5 py-2 text-sm leading-relaxed break-words
                {msg.isMe
                  ? isFirst && isLast ? 'rounded-2xl rounded-br-sm' : isFirst ? 'rounded-t-2xl rounded-l-2xl rounded-br-sm' : isLast ? 'rounded-b-2xl rounded-l-2xl rounded-br-sm' : 'rounded-l-2xl rounded-r-sm'
                  : isFirst && isLast ? 'rounded-2xl rounded-bl-sm' : isFirst ? 'rounded-t-2xl rounded-r-2xl rounded-bl-sm' : isLast ? 'rounded-b-2xl rounded-r-2xl rounded-bl-sm' : 'rounded-r-2xl rounded-l-sm'
                }"
              style="background-color: {msg.isMe ? isHighlighted ? 'color-mix(in oklch, var(--primary) 70%, white)' : 'var(--primary)' : isHighlighted ? 'color-mix(in oklch, var(--primary) 15%, transparent)' : 'color-mix(in oklch, var(--foreground) 7%, transparent)'}; color: {msg.isMe ? 'white' : 'var(--foreground)'}; border: {!msg.isMe ? '1px solid color-mix(in oklch, var(--foreground) 8%, transparent)' : 'none'}; outline: {isHighlighted ? '2px solid var(--primary)' : 'none'}; outline-offset: 1px;"
            >
              <!-- eslint-disable-next-line svelte/no-at-html-tags -->
              {@html highlightText(msg.text, chatSearchValue)}
            </div>
            {#if isLast}
              <p class="text-[10px] mt-1 px-1 flex items-center gap-0.5" style="color: var(--muted-foreground); opacity: 0.6">
                {msg.time}
                {#if msg.isMe}
                  {#if msg.read}<CheckCheck class="w-3 h-3" style="color: var(--primary)" />{:else}<Check class="w-3 h-3" />{/if}
                {/if}
              </p>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Інпут -->
  <div
    class="px-4 border-t shrink-0"
    style="border-color: var(--border); background-color: var(--bg-header); padding-top: 12px; padding-bottom: {showBackButton ? 'calc(72px + env(safe-area-inset-bottom, 0px))' : '12px'}"
  >
    <div
      class="flex items-center gap-2 rounded-2xl px-3 border transition-colors"
      style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent); border-color: color-mix(in oklch, var(--foreground) 8%, transparent); min-height: 44px;"
    >
      <button type="button" class="shrink-0 cursor-pointer" style="color: var(--muted-foreground)">
        <Paperclip class="w-4 h-4" />
      </button>

      <textarea
        bind:this={textareaEl}
        bind:value={messageText}
        placeholder="Написати повідомлення..."
        rows="1"
        oninput={autoResize}
        onkeydown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
          }
        }}
        class="flex-1 bg-transparent outline-none text-sm leading-relaxed py-3"
        style="resize: none; overflow-y: auto; min-height: 20px; max-height: 128px; color: var(--foreground); -webkit-text-fill-color: var(--foreground);"
      ></textarea>

      <div class="flex items-center gap-1.5 shrink-0">
        <button type="button" class="shrink-0 cursor-pointer" style="color: var(--muted-foreground)">
          <Smile class="w-4 h-4" />
        </button>
        {#if messageText.trim()}
          <button
            type="button"
            onclick={() => { messageText = ''; if (textareaEl) textareaEl.style.height = 'auto' }}
            class="shrink-0 cursor-pointer"
            style="color: var(--muted-foreground)"
          >
            <X class="w-4 h-4" />
          </button>
          <button
            type="button"
            onclick={sendMessage}
            class="w-7 h-7 flex items-center justify-center rounded-lg bg-primary text-white hover:opacity-90 transition-all cursor-pointer"
          >
            <Send class="w-3.5 h-3.5" />
          </button>
        {/if}
      </div>
    </div>
  </div>

</main>

<style>
  .messages-scroll {
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }
  .messages-scroll:hover {
    scrollbar-color: color-mix(in oklch, currentColor 20%, transparent) transparent;
  }
  .messages-scroll::-webkit-scrollbar { width: 3px; }
  .messages-scroll::-webkit-scrollbar-track { background: transparent; }
  .messages-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 999px; }
  .messages-scroll:hover::-webkit-scrollbar-thumb { background: color-mix(in oklch, currentColor 20%, transparent); }

  :global(mark) {
    background-color: color-mix(in oklch, var(--primary) 30%, transparent);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
  }

  textarea::placeholder {
    color: var(--muted-foreground);
    opacity: 0.6;
  }
</style>