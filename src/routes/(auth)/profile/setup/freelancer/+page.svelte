<script lang="ts">
  import { Button } from '$lib/components/ui/button'
  import * as Card from '$lib/components/ui/card'
  import * as Field from '$lib/components/ui/field'
  import { Input } from '$lib/components/ui/input'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'
  import { MapPin, Phone, FileText, Globe, Briefcase } from 'lucide-svelte'

  const session = $derived($page.data.session)

  let bio = $state('')
  let phone = $state(session?.user?.phone ?? '')
  let city = $state(session?.user?.city ?? '')
  let portfolioUrl = $state('')
  let experience = $state('')
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
    'Інше',
  ]

  const experienceOptions = [
    'Менше 1 року',
    '1-2 роки',
    '3-5 років',
    '5-10 років',
    '10+ років',
  ]

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    error = ''
    if (!bio.trim()) {
      error = 'Заповніть опис'
      return
    }
    loading = true

    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, phone, city, portfolioUrl, experience }),
      })

      if (!res.ok) {
        error = 'Помилка збереження'
        return
      }

      await invalidateAll()
      goto('/dashboard')
    } finally {
      loading = false
    }
  }
</script>

<div
  class="min-h-screen flex items-center justify-center px-4 py-12"
  style="background-color: var(--background)"
>
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div
        class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
        style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)"
      >
        💼
      </div>
      <h1 class="text-2xl font-bold" style="color: var(--foreground)">
        Налаштуйте профіль
      </h1>
      <p class="text-sm mt-1" style="color: var(--muted-foreground)">
        Це допоможе клієнтам знайти вас
      </p>
    </div>

    <Card.Root>
      <Card.Content class="pt-6">
        <form onsubmit={handleSubmit}>
          <Field.Group>
            <Field.Field>
              <Field.Label for="phone">
                <Phone class="w-3.5 h-3.5 inline mr-1" />
                Телефон
              </Field.Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+38(0__)__-__-__"
                bind:value={phone}
              />
            </Field.Field>

            <Field.Field>
              <Field.Label for="city">
                <MapPin class="w-3.5 h-3.5 inline mr-1" />
                Місто
              </Field.Label>
              <select
                id="city"
                bind:value={city}
                class="w-full h-9 px-3 text-sm rounded-lg border outline-none"
                style="background-color: var(--background); border-color: color-mix(in oklch, var(--foreground) 20%, transparent); color: var(--foreground)"
              >
                <option value="" disabled>Оберіть місто</option>
                {#each cities as c}
                  <option value={c}>{c}</option>
                {/each}
              </select>
            </Field.Field>

            <Field.Field>
              <Field.Label for="experience">
                <Briefcase class="w-3.5 h-3.5 inline mr-1" />
                Досвід роботи
              </Field.Label>
              <select
                id="experience"
                bind:value={experience}
                class="w-full h-9 px-3 text-sm rounded-lg border outline-none"
                style="background-color: var(--background); border-color: color-mix(in oklch, var(--foreground) 20%, transparent); color: var(--foreground)"
              >
                <option value="" disabled>Оберіть досвід</option>
                {#each experienceOptions as exp}
                  <option value={exp}>{exp}</option>
                {/each}
              </select>
            </Field.Field>

            <Field.Field>
              <Field.Label for="portfolio">
                <Globe class="w-3.5 h-3.5 inline mr-1" />
                Портфоліо / сайт
              </Field.Label>
              <Input
                id="portfolio"
                type="url"
                placeholder="https://yoursite.com"
                bind:value={portfolioUrl}
              />
            </Field.Field>

            <Field.Field>
              <Field.Label for="bio">
                <FileText class="w-3.5 h-3.5 inline mr-1" />
                Про себе <span class="text-destructive">*</span>
              </Field.Label>
              <textarea
                id="bio"
                bind:value={bio}
                placeholder="Розкажіть про свій досвід, навички та підхід до роботи..."
                rows="4"
                class="w-full px-3 py-2 text-sm rounded-lg border outline-none resize-none"
                style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent); border-color: color-mix(in oklch, var(--foreground) 10%, transparent); color: var(--foreground)"
              ></textarea>
            </Field.Field>

            {#if error}
              <p class="text-sm text-destructive text-center">{error}</p>
            {/if}

            <Field.Field>
              <Button type="submit" disabled={loading} class="w-full">
                {loading ? 'Зберігаємо...' : 'Зберегти і продовжити'}
              </Button>
              <button
                type="button"
                onclick={() => goto('/dashboard')}
                class="text-xs text-center cursor-pointer hover:opacity-70 w-full mt-1"
                style="color: var(--muted-foreground)"
              >
                Пропустити
              </button>
            </Field.Field>
          </Field.Group>
        </form>
      </Card.Content>
    </Card.Root>
  </div>
</div>
