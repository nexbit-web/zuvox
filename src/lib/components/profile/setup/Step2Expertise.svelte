<!-- src/lib/components/profile/setup/Step2Expertise.svelte -->
<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import * as Field from '$lib/components/ui/field'
  import { Check, Plus, LoaderCircle } from 'lucide-svelte'
  import {
    languageOptions,
    LIMITS,
    type WorkFormat,
    type CategoryFromApi,
    type SkillFromApi,
    type SubcategoryFromApi,
  } from './types'

  let {
    // Тепер ОДНА категорія (slug) і ОДНА підкатегорія (slug)
    selectedCategory = $bindable<string | null>(),
    selectedSubcategory = $bindable<string | null>(),
    selectedSkills = $bindable<string[]>(),
    selectedLanguages = $bindable<string[]>(),
    hourlyRate = $bindable(),

    categories,
    categoriesLoaded,
    workFormats,
  } = $props<{
    selectedCategory: string | null
    selectedSubcategory: string | null
    selectedSkills: string[]
    selectedLanguages: string[]
    hourlyRate: string
    categories: CategoryFromApi[]
    categoriesLoaded: boolean
    workFormats: WorkFormat[]
  }>()

  // ────────── derived ──────────

  const isFullyOnline = $derived(
    workFormats.length === 1 && workFormats[0] === 'ONLINE',
  )

  // Фільтр категорій за domain.
  const filteredCategories = $derived.by(() => {
    if (workFormats.length === 0) return categories

    const hasOnline = workFormats.includes('ONLINE')
    const hasOffline =
      workFormats.includes('OFFLINE') || workFormats.includes('VISIT')

    return categories.filter((c: CategoryFromApi) => {
      const domain = c.domain ?? 'BOTH'
      if (domain === 'BOTH') return true
      if (domain === 'ONLINE_ONLY' && hasOnline) return true
      if (domain === 'OFFLINE_ONLY' && hasOffline) return true
      return false
    })
  })

  // Поточна обрана категорія (повний обʼєкт)
  const selectedCategoryObj: CategoryFromApi | null = $derived(
    selectedCategory
      ? (categories.find((c: CategoryFromApi) => c.slug === selectedCategory) ??
          null)
      : null,
  )

  // Підкатегорії обраної категорії
  const availableSubs: SubcategoryFromApi[] = $derived(
    selectedCategoryObj?.subs ?? [],
  )

  // Навики з обраної категорії
  const availableSkills: SkillFromApi[] = $derived(
    selectedCategoryObj?.skills ?? [],
  )

  // ────────── автоочищення при зміні форматів ──────────
  $effect(() => {
    if (!categoriesLoaded || workFormats.length === 0) return

    const validSlugs = new Set(
      filteredCategories.map((c: CategoryFromApi) => c.slug),
    )

    // Якщо обрана категорія більше не підходить — скидаємо її і все що нижче
    if (selectedCategory && !validSlugs.has(selectedCategory)) {
      selectedCategory = null
      selectedSubcategory = null
      selectedSkills = []
    }
  })

  // При зміні категорії — чистимо підкатегорію та невалідні навики
  $effect(() => {
    if (!selectedCategoryObj) {
      if (selectedSubcategory !== null) selectedSubcategory = null
      if (selectedSkills.length > 0) selectedSkills = []
      return
    }

    // Перевіряємо що підкатегорія належить категорії
    if (
      selectedSubcategory &&
      !selectedCategoryObj.subs.some((s) => s.slug === selectedSubcategory)
    ) {
      selectedSubcategory = null
    }

    // Чистимо навики яких немає у новій категорії
    const validSkillSlugs = new Set(
      selectedCategoryObj.skills.map((s) => s.slug),
    )
    const cleanedSkills = selectedSkills.filter((slug: string) =>
      validSkillSlugs.has(slug),
    )
    if (cleanedSkills.length !== selectedSkills.length) {
      selectedSkills = cleanedSkills
    }
  })

  // ────────── actions ──────────
  function selectCategory(slug: string) {
    if (selectedCategory === slug) {
      // Повторний клік — знімаємо вибір
      selectedCategory = null
    } else {
      selectedCategory = slug
    }
  }

  function selectSubcategory(slug: string) {
    if (selectedSubcategory === slug) {
      selectedSubcategory = null
    } else {
      selectedSubcategory = slug
    }
  }

  function toggleSkill(slug: string) {
    if (selectedSkills.includes(slug)) {
      selectedSkills = selectedSkills.filter((x: string) => x !== slug)
    } else {
      if (selectedSkills.length >= LIMITS.SKILLS_MAX) return
      selectedSkills = [...selectedSkills, slug]
    }
  }

  function toggleLanguage(l: string) {
    if (selectedLanguages.includes(l)) {
      selectedLanguages = selectedLanguages.filter((x: string) => x !== l)
    } else {
      selectedLanguages = [...selectedLanguages, l]
    }
  }
