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
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  const order = $derived(data.order)
  const isClient = $derived(data.viewerId === order.clientId)
  const isFreelancer = $derived(data.viewerId === order.freelancerId)
  const peer = $derived(isClient ? order.freelancer : order.client)
  const status = $derived(
    ORDER_STATUS[order.status] ?? ORDER_STATUS.NEGOTIATING,
  )

  // Чи можна залишити відгук (тільки клієнт, тільки після COMPLETED, тільки якщо ще немає)
  const canLeaveReview = $derived(
    isClient && order.status === 'COMPLETED' && !order.review,
  )

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

  async function startChat() {
    if (order.chatId) {
      goto(`/messages/${order.chatId}`)
      return
    }
    const res = await fetch('/api/chats/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId: peer.id }),
    })
    if (res.ok) {
      const { chatId } = await res.json()
      goto(`/messages/${chatId}`)
    }
  }
</script>

<svelte:head>
  <title>Замовлення · {order.title} · Zunor</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
  <!-- Status hero -->
  <div
    class="rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3"
    style="background-color: {status.bg}; border: 1px solid {status.color}30"
  >
    <div class="min-w-0">
      <p
        class="text-[11px] font-bold uppercase tracking-wider"
        style="color: {status.color}"
      >
        {status.label}
      </p>
      <p class="text-xs mt-0.5" style="color: var(--foreground)">
        {status.description}
      </p>
    </div>
    {#if autoCompleteIn}
      <div class="text-right shrink-0">
        <p
          class="text-[10px] uppercase tracking-wider"
          style="color: var(--muted-foreground)"
        >
          Авто-завершення
        </p>
        <p class="text-xs font-semibold" style="color: var(--foreground)">
          через {autoCompleteIn}
        </p>
      </div>
    {/if}
  </div>

  <div class="grid lg:grid-cols-[1fr_340px] gap-6 lg:gap-8">
    <!-- ━━━ ОСНОВНА ИНФОРМАЦИЯ ━━━ -->
    <div class="min-w-0">
      <p
        class="text-[10px] uppercase tracking-wider mb-1"
        style="color: var(--muted-foreground)"
      >
        Замовлення №{order.id.slice(-8)}
        · {ORDER_SOURCE[order.source] ?? order.source}
      </p>
      <h1
        class="text-2xl sm:text-3xl font-bold tracking-tight mb-4 leading-tight"
        style="color: var(--foreground)"
      >
        {order.title}
      </h1>

      <!-- Description -->
      <h2 class="text-base font-semibold mb-2" style="color: var(--foreground)">
        Опис
      </h2>
      <p
        class="text-[14.5px] leading-relaxed whitespace-pre-wrap mb-6"
        style="color: var(--foreground)"
      >
        {order.description}
      </p>

      <!-- Source link (gig) -->
      {#if order.gig}
        <a
          href={`/gigs/${order.gig.slug}`}
          class="inline-flex items-center gap-1.5 text-xs mb-6 hover:underline"
          style="color: var(--muted-foreground)"
        >
          <ExternalLink class="size-3.5" />
          Гіг: {order.gig.title}
        </a>
      {/if}

      <!-- Deliverables (когда DELIVERED+) -->
      {#if order.deliverables.length > 0 || order.deliveryNote}
        <div
          class="rounded-xl p-4 mb-6"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          <h2
            class="text-sm font-semibold mb-3 flex items-center gap-2"
            style="color: var(--foreground)"
          >
            <FileText class="size-4" />
            Здана робота
          </h2>

          {#if order.deliveryNote}
            <div
              class="rounded-lg p-3 mb-3"
              style="background-color: var(--background)"
            >
              <p
                class="text-[13px] whitespace-pre-wrap"
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
            <p class="text-[10px] mt-2" style="color: var(--muted-foreground)">
              Здано: {formatDate(order.deliveredAt)}
            </p>
          {/if}
        </div>
      {/if}

      <!-- Cancellation reason -->
      {#if order.cancelReason && order.status === 'CANCELLED'}
        <div
          class="rounded-xl p-4 mb-6"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          <h3
            class="text-xs font-semibold uppercase tracking-wider mb-1"
            style="color: var(--muted-foreground)"
          >
            Причина скасування
          </h3>
          <p class="text-sm" style="color: var(--foreground)">
            {order.cancelReason}
          </p>
        </div>
      {/if}

      <!-- ━━━ REVIEW BLOCK ━━━ -->
      <!-- Існуючий відгук — показуємо обом сторонам -->
      {#if order.review}
        <div
          class="rounded-xl p-4 mb-6"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          <div class="flex items-center gap-2 mb-2">
            <h3 class="text-sm font-semibold" style="color: var(--foreground)">
              Відгук
            </h3>
            <div class="flex items-center gap-0.5">
              {#each Array(5) as _, i}
                <Star
                  class="size-3.5"
                  style="color: {i < order.review.rating
                    ? '#f59e0b'
                    : 'var(--border)'};
                         fill: {i < order.review.rating
                    ? '#f59e0b'
                    : 'transparent'}"
                />
              {/each}
            </div>
          </div>
          {#if order.review.comment}
            <p class="text-[13px]" style="color: var(--foreground)">
              {order.review.comment}
            </p>
          {/if}
        </div>
      {:else if canLeaveReview}
        <!-- Форма відгука — тільки клієнту після COMPLETED -->
        <div class="mb-6">
          <ReviewForm
            orderId={order.id}
            freelancerName={order.freelancer.name ?? 'майстра'}
          />
        </div>
      {:else if order.status === 'COMPLETED' && isFreelancer && !order.review}
        <!-- Підказка фрілансеру що відгука ще немає -->
        <div
          class="rounded-xl p-4 mb-6 text-center"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          <p class="text-xs" style="color: var(--muted-foreground)">
            Очікуємо відгук від клієнта
          </p>
        </div>
      {/if}

      <!-- Events timeline -->
      <h2 class="text-base font-semibold mb-4" style="color: var(--foreground)">
        Історія
      </h2>
      <OrderEventsTimeline events={order.events} />
    </div>

    <!-- ━━━ SIDEBAR ━━━ -->
    <aside class="lg:sticky lg:top-6 lg:self-start space-y-4">
      <!-- Price -->
      <div
        class="rounded-xl p-5"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-[10px] uppercase tracking-wider"
          style="color: var(--muted-foreground)"
        >
          Сума замовлення
        </p>
        <p
          class="text-3xl font-bold tabular-nums"
          style="color: var(--foreground)"
        >
          {formatMoney(order.priceCents, order.currency)}
        </p>
        {#if order.deliveryDays}
          <p
            class="text-[11px] mt-1 inline-flex items-center gap-1"
            style="color: var(--muted-foreground)"
          >
            <Clock class="size-3" />
            {order.deliveryDays}
            {order.deliveryDays === 1 ? 'день' : 'днів'} на виконання
          </p>
        {/if}
        {#if order.deadlineAt}
          <p
            class="text-[11px] mt-0.5 inline-flex items-center gap-1"
            style="color: var(--muted-foreground)"
          >
            <Calendar class="size-3" />
            Дедлайн: {new Date(order.deadlineAt).toLocaleDateString('uk-UA', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        {/if}
      </div>

      <!-- Peer card -->
      <div
        class="rounded-xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-[10px] uppercase tracking-wider mb-3"
          style="color: var(--muted-foreground)"
        >
          {isClient ? 'Майстер' : 'Замовник'}
        </p>
        <a
          href={peer.username ? `/@${peer.username}` : '#'}
          class="flex items-center gap-3 mb-3 group"
        >
          <Avatar class="size-12">
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
                />
              {/if}
            </div>
            {#if !isClient && order.freelancer.freelancerProfile && order.freelancer.freelancerProfile.reviewsCount > 0}
              <p
                class="text-[11px] inline-flex items-center gap-0.5"
                style="color: var(--muted-foreground)"
              >
                <Star class="size-3" style="fill: currentColor" />
                {order.freelancer.freelancerProfile.avgRating.toFixed(1)}
                ({order.freelancer.freelancerProfile.reviewsCount})
              </p>
            {/if}
          </div>
        </a>

        <Button variant="outline" class="w-full" onclick={startChat}>
          <MessageSquare class="size-4 mr-1" />
          Перейти в чат
        </Button>
      </div>

      <!-- Actions -->
      <div
        class="rounded-xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-[10px] uppercase tracking-wider mb-3"
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
