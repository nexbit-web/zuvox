<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import './layout.css'
  import favicon from '$lib/assets/favicon.svg'
  import { ModeWatcher } from 'mode-watcher'
  import Header from '$lib/components/header/index.svelte'
  let { children } = $props()
</script>

<ModeWatcher />
<Header />
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
