<!-- src/routes/(auth)/orders/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Briefcase } from 'lucide-svelte'
  import * as Tabs from '$lib/components/ui/tabs'
  import OrderCard from '$lib/components/orders/order-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let activeTab = $state<'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL'>('ACTIVE')

  const filtered = $derived.by(() => {
    if (activeTab === 'ALL') return data.orders
    if (activeTab === 'ACTIVE')
      return data.orders.filter((o) =>
        ['NEGOTIATING', 'ACCEPTED', 'DELIVERED'].includes(o.status),
      )
    if (activeTab === 'COMPLETED')
      return data.orders.filter((o) => o.status === 'COMPLETED')
    return data.orders.filter(
      (o) => o.status === 'CANCELLED' || o.status === 'DISPUTED',
    )
  })

  function setRole(role: string) {
    const params = new URLSearchParams()
    if (role !== 'all') params.set('role', role)
    goto(params.toString() ? `/orders?${params.toString()}` : '/orders')
  }
</script>

<svelte:head>
  <title>Замовлення · Zunor</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
  <div class="mb-6">
    <h1
      class="text-2xl font-semibold tracking-tight"
      style="color: var(--foreground)"
    >
      Замовлення
    </h1>
    <p class="text-sm mt-1" style="color: var(--muted-foreground)">
      Замовлення в яких ви берете участь — як клієнт або як виконавець
    </p>
  </div>

  <!-- Role filter pills -->
  <div class="flex gap-2 mb-5">
    {#each [{ v: 'all', l: 'Усі' }, { v: 'client', l: 'Як клієнт' }, { v: 'freelancer', l: 'Як майстер' }] as opt}
      {@const isActive = data.roleFilter === opt.v}
      <button
        type="button"
        onclick={() => setRole(opt.v)}
        class="px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors"
        style="background-color: {isActive ? 'var(--primary)' : 'var(--muted)'};
               color: {isActive
          ? 'var(--primary-foreground)'
          : 'var(--foreground)'}"
      >
        {opt.l}
      </button>
    {/each}
  </div>

  <Tabs.Root bind:value={activeTab}>
    <Tabs.List class="mb-5">
      <Tabs.Trigger value="ACTIVE" class="text-xs">
        Активні
        <span class="ml-1.5 opacity-60 tabular-nums">{data.counts.active}</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="COMPLETED" class="text-xs">
        Завершені
        <span class="ml-1.5 opacity-60 tabular-nums"
          >{data.counts.completed}</span
        >
      </Tabs.Trigger>
      <Tabs.Trigger value="CANCELLED" class="text-xs">
        Скасовані
        <span class="ml-1.5 opacity-60 tabular-nums"
          >{data.counts.cancelled}</span
        >
      </Tabs.Trigger>
      <Tabs.Trigger value="ALL" class="text-xs">
        Усі <span class="ml-1.5 opacity-60 tabular-nums"
          >{data.orders.length}</span
        >
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value={activeTab}>
      {#if filtered.length === 0}
        <div
          class="rounded-xl p-12 text-center"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          <Briefcase
            class="size-10 mx-auto mb-3"
            style="color: var(--muted-foreground)"
          />
          <p class="text-sm font-medium mb-1" style="color: var(--foreground)">
            Немає замовлень у цій категорії
          </p>
          <p class="text-xs" style="color: var(--muted-foreground)">
            {#if data.orders.length === 0}
              Ваші замовлення з'являться тут після першої взаємодії
            {:else}
              Спробуйте іншу категорію
            {/if}
          </p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each filtered as order (order.id)}
            <OrderCard {order} viewerId={data.viewerId} />
          {/each}
        </div>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
