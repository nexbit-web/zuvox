<!-- src/lib/components/header/catalog-menu.svelte -->
<script lang="ts">
  import { ChevronRight } from 'lucide-svelte'
  import { fade } from 'svelte/transition'
  import { categories } from '$lib/data/categories'

  let {
    onnavigate,
  }: {
    onnavigate: (url: string) => void
  } = $props()

  let activeCategory = $state(0)
</script>

<!-- Відступи по боках і зверху + закруглення -->
<div class="px-3 pt-2 pb-3">
  <div
    in:fade={{ duration: 120 }}
    class="catalog-wrap flex rounded-2xl shadow-2xl overflow-hidden border border-white/5"
    style="height: calc(90vh - 72px); background-color: var(--bg-header); width: min(88vw, 1350px)"
  >
    <!-- Сайдбар -->
    <div
      class="catalog-sidebar w-64 lg:w-72 xl:w-80 shrink-0 py-2 border-r border-white/5"
      style="background-color: var(--bg-header)"
    >
      {#each categories as cat, i}
        <div class="px-2">
          <button
            onmouseenter={() => (activeCategory = i)}
            onclick={() =>
              onnavigate(`/gigs?category=${encodeURIComponent(cat.name)}`)}
            class="w-full flex items-center justify-between px-4 py-2.5 text-[15px] transition-colors cursor-pointer rounded-xl
              {activeCategory === i
              ? 'bg-[var(--catalog-sidebar-hover)] text-primary font-medium'
              : 'text-foreground/80   '}"
          >
            <span class="flex items-center gap-3">
              <span class="text-lg leading-none">{cat.icon}</span>
              <span>{cat.name}</span>
            </span>
            <ChevronRight
              class="w-4 h-4 shrink-0 transition-colors
                {activeCategory === i ? 'text-primary' : 'text-foreground/20'}"
            />
          </button>
        </div>
      {/each}
    </div>

    <!-- Контент підкатегорій -->
    <div
      class="catalog-content flex-1 px-10 py-8"
      style="background-color: var(--bg-header)"
    >
      {#key activeCategory}
        <div transition:fade={{ duration: 80 }}>
          <!-- Заголовок -->
          <a
            href="/gigs?category={encodeURIComponent(
              categories[activeCategory].name,
            )}"
            class="flex items-center gap-3 mb-8 group w-fit"
          >
            <span class="text-3xl leading-none"
              >{categories[activeCategory].icon}</span
            >
            <h2
              class="text-[28px] font-bold text-foreground group-hover:text-primary transition-colors leading-tight"
            >
              {categories[activeCategory].name}
            </h2>
            <ChevronRight
              class="w-6 h-6 text-foreground/20 group-hover:text-primary transition-colors mt-1"
            />
          </a>

          <!-- Сітка підкатегорій -->
          <div
            class="grid grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8"
          >
            {#each categories[activeCategory].subs as sub}
              <div>
                <h3
                  class="text-[15px] font-semibold text-foreground mb-3 leading-snug"
                >
                  {sub.title}
                </h3>
                <div class="space-y-2.5">
                  {#each sub.items as item}
                    <a
                      href="/gigs?sub={encodeURIComponent(item)}"
                      class="block text-[14px] text-foreground/50 hover:text-foreground transition-colors leading-snug"
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
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }
  .catalog-content:hover {
    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
  }
  .catalog-sidebar::-webkit-scrollbar,
  .catalog-content::-webkit-scrollbar {
    width: 4px;
  }
  .catalog-sidebar::-webkit-scrollbar-track,
  .catalog-content::-webkit-scrollbar-track {
    background: transparent;
  }
  .catalog-sidebar::-webkit-scrollbar-thumb,
  .catalog-content::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 999px;
  }
  .catalog-sidebar:hover::-webkit-scrollbar-thumb,
  .catalog-content:hover::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
  }
  .catalog-sidebar:hover::-webkit-scrollbar-thumb:hover,
  .catalog-content:hover::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }
</style>
