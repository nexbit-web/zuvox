<!-- src/routes/(app)/+page.svelte -->
<script lang="ts">
  import { Search, Star, ArrowRight, TrendingUp, Shield, Zap, Clock } from 'lucide-svelte'
  import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar'
  import { Button } from '$lib/components/ui/button'

  const stats = [
    { value: '12 400+', label: 'Фрілансерів' },
    { value: '8 200+', label: 'Виконаних замовлень' },
    { value: '98%', label: 'Задоволених клієнтів' },
    { value: '4.9', label: 'Середній рейтинг' },
  ]

  const categories = [
    { icon: '💻', name: 'Веб-розробка', count: 1240, href: '/gigs?category=Веб-розробка' },
    { icon: '🎨', name: 'UI/UX Дизайн', count: 890, href: '/gigs?category=UI/UX Дизайн' },
    { icon: '📱', name: 'Мобільні застосунки', count: 430, href: '/gigs?category=Мобільні застосунки' },
    { icon: '📈', name: 'SEO та маркетинг', count: 560, href: '/gigs?category=SEO та маркетинг' },
    { icon: '✍️', name: 'Копірайтинг', count: 780, href: '/gigs?category=Копірайтинг' },
    { icon: '🎬', name: 'Відео та анімація', count: 320, href: '/gigs?category=Відео та анімація' },
    { icon: '📷', name: 'Фото та графіка', count: 410, href: '/gigs?category=Фото та графіка' },
    { icon: '💼', name: 'Бізнес-послуги', count: 290, href: '/gigs?category=Бізнес-послуги' },
    { icon: '🎓', name: 'Освіта та навчання', count: 380, href: '/gigs?category=Освіта та навчання' },
    { icon: '🎵', name: 'Аудіо та музика', count: 210, href: '/gigs?category=Аудіо та музика' },
  ]

  const popularGigs = [
    { id: '1', title: 'Розробка лендінгу на SvelteKit', category: 'Веб-розробка', price: 2500, rating: 5.0, reviews: 48, author: { name: 'Олексій К.', avatar: '', initials: 'ОК' }, tags: ['SvelteKit', 'TypeScript'] },
    { id: '2', title: 'UI/UX дизайн у Figma', category: 'UI/UX Дизайн', price: 1800, rating: 4.9, reviews: 34, author: { name: 'Марина С.', avatar: '', initials: 'МС' }, tags: ['Figma', 'Mobile'] },
    { id: '3', title: 'SEO просування сайту', category: 'SEO та маркетинг', price: 3500, rating: 4.8, reviews: 67, author: { name: 'Денис П.', avatar: '', initials: 'ДП' }, tags: ['SEO', 'Google'] },
    { id: '4', title: 'Розробка мобільного застосунку', category: 'Мобільні застосунки', price: 8000, rating: 5.0, reviews: 22, author: { name: 'Сергій М.', avatar: '', initials: 'СМ' }, tags: ['Flutter', 'iOS'] },
    { id: '5', title: 'Копірайтинг для бізнесу', category: 'Копірайтинг', price: 800, rating: 4.7, reviews: 91, author: { name: 'Олена Б.', avatar: '', initials: 'ОБ' }, tags: ['SEO-текст', 'Блог'] },
    { id: '6', title: 'Монтаж відео для YouTube', category: 'Відео та анімація', price: 1200, rating: 4.9, reviews: 55, author: { name: 'Андрій М.', avatar: '', initials: 'АМ' }, tags: ['Premiere', 'After Effects'] },
  ]

  const topFreelancers = [
    { id: '1', name: 'Олексій Коваль', role: 'Full-stack розробник', rating: 5.0, reviews: 248, avatar: '', initials: 'ОК', isTop: true },
    { id: '2', name: 'Марина Сидоренко', role: 'UI/UX Дизайнер', rating: 4.9, reviews: 184, avatar: '', initials: 'МС', isTop: true },
    { id: '3', name: 'Денис Петров', role: 'SEO спеціаліст', rating: 4.8, reviews: 312, avatar: '', initials: 'ДП', isTop: false },
    { id: '4', name: 'Олена Бондаренко', role: 'Копірайтер', rating: 4.9, reviews: 156, avatar: '', initials: 'ОБ', isTop: true },
  ]

  const howItWorks = [
    { icon: Search, step: '01', title: 'Знайдіть послугу', desc: 'Переглядайте тисячі гігів або опишіть що вам потрібно' },
    { icon: Shield, step: '02', title: 'Замовте безпечно', desc: 'Оплата зберігається у нас до виконання роботи' },
    { icon: Zap, step: '03', title: 'Отримайте результат', desc: 'Фрілансер виконує роботу і ви підтверджуєте якість' },
  ]

  let searchValue = $state('')
  let activeCategory = $state<string | null>(null)

  const filteredGigs = $derived(
    activeCategory
      ? popularGigs.filter(g => g.category === activeCategory)
      : popularGigs
  )
