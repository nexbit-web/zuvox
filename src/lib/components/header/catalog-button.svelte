<script lang="ts">
  import { LayoutGrid, ChevronDown, X } from 'lucide-svelte'

  let { open = $bindable(false) }: { open: boolean } = $props()
</script>

<button
  type="button"
  onclick={(e) => {
    e.stopPropagation()
    open = !open
  }}
  aria-expanded={open}
  aria-label="Відкрити каталог"
  class="inline-flex items-center gap-2 h-11 px-4 rounded-xl cursor-pointer transition-colors select-none"
  style="background-color: {open ? 'rgba(255,255,255,0.08)' : 'transparent'};
         border: 1px solid rgb(172, 167, 167);
         color: white;"
  onmouseenter={(e) => {
    if (!open)
      (e.currentTarget as HTMLElement).style.backgroundColor =
        'rgba(255,255,255,0.06)'
  }}
  onmouseleave={(e) => {
    if (!open)
      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
  }}
>
  {#if open}
    <X class="size-4" strokeWidth={2} />
  {:else}
    <LayoutGrid class="size-4" strokeWidth={2} />
  {/if}
  <span class="text-sm font-medium">Каталог</span>
  <ChevronDown
    class="size-4 transition-transform duration-200"
    strokeWidth={2}
    style="transform: rotate({open ? 180 : 0}deg)"
  />
</button>
