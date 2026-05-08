<!-- src/lib/components/header/catalog-menu.svelte -->
<script lang="ts">
  import { ChevronRight, RotateCcw } from 'lucide-svelte'
  import { fade } from 'svelte/transition'
  import { onMount, untrack } from 'svelte'
  import { preloadData } from '$app/navigation'
  import {
    loadCategories,
    reloadCategories,
    categories,
  } from '$lib/stores/categories'
  import { Skeleton } from '$lib/components/ui/skeleton'
  import { getCategoryIcon } from '$lib/icons/category-icons'

  interface Props {
    onnavigate: (url: string) => void
  }

  let { onnavigate }: Props = $props()

  // ─── State ───
  let activeCategory = $state(0)

  const categoriesState = $derived($categories)
  const activeData = $derived(categoriesState.data[activeCategory])

  // Іконка активної категорії — обчислюється тільки при зміні activeData
  const ActiveIcon = $derived(
    activeData ? getCategoryIcon(activeData.icon) : null,
  )

  // ─── Throttle на зміну активної категорії ───
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null
  function setActive(i: number) {
    if (activeCategory === i) return
    activeCategory = i
  }
  function setActiveImmediate(i: number) {
    if (hoverTimeout) clearTimeout(hoverTimeout)
    activeCategory = i
  }

  // ─── Prefetch сторінки категорії при наведенні ───
  const prefetched = new Set<string>()
  function prefetchCategory(slug: string) {
    if (prefetched.has(slug)) return
    prefetched.add(slug)
    preloadData(`/services/${slug}`).catch(() => {
      prefetched.delete(slug)
    })
  }

  // ─── Keyboard navigation ───
  function onKeydown(e: KeyboardEvent) {
    if (!categoriesState.loaded || categoriesState.data.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeCategory = (activeCategory + 1) % categoriesState.data.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeCategory =
        (activeCategory - 1 + categoriesState.data.length) %
        categoriesState.data.length
    } else if (e.key === 'Enter' && activeData) {
      e.preventDefault()
      onnavigate(`/services/${activeData.slug}`)
    }
  }

  // ─── Mount ───
  // ─── НЕ грузимо категорії на mount ───
  // Завантажуємо тільки коли юзер відкриває каталог.
  onMount(() => {
    // тільки keyboard listener, БЕЗ loadCategories
    window.addEventListener('keydown', onKeydown)
    return () => {
      window.removeEventListener('keydown', onKeydown)
      if (hoverTimeout) clearTimeout(hoverTimeout)
    }
  })

  // Завантажуємо при першому відкритті
  $effect(() => {
    if (!categoriesState.loaded && !categoriesState.loading) {
      loadCategories()
    }
  })

  // ─── Захист від outdated activeCategory ───
  $effect(() => {
    if (
      categoriesState.loaded &&
      activeCategory >= categoriesState.data.length
    ) {
      untrack(() => {
        activeCategory = 0
      })
    }
  })

  // ─── Prefetch першої категорії ───
  $effect(() => {
    if (categoriesState.loaded && activeData) {
      untrack(() => prefetchCategory(activeData.slug))
    }
  })
</script>