</script>

<!-- ═══ БАНЕР ═══ -->
<section style="background-color: var(--bg-header)" class="relative overflow-hidden">

  <!-- Декоративні кола -->
  <div class="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5 blur-3xl" style="background: var(--primary); transform: translate(30%, -30%)"></div>
  <div class="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-5 blur-3xl" style="background: var(--primary); transform: translate(-30%, 30%)"></div>

  <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 md:py-24 relative z-10">
    <div class="max-w-2xl">

      <!-- Бейдж -->
      <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6 border" style="background-color: color-mix(in oklch, var(--primary) 10%, transparent); border-color: color-mix(in oklch, var(--primary) 20%, transparent); color: var(--primary)">
        <TrendingUp class="w-3 h-3" />
        Платформа для фрілансерів та клієнтів
      </div>

      <!-- Заголовок -->
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-4" style="color: var(--foreground)">
        Знайдіть ідеального
        <span style="color: var(--primary)"> фрілансера</span>
        <br />для вашого проєкту
      </h1>

      <p class="text-lg mb-8 leading-relaxed" style="color: var(--muted-foreground)">
        Тисячі перевірених спеціалістів готові допомогти з будь-яким завданням. Швидко, якісно, безпечно.
      </p>

      <!-- Пошук -->
      <div class="flex gap-2 mb-8">
        <div
          class="flex-1 flex items-center gap-3 h-12 px-4 rounded-xl border"
          style="background-color: color-mix(in oklch, var(--foreground) 5%, transparent); border-color: color-mix(in oklch, var(--foreground) 10%, transparent)"
        >
          <Search class="w-4 h-4 shrink-0" style="color: var(--muted-foreground)" />
          <input
            bind:value={searchValue}
            type="text"
            placeholder="Яку послугу шукаєте?"
            class="flex-1 bg-transparent outline-none text-sm"
            style="color: var(--foreground)"
          />
        </div>
        <Button href="/gigs" class="h-12 px-6 rounded-xl text-sm font-medium shrink-0">
          Знайти
        </Button>
      </div>

      <!-- Популярні запити -->
      <div class="flex flex-wrap gap-2">
        <span class="text-xs" style="color: var(--muted-foreground)">Популярне:</span>
        {#each ['Лендінг', 'Логотип', 'SEO', 'Мобільний застосунок', 'Відео'] as tag}
          <a
            href="/gigs?q={tag}"
            class="text-xs px-2.5 py-1 rounded-full border transition-colors hover:opacity-80"
            style="border-color: color-mix(in oklch, var(--foreground) 15%, transparent); color: var(--muted-foreground)"
          >
            {tag}
          </a>
        {/each}
      </div>

    </div>
  </div>

  <!-- Статистика -->
  <div class="border-t" style="border-color: color-mix(in oklch, var(--foreground) 8%, transparent)">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
      {#each stats as stat}
        <div class="text-center">
          <p class="text-2xl font-bold" style="color: var(--foreground)">{stat.value}</p>
          <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">{stat.label}</p>
        </div>
      {/each}
    </div>
  </div>

</section>

<!-- ═══ КАТЕГОРІЇ ═══ -->
<section class="py-14" style="background-color: var(--background)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">

    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--foreground)">Категорії послуг</h2>
        <p class="text-sm mt-1" style="color: var(--muted-foreground)">Знайдіть спеціаліста в будь-якій сфері</p>
      </div>
      <a href="/gigs" class="text-sm font-medium flex items-center gap-1 hover:opacity-70 transition-opacity" style="color: var(--primary)">
        Всі категорії <ArrowRight class="w-4 h-4" />
      </a>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {#each categories as cat}
        <a
          href={cat.href}
          class="group flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer"
          style="background-color: var(--bg-header); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
          onmouseenter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'}
          onmouseleave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in oklch, var(--foreground) 8%, transparent)'}
        >
          <span class="text-3xl">{cat.icon}</span>
          <div class="text-center">
            <p class="text-sm font-medium leading-tight" style="color: var(--foreground)">{cat.name}</p>
            <p class="text-xs mt-0.5" style="color: var(--muted-foreground)">{cat.count} гігів</p>
          </div>
        </a>
      {/each}
    </div>

  </div>
</section>

<!-- ═══ ПОПУЛЯРНІ ГІГИ ═══ -->
<section class="py-14" style="background-color: var(--bg-header)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">

    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--foreground)">Популярні послуги</h2>
        <p class="text-sm mt-1" style="color: var(--muted-foreground)">Найзатребуваніші гіги прямо зараз</p>
      </div>
      <a href="/gigs" class="text-sm font-medium flex items-center gap-1 hover:opacity-70 transition-opacity" style="color: var(--primary)">
        Всі гіги <ArrowRight class="w-4 h-4" />
      </a>
    </div>

    <!-- Фільтр категорій -->
    <div class="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
      <button
        type="button"
        onclick={() => activeCategory = null}
        class="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border"
        style="background-color: {activeCategory === null ? 'var(--primary)' : 'transparent'}; color: {activeCategory === null ? 'white' : 'var(--muted-foreground)'}; border-color: {activeCategory === null ? 'var(--primary)' : 'color-mix(in oklch, var(--foreground) 15%, transparent)'}"
      >
        Всі
      </button>
      {#each categories.slice(0, 6) as cat}
        <button
          type="button"
          onclick={() => activeCategory = cat.name}
          class="shrink-0 px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border whitespace-nowrap"
          style="background-color: {activeCategory === cat.name ? 'var(--primary)' : 'transparent'}; color: {activeCategory === cat.name ? 'white' : 'var(--muted-foreground)'}; border-color: {activeCategory === cat.name ? 'var(--primary)' : 'color-mix(in oklch, var(--foreground) 15%, transparent)'}"
        >
          {cat.icon} {cat.name}
        </button>
      {/each}
    </div>

    <!-- Картки гігів -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {#each filteredGigs as gig}
        <a
          href="/gigs/{gig.id}"
          class="group flex flex-col rounded-2xl border overflow-hidden transition-all hover:shadow-lg cursor-pointer"
          style="background-color: var(--background); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
          onmouseenter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in oklch, var(--primary) 40%, transparent)'}
          onmouseleave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in oklch, var(--foreground) 8%, transparent)'}
        >

          <!-- Плейсхолдер зображення -->
          <div class="h-40 relative overflow-hidden" style="background: linear-gradient(135deg, color-mix(in oklch, var(--primary) 15%, transparent), color-mix(in oklch, var(--primary) 5%, transparent))">
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-5xl opacity-30">
                {categories.find(c => c.name === gig.category)?.icon ?? '💼'}
              </span>
            </div>
            <!-- Категорія -->
            <div class="absolute top-3 left-3">
              <span class="text-[10px] font-medium px-2 py-0.5 rounded-full" style="background-color: color-mix(in oklch, var(--primary) 20%, transparent); color: var(--primary)">
                {gig.category}
              </span>
            </div>
          </div>

          <div class="p-4 flex flex-col gap-3 flex-1">

            <!-- Автор -->
            <div class="flex items-center gap-2">
              <Avatar class="h-6 w-6">
                <AvatarImage src={gig.author.avatar} alt={gig.author.name} />
                <AvatarFallback class="text-[9px] font-semibold" style="background-color: color-mix(in oklch, var(--primary) 15%, transparent); color: var(--primary)">
                  {gig.author.initials}
                </AvatarFallback>
              </Avatar>
              <span class="text-xs" style="color: var(--muted-foreground)">{gig.author.name}</span>
            </div>

            <!-- Назва -->
            <h3 class="text-sm font-semibold leading-snug line-clamp-2 flex-1" style="color: var(--foreground)">
              {gig.title}
            </h3>

            <!-- Теги -->
            <div class="flex flex-wrap gap-1">
              {#each gig.tags as tag}
                <span class="text-[10px] px-2 py-0.5 rounded-full" style="background-color: color-mix(in oklch, var(--foreground) 6%, transparent); color: var(--muted-foreground)">
                  {tag}
                </span>
              {/each}
            </div>

            <!-- Рейтинг + ціна -->
            <div class="flex items-center justify-between pt-2 border-t" style="border-color: color-mix(in oklch, var(--foreground) 6%, transparent)">
              <div class="flex items-center gap-1">
                <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span class="text-xs font-medium" style="color: var(--foreground)">{gig.rating}</span>
                <span class="text-xs" style="color: var(--muted-foreground)">({gig.reviews})</span>
              </div>
              <div class="text-right">
                <span class="text-xs" style="color: var(--muted-foreground)">від </span>
                <span class="text-sm font-bold" style="color: var(--primary)">{gig.price.toLocaleString('uk-UA')} грн</span>
              </div>
            </div>

          </div>
        </a>
      {/each}
    </div>

  </div>
</section>

<!-- ═══ ЯК ЦЕ ПРАЦЮЄ ═══ -->
<section class="py-14" style="background-color: var(--background)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">

    <div class="text-center mb-10">
      <h2 class="text-2xl font-bold mb-2" style="color: var(--foreground)">Як це працює</h2>
      <p class="text-sm" style="color: var(--muted-foreground)">Три простих кроки до результату</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      {#each howItWorks as step}
        <div class="relative flex flex-col items-center text-center p-6 rounded-2xl border" style="background-color: var(--bg-header); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style="background-color: color-mix(in oklch, var(--primary) 10%, transparent)">
            <step.icon class="w-5 h-5" style="color: var(--primary)" />
          </div>
          <span class="text-xs font-bold mb-2" style="color: var(--primary)">{step.step}</span>
          <h3 class="text-base font-semibold mb-2" style="color: var(--foreground)">{step.title}</h3>
          <p class="text-sm leading-relaxed" style="color: var(--muted-foreground)">{step.desc}</p>
        </div>
      {/each}
    </div>

  </div>
</section>

<!-- ═══ ТОП ФРІЛАНСЕРИ ═══ -->
<section class="py-14" style="background-color: var(--bg-header)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">

    <div class="flex items-center justify-between mb-8">
      <div>
        <h2 class="text-2xl font-bold" style="color: var(--foreground)">Топ фрілансери</h2>
        <p class="text-sm mt-1" style="color: var(--muted-foreground)">Перевірені спеціалісти з найкращими відгуками</p>
      </div>
      <a href="/freelancers" class="text-sm font-medium flex items-center gap-1 hover:opacity-70 transition-opacity" style="color: var(--primary)">
        Всі фрілансери <ArrowRight class="w-4 h-4" />
      </a>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {#each topFreelancers as freelancer}
        <a
          href="/profile/{freelancer.id}"
          class="flex flex-col items-center text-center p-5 rounded-2xl border transition-all hover:shadow-md cursor-pointer"
          style="background-color: var(--background); border-color: color-mix(in oklch, var(--foreground) 8%, transparent)"
          onmouseenter={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in oklch, var(--primary) 40%, transparent)'}
          onmouseleave={(e) => (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in oklch, var(--foreground) 8%, transparent)'}
        >
          <div class="relative mb-3">
            <Avatar class="h-16 w-16">
              <AvatarImage src={freelancer.avatar} alt={freelancer.name} />
              <AvatarFallback class="text-lg font-semibold" style="background-color: color-mix(in oklch, var(--primary) 15%, transparent); color: var(--primary)">
                {freelancer.initials}
              </AvatarFallback>
            </Avatar>
            {#if freelancer.isTop}
              <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px]" style="background-color: var(--primary); color: white">
                ★
              </div>
            {/if}
          </div>

          <h3 class="text-sm font-semibold mb-0.5" style="color: var(--foreground)">{freelancer.name}</h3>
          <p class="text-xs mb-3" style="color: var(--muted-foreground)">{freelancer.role}</p>

          <div class="flex items-center gap-1">
            <Star class="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span class="text-xs font-medium" style="color: var(--foreground)">{freelancer.rating}</span>
            <span class="text-xs" style="color: var(--muted-foreground)">· {freelancer.reviews} відгуків</span>
          </div>
        </a>
      {/each}
    </div>

  </div>
</section>

<!-- ═══ CTA БЛОК ═══ -->
<section class="py-14" style="background-color: var(--background)">
  <div class="max-w-6xl mx-auto px-4 sm:px-6">
    <div class="relative overflow-hidden rounded-3xl p-8 md:p-12 text-center" style="background: linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--primary) 70%, oklch(0.5 0.2 280)))">

      <!-- Декор -->
      <div class="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10 blur-3xl bg-white" style="transform: translate(20%, -20%)"></div>
      <div class="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-10 blur-3xl bg-white" style="transform: translate(-20%, 20%)"></div>

      <div class="relative z-10">
        <h2 class="text-2xl md:text-3xl font-bold text-white mb-3">
          Готові розпочати?
        </h2>
        <p class="text-white/70 mb-8 text-sm md:text-base max-w-md mx-auto">
          Приєднуйтесь до тисяч клієнтів і фрілансерів які вже працюють на Zuvox
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/register"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 cursor-pointer"
            style="background-color: white; color: var(--primary)"
          >
            Знайти фрілансера
          </a>
          <a
            href="/register?role=freelancer"
            class="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border-2 border-white/30 text-white transition-all hover:bg-white/10 cursor-pointer"
          >
            Стати фрілансером
          </a>
        </div>
      </div>

    </div>
  </div>
</section>

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>