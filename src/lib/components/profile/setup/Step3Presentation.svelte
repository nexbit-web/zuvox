<!-- src/lib/components/profile/setup/Step3Presentation.svelte -->
<script lang="ts">
  import { Input } from '$lib/components/ui/input'
  import { Textarea } from '$lib/components/ui/textarea'
  import * as Field from '$lib/components/ui/field'
  import PortfolioUploader from '$lib/components/portfolio-uploader.svelte'
  import { LIMITS, type PortfolioItem } from './types'

  let {
    bio = $bindable(),
    portfolio = $bindable<PortfolioItem[]>(),
    portfolioUrl = $bindable(),

    isEdit = false,
    verificationStatus = 'NONE',
  } = $props<{
    bio: string
    portfolio: PortfolioItem[]
    portfolioUrl: string
    isEdit?: boolean
    verificationStatus?: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  }>()
</script>

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
        style="color: {bio.length < LIMITS.BIO_MIN
          ? 'var(--muted-foreground)'
          : 'var(--primary)'}"
      >
        {bio.length} / {LIMITS.BIO_MAX}
      </span>
    </div>
    <Textarea
      id="bio"
      bind:value={bio}
      maxlength={LIMITS.BIO_MAX}
      rows={8}
      placeholder="Розкажіть про досвід, підхід до роботи та що відрізняє вас від інших…"
      class="resize-none"
    />
    <Field.Description>
      Мінімум {LIMITS.BIO_MIN} символів. В картці показуються перші 2 рядки.
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
    <Field.Label for="portfolio-url">Портфоліо або сайт</Field.Label>
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
      <p class="font-medium mb-1" style="color: var(--foreground)">
        Після завершення — перевірка модератором
      </p>
      <p style="color: var(--muted-foreground)">
        Ваш профіль отримає статус «На модерації». Зазвичай перевірка займає до
        24 годин.
      </p>
    </div>
  {:else if verificationStatus === 'VERIFIED'}
    <div
      class="p-4 rounded-xl text-sm leading-relaxed"
      style="background-color: color-mix(in oklch, #f59e0b 8%, transparent);
             border: 1px solid color-mix(in oklch, #f59e0b 25%, transparent)"
    >
      <p class="font-medium mb-1" style="color: #b45309">
        Зміни знов відправляться на модерацію
      </p>
      <p style="color: var(--muted-foreground)">
        Після збереження ваш VERIFIED статус буде тимчасово замінено на «На
        модерації».
      </p>
    </div>
  {/if}
</Field.Group>
