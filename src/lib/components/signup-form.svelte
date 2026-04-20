<script lang="ts">
  import { cn } from '$lib/utils.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as Card from '$lib/components/ui/card/index.js'
  import * as Field from '$lib/components/ui/field/index.js'
  import { Input } from '$lib/components/ui/input/index.js'
  import type { HTMLAttributes } from 'svelte/elements'
  import { signUp } from '$lib/auth-client'
  import { goto, invalidateAll } from '$app/navigation'

  let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> =
    $props()

  type Role = 'CLIENT' | 'FREELANCER'
  type Step = 'role' | 'form' | 'otp' | 'success'

  let step = $state<Step>('role')
  let role = $state<Role | null>(null)
  let name = $state('')
  let phone = $state('')
  let email = $state('')
  let city = $state('')
  let password = $state('')
  let confirm = $state('')
  let agreeTerms = $state(false)
  let otp = $state('')
  let loading = $state(false)
  let error = $state('')
  let resendTimer = $state(0)
  let timerInterval: ReturnType<typeof setInterval> | null = null

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
    'Херсон',
    'Інше',
  ]

  function selectRole(r: Role) {
    role = r
    step = 'form'
  }

  function validate() {
    if (!name.trim()) return "Введіть ім'я"
    if (!phone.trim()) return 'Введіть номер телефону'
    if (!email.trim()) return 'Введіть email'
    if (!/\S+@\S+\.\S+/.test(email)) return 'Невірний формат email'
    if (!city) return 'Оберіть місто'
    if (password.length < 8) return 'Пароль мінімум 8 символів'
    if (password !== confirm) return 'Паролі не збігаються'
    if (!agreeTerms) return 'Погодьтесь з правилами сервісу'
    return null
  }

  function startTimer() {
    resendTimer = 60
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = setInterval(() => {
      resendTimer--
      if (resendTimer <= 0 && timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
    }, 1000)
  }

  async function sendOtp(emailAddr: string) {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddr }),
    })
    return res.ok
  }

  async function handleForm(e: SubmitEvent) {
    e.preventDefault()
    error = ''
    const validationError = validate()
    if (validationError) {
      error = validationError
      return
    }

    loading = true
    try {
      const sent = await sendOtp(email)
      if (!sent) {
        error = 'Не вдалось відправити код. Перевірте email.'
        return
      }
      startTimer()
      step = 'otp'
    } finally {
      loading = false
    }
  }

  async function handleOtp(e: SubmitEvent) {
    e.preventDefault()
    error = ''
    if (otp.length !== 6) {
      error = 'Введіть 6-значний код'
      return
    }

    loading = true
    try {
      // Перевіряємо OTP
      const verifyRes = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) {
        error = verifyData.error ?? 'Невірний код'
        return
      }

      // Реєструємо
      const { error: signUpError } = await signUp.email({
        name,
        email,
        password,
      })
      if (signUpError) {
        error = signUpError.message ?? 'Помилка реєстрації'
        return
      }

      // Оновлюємо роль, телефон і місто
      await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, phone, city }),
      })

      await invalidateAll()
      if (timerInterval) clearInterval(timerInterval)

      // Перенаправляємо залежно від ролі
      if (role === 'FREELANCER') {
        goto('/profile/setup/freelancer')
      } else {
        goto('/profile/setup/client')
      }
    } finally {
      loading = false
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return
    error = ''
    otp = ''
    const sent = await sendOtp(email)
    if (sent) startTimer()
    else error = 'Не вдалось відправити код'
  }
</script>

