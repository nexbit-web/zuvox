<!-- src/lib/components/home/categories-section.svelte -->
<script lang="ts">
  import { ArrowRight } from 'lucide-svelte'
  import { homeCategories, formatCount } from '$lib/data/home-categories'

  const filters = [
    { id: 'all', label: 'Всі' },
    { id: 'home', label: 'Дім і ремонт' },
    { id: 'digital', label: 'Диджитал' },
    { id: 'beauty', label: 'Краса і спорт' },
    { id: 'delivery', label: 'Доставка' },
    { id: 'education', label: 'Навчання' },
    { id: 'business', label: 'Бізнес' },
    { id: 'events', label: 'Свята' },
  ]

  const categoryGroups: Record<string, string[]> = {
    home: [
      'Домашній майстер',
      'Оздоблювальні роботи',
      'Будівельні роботи',
      'Меблеві роботи',
      'Клінінгові послуги',
      'Енергозбереження',
      'Побутові послуги',
      'Ремонт авто',
    ],
    digital: [
      'Digital Marketing',
      'AI послуги',
      'Реклама',
      'Дизайн',
      'Розробка сайтів',
      'Робота в інтернеті',
      'Фото і відео',
    ],
    beauty: ["Краса і здоров'я", 'Послуги тренерів', 'Послуги для тварин'],
    delivery: ["Кур'єрські послуги", 'Транспортні послуги'],
    education: ['Репетитори', 'Переклади'],
    business: ['Ділові послуги', 'Ремонт техніки'],
    events: ['Організація свят', 'Волонтерська допомога'],
  }

  const INITIAL_COUNT = 12

  let activeFilter = $state('all')
  let showAll = $state(false)

  const byFilter = $derived(
    activeFilter === 'all'
      ? homeCategories
      : homeCategories.filter((c) =>
          categoryGroups[activeFilter]?.includes(c.name),
        ),
  )

  const visible = $derived(
    showAll || activeFilter !== 'all'
      ? byFilter
      : byFilter.slice(0, INITIAL_COUNT),
  )

  const hiddenCount = $derived(byFilter.length - INITIAL_COUNT)

  $effect(() => {
    activeFilter
    showAll = false
  })
</script>

<section class="py-20" style="background-color: var(--background)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <!-- Заголовок -->
    <div class="mb-8">
      <p
        class="text-xs font-semibold uppercase tracking-widest mb-2"
        style="color: var(--primary)"
      >
        Що шукаєте?
      </p>
      <h2 class="text-3xl font-bold" style="color: var(--foreground)">
        Всі категорії послуг
      </h2>
    </div>

    <!-- Фільтри -->
    <div class="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide">
      {#each filters as filter}
        <button
          type="button"
          onclick={() => (activeFilter = filter.id)}
          class="shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border whitespace-nowrap"
          style="
            background-color: {activeFilter === filter.id
            ? 'var(--primary)'
            : 'color-mix(in oklch, var(--foreground) 5%, transparent)'};
            color: {activeFilter === filter.id
            ? 'white'
            : 'var(--muted-foreground)'};
            border-color: {activeFilter === filter.id
            ? 'var(--primary)'
            : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
          "
        >
          {filter.label}
        </button>
      {/each}
    </div>

    <!-- Лічильник -->
    <p class="text-xs mb-5" style="color: var(--muted-foreground)">
      {#if activeFilter !== 'all'}
        <span class="font-medium" style="color: var(--foreground)"
          >{byFilter.length}</span
        > категорій у цьому розділі
      {:else}
        Всього <span class="font-medium" style="color: var(--foreground)"
          >{byFilter.length}</span
        > категорій
      {/if}
    </p>

    <!-- Сітка -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {#each visible as cat}
        <a
          href="/gigs?category={encodeURIComponent(cat.name)}"
          class="group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 cursor-pointer"
          style="background-color: var(--bg-header); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
          onmouseenter={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor =
              'color-mix(in oklch, var(--primary) 40%, transparent)'
            el.style.backgroundColor =
              'color-mix(in oklch, var(--primary) 4%, var(--bg-header))'
          }}
          onmouseleave={(e) => {
            const el = e.currentTarget as HTMLElement
            el.style.borderColor =
              'color-mix(in oklch, var(--foreground) 8%, transparent)'
            el.style.backgroundColor = 'var(--bg-header)'
          }}
        >
          <!-- Іконка -->
          <div
            class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 transition-transform duration-200 group-hover:scale-110"
            style="background-color: color-mix(in oklch, var(--primary) 8%, transparent)"
          >
            {cat.icon}
          </div>

          <!-- Назва + підкатегорії -->
          <div class="flex-1 min-w-0">
            <p
              class="text-[14px] font-semibold leading-tight truncate"
              style="color: var(--foreground)"
            >
              {cat.name}
            </p>
            <p
              class="text-[11px] mt-0.5 truncate"
              style="color: var(--muted-foreground)"
            >
              {cat.subs.slice(0, 3).join(' · ')}
            </p>
          </div>

          <!-- Кількість + стрілка -->
          <div class="flex flex-col items-end gap-1 shrink-0">
            <span class="text-xs font-semibold" style="color: var(--primary)">
              {formatCount(cat.count)}
            </span>
            <ArrowRight
              class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-1 group-hover:translate-x-0"
              style="color: var(--primary)"
            />
          </div>
        </a>
      {/each}
    </div>

    <!-- Показати всі — тільки для "Всі" -->
    {#if activeFilter === 'all' && hiddenCount > 0}
      <div class="flex justify-center mt-8">
        <button
          type="button"
          onclick={() => (showAll = !showAll)}
          class="flex items-center gap-2 px-6 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer hover:opacity-80"
          style="border-color: color-mix(in oklch, var(--foreground) 12%, transparent); color: var(--foreground); background-color: color-mix(in oklch, var(--foreground) 4%, transparent)"
        >
          {showAll ? 'Сховати ↑' : `Показати ще ${hiddenCount} категорій ↓`}
        </button>
      </div>
    {/if}
  </div>
</section>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>
