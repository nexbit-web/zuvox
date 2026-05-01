<!-- src/routes/(auth)/dashboard/wallet/+page.svelte -->
<script lang="ts">
  import { dev } from '$app/environment'
  import { invalidateAll } from '$app/navigation'
  import {
    Wallet,
    Plus,
    ArrowDownLeft,
    ArrowUpRight,
    X,
    ExternalLink,
  } from 'lucide-svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let topupOpen = $state(false)
  let topupAmount = $state('500')
  let topupSubmitting = $state(false)
  let topupError = $state('')

  let loadingMore = $state(false)
  let allTransactions = $state(data.transactions)
  let cursor = $state(data.nextCursor)

  // ─── Формат грошей ───
  function formatMoney(cents: number, currency = 'UAH'): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100)
  }

  // ─── Лейбли для транзакцій ───
  const txLabels: Record<string, string> = {
    TOPUP: 'Поповнення',
    LEAD_FEE: 'Лід за відгук',
    GIG_COMMISSION: 'Комісія платформи',
    REFUND: 'Повернення',
    WITHDRAWAL: 'Виведення',
    ADJUSTMENT: 'Коригування',
  }

  function txColor(amountCents: number): string {
    return amountCents > 0 ? 'var(--success, #16a34a)' : 'var(--destructive)'
  }

  function formatDate(iso: string): string {
    const date = new Date(iso)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dDate = new Date(date)
    dDate.setHours(0, 0, 0, 0)

    const time = date.toLocaleTimeString('uk-UA', {
      hour: '2-digit',
      minute: '2-digit',
    })

    if (dDate.getTime() === today.getTime()) return `Сьогодні, ${time}`
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (dDate.getTime() === yesterday.getTime()) return `Вчора, ${time}`

    return (
      date.toLocaleDateString('uk-UA', {
        day: 'numeric',
        month: 'short',
        year:
          date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      }) + `, ${time}`
    )
  }

  // ─── Test topup (dev only) ───
  async function submitTestTopup() {
    if (topupSubmitting) return
    topupSubmitting = true
    topupError = ''
    try {
      const amount = Number(topupAmount)
      if (!Number.isFinite(amount) || amount < 50 || amount > 50_000) {
        topupError = 'Сума від 50 до 50 000 грн'
        return
      }
      const res = await fetch('/api/wallet/topup-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUah: amount }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Помилка')
      }
      topupOpen = false
      topupAmount = '500'
      await invalidateAll()
      // Оновити локальний стейт після invalidate
      allTransactions = data.transactions
      cursor = data.nextCursor
    } catch (err) {
      topupError = err instanceof Error ? err.message : 'Помилка'
    } finally {
      topupSubmitting = false
    }
  }

  async function loadMore() {
    if (loadingMore || !cursor) return
    loadingMore = true
    try {
      const res = await fetch(`/api/wallet?cursor=${cursor}`)
      if (!res.ok) return
      const json = await res.json()
      allTransactions = [...allTransactions, ...json.transactions]
      cursor = json.nextCursor
    } finally {
      loadingMore = false
    }
  }

  // Швидкі суми
  const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000]
</script>

