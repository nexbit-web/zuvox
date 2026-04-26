<!-- src/routes/[handle=handle]/+page.svelte -->
<script lang="ts">
  import FreelancerProfileView from '$lib/components/profile/freelancer-profile-view.svelte'
  import { goto, invalidateAll } from '$app/navigation'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let following = $state(data.isFollowing)
  let pending = $state(false)

  const profileUrl = $derived(`/@${data.user.username}`)

  async function handleFollow() {
    if (pending) return
    if (!data.isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(profileUrl))
      return
    }
    pending = true
    const wasFollowing = following
    following = !following
    try {
      const res = await fetch(`/api/user/${data.user.id}/follow`, {
        method: following ? 'POST' : 'DELETE',
      })
      if (!res.ok) following = wasFollowing
      else invalidateAll()
    } catch {
      following = wasFollowing
    } finally {
      pending = false
    }
  }

  function handleOfferWork() {
    if (!data.isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(profileUrl))
      return
    }
    goto(`/messages?to=${data.user.id}&offer=1`)
  }
</script>

<svelte:head>
  <title>{data.user.name} (@{data.user.username}) · Zunor</title>
  {#if data.user.bio}
    <meta name="description" content={data.user.bio.slice(0, 160)} />
  {/if}
  <!-- Open Graph для красивого превью при шарінгу -->
  <meta
    property="og:title"
    content="{data.user.name} (@{data.user.username})"
  />
  {#if data.user.bio}
    <meta property="og:description" content={data.user.bio.slice(0, 200)} />
  {/if}
  {#if data.user.avatar}
    <meta property="og:image" content={data.user.avatar} />
  {/if}
  <meta property="og:type" content="profile" />
</svelte:head>
<div class="h-[33px]"></div>
<FreelancerProfileView
  user={data.user}
  isOwner={false}
  isAuthenticated={data.isAuthenticated}
  isFollowing={following}
  onFollow={handleFollow}
  onOfferWork={handleOfferWork}
/>
