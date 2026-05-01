<!-- src/routes/(auth)/dashboard/gigs/[id]/edit/+page.svelte -->
<script lang="ts">
  import GigForm from '$lib/components/gigs/gig-form.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>Редагування · {data.gig.title} · Zunor</title>
</svelte:head>

<GigForm initial={data.gig} />
