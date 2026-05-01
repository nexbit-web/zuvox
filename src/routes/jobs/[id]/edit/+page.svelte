<!-- src/routes/jobs/[id]/edit/+page.svelte -->
<script lang="ts">
  import JobForm from '$lib/components/jobs/job-form.svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
</script>

<svelte:head>
  <title>Редагування заявки · Zunor</title>
</svelte:head>

<JobForm initial={data.job} />
