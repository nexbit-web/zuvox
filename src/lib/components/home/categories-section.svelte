<!-- src/lib/components/home/services-section.svelte (или как у вас называется) -->
<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton'
  import { onMount } from 'svelte'
  import { ArrowRight, RotateCcw } from 'lucide-svelte'
  import { preloadData } from '$app/navigation'
  import {
    loadCategories,
    reloadCategories,
    categories,
  } from '$lib/stores/categories'
  import { getCategoryIcon } from '$lib/icons/category-icons'

  const VISIBLE_LIMIT = 9 // показуємо 9 категорій + кнопку "Всі"

  // ─── Auto-subscription до store ───
  const categoriesState = $derived($categories)

  // Локальний флаг ініціалізації
  let mounted = $state(false)

  // ─── Беремо тільки перші N категорій ───
  // Категорії в store вже відсортовані по sortOrder з БД.
  const visibleCategories = $derived(
    categoriesState.data.slice(0, VISIBLE_LIMIT),
  )

  // ─── Prefetch при hover ───
  // Завантажуємо сторінку категорії заздалегідь — перехід буде миттєвим.
  const prefetched = new Set<string>()
  function prefetchCategory(slug: string) {
    if (prefetched.has(slug)) return
    prefetched.add(slug)
    preloadData(`/services/${slug}`).catch(() => {
      prefetched.delete(slug) // дозволяємо повтор при наступному hover
    })
  }

  let sectionEl: HTMLElement | undefined = $state()
  let observer: IntersectionObserver | null = null

  onMount(() => {
    if (!sectionEl) return

    // ─── Lazy-load: завантажуємо коли секція з'являється у viewport ───
    // На повільному Wi-Fi юзер бачить hero, а скрол вниз ще не дійшов до секції —
    // category fetch не запускається, не блокує LCP.
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadCategories()
          observer?.disconnect()
        }
      },
      { rootMargin: '2px' }, // починаємо вантажити за 200px до появи
    )

    observer.observe(sectionEl)

    return () => {
      observer?.disconnect()
    }
  })
</script>

<section bind:this={sectionEl} class="py-24" style="background-color: var(--background)">
  <div class="max-w-6xl mx-auto px-6">
    <!-- ─── Заголовок ─── -->
    <div class="mb-20">
      <h2
        class="text-4xl md:text-6xl font-bold tracking-tighter mb-8"
        style="color: var(--foreground)"
      >
        Послуги
      </h2>
      <div class="h-1.5 w-24" style="background-color: var(--primary)"></div>
    </div>

    <!-- ─── Сітка ─── -->
    {#if categoriesState.error && !categoriesState.loaded}
      <!-- Error state -->
      <div
        class="flex flex-col items-center gap-3 py-16 rounded-[1.5rem]"
        style="background-color: var(--card); border: 1px solid var(--border)"
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
          <RotateCcw class="size-3.5" aria-hidden="true" />
          Спробувати ще
        </button>
      </div>
    {:else}
      <div
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
      >
        {#if !categoriesState.loaded}
          <!-- Skeleton поки не завантажилось — від першого рендеру до повних даних -->
          {#each Array(VISIBLE_LIMIT + 1) as _, i (i)}
            <Skeleton class="h-[180px] rounded-[1.5rem]" />
          {/each}
        {:else}
          <!-- Реальні категорії -->
          {#each visibleCategories as cat (cat.slug)}
            {@const Icon = getCategoryIcon(cat.icon)}
            <a
              href="/services/{cat.slug}"
              data-sveltekit-preload-data="hover"
              onmouseenter={() => prefetchCategory(cat.slug)}
              onfocus={() => prefetchCategory(cat.slug)}
              class="group flex flex-col items-center p-8 h-[180px] rounded-[1.5rem] border transition-all duration-300 hover:bg-[var(--accent)]"
              style="background-color: var(--card); border-color: var(--border);"
              aria-label="Категорія: {cat.name}"
            >
              <div
                class="flex-1 flex items-start justify-center pt-2 transition-transform duration-300 group-hover:scale-110"
              >
                <Icon
                  size={55}
                  strokeWidth={1}
                  style="color: var(--foreground)"
                  aria-hidden="true"
                />
              </div>

              <span
                class="text-[17px] font-bold tracking-tight text-center line-clamp-2 leading-tight"
                style="color: var(--foreground)"
              >
                {cat.name}
              </span>
            </a>
          {/each}

          <!-- Кнопка "Всі категорії" -->
          <a
            href="/services"
            data-sveltekit-preload-data="hover"
            class="group flex flex-col items-center p-8 h-[180px] rounded-[1.5rem] border transition-all duration-300 hover:bg-[var(--accent)]"
            style="background-color: var(--card); border-color: var(--border);"
            aria-label="Переглянути всі категорії"
          >
            <div
              class="flex-1 flex items-start justify-center pt-2 transition-transform duration-300 group-hover:translate-x-2"
            >
              <ArrowRight
                size={52}
                strokeWidth={1}
                style="color: var(--foreground)"
                aria-hidden="true"
              />
            </div>
            <span
              class="text-[15px] font-bold tracking-tight text-center"
              style="color: var(--foreground)"
            >
              Всі категорії
            </span>
          </a>
        {/if}
      </div>
    {/if}
  </div>
</section>

<style>
  a {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
  }

  a:hover {
    border-color: var(--primary) !important;
    transform: translateY(-4px);
  }

  :global(.dark) a:hover {
    background-color: var(--catalog-sidebar-hover) !important;
  }

  /* Обмежуємо назву категорії 2 рядками */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
