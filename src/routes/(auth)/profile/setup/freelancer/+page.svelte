<!-- src/routes/(auth)/profile/setup/freelancer/+page.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import * as Field from '$lib/components/ui/field'
  import * as Select from '$lib/components/ui/select'
  import { goto, invalidateAll } from '$app/navigation'
  import { onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import ProfilePreviewCard from '$lib/components/profile-preview-card.svelte'
  import AvatarUploader from '$lib/components/avatar-uploader.svelte'
  import PortfolioUploader from '$lib/components/portfolio-uploader.svelte'
  import UsernameInput from '$lib/components/username-input.svelte'
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    X,
    Plus,
    LoaderCircle,
    Globe,
    Home,
    MapPin,
    Map,
  } from 'lucide-svelte'
  import { Spinner } from '$lib/components/ui/spinner/index.js'

  // ═══════════════════════════════════════════════════════════
  // Types
  // ═══════════════════════════════════════════════════════════

  type CategoryDomain = 'ONLINE_ONLY' | 'OFFLINE_ONLY' | 'BOTH'
  type WorkFormat = 'ONLINE' | 'OFFLINE' | 'VISIT'
  type GeographyMode = 'ONE_CITY' | 'MULTI_CITY' | 'ALL_UKRAINE'

  interface PortfolioItem {
    url: string
    publicId: string
  }
  interface ServiceFromApi {
    slug: string
    name: string
    avgPriceCents: number | null
  }
  interface SubcategoryFromApi {
    slug: string
    name: string
    items: ServiceFromApi[]
  }
  interface SkillFromApi {
    slug: string
    name: string
  }
  interface CategoryFromApi {
    slug: string
    name: string
    icon?: string | null
    description?: string | null
    domain?: CategoryDomain
    subs: SubcategoryFromApi[]
    skills: SkillFromApi[]
  }
  interface CityFromApi {
    slug: string
    name: string
    region: string | null
    isCapital: boolean
  }

  let { data } = $props<{
    data: {
      prefill: {
        name: string
        username: string
        phone: string
        city: string
        bio: string
        avatar: string
        portfolio: PortfolioItem[]
        verificationStatus: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'
        isExistingFreelancer: boolean
        categories: string[]
        skills: string[]
        experience: string
        languages: string[]
        hourlyRate: string
        portfolioUrl: string

        // ─── НОВЕ (опційно з беку) ───
        worksOnline?: boolean
        worksOffline?: boolean
        worksOnSite?: boolean
        serviceCities?: string[]
        willTravel?: boolean
        travelRadiusKm?: string
      }
    }
  }>()

  // ═══════════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════════

  let step = $state(1)
  const totalSteps = 3

  let avatar = $state(data.prefill.avatar)
  let name = $state(data.prefill.name ?? '')
  let username = $state(data.prefill.username)
  let usernameValid = $state(!!data.prefill.username)
  let phone = $state(data.prefill.phone)
  let city = $state(data.prefill.city)
  let experience = $state(data.prefill.experience)

  // ─── НОВЕ: формат роботи (можна обрати кілька) ───
  let workFormats = $state<WorkFormat[]>(
    [
      data.prefill.worksOnline ? 'ONLINE' : null,
      data.prefill.worksOffline ? 'OFFLINE' : null,
      data.prefill.worksOnSite ? 'VISIT' : null,
    ].filter(Boolean) as WorkFormat[],
  )

  // Якщо у prefill нічого немає — по дефолту тільки онлайн
  if (workFormats.length === 0) workFormats = ['ONLINE']

  // ─── НОВЕ: режим географії ───
  let geographyMode = $state<GeographyMode>(
    data.prefill.serviceCities && data.prefill.serviceCities.length > 1
      ? 'MULTI_CITY'
      : data.prefill.serviceCities?.[0] === 'all-ukraine'
        ? 'ALL_UKRAINE'
        : 'ONE_CITY',
  )
  let serviceCities: string[] = $state(
    (data.prefill.serviceCities ?? []).filter(
      (c: string) => c !== 'all-ukraine',
    ),
  )
  let travelRadiusKm = $state(data.prefill.travelRadiusKm ?? '')

  let selectedCategories = $state<string[]>([...data.prefill.categories])
  let selectedSkills = $state<string[]>([...data.prefill.skills])
  let selectedLanguages = $state<string[]>(
    data.prefill.languages.length
      ? [...data.prefill.languages]
      : ['Українська'],
  )
  let hourlyRate = $state(data.prefill.hourlyRate)

  let bio = $state(data.prefill.bio)
  let portfolioUrl = $state(data.prefill.portfolioUrl)
  let portfolio = $state<PortfolioItem[]>(data.prefill.portfolio)

  let loading = $state(false)
  let error = $state('')

  // ═══════════════════════════════════════════════════════════
  // API data
  // ═══════════════════════════════════════════════════════════

  let categories = $state<CategoryFromApi[]>([])
  let citiesList = $state<CityFromApi[]>([])
  let categoriesLoaded = $state(false)
  let citiesLoaded = $state(false)
  let dataError = $state<string | null>(null)

  // City search (для multi-city)
  let citySearchQuery = $state('')

  async function loadInitialData() {
    categoriesLoaded = false
    citiesLoaded = false
    dataError = null

    try {
      const [catsRes, citiesRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/cities'),
      ])

      if (!catsRes.ok) throw new Error(`categories HTTP ${catsRes.status}`)
      if (!citiesRes.ok) throw new Error(`cities HTTP ${citiesRes.status}`)

      const catsData = await catsRes.json()
      const citiesData = await citiesRes.json()

      categories = catsData.categories ?? []
      citiesList = (citiesData.cities ?? []).filter(
        (c: CityFromApi) => c.slug !== 'all',
      )
    } catch (err) {
      console.error('Failed to load data:', err)
      dataError = 'Не вдалося завантажити дані. Перезавантажте сторінку.'
    } finally {
      categoriesLoaded = true
      citiesLoaded = true
    }
  }

  onMount(() => {
    loadInitialData()
  })

  // ═══════════════════════════════════════════════════════════
  // Options
  // ═══════════════════════════════════════════════════════════

  const experienceOptions = [
    { value: 'LT_1', label: 'Початківець', hint: 'менше 1 року' },
    { value: '1_2', label: 'Середній', hint: '1–2 роки' },
    { value: '3_5', label: 'Досвідчений', hint: '3–5 років' },
    { value: '5_10', label: 'Експерт', hint: '5–10 років' },
    { value: '10_PLUS', label: 'Майстер', hint: '10+ років' },
  ]

  const languageOptions = [
    'Українська',
    'English',
    'Polski',
    'Русский',
    'Deutsch',
    'Français',
    'Español',
  ]

  const workFormatOptions: Array<{
    value: WorkFormat
    label: string
    hint: string
    icon: typeof Globe
  }> = [
    {
      value: 'ONLINE',
      label: 'Онлайн',
      hint: 'Дистанційно: логотипи, розробка, тексти',
      icon: Globe,
    },
    {
      value: 'OFFLINE',
      label: 'У мене (офіс/салон)',
      hint: 'Клієнт приходить до мене: стрижка, манікюр',
      icon: Home,
    },
    {
      value: 'VISIT',
      label: 'Виїзд до клієнта',
      hint: 'Я їжджу до клієнта: сантехнік, електрик',
      icon: MapPin,
    },
  ]

  const geographyOptions: Array<{
    value: GeographyMode
    label: string
    hint: string
    icon: typeof MapPin
  }> = [
    {
      value: 'ONE_CITY',
      label: 'Одне місто',
      hint: 'Працюю тільки у своєму місті',
      icon: MapPin,
    },
    {
      value: 'MULTI_CITY',
      label: 'Кілька міст',
      hint: 'Готовий працювати у кількох містах',
      icon: Map,
    },
    {
      value: 'ALL_UKRAINE',
      label: 'Вся Україна',
      hint: 'Працюю по всій країні',
      icon: Globe,
    },
  ]

  // ═══════════════════════════════════════════════════════════
  // Derived
  // ═══════════════════════════════════════════════════════════

  const needsLocation = $derived(
    workFormats.includes('OFFLINE') || workFormats.includes('VISIT'),
  )

  const isFullyOnline = $derived(
    workFormats.length === 1 && workFormats[0] === 'ONLINE',
  )

  // Якщо ВСІ формати — онлайн, географія не потрібна
  const showGeography = $derived(needsLocation)

  // Фільтруємо категорії за обраними форматами
  // ONLINE → показуємо ONLINE_ONLY + BOTH
  // OFFLINE/VISIT → показуємо OFFLINE_ONLY + BOTH
  const filteredCategories = $derived.by(() => {
    if (workFormats.length === 0) return categories

    const hasOnline = workFormats.includes('ONLINE')
    const hasOffline =
      workFormats.includes('OFFLINE') || workFormats.includes('VISIT')

    return categories.filter((c) => {
      const domain = c.domain ?? 'BOTH'
      if (domain === 'BOTH') return true
      if (domain === 'ONLINE_ONLY' && hasOnline) return true
      if (domain === 'OFFLINE_ONLY' && hasOffline) return true
      return false
    })
  })

  // Усі унікальні навички з обраних категорій
  // Усі унікальні навички з обраних категорій
  const availableSkills: SkillFromApi[] = $derived.by(() => {
    const seen = new Set<string>()
    const result: SkillFromApi[] = []
    for (const c of categories) {
      if (!selectedCategories.includes(c.name)) continue
      for (const s of c.skills) {
        if (seen.has(s.slug)) continue
        seen.add(s.slug)
        result.push(s)
      }
    }
    return result
  })

  // Cities — фільтр по пошуку
  const filteredCitiesList = $derived.by(() => {
    const q = citySearchQuery.trim().toLowerCase()
    if (!q) return citiesList
    return citiesList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.region?.toLowerCase().includes(q),
    )
  })

  // Очищуємо категорії що більше не підходять при зміні форматів
  $effect(() => {
    if (!categoriesLoaded || workFormats.length === 0) return
    const validNames = new Set(filteredCategories.map((c) => c.name))
    const filtered = selectedCategories.filter((n) => validNames.has(n))
    if (filtered.length !== selectedCategories.length) {
      selectedCategories = filtered
    }
  })

  // ─── Validation ───
  const step1Valid = $derived(
    !!name.trim() &&
      name.trim().length >= 2 &&
      !!phone.trim() &&
      !!city &&
      !!experience &&
      usernameValid &&
      workFormats.length > 0 &&
      (!showGeography ||
        geographyMode === 'ALL_UKRAINE' ||
        (geographyMode === 'ONE_CITY' && !!city) ||
        (geographyMode === 'MULTI_CITY' && serviceCities.length > 0)),
  )

  const step2Valid = $derived(
    selectedCategories.length > 0 &&
      selectedSkills.length > 0 &&
      selectedLanguages.length > 0 &&
      !!hourlyRate &&
      Number(hourlyRate) > 0,
  )

  const step3Valid = $derived(bio.trim().length >= 40)

  const canNext = $derived(
    step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid,
  )

  const previewRate = $derived(
    hourlyRate && Number(hourlyRate) > 0 ? Number(hourlyRate) : null,
  )
  const previewExpHint = $derived(
    experienceOptions.find((e) => e.value === experience)?.hint ?? '',
  )
  const previewCategories = $derived(selectedCategories.slice(0, 3))

  const isEdit = $derived(data.prefill.isExistingFreelancer)

  // ═══════════════════════════════════════════════════════════
  // Actions
  // ═══════════════════════════════════════════════════════════

  function toggleWorkFormat(format: WorkFormat) {
    if (workFormats.includes(format)) {
      if (workFormats.length === 1) return // мінімум один має бути
      workFormats = workFormats.filter((f) => f !== format)
    } else {
      workFormats = [...workFormats, format]
    }
  }

  function setGeographyMode(mode: GeographyMode) {
    geographyMode = mode
    if (mode === 'ONE_CITY') {
      serviceCities = []
    } else if (mode === 'ALL_UKRAINE') {
      serviceCities = []
    }
  }

  function toggleServiceCity(cityName: string) {
    if (serviceCities.includes(cityName)) {
      serviceCities = serviceCities.filter((c) => c !== cityName)
    } else {
      if (serviceCities.length >= 20) return
      serviceCities = [...serviceCities, cityName]
    }
  }

  function removeServiceCity(cityName: string) {
    serviceCities = serviceCities.filter((c) => c !== cityName)
  }

  function toggleCategory(catName: string) {
    if (selectedCategories.includes(catName)) {
      selectedCategories = selectedCategories.filter((c) => c !== catName)
      const remainingSlugs = new Set(
        categories
          .filter((c) => selectedCategories.includes(c.name))
          .flatMap((c) => c.skills.map((s) => s.slug)),
      )
      selectedSkills = selectedSkills.filter((slug) => remainingSlugs.has(slug))
    } else {
      if (selectedCategories.length >= 3) return
      selectedCategories = [...selectedCategories, catName]
    }
  }

  function toggleSkill(slug: string) {
    if (selectedSkills.includes(slug)) {
      selectedSkills = selectedSkills.filter((x) => x !== slug)
    } else {
      if (selectedSkills.length >= 10) return
      selectedSkills = [...selectedSkills, slug]
    }
  }

  function toggleLanguage(l: string) {
    if (selectedLanguages.includes(l)) {
      selectedLanguages = selectedLanguages.filter((x) => x !== l)
    } else {
      selectedLanguages = [...selectedLanguages, l]
    }
  }

  function next() {
    error = ''
    if (!canNext) return
    if (step < totalSteps) step += 1
    else submit()
  }

  function back() {
    error = ''
    if (step > 1) step -= 1
  }

  function leaveSetup() {
    goto('/dashboard')
  }

  async function submit() {
    error = ''
    loading = true
    try {
      // Готуємо географію
      let finalServiceCities: string[]
      if (geographyMode === 'ALL_UKRAINE') {
        finalServiceCities = ['all-ukraine']
      } else if (geographyMode === 'MULTI_CITY') {
        finalServiceCities = serviceCities
      } else {
        finalServiceCities = []
      }

      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'FREELANCER',
          name: name.trim(),
          username,
          phone,
          city,
          bio,
          portfolioUrl,
          experience,
          categories: selectedCategories,
          skills: selectedSkills,
          languages: selectedLanguages,
          hourlyRate: Number(hourlyRate),

          // ─── НОВЕ ───
          worksOnline: workFormats.includes('ONLINE'),
          worksOffline: workFormats.includes('OFFLINE'),
          worksOnSite: workFormats.includes('VISIT'),
          serviceCities: finalServiceCities,
          willTravel: workFormats.includes('VISIT'),
          travelRadiusKm: travelRadiusKm ? Number(travelRadiusKm) : null,

          submitForReview: true,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (errData.field === 'username') {
          error =
            errData.error === 'Username already taken'
              ? 'Цей нікнейм уже зайнято — оберіть інший на кроці 1'
              : 'Невірний нікнейм. Перевірте на кроці 1'
          step = 1
        } else {
          error = errData.error ?? 'Помилка збереження. Спробуйте ще раз.'
        }
        return
      }

      await invalidateAll()
      goto('/dashboard')
    } catch {
      error = 'Немає зʼєднання з сервером'
    } finally {
      loading = false
    }
  }

  const selectedCityLabel = $derived(city || 'Оберіть місто')
  const firstInitial = $derived(name?.charAt(0).toUpperCase() || '?')
