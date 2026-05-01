<!-- src/lib/components/orders/order-actions.svelte -->
<script lang="ts">
  import { invalidateAll, goto } from '$app/navigation'
  import {
    Check,
    X,
    Send,
    RotateCcw,
    Loader2,
    AlertCircle,
  } from 'lucide-svelte'
  import { Button } from '$lib/components/ui/button'
  import { Textarea } from '$lib/components/ui/textarea'
  import * as Dialog from '$lib/components/ui/dialog'
  import DeliverablesUploader from './deliverables-uploader.svelte'

  interface Props {
    orderId: string
    status: string
    isClient: boolean
    isFreelancer: boolean
    chatId: string | null
  }

  let { orderId, status, isClient, isFreelancer, chatId }: Props = $props()

  let loading = $state<string | null>(null)
  let error = $state('')

  // Deliver dialog state
  let deliverOpen = $state(false)
  let deliverFiles = $state<string[]>([])
  let deliverNote = $state('')

  // Cancel dialog state
  let cancelOpen = $state(false)
  let cancelReason = $state('')

  // Revise dialog (просто confirm + переход в чат)
  // Complete — без диалога

  async function callAction(action: string, body: any = {}) {
    loading = action
    error = ''
    try {
      const res = await fetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Помилка')
      }
      await invalidateAll()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Помилка'
    } finally {
      loading = null
    }
  }

  async function accept() {
    if (!confirm('Прийняти замовлення? Ви беретесь за виконання.')) return
    await callAction('accept')
  }

  async function deliver() {
    if (deliverFiles.length === 0 && !deliverNote.trim()) {
      error = 'Додайте файли або напишіть коментар'
      return
    }
    await callAction('deliver', {
      deliverables: deliverFiles,
      deliveryNote: deliverNote.trim() || null,
    })
    deliverOpen = false
    deliverFiles = []
    deliverNote = ''
  }

  async function complete() {
    if (
      !confirm(
        'Прийняти роботу як завершену? Це закриє замовлення і дозволить залишити відгук.',
      )
    )
      return
    await callAction('complete')
  }

  async function revise() {
    if (
      !confirm(
        'Запросити правки? Замовлення повернеться до статусу "В роботі". Опишіть правки в чаті.',
      )
    )
      return
    await callAction('revise')
    if (chatId) goto(`/messages/${chatId}`)
  }

  async function cancel() {
    if (cancelReason.trim().length > 500) {
      error = 'Причина занадто довга'
      return
    }
    await callAction('cancel', { reason: cancelReason.trim() })
    cancelOpen = false
    cancelReason = ''
  }
</script>

