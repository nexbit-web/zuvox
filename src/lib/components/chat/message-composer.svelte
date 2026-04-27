<!-- src/lib/components/chat/message-composer.svelte -->
<script lang="ts">
  import { Send, Paperclip, X, Image as ImageIcon, Reply } from 'lucide-svelte'
  import type { ChatMessage } from './types'

  interface PendingAttachment {
    file: File
    previewUrl: string | null
    type: 'PHOTO' | 'FILE'
  }

  interface UploadedAttachment {
    url: string
    publicId: string
    mimeType: string
    size: number
    name: string
  }

  interface Props {
    chatId: string
    currentUserId: string
    /**
     * Викликається ОДРАЗУ коли натиснули Send — повертає optimistic
     * повідомлення з тимчасовим id (`tmp-...`). ChatWindow одразу
     * додає його у список, юзер бачить його миттєво.
     */
    onSendOptimistic?: (msg: ChatMessage) => void
    /**
     * Викликається коли сервер підтвердив повідомлення — тимчасовий
     * id треба замінити на реальний.
     */
    onSendConfirmed?: (tmpId: string, real: ChatMessage) => void
    /**
     * Викликається коли відправка провалилася — повідомлення треба
     * позначити як failed або видалити.
     */
    onSendFailed?: (tmpId: string, error: string) => void
    replyTo?: ChatMessage | null
    onCancelReply?: () => void
    onTyping?: () => void
  }

  let {
    chatId,
    currentUserId,
    onSendOptimistic,
    onSendConfirmed,
    onSendFailed,
    replyTo,
    onCancelReply,
    onTyping,
  }: Props = $props()

  let text = $state('')
  let textarea = $state<HTMLTextAreaElement | undefined>(undefined)
  let pending: PendingAttachment | null = $state(null)
  let dragActive = $state(false)

  const MAX_SIZE = 10 * 1024 * 1024
  const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  // ─── Auto-resize textarea ───
  $effect(() => {
    if (!textarea) return
    text
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
  })

  function handleFile(file: File) {
    if (file.size > MAX_SIZE) {
      onSendFailed?.('', 'Файл занадто великий. Максимум 10 МБ.')
      return
    }
    const isPhoto = PHOTO_MIME.includes(file.type)
    const previewUrl = isPhoto ? URL.createObjectURL(file) : null
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)

    pending = {
      file,
      previewUrl,
      type: isPhoto ? 'PHOTO' : 'FILE',
    }
    textarea?.focus()
  }

  function clearAttachment() {
    if (pending?.previewUrl) URL.revokeObjectURL(pending.previewUrl)
    pending = null
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) handleFile(file)
    input.value = ''
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer?.types.includes('Files')) dragActive = true
  }

  function onDragLeave(e: DragEvent) {
    const rt = e.relatedTarget as Node | null
    if (!rt || !(e.currentTarget as HTMLElement).contains(rt)) {
      dragActive = false
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragActive = false
    const file = e.dataTransfer?.files?.[0]
    if (file) handleFile(file)
  }

  function onPaste(e: ClipboardEvent) {
    const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
      i.type.startsWith('image/'),
    )
    if (item) {
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        handleFile(file)
      }
    }
  }

  async function uploadToCloudinary(
    file: File,
    type: 'PHOTO' | 'FILE',
  ): Promise<UploadedAttachment> {
    const sigRes = await fetch('/api/upload/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder: 'zunor/chat',
        resourceType: type === 'PHOTO' ? 'image' : 'raw',
      }),
    })
    if (!sigRes.ok) {
      const err = await sigRes.json().catch(() => ({}))
      throw new Error(err.error ?? 'Не вдалося отримати токен завантаження')
    }
    const sig = await sigRes.json()

    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', String(sig.timestamp))
    fd.append('signature', sig.signature)
    fd.append('folder', sig.folder)

    const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${type === 'PHOTO' ? 'image' : 'raw'}/upload`
    const upRes = await fetch(uploadUrl, { method: 'POST', body: fd })
    if (!upRes.ok) throw new Error('Помилка завантаження файлу')
    const up = await upRes.json()

    return {
      url: up.secure_url,
      publicId: up.public_id,
      mimeType: file.type,
      size: file.size,
      name: file.name,
    }
  }

  /**
   * Generate temporary id (UUID-ish for optimistic UI)
   */
  function tmpId(): string {
    return 'tmp-' + Math.random().toString(36).slice(2, 10) + Date.now()
  }

  /**
   * MAIN — мгновенно показуємо повідомлення, потім грузимо у фоні.
   */
  async function send() {
    const trimmed = text.trim()
    if (!trimmed && !pending) return

    const id = tmpId()
    const type: 'TEXT' | 'PHOTO' | 'FILE' = pending?.type ?? 'TEXT'
    const currentReplyTo = replyTo
    const currentPending = pending

    // ─── 1. ОДРАЗУ показуємо optimistic повідомлення ───
    const optimistic: ChatMessage = {
      id,
      type,
      text: trimmed,
      attachmentUrl: currentPending?.previewUrl ?? null, // local preview
      attachmentMimeType: currentPending?.file.type ?? null,
      attachmentSize: currentPending?.file.size ?? null,
      attachmentName: currentPending?.file.name ?? null,
      isRead: false,
      editedAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      senderId: currentUserId,
      replyToId: currentReplyTo?.id ?? null,
      replyTo: currentReplyTo
        ? {
            id: currentReplyTo.id,
            text: currentReplyTo.text,
            senderId: currentReplyTo.senderId,
            type: currentReplyTo.type,
          }
        : null,
    }

    onSendOptimistic?.(optimistic)

    // ─── 2. Очищаємо composer (юзер може писати наступне) ───
    text = ''
    clearAttachment()
    onCancelReply?.()
    textarea?.focus()

    // ─── 3. У фоні: upload + send ───
    try {
      let attachment: UploadedAttachment | null = null
      if (currentPending) {
        attachment = await uploadToCloudinary(
          currentPending.file,
          currentPending.type,
        )
      }

      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          text: trimmed,
          attachment,
          replyToId: currentReplyTo?.id ?? null,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? 'Не вдалося надіслати')
      }

      const json = await res.json()
      onSendConfirmed?.(id, json.message)
    } catch (err) {
      onSendFailed?.(
        id,
        err instanceof Error ? err.message : 'Помилка відправки',
      )
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      send()
      return
    }
    onTyping?.()
  }

  const canSend = $derived(text.trim().length > 0 || pending !== null)
</script>

<div
  class="relative px-3 py-3 sm:px-4 sm:py-3.5"
  style="background-color: var(--background);
         border-top: 1px solid color-mix(in oklch, var(--foreground) 6%, transparent)"
  ondragenter={onDragEnter}
  ondragover={(e) => e.preventDefault()}
  ondragleave={onDragLeave}
  ondrop={onDrop}
  role="region"
  aria-label="Поле вводу"
>
  {#if dragActive}
    <div
      class="absolute inset-0 z-10 flex items-center justify-center pointer-events-none rounded-t-xl"
      style="background-color: color-mix(in oklch, var(--primary) 10%, transparent);
             border: 2px dashed var(--primary)"
    >
      <div class="text-center">
        <ImageIcon class="size-10 mx-auto mb-2" style="color: var(--primary)" />
        <p class="text-sm font-medium" style="color: var(--primary)">
          Відпустіть файл щоб надіслати
        </p>
      </div>
    </div>
  {/if}

  {#if replyTo}
    <div
      class="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg border-l-2"
      style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
             border-left-color: var(--primary)"
    >
      <Reply class="size-3.5 shrink-0" style="color: var(--primary)" />
      <div class="flex-1 min-w-0">
        <p class="text-[11px] font-medium" style="color: var(--primary)">
          У відповідь на
        </p>
        <p class="text-xs truncate" style="color: var(--muted-foreground)">
          {replyTo.type === 'PHOTO'
            ? 'Фото'
            : replyTo.type === 'FILE'
              ? 'Файл'
              : replyTo.text}
        </p>
      </div>
      <button
        type="button"
        onclick={onCancelReply}
        class="size-6 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70"
        aria-label="Скасувати відповідь"
      >
        <X class="size-3.5" style="color: var(--muted-foreground)" />
      </button>
    </div>
  {/if}

  {#if pending}
    <div
      class="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl"
      style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent)"
    >
      {#if pending.previewUrl}
        <img
          src={pending.previewUrl}
          alt=""
          class="size-12 rounded-lg object-cover shrink-0"
        />
      {:else}
        <div
          class="size-12 rounded-lg flex items-center justify-center shrink-0"
          style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
        >
          <Paperclip class="size-5" style="color: var(--primary)" />
        </div>
      {/if}
      <div class="flex-1 min-w-0">
        <p
          class="text-sm font-medium truncate"
          style="color: var(--foreground)"
        >
          {pending.file.name}
        </p>
        <p class="text-xs" style="color: var(--muted-foreground)">
          {pending.type === 'PHOTO' ? 'Фото' : 'Файл'} ·
          {(pending.file.size / 1024 / 1024).toFixed(2)} МБ
        </p>
      </div>
      <button
        type="button"
        onclick={clearAttachment}
        class="size-8 rounded-full flex items-center justify-center cursor-pointer transition-colors"
        style="background-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        aria-label="Видалити вкладення"
      >
        <X class="size-4" style="color: var(--foreground)" />
      </button>
    </div>
  {/if}

  <div class="flex items-end gap-2">
    <label
      class="size-10 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors"
      style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent);
             color: var(--muted-foreground)"
    >
      <Paperclip class="size-4" />
      <input
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.zip,.txt"
        onchange={onFileInput}
        class="sr-only"
      />
    </label>

    <textarea
      bind:this={textarea}
      bind:value={text}
      onkeydown={onKeyDown}
      onpaste={onPaste}
      placeholder="Написати повідомлення..."
      rows="1"
      class="flex-1 min-w-0 resize-none px-4 py-2.5 rounded-3xl outline-none text-sm leading-snug"
      style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent);
             color: var(--foreground);
             max-height: 160px"
      maxlength={4000}
    ></textarea>

    <button
      type="button"
      onclick={send}
      disabled={!canSend}
      class="size-10 shrink-0 rounded-full flex items-center justify-center transition-all"
      style="background-color: {canSend
        ? 'var(--primary)'
        : 'color-mix(in oklch, var(--foreground) 8%, transparent)'};
             color: {canSend
        ? 'var(--primary-foreground)'
        : 'var(--muted-foreground)'};
             cursor: {canSend ? 'pointer' : 'not-allowed'}"
    >
      <Send class="size-4" />
    </button>
  </div>
</div>
