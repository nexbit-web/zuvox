<!-- src/routes/(auth)/user/forgot/+page.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import {
    FieldGroup,
    Field,
    FieldLabel,
    FieldDescription,
  } from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { authClient } from '$lib/auth-client'
  import {
    LoaderCircle,
    AlertCircle,
    CheckCircle2,
    Mail,
    ArrowLeft,
  } from 'lucide-svelte'

  // ─── State ───
  let email = $state('')
  let loading = $state(false)
  let serverError = $state('')
  let sent = $state(false)
  let touched = $state(false)

  // ─── Validation ───
  const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  function isValidEmail(e: string): boolean {
    const trimmed = e.trim()
    return (
      trimmed.length >= 3 && trimmed.length <= 254 && EMAIL_RE.test(trimmed)
    )
  }

  const emailError = $derived(
    touched && !isValidEmail(email) ? 'Невірний формат email' : '',
  )

  const formValid = $derived(isValidEmail(email))

  // ─── Submit ───
  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    if (loading) return

    touched = true

    if (!formValid) {
      serverError = 'Введіть коректний email'
      return
    }

    loading = true
    serverError = ''

    try {
      const res = await fetch('/api/auth/forget-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          redirectTo: '/user/reset-password',
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => null)
        console.warn('[forgot] error (silent):', error)
      }

      sent = true
    } catch (err) {
      console.error('[forgot] network failed:', err)
      serverError = "Помилка з'єднання. Перевірте інтернет."
    } finally {
      loading = false
    }
  }
</script>

<svelte:head>
  <title>Відновлення паролю — Zunor</title>
  <meta name="description" content="Відновіть доступ до свого акаунту Zunor" />
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div
  class="min-h-screen flex items-center justify-center px-4 py-12"
  style="background-color: var(--background)"
>
  <div class="w-full max-w-md flex flex-col gap-6">
    <Card.Root class="overflow-hidden">
      {#if !sent}
        <!-- ─── Form ─── -->
        <Card.Header class="text-center space-y-2">
          <div
            class="size-12 rounded-2xl mx-auto flex items-center justify-center"
            style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
          >
            <Mail class="size-5" style="color: var(--primary)" />
          </div>
          <Card.Title class="text-2xl font-bold tracking-tight">
            Забули пароль?
          </Card.Title>
          <Card.Description class="text-sm">
            Введіть email і ми надішлемо посилання для відновлення
          </Card.Description>
        </Card.Header>

        <Card.Content>
          <form onsubmit={handleSubmit} novalidate autocomplete="on">
            <FieldGroup>
              <Field>
                <FieldLabel for="forgot-email">Email</FieldLabel>
                <div class="relative">
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="ivan@example.com"
                    bind:value={email}
                    onblur={() => (touched = true)}
                    autocomplete="email"
                    maxlength={254}
                    aria-invalid={!!emailError}
                    aria-describedby={emailError
                      ? 'forgot-email-error'
                      : undefined}
                    class="h-11 rounded-lg pr-9"
                    required
                  />
                  {#if touched && isValidEmail(email)}
                    <CheckCircle2
                      class="absolute right-3 top-1/2 -translate-y-1/2 size-4"
                      style="color: var(--primary)"
                    />
                  {:else if emailError}
                    <AlertCircle
                      class="absolute right-3 top-1/2 -translate-y-1/2 size-4"
                      style="color: var(--destructive)"
                    />
                  {/if}
                </div>
                {#if emailError}
                  <FieldDescription
                    id="forgot-email-error"
                    class="text-destructive"
                  >
                    {emailError}
                  </FieldDescription>
                {/if}
              </Field>

              {#if serverError}
                <div
                  class="flex items-start gap-2 p-3 rounded-lg text-sm"
                  style="background-color: color-mix(in oklch, var(--destructive) 8%, transparent);
                         color: var(--destructive);
                         border: 1px solid color-mix(in oklch, var(--destructive) 25%, transparent)"
                  role="alert"
                >
                  <AlertCircle class="size-4 shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              {/if}

              <Field>
                <Button
                  type="submit"
                  disabled={loading || !formValid}
                  class="w-full h-11 rounded-lg cursor-pointer disabled:cursor-not-allowed"
                >
                  {#if loading}
                    <LoaderCircle class="size-4 animate-spin mr-2" />
                    Надсилаємо…
                  {:else}
                    Надіслати посилання
                  {/if}
                </Button>
              </Field>

              <a
                href="/user/login"
                class="text-xs text-center cursor-pointer hover:opacity-70 inline-flex items-center justify-center gap-1 w-full"
                style="color: var(--muted-foreground)"
              >
                <ArrowLeft class="size-3" />
                Повернутись до входу
              </a>
            </FieldGroup>
          </form>
        </Card.Content>
      {:else}
        <!-- ─── Success ─── -->
        <Card.Header class="text-center space-y-3">
          <div
            class="size-14 rounded-2xl mx-auto flex items-center justify-center"
            style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
          >
            <CheckCircle2 class="size-6" style="color: var(--primary)" />
          </div>
          <Card.Title class="text-2xl font-bold tracking-tight">
            Перевірте пошту
          </Card.Title>
          <Card.Description class="text-sm leading-relaxed">
            Якщо акаунт з адресою
            <span class="font-medium" style="color: var(--foreground)"
              >{email}</span
            >
            існує, ми надіслали інструкції для відновлення паролю.
          </Card.Description>
        </Card.Header>

        <Card.Content>
          <FieldGroup>
            <p
              class="text-xs text-center leading-relaxed px-2"
              style="color: var(--muted-foreground)"
            >
              Не отримали лист? Перевірте папку «Спам» або
              <button
                type="button"
                onclick={() => {
                  sent = false
                  serverError = ''
                }}
                class="cursor-pointer hover:underline font-medium"
                style="color: var(--primary)"
              >
                спробуйте ще раз
              </button>
            </p>

            <a
              href="/user/login"
              class="text-xs text-center cursor-pointer hover:opacity-70 inline-flex items-center justify-center gap-1 w-full mt-2"
              style="color: var(--muted-foreground)"
            >
              <ArrowLeft class="size-3" />
              Повернутись до входу
            </a>
          </FieldGroup>
        </Card.Content>
      {/if}
    </Card.Root>
  </div>
</div>