<div class="space-y-2">
  {#if error}
    <div
      class="flex items-start gap-2 p-3 rounded-lg text-xs"
      style="background-color: color-mix(in srgb, var(--destructive) 10%, transparent);
             color: var(--destructive)"
    >
      <AlertCircle class="size-4 shrink-0 mt-0.5" />
      <span>{error}</span>
    </div>
  {/if}

  <!-- ━━━ NEGOTIATING ━━━ -->
  {#if status === 'NEGOTIATING'}
    {#if isFreelancer}
      <Button class="w-full" onclick={accept} disabled={loading !== null}>
        {#if loading === 'accept'}
          <Loader2 class="size-4 mr-1 animate-spin" />
        {:else}
          <Check class="size-4 mr-1" />
        {/if}
        Прийняти замовлення
      </Button>
    {/if}

    <Button
      variant="outline"
      class="w-full"
      onclick={() => (cancelOpen = true)}
      disabled={loading !== null}
    >
      <X class="size-4 mr-1" />
      Скасувати
    </Button>

    <!-- ━━━ ACCEPTED ━━━ -->
  {:else if status === 'ACCEPTED'}
    {#if isFreelancer}
      <Button
        class="w-full"
        onclick={() => (deliverOpen = true)}
        disabled={loading !== null}
      >
        <Send class="size-4 mr-1" />
        Здати роботу
      </Button>
    {:else}
      <div
        class="rounded-lg p-3 text-xs text-center"
        style="background-color: var(--muted); color: var(--muted-foreground)"
      >
        Очікуйте поки майстер здасть роботу
      </div>
    {/if}

    <Button
      variant="outline"
      class="w-full"
      onclick={() => (cancelOpen = true)}
      disabled={loading !== null}
    >
      <X class="size-4 mr-1" />
      Скасувати
    </Button>

    <!-- ━━━ DELIVERED ━━━ -->
  {:else if status === 'DELIVERED'}
    {#if isClient}
      <Button class="w-full" onclick={complete} disabled={loading !== null}>
        {#if loading === 'complete'}
          <Loader2 class="size-4 mr-1 animate-spin" />
        {:else}
          <Check class="size-4 mr-1" />
        {/if}
        Прийняти роботу
      </Button>
      <Button
        variant="outline"
        class="w-full"
        onclick={revise}
        disabled={loading !== null}
      >
        <RotateCcw class="size-4 mr-1" />
        Запросити правки
      </Button>
    {:else}
      <div
        class="rounded-lg p-3 text-xs text-center"
        style="background-color: var(--muted); color: var(--muted-foreground)"
      >
        Робота здана. Очікуйте підтвердження клієнта.
      </div>
    {/if}

    <Button
      variant="outline"
      class="w-full"
      onclick={() => (cancelOpen = true)}
      disabled={loading !== null}
    >
      <X class="size-4 mr-1" />
      Скасувати
    </Button>

    <!-- ━━━ COMPLETED / CANCELLED ━━━ -->
  {:else if status === 'COMPLETED'}
    <div
      class="rounded-lg p-3 text-xs text-center"
      style="background-color: color-mix(in srgb, #16a34a 10%, transparent); color: #16a34a"
    >
      Замовлення успішно завершено
    </div>
  {:else if status === 'CANCELLED'}
    <div
      class="rounded-lg p-3 text-xs text-center"
      style="background-color: var(--muted); color: var(--muted-foreground)"
    >
      Замовлення скасовано
    </div>
  {/if}
</div>

<!-- ─── DELIVER DIALOG ─── -->
<Dialog.Root bind:open={deliverOpen}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Здача роботи</Dialog.Title>
      <Dialog.Description>
        Завантажте файли результатів і коротко опишіть що зроблено
      </Dialog.Description>
    </Dialog.Header>

    <div class="space-y-4">
      <div>
        <label
          class="text-xs font-medium block mb-1.5"
          style="color: var(--muted-foreground)"
        >
          Файли (опційно)
        </label>
        <DeliverablesUploader bind:files={deliverFiles} />
      </div>

      <div>
        <label
          class="text-xs font-medium block mb-1.5"
          style="color: var(--muted-foreground)"
        >
          Коментар клієнту
        </label>
        <Textarea
          bind:value={deliverNote}
          rows={4}
          placeholder="Готово, перевіряйте. Зміни внесено згідно ТЗ..."
          maxlength={5000}
        />
      </div>
    </div>

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => (deliverOpen = false)}
        disabled={loading === 'deliver'}
      >
        Скасувати
      </Button>
      <Button onclick={deliver} disabled={loading === 'deliver'}>
        {#if loading === 'deliver'}
          <Loader2 class="size-4 mr-1 animate-spin" />
        {:else}
          <Send class="size-4 mr-1" />
        {/if}
        Здати
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- ─── CANCEL DIALOG ─── -->
<Dialog.Root bind:open={cancelOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Скасувати замовлення</Dialog.Title>
      <Dialog.Description>
        Це незворотна дія. Будь ласка, опишіть причину.
      </Dialog.Description>
    </Dialog.Header>

    <Textarea
      bind:value={cancelReason}
      rows={4}
      placeholder="Причина скасування..."
      maxlength={500}
    />

    <Dialog.Footer>
      <Button
        variant="outline"
        onclick={() => (cancelOpen = false)}
        disabled={loading === 'cancel'}
      >
        Залишити
      </Button>
      <Button
        variant="destructive"
        onclick={cancel}
        disabled={loading === 'cancel'}
      >
        {#if loading === 'cancel'}
          <Loader2 class="size-4 mr-1 animate-spin" />
        {/if}
        Скасувати замовлення
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
