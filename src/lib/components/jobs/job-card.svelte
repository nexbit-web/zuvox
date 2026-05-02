<!-- src/lib/components/jobs/job-card.svelte -->
<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { MapPin, Users, Clock, ArrowRight } from 'lucide-svelte'
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
    showClient?: boolean
    statusBadge?: string | null
  }

  let { job, showClient = true, statusBadge = null }: Props = $props()

  function formatRelativeTime(iso: string): string {
    const date = new Date(iso)
    const diffMs = Date.now() - date.getTime()
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
  class="group block rounded-xl p-5 transition-colors cursor-pointer"
  style="background-color: var(--card); border: 1px solid var(--border)"
  onmouseenter={(e) =>
    ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
      'color-mix(in srgb, var(--card) 70%, var(--muted))')}
  onmouseleave={(e) =>
    ((e.currentTarget as HTMLAnchorElement).style.backgroundColor =
      'var(--card)')}
>
  <!-- Top row: title + budget -->
  <div class="flex items-start justify-between gap-4 mb-2">
    <h3
      class="text-[15px] sm:text-base font-semibold leading-snug line-clamp-2 flex-1"
      style="color: var(--foreground)"
    >
      {job.title}
    </h3>
    <div class="text-right shrink-0">
      <BudgetDisplay
        budgetType={job.budgetType}
        budgetMinCents={job.budgetMinCents}
        budgetMaxCents={job.budgetMaxCents}
        currency={job.currency}
        size="sm"
      />
      <p
        class="text-[10px] uppercase tracking-wider mt-0.5"
        style="color: var(--muted-foreground)"
      >
        бюджет
      </p>
    </div>
  </div>

  <!-- Description -->
  <p
    class="text-[13px] leading-relaxed line-clamp-2 mb-3"
    style="color: var(--muted-foreground)"
  >
    {job.description}
  </p>

  <!-- Tags + category -->
  <div class="flex flex-wrap items-center gap-1.5 mb-4">
    <span
      class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium"
      style="background-color: var(--muted); color: var(--foreground)"
    >
      {job.category}
    </span>
    {#each job.tags.slice(0, 3) as tag}
      <span
        class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px]"
        style="background-color: var(--muted); color: var(--muted-foreground)"
      >
        #{tag}
      </span>
    {/each}
    {#if job.tags.length > 3}
      <span
        class="text-[11px]"
        style="color: var(--muted-foreground)"
      >
        +{job.tags.length - 3}
      </span>
    {/if}
  </div>

  <!-- Bottom: meta -->
  <div
    class="flex items-center justify-between gap-3 pt-3"
    style="border-top: 1px solid var(--border)"
  >
    <div class="flex items-center gap-3 min-w-0 flex-1">
      {#if showClient && job.client}
        <Avatar class="size-6 shrink-0">
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
        <span
          class="text-xs font-medium truncate"
          style="color: var(--foreground)"
        >
          {job.client.name}
        </span>
        <span
          class="text-xs shrink-0"
          style="color: color-mix(in srgb, var(--muted-foreground) 50%, transparent)"
        >
          ·
        </span>
      {/if}

      <div
        class="flex items-center gap-3 text-[11px] min-w-0"
        style="color: var(--muted-foreground)"
      >
        <span class="inline-flex items-center gap-1 shrink-0">
          <Users class="size-3" />
          {job.proposalsCount}
        </span>
        {#if typeLabel}
          <span class="inline-flex items-center gap-1 shrink-0">
            {typeLabel}{#if job.city}<span class="hidden sm:inline">, {job.city}</span>{/if}
          </span>
        {/if}
        <span class="shrink-0 truncate">{formatRelativeTime(job.createdAt)}</span>
      </div>
    </div>

    <div class="flex items-center gap-2 shrink-0">
      {#if statusBadge}
        <span
          class="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded"
          style="background-color: var(--muted); color: var(--foreground)"
        >
          {statusBadge}
        </span>
      {/if}
      <ArrowRight
        class="size-4 transition-transform group-hover:translate-x-0.5"
        style="color: var(--muted-foreground)"
      />
    </div>
  </div>
</a>