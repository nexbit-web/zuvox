<!-- src/routes/(app)/services/+page.svelte -->
<script lang="ts">
  import {
    ArrowRight,
    Search,
    MapPin,
    X,
    SlidersHorizontal,
  } from 'lucide-svelte'
  import { onMount } from 'svelte'
  import { Skeleton } from '$lib/components/ui/skeleton'
  import * as Dialog from '$lib/components/ui/dialog'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { fade } from 'svelte/transition'
  import { Check, ChevronsUpDown } from 'lucide-svelte'
  import * as Command from '$lib/components/ui/command'
  import * as Popover from '$lib/components/ui/popover'
  import { cn } from '$lib/utils'
  const categories = [
    {
      name: 'Домашній майстер',
      subs: ['Сантехнік', 'Електрик', 'Чоловік на годину', 'Столяр', 'Слюсар'],
    },
    {
      name: 'Ремонт техніки',
      subs: [
        'Ремонт побутової техніки',
        "Комп'ютерна допомога",
        'Ремонт цифрової техніки',
        'Ремонт телефонів',
        'Ремонт великої техніки',
      ],
    },
    {
      name: 'Оздоблювальні роботи',
      subs: [
        'Ремонт квартир',
        'Укладання плитки',
        'Штукатурні роботи',
        'Утеплення',
        'Монтаж опалення',
      ],
    },
    {
      name: 'Будівельні роботи',
      subs: [
        'Різноробочі',
        'Зварювальні роботи',
        'Токарні роботи',
        'Металообробка',
        'Тесляр',
      ],
    },
    {
      name: 'Меблеві роботи',
      subs: [
        'Виготовлення меблів',
        'Ремонт меблів',
        'Збірка меблів',
        'Реставрація',
        'Перетяжка',
      ],
    },
    {
      name: 'Клінінгові послуги',
      subs: [
        'Прибирання квартир',
        'Генеральне прибирання',
        'Прибирання після ремонту',
        'Хімчистка',
        'Прибирання будинків',
      ],
    },
    {
      name: 'Енергозбереження',
      subs: [
        'Перепаковка акумуляторів',
        'Ремонт повербанків',
        'Ремонт UPS',
        'Підключення генераторів',
        'Обслуговування генераторів',
      ],
    },
    {
      name: 'Транспортні послуги',
      subs: [
        'Вантажні перевезення',
        'Послуги вантажників',
        'Вивіз сміття',
        'Перевезення меблів',
        'Переїзд',
      ],
    },
    {
      name: 'Побутові послуги',
      subs: ['Сад і город', 'Няні', 'Доглядальниця', 'Домробітниця', 'Швачка'],
    },
    {
      name: 'Ремонт авто',
      subs: [
        'Допомога в дорозі',
        'Діагностика',
        'Автоелектрика',
        'Кузовні роботи',
        'Двигун',
      ],
    },
    {
      name: "Кур'єрські послуги",
      subs: [
        "Кур'єрська доставка",
        'Доставка продуктів',
        'Доставка їжі',
        'Доставка ліків',
        "Кур'єр на авто",
      ],
    },
    {
      name: 'Digital Marketing',
      subs: [
        'Контекстна реклама',
        'SEO оптимізація',
        'Копірайтинг',
        'SMM',
        'Email-маркетинг',
      ],
    },
    {
      name: 'AI послуги',
      subs: [
        'Створення AI контенту',
        'AI консалтинг',
        'Розробка на базі AI',
        'Аналітика даних',
      ],
    },
    {
      name: 'Реклама',
      subs: [
        'Розміщення оголошень',
        'Роздача флаєрів',
        'Розклеювання',
        'Реклама в скриньки',
      ],
    },
    {
      name: 'Дизайн',
      subs: [
        'Розробка логотипів',
        "Дизайн інтер'єру",
        'Дизайн сайту',
        'Дизайн поліграфії',
        'Друк',
      ],
    },
    {
      name: 'Репетитори',
      subs: [
        'Викладачі з предметів',
        'Іноземні мови',
        'Написання робіт',
        'Музика',
        'Автоінструктори',
      ],
    },
    {
      name: 'Розробка сайтів',
      subs: [
        'Створення сайтів',
        'Доробка сайту',
        'Landing page',
        'Верстка',
        'Тестування QA',
      ],
    },
    {
      name: 'Робота в інтернеті',
      subs: [
        'Збір інформації',
        'Наповнення сайтів',
        'Набір тексту',
        'Введення даних',
        'Розшифровка',
      ],
    },
    {
      name: 'Фото і відео',
      subs: [
        'Фотограф',
        'Відеооператор',
        'Обробка фото',
        'Монтаж відео',
        'Оцифровка',
      ],
    },
    {
      name: 'Ділові послуги',
      subs: [
        'Бухгалтерія',
        'Юридичні послуги',
        'Ріелтор',
        'Колл-центр',
        'Фінансові послуги',
      ],
    },
    {
      name: 'Послуги для тварин',
      subs: [
        'Догляд за котами',
        'Догляд за собаками',
        'Готель для тварин',
        'Перевезення тварин',
        'Догляд за рибками',
      ],
    },
    {
      name: "Краса і здоров'я",
      subs: ['Масаж', 'Манікюр', 'Косметологія', 'Вії', 'Брови'],
    },
    {
      name: 'Організація свят',
      subs: [
        'Послуги ведучого',
        'Музичний супровід',
        'Аніматори',
        'Харчування',
        'Випічка',
      ],
    },
    {
      name: 'Переклади',
      subs: [
        'Письмові переклади',
        'Редактура',
        'Переклад документів',
        'Усні переклади',
        'Технічний переклад',
      ],
    },
    {
      name: 'Послуги тренерів',
      subs: [
        'Йога',
        'Груповий фітнес',
        'Ігрові види спорту',
        'Водні види спорту',
        'Бойові мистецтва',
      ],
    },
    {
      name: 'Волонтерська допомога',
      subs: [
        'Допомога літнім',
        'Транспортні перевезення',
        'Доставка пального',
        'Житло',
        'Доставка їжі',
      ],
    },
  ]

  const cities = [
    { value: 'all', label: 'Вся Україна' },
    { value: 'kyiv', label: 'Київ' },
    { value: 'kharkiv', label: 'Харків' },
    { value: 'odesa', label: 'Одеса' },
    { value: 'dnipro', label: 'Дніпро' },
    { value: 'zaporizhzhia', label: 'Запоріжжя' },
    { value: 'lviv', label: 'Львів' },
    { value: 'kryvyi-rih', label: 'Кривий Ріг' },
    { value: 'mykolaiv', label: 'Миколаїв' },
    { value: 'vinnytsia', label: 'Вінниця' },
    { value: 'poltava', label: 'Полтава' },
    { value: 'cherkasy', label: 'Черкаси' },
    { value: 'zhytomyr', label: 'Житомир' },
    { value: 'sumy', label: 'Суми' },
  ]

  const types = [
    { value: 'all', label: 'Всі типи' },
    { value: 'online', label: 'Онлайн' },
    { value: 'offline', label: 'Офлайн' },
    { value: 'visit', label: 'Виїзд до клієнта' },
  ]

  // Застосовані фільтри
  let search = $state('')
  let city = $state('all')
  let type = $state('all')

  // Чернетка в модалці
  let draftSearch = $state('')
  let draftCity = $state('all')
  let draftType = $state('all')

  let dialogOpen = $state(false)
  let loaded = $state(false)

  onMount(() => setTimeout(() => (loaded = true), 700))

  // При відкритті — копіюємо поточні фільтри в чернетку
  $effect(() => {
    if (dialogOpen) {
      draftSearch = search
      draftCity = city
      draftType = type
    }
  })

  function applyFilters() {
    search = draftSearch
    city = draftCity
    type = draftType
    dialogOpen = false
  }

  function resetDraft() {
    draftSearch = ''
    draftCity = 'all'
    draftType = 'all'
  }

  function resetAll() {
    search = ''
    city = 'all'
    type = 'all'
    dialogOpen = false
  }

  const activeCount = $derived(
    (search.trim() ? 1 : 0) +
      (city !== 'all' ? 1 : 0) +
      (type !== 'all' ? 1 : 0),
  )

  const cityLabel = $derived(
    cities.find((c) => c.value === city)?.label ?? 'Вся Україна',
  )
  const typeLabel = $derived(
    types.find((t) => t.value === type)?.label ?? 'Всі типи',
  )

  const filtered = $derived(
    (() => {
      const q = search.trim().toLowerCase()
      if (!q) return categories
      return categories
        .map((cat) => {
          const matchName = cat.name.toLowerCase().includes(q)
          const matchSubs = cat.subs.filter((s) => s.toLowerCase().includes(q))
          if (!matchName && !matchSubs.length) return null
          return { name: cat.name, subs: matchName ? cat.subs : matchSubs }
        })
        .filter(Boolean) as typeof categories
    })(),
  )

  let cityPopoverOpen = $state(false)
