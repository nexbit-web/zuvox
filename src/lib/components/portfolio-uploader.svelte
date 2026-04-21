<!-- src/lib/components/portfolio-uploader.svelte -->
<script lang="ts">
  import { Plus, X, Loader2, ImageIcon } from 'lucide-svelte'

  interface PortfolioItem {
    url: string
    publicId: string
  }

  interface Props {
    items?: PortfolioItem[]
    maxItems?: number
    onchange?: (items: PortfolioItem[]) => void
  }

  let {
    items = $bindable([]),
    maxItems = 5,
    onchange,
  }: Props = $props()

  let fileInput = $state<HTMLInputElement>()
  let uploadingCount = $state(0)
  let error = $state('')
  let removingId = $state<string | null>(null)

  const canAddMore = $derived(items.length + uploadingCount < maxItems)
  const slotsToShow = $derived(Math.min(items.length + 1, maxItems))
  const emptySlots = $derived(Math.max(0, 3 - slotsToShow)) // щоб завжди було мінімум 3 плитки в сітці

  async function handleFiles(e: Event) {
    const input = e.target as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (!files.length) return

    error = ''
    const available = maxItems - items.length - uploadingCount
    const toUpload = files.slice(0, available)

    if (files.length > available) {
      error = `Можна додати ще ${available} фото`
    }

    for (const file of toUpload) {
      uploadOne(file)
    }

    if (fileInput) fileInput.value = ''
  }

  async function uploadOne(file: File) {
    if (!file.type.startsWith('image/')) {
      error = 'Тільки зображення'
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      error = 'Файл має бути до 10 МБ'
      return
    }

    uploadingCount++

    try {
      const sigRes = await fetch('/api/upload/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'portfolio' }),
      })
      if (!sigRes.ok) throw new Error('sign')
      const { timestamp, signature, apiKey, cloudName, folder } =
        await sigRes.json()

      const form = new FormData()
      form.append('file', file)
      form.append('api_key', apiKey)
      form.append('timestamp', String(timestamp))
      form.append('signature', signature)
      form.append('folder', folder)

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: form },
      )
      if (!uploadRes.ok) throw new Error('upload')
      const uploaded = await uploadRes.json()
      const url: string = uploaded.secure_url
      const publicId: string = uploaded.public_id

      const saveRes = await fetch('/api/user/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'portfolio-add', url, publicId }),
      })
      if (!saveRes.ok) throw new Error('save')

      items = [...items, { url, publicId }]
      onchange?.(items)
    } catch {
      error = 'Не вдалось завантажити'
    } finally {
      uploadingCount--
    }
  }

  async function remove(publicId: string) {
    removingId = publicId
    try {
      const res = await fetch('/api/user/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'portfolio-remove', publicId }),
      })
      if (!res.ok) throw new Error('remove')
      items = items.filter((i) => i.publicId !== publicId)
      onchange?.(items)
    } catch {
      error = 'Не вдалось видалити'
    } finally {
      removingId = null
    }
  }
</script>

<div>
  <div class="grid grid-cols-3 gap-2">
    <!-- вже завантажені -->
    {#each items as item (item.publicId)}
      {@const isRemoving = removingId === item.publicId}
      <div
        class="relative aspect-square rounded-xl overflow-hidden group border"
        style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
      >
        <img
          src={item.url}
          alt="portfolio"
          class="w-full h-full object-cover"
        />

        <!-- видалити -->
        <button
          type="button"
          onclick={() => remove(item.publicId)}
          disabled={isRemoving}
          aria-label="Видалити"
          class="absolute top-2 right-2 size-7 rounded-full flex items-center justify-center cursor-pointer transition-all opacity-0 group-hover:opacity-100 hover:scale-105"
          style="background-color: rgba(0,0,0,0.7); backdrop-filter: blur(8px)"
        >
          {#if isRemoving}
            <Loader2 class="size-3.5 animate-spin text-white" />
          {:else}
            <X class="size-3.5 text-white" />
          {/if}
        </button>

        {#if isRemoving}
          <div
            class="absolute inset-0 flex items-center justify-center"
            style="background-color: rgba(0,0,0,0.5)"
          >
            <Loader2 class="size-5 animate-spin text-white" />
          </div>
        {/if}
      </div>
    {/each}

    <!-- skeleton під час завантаження -->
    {#each Array(uploadingCount) as _}
      <div
        class="aspect-square rounded-xl flex items-center justify-center border"
        style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
               border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
      >
        <Loader2
          class="size-5 animate-spin"
          style="color: var(--muted-foreground)"
        />
      </div>
    {/each}

    <!-- плитка додавання -->
    {#if canAddMore}
      <button
        type="button"
        onclick={() => fileInput?.click()}
        class="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors border-2 border-dashed hover:opacity-70"
        style="border-color: color-mix(in oklch, var(--foreground) 14%, transparent);
               background-color: color-mix(in oklch, var(--foreground) 2%, transparent)"
        aria-label="Додати фото"
      >
        <div
          class="size-9 rounded-full flex items-center justify-center"
          style="background-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <Plus class="size-4" style="color: var(--muted-foreground)" />
        </div>
        <span
          class="text-[11px] font-medium"
          style="color: var(--muted-foreground)"
        >
          Додати
        </span>
      </button>
    {/if}

    <!-- порожні слоти для рівномірної сітки -->
    {#if items.length === 0 && uploadingCount === 0}
      {#each Array(emptySlots) as _}
        <div
          class="aspect-square rounded-xl flex items-center justify-center opacity-50"
          style="background-color: color-mix(in oklch, var(--foreground) 2%, transparent)"
        >
          <ImageIcon
            class="size-5"
            style="color: var(--muted-foreground); opacity: 0.4"
          />
        </div>
      {/each}
    {/if}
  </div>

  <!-- статус -->
  <div class="flex items-center justify-between mt-3 text-xs">
    <span style="color: var(--muted-foreground)">
      {items.length} з {maxItems} робіт
    </span>
    {#if error}
      <span style="color: var(--destructive)">{error}</span>
    {/if}
  </div>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/*"
    multiple
    onchange={handleFiles}
    class="hidden"
  />
</div>