</script>

<div
  class="min-h-screen px-4 pt-6 pb-28 md:py-14"
  style="background-color: var(--background)"
>
  <div class="max-w-6xl mx-auto">
    <!-- ───── HEADER ───── -->
    <div class="flex items-center justify-between mb-10">
      <button
        type="button"
        onclick={leaveSetup}
        class="inline-flex items-center gap-2 text-sm cursor-pointer transition-opacity hover:opacity-60"
        style="color: var(--muted-foreground)"
      >
        <X class="size-4" />
        {isEdit ? 'Скасувати' : 'Пропустити'}
      </button>

      <span class="text-xs tabular-nums" style="color: var(--muted-foreground)">
        {step} / {totalSteps}
      </span>
    </div>

    <!-- ───── PROGRESS ───── -->
    <div class="flex gap-1.5 mb-14 max-w-md mx-auto">
      {#each Array(totalSteps) as _, i}
        <div
          class="h-[3px] flex-1 rounded-xl transition-all duration-500"
          style="background-color: {i < step
            ? 'var(--primary)'
            : 'color-mix(in oklch, var(--foreground) 8%, transparent)'}"
        ></div>
      {/each}
    </div>

    {#if dataError}
      <div
        class="mb-8 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-3"
        style="background-color: color-mix(in oklch, var(--destructive) 10%, transparent);
               color: var(--destructive)"
      >
        <span>{dataError}</span>
        <button
          type="button"
          onclick={loadInitialData}
          class="text-xs font-medium underline cursor-pointer"
        >
          Спробувати ще
        </button>
      </div>
    {/if}

    <div
      class="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-12 lg:gap-16 items-start"
    >
      <!-- ═══════ FORM COLUMN ═══════ -->
      <div>
        {#key step}
          <div in:fly={{ y: 6, duration: 200 }}>
            <!-- ═══════════════════════════════════════════════════ -->
            <!-- STEP 1 — Основне -->
            <!-- ═══════════════════════════════════════════════════ -->
            {#if step === 1}
              <header class="mb-10">
                <p
                  class="text-xs uppercase tracking-[0.14em] font-medium mb-4"
                  style="color: var(--primary)"
                >
                  Крок 1 — Основне
                </p>
                <h1
                  class="text-[32px] md:text-[44px] font-semibold tracking-tight leading-[1.1] mb-3"
                  style="color: var(--foreground)"
                >
                  {isEdit ? 'Редагуйте свій профіль' : 'Розкажіть про себе'}
                </h1>
                <p class="text-base" style="color: var(--muted-foreground)">
                  Контакти, формат роботи та географія.
                </p>
              </header>

              <!-- ─── USERNAME ─── -->
              <div
                class="mb-6 p-5 rounded-xl border"
                style="background-color: var(--card); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
              >
                <div class="mb-3">
                  <p
                    class="text-sm font-medium"
                    style="color: var(--foreground)"
                  >
                    Нікнейм на платформі
                  </p>
                  <p
                    class="text-xs mt-0.5"
                    style="color: var(--muted-foreground)"
                  >
                    Унікальне імʼя. Використовується у посиланні: /@nickname
                  </p>
                </div>
                <UsernameInput
                  bind:value={username}
                  onvalidchange={(v) => (usernameValid = v !== null)}
                />
              </div>

              <!-- ─── AVATAR ─── -->
              <div
                class="flex items-center gap-5 mb-10 p-5 rounded-xl border"
                style="background-color: var(--card); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
              >
                <AvatarUploader
                  bind:value={avatar}
                  fallback={firstInitial}
                  variant="circle"
                  size="lg"
                />
                <div class="flex-1 min-w-0">
                  <p
                    class="text-sm font-medium"
                    style="color: var(--foreground)"
                  >
                    Фото профілю
                  </p>
                  <p
                    class="text-xs mt-1 leading-relaxed"
                    style="color: var(--muted-foreground)"
                  >
                    Клікніть на коло щоб завантажити.
                  </p>
                </div>
              </div>

              <Field.Group class="gap-7">
                <!-- ─── НАЗВА ─── -->
                <Field.Field>
                  <Field.Label for="name">Імʼя</Field.Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Іван Петренко"
                    bind:value={name}
                    maxlength={80}
                    class="h-11"
                  />
                  <Field.Description>
                    Це імʼя побачать клієнти у вашій картці.
                  </Field.Description>
                </Field.Field>

                <!-- ─── PHONE ─── -->
                <Field.Field>
                  <Field.Label for="phone">Телефон</Field.Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+38 (0__) ___-__-__"
                    bind:value={phone}
                    class="h-11"
                  />
                  {#if data.prefill.phone}
                    <Field.Description>
                      Заповнено автоматично з реєстрації.
                    </Field.Description>
                  {/if}
                </Field.Field>

                <!-- ─── CITY (основне місто) ─── -->
                <Field.Field>
                  <Field.Label for="city">Ваше місто</Field.Label>
                  <Select.Root
                    type="single"
                    bind:value={city}
                    disabled={!citiesLoaded}
                  >
                    <Select.Trigger class="h-11 w-full">
                      {#if !citiesLoaded}
                        <span
                          class="inline-flex items-center gap-2"
                          style="color: var(--muted-foreground)"
                        >
                          <LoaderCircle class="size-4 animate-spin" />
                          Завантаження міст…
                        </span>
                      {:else}
                        {selectedCityLabel}
                      {/if}
                    </Select.Trigger>
                    <Select.Content class="max-h-72 overflow-y-auto">
                      {#each citiesList as c (c.slug)}
                        <Select.Item value={c.name}>{c.name}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </Field.Field>

                <!-- ═══════════════════════════════════════════════ -->
                <!-- ─── НОВЕ: Формат роботи ─── -->
                <!-- ═══════════════════════════════════════════════ -->
                <Field.Field>
                  <Field.Label>Як ви працюєте?</Field.Label>
                  <Field.Description>
                    Можна обрати кілька варіантів — наприклад, онлайн + виїзд.
                  </Field.Description>

                  <div class="grid grid-cols-1 gap-2 mt-2">
                    {#each workFormatOptions as opt (opt.value)}
                      {@const active = workFormats.includes(opt.value)}
                      {@const Icon = opt.icon}
                      <button
                        type="button"
                        onclick={() => toggleWorkFormat(opt.value)}
                        class="flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-all cursor-pointer"
                        style="background-color: {active
                          ? 'var(--foreground)'
                          : 'var(--card)'};
                               border-color: {active
                          ? 'var(--foreground)'
                          : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
                               color: {active
                          ? 'var(--background)'
                          : 'var(--foreground)'}"
                      >
                        <div
                          class="size-9 rounded-lg flex items-center justify-center shrink-0"
                          style="background-color: {active
                            ? 'color-mix(in oklch, var(--background) 18%, transparent)'
                            : 'color-mix(in oklch, var(--foreground) 6%, transparent)'}"
                        >
                          <Icon class="size-4" strokeWidth={2} />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium">{opt.label}</div>
                          <div
                            class="text-xs mt-0.5 leading-snug"
                            style="color: {active
                              ? 'color-mix(in oklch, var(--background) 70%, var(--foreground))'
                              : 'var(--muted-foreground)'}"
                          >
                            {opt.hint}
                          </div>
                        </div>
                        {#if active}
                          <Check class="size-4 mt-0.5 shrink-0" />
                        {/if}
                      </button>
                    {/each}
                  </div>
                </Field.Field>

                <!-- ═══════════════════════════════════════════════ -->
                <!-- ─── Географія (тільки якщо є OFFLINE/VISIT) ─── -->
                <!-- ═══════════════════════════════════════════════ -->
                {#if showGeography}
                  <Field.Field>
                    <Field.Label>Де ви працюєте?</Field.Label>
                    <Field.Description>
                      Регіон обслуговування. Клієнти у цих місцях побачать вас у
                      пошуку.
                    </Field.Description>

                    <!-- Mode picker -->
                    <div class="grid grid-cols-3 gap-2 mt-2 mb-3">
                      {#each geographyOptions as opt (opt.value)}
                        {@const active = geographyMode === opt.value}
                        {@const Icon = opt.icon}
                        <button
                          type="button"
                          onclick={() => setGeographyMode(opt.value)}
                          class="flex flex-col items-center text-center px-3 py-3 rounded-xl border transition-all cursor-pointer gap-1.5"
                          style="background-color: {active
                            ? 'var(--foreground)'
                            : 'var(--card)'};
                                 border-color: {active
                            ? 'var(--foreground)'
                            : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
                                 color: {active
                            ? 'var(--background)'
                            : 'var(--foreground)'}"
                        >
                          <Icon class="size-4" strokeWidth={2} />
                          <span class="text-xs font-medium leading-tight">
                            {opt.label}
                          </span>
                        </button>
                      {/each}
                    </div>

                    <!-- Mode hint -->
                    <p
                      class="text-xs mb-3"
                      style="color: var(--muted-foreground)"
                    >
                      {geographyOptions.find((o) => o.value === geographyMode)
                        ?.hint}
                    </p>

                    <!-- ONE_CITY: тільки нагадування -->
                    {#if geographyMode === 'ONE_CITY'}
                      <div
                        class="p-3.5 rounded-xl text-xs leading-relaxed"
                        style="background-color: color-mix(in oklch, var(--primary) 6%, transparent);
                               color: var(--muted-foreground)"
                      >
                        <strong style="color: var(--foreground)">
                          {city || '— оберіть місто вище —'}
                        </strong>
                        <br />
                        Клієнти з цього міста будуть бачити вас у пошуку.
                      </div>

                      <!-- ALL_UKRAINE: тільки нагадування -->
                    {:else if geographyMode === 'ALL_UKRAINE'}
                      <div
                        class="p-3.5 rounded-xl text-xs leading-relaxed"
                        style="background-color: color-mix(in oklch, var(--primary) 6%, transparent);
                               color: var(--muted-foreground)"
                      >
                        <strong style="color: var(--foreground)">
                          Вся Україна
                        </strong>
                        <br />
                        Ваш профіль показуватиметься клієнтам в усіх містах.
                      </div>

                      <!-- MULTI_CITY: список міст -->
                    {:else}
                      <!-- Вибрані міста -->
                      {#if serviceCities.length > 0}
                        <div class="flex flex-wrap gap-1.5 mb-3">
                          {#each serviceCities as cn (cn)}
                            <span
                              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                              style="background-color: var(--foreground); color: var(--background)"
                            >
                              {cn}
                              <button
                                type="button"
                                onclick={() => removeServiceCity(cn)}
                                class="opacity-70 hover:opacity-100 cursor-pointer"
                                aria-label="Прибрати"
                              >
                                <X class="size-3" />
                              </button>
                            </span>
                          {/each}
                        </div>
                      {/if}

                      <!-- Search -->
                      <Input
                        type="text"
                        bind:value={citySearchQuery}
                        placeholder="Пошук міста"
                        class="h-10 mb-2"
                      />

                      <!-- City list -->
                      <div
                        class="max-h-56 overflow-y-auto rounded-xl border p-1"
                        style="border-color: color-mix(in oklch, var(--foreground) 10%, transparent)"
                      >
                        {#if filteredCitiesList.length === 0}
                          <p
                            class="text-xs text-center py-4"
                            style="color: var(--muted-foreground)"
                          >
                            Нічого не знайдено
                          </p>
                        {:else}
                          {#each filteredCitiesList.slice(0, 50) as c (c.slug)}
                            {@const sel = serviceCities.includes(c.name)}
                            <button
                              type="button"
                              onclick={() => toggleServiceCity(c.name)}
                              class="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors"
                              style="background-color: {sel
                                ? 'color-mix(in oklch, var(--primary) 8%, transparent)'
                                : 'transparent'};
                                     color: var(--foreground)"
                            >
                              <span class="flex items-center gap-2">
                                {c.name}
                                {#if c.region}
                                  <span
                                    class="text-xs"
                                    style="color: var(--muted-foreground)"
                                    >· {c.region}</span
                                  >
                                {/if}
                              </span>
                              {#if sel}
                                <Check
                                  class="size-3.5"
                                  style="color: var(--primary)"
                                />
                              {/if}
                            </button>
                          {/each}
                        {/if}
                      </div>

                      <p
                        class="text-xs mt-2"
                        style="color: var(--muted-foreground)"
                      >
                        Обрано {serviceCities.length} / 20
                      </p>
                    {/if}

                    <!-- Travel radius — тільки для VISIT -->
                    {#if workFormats.includes('VISIT')}
                      <div class="mt-4">
                        <p
                          class="text-sm font-medium mb-2"
                          style="color: var(--foreground)"
                        >
                          Радіус виїзду (опційно)
                        </p>
                        <div class="relative">
                          <Input
                            type="number"
                            min="1"
                            max="500"
                            placeholder="20"
                            bind:value={travelRadiusKm}
                            class="h-10 pr-12 tabular-nums"
                          />
                          <span
                            class="absolute right-4 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                            style="color: var(--muted-foreground)"
                          >
                            км
                          </span>
                        </div>
                        <p
                          class="text-xs mt-1"
                          style="color: var(--muted-foreground)"
                        >
                          На яку відстань готові виїхати від основного міста.
                        </p>
                      </div>
                    {/if}
                  </Field.Field>
                {/if}

                <!-- ─── EXPERIENCE ─── -->
                <Field.Field>
                  <Field.Label>Досвід роботи</Field.Label>
                  <div
                    class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1"
                    role="radiogroup"
                  >
                    {#each experienceOptions as opt (opt.value)}
                      {@const active = experience === opt.value}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onclick={() => (experience = opt.value)}
                        class="flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all cursor-pointer"
                        style="background-color: {active
                          ? 'var(--foreground)'
                          : 'var(--card)'};
                               border-color: {active
                          ? 'var(--foreground)'
                          : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
                               color: {active
                          ? 'var(--background)'
                          : 'var(--foreground)'}"
                      >
                        <div>
                          <div class="text-sm font-medium">{opt.label}</div>
                          <div
                            class="text-xs mt-0.5"
                            style="color: {active
                              ? 'color-mix(in oklch, var(--background) 70%, var(--foreground))'
                              : 'var(--muted-foreground)'}"
                          >
                            {opt.hint}
                          </div>
                        </div>
                        {#if active}
                          <Check class="size-4 shrink-0" />
                        {/if}
                      </button>
                    {/each}
                  </div>
                </Field.Field>
              </Field.Group>

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- STEP 2 — Експертиза -->
              <!-- ═══════════════════════════════════════════════════ -->
            {:else if step === 2}
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
                  Категорії, навички, мови та ставка.
                </p>
              </header>

              <Field.Group class="gap-8">
                <Field.Field>
                  <div class="flex items-center justify-between mb-2">
                    <Field.Label>Категорії</Field.Label>
                    <span
                      class="text-xs tabular-nums"
                      style="color: var(--muted-foreground)"
                    >
                      {selectedCategories.length} / 3
                    </span>
                  </div>

                  <!-- Hint про фільтр -->
                  {#if workFormats.length > 0 && workFormats.length < 3}
                    <p
                      class="text-xs mb-3"
                      style="color: var(--muted-foreground)"
                    >
                      Показано {filteredCategories.length} категорій під ваш формат
                      роботи.
                      {#if isFullyOnline}
                        Для офлайн-послуг увімкніть «У мене» чи «Виїзд» на кроці
                        1.
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
                    <p
                      class="text-xs py-3"
                      style="color: var(--muted-foreground)"
                    >
                      Немає категорій для обраних форматів.
                    </p>
                  {:else}
                    <div class="flex flex-wrap gap-2">
                      {#each filteredCategories as cat (cat.slug)}
                        {@const active = selectedCategories.includes(cat.name)}
                        {@const disabled =
                          !active && selectedCategories.length >= 3}
                        <button
                          type="button"
                          {disabled}
                          onclick={() => toggleCategory(cat.name)}
                          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
                          class:cursor-pointer={!disabled}
                          class:opacity-40={disabled}
                          style="background-color: {active
                            ? 'var(--foreground)'
                            : 'var(--card)'};
                                 border-color: {active
                            ? 'var(--foreground)'
                            : 'color-mix(in oklch, var(--foreground) 10%, transparent)'};
                                 color: {active
                            ? 'var(--background)'
                            : 'var(--foreground)'}"
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
                    Усі обрані категорії будуть показані в картці профілю.
                  </Field.Description>
                </Field.Field>

                <!-- ─── НАВИКИ ─── -->
                {#if categoriesLoaded && selectedCategories.length > 0}
                  <Field.Field>
                    <div class="flex items-center justify-between mb-2">
                      <Field.Label>Навички</Field.Label>
                      <span
                        class="text-xs tabular-nums"
                        style="color: var(--muted-foreground)"
                      >
                        {selectedSkills.length} / 10
                      </span>
                    </div>

                    {#if availableSkills.length === 0}
                      <div
                        class="text-xs py-3"
                        style="color: var(--muted-foreground)"
                      >
                        Для обраних категорій ще не додано навичок.
                      </div>
                    {:else}
                      <div class="flex flex-wrap gap-1.5">
                        {#each availableSkills as skill (skill.slug)}
                          {@const active = selectedSkills.includes(skill.slug)}
                          {@const disabled =
                            !active && selectedSkills.length >= 10}
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
                        Оберіть до 10 навичок з обраних категорій.
                      </Field.Description>
                    {/if}
                  </Field.Field>
                {/if}

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

              <!-- ═══════════════════════════════════════════════════ -->
              <!-- STEP 3 — Презентація -->
              <!-- ═══════════════════════════════════════════════════ -->
            {:else}
              <header class="mb-10">
                <p
                  class="text-xs uppercase tracking-[0.14em] font-medium mb-4"
                  style="color: var(--primary)"
                >
                  Крок 3 — Презентація
                </p>
                <h1
                  class="text-[32px] md:text-[44px] font-semibold tracking-tight leading-[1.1] mb-3"
                  style="color: var(--foreground)"
                >
                  Ваша візитка
                </h1>
                <p class="text-base" style="color: var(--muted-foreground)">
                  Опис, приклади робіт і посилання на портфоліо.
                </p>
              </header>

              <Field.Group class="gap-8">
                <Field.Field>
                  <div class="flex items-center justify-between mb-2">
                    <Field.Label for="bio">Про себе</Field.Label>
                    <span
                      class="text-xs tabular-nums"
                      style="color: {bio.length < 40
                        ? 'var(--muted-foreground)'
                        : 'var(--primary)'}"
                    >
                      {bio.length} / 500
                    </span>
                  </div>
                  <Textarea
                    id="bio"
                    bind:value={bio}
                    maxlength={500}
                    rows={6}
                    placeholder="Розкажіть про досвід, підхід до роботи та що відрізняє вас від інших…"
                    class="resize-none"
                  />
                  <Field.Description>
                    Мінімум 40 символів. В картці показуються перші 2 рядки.
                  </Field.Description>
                </Field.Field>

                <Field.Field>
                  <Field.Label>Приклади робіт</Field.Label>
                  <PortfolioUploader bind:items={portfolio} maxItems={5} />
                  <Field.Description>
                    До 5 фото. JPG, PNG, WebP, до 10 МБ кожне.
                  </Field.Description>
                </Field.Field>

                <Field.Field>
                  <Field.Label for="portfolio-url">
                    Портфоліо або сайт
                  </Field.Label>
                  <Input
                    id="portfolio-url"
                    type="url"
                    placeholder="https://yoursite.com"
                    bind:value={portfolioUrl}
                    class="h-11"
                  />
                  <Field.Description>
                    Необовʼязково. Посилання на зовнішнє портфоліо.
                  </Field.Description>
                </Field.Field>

                {#if !isEdit}
                  <div
                    class="p-4 rounded-xl text-sm leading-relaxed"
                    style="background-color: color-mix(in oklch, var(--primary) 6%, transparent);
                           border: 1px solid color-mix(in oklch, var(--primary) 20%, transparent)"
                  >
                    <p
                      class="font-medium mb-1"
                      style="color: var(--foreground)"
                    >
                      Після завершення — перевірка модератором
                    </p>
                    <p style="color: var(--muted-foreground)">
                      Ваш профіль отримає статус «На модерації». Зазвичай
                      перевірка займає до 24 годин.
                    </p>
                  </div>
                {:else if data.prefill.verificationStatus === 'VERIFIED'}
                  <div
                    class="p-4 rounded-xl text-sm leading-relaxed"
                    style="background-color: color-mix(in oklch, #f59e0b 8%, transparent);
                           border: 1px solid color-mix(in oklch, #f59e0b 25%, transparent)"
                  >
                    <p class="font-medium mb-1" style="color: #b45309">
                      Зміни знов відправляться на модерацію
                    </p>
                    <p style="color: var(--muted-foreground)">
                      Після збереження ваш VERIFIED статус буде тимчасово
                      замінено на «На модерації».
                    </p>
                  </div>
                {/if}
              </Field.Group>
            {/if}

            {#if error}
              <div
                class="mt-6 px-4 py-3 rounded-xl text-sm"
                style="background-color: color-mix(in oklch, var(--destructive) 10%, transparent);
                       color: var(--destructive)"
              >
                {error}
              </div>
            {/if}
          </div>
        {/key}

        <!-- ───── NAV ───── -->
        <div
          class="flex items-center justify-between gap-3 mt-12 pt-7 border-t"
          style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
        >
          <Button
            variant="ghost"
            onclick={back}
            disabled={step === 1}
            class="gap-2 h-11"
          >
            <ArrowLeft class="size-4" />
            Назад
          </Button>

          <Button
            onclick={next}
            disabled={!canNext || loading}
            class="gap-2 h-11 min-w-40 rounded-xl px-6"
          >
            {#if loading}
              <Spinner />
              Зберігаємо…
            {:else if step === totalSteps}
              {isEdit ? 'Зберегти зміни' : 'Надіслати на перевірку'}
              <Check class="size-4" />
            {:else}
              Далі
              <ArrowRight class="size-4" />
            {/if}
          </Button>
        </div>
      </div>

      <!-- ═══════ PREVIEW COLUMN ═══════ -->
      <aside class="hidden lg:block sticky top-14">
        <p
          class="text-xs uppercase tracking-[0.14em] font-medium mb-4"
          style="color: var(--muted-foreground)"
        >
          Превʼю картки
        </p>

        <ProfilePreviewCard
          {name}
          {bio}
          photoUrl={avatar}
          categories={previewCategories}
          city={city || undefined}
          experience={previewExpHint}
          hourlyRate={previewRate}
          verificationStatus="PENDING"
          preview
        />

        <p
          class="text-xs mt-4 leading-relaxed"
          style="color: var(--muted-foreground)"
        >
          Так ваша картка зʼявиться у пошуку та рекомендаціях після проходження
          модерації.
        </p>
      </aside>
    </div>
  </div>
</div>
