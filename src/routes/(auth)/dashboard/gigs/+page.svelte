<!-- src/routes/(auth)/dashboard/gigs/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Plus, AlertTriangle } from 'lucide-svelte'
  import * as Tabs from '$lib/components/ui/tabs'
  import GigCard from '$lib/components/gigs/gig-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let activeTab = $state<'ALL' | 'ACTIVE' | 'DRAFT' | 'PAUSED'>('ALL')

  const filtered = $derived(
    activeTab === 'ALL'
      ? data.gigs
      : data.gigs.filter((g) => g.status === activeTab),
  )
</script>

<svelte:head>
  <title>Мої гіги · Zunor</title>
</svelte:head>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
  <div class="flex items-start justify-between gap-4 mb-6">
    <div>
      <h1
        class="text-2xl font-semibold tracking-tight"
        style="color: var(--foreground)"
      >
        Мої гіги
      </h1>
      <p class="text-sm mt-1" style="color: var(--muted-foreground)">
        Послуги які ви продаєте на Zunor
      </p>
    </div>
    <button
      type="button"
      onclick={() => goto('/dashboard/gigs/new')}
      disabled={!data.isVerified}
      class="inline-flex items-center gap-2 px-4 h-10 rounded-full text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90 shrink-0"
      style="background-color: {data.isVerified
        ? 'var(--primary)'
        : 'var(--muted)'};
             color: {data.isVerified
        ? 'var(--primary-foreground)'
        : 'var(--muted-foreground)'};
             cursor: {data.isVerified ? 'pointer' : 'not-allowed'}"
    >
      <Plus class="size-4" />
      Створити гіг
    </button>
  </div>

  {#if !data.isVerified}
    <div
      class="rounded-xl p-4 mb-6 flex gap-3"
      style="background-color: color-mix(in srgb, #f59e0b 10%, transparent);
             border: 1px solid #f59e0b"
    >
      <AlertTriangle class="size-5 shrink-0" style="color: #f59e0b" />
      <div>
        <p class="text-sm font-medium" style="color: var(--foreground)">
          Потрібна верифікація
        </p>
        <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">
          Щоб публікувати гіги, спочатку пройдіть верифікацію в
          <a href="/dashboard" class="underline">кабінеті</a>.
        </p>
      </div>
    </div>
  {/if}

  <Tabs.Root bind:value={activeTab}>
    <Tabs.List class="mb-5">
      <Tabs.Trigger value="ALL" class="text-xs">
        Усі
        <span class="ml-1.5 opacity-60 tabular-nums">
          {data.gigs.length}
        </span>
      </Tabs.Trigger>
      <Tabs.Trigger value="ACTIVE" class="text-xs">
        Активні
        <span class="ml-1.5 opacity-60 tabular-nums">
          {data.counts.active}
        </span>
      </Tabs.Trigger>
      <Tabs.Trigger value="DRAFT" class="text-xs">
        Чернетки
        <span class="ml-1.5 opacity-60 tabular-nums">
          {data.counts.draft}
        </span>
      </Tabs.Trigger>
      <Tabs.Trigger value="PAUSED" class="text-xs">
        Призупинені
        <span class="ml-1.5 opacity-60 tabular-nums">
          {data.counts.paused}
        </span>
      </Tabs.Trigger>
    </Tabs.List>

    <Tabs.Content value={activeTab}>
      {#if filtered.length === 0}
        <div
          class="rounded-xl p-12 text-center"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          {#if data.gigs.length === 0}
            <p
              class="text-sm font-medium mb-1"
              style="color: var(--foreground)"
            >
              Немає жодного гіга
            </p>
            <p class="text-xs mb-4" style="color: var(--muted-foreground)">
              Створіть свій перший гіг щоб клієнти могли вас знайти
            </p>
            {#if data.isVerified}
              <button
                type="button"
                onclick={() => goto('/dashboard/gigs/new')}
                class="inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm font-semibold cursor-pointer"
                style="background-color: var(--primary); color: var(--primary-foreground)"
              >
                <Plus class="size-4" />
                Створити перший гіг
              </button>
            {/if}
          {:else}
            <p class="text-sm" style="color: var(--muted-foreground)">
              У цій категорії поки нічого немає
            </p>
          {/if}
        </div>
      {:else}
        <div
          class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
        >
          {#each filtered as gig (gig.id)}
            <GigCard {gig} showSeller={false} showStatus={true} />
          {/each}
        </div>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
