<!-- src/routes/(auth)/profile/setup/client/+page.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import * as Field from '$lib/components/ui/field'
  import * as Select from '$lib/components/ui/select'
  import { goto, invalidateAll } from '$app/navigation'
  import AvatarUploader from '$lib/components/avatar-uploader.svelte'
  import UsernameInput from '$lib/components/username-input.svelte'
  import { Check, X } from 'lucide-svelte'
  import { Spinner } from '$lib/components/ui/spinner/index.js'

  let { data } = $props<{
    data: {
      prefill: {
        name: string
        username: string
        phone: string
        city: string
        bio: string
        avatar: string
        isExistingClient: boolean
      }
    }
  }>()

  // ─── state ───
  let name = $state(data.prefill.name)
  let avatar = $state(data.prefill.avatar)
  let username = $state(data.prefill.username)
  let usernameValid = $state(!!data.prefill.username)
  let phone = $state(data.prefill.phone)
  let city = $state(data.prefill.city)
  let bio = $state(data.prefill.bio)

  let loading = $state(false)
  let error = $state('')

  const cities = [
    'Київ', 'Харків', 'Одеса', 'Дніпро', 'Запоріжжя', 'Львів',
    'Кривий Ріг', 'Миколаїв', 'Вінниця', 'Полтава', 'Черкаси',
    'Житомир', 'Суми', 'Хмельницький', 'Чернівці', 'Рівне',
    'Кропивницький', 'Івано-Франківськ', 'Тернопіль', 'Луцьк',
    'Ужгород', 'Інше',
  ]

  const isEdit = $derived(data.prefill.isExistingClient)

  // ─── валідація ───
  // Для клієнта мінімум: тільки імʼя + username. Все інше опційне.
  const canSave = $derived(
    !!name.trim() && name.trim().length >= 2 && usernameValid,
  )

  function leaveSetup() {
    goto('/dashboard')
  }

  async function submit() {
    error = ''
    if (!canSave) return
    loading = true
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'CLIENT',
          name: name.trim(),
          username,
          phone: phone.trim(),
          city,
          bio: bio.trim(),
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (errData.field === 'username') {
          error = errData.error === 'Username already taken'
            ? 'Цей нікнейм уже зайнято'
            : 'Невірний формат нікнейму'
        } else {
          error = errData.error ?? 'Помилка збереження. Спробуйте ще раз.'
        }
        return
      }

      await invalidateAll()
      goto('/dashboard')
    } catch {
      error = 'Немає звʼязку з сервером'
    } finally {
      loading = false
    }
  }

  const selectedCityLabel = $derived(city || 'Оберіть місто')
  const firstInitial = $derived(name?.charAt(0).toUpperCase() || '?')
</script>

<svelte:head>
  <title>{isEdit ? 'Редагування профілю' : 'Налаштування профілю'} · Zunor</title>
</svelte:head>

<div
  class="min-h-screen px-4 pt-6 pb-28 md:py-14"
  style="background-color: var(--background)"
>
  <div class="max-w-xl mx-auto">
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
    </div>

    <!-- ───── TITLE ───── -->
    <header class="mb-10">
      <p
        class="text-xs uppercase tracking-[0.14em] font-medium mb-4"
        style="color: var(--primary)"
      >
        {isEdit ? 'Редагування' : 'Вітаємо у Zunor'}
      </p>
      <h1
        class="text-[32px] md:text-[44px] font-semibold tracking-tight leading-[1.1] mb-3"
        style="color: var(--foreground)"
      >
        {isEdit ? 'Редагуйте профіль' : 'Налаштуйте свій профіль'}
      </h1>
      <p class="text-base" style="color: var(--muted-foreground)">
        {isEdit
          ? 'Оновіть дані які бачать майстри у ваших замовленнях.'
          : 'Це допоможе майстрам швидше реагувати на ваші запити. Можна заповнити пізніше.'}
      </p>
    </header>

    <!-- ───── FORM ───── -->
    <Field.Group class="gap-6">
      <!-- Аватар -->
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
            Клікніть на коло щоб завантажити. Майстри побачать фото у чаті
            і замовленнях.
          </p>
        </div>
      </div>

      <!-- Імʼя -->
      <Field.Field>
        <Field.Label for="name">Імʼя</Field.Label>
        <Input
          id="name"
          type="text"
          placeholder="Як до вас звертатись"
          bind:value={name}
          maxlength={80}
          class="h-11"
        />
        <Field.Description>Ваше реальне імʼя або псевдонім.</Field.Description>
      </Field.Field>

      <!-- Username -->
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

      <!-- Телефон -->
      <Field.Field>
        <Field.Label for="phone">Телефон</Field.Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+38 (0__) ___-__-__"
          bind:value={phone}
          class="h-11"
        />
        <Field.Description>
          Майстри побачать номер тільки після підтвердження замовлення.
        </Field.Description>
      </Field.Field>

      <!-- Місто -->
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

      <!-- Bio -->
      <Field.Field>
        <div class="flex items-center justify-between mb-2">
          <Field.Label for="bio">Про себе</Field.Label>
          <span
            class="text-xs tabular-nums"
            style="color: var(--muted-foreground)"
          >
            {bio.length} / 500
          </span>
        </div>
        <Textarea
          id="bio"
          bind:value={bio}
          maxlength={500}
          rows={4}
          placeholder="Наприклад: Підприємець, шукаю надійних виконавців для розробки сайтів та маркетингу."
          class="resize-none"
        />
        <Field.Description>
          Необовʼязково. Допомагає майстрам зрозуміти контекст замовлень.
        </Field.Description>
      </Field.Field>

      {#if error}
        <div
          class="px-4 py-3 rounded-xl text-sm"
          style="background-color: color-mix(in oklch, var(--destructive) 10%, transparent);
                 color: var(--destructive)"
        >
          {error}
        </div>
      {/if}
    </Field.Group>

    <!-- ───── ACTIONS ───── -->
    <div
      class="flex items-center justify-end gap-3 mt-12 pt-7 border-t"
      style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
    >
      <Button
        onclick={submit}
        disabled={!canSave || loading}
        class="gap-2 h-11 min-w-40 rounded-xl px-6"
      >
        {#if loading}
          <Spinner />
          Зберігаємо…
        {:else}
          {isEdit ? 'Зберегти зміни' : 'Готово'}
          <Check class="size-4" />
        {/if}
      </Button>
    </div>

    <!-- Натяк що можна стати фрілансером -->
    {#if !isEdit}
      <div
        class="mt-10 p-5 rounded-xl"
        style="background-color: color-mix(in oklch, var(--primary) 5%, transparent);
               border: 1px solid color-mix(in oklch, var(--primary) 15%, transparent)"
      >
        <p
          class="text-sm font-medium mb-1"
          style="color: var(--foreground)"
        >
          Хочете не лише замовляти, а й заробляти?
        </p>
        <p class="text-sm" style="color: var(--muted-foreground)">
          Будь-коли можете стати майстром і пропонувати свої послуги. Це
          можна зробити з вашого профілю.
        </p>
      </div>
    {/if}
  </div>
</div>