<svelte:head>
  <title>Гаманець · Zunor</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
  <!-- Заголовок -->
  <div class="mb-6">
    <h1
      class="text-2xl font-semibold tracking-tight"
      style="color: var(--foreground)"
    >
      Гаманець
    </h1>
    <p class="text-sm mt-1" style="color: var(--muted-foreground)">
      {data.isFreelancer
        ? 'Оплачуйте відгуки на заявки та комісію за продажі гігів'
        : 'Платформа Zunor працює за моделлю лідів — оплати йдуть фрілансерам напряму'}
    </p>
  </div>

  <!-- Баланс card -->
  <div
    class="rounded-2xl p-6 sm:p-8 mb-6"
    style="background-color: var(--primary); color: var(--primary-foreground)"
  >
    <div class="flex items-center gap-2 mb-2 opacity-80">
      <Wallet class="size-4" />
      <span class="text-xs font-medium uppercase tracking-wider">
        Доступно на балансі
      </span>
    </div>
    <p class="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
      {formatMoney(data.wallet.balanceCents, data.wallet.currency)}
    </p>
    {#if data.wallet.heldCents > 0}
      <p class="text-xs opacity-70 mt-2">
        Заморожено: {formatMoney(data.wallet.heldCents, data.wallet.currency)}
      </p>
    {/if}

    <div class="mt-6 flex flex-wrap gap-2">
      <button
        type="button"
        onclick={() => (topupOpen = true)}
        class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
        style="background-color: var(--primary-foreground); color: var(--primary)"
      >
        <Plus class="size-4" />
        Поповнити
      </button>
    </div>
  </div>

  {#if !data.isFreelancer}
    <!-- Інфо для клієнтів -->
    <div
      class="rounded-xl p-4 mb-6 flex gap-3"
      style="background-color: var(--muted); border: 1px solid var(--border)"
    >
      <div
        class="size-9 shrink-0 rounded-full flex items-center justify-center"
        style="background-color: var(--accent)"
      >
        <Wallet class="size-4" style="color: var(--muted-foreground)" />
      </div>
      <div>
        <p class="text-sm font-medium mb-0.5" style="color: var(--foreground)">
          Як клієнту вам не потрібно нічого оплачувати на платформі
        </p>
        <p class="text-xs" style="color: var(--muted-foreground)">
          Зунор бере оплату тільки з фрілансерів за ліди. Ви розраховуєтесь з
          майстром напряму як домовитесь — карткою, готівкою, переказом.
        </p>
      </div>
    </div>
  {/if}

  <!-- Інфо для фрілансерів -->
  {#if data.isFreelancer}
    <div class="grid sm:grid-cols-2 gap-3 mb-6">
      <div
        class="rounded-xl p-4"
        style="background-color: var(--muted); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-2 mb-2">
          <ArrowUpRight class="size-4" style="color: var(--muted-foreground)" />
          <span
            class="text-xs font-medium"
            style="color: var(--muted-foreground)"
          >
            Лід за відгук
          </span>
        </div>
        <p class="text-lg font-semibold" style="color: var(--foreground)">
          50 ₴
        </p>
        <p class="text-xs mt-1" style="color: var(--muted-foreground)">
          Списується одразу при відгуку на заявку клієнта
        </p>
      </div>

      <div
        class="rounded-xl p-4"
        style="background-color: var(--muted); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-2 mb-2">
          <ArrowUpRight class="size-4" style="color: var(--muted-foreground)" />
          <span
            class="text-xs font-medium"
            style="color: var(--muted-foreground)"
          >
            Комісія за гіг
          </span>
        </div>
        <p class="text-lg font-semibold" style="color: var(--foreground)">
          10%
        </p>
        <p class="text-xs mt-1" style="color: var(--muted-foreground)">
          Списується при кожній покупці вашого гіга
        </p>
      </div>
    </div>
  {/if}

  <!-- Історія -->
  <div>
    <h2 class="text-lg font-semibold mb-3" style="color: var(--foreground)">
      Історія операцій
    </h2>

    {#if allTransactions.length === 0}
      <div
        class="rounded-xl p-8 text-center"
        style="background-color: var(--muted); border: 1px solid var(--border)"
      >
        <p class="text-sm" style="color: var(--muted-foreground)">
          Поки що немає жодної операції
        </p>
      </div>
    {:else}
      <div
        class="rounded-xl overflow-hidden"
        style="border: 1px solid var(--border)"
      >
        {#each allTransactions as tx, i (tx.id)}
          {@const isCredit = tx.amountCents > 0}
          <div
            class="flex items-center gap-3 px-4 py-3"
            style="background-color: var(--background);
                   {i < allTransactions.length - 1
              ? 'border-bottom: 1px solid var(--border);'
              : ''}"
          >
            <div
              class="size-9 shrink-0 rounded-full flex items-center justify-center"
              style="background-color: {isCredit
                ? 'color-mix(in srgb, #16a34a 12%, transparent)'
                : 'var(--muted)'}"
            >
              {#if isCredit}
                <ArrowDownLeft class="size-4" style="color: #16a34a" />
              {:else}
                <ArrowUpRight
                  class="size-4"
                  style="color: var(--muted-foreground)"
                />
              {/if}
            </div>

            <div class="flex-1 min-w-0">
              <p
                class="text-[13px] font-semibold truncate"
                style="color: var(--foreground)"
              >
                {txLabels[tx.type] ?? tx.type}
              </p>
              {#if tx.description}
                <p
                  class="text-xs truncate"
                  style="color: var(--muted-foreground)"
                >
                  {tx.description}
                </p>
              {/if}
              <p
                class="text-[10px] mt-0.5"
                style="color: var(--muted-foreground)"
              >
                {formatDate(tx.createdAt)}
              </p>
            </div>

            <div class="text-right shrink-0">
              <p
                class="text-[14px] font-bold tabular-nums"
                style="color: {isCredit ? '#16a34a' : 'var(--foreground)'}"
              >
                {isCredit ? '+' : ''}{formatMoney(tx.amountCents)}
              </p>
              {#if tx.orderId}
                <a
                  href={`/orders/${tx.orderId}`}
                  class="text-[10px] inline-flex items-center gap-1 hover:underline"
                  style="color: var(--muted-foreground)"
                >
                  Замовлення
                  <ExternalLink class="size-2.5" />
                </a>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if cursor}
        <div class="flex justify-center mt-4">
          <button
            type="button"
            onclick={loadMore}
            disabled={loadingMore}
            class="text-sm px-4 py-2 rounded-full cursor-pointer transition-colors disabled:opacity-50"
            style="background-color: var(--muted); color: var(--foreground)"
          >
            {loadingMore ? 'Завантаження…' : 'Показати ще'}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- Topup Dialog -->
<Dialog.Root bind:open={topupOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Поповнити баланс</Dialog.Title>
      <Dialog.Description>
        {#if dev}
          Тестовий режим — без реальної оплати
        {:else}
          Інтеграція LiqPay в розробці. Зверніться до адміністратора.
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if dev}
      <div class="space-y-4">
        <div>
          <label
            for="topup-amount"
            class="text-xs font-medium block mb-1.5"
            style="color: var(--muted-foreground)"
          >
            Сума, ₴
          </label>
          <Input
            id="topup-amount"
            type="number"
            bind:value={topupAmount}
            min={50}
            max={50000}
            step={50}
            placeholder="500"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          {#each QUICK_AMOUNTS as amount}
            <button
              type="button"
              onclick={() => (topupAmount = String(amount))}
              class="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
              style="background-color: var(--muted); color: var(--foreground)"
            >
              {amount} ₴
            </button>
          {/each}
        </div>

        {#if topupError}
          <p class="text-xs" style="color: var(--destructive)">
            {topupError}
          </p>
        {/if}
      </div>

      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => (topupOpen = false)}
          disabled={topupSubmitting}
        >
          Скасувати
        </Button>
        <Button onclick={submitTestTopup} disabled={topupSubmitting}>
          {topupSubmitting ? 'Поповнення…' : 'Поповнити'}
        </Button>
      </Dialog.Footer>
    {:else}
      <div
        class="py-4 text-center text-sm"
        style="color: var(--muted-foreground)"
      >
        Зверніться до адміністратора в Telegram для поповнення.
      </div>
      <Dialog.Footer>
        <Button onclick={() => (topupOpen = false)}>Зрозуміло</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
