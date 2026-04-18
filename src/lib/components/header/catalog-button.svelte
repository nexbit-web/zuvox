<script lang="ts">
  import { LayoutGrid, X } from 'lucide-svelte'

  let { open = $bindable(false) }: { open: boolean } = $props()
</script>

<div data-catalog>
  <button
    type="button"
    onclick={(e) => {
      e.stopPropagation()
      open = !open
    }}
    class="w-11 h-11 flex items-center justify-center rounded-xl cursor-pointer text-primary -my-2 transition-all duration-200
      {open
        ? 'text-white bg-primary hover:bg-primary/90'
        : 'bg-primary/20 hover:bg-primary/40'}"
  >
    {#if open}
      <X class="w-5 h-5" />
    {:else}
      <LayoutGrid class="w-5 h-5" />
    {/if}
  </button>
</div>