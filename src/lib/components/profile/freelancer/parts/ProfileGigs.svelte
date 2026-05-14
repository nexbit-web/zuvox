<!-- src/lib/components/profile/freelancer/parts/ProfileGigs.svelte -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { Briefcase, Star, ArrowUpRight } from 'lucide-svelte'
  import type { ProfileGig } from '$lib/components/profile/types'

  interface Props {
    gigs: ProfileGig[]
    isOwner: boolean
  }
  let { gigs, isOwner }: Props = $props()
</script>

<section class="py-5" aria-labelledby="gigs-heading">
  <div class="flex items-center justify-between mb-4">
    <h2
      id="gigs-heading"
      class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
      style="color: var(--muted-foreground)"
    >
      <Briefcase class="size-3.5" aria-hidden="true" /> Послуги
    </h2>
    {#if isOwner}
      <button
        onclick={() => goto('/gigs/new')}
        class="text-xs cursor-pointer transition-opacity hover:opacity-70"
        style="color: var(--primary)"
      >
        + Додати
      </button>
    {/if}
  </div>

  {#if gigs.length > 0}
    <ul class="list-none p-0 m-0">
      {#each gigs as gig, i (gig.id)}
        <li>
          <a
            href="/gigs/{gig.id}"
            class="flex items-center gap-3 sm:gap-4 py-3.5 transition-opacity hover:opacity-70 cursor-pointer group"
            style="border-top: {i === 0
              ? 'none'
              : '1px solid color-mix(in oklch, var(--foreground) 5%, transparent)'}"
          >
            <div
              class="size-8 flex items-center justify-center rounded-lg shrink-0 border"
              style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                     border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
            >
              <Briefcase
                class="size-3.5"
                style="color: var(--muted-foreground)"
                aria-hidden="true"
              />
            </div>
            <div class="flex-1 min-w-0">
              <p
                class="text-sm font-medium truncate"
                style="color: var(--foreground)"
              >
                {gig.title}
              </p>
              {#if gig.rating !== undefined && gig.orders !== undefined}
                <p
                  class="text-xs mt-0.5 flex items-center gap-1"
                  style="color: var(--muted-foreground)"
                >
                  <Star
                    class="size-3"
                    style="color: #f5a623; fill: #f5a623"
                    aria-hidden="true"
                  />
                  {gig.rating} · {gig.orders} замовлень
                </p>
              {/if}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="text-sm font-medium whitespace-nowrap"
                style="color: var(--primary)"
              >
                від {gig.price.toLocaleString('uk-UA')} грн
              </span>
              <ArrowUpRight
                class="size-3.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style="color: var(--muted-foreground)"
                aria-hidden="true"
              />
            </div>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div
      class="text-center py-8 rounded-xl"
      style="background-color: color-mix(in oklch, var(--foreground) 2%, transparent)"
    >
      <p class="text-sm" style="color: var(--muted-foreground); opacity: 0.7">
        {isOwner
          ? 'У вас ще немає активних послуг'
          : 'У користувача ще немає активних послуг'}
      </p>
      {#if isOwner}
        <button
          onclick={() => goto('/gigs/new')}
          class="text-xs mt-2 cursor-pointer transition-opacity hover:opacity-70"
          style="color: var(--primary)"
        >
          Створити першу послугу →
        </button>
      {/if}
    </div>
  {/if}
</section>
