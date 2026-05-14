<!-- src/lib/components/profile/freelancer/parts/ProfileWorkInfo.svelte -->
<script lang="ts">
  import { Globe, Home, MapPin, Navigation } from 'lucide-svelte'
  import type { FreelancerProfileData } from '$lib/components/profile/types'

  interface Props {
    user: FreelancerProfileData
  }
  let { user }: Props = $props()

  const workFormats = $derived.by(() => {
    const list: Array<{ key: string; label: string; icon: typeof Globe }> = []
    if (user.worksOnline)
      list.push({ key: 'online', label: 'Онлайн', icon: Globe })
    if (user.worksOffline)
      list.push({ key: 'offline', label: 'У майстра', icon: Home })
    if (user.worksOnSite)
      list.push({ key: 'onsite', label: 'Виїзд', icon: Navigation })
    return list
  })

  const isAllUkraine = $derived(
    Array.isArray(user.serviceCities) &&
      user.serviceCities.includes('all-ukraine'),
  )

  const explicitCities = $derived(
    Array.isArray(user.serviceCities)
      ? user.serviceCities.filter((c) => c !== 'all-ukraine')
      : [],
  )

  const needsLocation = $derived(!!user.worksOffline || !!user.worksOnSite)

  const citiesLabel = $derived(
    user.worksOnSite && !user.worksOffline
      ? 'Виїзд у:'
      : user.worksOnSite && user.worksOffline
        ? 'Працює у:'
        : 'Приймає у:',
  )

  // Блок показується ТІЛЬКИ коли є реальний формат роботи.
  // Інакше — не плодимо пусту плашку з одним лише містом
  // (місто і так показано у шапці).
  const hasAnyInfo = $derived(workFormats.length > 0)
</script>

{#if hasAnyInfo}
  <section
    class="mb-5 p-4 rounded-2xl border space-y-3"
    style="background-color: var(--card);
           border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    aria-label="Формат роботи та географія"
  >
    <div class="flex flex-wrap gap-2">
      {#each workFormats as fmt (fmt.key)}
        {@const Icon = fmt.icon}
        <span
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
          style="background-color: color-mix(in oklch, var(--primary) 10%, transparent);
                 color: var(--primary);
                 border: 1px solid color-mix(in oklch, var(--primary) 25%, transparent)"
        >
          <Icon class="size-3" aria-hidden="true" />
          {fmt.label}
        </span>
      {/each}
    </div>

    {#if needsLocation}
      {#if isAllUkraine}
        <p
          class="text-sm flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <Globe class="size-3.5" aria-hidden="true" />
          Працює по всій Україні
        </p>
      {:else if explicitCities.length > 0}
        <div class="flex items-start gap-1.5">
          <MapPin
            class="size-3.5 mt-0.5 shrink-0"
            style="color: var(--muted-foreground)"
            aria-hidden="true"
          />
          <p class="text-sm" style="color: var(--muted-foreground)">
            {citiesLabel}
            <span style="color: var(--foreground)">
              {explicitCities.join(', ')}
            </span>
          </p>
        </div>
      {/if}

      {#if user.worksOnSite && user.travelRadiusKm}
        <p
          class="text-xs flex items-center gap-1.5"
          style="color: var(--muted-foreground)"
        >
          <Navigation class="size-3" aria-hidden="true" />
          Радіус виїзду — до {user.travelRadiusKm} км
        </p>
      {/if}
    {/if}
  </section>
{/if}
