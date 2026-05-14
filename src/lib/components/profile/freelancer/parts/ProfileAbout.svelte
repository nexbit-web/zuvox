<!-- src/lib/components/profile/freelancer/parts/ProfileAbout.svelte -->
<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import { User } from 'lucide-svelte'
  import type { FreelancerProfileData } from '$lib/components/profile/types'

  interface Props {
    user: FreelancerProfileData
    isOwner: boolean
  }
  let { user, isOwner }: Props = $props()

  // Категорія: показуємо тільки якщо бек прислав українську назву.
  // Slug типу "cleaning-services" НЕ показуємо — це некрасиво виглядає
  // для користувача і означає що бек не зміг резолвити (наприклад
  // категорії немає в таблиці Category).
  const categoryDisplay = $derived(user.categoryName ?? null)
  const subcategoryDisplay = $derived(user.subcategoryName ?? null)
</script>

<section class="py-5 space-y-4" aria-labelledby="about-heading">
  <h2
    id="about-heading"
    class="text-[11px] font-medium tracking-widest uppercase flex items-center gap-1.5"
    style="color: var(--muted-foreground)"
  >
    <User class="size-3.5" aria-hidden="true" /> Про себе
  </h2>

  {#if user.bio}
    <p
      class="text-sm leading-relaxed"
      style="color: var(--muted-foreground); overflow-wrap: anywhere"
      itemprop="description"
    >
      {user.bio}
    </p>
  {:else}
    <p
      class="text-sm italic"
      style="color: var(--muted-foreground); opacity: 0.6"
    >
      {isOwner ? 'Ви ще не додали опис.' : 'Користувач ще не додав опис.'}
    </p>
  {/if}

  {#if categoryDisplay}
    <div class="flex items-start justify-between gap-4">
      <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
        Категорія
      </span>
      <div class="flex flex-col items-end gap-1">
        <Badge
          class="rounded-full text-xs font-normal"
          style="background-color: color-mix(in oklch, var(--primary) 12%, transparent);
                 color: var(--primary);
                 border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent)"
        >
          {categoryDisplay}
        </Badge>
        {#if subcategoryDisplay}
          <span class="text-xs" style="color: var(--muted-foreground)">
            {subcategoryDisplay}
          </span>
        {/if}
      </div>
    </div>
  {/if}

  {#if user.experience}
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
        Досвід
      </span>
      <span class="text-sm text-right" style="color: var(--foreground)">
        {user.experience}
      </span>
    </div>
  {/if}

  {#if user.languages.length > 0}
    <div class="flex items-start justify-between gap-4">
      <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
        Мови
      </span>
      <ul class="flex gap-2 flex-wrap justify-end list-none p-0 m-0">
        {#each user.languages as lang, i (lang)}
          <li class="text-sm" style="color: var(--foreground)">
            {lang}{i < user.languages.length - 1 ? ',' : ''}
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  {#if user.hourlyRate}
    <div class="flex items-center justify-between gap-4">
      <span class="text-sm shrink-0" style="color: var(--muted-foreground)">
        Ставка
      </span>
      <span class="text-sm text-right" style="color: var(--foreground)">
        від
        <span class="font-semibold">
          {user.hourlyRate.toLocaleString('uk-UA')} грн
        </span>
        <span style="color: var(--muted-foreground)">/ год</span>
      </span>
    </div>
  {/if}
</section>