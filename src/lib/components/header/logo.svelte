<!-- src/lib/components/header/logo.svelte -->
<script lang="ts">
  interface Props {
    /** При кліку навігує на '/'. Якщо передати false — рендер без посилання. */
    linked?: boolean
  }

  let { linked = true }: Props = $props()
</script>

{#if linked}
  <a
    href="/"
    class="text-white font-bold text-2xl sm:text-[28px] leading-none tracking-tight cursor-pointer select-none"
    aria-label="Zunor — головна"
  >
    Zunor
  </a>
{:else}
  <span
    class="text-white font-bold text-2xl sm:text-[28px] leading-none tracking-tight select-none"
  >
    Zunor4444
  </span>
{/if}