</script>

<header class="mb-10">
  <p
    class="text-xs uppercase tracking-[0.14em] font-medium mb-4"
    style="color: var(--primary)"
  >
    Крок 2 — Експертиза
  </p>
  <h1
    class="text-[32px] md:text-[44px] font-semibold tracking-tight leading-[1.1] mb-3"
    style="color: var(--foreground)"
  >
    Ваша спеціалізація
  </h1>
  <p class="text-base" style="color: var(--muted-foreground)">
    Категорія, підкатегорія, навички, мови та ставка.
  </p>
</header>

<Field.Group class="gap-8">
  <!-- ─── КАТЕГОРІЯ (одна) ─── -->
  <Field.Field>
    <div class="flex items-center justify-between mb-2">
      <Field.Label>Категорія</Field.Label>
      <span class="text-xs tabular-nums" style="color: var(--muted-foreground)">
        {selectedCategory ? 1 : 0} / 1
      </span>
    </div>

    {#if workFormats.length > 0 && workFormats.length < 3}
      <p class="text-xs mb-3" style="color: var(--muted-foreground)">
        Показано {filteredCategories.length} категорій під ваш формат роботи.
        {#if isFullyOnline}
          Для офлайн-послуг увімкніть «У мене» чи «Виїзд» на кроці 1.
        {/if}
      </p>
    {/if}

    {#if !categoriesLoaded}
      <div
        class="flex items-center gap-2 py-6 text-sm"
        style="color: var(--muted-foreground)"
      >
        <LoaderCircle class="size-4 animate-spin" />
        Завантаження категорій…
      </div>
    {:else if filteredCategories.length === 0}
      <p class="text-xs py-3" style="color: var(--muted-foreground)">
        Немає категорій для обраних форматів.
      </p>
    {:else}
      <div class="flex flex-wrap gap-2">
        {#each filteredCategories as cat (cat.slug)}
          {@const active = selectedCategory === cat.slug}
          <button
            type="button"
            onclick={() => selectCategory(cat.slug)}
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all cursor-pointer"
            style="background-color: {active
              ? 'var(--foreground)'
              : 'var(--card)'};
                   border-color: {active
              ? 'var(--foreground)'
              : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
                   color: {active ? 'var(--background)' : 'var(--foreground)'}"
          >
            {#if active}
              <Check class="size-3.5" />
            {:else}
              <Plus class="size-3.5 opacity-60" />
            {/if}
            {cat.name}
          </button>
        {/each}
      </div>
    {/if}

    <Field.Description>
      Оберіть одну основну категорію вашої спеціалізації.
    </Field.Description>
  </Field.Field>

  <!-- ─── ПІДКАТЕГОРІЯ (одна, після категорії) ─── -->
  {#if selectedCategoryObj && availableSubs.length > 0}
    <Field.Field>
      <div class="flex items-center justify-between mb-2">
        <Field.Label>Підкатегорія</Field.Label>
        <span
          class="text-xs tabular-nums"
          style="color: var(--muted-foreground)"
        >
          {selectedSubcategory ? 1 : 0} / 1
        </span>
      </div>

      <div class="flex flex-wrap gap-1.5">
        {#each availableSubs as sub (sub.slug)}
          {@const active = selectedSubcategory === sub.slug}
          <button
            type="button"
            onclick={() => selectSubcategory(sub.slug)}
            class="text-xs px-3 py-2 rounded-xl border transition-all cursor-pointer"
            style="background-color: {active
              ? 'var(--foreground)'
              : 'transparent'};
                   border-color: {active
              ? 'var(--foreground)'
              : 'color-mix(in oklch, var(--foreground) 14%, transparent)'};
                   color: {active ? 'var(--background)' : 'var(--foreground)'}"
          >
            {sub.name}
          </button>
        {/each}
      </div>

      <Field.Description>
        Конкретний напрямок у обраній категорії.
      </Field.Description>
    </Field.Field>
  {/if}

  <!-- ─── НАВИКИ (до 20) ─── -->
  {#if categoriesLoaded && selectedCategoryObj}
    <Field.Field>
      <div class="flex items-center justify-between mb-2">
        <Field.Label>Навички</Field.Label>
        <span
          class="text-xs tabular-nums"
          style="color: var(--muted-foreground)"
        >
          {selectedSkills.length} / {LIMITS.SKILLS_MAX}
        </span>
      </div>

      {#if availableSkills.length === 0}
        <div class="text-xs py-3" style="color: var(--muted-foreground)">
          Для обраної категорії ще не додано навичок.
        </div>
      {:else}
        <div class="flex flex-wrap gap-1.5">
          {#each availableSkills as skill (skill.slug)}
            {@const active = selectedSkills.includes(skill.slug)}
            {@const disabled =
              !active && selectedSkills.length >= LIMITS.SKILLS_MAX}
            <button
              type="button"
              {disabled}
              onclick={() => toggleSkill(skill.slug)}
              class="text-xs px-3 py-1.5 rounded-xl border transition-all"
              class:cursor-pointer={!disabled}
              class:opacity-40={disabled}
              style="background-color: {active
                ? 'var(--foreground)'
                : 'transparent'};
                     border-color: {active
                ? 'var(--foreground)'
                : 'color-mix(in oklch, var(--foreground) 14%, transparent)'};
                     color: {active
                ? 'var(--background)'
                : 'var(--muted-foreground)'}"
            >
              {skill.name}
            </button>
          {/each}
        </div>
        <Field.Description>
          Оберіть до {LIMITS.SKILLS_MAX} навичок з обраної категорії.
        </Field.Description>
      {/if}
    </Field.Field>
  {/if}

  <!-- ─── МОВИ ─── -->
  <Field.Field>
    <Field.Label>Мови спілкування</Field.Label>
    <div class="flex flex-wrap gap-1.5">
      {#each languageOptions as lang (lang)}
        {@const active = selectedLanguages.includes(lang)}
        <button
          type="button"
          onclick={() => toggleLanguage(lang)}
          class="text-xs px-3 py-1.5 rounded-xl border transition-all cursor-pointer"
          style="background-color: {active
            ? 'var(--foreground)'
            : 'transparent'};
                 border-color: {active
            ? 'var(--foreground)'
            : 'color-mix(in oklch, var(--foreground) 14%, transparent)'};
                 color: {active
            ? 'var(--background)'
            : 'var(--muted-foreground)'}"
        >
          {lang}
        </button>
      {/each}
    </div>
  </Field.Field>

  <!-- ─── СТАВКА ─── -->
  <Field.Field>
    <Field.Label for="rate">
      {isFullyOnline
        ? 'Мінімальна ставка за годину'
        : 'Орієнтовна ставка за годину'}
    </Field.Label>
    <div class="relative">
      <Input
        id="rate"
        type="number"
        min="0"
        placeholder="500"
        bind:value={hourlyRate}
        class="h-11 pr-20 tabular-nums"
      />
      <span
        class="absolute right-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none"
        style="color: var(--muted-foreground)"
      >
        грн/год
      </span>
    </div>
    <Field.Description>
      Конкретні ціни ви додасте при створенні послуг.
    </Field.Description>
  </Field.Field>
</Field.Group>
