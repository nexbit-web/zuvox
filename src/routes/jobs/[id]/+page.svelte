<!-- src/routes/jobs/[id]/+page.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import {
    BadgeCheck,
    Clock,
    MapPin,
    Calendar,
    Users,
    Edit,
    Trash2,
  } from 'lucide-svelte'
  import { Button } from '$lib/components/ui/button'
  import BudgetDisplay from '$lib/components/jobs/budget-display.svelte'
  import ProposalForm from '$lib/components/jobs/proposal-form.svelte'
  import ProposalCard from '$lib/components/jobs/proposal-card.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let cancelLoading = $state(false)

  function formatMoney(cents: number): string {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const typeLabel = $derived(
    data.job.type === 'ONLINE'
      ? 'Онлайн'
      : data.job.type === 'OFFLINE'
        ? 'Офлайн'
        : data.job.type === 'VISIT'
          ? 'Виїзд'
          : 'Будь-який',
  )

  const isExpired = $derived(new Date(data.job.expiresAt) < new Date())
  const canApply = $derived(
    !data.isOwner &&
      data.job.status === 'OPEN' &&
      !isExpired &&
      data.userRole === 'FREELANCER' &&
      !data.myProposal,
  )

  // Suggested значення для форми відгука
  const suggestedPriceUah = $derived(
    data.job.budgetMaxCents ? data.job.budgetMaxCents / 100 : null,
  )

  async function cancelJob() {
    if (cancelLoading) return
    if (
      !confirm(
        'Скасувати заявку? Якщо є відгуки менше години — фрілансерам повернуть лід.',
      )
    )
      return

    cancelLoading = true
    try {
      const res = await fetch(`/api/jobs/${data.job.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        alert('Помилка скасування')
        return
      }
      goto('/dashboard/jobs')
    } finally {
      cancelLoading = false
    }
  }

  // Власна суба-функція для startChat
  async function startChat(peerId: string) {
    const res = await fetch('/api/chats/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ peerId }),
    })
    if (!res.ok) return
    const { chatId } = await res.json()
    goto(`/messages/${chatId}`)
  }
</script>

<svelte:head>
  <title>{data.job.title} · Zunor</title>
</svelte:head>

<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
  <!-- Status banner -->
  {#if data.job.status !== 'OPEN'}
    <div
      class="rounded-xl px-4 py-3 mb-4 text-sm"
      style="background-color: var(--muted);
             border: 1px solid var(--border);
             color: var(--foreground)"
    >
      {#if data.job.status === 'CLOSED'}
        Заявка закрита — клієнт обрав фрілансера.
      {:else if data.job.status === 'CANCELLED'}
        Заявка скасована клієнтом.
      {:else if data.job.status === 'EXPIRED'}
        Термін прийому відгуків вийшов.
      {/if}
    </div>
  {/if}

  <div class="grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-10">
    <!-- ─── ЛІВА ЧАСТИНА ─── -->
    <div class="min-w-0">
      <!-- Category breadcrumb -->
      <div class="text-xs mb-2" style="color: var(--muted-foreground)">
        {data.job.category}
        {#if data.job.subcategory}/ {data.job.subcategory}{/if}
      </div>

      <!-- Title -->
      <h1
        class="text-2xl sm:text-3xl font-bold tracking-tight mb-3 leading-tight"
        style="color: var(--foreground)"
      >
        {data.job.title}
      </h1>

      <!-- Quick stats -->
      <div
        class="flex flex-wrap items-center gap-4 mb-5 pb-5 text-xs"
        style="border-bottom: 1px solid var(--border); color: var(--muted-foreground)"
      >
        <span class="flex items-center gap-1.5">
          <Calendar class="size-3.5" />
          Опубліковано {formatDate(data.job.createdAt)}
        </span>
        {#if data.job.deliveryDays}
          <span class="flex items-center gap-1.5">
            <Clock class="size-3.5" />
            Бажаний термін: {data.job.deliveryDays} днів
          </span>
        {/if}
        <span class="flex items-center gap-1.5">
          <Users class="size-3.5" />
          {data.job.proposalsCount} відгуків
        </span>
        {#if data.job.city}
          <span class="flex items-center gap-1.5">
            <MapPin class="size-3.5" />
            {data.job.city}
          </span>
        {/if}
        <span>Тип: {typeLabel}</span>
      </div>

      <!-- Description -->
      <h2 class="text-base font-semibold mb-2" style="color: var(--foreground)">
        Опис задачі
      </h2>
      <div
        class="text-[14.5px] leading-relaxed whitespace-pre-wrap mb-5"
        style="color: var(--foreground)"
      >
        {data.job.description}
      </div>

      <!-- Tags -->
      {#if data.job.tags.length > 0}
        <div class="flex flex-wrap gap-1.5 mb-5">
          {#each data.job.tags as tag}
            <span
              class="px-2.5 py-1 rounded-full text-xs"
              style="background-color: var(--muted); color: var(--muted-foreground)"
            >
              #{tag}
            </span>
          {/each}
        </div>
      {/if}

      <!-- Owner actions: edit / cancel -->
      {#if data.isOwner && data.job.status === 'OPEN'}
        <div class="flex gap-2 mb-6">
          {#if data.job.proposalsCount === 0}
            <Button
              variant="outline"
              onclick={() => goto(`/jobs/${data.job.id}/edit`)}
            >
              <Edit class="size-4 mr-1" />
              Редагувати
            </Button>
          {/if}
          <Button
            variant="outline"
            onclick={cancelJob}
            disabled={cancelLoading}
          >
            <Trash2 class="size-4 mr-1" />
            Скасувати заявку
          </Button>
        </div>
      {/if}

      <!-- Proposals list для owner -->
      {#if data.isOwner}
        <div class="mt-8">
          <h2
            class="text-base font-semibold mb-3 flex items-center gap-2"
            style="color: var(--foreground)"
          >
            Відгуки
            <span
              class="text-xs font-normal"
              style="color: var(--muted-foreground)"
            >
              ({data.proposals.length})
            </span>
          </h2>

          {#if data.proposals.length === 0}
            <div
              class="rounded-xl p-8 text-center"
              style="background-color: var(--muted); border: 1px solid var(--border)"
            >
              <p class="text-sm" style="color: var(--muted-foreground)">
                Поки що немає відгуків. Зачекайте — фрілансери побачать вашу
                заявку.
              </p>
            </div>
          {:else}
            <div class="space-y-3">
              {#each data.proposals as proposal (proposal.id)}
                <ProposalCard
                  {proposal}
                  canSelect={true}
                  jobClosed={data.job.status !== 'OPEN'}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Мій proposal якщо я фрилансер і вже відгукнувся -->
      {#if !data.isOwner && data.myProposal}
        <div class="mt-6">
          <h2
            class="text-base font-semibold mb-3"
            style="color: var(--foreground)"
          >
            Ваш відгук
          </h2>
          <div
            class="rounded-xl p-4"
            style="background-color: var(--muted); border: 1px solid var(--border)"
          >
            <div class="flex items-start justify-between gap-3 mb-2">
              <p
                class="text-sm leading-relaxed whitespace-pre-wrap"
                style="color: var(--foreground)"
              >
                {data.myProposal.coverLetter}
              </p>
              <div class="text-right shrink-0">
                <p
                  class="text-base font-bold tabular-nums"
                  style="color: var(--foreground)"
                >
                  {formatMoney(data.myProposal.proposedPriceCents)}
                </p>
                <p class="text-[11px]" style="color: var(--muted-foreground)">
                  {data.myProposal.proposedDays} днів
                </p>
              </div>
            </div>
            <div
              class="flex items-center justify-between gap-2 pt-3 mt-3 text-[11px]"
              style="border-top: 1px solid var(--border); color: var(--muted-foreground)"
            >
              <span>
                Статус: <strong style="color: var(--foreground)">
                  {data.myProposal.status === 'SUBMITTED'
                    ? 'Очікує'
                    : data.myProposal.status === 'ACCEPTED'
                      ? 'Обрано вас!'
                      : data.myProposal.status === 'REJECTED'
                        ? 'Не обрано'
                        : 'Відкликано'}
                </strong>
              </span>
              {#if data.myProposal.status === 'ACCEPTED'}
                <Button size="sm" onclick={() => startChat(data.job.client.id)}>
                  Перейти в чат
                </Button>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- ─── ПРАВА ЧАСТИНА: budget + client + proposal form ─── -->
    <aside class="lg:sticky lg:top-6 lg:self-start space-y-4">
      <!-- Budget card -->
      <div
        class="rounded-xl p-5"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-xs font-medium uppercase tracking-wider mb-1"
          style="color: var(--muted-foreground)"
        >
          Бюджет
        </p>
        <BudgetDisplay
          budgetType={data.job.budgetType}
          budgetMinCents={data.job.budgetMinCents}
          budgetMaxCents={data.job.budgetMaxCents}
          currency={data.job.currency}
          size="md"
        />
        {#if data.job.budgetType === 'FIXED'}
          <p class="text-[11px] mt-1" style="color: var(--muted-foreground)">
            Фіксована сума
          </p>
        {:else if data.job.budgetType === 'RANGE'}
          <p class="text-[11px] mt-1" style="color: var(--muted-foreground)">
            Діапазон цін
          </p>
        {:else}
          <p class="text-[11px] mt-1" style="color: var(--muted-foreground)">
            Готовий обговорити
          </p>
        {/if}
      </div>

      <!-- Client card -->
      <div
        class="rounded-xl p-4"
        style="background-color: var(--card); border: 1px solid var(--border)"
      >
        <p
          class="text-xs font-medium uppercase tracking-wider mb-3"
          style="color: var(--muted-foreground)"
        >
          Замовник
        </p>
        <a
          href={data.job.client.username
            ? `/@${data.job.client.username}`
            : '#'}
          class="flex items-center gap-3 mb-3 group"
        >
          <Avatar class="size-12">
            <AvatarImage
              src={data.job.client.avatar ?? ''}
              alt={data.job.client.name ?? ''}
            />
            <AvatarFallback
              class="text-sm font-semibold"
              style="background-color: var(--muted); color: var(--foreground)"
            >
              {data.job.client.name?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div class="min-w-0">
            <div class="flex items-center gap-1">
              <p
                class="text-sm font-semibold truncate group-hover:underline"
                style="color: var(--foreground)"
              >
                {data.job.client.name}
              </p>
              {#if data.job.client.verificationStatus === 'VERIFIED'}
                <BadgeCheck
                  class="size-3.5 shrink-0"
                  style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
                />
              {/if}
            </div>
            {#if data.job.client.city}
              <p class="text-xs" style="color: var(--muted-foreground)">
                {data.job.client.city}
              </p>
            {/if}
          </div>
        </a>

        {#if !data.isOwner && data.isAuthenticated}
          <Button
            variant="outline"
            class="w-full"
            onclick={() => startChat(data.job.client.id)}
          >
            Написати клієнту
          </Button>
        {/if}
      </div>

      <!-- Proposal form -->
      {#if canApply}
        <ProposalForm
          jobId={data.job.id}
          walletBalanceCents={data.walletBalanceCents}
          leadFeeCents={data.leadFeeCents}
          {suggestedPriceUah}
          suggestedDays={data.job.deliveryDays}
        />
      {:else if !data.isAuthenticated}
        <div
          class="rounded-xl p-5 text-center"
          style="background-color: var(--card); border: 1px solid var(--border)"
        >
          <p class="text-sm mb-3" style="color: var(--foreground)">
            Увійдіть щоб відгукнутись
          </p>
          <Button
            class="w-full"
            onclick={() =>
              goto(
                '/user/login?next=' +
                  encodeURIComponent(`/jobs/${data.job.id}`),
              )}
          >
            Увійти
          </Button>
        </div>
      {:else if data.userRole === 'CLIENT'}
        <div
          class="rounded-xl p-5 text-center"
          style="background-color: var(--muted); border: 1px solid var(--border)"
        >
          <p class="text-xs" style="color: var(--muted-foreground)">
            Тільки фрілансери можуть відгукуватись на заявки
          </p>
        </div>
      {/if}
    </aside>
  </div>
</div>
