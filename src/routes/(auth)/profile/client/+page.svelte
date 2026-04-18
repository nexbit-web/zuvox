<script lang="ts">
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import {
    BadgeCheck,
    Copy,
    MapPin,
    Calendar,
    ShoppingBag,
    Star,
    MessageSquare,
    Heart,
    User,
    Send,
    MoveUp,
    MessageCircle,
  } from 'lucide-svelte'

  const client = {
    id: 'c1d2e3f4',
    username: '@maryna_s',
    name: 'Марина Семенова',
    avatar: '',
    isVerified: true,
    location: 'Харків, Україна',
    createdAt: '2024-01-15',
    bio: 'Підприємець. Шукаю надійних виконавців для свого бізнесу.',
    totalOrders: 12,
    completedOrders: 11,

    // Відгуки від майстрів про цього клієнта
    reviews: [
      {
        id: 'r1',
        masterName: 'Олексій К.',
        masterInitials: 'ОК',
        gig: 'Розробка лендінгу',
        rating: 5,
        text: 'Відмінний клієнт — чітко описав завдання, швидко відповідав і одразу підтвердив роботу. Рекомендую!',
        date: '2024-04-02',
      },
      {
        id: 'r2',
        masterName: 'Дмитро В.',
        masterInitials: 'ДВ',
        gig: 'UI/UX дизайн',
        rating: 5,
        text: 'Приємно працювати — знає чого хоче, не змінює ТЗ в процесі. Оплатив одразу після здачі.',
        date: '2024-03-20',
      },
      {
        id: 'r3',
        masterName: 'Анна М.',
        masterInitials: 'АМ',
        gig: 'SEO оптимізація',
        rating: 4,
        text: 'Хороший клієнт, але трохи довго з фідбеком. Загалом все пройшло добре.',
        date: '2024-03-01',
      },
    ],

    // Збережені майстри
    savedMasters: [
      {
        id: 'm1',
        name: 'Олексій К.',
        initials: 'ОК',
        category: 'Веб-розробка',
      },
      { id: 'm2', name: 'Дмитро В.', initials: 'ДВ', category: 'UI/UX Дизайн' },
      { id: 'm3', name: 'Анна М.', initials: 'АМ', category: 'SEO' },
    ],
  }

  // Середній рейтинг від майстрів
  const avgRating = (
    client.reviews.reduce((sum, r) => sum + r.rating, 0) / client.reviews.length
  ).toFixed(1)

  function copyUsername() {
    navigator.clipboard.writeText(client.username)
  }

  const memberSince = new Date(client.createdAt).toLocaleDateString('uk-UA', {
    month: 'short',
    year: 'numeric',
  })
</script>

<div class="bg-background min-h-screen">
  <div class="max-w-2xl mx-auto px-4 sm:px-8 pt-8 sm:pt-12">
    <!-- Аватар + кнопка написати -->
    <div class="flex items-start justify-between mb-4 mt-1">
      <Avatar
        class="h-16 w-16 sm:h-[72px] sm:w-[72px] border-2 border-background"
      >
        <AvatarImage src={client.avatar} alt={client.name} />
        <AvatarFallback
          class="bg-secondary text-secondary-foreground text-xl sm:text-2xl font-semibold cursor-default"
        >
          {client.name[0]}
        </AvatarFallback>
      </Avatar>

      <div class="hidden sm:flex gap-2">
        <Button
          variant="outline"
          size="sm"
          class="h-8 text-xs cursor-pointer gap-1.5"
        >
          <MessageCircle /> Написати
        </Button>
      </div>
    </div>

    <!-- Ім'я + мета -->
    <div class="mb-6">
      <!-- Ім'я + VERIFIED -->
      <div class="flex items-start justify-between mb-0.5">
        <div class="flex items-center gap-1.5">
          <h1 class="text-[17px] font-semibold text-foreground">
            {client.name}
          </h1>
          {#if client.isVerified}
            <BadgeCheck class="w-[18px] h-[18px] text-primary" />
          {/if}
        </div>
        {#if client.isVerified}
          <div
            class="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400 px-2.5 py-1 rounded-full cursor-default"
          >
            <BadgeCheck class="w-3 h-3" />
            VERIFIED
          </div>
        {/if}
      </div>

      <!-- Нікнейм -->
      <p class="text-xs text-muted-foreground flex items-center gap-1 mb-2">
        <span>{client.username}</span>
        <button
          onclick={copyUsername}
          class="hover:text-foreground transition-colors cursor-pointer"
        >
          <Copy class="w-3 h-3" />
        </button>
      </p>

      <!-- Дата + локація -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span class="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar class="w-3 h-3" /> З {memberSince}
        </span>
        <span class="text-muted-foreground/30">·</span>
        <span class="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin class="w-3 h-3" />
          {client.location}
        </span>
      </div>

      <!-- Замовлень + рейтинг від майстрів -->
      <p class="text-sm text-muted-foreground mb-4">
        {client.totalOrders} замовлень ·
        <span class="text-primary font-medium"
          >{client.reviews.length} відгуків</span
        >
        · <span class="text-amber-500 font-medium">★ {avgRating}</span>
      </p>

      <!-- Бейджі -->
      <div class="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          class="rounded-full text-xs font-normal px-3 py-1 cursor-default gap-1.5"
        >
          <ShoppingBag class="w-3 h-3" /> Клієнт
        </Badge>
        {#if client.completedOrders >= 10}
          <Badge
            variant="outline"
            class="rounded-full text-xs font-normal px-3 py-1 cursor-default"
          >
            <MoveUp /> Постійний клієнт
          </Badge>
        {/if}
      </div>
    </div>

    <div class="border-t border-border/40" />

    <!-- Про себе -->
    {#if client.bio}
      <div class="py-5 space-y-3">
        <p
          class="text-[11px] font-medium text-muted-foreground tracking-widest uppercase flex items-center gap-1.5"
        >
          <User class="w-3.5 h-3.5" /> Про себе
        </p>
        <p class="text-sm text-muted-foreground leading-relaxed">
          {client.bio}
        </p>
      </div>
      <div class="border-t border-border/40" />
    {/if}

    <!-- Відгуки від майстрів -->
    <div class="py-5">
      <div class="flex items-center justify-between mb-6">
        <p
          class="text-[11px] font-medium text-muted-foreground tracking-widest uppercase flex items-center gap-1.5"
        >
          <MessageSquare class="w-3.5 h-3.5" /> Відгуки від майстрів
        </p>
        <span class="text-xs text-muted-foreground flex items-center gap-1">
          <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
          {avgRating} · {client.reviews.length} відгуків
        </span>
      </div>
      <div class="divide-y divide-border/40">
        {#each client.reviews as review}
          <div class="py-5 first:pt-0">
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 text-muted-foreground"
              >
                {review.masterInitials}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">{review.masterName}</p>
                <p class="text-xs text-muted-foreground truncate">
                  {review.gig}
                </p>
              </div>
              <div class="flex gap-0.5 shrink-0">
                {#each Array(review.rating) as _}
                  <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
                {/each}
              </div>
            </div>
            <p class="text-sm text-muted-foreground leading-relaxed pl-9">
              {review.text}
            </p>
            <p class="text-[11px] text-muted-foreground/50 mt-2 pl-9">
              {new Date(review.date).toLocaleDateString('uk-UA', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- Sticky CTA мобіль -->
  <div
    class="sm:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border/40 px-4 py-3 z-50"
  >
    <Button variant="outline" class="w-full h-10 text-sm cursor-pointer gap-2">
      <MessageCircle /> Написати
    </Button>
  </div>
</div>
