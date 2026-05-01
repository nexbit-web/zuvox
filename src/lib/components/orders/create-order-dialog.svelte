<!-- src/lib/components/orders/create-order-dialog.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Loader2 } from 'lucide-svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import { Button } from '$lib/components/ui/button'

  interface Props {
    open: boolean
    /** Кому створюємо замовлення (фрілансеру) */
    freelancerId: string
    freelancerName: string
    /** Поточний chat */
    chatId: string
  }

  let {
    open = $bindable(false),
    freelancerId,
    freelancerName,
    chatId,
  }: Props = $props()

  let title = $state('')
  let description = $state('')
  let priceUah = $state('')
  let deliveryDays = $state('')
  let submitting = $state(false)
  let error = $state('')

  function reset() {
    title = ''
    description = ''
    priceUah = ''
    deliveryDays = ''
    error = ''
  }

  async function submit() {
    if (submitting) return
    error = ''

    if (title.trim().length < 5) {
      error = 'Назва: мінімум 5 символів'
      return
    }
    if (description.trim().length < 20) {
      error = 'Опис: мінімум 20 символів'
      return
    }
    const price = Number(priceUah)
    if (!Number.isFinite(price) || price < 100) {
      error = 'Сума: від 100 грн'
      return
    }

    submitting = true
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          freelancerId,
          chatId,
          title: title.trim(),
          description: description.trim(),
          priceUah: price,
          deliveryDays: deliveryDays ? Number(deliveryDays) : null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Помилка')
      }
      const { order } = await res.json()
      open = false
      reset()
      goto(`/orders/${order.id}`)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Помилка'
    } finally {
      submitting = false
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Створити замовлення</Dialog.Title>
      <Dialog.Description>
        Замовлення для майстра <strong>{freelancerName}</strong>. Майстер
        отримає сповіщення і має прийняти його.
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div>
        <label
          class="text-xs font-medium block mb-1.5"
          style="color: var(--muted-foreground)"
        >
          Назва замовлення
        </label>
        <Input
          bind:value={title}
          placeholder="Розробка лендінга"
          maxlength={200}
        />
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
          rows={4}
          placeholder="Що потрібно зробити, які особливості, що має бути в результаті..."
          maxlength={5000}
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label
            class="text-xs font-medium block mb-1.5"
            style="color: var(--muted-foreground)"
          >
            Сума, ₴
          </label>
          <Input
            type="number"
            bind:value={priceUah}
            min={100}
            max={50000}
            placeholder="2000"
          />
        </div>
        <div>
          <label
            class="text-xs font-medium block mb-1.5"
            style="color: var(--muted-foreground)"
          >
            Термін, днів (опційно)
          </label>
          <Input
            type="number"
            bind:value={deliveryDays}
            min={1}
            max={180}
            placeholder="7"
          />
        </div>
      </div>

      {#if error}
        <p
          class="text-xs rounded-lg px-3 py-2"
          style="background-color: color-mix(in srgb, var(--destructive) 10%, transparent);
                 color: var(--destructive)"
        >
          {error}
        </p>
      {/if}
    </div>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => {
          open = false
          reset()
        }}
        disabled={submitting}
      >
        Скасувати
      </Button>
      <Button onclick={submit} disabled={submitting}>
        {#if submitting}
          <Loader2 class="size-4 mr-1 animate-spin" />
          Створення…
        {:else}
          Створити замовлення
        {/if}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
