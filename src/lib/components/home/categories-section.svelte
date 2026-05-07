<script lang="ts">
  import { Skeleton } from '$lib/components/ui/skeleton'
  import { onMount } from 'svelte'
  import {
    Truck,
    Hammer,
    GraduationCap,
    ArrowRight,
    BrushCleaning,
    PaintRoller,
    Drill,
    Scissors,
    Monitor,
    WashingMachine,
  } from 'lucide-svelte'

  const mainCategories = [
    { name: 'IT', slug: 'development', icon: Monitor },
    { name: 'Перевезення', slug: '', icon: Truck },
    { name: 'Ремонт', slug: '', icon: PaintRoller },
    { name: 'Техніка', slug: '', icon: WashingMachine },
    { name: 'Прибирання', slug: '', icon: BrushCleaning },
    { name: 'Краса', slug: '', icon: Scissors },
    { name: 'Будівництво', slug: '', icon: Hammer },
    { name: 'Навчання', slug: 'business', icon: GraduationCap },
    { name: 'Монтаж', slug: 'video-audio', icon: Drill },
  ]

  let loaded = $state(false)
  onMount(() => {
    setTimeout(() => (loaded = true), 600)
  })
</script>

<section class="py-24" style="background-color: var(--background)">
  <div class="max-w-6xl mx-auto px-6">
    <!-- Идентичный заголовок в стиле Uber -->
    <div class="mb-20">
      <h2
        class="text-4xl md:text-6xl font-bold tracking-tighter mb-8"
        style="color: var(--foreground)"
      >
        Послуги
      </h2>
      <div class="h-1.5 w-24" style="background-color: var(--primary)"></div>
    </div>

    <!-- Сетка карточек (иконка выше и крупнее) -->
    <div
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
    >
      {#if !loaded}
        {#each Array(10) as _}
          <Skeleton class="h-[180px] rounded-[1.5rem]" />
        {/each}
      {:else}
        {#each mainCategories as cat}
          <a
            href="/services/{cat.slug}"
            // href="/gigs?category={encodeURIComponent(cat.name)}"
            class="group flex flex-col items-center p-8 h-[180px] rounded-[1.5rem] border transition-all duration-300 hover:bg-[var(--accent)]"
            style="background-color: var(--card); border-color: var(--border);"
          >
            <!-- Иконка выше и крупнее, как в image_62c322.png -->
            <div
              class="flex-1 flex items-start justify-center pt-2 transition-transform duration-300 group-hover:scale-110"
            >
              <cat.icon
                size={55}
                strokeWidth={1}
                style="color: var(--foreground)"
              />
            </div>

            <span
              class="text-[17px] font-bold tracking-tight text-center"
              style="color: var(--foreground)"
            >
              {cat.name}
            </span>
          </a>
        {/each}

        <!-- Кнопка "Всі категорії" -->
        <a
          href="/services"
          class="group flex flex-col items-center p-8 h-[180px] rounded-[1.5rem] border transition-all duration-300 hover:bg-[var(--accent)]"
          style="background-color: var(--card); border-color: var(--border);"
        >
          <div
            class="flex-1 flex items-start justify-center pt-2 transition-transform duration-300 group-hover:translate-x-2"
          >
            <ArrowRight
              size={52}
              strokeWidth={1}
              style="color: var(--foreground)"
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
  </div>
</section>

<style>
  /* Убираем лишние тени, оставляем чистый контур Uber */
  a {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  a:hover {
    border-color: var(--primary) !important;
    transform: translateY(-4px);
  }

  :global(.dark) a:hover {
    background-color: var(--catalog-sidebar-hover) !important;
  }
</style>
