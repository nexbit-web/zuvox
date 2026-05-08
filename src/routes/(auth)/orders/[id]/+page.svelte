<!-- src/routes/(auth)/orders/[id]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import {
    BadgeCheck,
    Star,
    MessageSquare,
    Calendar,
    Clock,
    FileText,
    ExternalLink,
    Copy,
    Check,
    AlertTriangle,
    LoaderCircle,
  } from 'lucide-svelte'
  import { Button } from '$lib/components/ui/button'
  import OrderActions from '$lib/components/orders/order-actions.svelte'
  import OrderEventsTimeline from '$lib/components/orders/order-events-timeline.svelte'
  import DeliverablesUploader from '$lib/components/orders/deliverables-uploader.svelte'
  import ReviewForm from '$lib/components/orders/review-form.svelte'
  import {
    ORDER_STATUS,
    ORDER_SOURCE,
    formatMoney,
    formatDate,
  } from '$lib/orders/labels'
  import { onDestroy } from 'svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  // ═══════════════════════════════════════════════════════════
  // Derived
  // ═══════════════════════════════════════════════════════════

  const order = $derived(data.order)
  const isClient = $derived(data.viewerId === order.clientId)
  const isFreelancer = $derived(data.viewerId === order.freelancerId)
  const peer = $derived(isClient ? order.freelancer : order.client)
  const status = $derived(
    ORDER_STATUS[order.status] ?? ORDER_STATUS.NEGOTIATING,
  )

  const reviewFromClient = $derived(
    order.reviews.find((r: any) => r.direction === 'CLIENT_TO_FREELANCER') ??
      null,
  )
  const reviewFromFreelancer = $derived(
    order.reviews.find((r: any) => r.direction === 'FREELANCER_TO_CLIENT') ??
      null,
  )

  const canClientLeaveReview = $derived(
    isClient && order.status === 'COMPLETED' && !reviewFromClient,
  )
  const canFreelancerLeaveReview = $derived(
    isFreelancer && order.status === 'COMPLETED' && !reviewFromFreelancer,
  )

  const orderShortId = $derived(order.id.slice(-8).toUpperCase())

  // Auto-complete countdown
  const autoCompleteIn = $derived.by(() => {
    if (!order.autoCompleteAt || order.status !== 'DELIVERED') return null
    const ms = new Date(order.autoCompleteAt).getTime() - Date.now()
    if (ms <= 0) return null
    const days = Math.floor(ms / (24 * 60 * 60 * 1000))
    const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    if (days > 0) return `${days} ${days === 1 ? 'день' : 'днів'}`
    return `${hours} год`
  })

  // Дедлайн форматування
  const deadlineFormatted = $derived.by(() => {
    if (!order.deadlineAt) return null
    return new Date(order.deadlineAt).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  })

  // Чи є дедлайн прострочений
  const isOverdue = $derived.by(() => {
    if (
      !order.deadlineAt ||
      order.status === 'COMPLETED' ||
      order.status === 'CANCELLED'
    ) {
      return false
    }
    return new Date(order.deadlineAt).getTime() < Date.now()
  })

  // ═══════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════

  let chatLoading = $state(false)
  let chatError = $state('')
  let copyConfirm = $state(false)
  let copyTimeout: ReturnType<typeof setTimeout> | null = null

  let abortController: AbortController | null = null

  async function startChat() {
    if (chatLoading) return

    if (order.chatId) {
      goto(`/messages/${order.chatId}`)
      return
    }

    chatLoading = true
    chatError = ''

    if (abortController) abortController.abort()
    abortController = new AbortController()

    try {
      const res = await fetch('/api/chats/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: peer.id }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        chatError =
          res.status === 429
            ? 'Забагато запитів. Спробуйте пізніше.'
            : 'Не вдалось відкрити чат'
        return
      }

      const { chatId } = await res.json()
      goto(`/messages/${chatId}`)
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      chatError = "Помилка з'єднання"
    } finally {
      chatLoading = false
    }
  }

  async function copyOrderId() {
    try {
      await navigator.clipboard.writeText(order.id)
      copyConfirm = true
      if (copyTimeout) clearTimeout(copyTimeout)
      copyTimeout = setTimeout(() => (copyConfirm = false), 1500)
    } catch {
      // ignore — clipboard може бути недоступний
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════

  onDestroy(() => {
    if (abortController) abortController.abort()
    if (copyTimeout) clearTimeout(copyTimeout)
  })
</script>

<svelte:head>
  <title>Замовлення · {order.title} · Zunor</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
  <!-- ─── Breadcrumb + meta ─── -->
  <div class="flex items-center justify-between gap-3 mb-4 flex-wrap">
    <a
      href="/orders"
      class="text-xs hover:underline inline-flex items-center gap-1"
      style="color: var(--muted-foreground)"
    >
      ← Усі замовлення
    </a>

    <button
      type="button"
      onclick={copyOrderId}
      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium tabular-nums cursor-pointer transition-colors hover:bg-[var(--muted)]"
      style="color: var(--muted-foreground)"
      aria-label="Скопіювати ID замовлення"
    >
      <span>#{orderShortId}</span>
      {#if copyConfirm}
        <Check class="size-3" style="color: #16a34a" />
      {:else}
        <Copy class="size-3 opacity-50" />
      {/if}
    </button>
  </div>

  <!-- ─── Header (Title + Source) ─── -->
  <header class="mb-5">
    <p
      class="text-[11px] uppercase tracking-[0.08em] mb-2"
      style="color: var(--muted-foreground)"
    >
      {ORDER_SOURCE[order.source] ?? order.source}
    </p>
    <h1
      class="text-2xl sm:text-3xl font-bold tracking-tight leading-tight"
      style="color: var(--foreground)"
    >
      {order.title}
    </h1>
  </header>

  <!-- ─── Status Banner ─── -->
  <div
    class="rounded-xl px-4 py-3 mb-6 flex items-center justify-between gap-3"
    style="background-color: {status.bg}; border: 1px solid color-mix(in oklch, {status.color} 25%, transparent)"
  >
    <div class="min-w-0 flex items-center gap-3">
      <span
        class="size-2 rounded-full shrink-0"
        style="background-color: {status.color}; box-shadow: 0 0 0 4px color-mix(in oklch, {status.color} 18%, transparent)"
        aria-hidden="true"
      ></span>
      <div class="min-w-0">
        <p
          class="text-[11px] font-bold uppercase tracking-[0.08em]"
          style="color: {status.color}"
        >
          {status.label}
        </p>
        <p class="text-xs mt-0.5 leading-snug" style="color: var(--foreground)">
          {status.description}
        </p>
      </div>
    </div>

    {#if autoCompleteIn}
      <div class="text-right shrink-0">
        <p
          class="text-[10px] uppercase tracking-wider"
          style="color: var(--muted-foreground)"
        >
          Авто-завершення
        </p>
        <p
          class="text-xs font-semibold tabular-nums"
          style="color: var(--foreground)"
        >
          через {autoCompleteIn}
        </p>
      </div>
    {/if}
  </div>

  <!-- ─── Overdue warning ─── -->
  {#if isOverdue}
    <div
      class="rounded-xl px-4 py-3 mb-6 flex items-start gap-3"
      style="background-color: color-mix(in oklch, #f59e0b 8%, transparent);
             border: 1px solid color-mix(in oklch, #f59e0b 25%, transparent)"
      role="alert"
    >
      <AlertTriangle class="size-4 shrink-0 mt-0.5" style="color: #d97706" />
      <div>
        <p class="text-xs font-semibold" style="color: #92400e">
          Дедлайн прострочено
        </p>
        <p class="text-[11px] mt-0.5" style="color: var(--muted-foreground)">
          Зверніться до {isClient ? 'майстра' : 'клієнта'} у чаті для уточнення термінів
        </p>
      </div>
    </div>
  {/if}

  <!-- ═══════ Layout ═══════ -->
  <div class="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-8">
    <!-- ━━━ ОСНОВНИЙ КОНТЕНТ ━━━ -->
    <div class="min-w-0 space-y-6">
      <!-- Description -->
      <section>
        <h2
          class="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2"
          style="color: var(--muted-foreground)"
        >
          Опис замовлення
        </h2>
        <p
          class="text-[14.5px] leading-relaxed whitespace-pre-wrap"
          style="color: var(--foreground)"
        >
          {order.description}
        </p>

        {#if order.gig}
          <a
            href={`/gigs/${order.gig.slug}`}
            class="inline-flex items-center gap-1.5 mt-3 text-xs hover:underline"
            style="color: var(--muted-foreground)"
          >
            <ExternalLink class="size-3.5" />
            Гіг: {order.gig.title}
          </a>
        {/if}
      </section>

      <!-- Deliverables -->
      {#if order.deliverables.length > 0 || order.deliveryNote}
        <section
          class="rounded-2xl p-5"
          style="background-color: var(--card); border: 1px solid var(--border)"
        >
          <h2
            class="text-sm font-semibold mb-3 flex items-center gap-2"
            style="color: var(--foreground)"
          >
            <FileText class="size-4" style="color: var(--muted-foreground)" />
            Здана робота
          </h2>

          {#if order.deliveryNote}
            <div
              class="rounded-lg p-3 mb-3"
              style="background-color: var(--muted)"
            >
              <p
                class="text-[13px] leading-relaxed whitespace-pre-wrap"
                style="color: var(--foreground)"
              >
                {order.deliveryNote}
              </p>
            </div>
          {/if}

          {#if order.deliverables.length > 0}
            <DeliverablesUploader files={order.deliverables} disabled={true} />
          {/if}

          {#if order.deliveredAt}
            <p
              class="text-[10px] mt-3 inline-flex items-center gap-1.5"
              style="color: var(--muted-foreground)"
            >
              <Clock class="size-2.5" />
              Здано: {formatDate(order.deliveredAt)}
            </p>
          {/if}
        </section>
      {/if}

      <!-- Cancellation reason -->
      {#if order.cancelReason && order.status === 'CANCELLED'}
        <section
          class="rounded-2xl p-5"
          style="background-color: color-mix(in oklch, var(--destructive) 5%, transparent);
                 border: 1px solid color-mix(in oklch, var(--destructive) 18%, transparent)"
        >
          <h3
            class="text-[11px] font-semibold uppercase tracking-[0.08em] mb-1.5"
            style="color: var(--destructive)"
          >
            Причина скасування
          </h3>
          <p class="text-sm leading-relaxed" style="color: var(--foreground)">
            {order.cancelReason}
          </p>
        </section>
      {/if}

      <!-- ─── Reviews ─── -->
      {#if order.status === 'COMPLETED'}
        <section class="space-y-3">
          <h2
            class="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style="color: var(--muted-foreground)"
          >
            Відгуки
          </h2>

          <!-- Відгук клієнта про фрілансера -->
          {#if reviewFromClient}
            <article
              class="rounded-2xl p-4"
              style="background-color: var(--card); border: 1px solid var(--border)"
            >
              <header class="flex items-center justify-between gap-2 mb-2">
                <span
                  class="text-xs font-medium"
                  style="color: var(--muted-foreground)"
                >
                  Відгук клієнта про майстра
                </span>
                <div class="flex items-center gap-0.5">
                  {#each Array(5) as _, i}
                    <Star
                      class="size-3.5"
                      style="color: {i < reviewFromClient.rating
                        ? '#f59e0b'
                        : 'var(--border)'};
                             fill: {i < reviewFromClient.rating
                        ? '#f59e0b'
                        : 'transparent'}"
                    />
                  {/each}
                </div>
              </header>
              {#if reviewFromClient.comment}
                <p
                  class="text-[13.5px] leading-relaxed"
                  style="color: var(--foreground)"
                >
                  {reviewFromClient.comment}
                </p>
              {/if}
            </article>
          {:else if canClientLeaveReview}
            <ReviewForm
              orderId={order.id}
              peerLabel="майстра"
              peerName={order.freelancer.name ?? ''}
            />
          {:else if isFreelancer}
            <div
              class="rounded-2xl px-4 py-5 text-center"
              style="background-color: var(--card); border: 1px solid var(--border); border-style: dashed"
            >
              <p class="text-xs" style="color: var(--muted-foreground)">
                Очікуємо відгук від клієнта
              </p>
            </div>
          {/if}

          <!-- Відгук фрілансера про клієнта -->
          {#if reviewFromFreelancer}
            <article
              class="rounded-2xl p-4"
              style="background-color: var(--card); border: 1px solid var(--border)"
            >
              <header class="flex items-center justify-between gap-2 mb-2">
                <span
                  class="text-xs font-medium"
                  style="color: var(--muted-foreground)"
                >
                  Відгук майстра про клієнта
                </span>
                <div class="flex items-center gap-0.5">
                  {#each Array(5) as _, i}
                    <Star
                      class="size-3.5"
                      style="color: {i < reviewFromFreelancer.rating
                        ? '#f59e0b'
                        : 'var(--border)'};
                             fill: {i < reviewFromFreelancer.rating
                        ? '#f59e0b'
                        : 'transparent'}"
                    />
                  {/each}
                </div>
              </header>
              {#if reviewFromFreelancer.comment}
                <p
                  class="text-[13.5px] leading-relaxed"
                  style="color: var(--foreground)"
                >
                  {reviewFromFreelancer.comment}
                </p>
              {/if}
            </article>
          {:else if canFreelancerLeaveReview}
            <ReviewForm
              orderId={order.id}
              peerLabel="клієнта"
              peerName={order.client.name ?? ''}
            />
          {:else if isClient}
            <div
              class="rounded-2xl px-4 py-5 text-center"
              style="background-color: var(--card); border: 1px solid var(--border); border-style: dashed"
            >
              <p class="text-xs" style="color: var(--muted-foreground)">
                Очікуємо відгук від майстра
              </p>
            </div>
          {/if}
        </section>
      {/if}

      <!-- Events timeline -->
      <section>
        <h2
          class="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3"
          style="color: var(--muted-foreground)"
        >
          Історія подій
        </h2>
        <OrderEventsTimeline events={order.events} />
      </section>
    </div>

    <!-- ━━━ SIDEBAR ━━━ -->
    <aside class="lg:sticky lg:top-6 lg:self-start space-y-3">
      <!-- Price -->
      <div
        class="rounded-2xl p-5"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-[10px] uppercase tracking-[0.08em] font-semibold"
          style="color: var(--muted-foreground)"
        >
          Сума замовлення
        </p>
        <p
          class="text-3xl font-bold tabular-nums tracking-tight mt-1.5"
          style="color: var(--foreground)"
        >
          {formatMoney(order.priceCents, order.currency)}
        </p>

        {#if order.deliveryDays || deadlineFormatted}
          <div
            class="mt-4 pt-4 space-y-2"
            style="border-top: 1px solid var(--border)"
          >
            {#if order.deliveryDays}
              <div
                class="flex items-center gap-2 text-xs"
                style="color: var(--muted-foreground)"
              >
                <Clock class="size-3.5 shrink-0" />
                <span>
                  {order.deliveryDays}
                  {order.deliveryDays === 1 ? 'день' : 'днів'} на виконання
                </span>
              </div>
            {/if}
            {#if deadlineFormatted}
              <div
                class="flex items-center gap-2 text-xs"
                style="color: {isOverdue
                  ? '#d97706'
                  : 'var(--muted-foreground)'}"
              >
                <Calendar class="size-3.5 shrink-0" />
                <span>
                  Дедлайн: <span class="font-medium">{deadlineFormatted}</span>
                </span>
              </div>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Peer card -->
      <div
        class="rounded-2xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-[10px] uppercase tracking-[0.08em] font-semibold mb-3"
          style="color: var(--muted-foreground)"
        >
          {isClient ? 'Майстер' : 'Замовник'}
        </p>

        <a
          href={peer.username ? `/@${peer.username}` : '#'}
          class="flex items-center gap-3 mb-3 group"
        >
          <Avatar class="size-12 shrink-0">
            <AvatarImage src={peer.avatar ?? ''} alt={peer.name ?? ''} />
            <AvatarFallback
              class="text-sm font-semibold"
              style="background-color: var(--muted); color: var(--foreground)"
            >
              {peer.name?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <div class="flex items-center gap-1">
              <p
                class="text-sm font-semibold truncate group-hover:underline"
                style="color: var(--foreground)"
              >
                {peer.name}
              </p>
              {#if peer.verificationStatus === 'VERIFIED'}
                <BadgeCheck
                  class="size-3.5 shrink-0"
                  style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
                  aria-label="Верифіковано"
                />
              {/if}
            </div>
            {#if !isClient && (order.freelancer.freelancerProfile?.reviewsCount ?? 0) > 0}
              <p
                class="text-[11px] inline-flex items-center gap-1 mt-0.5"
                style="color: var(--muted-foreground)"
              >
                <Star class="size-3" style="fill: #f59e0b; color: #f59e0b" />
                <span class="tabular-nums">
                  {order.freelancer.freelancerProfile?.avgRating?.toFixed(1) ??
                    '—'}
                </span>
                <span>
                  ({order.freelancer.freelancerProfile?.reviewsCount ?? 0})
                </span>
              </p>
            {/if}
            {#if isClient && (order.client.clientReviewsCount ?? 0) > 0}
              <p
                class="text-[11px] inline-flex items-center gap-1 mt-0.5"
                style="color: var(--muted-foreground)"
              >
                <Star class="size-3" style="fill: #f59e0b; color: #f59e0b" />
                <span class="tabular-nums">
                  {order.client.clientAvgRating?.toFixed(1) ?? '—'}
                </span>
                <span>
                  ({order.client.clientReviewsCount ?? 0})
                </span>
              </p>
            {/if}
          </div>
        </a>

        <Button
          variant="outline"
          class="w-full h-10 rounded-lg cursor-pointer"
          onclick={startChat}
          disabled={chatLoading}
        >
          {#if chatLoading}
            <LoaderCircle class="size-4 animate-spin mr-2" />
            Відкриваємо…
          {:else}
            <MessageSquare class="size-4 mr-2" />
            Перейти в чат
          {/if}
        </Button>

        {#if chatError}
          <p
            class="text-[11px] mt-2 text-center"
            style="color: var(--destructive)"
          >
            {chatError}
          </p>
        {/if}
      </div>

      <!-- Actions -->
      <div
        class="rounded-2xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-[10px] uppercase tracking-[0.08em] font-semibold mb-3"
          style="color: var(--muted-foreground)"
        >
          Дії
        </p>
        <OrderActions
          orderId={order.id}
          status={order.status}
          {isClient}
          {isFreelancer}
          chatId={order.chatId}
        />
      </div>
    </aside>
  </div>
</div>
