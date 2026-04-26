<!-- src/lib/components/chat/message-composer.svelte -->
<script lang="ts">
  import { Send, Paperclip, X, Image as ImageIcon, Reply } from 'lucide-svelte'
  import { Button } from '$lib/components/ui/button'
  import type { ChatMessage } from './types'

  interface PendingAttachment {
    file: File
    previewUrl: string | null // local objectURL
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
    /** Виклик коли натиснуто Send */
    onSendStart?: (text: string) => void
    /** Колбек який отримує optimistic-id повідомлення (для відкату на помилці) */
    onSent?: (message: ChatMessage) => void
    onSendError?: (error: string) => void
    /** Reply-to — встановлюється з ChatWindow */
    replyTo?: ChatMessage | null
    onCancelReply?: () => void
    /** Викликається коли юзер друкує (для typing-indicator) */
    onTyping?: () => void
  }

  let {
    chatId,
    onSendStart,
    onSent,
    onSendError,
    replyTo,
    onCancelReply,
    onTyping,
  }: Props = $props()

  let text = $state('')
  let textarea = $state<HTMLTextAreaElement | undefined>(undefined)
  let pending: PendingAttachment | null = $state(null)
  let sending = $state(false)
  let dragActive = $state(false)

  const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
  const PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  // ─── Auto-resize textarea ───
  $effect(() => {
    if (!textarea) return
    text // tracking
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
  })

  // ─── Файл вибрано ───
  function handleFile(file: File) {
    if (file.size > MAX_SIZE) {
      onSendError?.('Файл занадто великий. Максимум 10 МБ.')
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
    input.value = '' // дозволяє вибрати той самий файл знову
  }

  // ─── Drag-n-drop ───
  function onDragEnter(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer?.types.includes('Files')) {
      dragActive = true
    }
  }

  function onDragLeave(e: DragEvent) {
    // Перевіряємо чи курсор реально вийшов із зони (а не зайшов у дочірній)
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

  // ─── Paste з буфера обміну (фото з clipboard) ───
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

  // ─── Завантаження на Cloudinary через signed upload ───
  async function uploadToCloudinary(
    file: File,
    type: 'PHOTO' | 'FILE',
  ): Promise<UploadedAttachment> {
    // 1. Отримати підписаний токен від нашого API
    const sigRes = await fetch('/api/upload/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder: 'zunor/chat',
        // для FILE дозволяємо raw, для PHOTO image
        resourceType: type === 'PHOTO' ? 'image' : 'raw',
      }),
    })
    if (!sigRes.ok) throw new Error('Не вдалося отримати токен завантаження')
    const sig = await sigRes.json()

    // 2. POST у Cloudinary
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

  // ─── Відправка ───
  async function send() {
    if (sending) return
    const trimmed = text.trim()
    if (!trimmed && !pending) return

    sending = true
    onSendStart?.(trimmed)

    try {
      let attachment: UploadedAttachment | null = null
      const type: 'TEXT' | 'PHOTO' | 'FILE' = pending?.type ?? 'TEXT'

      if (pending) {
        attachment = await uploadToCloudinary(pending.file, pending.type)
      }

      const res = await fetch(`/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          text: trimmed,
          attachment,
          replyToId: replyTo?.id ?? null,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error ?? 'Не вдалося надіслати')
      }

      const json = await res.json()
      onSent?.(json.message)

      text = ''
      clearAttachment()
      onCancelReply?.()
      textarea?.focus()
    } catch (err) {
      onSendError?.(err instanceof Error ? err.message : 'Помилка відправки')
    } finally {
      sending = false
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    // Enter без Shift — надіслати; Shift+Enter — новий рядок
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      send()
      return
    }
    onTyping?.()
  }
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
  <!-- Drag-n-drop оверлей -->
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

  <!-- Reply-to preview -->
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
            ? '📷 Фото'
            : replyTo.type === 'FILE'
              ? '📎 Файл'
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

  <!-- Attachment preview -->
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

  <!-- Поле вводу -->
  <div class="flex items-end gap-2">
    <!-- Кнопка прикріпити файл -->
    <label
      class="size-10 shrink-0 rounded-full flex items-center justify-center cursor-pointer transition-colors"
      style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent);
             color: var(--muted-foreground)"
      onmouseenter={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          'color-mix(in oklch, var(--foreground) 9%, transparent)')}
      onmouseleave={(e) =>
        ((e.currentTarget as HTMLElement).style.backgroundColor =
          'color-mix(in oklch, var(--foreground) 5%, transparent)')}
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

    <Button
      type="button"
      onclick={send}
      disabled={sending || (!text.trim() && !pending)}
      class="size-10 shrink-0 rounded-full p-0"
    >
      <Send class="size-4" />
    </Button>
  </div>
</div>
