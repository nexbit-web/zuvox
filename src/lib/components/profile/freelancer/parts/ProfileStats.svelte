<!-- src/lib/components/profile/freelancer/parts/ProfileStats.svelte -->
<script lang="ts">
  import { Zap, Star, BadgeCheck, Clock, RefreshCw } from 'lucide-svelte'
  import type { FreelancerProfileData } from '$lib/components/profile/types'

  interface Props {
    user: FreelancerProfileData
  }
  let { user }: Props = $props()

  const cards = $derived([
    {
      icon: Star,
      label: 'Рейтинг',
      value: user.avgRating.toFixed(1),
      suffix: '/ 5.0',
    },
    {
      icon: BadgeCheck,
      label: 'Виконано',
      value: String(user.totalOrders),
      suffix: 'замовлень',
    },
    {
      icon: Clock,
      label: 'Відповідь',
      value: `~${user.responseTimeHrs ?? 0}`,
      suffix: 'год',
    },
    {
      icon: RefreshCw,
      label: 'Повторні',
      value: `${user.repeatClientsPct}%`,
      suffix: 'клієнтів',
    },
  ])
</script>

<section class="py-5" aria-labelledby="stats-heading">
  <h2
    id="stats-heading"
    class="text-[11px] font-medium tracking-widest uppercase mb-4 flex items-center gap-1.5"
    style="color: var(--muted-foreground)"
  >
    <Zap class="size-3.5" aria-hidden="true" /> Статистика
  </h2>

  <dl class="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
    {#each cards as card (card.label)}
      {@const Icon = card.icon}
      <div
        class="rounded-lg px-3 sm:px-4 py-3 border"
        style="background-color: color-mix(in oklch, var(--foreground) 3%, transparent);
               border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
      >
        <dt
          class="text-xs mb-1 flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <Icon class="size-3" aria-hidden="true" />
          {card.label}
        </dt>
        <dd
          class="text-lg sm:text-xl font-semibold tabular-nums m-0"
          style="color: var(--foreground)"
        >
          {card.value}
          <span
            class="text-xs sm:text-sm font-normal"
            style="color: var(--muted-foreground)"
          >
            {card.suffix}
          </span>
        </dd>
      </div>
    {/each}
  </dl>

  <div
    class="flex items-center justify-between gap-2 px-4 py-3 rounded-lg"
    style="background-color: color-mix(in oklch, #10b981 8%, transparent);
           border: 1px solid color-mix(in oklch, #10b981 20%, transparent)"
  >
    <span
      class="text-sm flex items-center gap-1.5"
      style="color: var(--muted-foreground)"
    >
      <BadgeCheck class="size-3.5" style="color: #10b981" aria-hidden="true" />
      Успішних замовлень
    </span>
    <span class="text-sm font-semibold tabular-nums" style="color: #059669">
      {user.successRate}%
    </span>
  </div>
</section>
