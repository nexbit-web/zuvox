<!-- src/routes/(auth)/dashboard/jobs/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Plus, Briefcase } from 'lucide-svelte'
  import { Button } from '$lib/components/ui/button'
  import * as Tabs from '$lib/components/ui/tabs'
  import JobCard from '$lib/components/jobs/job-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let activeTab = $state<'ALL' | 'OPEN' | 'CLOSED' | 'OTHER'>('ALL')

  const filtered = $derived(
    activeTab === 'ALL'
      ? data.jobs
      : activeTab === 'OPEN'
        ? data.jobs.filter((j) => j.status === 'OPEN')
        : activeTab === 'CLOSED'
          ? data.jobs.filter((j) => j.status === 'CLOSED')
          : data.jobs.filter(
              (j) => j.status === 'CANCELLED' || j.status === 'EXPIRED',
            ),
  )

  function statusBadge(status: string): string | null {
    if (status === 'OPEN') return 'Відкрита'
    if (status === 'CLOSED') return 'Закрита'
    if (status === 'CANCELLED') return 'Скасована'
    if (status === 'EXPIRED') return 'Прострочена'
    return null
  }
</script>

<svelte:head>
  <title>Мої заявки · Zunor</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8">
  <div class="flex items-start justify-between gap-4 mb-6">
    <div>
      <h1
        class="text-2xl font-semibold tracking-tight"
        style="color: var(--foreground)"
      >
        Мої заявки
      </h1>
      <p class="text-sm mt-1" style="color: var(--muted-foreground)">
        Заявки які ви опублікували для пошуку фрілансера
      </p>
    </div>
    <Button onclick={() => goto('/jobs/new')}>
      <Plus class="size-4 mr-1" />
      Опублікувати заявку
    </Button>
  </div>

  <Tabs.Root bind:value={activeTab}>
    <Tabs.List class="mb-5">
      <Tabs.Trigger value="ALL" class="text-xs">
        Усі <span class="ml-1.5 opacity-60 tabular-nums"
          >{data.jobs.length}</span
        >
      </Tabs.Trigger>
      <Tabs.Trigger value="OPEN" class="text-xs">
        Відкриті
        <span class="ml-1.5 opacity-60 tabular-nums">{data.counts.open}</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="CLOSED" class="text-xs">
        Закриті
        <span class="ml-1.5 opacity-60 tabular-nums">{data.counts.closed}</span>
      </Tabs.Trigger>
      <Tabs.Trigger value="OTHER" class="text-xs">
        Інші
        <span class="ml-1.5 opacity-60 tabular-nums"
          >{data.counts.cancelled}</span
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
            Немає заявок
          </p>
          <p class="text-xs mb-4" style="color: var(--muted-foreground)">
            Опублікуйте заявку щоб фрілансери відгукнулись
          </p>
          {#if data.jobs.length === 0}
            <Button onclick={() => goto('/jobs/new')}>
              <Plus class="size-4 mr-1" />
              Перша заявка
            </Button>
          {/if}
        </div>
      {:else}
        <div class="space-y-3">
          {#each filtered as job (job.id)}
            <JobCard
              {job}
              showClient={false}
              statusBadge={statusBadge(job.status)}
            />
          {/each}
        </div>
      {/if}
    </Tabs.Content>
  </Tabs.Root>
</div>
