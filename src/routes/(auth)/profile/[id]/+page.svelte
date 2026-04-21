<!-- src/routes/(auth)/profile/[id]/+page.svelte -->
<script lang="ts">
  import ProfileView from '$lib/components/profile-view.svelte'
  import { goto, invalidateAll } from '$app/navigation'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let following = $state(data.isFollowing)
  let pending = $state(false)

  async function handleFollow() {
    if (pending) return
    if (!data.isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(`/profile/${data.user.id}`))
      return
    }

    pending = true
    const wasFollowing = following
    following = !following

    try {
      const res = await fetch(`/api/user/${data.user.id}/follow`, {
        method: following ? 'POST' : 'DELETE',
      })
      if (!res.ok) {
        following = wasFollowing
      } else {
        invalidateAll()
      }
    } catch {
      following = wasFollowing
    } finally {
      pending = false
    }
  }

  function handleOfferWork() {
    if (!data.isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(`/profile/${data.user.id}`))
      return
    }
    goto(`/messages?to=${data.user.id}&offer=1`)
  }
</script>

<ProfileView
  user={data.user}
  isOwner={false}
  isAuthenticated={data.isAuthenticated}
  isFollowing={following}
  onFollow={handleFollow}
  onOfferWork={handleOfferWork}
/>