<div class={cn('flex flex-col gap-6', className)} {...restProps}>
  <Card.Root>
    <!-- Крок 1: роль -->
    {#if step === 'role'}
      <Card.Header class="text-center">
        <Card.Title class="text-xl">Створіть свій акаунт</Card.Title>
        <Card.Description
          >Оберіть як ви плануєте використовувати Zuvox</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <div class="flex flex-col gap-3">
          {#each [{ r: 'CLIENT' as Role, emoji: '🛒', title: 'Я замовник', desc: 'Шукаю виконавців для своїх завдань' }, { r: 'FREELANCER' as Role, emoji: '💼', title: 'Я виконавець', desc: 'Пропоную послуги та заробляю' }] as item}
            <button
              type="button"
              onclick={() => selectRole(item.r)}
              class="flex items-center gap-4 p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 hover:scale-[1.01]"
              style="background-color: var(--bg-header); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
              onmouseenter={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor =
                  'var(--primary)')}
              onmouseleave={(e) =>
                ((e.currentTarget as HTMLElement).style.borderColor =
                  'color-mix(in oklch, var(--foreground) 8%, transparent)')}
            >
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style="background-color: color-mix(in oklch, var(--primary) 8%, transparent)"
              >
                {item.emoji}
              </div>
              <div>
                <p
                  class="text-sm font-semibold"
                  style="color: var(--foreground)"
                >
                  {item.title}
                </p>
                <p
                  class="text-xs mt-0.5"
                  style="color: var(--muted-foreground)"
                >
                  {item.desc}
                </p>
              </div>
            </button>
          {/each}
          <p
            class="text-xs text-center mt-1"
            style="color: var(--muted-foreground)"
          >
            Вже є акаунт? <a href="/user/login" style="color: var(--primary)"
              >Увійти</a
            >
          </p>
        </div>
      </Card.Content>

      <!-- Крок 2: форма -->
    {:else if step === 'form'}
      <Card.Header class="text-center">
        <Card.Title class="text-xl"
          >{role === 'CLIENT' ? '🛒 Замовник' : '💼 Виконавець'}</Card.Title
        >
        <Card.Description>Заповніть дані для реєстрації</Card.Description>
      </Card.Header>
      <Card.Content>
        <form onsubmit={handleForm}>
          <Field.Group>
            <!-- Ім'я -->
            <Field.Field>
              <Field.Label for="name">Ім'я</Field.Label>
              <Input
                id="name"
                type="text"
                placeholder="Ваше ім'я"
                bind:value={name}
                required
              />
            </Field.Field>

            <!-- Телефон -->
            <Field.Field>
              <Field.Label for="phone">Телефон</Field.Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+38(0__)__-__-__"
                bind:value={phone}
                required
              />
            </Field.Field>

            <!-- Email -->
            <Field.Field>
              <Field.Label for="email">Email</Field.Label>
              <Input
                id="email"
                type="email"
                placeholder="johndoe@gmail.com"
                bind:value={email}
                required
              />
            </Field.Field>

            <!-- Місто -->
            <Field.Field>
              <Field.Label for="city">Місто</Field.Label>
              <select
                id="city"
                bind:value={city}
                class="w-full h-9 px-3 text-sm rounded-lg border outline-none transition-colors"
                style="background-color: var(--background); border-color: color-mix(in oklch, var(--foreground) 20%, transparent); color: {city
                  ? 'var(--foreground)'
                  : 'var(--muted-foreground)'}"
                required
              >
                <option value="" disabled selected>Оберіть місто</option>
                {#each cities as c}
                  <option value={c}>{c}</option>
                {/each}
              </select>
            </Field.Field>

            <!-- Пароль -->
            <Field.Field>
              <Field.Field class="grid grid-cols-2 gap-4">
                <Field.Field>
                  <Field.Label for="password">Пароль</Field.Label>
                  <Input
                    id="password"
                    type="password"
                    bind:value={password}
                    required
                  />
                </Field.Field>
                <Field.Field>
                  <Field.Label for="confirm">Повторіть</Field.Label>
                  <Input
                    id="confirm"
                    type="password"
                    bind:value={confirm}
                    required
                  />
                </Field.Field>
              </Field.Field>
              <Field.Description
                >Має бути щонайменше 8 символів.</Field.Description
              >
            </Field.Field>

            <!-- Погодження -->
            <div class="flex items-center gap-2">
              <input
                id="terms"
                type="checkbox"
                bind:checked={agreeTerms}
                class="w-4 h-4 rounded cursor-pointer accent-primary"
              />
              <label
                for="terms"
                class="text-sm cursor-pointer"
                style="color: var(--muted-foreground)"
              >
                З <a
                  href="/terms"
                  class="hover:opacity-70"
                  style="color: var(--primary)">правилами</a
                > сервісу погоджуюсь
              </label>
            </div>

            {#if error}
              <p class="text-sm text-destructive text-center">{error}</p>
            {/if}

            <Field.Field>
              <Button type="submit" disabled={loading} class="w-full">
                {loading ? 'Відправляємо код...' : 'Отримати код'}
              </Button>
            </Field.Field>

            <button
              type="button"
              onclick={() => (step = 'role')}
              class="text-xs text-center cursor-pointer hover:opacity-70 w-full"
              style="color: var(--muted-foreground)"
            >
              ← Змінити роль
            </button>
          </Field.Group>
        </form>
      </Card.Content>

      <!-- Крок 3: OTP -->
    {:else if step === 'otp'}
      <Card.Header class="text-center">
        <Card.Title class="text-xl">Підтвердіть email</Card.Title>
        <Card.Description>
          Ми надіслали 6-значний код на<br />
          <span class="font-medium" style="color: var(--foreground)"
            >{email}</span
          >
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form onsubmit={handleOtp}>
          <Field.Group>
            <Field.Field>
              <Field.Label for="otp">Код підтвердження</Field.Label>
              <Input
                id="otp"
                type="text"
                inputmode="numeric"
                maxlength={6}
                placeholder="000000"
                bind:value={otp}
                class="text-center text-2xl font-bold tracking-widest"
                required
              />
              <Field.Description>Код дійсний 10 хвилин</Field.Description>
            </Field.Field>

            {#if error}
              <p class="text-sm text-destructive text-center">{error}</p>
            {/if}

            <Field.Field>
              <Button
                type="submit"
                disabled={loading || otp.length !== 6}
                class="w-full"
              >
                {loading ? 'Перевіряємо...' : 'Підтвердити'}
              </Button>
            </Field.Field>

            <div class="text-center">
              {#if resendTimer > 0}
                <p class="text-xs" style="color: var(--muted-foreground)">
                  Повторний код через {resendTimer}с
                </p>
              {:else}
                <button
                  type="button"
                  onclick={handleResend}
                  class="text-xs cursor-pointer hover:opacity-70"
                  style="color: var(--primary)"
                >
                  Надіслати код повторно
                </button>
              {/if}
            </div>

            <button
              type="button"
              onclick={() => {
                step = 'form'
                otp = ''
              }}
              class="text-xs text-center cursor-pointer hover:opacity-70 w-full"
              style="color: var(--muted-foreground)"
            >
              ← Змінити email
            </button>
          </Field.Group>
        </form>
      </Card.Content>

      <!-- Крок 4: успіх -->
    {:else}
      <Card.Header class="text-center">
        <Card.Title class="text-xl">Акаунт створено! 🎉</Card.Title>
        <Card.Description>Ви успішно зареєструвались</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="flex flex-col items-center gap-4 py-4">
          <div
            class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
            style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
          >
            ✅
          </div>
          <Button href="/user/login" class="w-full">Увійти в акаунт</Button>
        </div>
      </Card.Content>
    {/if}
  </Card.Root>

  <Field.Description class="px-6 text-center">
    Натискаючи «Продовжити», ви погоджуєтеся з нашими
    <a href="/terms">Умовами</a> і
    <a href="/privacy">Політикою конфіденційності</a>.
  </Field.Description>
</div>
