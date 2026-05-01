<!-- src/lib/components/jobs/job-form.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Loader2, Save } from 'lucide-svelte'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Button } from '$lib/components/ui/button'

  interface Props {
    initial?: {
      id: string
      title: string
      description: string
      category: string
      subcategory: string | null
      tags: string[]
      budgetType: string
      budgetMinCents: number | null
      budgetMaxCents: number | null
      deliveryDays: number | null
      type: string
      city: string | null
    }
  }

  let { initial }: Props = $props()

  let title = $state(initial?.title ?? '')
  let description = $state(initial?.description ?? '')
  let category = $state(initial?.category ?? '')
  let subcategory = $state(initial?.subcategory ?? '')
  let tagsInput = $state((initial?.tags ?? []).join(', '))
  let type = $state(initial?.type ?? 'ANY')
  let city = $state(initial?.city ?? '')
  let deliveryDays = $state(
    initial?.deliveryDays ? String(initial.deliveryDays) : '',
  )

  // Budget
  let budgetType = $state(initial?.budgetType ?? 'FIXED')
  let budgetMaxUah = $state(
    initial?.budgetMaxCents ? String(initial.budgetMaxCents / 100) : '',
  )
  let budgetMinUah = $state(
    initial?.budgetMinCents ? String(initial.budgetMinCents / 100) : '',
  )

  let submitting = $state(false)
  let error = $state('')

  const tags = $derived(
    tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10),
  )

  async function submit() {
    if (submitting) return
    error = ''

    if (title.trim().length < 10) {
      error = 'Назва: мінімум 10 символів'
      return
    }
    if (description.trim().length < 50) {
      error = 'Опис: мінімум 50 символів'
      return
    }
    if (!category.trim()) {
      error = 'Виберіть категорію'
      return
    }
    if (budgetType === 'FIXED') {
      const v = Number(budgetMaxUah)
      if (!v || v < 100) {
        error = 'Бюджет: від 100 грн'
        return
      }
    }
    if (budgetType === 'RANGE') {
      const min = Number(budgetMinUah)
      const max = Number(budgetMaxUah)
      if (!min || !max || min < 100 || max < 100 || min >= max) {
        error = 'Невірний діапазон бюджету'
        return
      }
    }

    submitting = true
    try {
      const body: any = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        subcategory: subcategory.trim() || null,
        tags,
        type,
        city: city.trim() || null,
        deliveryDays: deliveryDays ? Number(deliveryDays) : null,
        budgetType,
      }

      if (budgetType === 'FIXED') {
        body.budgetMaxUah = Number(budgetMaxUah)
      } else if (budgetType === 'RANGE') {
        body.budgetMinUah = Number(budgetMinUah)
        body.budgetMaxUah = Number(budgetMaxUah)
      }

      const url = initial ? `/api/jobs/${initial.id}` : '/api/jobs'
      const method = initial ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Помилка')
      }

      const json = await res.json()
      goto(`/jobs/${json.job.id}`)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Помилка'
    } finally {
      submitting = false
    }
  }
</script>

