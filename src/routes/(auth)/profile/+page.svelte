<!-- src/routes/(auth)/dashboard/+page.svelte -->
<script lang="ts">
  import ProfileView from '$lib/components/profile-view.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<ProfileView user={data.user} isOwner={true} isAuthenticated={true} />