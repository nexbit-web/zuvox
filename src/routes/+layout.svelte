<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import './layout.css'
  import favicon from '$lib/assets/favicon.svg'
  import { ModeWatcher } from 'mode-watcher'
  import Header from '$lib/components/header/index.svelte'
  import { page } from '$app/stores'

  // На /messages чат працює full-screen без хедера сайту
  const hideHeader = $derived($page.url.pathname.startsWith('/messages'))

  import NProgress from 'nprogress'
  import 'nprogress/nprogress.css'
  import { beforeNavigate, afterNavigate } from '$app/navigation'

  let { children } = $props()

  NProgress.configure({
    showSpinner: false,
  })

  beforeNavigate(() => {
    NProgress.start()
  })

  afterNavigate(() => {
    NProgress.done()
  })
</script>

<ModeWatcher />
<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if !hideHeader}
  <Header />
{/if}

{@render children()}