</script>

<div class="max-w-6xl mx-auto px-4 sm:px-6 py-10">
  <!-- Шапка -->
  <div class="flex items-center justify-between mb-6">
    <div>
      <h1 class="text-3xl font-bold" style="color: var(--foreground)">
        Всі послуги
      </h1>
      <p class="text-sm mt-0.5" style="color: var(--muted-foreground)">
        {filtered.length} категорій
      </p>
    </div>

    <!-- Кнопка фільтрів -->
    <button
      type="button"
      onclick={() => (dialogOpen = true)}
      class="relative flex items-center gap-2 h-9 px-4 rounded-xl border text-sm font-medium cursor-pointer transition-all hover:opacity-80"
      style="
        background-color: {activeCount > 0
        ? 'color-mix(in oklch, var(--primary) 8%, transparent)'
        : 'color-mix(in oklch, var(--foreground) 5%, transparent)'};
        border-color: {activeCount > 0
        ? 'color-mix(in oklch, var(--primary) 30%, transparent)'
        : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
        color: {activeCount > 0 ? 'var(--primary)' : 'var(--foreground)'};
      "
    >
      <SlidersHorizontal class="w-4 h-4" />
      Фільтри
      {#if activeCount > 0}
        <span
          class="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
          style="background-color: var(--primary)"
        >
          {activeCount}
        </span>
      {/if}
    </button>
  </div>

  <!-- Активні фільтри — чіпси -->
  {#if activeCount > 0}
    <div class="flex flex-wrap gap-2 mb-6" transition:fade={{ duration: 150 }}>
      {#if search.trim()}
        <span
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
          style="background-color: color-mix(in oklch, var(--primary) 8%, transparent); border-color: color-mix(in oklch, var(--primary) 20%, transparent); color: var(--primary)"
        >
          «{search}»
          <button
            type="button"
            onclick={() => (search = '')}
            class="cursor-pointer hover:opacity-70"
          >
            <X class="w-3 h-3" />
          </button>
        </span>
      {/if}
      {#if city !== 'all'}
        <span
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
          style="background-color: color-mix(in oklch, var(--primary) 8%, transparent); border-color: color-mix(in oklch, var(--primary) 20%, transparent); color: var(--primary)"
        >
          {cityLabel}
          <button
            type="button"
            onclick={() => (city = 'all')}
            class="cursor-pointer hover:opacity-70"
          >
            <X class="w-3 h-3" />
          </button>
        </span>
      {/if}
      {#if type !== 'all'}
        <span
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
          style="background-color: color-mix(in oklch, var(--primary) 8%, transparent); border-color: color-mix(in oklch, var(--primary) 20%, transparent); color: var(--primary)"
        >
          {typeLabel}
          <button
            type="button"
            onclick={() => (type = 'all')}
            class="cursor-pointer hover:opacity-70"
          >
            <X class="w-3 h-3" />
          </button>
        </span>
      {/if}
      <button
        type="button"
        onclick={resetAll}
        class="text-xs cursor-pointer hover:opacity-70 px-1"
        style="color: var(--muted-foreground)"
      >
        Скинути все
      </button>
    </div>
  {/if}

  <!-- Skeleton -->
  {#if !loaded}
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10"
    >
      {#each Array(9) as _}
        <div class="flex flex-col gap-2">
          <Skeleton class="h-5 w-40 rounded" />
          <Skeleton class="h-3.5 w-28 rounded" />
          <Skeleton class="h-3.5 w-32 rounded" />
          <Skeleton class="h-3.5 w-24 rounded" />
          <Skeleton class="h-3.5 w-36 rounded" />
          <Skeleton class="h-3.5 w-28 rounded" />
        </div>
      {/each}
    </div>
  {:else if filtered.length === 0}
    <div class="flex flex-col items-center py-24 gap-2">
      <Search
        class="w-8 h-8 mb-2"
        style="color: var(--muted-foreground); opacity: 0.3"
      />
      <p class="text-sm font-medium" style="color: var(--foreground)">
        Нічого не знайдено
      </p>
      <button
        type="button"
        onclick={resetAll}
        class="text-xs mt-1 cursor-pointer hover:opacity-70"
        style="color: var(--primary)"
      >
        Скинути фільтри
      </button>
    </div>
  {:else}
    <div
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10"
    >
      {#each filtered as cat}
        <div>
          <a
            href="/gigs?category={encodeURIComponent(cat.name)}"
            class="group inline-flex items-center gap-1 mb-3 hover:opacity-70 transition-opacity cursor-pointer"
          >
            <h2 class="text-base font-bold" style="color: var(--foreground)">
              {cat.name}
            </h2>
            <ArrowRight
              class="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
              style="color: var(--foreground)"
            />
          </a>
          <ul class="flex flex-col gap-2">
            {#each cat.subs as sub}
              <li>
                <a
                  href="/gigs?category={encodeURIComponent(
                    cat.name,
                  )}&sub={encodeURIComponent(sub)}"
                  class="text-sm transition-opacity hover:opacity-70 cursor-pointer"
                  style="color: var(--muted-foreground)"
                >
                  {sub}
                </a>
              </li>
            {/each}
          </ul>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Модальне вікно фільтрів -->
<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Фільтри</Dialog.Title>
      <Dialog.Description>Налаштуйте пошук послуг</Dialog.Description>
    </Dialog.Header>

    <div class="flex flex-col gap-5 py-2">
      <!-- Пошук -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" style="color: var(--foreground)"
          >Послуга</label
        >
        <div class="relative">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style="color: var(--muted-foreground)"
          />
          <Input
            bind:value={draftSearch}
            type="text"
            placeholder="Введіть назву послуги..."
            class="pl-9"
          />
        </div>
      </div>

      <!-- Місто -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" style="color: var(--foreground)"
          >Місто</label
        >

        <Popover.Root bind:open={cityPopoverOpen}>
          <Popover.Trigger>
            {#snippet child({ props })}
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={cityPopoverOpen}
                class="w-full justify-between font-normal"
                {...props}
              >
                {cities.find((c) => c.value === draftCity)?.label ??
                  'Оберіть місто...'}
                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            {/snippet}
          </Popover.Trigger>

          <Popover.Content class="w-full p-0">
            <Command.Root>
              <Command.Input placeholder="Пошук міста..." />
              <Command.Empty>Місто не знайдено</Command.Empty>
              <Command.Group>
                {#each cities as c}
                  <Command.Item
                    value={c.label}
                    onSelect={() => {
                      draftCity = c.value
                      cityPopoverOpen = false
                    }}
                  >
                    <Check
                      class={cn(
                        'mr-2 h-4 w-4',
                        draftCity === c.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {c.label}
                  </Command.Item>
                {/each}
              </Command.Group>
            </Command.Root>
          </Popover.Content>
        </Popover.Root>
      </div>

      <!-- Тип -->
      <div class="flex flex-col gap-1.5">
        <label class="text-sm font-medium" style="color: var(--foreground)"
          >Тип послуги</label
        >
        <div class="grid grid-cols-2 gap-2">
          {#each types as t}
            <button
              type="button"
              onclick={() => (draftType = t.value)}
              class="h-9 px-3 rounded-xl border text-sm font-medium transition-all cursor-pointer"
              style="
                background-color: {draftType === t.value
                ? 'var(--primary)'
                : 'color-mix(in oklch, var(--foreground) 5%, transparent)'};
                color: {draftType === t.value
                ? 'white'
                : 'var(--muted-foreground)'};
                border-color: {draftType === t.value
                ? 'var(--primary)'
                : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
              "
            >
              {t.label}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <Dialog.Footer class="flex flex-col-reverse sm:flex-row gap-2 pt-2">
      <Button variant="ghost" onclick={resetDraft} class="w-full sm:w-auto">
        Скинути
      </Button>
      <Button onclick={applyFilters} class="w-full sm:w-auto">
        Застосувати
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
