<!-- src/lib/components/profile/freelancer/parts/ProfileReviews.svelte -->
<script lang="ts">
  import { MessageSquare, Star } from 'lucide-svelte'
  import type { ProfileReview } from '$lib/components/profile/types'

  interface Props {
    reviews: ProfileReview[]
    avgRating: number
    reviewsCount: number
  }
  let { reviews, avgRating, reviewsCount }: Props = $props()

  function reviewsLabel(n: number): string {
    const mod10 = n % 10
    const mod100 = n % 100
    if (mod10 === 1 && mod100 !== 11) return 'відгук'
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100))
      return 'відгуки'
    return 'відгуків'
  }
</script>

<section class="py-5" aria-labelledby="reviews-heading">
  <div class="flex items-center justify-between mb-6">
    <h2
      id="reviews-heading"
      class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
      style="color: var(--muted-foreground)"
    >
      <MessageSquare class="size-3.5" aria-hidden="true" /> Відгуки
    </h2>
    <span
      class="text-xs flex items-center gap-1"
      style="color: var(--muted-foreground)"
    >
      <Star
        class="size-3"
        style="color: #f5a623; fill: #f5a623"
        aria-hidden="true"
      />
      {avgRating.toFixed(1)} · {reviewsCount}
      {reviewsLabel(reviewsCount)}
    </span>
  </div>

  {#if reviews.length > 0}
    <ul class="list-none p-0 m-0">
      {#each reviews as review, i (review.id ?? i)}
        <li
          class="py-5 first:pt-0"
          style="border-top: {i === 0
            ? 'none'
            : '1px solid color-mix(in oklch, var(--foreground) 5%, transparent)'}"
        >
          <div class="flex items-center gap-2 mb-2">
            <div
              class="size-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border"
              style="background-color: color-mix(in oklch, var(--foreground) 4%, transparent);
                     border-color: color-mix(in oklch, var(--foreground) 8%, transparent);
                     color: var(--primary)"
              aria-hidden="true"
            >
              {review.authorInitials}
            </div>
            <span class="text-sm font-medium" style="color: var(--foreground)">
              {review.authorName}
            </span>
            <div
              class="flex ml-auto gap-0.5"
              aria-label="Рейтинг: {review.rating} з 5"
            >
              {#each Array(review.rating) as _}
                <Star
                  class="size-3"
                  style="color: #f5a623; fill: #f5a623"
                  aria-hidden="true"
                />
              {/each}
            </div>
          </div>
          <p
            class="text-sm leading-relaxed pl-9"
            style="color: var(--muted-foreground); overflow-wrap: anywhere"
          >
            {review.text}
          </p>
          <p
            class="text-[11px] mt-2 pl-9"
            style="color: color-mix(in oklch, var(--muted-foreground) 60%, transparent)"
          >
            <time datetime={new Date(review.createdAt).toISOString()}>
              {new Date(review.createdAt).toLocaleDateString('uk-UA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
          </p>
        </li>
      {/each}
    </ul>
  {:else}
    <div
      class="text-center py-8 rounded-xl"
      style="background-color: color-mix(in oklch, var(--foreground) 2%, transparent)"
    >
      <p class="text-sm" style="color: var(--muted-foreground); opacity: 0.7">
        Ще немає відгуків
      </p>
    </div>
  {/if}
</section>
