<!-- src/routes/[handle=handle]/+page.svelte -->
<script lang="ts">
  import FreelancerProfileView from '$lib/components/profile/freelancer-profile-view.svelte'
  import { goto, invalidateAll } from '$app/navigation'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let following = $state(data.isFollowing)
  let pending = $state(false)
  let startingChat = $state(false)

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

  /**
   * Кнопка "Запропонувати роботу" / "Написати":
   * 1. Не залогінений → на login зі збереженням next
   * 2. Залогінений → POST /api/chats/start створює чат (або повертає існуючий)
   * 3. Редірект на /messages/{chatId}
   */
  async function handleOfferWork() {
    if (startingChat) return
    if (!data.isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(profileUrl))
      return
    }

    startingChat = true
    try {
      const res = await fetch('/api/chats/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: data.user.id }),
      })

      if (!res.ok) {
        console.error('[chat/start] failed', await res.text())
        return
      }

      const { chatId } = (await res.json()) as { chatId: string }
      goto(`/messages/${chatId}`)
    } catch (err) {
      console.error('[chat/start] error', err)
    } finally {
      startingChat = false
    }
  }
</script>

<svelte:head>
  <title>{data.user.name} (@{data.user.username}) · Zunor</title>
  {#if data.user.bio}
    <meta name="description" content={data.user.bio.slice(0, 160)} />
  {/if}
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

<FreelancerProfileView
  user={data.user}
  isOwner={false}
  isAuthenticated={data.isAuthenticated}
  isFollowing={following}
  onFollow={handleFollow}
  onOfferWork={handleOfferWork}
/>
