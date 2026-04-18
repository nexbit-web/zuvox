<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import { Separator } from '$lib/components/ui/separator'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import type { PageData } from './$types'

  export let data: PageData
  const { user } = data
</script>

<div
  class="max-w-3xl mx-auto rounded-xl border border-border bg-card overflow-hidden"
>
  <!-- Банер -->
  <div
    class="h-36 w-full bg-gradient-to-r from-violet-300 via-indigo-400 to-violet-200"
  />

  <!-- Аватар + ім'я -->
  <div class="px-6">
    <div class="flex items-end gap-4 -mt-8 mb-3">
      <Avatar class="h-16 w-16 border-4 border-background">
        <AvatarImage src={user.avatar} alt={user.name} />
        <AvatarFallback class="bg-violet-950 text-white text-xl">
          {user.name?.[0] ?? '?'}
        </AvatarFallback>
      </Avatar>
      <div class="pb-1">
        <h1 class="text-base font-semibold">{user.name}</h1>
        <p class="text-xs text-muted-foreground flex items-center gap-1">
          {user.id.slice(0, 8)}...
          <button class="hover:text-foreground transition-colors">⧉</button>
        </p>
      </div>
    </div>

    <p class="text-sm text-muted-foreground mb-3">
      {user._count.orders} замовлень ·
      <span class="text-violet-600 font-medium"
        >{user._count.reviews} відгуків</span
      >
    </p>

    <div class="flex flex-wrap gap-2 pb-5">
      {#if user.isTopRated}
        <Badge variant="secondary">↑ Top Виконавець</Badge>
      {/if}
      {#if user.isVerified}
        <Badge variant="secondary">✔ Верифікований</Badge>
      {/if}
      <Badge variant="secondary">⚡ Швидка відповідь</Badge>
      <Badge variant="secondary">🔥 +9 Серія</Badge>
    </div>
  </div>

  <Separator />

  <!-- Метрики -->
  <div class="px-6 py-4">
    <p class="text-xs font-medium text-muted-foreground mb-3">
      📊 Метрики виконавця
    </p>
    <div class="space-y-2">
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-muted-foreground">Відсоток успішних</span>
        <span class="text-sm font-medium">%{user.successRate}</span>
      </div>
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-muted-foreground">Середній рейтинг</span>
        <span class="text-sm font-medium flex items-center gap-1">
          <span class="text-amber-400">★</span>
          {user.avgRating} ({user._count.reviews} відгуків)
        </span>
      </div>
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-muted-foreground">Час відповіді</span>
        <span class="text-sm font-medium">~{user.responseTime} год</span>
      </div>
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-muted-foreground">Категорії послуг</span>
        <div class="flex gap-1.5 flex-wrap justify-end">
          {#each user.categories as cat}
            <Badge variant="outline" class="text-xs font-normal">{cat}</Badge>
          {/each}
        </div>
      </div>
    </div>
  </div>

  <Separator />

  <!-- Портфоліо -->
  <div class="px-6 py-4">
    <p class="text-xs font-medium text-muted-foreground mb-3">
      👥 Соціальне та портфоліо
    </p>
    <div class="space-y-2">
      {#if user.portfolioUrl}
        <div class="flex items-center justify-between py-1.5">
          <span class="text-sm text-muted-foreground">Сайт / портфоліо</span>
          <a
            href={user.portfolioUrl}
            target="_blank"
            class="text-sm text-violet-600 hover:underline"
          >
            {user.portfolioUrl.replace('https://', '')} ⧉
          </a>
        </div>
      {/if}
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-muted-foreground">Рейтинг</span>
        <span class="text-sm font-medium flex items-center gap-1">
          <span class="text-amber-400">★</span>
          {user.avgRating} ({user._count.reviews}+ оцінок)
        </span>
      </div>
    </div>
  </div>

  <Separator />

  <!-- Верифікація -->
  <div class="px-6 py-4">
    <p class="text-xs font-medium text-muted-foreground mb-3">
      🔒 Надійність та верифікація
    </p>
    <div class="space-y-2">
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-muted-foreground">Верифікований акаунт</span>
        {#if user.isVerified}
          <Badge
            class="bg-green-100 text-green-800 hover:bg-green-100 border-0 text-xs"
          >
            ✔ VERIFIED
          </Badge>
        {:else}
          <span class="text-xs text-muted-foreground">Не верифікований</span>
        {/if}
      </div>
      <div class="flex items-center justify-between py-1.5">
        <span class="text-sm text-muted-foreground">На платформі з</span>
        <span class="text-sm text-muted-foreground">
          {new Date(user.createdAt).toLocaleDateString('uk-UA', {
            month: 'long',
            year: 'numeric',
          })}
        </span>
      </div>
    </div>
  </div>

  <Separator />

  <!-- Активні гіги -->
  <div class="px-6 py-4">
    <p class="text-xs font-medium text-muted-foreground mb-3">
      💼 Активні гіги
    </p>
    <div class="space-y-2">
      {#each user.gigs as gig}
        <a
          href="/gigs/{gig.id}"
          class="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          <span class="text-sm">{gig.title}</span>
          <span class="text-sm font-medium text-violet-600">
            від {(gig.price / 100).toLocaleString('uk-UA')} грн
          </span>
        </a>
      {/each}
    </div>
  </div>
</div>
