<!-- src/lib/components/profile/freelancer/parts/ProfileBanner.svelte -->
<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton'

  interface Props {
    src: string
  }

  let { src }: Props = $props()
  let loaded = $state(false)
</script>

<header class="px-4 pt-4 sm:px-6 sm:pt-6">
  <div
    class="relative w-full h-32 xs:h-40 sm:h-52 rounded-2xl overflow-hidden"
    style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent)"
  >
    {#if !loaded}
      <div class="absolute inset-0">
        <Skeleton class="w-full h-full rounded-2xl" />
      </div>
    {/if}
    <img
      {src}
      alt=""
      role="presentation"
      width="1200"
      height="300"
      class="w-full h-full object-cover transition-opacity duration-300"
      style="opacity: {loaded ? 1 : 0}"
      loading="eager"
      fetchpriority="high"
      decoding="async"
      onload={() => (loaded = true)}
      onerror={() => (loaded = true)}
    />
    <div
      class="absolute inset-0 pointer-events-none"
      style="background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.35))"
    ></div>
  </div>
</header>
