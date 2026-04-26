<!-- src/routes/(auth)/dashboard/+page.svelte -->
<script lang="ts">
  import FreelancerProfileView from '$lib/components/profile/freelancer-profile-view.svelte'
  import ClientProfileView from '$lib/components/profile/client-profile-view.svelte'
  import FollowingList from '$lib/components/profile/following-list.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>Мій профіль · Zunor</title>
</svelte:head>

{#if data.profileType === 'freelancer'}
  <FreelancerProfileView
    user={data.user}
    isOwner={data.isOwner}
    isAuthenticated={data.isAuthenticated}
  />

  <!-- Підписки фрілансера: на кого він підписаний (інші майстри) -->
  <div
    class="max-w-2xl mx-auto px-4 sm:px-8 pb-20 md:pb-10"
    style="background-color: var(--background)"
  >
    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
    ></div>
    <FollowingList items={data.following} />
  </div>
{:else}
  <ClientProfileView
    user={data.user}
    isOwner={data.isOwner}
    isAuthenticated={data.isAuthenticated}
  />

  <!-- Підписки клієнта — основна частина його дашборду -->
  <div
    class="max-w-2xl mx-auto px-4 sm:px-8 pb-24 sm:pb-12"
    style="background-color: var(--background)"
  >
    <div
      class="border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
    ></div>
    <FollowingList items={data.following} />
  </div>
{/if}
