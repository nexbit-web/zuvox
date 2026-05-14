<!-- src/lib/components/profile/freelancer/parts/ProfilePhoneReveal.svelte -->
<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import { Spinner } from '$lib/components/ui/spinner'
  import { goto } from '$app/navigation'
  import { Phone, LogIn, Copy, Check } from 'lucide-svelte'

  interface Props {
    userId: string
    isAuthenticated: boolean
    profileUrl: string
  }

  let { userId, isAuthenticated, profileUrl }: Props = $props()

  let phoneRevealed = $state(false)
  let revealedPhone = $state<string | null>(null)
  let phoneError = $state<string | null>(null)
  let phoneLoading = $state(false)
  let copied = $state(false)
  let copyTimer: ReturnType<typeof setTimeout> | null = null

  const PHONE_ERROR_MAP: Record<string, string> = {
    UNAUTHORIZED: 'Увійдіть, щоб побачити номер',
    DAILY_LIMIT: 'Денний ліміт вичерпано',
    SELF_LOOKUP: 'Це ваш власний профіль',
    NOT_AVAILABLE: 'Номер недоступний для перегляду',
    NOT_VERIFIED: 'Фрілансер ще не пройшов модерацію',
    NO_PHONE: 'Номер не вказано',
  }

  async function togglePhone() {
    if (!isAuthenticated) {
      goto('/user/login?next=' + encodeURIComponent(profileUrl))
      return
    }

    if (phoneRevealed) {
      phoneRevealed = false
      return
    }
    if (revealedPhone) {
      phoneRevealed = true
      return
    }

    phoneLoading = true
    phoneError = null

    try {
      const res = await fetch(`/api/user/${userId}/phone`)
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        phoneError = PHONE_ERROR_MAP[data.error as string] ?? 'Помилка доступу'
        return
      }

      revealedPhone = typeof data.phone === 'string' ? data.phone : null
      phoneRevealed = !!revealedPhone
      if (!revealedPhone) phoneError = 'Номер не вказано'
    } catch {
      phoneError = 'Помилка зʼєднання'
    } finally {
      phoneLoading = false
    }
  }

  async function copyPhone() {
    if (!revealedPhone) return
    try {
      await navigator.clipboard.writeText(revealedPhone)
      copied = true
      if (copyTimer) clearTimeout(copyTimer)
      copyTimer = setTimeout(() => (copied = false), 1200)
    } catch {
      // silent
    }
  }
</script>

<section
  class="mb-5 p-4 rounded-2xl border"
  style="background-color: var(--card);
         border-color: color-mix(in oklch, var(--foreground) 6%, transparent)"
  aria-label="Контакти"
>
  <div class="flex items-center justify-between gap-3">
    <div class="flex items-center gap-3 min-w-0">
      <div
        class="size-10 rounded-full flex items-center justify-center shrink-0"
        style="background-color: color-mix(in oklch, var(--primary) 12%, transparent)"
      >
        <Phone
          class="size-4"
          style="color: var(--primary)"
          aria-hidden="true"
        />
      </div>
      <div class="min-w-0">
        {#if phoneRevealed && revealedPhone}
          <a
            href={`tel:${revealedPhone.replace(/[^\d+]/g, '')}`}
            class="text-base font-semibold tabular-nums hover:underline"
            style="color: var(--foreground)"
          >
            {revealedPhone}
          </a>
          <button
            type="button"
            onclick={copyPhone}
            class="text-xs inline-flex items-center gap-1 cursor-pointer hover:opacity-70 mt-0.5"
            style="color: var(--muted-foreground)"
            aria-label="Скопіювати номер"
          >
            {#if copied}
              <Check class="size-3" style="color: #10b981" aria-hidden="true" />
              Скопійовано
            {:else}
              <Copy class="size-3" aria-hidden="true" />
              Копіювати
            {/if}
          </button>
        {:else if phoneError}
          <p class="text-sm font-medium" style="color: var(--destructive)">
            {phoneError}
          </p>
          <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">
            Спробуйте пізніше
          </p>
        {:else}
          <p class="text-sm font-medium" style="color: var(--foreground)">
            Контактний номер
          </p>
          <p class="text-xs" style="color: var(--muted-foreground)">
            {isAuthenticated
              ? 'Ліміт: 5 переглядів на добу'
              : 'Увійдіть, щоб побачити номер'}
          </p>
        {/if}
      </div>
    </div>
    <Button
      onclick={togglePhone}
      disabled={phoneLoading}
      variant={phoneRevealed && revealedPhone ? 'outline' : 'default'}
      class="h-9 rounded-full gap-1.5 shrink-0"
    >
      {#if phoneLoading}
        <Spinner />
      {:else if !isAuthenticated}
        <LogIn class="size-3.5" aria-hidden="true" />
        Увійти
      {:else if phoneRevealed && revealedPhone}
        Приховати
      {:else}
        <Phone class="size-3.5" aria-hidden="true" />
        Показати
      {/if}
    </Button>
  </div>
</section>
