<!-- src/lib/components/chat/message-bubble.svelte -->
<script lang="ts">
  import {
    Check,
    CheckCheck,
    FileText,
    Download,
    Clock,
    AlertCircle,
  } from 'lucide-svelte'
  import type { ChatMessage } from './types'

  interface Props {
    message: ChatMessage
    isMine: boolean
    isLastInGroup: boolean
    showReadStatus: boolean
    isRead: boolean
    /** Чи повідомлення ще летить на сервер */
    isPending?: boolean
    /** Чи відправка провалилася */
    isFailed?: boolean
    onReply?: (m: ChatMessage) => void
  }

  let {
    message,
    isMine,
    isLastInGroup,
    showReadStatus,
    isRead,
    isPending = false,
    isFailed = false,
    onReply,
  }: Props = $props()

  const time = $derived(
    new Date(message.createdAt).toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  )

  function formatSize(bytes: number | null): string {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const radiusClass = $derived(
    isMine
      ? isLastInGroup
        ? 'rounded-2xl rounded-br-md'
        : 'rounded-2xl'
      : isLastInGroup
        ? 'rounded-2xl rounded-bl-md'
        : 'rounded-2xl',
  )
</script>

<div class="flex {isMine ? 'justify-end' : 'justify-start'} group">
  <div class="max-w-[85%] sm:max-w-[70%] flex flex-col gap-0.5">
    {#if message.replyTo}
      <div
        class="px-3 py-1.5 rounded-lg mb-1 border-l-2 text-xs leading-tight"
        style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
               border-left-color: var(--primary);
               color: var(--muted-foreground)"
      >
        <p
          class="font-medium mb-0.5"
          style="color: color-mix(in oklch, var(--foreground) 70%, transparent)"
        >
          У відповідь на
        </p>
        <p class="line-clamp-2">
          {message.replyTo.type === 'PHOTO'
            ? '📷 Фото'
            : message.replyTo.type === 'FILE'
              ? '📎 Файл'
              : message.replyTo.text || ''}
        </p>
      </div>
    {/if}

    <div
      class="relative {radiusClass} px-3 py-2 transition-opacity"
      style="background-color: {isMine
        ? 'var(--primary)'
        : 'color-mix(in oklch, var(--foreground) 5%, transparent)'};
             color: {isMine
        ? 'var(--primary-foreground)'
        : 'var(--foreground)'};
             opacity: {isPending ? 0.65 : 1}"
    >
      {#if message.deletedAt}
        <p class="text-sm italic opacity-60">Повідомлення видалено</p>
      {:else if message.type === 'PHOTO' && message.attachmentUrl}
        <a
          href={message.attachmentUrl}
          target="_blank"
          rel="noopener"
          class="block -mx-3 -my-2 mb-1 rounded-2xl overflow-hidden"
        >
          <img
            src={message.attachmentUrl}
            alt={message.text || 'Фото'}
            class="block w-full max-w-sm h-auto object-cover cursor-zoom-in"
            loading="lazy"
          />
        </a>
        {#if message.text}
          <p
            class="text-sm leading-snug whitespace-pre-wrap break-words mt-1.5"
            style="overflow-wrap: anywhere"
          >
            {message.text}
          </p>
        {/if}
      {:else if message.type === 'FILE' && message.attachmentUrl}
        <a
          href={message.attachmentUrl}
          target="_blank"
          rel="noopener"
          download={message.attachmentName ?? undefined}
          class="flex items-center gap-3 py-1 group/file"
        >
          <div
            class="size-10 rounded-xl flex items-center justify-center shrink-0"
            style={isMine
              ? 'background-color: rgba(255,255,255,0.18)'
              : 'background-color: color-mix(in oklch, var(--primary) 12%, transparent)'}
          >
            <FileText
              class="size-5"
              style={isMine ? 'color: white' : 'color: var(--primary)'}
            />
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">
              {message.attachmentName ?? 'Файл'}
            </p>
            <p
              class="text-xs"
              style={isMine
                ? 'color: rgba(255,255,255,0.7)'
                : 'color: var(--muted-foreground)'}
            >
              {formatSize(message.attachmentSize)}
            </p>
          </div>
          <Download
            class="size-4 shrink-0 opacity-0 group-hover/file:opacity-100 transition-opacity"
          />
        </a>
        {#if message.text}
          <p
            class="text-sm leading-snug whitespace-pre-wrap break-words mt-1"
            style="overflow-wrap: anywhere"
          >
            {message.text}
          </p>
        {/if}
      {:else}
        <p
          class="text-sm leading-snug whitespace-pre-wrap break-words"
          style="overflow-wrap: anywhere"
        >
          {message.text}
        </p>
      {/if}

      <div class="flex items-center gap-1 justify-end mt-0.5 -mb-0.5">
        {#if message.editedAt}
          <span
            class="text-[10px] opacity-60"
            style={isMine
              ? 'color: rgba(255,255,255,0.85)'
              : 'color: var(--muted-foreground)'}
          >
            ред.
          </span>
        {/if}
        <span
          class="text-[10px] tabular-nums"
          style={isMine
            ? 'color: rgba(255,255,255,0.75)'
            : 'color: var(--muted-foreground)'}
        >
          {time}
        </span>

        {#if isMine}
          {#if isFailed}
            <span title="Не вдалося надіслати" class="inline-flex">
              <AlertCircle class="size-3" style="color: #ef4444" />
            </span>
          {:else if isPending}
            <span title="Надсилається..." class="inline-flex">
              <Clock class="size-3" style="color: rgba(255,255,255,0.7)" />
            </span>
          {:else if showReadStatus}
            {#if isRead}
              <CheckCheck
                class="size-3"
                style="color: rgba(255,255,255,0.95)"
              />
            {:else}
              <Check class="size-3" style="color: rgba(255,255,255,0.7)" />
            {/if}
          {/if}
        {/if}
      </div>
    </div>

    {#if onReply && !message.deletedAt && !isPending && !isFailed}
      <button
        type="button"
        onclick={() => onReply?.(message)}
        class="self-{isMine
          ? 'end'
          : 'start'} text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:underline"
        style="color: var(--muted-foreground)"
      >
        Відповісти
      </button>
    {/if}
  </div>
</div>
