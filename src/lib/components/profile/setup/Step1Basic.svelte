<!-- src/lib/components/profile/setup/Step1Basic.svelte -->
<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import * as Field from '$lib/components/ui/field'
  import * as Select from '$lib/components/ui/select'
  import AvatarUploader from '$lib/components/avatar-uploader.svelte'
  import UsernameInput from '$lib/components/username-input.svelte'
  import {
    Check,
    X,
    LoaderCircle,
    Globe,
    Home,
    MapPin,
    Map,
  } from 'lucide-svelte'
  import {
    experienceOptions,
    type WorkFormat,
    type GeographyMode,
    type CityFromApi,
  } from './types'

  let {
    // прямі поля
    name = $bindable(),
    username = $bindable(),
    usernameValid = $bindable(),
    avatar = $bindable(),
    phone = $bindable(),
    city = $bindable(),
    experience = $bindable(),
    workFormats = $bindable<WorkFormat[]>(),
    geographyMode = $bindable<GeographyMode>(),
    serviceCities = $bindable<string[]>(),
    travelRadiusKm = $bindable(),

    // дані
    citiesList,
    citiesLoaded,

    // прапори
    isEdit = false,
    prefillPhoneFromRegistration = false,
  } = $props<{
    name: string
    username: string
    usernameValid: boolean
    avatar: string
    phone: string
    city: string
    experience: string
    workFormats: WorkFormat[]
    geographyMode: GeographyMode
    serviceCities: string[]
    travelRadiusKm: string
    citiesList: CityFromApi[]
    citiesLoaded: boolean
    isEdit?: boolean
    prefillPhoneFromRegistration?: boolean
  }>()

  // ────────── local state ──────────
  let citySearchQuery = $state('')

  const firstInitial = $derived(name?.charAt(0).toUpperCase() || '?')
  const selectedCityLabel = $derived(city || 'Оберіть місто')

  // Якщо обрано тільки ONLINE — географія не показується,
  // батьківський компонент знає що поставити serviceCities = ['all-ukraine'] на сабміті.
  const needsLocation = $derived(
    workFormats.includes('OFFLINE') || workFormats.includes('VISIT'),
  )

  // ────────── options ──────────
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

  // ────────── derived ──────────
  const filteredCitiesList = $derived.by(() => {
    const q = citySearchQuery.trim().toLowerCase()
    if (!q) return citiesList
    return citiesList.filter(
      (c: CityFromApi) =>
        c.name.toLowerCase().includes(q) || c.region?.toLowerCase().includes(q),
    )
  })

  // ────────── actions ──────────
  function toggleWorkFormat(format: WorkFormat) {
    if (workFormats.includes(format)) {
      if (workFormats.length === 1) return // мінімум один має бути
      workFormats = workFormats.filter((f: WorkFormat) => f !== format)
    } else {
      workFormats = [...workFormats, format]
    }
  }

  function setGeographyMode(mode: GeographyMode) {
    geographyMode = mode
    if (mode === 'ONE_CITY' || mode === 'ALL_UKRAINE') {
      serviceCities = []
    }
  }

  function toggleServiceCity(cityName: string) {
    if (serviceCities.includes(cityName)) {
      serviceCities = serviceCities.filter((c: string) => c !== cityName)
    } else {
      if (serviceCities.length >= 20) return
      serviceCities = [...serviceCities, cityName]
    }
  }

  function removeServiceCity(cityName: string) {
    serviceCities = serviceCities.filter((c: string) => c !== cityName)
  }
</script>

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

