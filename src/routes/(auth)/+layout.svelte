<script lang="ts">
  import Header from '$lib/components/header/index.svelte'

  let { children } = $props()
</script>

<Header />
<main>
  {@render children()}
</main>
