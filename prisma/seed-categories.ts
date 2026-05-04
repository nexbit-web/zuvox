// prisma/seed-categories.ts
//
// Запуск:
//   npx tsx prisma/seed-categories.ts
//
// Idempotent: можна запускати кілька разів — використовує upsert.

import { PrismaClient } from '../src/generated/prisma/client'

// Импортируем типы опций (названия могут немного отличаться в зависимости от версии,
// обычно это PrismaClientOptions или Prisma.PrismaClientOptions)
const prisma = new PrismaClient({
  // Оставляем пустым, но теперь TS должен видеть это как инициализацию
} as any)

interface SeedService {
  slug: string
  name: string
  avgPriceCents?: number
}

interface SeedSubcategory {
  slug: string
  name: string
  icon?: string
  services: SeedService[]
}

interface SeedCategory {
  slug: string
  name: string
  description: string
  icon: string
  subcategories: SeedSubcategory[]
}

const CATEGORIES: SeedCategory[] = [
  {
    slug: 'design',
    name: 'Дизайн',
    description: 'Графіка, веб-дизайн, брендинг та ілюстрації',
    icon: 'Palette',
    subcategories: [
      {
        slug: 'web-design',
        name: 'Веб-дизайн',
        services: [
          { slug: 'landing-page', name: 'Лендінг', avgPriceCents: 1500_00 },
          {
            slug: 'corporate-site',
            name: 'Корпоративний сайт',
            avgPriceCents: 5000_00,
          },
          {
            slug: 'online-shop',
            name: 'Інтернет-магазин',
            avgPriceCents: 8000_00,
          },
          {
            slug: 'redesign',
            name: 'Редизайн існуючого сайту',
            avgPriceCents: 4000_00,
          },
        ],
      },
      {
        slug: 'logo-branding',
        name: 'Логотип і брендинг',
        services: [
          { slug: 'logo', name: 'Логотип', avgPriceCents: 1000_00 },
          {
            slug: 'brand-identity',
            name: 'Фірмовий стиль',
            avgPriceCents: 3500_00,
          },
          { slug: 'brand-book', name: 'Брендбук', avgPriceCents: 6000_00 },
        ],
      },
      {
        slug: 'ui-ux',
        name: 'UI/UX-дизайн',
        services: [
          {
            slug: 'mobile-app-design',
            name: 'Дизайн мобільного застосунку',
            avgPriceCents: 6000_00,
          },
          {
            slug: 'web-app-design',
            name: 'Дизайн веб-застосунку',
            avgPriceCents: 5000_00,
          },
          {
            slug: 'prototyping',
            name: 'Прототипування',
            avgPriceCents: 2000_00,
          },
        ],
      },
      {
        slug: 'graphic-design',
        name: 'Графічний дизайн',
        services: [
          { slug: 'banners', name: 'Банери та реклама', avgPriceCents: 500_00 },
          { slug: 'presentation', name: 'Презентація', avgPriceCents: 1500_00 },
          { slug: 'infographics', name: 'Інфографіка', avgPriceCents: 1000_00 },
          { slug: 'print-design', name: 'Поліграфія', avgPriceCents: 800_00 },
        ],
      },
      {
        slug: 'illustration',
        name: 'Ілюстрація',
        services: [
          {
            slug: 'character-illustration',
            name: 'Персонажі',
            avgPriceCents: 800_00,
          },
          {
            slug: 'children-illustration',
            name: 'Дитячі ілюстрації',
            avgPriceCents: 600_00,
          },
          { slug: 'icons', name: 'Іконки', avgPriceCents: 400_00 },
        ],
      },
    ],
  },
  {
    slug: 'development',
    name: 'Розробка',
    description: 'Сайти, застосунки, скрипти та автоматизація',
    icon: 'Code',
    subcategories: [
      {
        slug: 'web-development',
        name: 'Веб-розробка',
        services: [
          { slug: 'frontend', name: 'Frontend', avgPriceCents: 8000_00 },
          { slug: 'backend', name: 'Backend / API', avgPriceCents: 10000_00 },
          { slug: 'fullstack', name: 'Full-stack', avgPriceCents: 15000_00 },
          { slug: 'wordpress', name: 'WordPress', avgPriceCents: 3000_00 },
          {
            slug: 'tilda-no-code',
            name: 'Tilda / No-code',
            avgPriceCents: 2000_00,
          },
        ],
      },
      {
        slug: 'mobile-development',
        name: 'Мобільна розробка',
        services: [
          {
            slug: 'ios-android',
            name: 'iOS / Android',
            avgPriceCents: 25000_00,
          },
          {
            slug: 'react-native',
            name: 'React Native',
            avgPriceCents: 18000_00,
          },
          { slug: 'flutter', name: 'Flutter', avgPriceCents: 18000_00 },
        ],
      },
      {
        slug: 'automation',
        name: 'Автоматизація і боти',
        services: [
          {
            slug: 'telegram-bots',
            name: 'Telegram-боти',
            avgPriceCents: 2500_00,
          },
          {
            slug: 'scripts-scrapers',
            name: 'Скрипти та парсери',
            avgPriceCents: 1500_00,
          },
          {
            slug: 'integrations',
            name: 'Інтеграції API',
            avgPriceCents: 3000_00,
          },
        ],
      },
      {
        slug: 'data-ai',
        name: 'Дані та AI',
        services: [
          {
            slug: 'data-analysis',
            name: 'Аналіз даних',
            avgPriceCents: 4000_00,
          },
          {
            slug: 'machine-learning',
            name: 'Machine Learning',
            avgPriceCents: 12000_00,
          },
          {
            slug: 'ai-integration',
            name: 'GPT / AI інтеграції',
            avgPriceCents: 5000_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'marketing',
    name: 'Маркетинг',
    description: 'SMM, реклама, SEO та email-розсилки',
    icon: 'TrendingUp',
    subcategories: [
      {
        slug: 'smm',
        name: 'SMM і соцмережі',
        services: [
          {
            slug: 'instagram-management',
            name: 'Instagram-просування',
            avgPriceCents: 5000_00,
          },
          { slug: 'tiktok-management', name: 'TikTok', avgPriceCents: 6000_00 },
          {
            slug: 'content-plan',
            name: 'Контент-план',
            avgPriceCents: 1500_00,
          },
        ],
      },
      {
        slug: 'paid-ads',
        name: 'Платна реклама',
        services: [
          {
            slug: 'meta-ads',
            name: 'Facebook / Instagram Ads',
            avgPriceCents: 5000_00,
          },
          { slug: 'google-ads', name: 'Google Ads', avgPriceCents: 5000_00 },
          { slug: 'tiktok-ads', name: 'TikTok Ads', avgPriceCents: 4500_00 },
        ],
      },
      {
        slug: 'seo',
        name: 'SEO',
        services: [
          { slug: 'seo-audit', name: 'SEO-аудит', avgPriceCents: 3000_00 },
          {
            slug: 'seo-optimization',
            name: 'SEO-оптимізація',
            avgPriceCents: 6000_00,
          },
          {
            slug: 'link-building',
            name: 'Лінкбілдінг',
            avgPriceCents: 4000_00,
          },
        ],
      },
      {
        slug: 'email-marketing',
        name: 'Email-маркетинг',
        services: [
          {
            slug: 'email-strategy',
            name: 'Email-стратегія',
            avgPriceCents: 3000_00,
          },
          {
            slug: 'email-templates',
            name: 'Шаблони листів',
            avgPriceCents: 1500_00,
          },
          {
            slug: 'newsletters',
            name: 'Регулярні розсилки',
            avgPriceCents: 2500_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'copywriting',
    name: 'Тексти',
    description: 'Копірайтинг, переклади та редагування',
    icon: 'PenTool',
    subcategories: [
      {
        slug: 'copywriting',
        name: 'Копірайтинг',
        services: [
          {
            slug: 'website-texts',
            name: 'Тексти для сайту',
            avgPriceCents: 1000_00,
          },
          {
            slug: 'sales-copy',
            name: 'Продаючі тексти',
            avgPriceCents: 1500_00,
          },
          {
            slug: 'blog-articles',
            name: 'Статті для блогу',
            avgPriceCents: 600_00,
          },
        ],
      },
      {
        slug: 'translation',
        name: 'Переклад',
        services: [
          {
            slug: 'en-uk',
            name: 'Англійська ↔ Українська',
            avgPriceCents: 200_00,
          },
          {
            slug: 'pl-uk',
            name: 'Польська ↔ Українська',
            avgPriceCents: 250_00,
          },
          {
            slug: 'document-translation',
            name: 'Переклад документів',
            avgPriceCents: 500_00,
          },
        ],
      },
      {
        slug: 'editing',
        name: 'Редагування і коректура',
        services: [
          { slug: 'proofreading', name: 'Коректура', avgPriceCents: 200_00 },
          {
            slug: 'editing',
            name: 'Літературне редагування',
            avgPriceCents: 500_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'video-audio',
    name: 'Відео і аудіо',
    description: 'Монтаж, анімація, озвучка та музика',
    icon: 'Video',
    subcategories: [
      {
        slug: 'video-editing',
        name: 'Монтаж відео',
        services: [
          {
            slug: 'youtube-editing',
            name: 'Монтаж для YouTube',
            avgPriceCents: 1500_00,
          },
          {
            slug: 'reels-tiktok',
            name: 'Reels / TikTok',
            avgPriceCents: 800_00,
          },
          {
            slug: 'wedding-edit',
            name: 'Весільний монтаж',
            avgPriceCents: 3000_00,
          },
        ],
      },
      {
        slug: 'animation',
        name: 'Анімація',
        services: [
          { slug: '2d-animation', name: '2D анімація', avgPriceCents: 4000_00 },
          {
            slug: 'motion-graphics',
            name: 'Motion graphics',
            avgPriceCents: 3500_00,
          },
          {
            slug: 'logo-animation',
            name: 'Анімація логотипу',
            avgPriceCents: 1500_00,
          },
        ],
      },
      {
        slug: 'voice-music',
        name: 'Озвучка і музика',
        services: [
          {
            slug: 'voiceover',
            name: 'Озвучка реклами',
            avgPriceCents: 1000_00,
          },
          {
            slug: 'audio-editing',
            name: 'Зведення звуку',
            avgPriceCents: 800_00,
          },
          {
            slug: 'music-creation',
            name: 'Створення музики',
            avgPriceCents: 3000_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'business',
    name: 'Бізнес',
    description: 'Консалтинг, фінанси, документи та право',
    icon: 'Briefcase',
    subcategories: [
      {
        slug: 'consulting',
        name: 'Консалтинг',
        services: [
          {
            slug: 'business-plan',
            name: 'Бізнес-план',
            avgPriceCents: 5000_00,
          },
          {
            slug: 'strategy',
            name: 'Стратегічний консалтинг',
            avgPriceCents: 8000_00,
          },
        ],
      },
      {
        slug: 'finance',
        name: 'Фінанси',
        services: [
          {
            slug: 'accounting',
            name: 'Бухгалтерські послуги',
            avgPriceCents: 3000_00,
          },
          {
            slug: 'financial-planning',
            name: 'Фінансове планування',
            avgPriceCents: 4000_00,
          },
          {
            slug: 'tax-consulting',
            name: 'Податковий консалтинг',
            avgPriceCents: 2500_00,
          },
        ],
      },
      {
        slug: 'legal',
        name: 'Право',
        services: [
          {
            slug: 'contracts',
            name: 'Складання договорів',
            avgPriceCents: 1500_00,
          },
          {
            slug: 'legal-consulting',
            name: 'Юридичні консультації',
            avgPriceCents: 1000_00,
          },
          {
            slug: 'business-registration',
            name: 'Реєстрація ФОП/ТОВ',
            avgPriceCents: 2500_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'admin',
    name: 'Адміністрування',
    description: 'Віртуальні асистенти, ресерч, дата-енттрі',
    icon: 'ClipboardList',
    subcategories: [
      {
        slug: 'virtual-assistant',
        name: 'Віртуальний асистент',
        services: [
          {
            slug: 'va-general',
            name: 'Загальні задачі',
            avgPriceCents: 2500_00,
          },
          {
            slug: 'calendar-management',
            name: 'Управління календарем',
            avgPriceCents: 1500_00,
          },
        ],
      },
      {
        slug: 'data-entry',
        name: 'Робота з даними',
        services: [
          { slug: 'data-entry', name: 'Введення даних', avgPriceCents: 800_00 },
          {
            slug: 'research',
            name: 'Ресерч і збір інформації',
            avgPriceCents: 1200_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'photo',
    name: 'Фотографія',
    description: 'Зйомка, обробка, ретуш',
    icon: 'Camera',
    subcategories: [
      {
        slug: 'photo-shoot',
        name: 'Фотозйомка',
        services: [
          {
            slug: 'product-photo',
            name: 'Предметна зйомка',
            avgPriceCents: 2500_00,
          },
          {
            slug: 'portrait',
            name: 'Портретна зйомка',
            avgPriceCents: 2000_00,
          },
          { slug: 'event-photo', name: 'Зйомка подій', avgPriceCents: 3500_00 },
        ],
      },
      {
        slug: 'photo-editing',
        name: 'Обробка фото',
        services: [
          {
            slug: 'retouching',
            name: 'Ретуш портретів',
            avgPriceCents: 200_00,
          },
          {
            slug: 'color-grading',
            name: 'Колірна корекція',
            avgPriceCents: 150_00,
          },
          {
            slug: 'product-retouch',
            name: 'Ретуш товарів',
            avgPriceCents: 100_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'education',
    name: 'Освіта',
    description: 'Репетитори, навчання, курси',
    icon: 'GraduationCap',
    subcategories: [
      {
        slug: 'tutoring',
        name: 'Репетитори',
        services: [
          { slug: 'languages', name: 'Іноземні мови', avgPriceCents: 400_00 },
          { slug: 'math', name: 'Математика', avgPriceCents: 350_00 },
          { slug: 'programming', name: 'Програмування', avgPriceCents: 600_00 },
          {
            slug: 'preparation-zno',
            name: 'Підготовка до ЗНО/НМТ',
            avgPriceCents: 500_00,
          },
        ],
      },
    ],
  },
  {
    slug: 'home-services',
    name: 'Послуги',
    description: 'Ремонт, прибирання, побутові послуги',
    icon: 'Home',
    subcategories: [
      {
        slug: 'repair',
        name: 'Ремонт і будівництво',
        services: [
          { slug: 'electrician', name: 'Електрика', avgPriceCents: 800_00 },
          { slug: 'plumbing', name: 'Сантехніка', avgPriceCents: 800_00 },
          { slug: 'painting', name: 'Малярні роботи', avgPriceCents: 1500_00 },
        ],
      },
      {
        slug: 'cleaning',
        name: 'Прибирання',
        services: [
          {
            slug: 'apartment-cleaning',
            name: 'Прибирання квартир',
            avgPriceCents: 800_00,
          },
          {
            slug: 'office-cleaning',
            name: 'Прибирання офісів',
            avgPriceCents: 1500_00,
          },
        ],
      },
    ],
  },
]

async function seed() {
  console.log('🌱 Seeding categories…')

  for (let catIdx = 0; catIdx < CATEGORIES.length; catIdx++) {
    const cat = CATEGORIES[catIdx]

    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      create: {
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: catIdx,
        status: 'ACTIVE',
      },
      update: {
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: catIdx,
      },
    })

    console.log(`  ✓ ${category.name}`)

    for (let subIdx = 0; subIdx < cat.subcategories.length; subIdx++) {
      const sub = cat.subcategories[subIdx]

      const subcategory = await prisma.subcategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: category.id,
            slug: sub.slug,
          },
        },
        create: {
          categoryId: category.id,
          slug: sub.slug,
          name: sub.name,
          icon: sub.icon ?? null,
          sortOrder: subIdx,
          status: 'ACTIVE',
        },
        update: {
          name: sub.name,
          icon: sub.icon ?? null,
          sortOrder: subIdx,
        },
      })

      for (let srvIdx = 0; srvIdx < sub.services.length; srvIdx++) {
        const srv = sub.services[srvIdx]

        await prisma.service.upsert({
          where: {
            subcategoryId_slug: {
              subcategoryId: subcategory.id,
              slug: srv.slug,
            },
          },
          create: {
            subcategoryId: subcategory.id,
            slug: srv.slug,
            name: srv.name,
            avgPriceCents: srv.avgPriceCents ?? null,
            sortOrder: srvIdx,
            status: 'ACTIVE',
          },
          update: {
            name: srv.name,
            avgPriceCents: srv.avgPriceCents ?? null,
            sortOrder: srvIdx,
          },
        })
      }
    }
  }

  const totalCategories = await prisma.category.count()
  const totalSubcategories = await prisma.subcategory.count()
  const totalServices = await prisma.service.count()

  console.log('\n📊 Summary:')
  console.log(`   Categories:    ${totalCategories}`)
  console.log(`   Subcategories: ${totalSubcategories}`)
  console.log(`   Services:      ${totalServices}`)
  console.log('\n✅ Done!')
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
