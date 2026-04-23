<!-- src/routes/(auth)/profile/setup/freelancer/+page.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import * as Field from '$lib/components/ui/field'
  import * as Select from '$lib/components/ui/select'
  import { goto, invalidateAll } from '$app/navigation'
  import { fly } from 'svelte/transition'
  import { categories } from '$lib/data/categories'
  import ProfilePreviewCard from '$lib/components/profile-preview-card.svelte'
  import AvatarUploader from '$lib/components/avatar-uploader.svelte'
  import PortfolioUploader from '$lib/components/portfolio-uploader.svelte'
  import UsernameInput from '$lib/components/username-input.svelte'
  import { ArrowLeft, ArrowRight, Check, X, Plus } from 'lucide-svelte'
  import { Spinner } from '$lib/components/ui/spinner/index.js'

  interface PortfolioItem {
    url: string
    publicId: string
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
        categories: string[]
        skills: string[]
        experience: string
        languages: string[]
        hourlyRate: string
        portfolioUrl: string
      }
    }
  }>()

  // ─── state (ініціалізуємо з prefill, щоб після "Назад" на дашборд і знову сюди — дані збереглись)
  let step = $state(1)
  const totalSteps = 3

  let avatar = $state(data.prefill.avatar)
  let username = $state(data.prefill.username)
  /** Валідний та доступний username — встановлюється з UsernameInput.onvalidchange.
   *  Якщо prefill має username — вважаємо його валідним (свій). */
  let usernameValid = $state(!!data.prefill.username)
  let phone = $state(data.prefill.phone)
  let city = $state(data.prefill.city)
  let experience = $state(data.prefill.experience)

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

  const cities = [
    'Київ',
    'Харків',
    'Одеса',
    'Дніпро',
    'Запоріжжя',
    'Львів',
    'Кривий Ріг',
    'Миколаїв',
    'Вінниця',
    'Полтава',
    'Черкаси',
    'Житомир',
    'Суми',
    'Хмельницький',
    'Чернівці',
    'Рівне',
    'Кропивницький',
    'Івано-Франківськ',
    'Тернопіль',
    'Луцьк',
    'Ужгород',
    'Інше',
  ]

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

  // ─── derived
  const availableSkills = $derived(
    categories
      .filter((c) => selectedCategories.includes(c.name))
      .flatMap((c) => c.subs.flatMap((s) => s.items))
      .filter((v, i, a) => a.indexOf(v) === i),
  )

  const step1Valid = $derived(
    !!phone.trim() && !!city && !!experience && usernameValid,
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

  // ─── actions
  function toggleCategory(name: string) {
    if (selectedCategories.includes(name)) {
      selectedCategories = selectedCategories.filter((c) => c !== name)
      const remaining = categories
        .filter((c) => selectedCategories.includes(c.name))
        .flatMap((c) => c.subs.flatMap((s) => s.items))
      selectedSkills = selectedSkills.filter((s) => remaining.includes(s))
    } else {
      if (selectedCategories.length >= 3) return
      selectedCategories = [...selectedCategories, name]
    }
  }

  function toggleSkill(s: string) {
    if (selectedSkills.includes(s)) {
      selectedSkills = selectedSkills.filter((x) => x !== s)
    } else {
      if (selectedSkills.length >= 10) return
      selectedSkills = [...selectedSkills, s]
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

  async function submit() {
    error = ''
    loading = true
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'FREELANCER',
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
          submitForReview: true, // ← надсилає профіль на модерацію
        }),
      })
      if (!res.ok) {
        error = 'Помилка збереження. Спробуйте ще раз.'
        return
      }
      await invalidateAll()
      goto('/profile')
    } catch {
      error = 'Немає з’єднання з сервером'
    } finally {
      loading = false
    }
  }

  const selectedCityLabel = $derived(city || 'Оберіть місто')
  const firstInitial = $derived(
    data.prefill.name?.charAt(0).toUpperCase() || '?',
  )
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
        onclick={() => goto('/profile')}
        class="inline-flex items-center gap-2 text-sm cursor-pointer transition-opacity hover:opacity-60"
        style="color: var(--muted-foreground)"
      >
        <X class="size-4" />
        Пропустити
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

    <div
      class="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-12 lg:gap-16 items-start"
    >
      <!-- ═══════ FORM COLUMN ═══════ -->
      <div>
        {#key step}
          <div in:fly={{ y: 6, duration: 200 }}>
            <!-- ───── STEP 1 ───── -->
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
                  Розкажіть про себе
                </h1>
                <p class="text-base" style="color: var(--muted-foreground)">
                  Фото профілю, контакти та досвід роботи.
                </p>
              </header>

              <!-- ───── USERNAME ───── -->
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

              <!-- ───── AVATAR BLOCK ───── -->
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
                    Клікніть на коло щоб завантажити. Якщо замінити — попереднє
                    видалиться автоматично.
                  </p>
                </div>
              </div>

              <Field.Group class="gap-7">
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

                <Field.Field>
                  <Field.Label for="city">Місто</Field.Label>
                  <Select.Root type="single" bind:value={city}>
                    <Select.Trigger class="h-11 w-full">
                      {selectedCityLabel}
                    </Select.Trigger>
                    <Select.Content class="max-h-72 overflow-y-auto">
                      {#each cities as c}
                        <Select.Item value={c}>{c}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </Field.Field>

                <Field.Field>
                  <Field.Label>Досвід роботи</Field.Label>
                  <div
                    class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1"
                    role="radiogroup"
                  >
                    {#each experienceOptions as opt}
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
                          <div class="text-sm font-medium">
                            {opt.label}
                          </div>
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

              <!-- ───── STEP 2 ───── -->
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
                  <div class="flex flex-wrap gap-2">
                    {#each categories as cat}
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
                  <Field.Description>
                    Усі обрані категорії будуть показані в картці профілю.
                  </Field.Description>
                </Field.Field>

                {#if availableSkills.length > 0}
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
                    <div class="flex flex-wrap gap-1.5">
                      {#each availableSkills as skill}
                        {@const active = selectedSkills.includes(skill)}
                        {@const disabled =
                          !active && selectedSkills.length >= 10}
                        <button
                          type="button"
                          {disabled}
                          onclick={() => toggleSkill(skill)}
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
                          {skill}
                        </button>
                      {/each}
                    </div>
                  </Field.Field>
                {/if}

                <!-- ─── Мови ─── -->
                <Field.Field>
                  <Field.Label>Мови спілкування</Field.Label>
                  <div class="flex flex-wrap gap-1.5">
                    {#each languageOptions as lang}
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
                    Мінімальна ставка за годину
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
                    Типова ставка — 300–800 грн/год.
                  </Field.Description>
                </Field.Field>
              </Field.Group>

              <!-- ───── STEP 3 ───── -->
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
                    placeholder="Наприклад: Full-stack розробник з 5 роками досвіду. Спеціалізуюсь на SvelteKit та Node.js."
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
                    Необов’язково. Посилання на зовнішнє портфоліо.
                  </Field.Description>
                </Field.Field>

                <!-- Інфо про модерацію -->
                <div
                  class="p-4 rounded-xl text-sm leading-relaxed"
                  style="background-color: color-mix(in oklch, var(--primary) 6%, transparent);
                         border: 1px solid color-mix(in oklch, var(--primary) 20%, transparent)"
                >
                  <p class="font-medium mb-1" style="color: var(--foreground)">
                    Після завершення — перевірка модератором
                  </p>
                  <p style="color: var(--muted-foreground)">
                    Ваш профіль отримає статус «На модерації». Зазвичай
                    перевірка займає до 24 годин. Після схвалення у картці
                    з’явиться синя галочка верифікації.
                  </p>
                </div>
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
              Надіслати на перевірку
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
          Прев’ю картки
        </p>

        <ProfilePreviewCard
          name={data.prefill.name}
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
          Так ваша картка з’явиться у пошуку та рекомендаціях після проходження
          модерації.
        </p>
      </aside>
    </div>
  </div>
</div>
