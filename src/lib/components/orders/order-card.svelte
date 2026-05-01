<!-- src/lib/components/orders/order-card.svelte -->
<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Clock, ArrowRight } from 'lucide-svelte'
  import { ORDER_STATUS, formatMoney, formatRelative } from '$lib/orders/labels'

  interface Props {
    order: {
      id: string
      title: string
      priceCents: number
      currency: string
      status: string
      source: string
      createdAt: string
      updatedAt: string
      deadlineAt: string | null
      clientId: string
      freelancerId: string
      client: {
        id: string
        name: string | null
        username: string | null
        avatar: string | null
      }
      freelancer: {
        id: string
        name: string | null
        username: string | null
        avatar: string | null
      }
    }
    /** ID поточного юзера для визначення ролі */
    viewerId: string
  }

  let { order, viewerId }: Props = $props()

  const isClient = $derived(viewerId === order.clientId)
  const peer = $derived(isClient ? order.freelancer : order.client)
  const status = $derived(
    ORDER_STATUS[order.status] ?? ORDER_STATUS.NEGOTIATING,
  )
</script>

<a
  href={`/orders/${order.id}`}
  class="block rounded-xl p-4 transition-all hover:opacity-95"
  style="background-color: var(--card); border: 1px solid var(--border)"
>
  <div class="flex items-start justify-between gap-3 mb-3">
    <div class="flex items-center gap-2.5 min-w-0 flex-1">
      <Avatar class="size-8 shrink-0">
        <AvatarImage src={peer.avatar ?? ''} alt={peer.name ?? ''} />
        <AvatarFallback
          class="text-xs font-semibold"
          style="background-color: var(--muted); color: var(--foreground)"
        >
          {peer.name?.[0]?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>
      <div class="min-w-0">
        <p class="text-xs" style="color: var(--muted-foreground)">
          {isClient ? 'Майстер' : 'Замовник'}
        </p>
        <p
          class="text-sm font-medium truncate"
          style="color: var(--foreground)"
        >
          {peer.name}
        </p>
      </div>
    </div>

    <span
      class="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded shrink-0"
      style="background-color: {status.bg}; color: {status.color}"
    >
      {status.short}
    </span>
  </div>

  <h3
    class="text-[15px] font-semibold leading-snug line-clamp-2 mb-2"
    style="color: var(--foreground)"
  >
    {order.title}
  </h3>

  <div
    class="flex items-center justify-between gap-2 pt-3"
    style="border-top: 1px solid var(--border)"
  >
    <div
      class="flex items-center gap-3 text-[11px]"
      style="color: var(--muted-foreground)"
    >
      <span>{formatRelative(order.updatedAt)}</span>
      {#if order.deadlineAt && (order.status === 'ACCEPTED' || order.status === 'NEGOTIATING')}
        {@const deadline = new Date(order.deadlineAt)}
        {@const overdue = deadline < new Date()}
        <span
          class="flex items-center gap-1"
          style="color: {overdue
            ? 'var(--destructive)'
            : 'var(--muted-foreground)'}"
        >
          <Clock class="size-3" />
          {overdue
            ? 'Прострочено'
            : `до ${deadline.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}`}
        </span>
      {/if}
    </div>

    <div class="flex items-center gap-2">
      <span
        class="text-base font-bold tabular-nums"
        style="color: var(--foreground)"
      >
        {formatMoney(order.priceCents, order.currency)}
      </span>
      <ArrowRight class="size-4" style="color: var(--muted-foreground)" />
    </div>
  </div>
</a>
