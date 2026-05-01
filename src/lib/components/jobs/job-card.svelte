<!-- src/lib/components/jobs/job-card.svelte -->
<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { MapPin, Clock, Users, Tag } from 'lucide-svelte'
  import BudgetDisplay from './budget-display.svelte'

  interface Props {
    job: {
      id: string
      title: string
      description: string
      category: string
      subcategory: string | null
      tags: string[]
      budgetType: string
      budgetMinCents: number | null
      budgetMaxCents: number | null
      currency: string
      type: string
      city: string | null
      proposalsCount: number
      createdAt: string
      expiresAt: string
      client?: {
        id: string
        name: string | null
        username: string | null
        avatar: string | null
      }
    }
    /** Показывать ли клиента (для каталога — да, для dashboard клиента — нет) */
    showClient?: boolean
    /** Дополнительный статус (для dashboard) */
    statusBadge?: string | null
  }

  let { job, showClient = true, statusBadge = null }: Props = $props()

  function formatRelativeTime(iso: string): string {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHr = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHr / 24)

    if (diffMin < 1) return 'щойно'
    if (diffMin < 60) return `${diffMin} хв тому`
    if (diffHr < 24) return `${diffHr} год тому`
    if (diffDays < 7)
      return `${diffDays} ${diffDays === 1 ? 'день' : 'днів'} тому`
    return date.toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'short',
    })
  }

  const typeLabel = $derived(
    job.type === 'ONLINE'
      ? 'Онлайн'
      : job.type === 'OFFLINE'
        ? 'Офлайн'
        : job.type === 'VISIT'
          ? 'Виїзд'
          : null,
  )
</script>

<a
  href={`/jobs/${job.id}`}
  class="block rounded-xl p-4 transition-all hover:opacity-95"
  style="background-color: var(--card); border: 1px solid var(--border)"
>
  <div class="flex items-start justify-between gap-3 mb-2">
    <h3
      class="text-[15px] font-semibold leading-snug line-clamp-2 flex-1"
      style="color: var(--foreground)"
    >
      {job.title}
    </h3>
    <BudgetDisplay
      budgetType={job.budgetType}
      budgetMinCents={job.budgetMinCents}
      budgetMaxCents={job.budgetMaxCents}
      currency={job.currency}
      size="sm"
    />
  </div>

  <p
    class="text-[13px] leading-snug line-clamp-2 mb-3"
    style="color: var(--muted-foreground)"
  >
    {job.description}
  </p>

  {#if job.tags.length > 0}
    <div class="flex flex-wrap gap-1 mb-3">
      {#each job.tags.slice(0, 4) as tag}
        <span
          class="px-2 py-0.5 rounded-full text-[10px]"
          style="background-color: var(--muted); color: var(--muted-foreground)"
        >
          #{tag}
        </span>
      {/each}
      {#if job.tags.length > 4}
        <span class="text-[10px]" style="color: var(--muted-foreground)">
          +{job.tags.length - 4}
        </span>
      {/if}
    </div>
  {/if}

  <div
    class="flex items-center justify-between gap-2 pt-3"
    style="border-top: 1px solid var(--border)"
  >
    <div class="flex items-center gap-2 min-w-0">
      {#if showClient && job.client}
        <Avatar class="size-6">
          <AvatarImage
            src={job.client.avatar ?? ''}
            alt={job.client.name ?? ''}
          />
          <AvatarFallback
            class="text-[10px] font-semibold"
            style="background-color: var(--muted); color: var(--foreground)"
          >
            {job.client.name?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <span class="text-xs truncate" style="color: var(--muted-foreground)">
          {job.client.name}
        </span>
      {/if}
    </div>

    <div
      class="flex items-center gap-3 text-[10px] shrink-0"
      style="color: var(--muted-foreground)"
    >
      <span class="flex items-center gap-1">
        <Users class="size-3" />
        {job.proposalsCount}
      </span>
      {#if typeLabel}
        <span class="flex items-center gap-1">
          {typeLabel}{#if job.city}, {job.city}{/if}
        </span>
      {/if}
      <span>{formatRelativeTime(job.createdAt)}</span>
      {#if statusBadge}
        <span
          class="px-1.5 py-0.5 rounded font-semibold uppercase"
          style="background-color: var(--muted); color: var(--foreground)"
        >
          {statusBadge}
        </span>
      {/if}
    </div>
  </div>
</a>