<Field.Group class="gap-7">
  <!-- ─── 1. NAME ─── -->
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

  <!-- ─── 2. USERNAME ─── -->
  <div
    class="p-5 rounded-xl border"
    style="background-color: var(--card); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
  >
    <div class="mb-3">
      <p class="text-sm font-medium" style="color: var(--foreground)">
        Нікнейм на платформі
      </p>
      <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">
        Унікальне імʼя. Використовується у посиланні: /@nickname
      </p>
    </div>
    <UsernameInput
      bind:value={username}
      onvalidchange={(v) => (usernameValid = v !== null)}
    />
  </div>

  <!-- ─── 3. AVATAR ─── -->
  <div
    class="flex items-center gap-5 p-5 rounded-xl border"
    style="background-color: var(--card); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
  >
    <AvatarUploader
      bind:value={avatar}
      fallback={firstInitial}
      variant="circle"
      size="lg"
    />
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium" style="color: var(--foreground)">
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

  <!-- ─── 4. PHONE ─── -->
  <Field.Field>
    <Field.Label for="phone">Телефон</Field.Label>
    <Input
      id="phone"
      type="tel"
      placeholder="+38 (0__) ___-__-__"
      bind:value={phone}
      class="h-11"
    />
    {#if prefillPhoneFromRegistration}
      <Field.Description>Заповнено автоматично з реєстрації.</Field.Description>
    {/if}
  </Field.Field>

  <!-- ─── 5. CITY ─── -->
  <Field.Field>
    <Field.Label for="city">Ваше місто</Field.Label>
    <Select.Root type="single" bind:value={city} disabled={!citiesLoaded}>
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

  <!-- ─── 6. WORK FORMAT ─── -->
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
                 color: {active ? 'var(--background)' : 'var(--foreground)'}"
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

  <!-- ─── 7. GEOGRAPHY (тільки якщо є OFFLINE/VISIT) ─── -->
  {#if needsLocation}
    <Field.Field>
      <Field.Label>Де ви працюєте?</Field.Label>
      <Field.Description>
        Регіон обслуговування. Клієнти у цих місцях побачать вас у пошуку.
      </Field.Description>

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
                   color: {active ? 'var(--background)' : 'var(--foreground)'}"
          >
            <Icon class="size-4" strokeWidth={2} />
            <span class="text-xs font-medium leading-tight">{opt.label}</span>
          </button>
        {/each}
      </div>

      <p class="text-xs mb-3" style="color: var(--muted-foreground)">
        {geographyOptions.find((o) => o.value === geographyMode)?.hint}
      </p>

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
      {:else if geographyMode === 'ALL_UKRAINE'}
        <div
          class="p-3.5 rounded-xl text-xs leading-relaxed"
          style="background-color: color-mix(in oklch, var(--primary) 6%, transparent);
                 color: var(--muted-foreground)"
        >
          <strong style="color: var(--foreground)">Вся Україна</strong>
          <br />
          Ваш профіль показуватиметься клієнтам в усіх містах.
        </div>
      {:else}
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

        <Input
          type="text"
          bind:value={citySearchQuery}
          placeholder="Пошук міста"
          class="h-10 mb-2"
        />

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
                    <span class="text-xs" style="color: var(--muted-foreground)"
                      >· {c.region}</span
                    >
                  {/if}
                </span>
                {#if sel}
                  <Check class="size-3.5" style="color: var(--primary)" />
                {/if}
              </button>
            {/each}
          {/if}
        </div>

        <p class="text-xs mt-2" style="color: var(--muted-foreground)">
          Обрано {serviceCities.length} / 20
        </p>
      {/if}

      <!-- Travel radius — тільки для VISIT -->
      {#if workFormats.includes('VISIT')}
        <div class="mt-4">
          <p class="text-sm font-medium mb-2" style="color: var(--foreground)">
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
          <p class="text-xs mt-1" style="color: var(--muted-foreground)">
            На яку відстань готові виїхати від основного міста.
          </p>
        </div>
      {/if}
    </Field.Field>
  {/if}

  <!-- ─── 8. EXPERIENCE ─── -->
  <Field.Field>
    <Field.Label>Досвід роботи</Field.Label>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1" role="radiogroup">
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
                 color: {active ? 'var(--background)' : 'var(--foreground)'}"
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
