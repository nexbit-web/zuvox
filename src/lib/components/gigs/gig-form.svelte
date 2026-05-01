<!-- src/lib/components/gigs/gig-form.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    ChevronLeft,
    ChevronRight,
    Save,
    X,
    Plus,
    Loader2,
    Image as ImageIcon,
    Trash2,
  } from 'lucide-svelte'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Button } from '$lib/components/ui/button'

  type Tier = 'BASIC' | 'STANDARD' | 'PREMIUM'

  interface PackageInput {
    tier: Tier
    name: string
    description: string
    priceUah: string
    deliveryDays: string
    revisions: string
    features: string[]
    enabled: boolean
  }

  interface Props {
    /** Якщо передано — режим редагування */
    initial?: {
      id: string
      title: string
      description: string
      shortDescription: string | null
      category: string
      subcategory: string | null
      tags: string[]
      images: string[]
      imagesPublicIds: string[]
      packages: Array<{
        tier: string
        name: string
        description: string | null
        priceCents: number
        deliveryDays: number
        revisions: number
        features: string[]
      }>
    }
  }

  let { initial }: Props = $props()

  // ─── Steps ───
  let step = $state(1)
  const STEPS = [
    { n: 1, label: 'Огляд' },
    { n: 2, label: 'Пакети' },
    { n: 3, label: 'Галерея' },
  ]

  // ─── Form state ───
  let title = $state(initial?.title ?? '')
  let description = $state(initial?.description ?? '')
  let shortDescription = $state(initial?.shortDescription ?? '')
  let category = $state(initial?.category ?? '')
  let subcategory = $state(initial?.subcategory ?? '')
  let tagsInput = $state((initial?.tags ?? []).join(', '))
  let images = $state<string[]>(initial?.images ?? [])
  let imagesPublicIds = $state<string[]>(initial?.imagesPublicIds ?? [])

  // Пакети — три tier завжди в формі. enabled = false = не зберігати.
  function initPackages(): PackageInput[] {
    const tiers: Tier[] = ['BASIC', 'STANDARD', 'PREMIUM']
    return tiers.map((tier) => {
      const existing = initial?.packages.find((p) => p.tier === tier)
      return {
        tier,
        name: existing?.name ?? '',
        description: existing?.description ?? '',
        priceUah: existing ? String(existing.priceCents / 100) : '',
        deliveryDays: existing ? String(existing.deliveryDays) : '',
        revisions: existing ? String(existing.revisions) : '1',
        features: existing?.features ?? [],
        enabled: !!existing || tier === 'BASIC', // BASIC завжди enabled
      }
    })
  }
  let packages = $state<PackageInput[]>(initPackages())

  // Errors / loading
  let submitting = $state(false)
  let error = $state('')

  // ─── Validation per step ───
  function validateStep1(): string | null {
    if (title.trim().length < 10) return 'Назва: мінімум 10 символів'
    if (title.length > 120) return 'Назва: максимум 120 символів'
    if (description.trim().length < 50) return 'Опис: мінімум 50 символів'
    if (!category.trim()) return 'Виберіть категорію'
    return null
  }

  function validateStep2(): string | null {
    const enabled = packages.filter((p) => p.enabled)
    if (!enabled.find((p) => p.tier === 'BASIC')) {
      return "Базовий пакет обов'язковий"
    }
    for (const p of enabled) {
      if (!p.priceUah || Number(p.priceUah) < 100) {
        return `${p.tier}: ціна від 100 грн`
      }
      if (!p.deliveryDays || Number(p.deliveryDays) < 1) {
        return `${p.tier}: вкажіть термін`
      }
    }
    // Кожен наступний tier має бути дорожчим
    const sorted = enabled.sort(
      (a, b) =>
        ['BASIC', 'STANDARD', 'PREMIUM'].indexOf(a.tier) -
        ['BASIC', 'STANDARD', 'PREMIUM'].indexOf(b.tier),
    )
    for (let i = 1; i < sorted.length; i++) {
      if (Number(sorted[i].priceUah) <= Number(sorted[i - 1].priceUah)) {
        return `${sorted[i].tier} має коштувати більше за ${sorted[i - 1].tier}`
      }
    }
    return null
  }

  function nextStep() {
    error = ''
    if (step === 1) {
      const e = validateStep1()
      if (e) {
        error = e
        return
      }
    }
    if (step === 2) {
      const e = validateStep2()
      if (e) {
        error = e
        return
      }
    }
    step = Math.min(3, step + 1)
  }

  function prevStep() {
    error = ''
    step = Math.max(1, step - 1)
  }

  // ─── Tags helpers ───
  const tags = $derived(
    tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10),
  )

  // ─── Image upload ───
  let uploadingImage = $state(false)
  let imageInput = $state<HTMLInputElement | undefined>(undefined)

  async function uploadImage(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      error = 'Файл занадто великий (макс 10 МБ)'
      return
    }

    uploadingImage = true
    try {
      // 1. Get signature
      const sigRes = await fetch('/api/upload/signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder: 'zunor/users/' + (initial?.id ?? 'gigs'),
          resourceType: 'image',
        }),
      })
      if (!sigRes.ok) throw new Error('Не вдалося отримати токен')
      const sig = await sigRes.json()

      // 2. Upload to Cloudinary
      const fd = new FormData()
      fd.append('file', file)
      fd.append('api_key', sig.apiKey)
      fd.append('timestamp', String(sig.timestamp))
      fd.append('signature', sig.signature)
      fd.append('folder', sig.folder)

      const upRes = await fetch(
        `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
        { method: 'POST', body: fd },
      )
      if (!upRes.ok) throw new Error('Помилка завантаження')
      const up = await upRes.json()

      images = [...images, up.secure_url]
      imagesPublicIds = [...imagesPublicIds, up.public_id]
    } catch (err) {
      error = err instanceof Error ? err.message : 'Помилка завантаження'
    } finally {
      uploadingImage = false
    }
  }

  function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (file) uploadImage(file)
    input.value = ''
  }

  function removeImage(idx: number) {
    images = images.filter((_, i) => i !== idx)
    imagesPublicIds = imagesPublicIds.filter((_, i) => i !== idx)
  }

  // ─── Feature helpers per package ───
  function addFeature(pkgIdx: number, feature: string) {
    if (!feature.trim()) return
    packages[pkgIdx].features = [...packages[pkgIdx].features, feature.trim()]
  }

  function removeFeature(pkgIdx: number, fIdx: number) {
    packages[pkgIdx].features = packages[pkgIdx].features.filter(
      (_, i) => i !== fIdx,
    )
  }

  // ─── Submit ───
  async function handleSubmit(publishNow = false) {
    error = ''
    submitting = true

    try {
      // Final validation
      const e1 = validateStep1()
      if (e1) {
        step = 1
        error = e1
        submitting = false
        return
      }
      const e2 = validateStep2()
      if (e2) {
        step = 2
        error = e2
        submitting = false
        return
      }

      const enabledPackages = packages
        .filter((p) => p.enabled)
        .map((p) => ({
          tier: p.tier,
          name: p.name.trim(),
          description: p.description.trim() || null,
          priceUah: Number(p.priceUah),
          deliveryDays: Number(p.deliveryDays),
          revisions: Number(p.revisions),
          features: p.features,
        }))

      const body: any = {
        title: title.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        category: category.trim(),
        subcategory: subcategory.trim() || null,
        tags,
        images,
        imagesPublicIds,
        packages: enabledPackages,
      }

      let url: string
      let method: 'POST' | 'PATCH'

      if (initial) {
        url = `/api/gigs/${initial.id}`
        method = 'PATCH'
        if (publishNow) body.status = 'ACTIVE'
      } else {
        url = '/api/gigs'
        method = 'POST'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Помилка збереження')
      }

      const json = await res.json()
      const gigId = json.gig.id

      // Якщо створення + одразу публікація
      if (!initial && publishNow) {
        await fetch(`/api/gigs/${gigId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ACTIVE' }),
        })
      }

      goto('/dashboard/gigs')
    } catch (err) {
      error = err instanceof Error ? err.message : 'Помилка'
    } finally {
      submitting = false
    }
  }

  function tierLabel(tier: string): string {
    return tier === 'BASIC'
      ? 'Базовий'
      : tier === 'STANDARD'
        ? 'Стандартний'
        : 'Преміум'
  }
