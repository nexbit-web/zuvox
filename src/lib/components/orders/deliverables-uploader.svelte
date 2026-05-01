<!-- src/lib/components/orders/deliverables-uploader.svelte -->
<script lang="ts">
  import {
    Upload,
    X,
    FileText,
    Image as ImageIcon,
    Loader2,
  } from 'lucide-svelte'

  interface Props {
    /** Поточні файли */
    files: string[]
    /** Бекенд-індекс public_ids (опційно, для майбутнього delete з Cloudinary) */
    onChange?: (files: string[]) => void
    disabled?: boolean
  }

  let { files = $bindable([]), onChange, disabled = false }: Props = $props()

  let uploading = $state(false)
  let error = $state('')
  let inputEl = $state<HTMLInputElement | undefined>(undefined)

  function fileType(url: string): 'image' | 'doc' {
    const lower = url.toLowerCase()
    if (
      lower.includes('.jpg') ||
      lower.includes('.jpeg') ||
      lower.includes('.png') ||
      lower.includes('.gif') ||
      lower.includes('.webp')
    ) {
      return 'image'
    }
    return 'doc'
  }

  function fileName(url: string): string {
    try {
      const parts = url.split('/')
      const last = parts[parts.length - 1]
      const decoded = decodeURIComponent(last)
      // Cloudinary додає суфікс — обрізаємо після останньої крапки
      if (decoded.length > 40) return decoded.slice(0, 40) + '…'
      return decoded
    } catch {
      return 'файл'
    }
  }

  async function handleUpload(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      error = 'Файл більше 50 МБ'
      return
    }

    uploading = true
    error = ''
    try {
      const isImage = file.type.startsWith('image/')

      const sigRes = await fetch('/api/upload/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'zunor/deliverables',
          resourceType: isImage ? 'image' : 'raw',
        }),
      })
      if (!sigRes.ok) throw new Error('Не вдалося отримати токен')
      const sig = await sigRes.json()

      const fd = new FormData()
      fd.append('file', file)
      fd.append('api_key', sig.apiKey)
      fd.append('timestamp', String(sig.timestamp))
      fd.append('signature', sig.signature)
      fd.append('folder', sig.folder)

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/${isImage ? 'image' : 'raw'}/upload`,
        { method: 'POST', body: fd },
      )
      if (!upRes.ok) throw new Error('Помилка завантаження')
      const up = await upRes.json()

      files = [...files, up.secure_url]
      onChange?.(files)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Помилка'
    } finally {
      uploading = false
    }
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) handleUpload(file)
    input.value = ''
  }

  function remove(idx: number) {
    files = files.filter((_, i) => i !== idx)
    onChange?.(files)
  }
</script>

<div>
  {#if files.length > 0}
    <div class="space-y-2 mb-3">
      {#each files as url, idx (url)}
        {@const type = fileType(url)}
        <div
          class="flex items-center gap-3 p-2.5 rounded-lg"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          {#if type === 'image'}
            <div
              class="size-10 rounded shrink-0 overflow-hidden"
              style="background-color: var(--background)"
            >
              <img src={url} alt="" class="w-full h-full object-cover" />
            </div>
          {:else}
            <div
              class="size-10 rounded shrink-0 flex items-center justify-center"
              style="background-color: var(--background)"
            >
              <FileText class="size-5" style="color: var(--muted-foreground)" />
            </div>
          {/if}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            class="flex-1 text-xs hover:underline truncate"
            style="color: var(--foreground)"
          >
            {fileName(url)}
          </a>
          {#if !disabled}
            <button
              type="button"
              onclick={() => remove(idx)}
              class="size-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70 shrink-0"
              style="color: var(--muted-foreground)"
              aria-label="Видалити"
            >
              <X class="size-4" />
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if !disabled}
    <button
      type="button"
      onclick={() => inputEl?.click()}
      disabled={uploading || files.length >= 20}
      class="w-full h-12 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors text-sm"
      style="background-color: var(--muted);
             border: 2px dashed var(--border);
             color: var(--muted-foreground);
             {uploading || files.length >= 20
        ? 'opacity: 0.5; cursor: not-allowed'
        : ''}"
    >
      {#if uploading}
        <Loader2 class="size-4 animate-spin" />
        Завантаження…
      {:else if files.length >= 20}
        Максимум 20 файлів
      {:else}
        <Upload class="size-4" />
        Додати файл
      {/if}
    </button>

    <input
      bind:this={inputEl}
      type="file"
      onchange={onFileInput}
      class="sr-only"
    />

    {#if error}
      <p class="text-xs mt-2" style="color: var(--destructive)">
        {error}
      </p>
    {/if}
  {/if}
</div>
