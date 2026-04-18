<script lang="ts">
  import { Badge } from '$lib/components/ui/badge'
  import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'
  import {
    BadgeCheck,
    Copy,
    ExternalLink,
    Code,
    Palette,
    Smartphone,
    MapPin,
    Clock,
    Star,
    RefreshCw,
    ArrowUpRight,
    Calendar,
    Zap,
    Briefcase,
    ImageIcon,
    MessageSquare,
    User,
    Send,
    ShoppingBag,
  } from 'lucide-svelte'
  import type { ComponentType } from 'svelte'
  import type { Icon } from 'lucide-svelte'

  const iconMap: Record<string, ComponentType<Icon>> = {
    Code,
    Palette,
    Smartphone,
    Briefcase,
  }

  const user = {
    id: '4bbe021f1520',
    username: '@alexkoval',
    name: 'Олексій Коваль',
    avatar: '',
    isVerified: true,
    isTopRated: true,
    portfolioUrl: 'https://alexkoval.dev',
    bio: 'Full-stack розробник з 5 роками досвіду. Спеціалізуюсь на SvelteKit, React та Node.js. Роблю швидко, якісно і завжди в термін.',
    location: 'Київ, Україна',
    experience: '5 років',
    languages: ['Українська', 'English'],
    successRate: 98,
    avgRating: 4.9,
    totalOrders: 248,
    reviewsCount: 248,
    responseTime: 2,
    repeatClients: 64,
    createdAt: '2024-03-01',
    followers: 444,
    banner:
      'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=1200&q=80',
    categories: [
      { id: '1', name: 'Веб-розробка', icon: 'Code' },
      { id: '2', name: 'UI/UX Дизайн', icon: 'Palette' },
      { id: '3', name: 'Мобільні застосунки', icon: 'Smartphone' },
    ],
    gigs: [
      {
        id: '1',
        title: 'Розробка лендінгу на SvelteKit',
        price: 2500,
        rating: 5.0,
        orders: 98,
        icon: 'Code',
      },
      {
        id: '2',
        title: 'UI/UX дизайн у Figma',
        price: 1800,
        rating: 4.8,
        orders: 74,
        icon: 'Palette',
      },
      {
        id: '3',
        title: 'API інтеграція та бекенд',
        price: 3000,
        rating: 4.9,
        orders: 42,
        icon: 'Briefcase',
      },
    ],
    portfolio: [
      {
        id: '1',
        title: 'Інтернет-магазин',
        image:
          'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=80',
      },
      {
        id: '2',
        title: 'SaaS дашборд',
        image:
          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80',
      },
      {
        id: '3',
        title: 'Мобільний застосунок',
        image:
          'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80',
      },
    ],
    reviews: [
      {
        id: '1',
        name: 'Марина С.',
        initials: 'МС',
        rating: 5,
        text: 'Зробив все швидко і якісно. Лендінг виглядає саме так як хотіла. Однозначно рекомендую!',
        date: '2024-04-10',
      },
      {
        id: '2',
        name: 'Денис К.',
        initials: 'ДК',
        rating: 5,
        text: 'Другий раз звертаюсь — завжди на вищому рівні. Чітко дотримується термінів.',
        date: '2024-04-05',
      },
      {
        id: '3',
        name: 'Сергій М.',
        initials: 'СМ',
        rating: 4,
        text: 'Професіонал своєї справи. API інтеграція зроблена бездоганно.',
        date: '2024-03-28',
      },
    ],
  }

  let isFollowing = false
  function toggleFollow() {
    isFollowing = !isFollowing
  }
  function copyUsername() {
    navigator.clipboard.writeText(user.username)
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('uk-UA', {
    month: 'short',
    year: 'numeric',
  })
</script>

<div class="min-h-screen" style="background-color: var( --background)">
  <!-- Банер -->
  <div class="px-4 pt-4 sm:px-6 sm:pt-6">
    <div class="w-full h-36 sm:h-44 rounded-2xl overflow-hidden">
      <img src={user.banner} alt="banner" class="w-full h-full object-cover" />
    </div>
  </div>

  <div class="max-w-2xl mx-auto px-4 sm:px-8">
    <!-- Аватар + CTA -->
    <div class="flex items-start justify-between">
      <div class="-mt-7 sm:-mt-8">
        <Avatar
          class="h-16 w-16 sm:h-[72px] sm:w-[72px] border-2 border-background"
        >
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback
            class="text-xl sm:text-2xl font-semibold cursor-default"
            style="background-color: var(--primary); color: white"
          >
            {user.name[0]}
          </AvatarFallback>
        </Avatar>
      </div>

       
    </div>

    <!-- Ім'я + мета -->
    <div class="mt-2 mb-6">
      <div class="flex items-start justify-between mb-0.5">
        <div class="flex items-center gap-1.5">
          <h1 class="text-[17px] font-semibold text-foreground">{user.name}</h1>
          {#if user.isVerified}
            <BadgeCheck class="w-[18px] h-[18px] text-emerald-500" />
          {/if}
        </div>
        {#if user.isVerified}
          <div
            class="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 rounded-full cursor-default"
          >
            <BadgeCheck class="w-3 h-3" />
            VERIFIED
          </div>
        {/if}
      </div>

      <p class="text-xs text-muted-foreground flex items-center gap-1 mb-2">
        <span>{user.username}</span>
        <button
          onclick={copyUsername}
          class="hover:text-foreground transition-colors cursor-pointer"
        >
          <Copy class="w-3 h-3" />
        </button>
      </p>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span class="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar class="w-3 h-3" /> З {memberSince}
        </span>
        <span class="text-white/10">·</span>
        <span class="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin class="w-3 h-3" />
          {user.location}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-4">
        <p class="text-sm text-muted-foreground">
          {user.followers} підписників ·
          <span class="text-primary font-medium"
            >{user.reviewsCount}+ відгуків</span
          >
        </p>
        <button
          onclick={toggleFollow}
          class="text-xs px-4 py-1.5 rounded-full font-medium transition-all cursor-pointer
            {isFollowing
            ? 'bg-white/10 text-muted-foreground hover:bg-white/20'
            : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'}"
        >
          {isFollowing ? 'Підписаний' : 'Підписатись'}
        </button>
      </div>
    </div>

    <div class="border-t border-white/5" />

    <!-- Про себе -->
    <div class="py-5 space-y-4">
      <p
        class="text-[11px] font-medium text-muted-foreground tracking-widest uppercase flex items-center gap-1.5"
      >
        <User class="w-3.5 h-3.5" /> Про себе
      </p>
      <p class="text-sm text-muted-foreground leading-relaxed">{user.bio}</p>

      <div class="flex items-start justify-between gap-4">
        <span class="text-sm text-muted-foreground shrink-0">Категорії</span>
        <div class="flex flex-wrap gap-1.5 justify-end">
          {#each user.categories as cat}
            {@const IconComponent = iconMap[cat.icon]}
            <div
              class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 cursor-default whitespace-nowrap"
            >
              <IconComponent class="w-3 h-3" />
              {cat.name}
            </div>
          {/each}
        </div>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-sm text-muted-foreground">Досвід</span>
        <span class="text-sm text-foreground">{user.experience}</span>
      </div>

      <div class="flex items-start justify-between gap-4">
        <span class="text-sm text-muted-foreground shrink-0">Мови</span>
        <div class="flex gap-2 flex-wrap justify-end">
          {#each user.languages as lang}
            <span class="text-sm text-muted-foreground">{lang}</span>
          {/each}
        </div>
      </div>
    </div>

    <div class="border-t border-white/5" />

    <!-- Статистика -->
    <div class="py-5">
      <p
        class="text-[11px] font-medium text-muted-foreground tracking-widest uppercase mb-4 flex items-center gap-1.5"
      >
        <Zap class="w-3.5 h-3.5" /> Статистика
      </p>
      <div class="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div
          class="rounded-lg px-4 py-3 border border-white/5"
          style="background-color: rgba(255,255,255,0.05)"
        >
          <p
            class="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"
          >
            <Star class="w-3 h-3" /> Рейтинг
          </p>
          <p class="text-xl font-semibold text-foreground">
            {user.avgRating}
            <span class="text-sm font-normal text-muted-foreground">/ 5.0</span>
          </p>
        </div>
        <div
          class="rounded-lg px-4 py-3 border border-white/5"
          style="background-color: rgba(255,255,255,0.05)"
        >
          <p
            class="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"
          >
            <BadgeCheck class="w-3 h-3" /> Виконано
          </p>
          <p class="text-xl font-semibold text-foreground">
            {user.totalOrders}
            <span class="text-sm font-normal text-muted-foreground"
              >замовлень</span
            >
          </p>
        </div>
        <div
          class="rounded-lg px-4 py-3 border border-white/5"
          style="background-color: rgba(255,255,255,0.05)"
        >
          <p
            class="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"
          >
            <Clock class="w-3 h-3" /> Відповідь
          </p>
          <p class="text-xl font-semibold text-foreground">
            ~{user.responseTime}
            <span class="text-sm font-normal text-muted-foreground">год</span>
          </p>
        </div>
        <div
          class="rounded-lg px-4 py-3 border border-white/5"
          style="background-color: rgba(255,255,255,0.05)"
        >
          <p
            class="text-xs text-muted-foreground mb-1 flex items-center gap-1.5"
          >
            <RefreshCw class="w-3 h-3" /> Повторні
          </p>
          <p class="text-xl font-semibold text-foreground">
            {user.repeatClients}%
            <span class="text-sm font-normal text-muted-foreground"
              >клієнтів</span
            >
          </p>
        </div>
      </div>
      <div
        class="flex items-center justify-between px-4 py-3 rounded-lg border border-emerald-500/20"
        style="background-color: rgba(16,185,129,0.08)"
      >
        <span class="text-sm text-muted-foreground flex items-center gap-1.5">
          <BadgeCheck class="w-3.5 h-3.5 text-emerald-500" /> Успішних замовлень
        </span>
        <span class="text-sm font-semibold text-emerald-400"
          >{user.successRate}%</span
        >
      </div>
    </div>

    <div class="border-t border-white/5" />

    <!-- Послуги -->
    <div class="py-5">
      <p
        class="text-[11px] font-medium text-muted-foreground tracking-widest uppercase mb-4 flex items-center gap-1.5"
      >
        <Briefcase class="w-3.5 h-3.5" /> Послуги
      </p>
      <div class="divide-y divide-white/5">
        {#each user.gigs as gig}
          {@const IconComponent = iconMap[gig.icon]}
          <a
            href="/gigs/{gig.id}"
            class="flex items-center gap-4 py-3.5 hover:opacity-70 transition-opacity cursor-pointer group"
          >
            <div
              class="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 border border-white/10"
              style="background-color: rgba(255,255,255,0.05)"
            >
              <IconComponent class="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate text-foreground">
                {gig.title}
              </p>
              <p
                class="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"
              >
                <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
                {gig.rating} · {gig.orders} замовлень
              </p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="text-sm font-medium whitespace-nowrap text-primary">
                від {gig.price.toLocaleString('uk-UA')} грн
              </span>
              <ArrowUpRight
                class="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </a>
        {/each}
      </div>
    </div>

    <div class="border-t border-white/5" />

    <!-- Портфоліо -->
    <div class="py-5">
      <div class="flex items-center justify-between mb-4">
        <p
          class="text-[11px] font-medium text-muted-foreground tracking-widest uppercase flex items-center gap-1.5"
        >
          <ImageIcon class="w-3.5 h-3.5" /> Портфоліо
        </p>
        <a
          href={user.portfolioUrl}
          target="_blank"
          class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
        >
          {user.portfolioUrl.replace('https://', '')}
          <ExternalLink class="w-3 h-3" />
        </a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {#each user.portfolio as item}
          <div
            class="aspect-video rounded-xl overflow-hidden cursor-pointer group relative"
          >
            <img
              src={item.image}
              alt={item.title}
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div
              class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
            >
              <span class="text-white text-xs font-medium">{item.title}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <div class="border-t border-white/5" />

    <!-- Відгуки -->
    <div class="py-5 pb-32 sm:pb-10">
      <div class="flex items-center justify-between mb-6">
        <p
          class="text-[11px] font-medium text-muted-foreground tracking-widest uppercase flex items-center gap-1.5"
        >
          <MessageSquare class="w-3.5 h-3.5" /> Відгуки
        </p>
        <span class="text-xs text-muted-foreground flex items-center gap-1">
          <Star class="w-3 h-3 fill-amber-400 text-amber-400" />
          {user.avgRating} · {user.reviewsCount} відгуків
        </span>
      </div>
      <div class="divide-y divide-white/5">
        {#each user.reviews as review}
          <div class="py-5 first:pt-0">
            <div class="flex items-center gap-2 mb-2">
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 text-primary border border-white/10"
                style="background-color: rgba(255,255,255,0.05)"
              >
                {review.initials}
              </div>
              <span class="text-sm font-medium text-foreground"
                >{review.name}</span
              >
              <div class="flex ml-auto gap-0.5">
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
</div>
