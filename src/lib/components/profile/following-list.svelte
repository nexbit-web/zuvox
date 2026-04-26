<!-- src/lib/components/profile/following-list.svelte -->
<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Badge } from '$lib/components/ui/badge'
  import { BadgeCheck, MapPin, Star, UserPlus, Users } from 'lucide-svelte'
  import { goto } from '$app/navigation'
  import type { FollowingFreelancer } from '$lib/components/profile/types'

  interface Props {
    items: FollowingFreelancer[]
  }

  let { items }: Props = $props()

  function openProfile(item: FollowingFreelancer) {
    if (item.username) goto(`/@${item.username}`)
  }
</script>

<div class="py-5">
  <div class="flex items-center justify-between mb-4">
    <p
      class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
      style="color: var(--muted-foreground)"
    >
      <Users class="size-3.5" /> Мої підписки
    </p>
    <span class="text-xs" style="color: var(--muted-foreground)">
      {items.length}
      {items.length === 1
        ? 'майстер'
        : items.length < 5
          ? 'майстри'
          : 'майстрів'}
    </span>
  </div>

  {#if items.length === 0}
    <!-- Empty state -->
    <button
      type="button"
      onclick={() => goto('/services')}
      class="w-full text-center py-10 rounded-xl cursor-pointer transition-opacity hover:opacity-80 border-2 border-dashed"
      style="background-color: color-mix(in oklch, var(--foreground) 2%, transparent);
             border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
    >
      <div
        class="size-12 mx-auto mb-3 rounded-full flex items-center justify-center"
        style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
      >
        <UserPlus class="size-5" style="color: var(--primary)" />
      </div>
      <p class="text-sm font-medium mb-1" style="color: var(--foreground)">
        Ви ще не маєте підписок
      </p>
      <p class="text-xs" style="color: var(--muted-foreground)">
        Підпишіться на майстрів, щоб не загубити їх
      </p>
      <p class="text-xs mt-3 font-medium" style="color: var(--primary)">
        Знайти майстрів →
      </p>
    </button>
  {:else}
    <div class="grid sm:grid-cols-2 gap-2">
      {#each items as item (item.id)}
        <button
          type="button"
          onclick={() => openProfile(item)}
          class="text-left flex items-start gap-3 p-3 rounded-xl border transition-all hover:opacity-90 cursor-pointer"
          style="background-color: var(--card);
                 border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
        >
          <Avatar class="size-12 shrink-0">
            <AvatarImage src={item.avatar ?? ''} alt={item.name} />
            <AvatarFallback
              class="text-sm font-semibold"
              style="background-color: var(--secondary); color: var(--secondary-foreground)"
            >
              {item.name?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1 min-w-0">
              <p
                class="text-sm font-semibold truncate"
                style="color: var(--foreground)"
              >
                {item.name}
              </p>
              {#if item.isVerified}
                <BadgeCheck
                  class="size-3.5 shrink-0"
                  style="color: var(--primary); fill: var(--primary); stroke: var(--primary-foreground)"
                />
              {/if}
            </div>

            {#if item.username}
              <p
                class="text-[11px] truncate"
                style="color: var(--muted-foreground)"
              >
                @{item.username}
              </p>
            {/if}

            <div class="flex items-center gap-2 mt-1.5">
              {#if item.avgRating > 0}
                <span
                  class="text-[11px] flex items-center gap-0.5 tabular-nums"
                  style="color: var(--muted-foreground)"
                >
                  <Star
                    class="size-2.5"
                    style="color: #f5a623; fill: #f5a623"
                  />
                  {item.avgRating.toFixed(1)} · {item.reviewsCount}
                </span>
              {/if}

              {#if item.city}
                <span
                  class="text-[11px] flex items-center gap-0.5 truncate"
                  style="color: var(--muted-foreground)"
                >
                  <MapPin class="size-2.5" />
                  {item.city}
                </span>
              {/if}
            </div>

            {#if item.categories.length > 0}
              <div class="flex flex-wrap gap-1 mt-1.5">
                {#each item.categories.slice(0, 2) as cat}
                  <Badge
                    variant="outline"
                    class="rounded-full text-[10px] font-normal px-2 py-0 cursor-default"
                  >
                    {cat}
                  </Badge>
                {/each}
              </div>
            {/if}
          </div>

          {#if item.hourlyRate}
            <div class="text-right shrink-0">
              <p class="text-[10px]" style="color: var(--muted-foreground)">
                від
              </p>
              <p
                class="text-sm font-semibold tabular-nums"
                style="color: var(--primary)"
              >
                {item.hourlyRate.toLocaleString('uk-UA')}
              </p>
              <p class="text-[10px]" style="color: var(--muted-foreground)">
                грн/год
              </p>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
</div>
