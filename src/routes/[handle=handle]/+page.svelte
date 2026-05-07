<!-- src/routes/[handle=handle]/+page.svelte -->
<script lang="ts">
  import FreelancerProfileView from '$lib/components/profile/freelancer-profile-view.svelte'
  import ClientProfileView from '$lib/components/profile/client-profile-view.svelte'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/state'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()

  let following = $state(
    data.profileType === 'freelancer' ? data.isFollowing : false,
  )
  let pending = $state(false)
  let startingChat = $state(false)

  const profileUrl = $derived(`/@${data.user.username}`)
  const canonicalUrl = $derived(`${page.url.origin}${profileUrl}`)

  // ─── SEO derived ───
  const isFreelancer = $derived(data.profileType === 'freelancer')

  // Title: "Імʼя (@username) — короткий опис | Zunor"
  // Якщо опис є — використовуємо першу категорію або hourlyRate як хінт.
  const seoTitle = $derived.by(() => {
    if (!isFreelancer) {
      return `${data.user.name} · Zunor`
    }
    const u = data.user as Extract<typeof data.user, { categories: string[] }>
    const hint = u.categories?.[0] ?? (u.city ? u.city : null) ?? 'фрілансер'
    return `${data.user.name} (@${data.user.username}) — ${hint} · Zunor`
  })

  // Description: bio (clean, обрізаний) АБО fallback з категорій + міста
  const seoDescription = $derived.by(() => {
    if (!isFreelancer) return ''
    const u = data.user as Extract<typeof data.user, { categories: string[] }>
    const cleanBio = u.bio?.replace(/\s+/g, ' ').trim()
    if (cleanBio && cleanBio.length >= 40) {
      return cleanBio.slice(0, 160)
    }
    // Fallback — генеруємо опис на основі даних профілю
    const parts: string[] = [`${data.user.name} — фрілансер на Zunor`]
    if (u.categories?.length)
      parts.push(`категорії: ${u.categories.slice(0, 3).join(', ')}`)
    if (u.city) parts.push(`місто: ${u.city}`)
    if (u.hourlyRate) parts.push(`від ${u.hourlyRate} грн/год`)
    return parts.join(' · ').slice(0, 160)
  })

  // Чи треба індексувати: VERIFIED і не приватний
  const shouldIndex = $derived(
    isFreelancer &&
      'verificationStatus' in data.user &&
      data.user.verificationStatus === 'VERIFIED',
  )

  // ─── Actions ───
  async function handleFollow() {
    if (data.profileType !== 'freelancer') return
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

  async function handleStartChat() {
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
  <!-- ─── Базові ─── -->
  <title>{seoTitle}</title>
  {#if seoDescription}
    <meta name="description" content={seoDescription} />
  {/if}
  <link rel="canonical" href={canonicalUrl} />

  <!-- ─── Robots ─── -->
  {#if isFreelancer}
    {#if shouldIndex}
      <meta name="robots" content="index, follow, max-image-preview:large" />
    {:else}
      <!-- Не індексуємо PENDING/REJECTED/NONE щоб не світилися "сирі" профілі -->
      <meta name="robots" content="noindex, follow" />
    {/if}
  {:else}
    <!-- Клієнтський профіль приватний -->
    <meta name="robots" content="noindex, nofollow" />
  {/if}

  {#if isFreelancer}
    <!-- ─── Open Graph (Facebook, LinkedIn, Telegram, Slack) ─── -->
    <meta property="og:type" content="profile" />
    <meta property="og:title" content={seoTitle} />
    {#if seoDescription}
      <meta property="og:description" content={seoDescription} />
    {/if}
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:site_name" content="Zunor" />
    <meta property="og:locale" content="uk_UA" />
    {#if data.user.avatar}
      <meta property="og:image" content={data.user.avatar} />
      <meta property="og:image:alt" content="Аватар {data.user.name}" />
    {/if}

    <!-- profile-specific OG -->
    {#if data.user.username}
      <meta property="profile:username" content={data.user.username} />
    {/if}

    <!-- ─── Twitter Card ─── -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seoTitle} />
    {#if seoDescription}
      <meta name="twitter:description" content={seoDescription} />
    {/if}
    {#if data.user.avatar}
      <meta name="twitter:image" content={data.user.avatar} />
    {/if}
  {/if}
</svelte:head>

{#if data.profileType === 'freelancer'}
  <FreelancerProfileView
    user={data.user}
    isOwner={false}
    isAuthenticated={data.isAuthenticated}
    isFollowing={following}
    onFollow={handleFollow}
    onOfferWork={handleStartChat}
  />
{:else}
  <ClientProfileView
    user={data.user}
    isOwner={false}
    isAuthenticated={data.isAuthenticated}
    onMessage={handleStartChat}
  />
{/if}
