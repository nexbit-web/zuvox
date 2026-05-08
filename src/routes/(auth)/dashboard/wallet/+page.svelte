<!-- src/routes/(auth)/dashboard/wallet/+page.svelte -->
<script lang="ts">
  import { dev } from '$app/environment'
  import { invalidateAll } from '$app/navigation'
  import {
    Wallet,
    Plus,
    ArrowDownLeft,
    ArrowUpRight,
    ExternalLink,
    Info,
    LoaderCircle,
    Receipt,
    AlertCircle,
    Check,
  } from 'lucide-svelte'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { onDestroy } from 'svelte'
  import { fly } from 'svelte/transition'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // ═══════════════════════════════════════════════════════════
  // Constants
  // ═══════════════════════════════════════════════════════════

  const TOPUP_MIN = 50
  const TOPUP_MAX = 50_000
  const QUICK_AMOUNTS = [200, 500, 1000, 2000, 5000]
  const PAGE_LOAD_TIMEOUT_MS = 10_000

  type TxFilter = 'all' | 'credit' | 'debit'

  // ═══════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════

  let topupOpen = $state(false)
  let topupAmount = $state('500')
  let topupSubmitting = $state(false)
  let topupError = $state('')

  let loadingMore = $state(false)
  let allTransactions = $state(data.transactions)
  let cursor = $state(data.nextCursor)
  let loadMoreError = $state('')

  let txFilter = $state<TxFilter>('all')

  let abortController: AbortController | null = null

  // ═══════════════════════════════════════════════════════════
  // Derived
  // ═══════════════════════════════════════════════════════════

  const totalIn = $derived(
    allTransactions
      .filter((t) => t.amountCents > 0)
      .reduce((sum, t) => sum + t.amountCents, 0),
  )

  const totalOut = $derived(
    allTransactions
      .filter((t) => t.amountCents < 0)
      .reduce((sum, t) => sum + Math.abs(t.amountCents), 0),
  )

  const filteredTransactions = $derived(
    txFilter === 'all'
      ? allTransactions
      : txFilter === 'credit'
        ? allTransactions.filter((t) => t.amountCents > 0)
        : allTransactions.filter((t) => t.amountCents < 0),
  )

  const topupAmountNum = $derived(Number(topupAmount))
  const topupValid = $derived(
    Number.isFinite(topupAmountNum) &&
      topupAmountNum >= TOPUP_MIN &&
      topupAmountNum <= TOPUP_MAX,
  )

  // ═══════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════

  function formatMoney(cents: number, currency = 'UAH'): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(cents / 100)
  }

  const txLabels: Record<string, string> = {
    TOPUP: 'Поповнення',
    LEAD_FEE: 'Лід за відгук',
    GIG_COMMISSION: 'Комісія платформи',
    REFUND: 'Повернення',
    WITHDRAWAL: 'Виведення',
    ADJUSTMENT: 'Коригування',
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

  // ═══════════════════════════════════════════════════════════
  // Topup
  // ═══════════════════════════════════════════════════════════

  async function submitTestTopup() {
    if (topupSubmitting) return
    if (!topupValid) {
      topupError = `Сума від ${TOPUP_MIN} до ${TOPUP_MAX.toLocaleString('uk-UA')} грн`
      return
    }

    topupSubmitting = true
    topupError = ''
    try {
      const res = await fetch('/api/wallet/topup-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUah: topupAmountNum }),
      })

      if (res.status === 429) {
        topupError = 'Забагато спроб. Спробуйте за хвилину.'
        return
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message ?? 'Помилка поповнення')
      }

      topupOpen = false
      topupAmount = '500'
      await invalidateAll()
      allTransactions = data.transactions
      cursor = data.nextCursor
    } catch (err) {
      topupError = err instanceof Error ? err.message : 'Помилка'
    } finally {
      topupSubmitting = false
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Load more
  // ═══════════════════════════════════════════════════════════

  async function loadMore() {
    if (loadingMore || !cursor) return
    loadingMore = true
    loadMoreError = ''

    if (abortController) abortController.abort()
    abortController = new AbortController()

    const timeoutId = setTimeout(
      () => abortController?.abort(),
      PAGE_LOAD_TIMEOUT_MS,
    )

    try {
      const res = await fetch(
        `/api/wallet?cursor=${encodeURIComponent(cursor)}`,
        {
          signal: abortController.signal,
        },
      )

      clearTimeout(timeoutId)

      if (!res.ok) {
        loadMoreError = 'Не вдалось завантажити'
        return
      }

      const json = await res.json()
      allTransactions = [...allTransactions, ...json.transactions]
      cursor = json.nextCursor
    } catch (err) {
      clearTimeout(timeoutId)
      if ((err as Error).name === 'AbortError') {
        loadMoreError = 'Запит зайняв забагато часу'
      } else {
        loadMoreError = "Помилка з'єднання"
      }
    } finally {
      loadingMore = false
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════

  onDestroy(() => {
    if (abortController) abortController.abort()
  })
</script>

<svelte:head>
  <title>Гаманець · Zunor</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
  <!-- ─── Заголовок ─── -->
  <div class="mb-8">
    <h1
      class="text-3xl font-bold tracking-tight"
      style="color: var(--foreground)"
    >
      Гаманець
    </h1>
    <p class="text-sm mt-1.5" style="color: var(--muted-foreground)">
      {data.isFreelancer
        ? 'Оплачуйте відгуки на заявки та комісію за продажі'
        : 'Розрахунок з майстрами — напряму, без комісій платформи'}
    </p>
  </div>

  <!-- ─── Баланс card (Stripe-style) ─── -->
  <div
    class="rounded-2xl p-6 sm:p-8 mb-4 relative overflow-hidden"
    style="background-color: var(--foreground); color: var(--background)"
  >
    <!-- Decorative pattern -->
    <div
      class="absolute inset-0 opacity-[0.04] pointer-events-none"
      style="background-image: radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0); background-size: 24px 24px;"
    ></div>

    <div class="relative">
      <div class="flex items-center gap-2 mb-3 opacity-70">
        <Wallet class="size-3.5" />
        <span class="text-[11px] font-medium uppercase tracking-[0.08em]">
          Доступно на балансі
        </span>
      </div>

      <p
        class="text-4xl sm:text-[44px] font-bold tabular-nums tracking-tight leading-none"
      >
        {formatMoney(data.wallet.balanceCents, data.wallet.currency)}
      </p>

      {#if data.wallet.heldCents > 0}
        <div
          class="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs"
          style="background-color: color-mix(in srgb, currentColor 12%, transparent)"
        >
          <span class="opacity-70">Заморожено:</span>
          <span class="font-medium tabular-nums">
            {formatMoney(data.wallet.heldCents, data.wallet.currency)}
          </span>
        </div>
      {/if}

      <div class="mt-7 flex flex-wrap gap-2">
        <button
          type="button"
          onclick={() => (topupOpen = true)}
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
          style="background-color: var(--background); color: var(--foreground)"
        >
          <Plus class="size-4" strokeWidth={2.5} />
          Поповнити
        </button>
      </div>
    </div>
  </div>

  <!-- ─── Stats Row (тільки якщо є транзакції) ─── -->
  {#if allTransactions.length > 0}
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div
        class="rounded-xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-2 mb-1.5">
          <ArrowDownLeft class="size-3.5" style="color: #16a34a" />
          <span
            class="text-[11px] font-medium uppercase tracking-wider"
            style="color: var(--muted-foreground)"
          >
            Надійшло
          </span>
        </div>
        <p
          class="text-lg font-bold tabular-nums"
          style="color: var(--foreground)"
        >
          +{formatMoney(totalIn, data.wallet.currency)}
        </p>
      </div>

      <div
        class="rounded-xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <div class="flex items-center gap-2 mb-1.5">
          <ArrowUpRight
            class="size-3.5"
            style="color: var(--muted-foreground)"
          />
          <span
            class="text-[11px] font-medium uppercase tracking-wider"
            style="color: var(--muted-foreground)"
          >
            Витрачено
          </span>
        </div>
        <p
          class="text-lg font-bold tabular-nums"
          style="color: var(--foreground)"
        >
          −{formatMoney(totalOut, data.wallet.currency)}
        </p>
      </div>
    </div>
  {/if}

  <!-- ─── Інфо для клієнтів ─── -->
  {#if !data.isFreelancer}
    <div
      class="rounded-xl p-4 mb-6 flex gap-3"
      style="background-color: color-mix(in oklch, var(--primary) 4%, transparent);
             border: 1px solid color-mix(in oklch, var(--primary) 14%, transparent)"
    >
      <Info class="size-4 shrink-0 mt-0.5" style="color: var(--primary)" />
      <div class="flex-1 min-w-0">
        <p
          class="text-sm font-medium leading-snug"
          style="color: var(--foreground)"
        >
          Як клієнту вам не потрібно нічого оплачувати на платформі
        </p>
        <p
          class="text-xs mt-1 leading-relaxed"
          style="color: var(--muted-foreground)"
        >
          Розраховуєтесь з майстром напряму як домовитесь — карткою, готівкою,
          переказом. Zunor не тримає ваші гроші.
        </p>
      </div>
    </div>
  {/if}

  <!-- ─── Тарифи фрілансера ─── -->
  {#if data.isFreelancer}
    <div class="grid grid-cols-2 gap-3 mb-6">
      <div
        class="rounded-xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <div class="flex items-baseline gap-1.5 mb-1">
          <span
            class="text-2xl font-bold tabular-nums"
            style="color: var(--foreground)">50</span
          >
          <span
            class="text-sm font-medium"
            style="color: var(--muted-foreground)">₴</span
          >
        </div>
        <p class="text-xs font-medium" style="color: var(--foreground)">
          Лід за відгук
        </p>
        <p
          class="text-[11px] mt-0.5 leading-snug"
          style="color: var(--muted-foreground)"
        >
          Списується одразу при відгуку на заявку
        </p>
      </div>

      <div
        class="rounded-xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <div class="flex items-baseline gap-1.5 mb-1">
          <span
            class="text-2xl font-bold tabular-nums"
            style="color: var(--foreground)">10</span
          >
          <span
            class="text-sm font-medium"
            style="color: var(--muted-foreground)">%</span
          >
        </div>
        <p class="text-xs font-medium" style="color: var(--foreground)">
          Комісія за гіг
        </p>
        <p
          class="text-[11px] mt-0.5 leading-snug"
          style="color: var(--muted-foreground)"
        >
          З кожної покупки вашого гіга
        </p>
      </div>
    </div>
  {/if}

  <!-- ─── Історія ─── -->
  <div>
    <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
      <h2 class="text-lg font-semibold" style="color: var(--foreground)">
        Історія операцій
      </h2>

      {#if allTransactions.length > 0}
        <!-- Фільтр -->
        <div
          class="inline-flex rounded-full p-0.5"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          {#each [{ value: 'all' as const, label: 'Всі' }, { value: 'credit' as const, label: 'Надходження' }, { value: 'debit' as const, label: 'Списання' }] as opt}
            <button
              type="button"
              onclick={() => (txFilter = opt.value)}
              class="px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer"
              style="background-color: {txFilter === opt.value
                ? 'var(--background)'
                : 'transparent'};
                     color: {txFilter === opt.value
                ? 'var(--foreground)'
                : 'var(--muted-foreground)'};
                     box-shadow: {txFilter === opt.value
                ? '0 1px 2px rgba(0,0,0,0.04)'
                : 'none'}"
            >
              {opt.label}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    {#if allTransactions.length === 0}
      <!-- Empty -->
      <div
        class="rounded-2xl px-6 py-12 text-center"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <div
          class="size-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style="background-color: var(--muted)"
        >
          <Receipt class="size-5" style="color: var(--muted-foreground)" />
        </div>
        <p class="text-sm font-medium mb-1" style="color: var(--foreground)">
          Поки що немає операцій
        </p>
        <p class="text-xs" style="color: var(--muted-foreground)">
          {data.isFreelancer
            ? 'Поповніть баланс щоб почати відгукуватись на заявки'
            : 'Тут зʼявляться ваші транзакції'}
        </p>
      </div>
    {:else if filteredTransactions.length === 0}
      <!-- Filter empty -->
      <div
        class="rounded-2xl px-6 py-10 text-center"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p class="text-xs" style="color: var(--muted-foreground)">
          У цьому фільтрі немає операцій
        </p>
      </div>
    {:else}
      <div
        class="rounded-2xl overflow-hidden"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        {#each filteredTransactions as tx, i (tx.id)}
          {@const isCredit = tx.amountCents > 0}
          <div
            class="tx-row flex items-center gap-3 px-4 py-3.5"
            class:border-b={i < filteredTransactions.length - 1}
            style={i < filteredTransactions.length - 1
              ? 'border-color: var(--border)'
              : ''}
          >
            <div
              class="size-9 shrink-0 rounded-full flex items-center justify-center"
              style="background-color: {isCredit
                ? 'color-mix(in srgb, #16a34a 10%, transparent)'
                : 'var(--muted)'}"
            >
              {#if isCredit}
                <ArrowDownLeft
                  class="size-4"
                  style="color: #16a34a"
                  strokeWidth={2.25}
                />
              {:else}
                <ArrowUpRight
                  class="size-4"
                  style="color: var(--muted-foreground)"
                  strokeWidth={2.25}
                />
              {/if}
            </div>

            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-semibold leading-tight truncate"
                style="color: var(--foreground)"
              >
                {txLabels[tx.type] ?? tx.type}
              </p>
              {#if tx.description}
                <p
                  class="text-xs mt-0.5 truncate leading-snug"
                  style="color: var(--muted-foreground)"
                >
                  {tx.description}
                </p>
              {/if}
              <p
                class="text-[11px] mt-0.5"
                style="color: var(--muted-foreground)"
              >
                {formatDate(tx.createdAt)}
              </p>
            </div>

            <div class="text-right shrink-0">
              <p
                class="text-sm font-bold tabular-nums leading-tight"
                style="color: {isCredit ? '#16a34a' : 'var(--foreground)'}"
              >
                {isCredit ? '+' : ''}{formatMoney(tx.amountCents)}
              </p>
              {#if tx.orderId}
                <a
                  href={`/orders/${tx.orderId}`}
                  class="text-[10px] inline-flex items-center gap-1 hover:underline mt-1"
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

      {#if loadMoreError}
        <div
          class="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style="background-color: color-mix(in oklch, var(--destructive) 6%, transparent);
                 color: var(--destructive);
                 border: 1px solid color-mix(in oklch, var(--destructive) 20%, transparent)"
        >
          <AlertCircle class="size-3.5 shrink-0" />
          <span>{loadMoreError}</span>
        </div>
      {/if}

      {#if cursor}
        <div class="flex justify-center mt-5">
          <button
            type="button"
            onclick={loadMore}
            disabled={loadingMore}
            class="inline-flex items-center gap-2 text-sm px-5 py-2.5 rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style="background-color: var(--card); color: var(--foreground); border: 1px solid var(--border)"
          >
            {#if loadingMore}
              <LoaderCircle class="size-3.5 animate-spin" />
              Завантаження…
            {:else}
              Показати ще
            {/if}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════════ -->
<!-- Topup Dialog -->
<!-- ═══════════════════════════════════════════════════════════ -->
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
      <div class="space-y-4 py-2">
        <div>
          <label
            for="topup-amount"
            class="text-xs font-medium block mb-2"
            style="color: var(--muted-foreground)"
          >
            Сума, ₴
          </label>
          <Input
            id="topup-amount"
            type="number"
            bind:value={topupAmount}
            min={TOPUP_MIN}
            max={TOPUP_MAX}
            step={50}
            placeholder="500"
            class="h-11 rounded-lg text-lg font-semibold tabular-nums"
          />
          <p class="text-[11px] mt-1.5" style="color: var(--muted-foreground)">
            Від {TOPUP_MIN} до {TOPUP_MAX.toLocaleString('uk-UA')} грн
          </p>
        </div>

        <div class="flex flex-wrap gap-1.5">
          {#each QUICK_AMOUNTS as amount}
            <button
              type="button"
              onclick={() => (topupAmount = String(amount))}
              class="px-3.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors border"
              style="background-color: {topupAmountNum === amount
                ? 'var(--foreground)'
                : 'transparent'};
                     color: {topupAmountNum === amount
                ? 'var(--background)'
                : 'var(--foreground)'};
                     border-color: {topupAmountNum === amount
                ? 'var(--foreground)'
                : 'color-mix(in oklch, var(--foreground) 14%, transparent)'}"
            >
              {amount} ₴
            </button>
          {/each}
        </div>

        {#if topupError}
          <div
            class="flex items-start gap-2 p-2.5 rounded-lg text-xs"
            in:fly={{ y: -4, duration: 150 }}
            style="background-color: color-mix(in oklch, var(--destructive) 8%, transparent);
                   color: var(--destructive);
                   border: 1px solid color-mix(in oklch, var(--destructive) 20%, transparent)"
            role="alert"
          >
            <AlertCircle class="size-3.5 shrink-0 mt-0.5" />
            <span>{topupError}</span>
          </div>
        {/if}
      </div>

      <Dialog.Footer>
        <Button
          variant="outline"
          onclick={() => (topupOpen = false)}
          disabled={topupSubmitting}
          class="cursor-pointer"
        >
          Скасувати
        </Button>
        <Button
          onclick={submitTestTopup}
          disabled={topupSubmitting || !topupValid}
          class="cursor-pointer disabled:cursor-not-allowed"
        >
          {#if topupSubmitting}
            <LoaderCircle class="size-3.5 animate-spin mr-2" />
            Поповнення…
          {:else}
            <Check class="size-3.5 mr-2" />
            Поповнити {topupValid ? `на ${topupAmountNum} ₴` : ''}
          {/if}
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
        <Button onclick={() => (topupOpen = false)} class="cursor-pointer">
          Зрозуміло
        </Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<style>
  .tx-row {
    background-color: var(--background);
    transition: background-color 120ms ease;
  }
  .tx-row:hover {
    background-color: color-mix(in oklch, var(--foreground) 2%, transparent);
  }
  .tx-row.border-b {
    border-bottom-width: 1px;
    border-bottom-style: solid;
  }
</style>