<div class="px-3 pt-2 pb-3">
  <div
    in:fade={{ duration: 120 }}
    class="catalog-wrap flex rounded-2xl shadow-2xl overflow-hidden border"
    style="height: calc(90vh - 72px);
           background-color: var(--bg-header);
           border-color: var(--border);
           width: min(88vw, 1350px)"
    role="dialog"
    aria-label="Каталог категорій"
  >
    {#if categoriesState.loading && !categoriesState.loaded}
      <!-- ─── Skeleton ─── -->
      <div
        class="catalog-sidebar w-64 lg:w-72 xl:w-80 shrink-0 py-2 border-r"
        style="background-color: var(--bg-header); border-color: var(--border)"
      >
        {#each Array(8) as _, i}
          <div class="px-2 py-2">
            <Skeleton class="h-10 w-full rounded-xl" />
          </div>
        {/each}
      </div>
      <div
        class="catalog-content flex-1 px-10 py-8"
        style="background-color: var(--bg-header)"
      >
        <Skeleton class="h-9 w-1/3 mb-8" />
        <div
          class="grid grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-8"
        >
          {#each Array(9) as _, i}
            <div>
              <Skeleton class="h-5 w-2/3 mb-3" />
              <div class="space-y-2.5">
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-3/4" />
                <Skeleton class="h-4 w-5/6" />
              </div>
            </div>
          {/each}
        </div>
      </div>
    {:else if categoriesState.error}
      <!-- ─── Помилка ─── -->
      <div
        class="flex-1 flex flex-col items-center justify-center gap-3 p-8"
        role="alert"
      >
        <p class="text-sm" style="color: var(--muted-foreground)">
          {categoriesState.error}
        </p>
        <button
          type="button"
          onclick={() => reloadCategories()}
          class="inline-flex items-center gap-1.5 text-sm font-medium hover:underline cursor-pointer"
          style="color: var(--primary)"
        >
          <RotateCcw class="w-3.5 h-3.5" aria-hidden="true" />
          Спробувати ще
        </button>
      </div>
    {:else if categoriesState.data.length === 0}
      <!-- ─── Пусто ─── -->
      <div class="flex-1 flex items-center justify-center">
        <p class="text-sm" style="color: var(--muted-foreground)">
          Категорії не знайдено
        </p>
      </div>
    {:else}
      <!-- ─── Сайдбар ─── -->
      <nav
        class="catalog-sidebar w-64 lg:w-72 xl:w-80 shrink-0 py-2 border-r"
        style="background-color: var(--bg-header); border-color: var(--border)"
        aria-label="Категорії"
      >
        <ul class="list-none m-0 p-0">
          {#each categoriesState.data as cat, i (cat.slug)}
            {@const Icon = getCategoryIcon(cat.icon)}
            <li class="px-2">
              <button
                type="button"
                onmouseenter={() => {
                  setActive(i)
                  prefetchCategory(cat.slug)
                }}
                onfocus={() => setActive(i)}
                onclick={() => onnavigate(`/services/${cat.slug}`)}
                aria-current={activeCategory === i ? 'true' : undefined}
                class="catalog-item w-full flex items-center justify-between px-4 py-2.5 text-[15px] transition-colors cursor-pointer rounded-xl"
                class:active={activeCategory === i}
              >
                <span class="flex items-center gap-3 min-w-0">
                  <Icon
                    class="shrink-0 catalog-icon"
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                  <span class="truncate">{cat.name}</span>
                </span>
                <ChevronRight
                  class="w-4 h-4 shrink-0 transition-colors catalog-chevron"
                  aria-hidden="true"
                />
              </button>
            </li>
          {/each}
        </ul>
      </nav>

      <!-- ─── Контент підкатегорій ─── -->
      <div
        class="catalog-content flex-1 px-10 py-8"
        style="background-color: var(--bg-header);
               content-visibility: auto;
               contain-intrinsic-size: 600px"
      >
        {#if activeData}
          <div class="catalog-content-inner">
            <div transition:fade={{ duration: 80 }}>
              <!-- Заголовок -->
              <a
                href="/services/{activeData.slug}"
                data-sveltekit-preload-data="hover"
                onclick={(e) => {
                  e.preventDefault()
                  onnavigate(`/services/${activeData.slug}`)
                }}
                class="catalog-title flex items-center gap-3 mb-8 group w-fit"
              >
                {#if ActiveIcon}
                  <ActiveIcon
                    class="catalog-icon-large shrink-0"
                    size={32}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                {/if}
                <h2
                  class="text-[28px] font-bold leading-tight m-0 transition-colors"
                  style="color: var(--foreground)"
                >
                  {activeData.name}
                </h2>
                <ChevronRight
                  class="w-6 h-6 transition-colors mt-1 catalog-title-chev"
                  aria-hidden="true"
                />
              </a>

              {#if activeData.description}
                <p
                  class="text-sm mb-6 max-w-2xl -mt-4"
                  style="color: var(--muted-foreground)"
                >
                  {activeData.description}
                </p>
              {/if}

              {#if activeData.subs.length > 0}
                <ul
                  class="grid grid-cols-2 lg:grid-cols-3 gap-x-8 lg:gap-x-12 gap-y-3 list-none m-0 p-0"
                >
                  {#each activeData.subs as sub (sub.slug)}
                    <li>
                      <a
                        href="/services/{activeData.slug}?sub={sub.slug}"
                        data-sveltekit-preload-data="hover"
                        onclick={(e) => {
                          e.preventDefault()
                          onnavigate(
                            `/services/${activeData.slug}?sub=${sub.slug}`,
                          )
                        }}
                        class="catalog-sub block text-[14px] leading-snug py-1 transition-colors"
                      >
                        {sub.name}
                      </a>
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="text-sm" style="color: var(--muted-foreground)">
                  У цій категорії поки що немає підкатегорій
                </p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  /* ─── Сайдбар: hover і active state через CSS-vars ─── */
  .catalog-item {
    color: color-mix(in oklch, var(--foreground) 80%, transparent);
    background-color: transparent;
  }
  .catalog-item:hover {
    background-color: color-mix(in oklch, var(--foreground) 5%, transparent);
  }
  .catalog-item.active {
    background-color: var(--catalog-sidebar-hover);
    color: var(--foreground);
    font-weight: 500;
  }

  .catalog-chevron {
    color: color-mix(in oklch, var(--foreground) 20%, transparent);
  }
  .catalog-item.active .catalog-chevron {
    color: var(--foreground);
  }

  /* ─── Іконки ─── */
  .catalog-icon {
    color: color-mix(in oklch, var(--foreground) 55%, transparent);
    transition: color 0.15s ease;
  }
  .catalog-item:hover .catalog-icon,
  .catalog-item.active .catalog-icon {
    color: var(--foreground);
  }

  .catalog-icon-large {
    color: var(--foreground);
    transition: color 0.15s ease;
  }
  .catalog-title:hover .catalog-icon-large {
    color: var(--primary);
  }

  /* ─── Заголовок розділу: hover ─── */
  .catalog-title-chev {
    color: color-mix(in oklch, var(--foreground) 20%, transparent);
  }
  .catalog-title:hover h2,
  .catalog-title:hover .catalog-title-chev {
    color: var(--primary);
  }

  /* ─── Підкатегорії ─── */
  .catalog-sub {
    color: color-mix(in oklch, var(--foreground) 60%, transparent);
  }
  .catalog-sub:hover {
    color: var(--foreground);
  }

  /* ─── Скролл ─── */
  .catalog-sidebar {
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    overscroll-behavior: contain;
    scroll-behavior: smooth;
  }
  .catalog-content {
    overflow-y: scroll;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    overscroll-behavior: contain;
  }
  .catalog-sidebar:hover,
  .catalog-content:hover {
    scrollbar-color: color-mix(in oklch, var(--foreground) 15%, transparent)
      transparent;
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
    background: color-mix(in oklch, var(--foreground) 15%, transparent);
  }
  .catalog-sidebar:hover::-webkit-scrollbar-thumb:hover,
  .catalog-content:hover::-webkit-scrollbar-thumb:hover {
    background: color-mix(in oklch, var(--foreground) 25%, transparent);
  }
</style>