</script>

<div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
  <h1
    class="text-2xl font-semibold tracking-tight mb-2"
    style="color: var(--foreground)"
  >
    {initial ? 'Редагувати гіг' : 'Новий гіг'}
  </h1>
  <p class="text-sm mb-6" style="color: var(--muted-foreground)">
    Заповніть інформацію щоб клієнти могли вас знайти
  </p>

  <!-- Stepper -->
  <div class="flex items-center gap-2 mb-8">
    {#each STEPS as s, i}
      {@const isActive = step === s.n}
      {@const isPassed = step > s.n}
      <div class="flex items-center gap-2 flex-1">
        <div
          class="size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
          style="background-color: {isActive || isPassed
            ? 'var(--primary)'
            : 'var(--muted)'};
                 color: {isActive || isPassed
            ? 'var(--primary-foreground)'
            : 'var(--muted-foreground)'}"
        >
          {s.n}
        </div>
        <span
          class="text-xs font-medium hidden sm:inline"
          style="color: {isActive
            ? 'var(--foreground)'
            : 'var(--muted-foreground)'}"
        >
          {s.label}
        </span>
        {#if i < STEPS.length - 1}
          <div
            class="flex-1 h-px"
            style="background-color: {isPassed
              ? 'var(--primary)'
              : 'var(--border)'}"
          ></div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- ━━━ STEP 1: Огляд ━━━ -->
  {#if step === 1}
    <div class="space-y-5">
      <div>
        <label
          class="text-xs font-medium mb-1.5 block"
          style="color: var(--muted-foreground)"
        >
          Назва гіга
        </label>
        <Input
          type="text"
          bind:value={title}
          placeholder="Я зроблю..."
          maxlength={120}
        />
        <p class="text-[11px] mt-1" style="color: var(--muted-foreground)">
          Починайте з "Я зроблю...". Мінімум 10 символів.
        </p>
      </div>

      <div>
        <label
          class="text-xs font-medium mb-1.5 block"
          style="color: var(--muted-foreground)"
        >
          Категорія
        </label>
        <Input
          type="text"
          bind:value={category}
          placeholder="Розробка сайтів"
        />
      </div>

      <div>
        <label
          class="text-xs font-medium mb-1.5 block"
          style="color: var(--muted-foreground)"
        >
          Підкатегорія (опційно)
        </label>
        <Input
          type="text"
          bind:value={subcategory}
          placeholder="Landing page"
        />
      </div>

      <div>
        <label
          class="text-xs font-medium mb-1.5 block"
          style="color: var(--muted-foreground)"
        >
          Короткий опис (для карток)
        </label>
        <Input
          type="text"
          bind:value={shortDescription}
          placeholder="Tilda + адаптив + SEO"
          maxlength={280}
        />
        <p class="text-[11px] mt-1" style="color: var(--muted-foreground)">
          {shortDescription.length}/280
        </p>
      </div>

      <div>
        <label
          class="text-xs font-medium mb-1.5 block"
          style="color: var(--muted-foreground)"
        >
          Опис послуги
        </label>
        <Textarea
          bind:value={description}
          placeholder="Детально опишіть що ви робите, як виглядає процес роботи, що клієнт отримає в результаті..."
          rows={8}
          maxlength={10000}
        />
        <p class="text-[11px] mt-1" style="color: var(--muted-foreground)">
          {description.length}/10000 (мінімум 50)
        </p>
      </div>

      <div>
        <label
          class="text-xs font-medium mb-1.5 block"
          style="color: var(--muted-foreground)"
        >
          Теги (через кому, до 10)
        </label>
        <Input
          type="text"
          bind:value={tagsInput}
          placeholder="tilda, landing, конверсія"
        />
        {#if tags.length > 0}
          <div class="flex flex-wrap gap-1.5 mt-2">
            {#each tags as tag}
              <span
                class="px-2 py-0.5 rounded-full text-xs"
                style="background-color: var(--muted); color: var(--muted-foreground)"
              >
                #{tag}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- ━━━ STEP 2: Пакети ━━━ -->
  {:else if step === 2}
    <div class="space-y-5">
      {#each packages as pkg, idx}
        {@const isBasic = pkg.tier === 'BASIC'}
        <div
          class="rounded-xl p-4"
          style="background-color: var(--muted); border: 1px solid var(--border);
                 opacity: {pkg.enabled ? 1 : 0.5}"
        >
          <div class="flex items-center justify-between mb-4">
            <h3
              class="text-base font-semibold"
              style="color: var(--foreground)"
            >
              {tierLabel(pkg.tier)}
              {#if isBasic}
                <span
                  class="text-[10px] font-normal ml-1"
                  style="color: var(--muted-foreground)"
                >
                  (обов'язковий)
                </span>
              {/if}
            </h3>
            {#if !isBasic}
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  bind:checked={pkg.enabled}
                  class="size-4"
                />
                <span class="text-xs" style="color: var(--foreground)">
                  Увімкнути
                </span>
              </label>
            {/if}
          </div>

          {#if pkg.enabled}
            <div class="space-y-3">
              <div>
                <label
                  class="text-[11px] font-medium block mb-1"
                  style="color: var(--muted-foreground)"
                >
                  Назва пакету (опційно)
                </label>
                <Input
                  type="text"
                  bind:value={pkg.name}
                  placeholder={tierLabel(pkg.tier)}
                  maxlength={60}
                />
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label
                    class="text-[11px] font-medium block mb-1"
                    style="color: var(--muted-foreground)"
                  >
                    Ціна, ₴
                  </label>
                  <Input
                    type="number"
                    bind:value={pkg.priceUah}
                    min={100}
                    max={50000}
                    placeholder="1500"
                  />
                </div>
                <div>
                  <label
                    class="text-[11px] font-medium block mb-1"
                    style="color: var(--muted-foreground)"
                  >
                    Днів
                  </label>
                  <Input
                    type="number"
                    bind:value={pkg.deliveryDays}
                    min={1}
                    max={180}
                    placeholder="7"
                  />
                </div>
                <div>
                  <label
                    class="text-[11px] font-medium block mb-1"
                    style="color: var(--muted-foreground)"
                  >
                    Правки
                  </label>
                  <Input
                    type="number"
                    bind:value={pkg.revisions}
                    min={-1}
                    max={10}
                  />
                </div>
              </div>

              <div>
                <label
                  class="text-[11px] font-medium block mb-1"
                  style="color: var(--muted-foreground)"
                >
                  Що входить (по одному пункту)
                </label>
                <div class="space-y-1.5">
                  {#each pkg.features as feat, fIdx}
                    <div class="flex items-center gap-2">
                      <Input
                        type="text"
                        value={feat}
                        oninput={(e) => {
                          const v = (e.target as HTMLInputElement).value
                          packages[idx].features[fIdx] = v
                        }}
                        class="flex-1"
                      />
                      <button
                        type="button"
                        onclick={() => removeFeature(idx, fIdx)}
                        class="size-9 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70"
                        style="color: var(--muted-foreground)"
                        aria-label="Видалити"
                      >
                        <X class="size-4" />
                      </button>
                    </div>
                  {/each}
                  <button
                    type="button"
                    onclick={() => addFeature(idx, 'Нова перевага')}
                    class="text-xs flex items-center gap-1 cursor-pointer hover:underline"
                    style="color: var(--primary)"
                  >
                    <Plus class="size-3.5" />
                    Додати пункт
                  </button>
                </div>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- ━━━ STEP 3: Галерея ━━━ -->
  {:else if step === 3}
    <div>
      <label
        class="text-xs font-medium mb-1.5 block"
        style="color: var(--muted-foreground)"
      >
        Зображення (до 10, перше — обкладинка)
      </label>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {#each images as img, idx (img)}
          <div
            class="relative aspect-square rounded-xl overflow-hidden group"
            style="background-color: var(--muted)"
          >
            <img
              src={img}
              alt=""
              class="w-full h-full object-cover"
              loading="lazy"
            />
            {#if idx === 0}
              <span
                class="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold rounded"
                style="background-color: var(--primary); color: var(--primary-foreground)"
              >
                Обкладинка
              </span>
            {/if}
            <button
              type="button"
              onclick={() => removeImage(idx)}
              class="absolute top-2 right-2 size-7 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              style="background-color: var(--destructive); color: white"
              aria-label="Видалити"
            >
              <Trash2 class="size-3.5" />
            </button>
          </div>
        {/each}

        {#if images.length < 10}
          <button
            type="button"
            onclick={() => imageInput?.click()}
            disabled={uploadingImage}
            class="aspect-square rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
            style="background-color: var(--muted);
                   border: 2px dashed var(--border);
                   color: var(--muted-foreground)"
          >
            {#if uploadingImage}
              <Loader2 class="size-5 animate-spin" />
              <span class="text-xs">Завантаження…</span>
            {:else}
              <ImageIcon class="size-6" />
              <span class="text-xs">Додати фото</span>
            {/if}
          </button>
        {/if}
      </div>

      <input
        bind:this={imageInput}
        type="file"
        accept="image/*"
        onchange={onFileInput}
        class="sr-only"
      />

      <p class="text-[11px]" style="color: var(--muted-foreground)">
        Перше фото показується як обкладинка у каталозі. Розмір до 10 МБ кожне.
      </p>
    </div>
  {/if}

  {#if error}
    <p
      class="mt-4 text-sm rounded-lg px-3 py-2"
      style="background-color: color-mix(in srgb, var(--destructive) 10%, transparent);
             color: var(--destructive)"
    >
      {error}
    </p>
  {/if}

  <!-- Navigation -->
  <div class="flex items-center justify-between mt-8">
    <Button
      variant="outline"
      onclick={prevStep}
      disabled={step === 1 || submitting}
    >
      <ChevronLeft class="size-4 mr-1" />
      Назад
    </Button>

    {#if step < 3}
      <Button onclick={nextStep} disabled={submitting}>
        Далі
        <ChevronRight class="size-4 ml-1" />
      </Button>
    {:else}
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          onclick={() => handleSubmit(false)}
          disabled={submitting}
        >
          {#if submitting}
            <Loader2 class="size-4 mr-1 animate-spin" />
          {:else}
            <Save class="size-4 mr-1" />
          {/if}
          Зберегти чернетку
        </Button>
        <Button onclick={() => handleSubmit(true)} disabled={submitting}>
          {submitting ? 'Збереження…' : 'Опублікувати'}
        </Button>
      </div>
    {/if}
  </div>
</div>
