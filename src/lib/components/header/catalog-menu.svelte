<!-- src/lib/components/header/catalog-menu.svelte -->
<script lang="ts">
  import { ChevronRight } from 'lucide-svelte'
  import { fade } from 'svelte/transition'
  import { categories } from '$lib/data/categories'

  let {
    onnavigate
  }: {
    onnavigate: (url: string) => void
  } = $props()

  let activeCategory = $state(0)
</script>

<div
  in:fade={{ duration: 120 }}
  class="catalog-wrap flex    shadow-2xl z-100"
  style="background-color: var(--bg-header)"
>

  <!-- Сайдбар — окремий фон -->
   <div
    class="catalog-sidebar w-72 shrink-0 py-3  "
    style="background-color: var(--bg-header)"
  >
    {#each categories as cat, i}
      <button
        type="button"
        onmouseenter={() => activeCategory = i}
        onclick={() => onnavigate(`/gigs?category=${encodeURIComponent(cat.name)}`)}
        class="w-full flex   rounded-xl  items-center justify-between px-5 py-3 text-[15px] transition-colors cursor-pointer
          {activeCategory === i
            ? 'bg-primary/10   font-medium'
            : 'text-foreground hover:bg-muted/60'}"
      >
        <span class="flex items-center gap-3">
          <span class="text-lg leading-none">{cat.icon}</span>
          <span>{cat.name}</span>
        </span>
        <ChevronRight
          class="w-4 h-4 shrink-0 transition-colors
            {activeCategory === i ? ' ' : 'text-muted-foreground/40'}"
        />
      </button>
    {/each}
  </div>

  <!-- Контент підкатегорій -->
  <div class="catalog-content flex-1 overflow-y-auto px-10 py-8 bg-background" style="background-color: var(--bg-header)">
    {#key activeCategory}
      <div transition:fade={{ duration: 80 }}>

        <!-- Заголовок -->
        <a
          href="/gigs?category={encodeURIComponent(categories[activeCategory].name)}"
          class="flex items-center gap-3 mb-8 group w-fit"
        >
          <span class="text-3xl leading-none">{categories[activeCategory].icon}</span>
          <h2 class="text-[28px] font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
            {categories[activeCategory].name}
          </h2>
          <ChevronRight class="w-6 h-6 text-muted-foreground/40 group-hover:text-primary transition-colors mt-1" />
        </a>

        <!-- Сітка підкатегорій -->
        <div class="grid grid-cols-3 gap-x-12 gap-y-8">
          {#each categories[activeCategory].subs as sub}
            <div>
              <h3 class="text-[15px] font-semibold text-foreground mb-3 leading-snug">
                {sub.title}
              </h3>
              <div class="space-y-2.5">
                {#each sub.items as item}
                   <a
                    href="/gigs?sub={encodeURIComponent(item)}"
                    class="block text-[14px] text-muted-foreground hover:text-foreground transition-colors leading-snug"
                  >
                    {item}
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </div>

      </div>
    {/key}
  </div>

</div>

<style>
  .catalog-sidebar {
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }
  .catalog-content {
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
  }
  .catalog-sidebar:hover {
    scrollbar-color: color-mix(in oklch, currentColor 20%, transparent) transparent;
  }
  .catalog-content:hover {
    scrollbar-color: color-mix(in oklch, currentColor 20%, transparent) transparent;
  }
  .catalog-sidebar::-webkit-scrollbar,
  .catalog-content::-webkit-scrollbar { width: 1px; }
  .catalog-sidebar::-webkit-scrollbar-track,
  .catalog-content::-webkit-scrollbar-track { background: transparent; }
  .catalog-sidebar::-webkit-scrollbar-thumb,
  .catalog-content::-webkit-scrollbar-thumb { background: transparent; border-radius: 999px; }
  .catalog-sidebar:hover::-webkit-scrollbar-thumb,
  .catalog-content:hover::-webkit-scrollbar-thumb { background: hsl(var(--border)); }
  .catalog-sidebar:hover::-webkit-scrollbar-thumb:hover,
  .catalog-content:hover::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.4); }
</style>