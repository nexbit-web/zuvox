<!-- src/routes/(auth)/profile/setup/freelancer/+page.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Spinner } from '$lib/components/ui/spinner/index.js'
  import { goto, invalidateAll } from '$app/navigation'
  import { onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import { ArrowLeft, ArrowRight, Check, X } from 'lucide-svelte'
  import toast from 'svelte-hot-french-toast'

  import ProfilePreviewCard from '$lib/components/profile-preview-card.svelte'

  import Step1Basic from '$lib/components/profile/setup/Step1Basic.svelte'
  import Step2Expertise from '$lib/components/profile/setup/Step2Expertise.svelte'
  import Step3Presentation from '$lib/components/profile/setup/Step3Presentation.svelte'
  import {
    experienceOptions,
    LIMITS,
    type CategoryFromApi,
    type CityFromApi,
    type GeographyMode,
    type PortfolioItem,
    type WorkFormat,
  } from '$lib/components/profile/setup/types'

  // ═══════════════════════════════════════════════════════════
  // Props
  // ═══════════════════════════════════════════════════════════

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

        // ─── ОДНА категорія + ОДНА підкатегорія (slug-и) ───
        // Бек все ще віддає масив categories[] — беремо перший
        categories: string[]
        subcategory: string | null

        skills: string[]
        experience: string
        languages: string[]
        hourlyRate: string
        portfolioUrl: string

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

  // Step 1
  let name = $state(data.prefill.name ?? '')
  let username = $state(data.prefill.username)
  let usernameValid = $state(!!data.prefill.username)
  let avatar = $state(data.prefill.avatar)
  let phone = $state(data.prefill.phone)
  let city = $state(data.prefill.city)
  let experience = $state(data.prefill.experience)

  // ─── Формат роботи ───
  // КРИТИЧНО: якщо профіль існує — поважаємо те що в БД (навіть якщо всі false).
  // Якщо профіль НОВИЙ і нічого не задано — дефолт ['ONLINE'].
  let workFormats = $state<WorkFormat[]>(
    (() => {
      const list: WorkFormat[] = []
      if (data.prefill.worksOnline) list.push('ONLINE')
      if (data.prefill.worksOffline) list.push('OFFLINE')
      if (data.prefill.worksOnSite) list.push('VISIT')

      // Дефолт ТІЛЬКИ для нового профілю
      if (list.length === 0 && !data.prefill.isExistingFreelancer) {
        return ['ONLINE']
      }
      // Якщо існуючий профіль з усіма false — все одно ставимо ONLINE,
      // бо мати порожній масив не можна (валідація)
      if (list.length === 0) return ['ONLINE']

      return list
    })(),
  )

  // ─── Географія ───
  let geographyMode = $state<GeographyMode>(
    data.prefill.serviceCities?.[0] === 'all-ukraine'
      ? 'ALL_UKRAINE'
      : Array.isArray(data.prefill.serviceCities) &&
          data.prefill.serviceCities.length > 1
        ? 'MULTI_CITY'
        : 'ONE_CITY',
  )

  let serviceCities = $state<string[]>(
    (data.prefill.serviceCities ?? []).filter(
      (c: string) => c !== 'all-ukraine',
    ),
  )

  let travelRadiusKm = $state(data.prefill.travelRadiusKm ?? '')

  // Step 2 — ОДНА категорія + ОДНА підкатегорія
  let selectedCategory = $state<string | null>(
    data.prefill.categories?.[0] ?? null,
  )
  let selectedSubcategory = $state<string | null>(
    data.prefill.subcategory ?? null,
  )
  let selectedSkills = $state<string[]>([...(data.prefill.skills ?? [])])
  let selectedLanguages = $state<string[]>(
    data.prefill.languages.length
      ? [...data.prefill.languages]
      : ['Українська'],
  )
  let hourlyRate = $state(data.prefill.hourlyRate)

  // Step 3
  let bio = $state(data.prefill.bio)
  let portfolioUrl = $state(data.prefill.portfolioUrl)
  let portfolio = $state<PortfolioItem[]>(data.prefill.portfolio)

  let loading = $state(false)

  // ═══════════════════════════════════════════════════════════
  // API data
  // ═══════════════════════════════════════════════════════════

  let categories = $state<CategoryFromApi[]>([])
  let citiesList = $state<CityFromApi[]>([])
  let categoriesLoaded = $state(false)
  let citiesLoaded = $state(false)

  async function loadInitialData() {
    categoriesLoaded = false
    citiesLoaded = false

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
      toast.error('Не вдалося завантажити дані. Перезавантажте сторінку.')
    } finally {
      categoriesLoaded = true
      citiesLoaded = true
    }
  }

  onMount(() => {
    loadInitialData()
  })

  // ═══════════════════════════════════════════════════════════
  // Derived
  // ═══════════════════════════════════════════════════════════

  const needsLocation = $derived(
    workFormats.includes('OFFLINE') || workFormats.includes('VISIT'),
  )

  const step1Valid = $derived(
    !!name.trim() &&
      name.trim().length >= 2 &&
      !!phone.trim() &&
      !!city &&
      !!experience &&
      usernameValid &&
      workFormats.length > 0 &&
      (!needsLocation ||
        geographyMode === 'ALL_UKRAINE' ||
        (geographyMode === 'ONE_CITY' && !!city) ||
        (geographyMode === 'MULTI_CITY' && serviceCities.length > 0)),
  )

  const step2Valid = $derived(
    !!selectedCategory &&
      !!selectedSubcategory &&
      selectedSkills.length > 0 &&
      selectedLanguages.length > 0 &&
      !!hourlyRate &&
      Number(hourlyRate) > 0,
  )

  const step3Valid = $derived(bio.trim().length >= LIMITS.BIO_MIN)

  const canNext = $derived(
    step === 1 ? step1Valid : step === 2 ? step2Valid : step3Valid,
  )

  // ─── Preview: показуємо name категорії, а не slug ───
  const selectedCategoryName = $derived(
    selectedCategory
      ? (categories.find((c) => c.slug === selectedCategory)?.name ?? '')
      : '',
  )

  const previewRate = $derived(
    hourlyRate && Number(hourlyRate) > 0 ? Number(hourlyRate) : null,
  )
  const previewExpHint = $derived(
    experienceOptions.find((e) => e.value === experience)?.hint ?? '',
  )
  const previewCategories = $derived(
    selectedCategoryName ? [selectedCategoryName] : [],
  )
  const isEdit = $derived(data.prefill.isExistingFreelancer)

  // ═══════════════════════════════════════════════════════════
  // Navigation
  // ═══════════════════════════════════════════════════════════

  function next() {
    if (!canNext) return
    if (step < totalSteps) step += 1
    else submit()
  }

  function back() {
    if (step > 1) step -= 1
  }

  function leaveSetup() {
    goto('/dashboard')
  }

  // ═══════════════════════════════════════════════════════════
  // Submit
  // ═══════════════════════════════════════════════════════════

  async function submit() {
    loading = true
    try {
      // Готуємо географію
      let finalServiceCities: string[]
      if (!needsLocation) {
        // Тільки онлайн — серверу віддаємо 'all-ukraine'
        finalServiceCities = ['all-ukraine']
      } else if (geographyMode === 'ALL_UKRAINE') {
        finalServiceCities = ['all-ukraine']
      } else if (geographyMode === 'MULTI_CITY') {
        finalServiceCities = serviceCities
      } else {
        // ONE_CITY: явно передаємо основне місто щоб бек зберіг
        finalServiceCities = city ? [city] : []
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

          // Категорія + підкатегорія (slug)
          categories: selectedCategory ? [selectedCategory] : [],
          subcategory: selectedSubcategory,

          skills: selectedSkills,
          languages: selectedLanguages,
          hourlyRate: Number(hourlyRate),

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
          toast.error(
            errData.error === 'Username already taken'
              ? 'Цей нікнейм уже зайнято — оберіть інший на кроці 1'
              : 'Невірний нікнейм. Перевірте на кроці 1',
          )
          step = 1
        } else {
          toast.error(errData.error ?? 'Помилка збереження. Спробуйте ще раз.')
        }
        return
      }

      toast.success(
        isEdit ? 'Зміни збережено' : 'Профіль відправлено на перевірку',
      )

      await invalidateAll()
      goto('/dashboard')
    } catch {
      toast.error('Немає зʼєднання з сервером')
    } finally {
      loading = false
    }
  }
</script>

<div
  class="min-h-screen px-4 pt-6 pb-28 md:py-14"
  style="background-color: var(--background)"
>
  <div class="max-w-6xl mx-auto">
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

    <div
      class="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-12 lg:gap-16 items-start"
    >
      <div>
        {#key step}
          <div in:fly={{ y: 6, duration: 200 }}>
            {#if step === 1}
              <Step1Basic
                bind:name
                bind:username
                bind:usernameValid
                bind:avatar
                bind:phone
                bind:city
                bind:experience
                bind:workFormats
                bind:geographyMode
                bind:serviceCities
                bind:travelRadiusKm
                {citiesList}
                {citiesLoaded}
                {isEdit}
                prefillPhoneFromRegistration={!!data.prefill.phone}
              />
            {:else if step === 2}
              <Step2Expertise
                bind:selectedCategory
                bind:selectedSubcategory
                bind:selectedSkills
                bind:selectedLanguages
                bind:hourlyRate
                {categories}
                {categoriesLoaded}
                {workFormats}
              />
            {:else}
              <Step3Presentation
                bind:bio
                bind:portfolio
                bind:portfolioUrl
                {isEdit}
                verificationStatus={data.prefill.verificationStatus}
              />
            {/if}
          </div>
        {/key}

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