<div class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
  <h1
    class="text-2xl font-semibold tracking-tight mb-2"
    style="color: var(--foreground)"
  >
    {initial ? 'Редагувати заявку' : 'Опублікувати заявку'}
  </h1>
  <p class="text-sm mb-6" style="color: var(--muted-foreground)">
    Опишіть задачу — фрілансери надішлють вам відгуки
  </p>

  <div class="space-y-5">
    <div>
      <label
        class="text-xs font-medium block mb-1.5"
        style="color: var(--muted-foreground)"
      >
        Назва
      </label>
      <Input
        bind:value={title}
        placeholder="Шукаю майстра для встановлення кондиціонера"
        maxlength={200}
      />
    </div>

    <div class="grid sm:grid-cols-2 gap-3">
      <div>
        <label
          class="text-xs font-medium block mb-1.5"
          style="color: var(--muted-foreground)"
        >
          Категорія
        </label>
        <Input bind:value={category} placeholder="Кондиціонери" />
      </div>
      <div>
        <label
          class="text-xs font-medium block mb-1.5"
          style="color: var(--muted-foreground)"
        >
          Підкатегорія (опційно)
        </label>
        <Input bind:value={subcategory} placeholder="Встановлення" />
      </div>
    </div>

    <div>
      <label
        class="text-xs font-medium block mb-1.5"
        style="color: var(--muted-foreground)"
      >
        Опис задачі
      </label>
      <Textarea
        bind:value={description}
        rows={6}
        placeholder="Що саме потрібно зробити, які особливі вимоги, що буде подано від вас..."
        maxlength={10000}
      />
      <p class="text-[10px] mt-1" style="color: var(--muted-foreground)">
        {description.length}/10000 (мін. 50)
      </p>
    </div>

    <div>
      <label
        class="text-xs font-medium block mb-1.5"
        style="color: var(--muted-foreground)"
      >
        Бюджет
      </label>
      <div class="flex gap-2 mb-2">
        {#each [{ v: 'FIXED', l: 'Фіксований' }, { v: 'RANGE', l: 'Діапазон' }, { v: 'NEGOTIABLE', l: 'Договірний' }] as opt}
          {@const isActive = budgetType === opt.v}
          <button
            type="button"
            onclick={() => (budgetType = opt.v)}
            class="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
            style="background-color: {isActive
              ? 'var(--primary)'
              : 'var(--muted)'};
                   color: {isActive
              ? 'var(--primary-foreground)'
              : 'var(--foreground)'}"
          >
            {opt.l}
          </button>
        {/each}
      </div>

      {#if budgetType === 'FIXED'}
        <Input
          type="number"
          bind:value={budgetMaxUah}
          placeholder="2000"
          min={100}
          max={50000}
        />
        <p class="text-[10px] mt-1" style="color: var(--muted-foreground)">
          Точна сума у грн (100 - 50 000)
        </p>
      {:else if budgetType === 'RANGE'}
        <div class="grid grid-cols-2 gap-2">
          <Input
            type="number"
            bind:value={budgetMinUah}
            placeholder="Від"
            min={100}
          />
          <Input
            type="number"
            bind:value={budgetMaxUah}
            placeholder="До"
            min={100}
          />
        </div>
      {:else}
        <p class="text-xs" style="color: var(--muted-foreground)">
          Готові обговорити умови з фрілансером
        </p>
      {/if}
    </div>

    <div class="grid sm:grid-cols-2 gap-3">
      <div>
        <label
          class="text-xs font-medium block mb-1.5"
          style="color: var(--muted-foreground)"
        >
          Тип роботи
        </label>
        <select
          bind:value={type}
          class="w-full h-9 rounded-md text-sm px-3 outline-none"
          style="background-color: var(--background); border: 1px solid var(--border); color: var(--foreground)"
        >
          <option value="ANY">Будь-який</option>
          <option value="ONLINE">Онлайн</option>
          <option value="OFFLINE">Офлайн</option>
          <option value="VISIT">Виїзд</option>
        </select>
      </div>
      <div>
        <label
          class="text-xs font-medium block mb-1.5"
          style="color: var(--muted-foreground)"
        >
          Місто (опційно)
        </label>
        <Input bind:value={city} placeholder="Київ" />
      </div>
    </div>

    <div>
      <label
        class="text-xs font-medium block mb-1.5"
        style="color: var(--muted-foreground)"
      >
        Бажаний термін, днів (опційно)
      </label>
      <Input
        type="number"
        bind:value={deliveryDays}
        min={1}
        max={180}
        placeholder="7"
      />
    </div>

    <div>
      <label
        class="text-xs font-medium block mb-1.5"
        style="color: var(--muted-foreground)"
      >
        Теги (через кому)
      </label>
      <Input bind:value={tagsInput} placeholder="кондиціонер, монтаж, lg" />
      {#if tags.length > 0}
        <div class="flex flex-wrap gap-1 mt-2">
          {#each tags as tag}
            <span
              class="px-2 py-0.5 rounded-full text-[10px]"
              style="background-color: var(--muted); color: var(--muted-foreground)"
            >
              #{tag}
            </span>
          {/each}
        </div>
      {/if}
    </div>

    {#if error}
      <p
        class="text-sm rounded-lg px-3 py-2"
        style="background-color: color-mix(in srgb, var(--destructive) 10%, transparent);
               color: var(--destructive)"
      >
        {error}
      </p>
    {/if}

    <div class="flex justify-end gap-2 pt-2">
      <Button
        variant="outline"
        onclick={() => history.back()}
        disabled={submitting}
      >
        Скасувати
      </Button>
      <Button onclick={submit} disabled={submitting}>
        {#if submitting}
          <Loader2 class="size-4 mr-1 animate-spin" />
        {:else}
          <Save class="size-4 mr-1" />
        {/if}
        {initial ? 'Зберегти зміни' : 'Опублікувати'}
      </Button>
    </div>
  </div>
</div>
