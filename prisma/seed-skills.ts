// prisma/seed-skills.ts
//
// Запуск:
//   npx tsx prisma/seed-skills.ts
//
// Вимагає: вже засіяні Categories (seed-categories.ts).
// Idempotent: можна запускати кілька разів — використовує upsert.

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL не знайдено в .env')
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

interface SeedSkill {
  slug: string
  name: string
}

// Карта: slug категорії → список навичок
// const SKILLS_BY_CATEGORY: Record<string, SeedSkill[]> = {
//   // ─────────────────────────────────────────────
//   // ДИЗАЙН
//   // ─────────────────────────────────────────────
//   design: [
//     { slug: 'figma', name: 'Figma' },
//     { slug: 'adobe-photoshop', name: 'Adobe Photoshop' },
//     { slug: 'adobe-illustrator', name: 'Adobe Illustrator' },
//     { slug: 'adobe-indesign', name: 'Adobe InDesign' },
//     { slug: 'adobe-xd', name: 'Adobe XD' },
//     { slug: 'sketch', name: 'Sketch' },
//     { slug: 'canva', name: 'Canva' },
//     { slug: 'after-effects', name: 'After Effects' },
//     { slug: 'procreate', name: 'Procreate' },
//     { slug: 'cinema-4d', name: 'Cinema 4D' },
//     { slug: 'blender-design', name: 'Blender' },
//     { slug: 'webflow', name: 'Webflow' },
//     { slug: 'logo-design-skill', name: 'Дизайн логотипів' },
//     { slug: 'branding-design-skill', name: 'Брендинг' },
//     { slug: 'ui-design-skill', name: 'UI-дизайн' },
//     { slug: 'ux-research', name: 'UX-дослідження' },
//     { slug: 'wireframing', name: 'Wireframing' },
//     { slug: 'design-systems', name: 'Дизайн-системи' },
//     { slug: 'typography', name: 'Типографіка' },
//     { slug: 'color-theory', name: 'Колористика' },
//     { slug: 'illustration-digital', name: 'Цифрова ілюстрація' },
//     { slug: 'illustration-vector', name: 'Векторна графіка' },
//   ],

//   // ─────────────────────────────────────────────
//   // РОЗРОБКА
//   // ─────────────────────────────────────────────
//   development: [
//     // Frontend
//     { slug: 'html-css', name: 'HTML / CSS' },
//     { slug: 'javascript', name: 'JavaScript' },
//     { slug: 'typescript', name: 'TypeScript' },
//     { slug: 'react', name: 'React' },
//     { slug: 'vue', name: 'Vue.js' },
//     { slug: 'svelte', name: 'Svelte / SvelteKit' },
//     { slug: 'angular', name: 'Angular' },
//     { slug: 'nextjs', name: 'Next.js' },
//     { slug: 'tailwind', name: 'Tailwind CSS' },
//     { slug: 'nuxt', name: 'Nuxt' },

//     // Backend
//     { slug: 'nodejs', name: 'Node.js' },
//     { slug: 'python', name: 'Python' },
//     { slug: 'django', name: 'Django' },
//     { slug: 'fastapi', name: 'FastAPI' },
//     { slug: 'php', name: 'PHP' },
//     { slug: 'laravel', name: 'Laravel' },
//     { slug: 'go', name: 'Go' },
//     { slug: 'rust', name: 'Rust' },
//     { slug: 'java', name: 'Java' },
//     { slug: 'csharp', name: 'C#' },
//     { slug: 'dotnet', name: '.NET' },
//     { slug: 'ruby-on-rails', name: 'Ruby on Rails' },

//     // БД / DevOps
//     { slug: 'postgresql', name: 'PostgreSQL' },
//     { slug: 'mysql', name: 'MySQL' },
//     { slug: 'mongodb', name: 'MongoDB' },
//     { slug: 'redis', name: 'Redis' },
//     { slug: 'docker', name: 'Docker' },
//     { slug: 'kubernetes', name: 'Kubernetes' },
//     { slug: 'aws', name: 'AWS' },
//     { slug: 'gcp', name: 'Google Cloud' },
//     { slug: 'cicd', name: 'CI/CD' },

//     // Mobile
//     { slug: 'react-native-skill', name: 'React Native' },
//     { slug: 'flutter-skill', name: 'Flutter' },
//     { slug: 'swift', name: 'Swift / iOS' },
//     { slug: 'kotlin', name: 'Kotlin / Android' },

//     // Інше
//     { slug: 'wordpress-dev', name: 'WordPress' },
//     { slug: 'shopify', name: 'Shopify' },
//     { slug: 'rest-api', name: 'REST API' },
//     { slug: 'graphql', name: 'GraphQL' },
//     { slug: 'web-scraping', name: 'Web scraping' },
//     { slug: 'telegram-bot-dev', name: 'Telegram Bot API' },
//   ],

//   // ─────────────────────────────────────────────
//   // МАРКЕТИНГ
//   // ─────────────────────────────────────────────
//   marketing: [
//     { slug: 'meta-ads-skill', name: 'Facebook / Instagram Ads' },
//     { slug: 'google-ads-skill', name: 'Google Ads' },
//     { slug: 'tiktok-ads-skill', name: 'TikTok Ads' },
//     { slug: 'google-analytics', name: 'Google Analytics 4' },
//     { slug: 'gtm', name: 'Google Tag Manager' },
//     { slug: 'meta-pixel', name: 'Meta Pixel' },
//     { slug: 'seo-skill', name: 'SEO-оптимізація' },
//     { slug: 'seo-audit-skill', name: 'SEO-аудит' },
//     { slug: 'link-building-skill', name: 'Лінкбілдинг' },
//     { slug: 'ahrefs', name: 'Ahrefs' },
//     { slug: 'semrush', name: 'SEMrush' },
//     { slug: 'serpstat', name: 'Serpstat' },
//     { slug: 'instagram-skill', name: 'Instagram-просування' },
//     { slug: 'tiktok-skill', name: 'TikTok-просування' },
//     { slug: 'content-marketing', name: 'Контент-маркетинг' },
//     { slug: 'content-plan-skill', name: 'Контент-план' },
//     { slug: 'email-marketing-skill', name: 'Email-маркетинг' },
//     { slug: 'mailchimp', name: 'Mailchimp' },
//     { slug: 'sendpulse', name: 'SendPulse' },
//     { slug: 'crm-setup', name: 'Налаштування CRM' },
//     { slug: 'lead-generation', name: 'Лідогенерація' },
//     { slug: 'a-b-testing', name: 'A/B-тестування' },
//     { slug: 'landing-optimization', name: 'Оптимізація конверсій' },
//   ],

//   // ─────────────────────────────────────────────
//   // ТЕКСТИ
//   // ─────────────────────────────────────────────
//   copywriting: [
//     { slug: 'sales-copywriting', name: 'Продаючі тексти' },
//     { slug: 'web-copywriting', name: 'Тексти для сайтів' },
//     { slug: 'blog-writing', name: 'Статті для блогу' },
//     { slug: 'longread', name: 'Лонгріди' },
//     { slug: 'email-copywriting', name: 'Email-копірайтинг' },
//     { slug: 'social-media-copy', name: 'Тексти для соцмереж' },
//     { slug: 'seo-copywriting', name: 'SEO-копірайтинг' },
//     { slug: 'storytelling', name: 'Сторітелінг' },
//     { slug: 'press-release', name: 'Прес-релізи' },
//     { slug: 'translation-en-uk', name: 'Переклад EN ↔ UK' },
//     { slug: 'translation-pl-uk', name: 'Переклад PL ↔ UK' },
//     { slug: 'translation-de-uk', name: 'Переклад DE ↔ UK' },
//     { slug: 'document-translation-skill', name: 'Переклад документів' },
//     { slug: 'technical-translation', name: 'Технічний переклад' },
//     { slug: 'literary-translation', name: 'Художній переклад' },
//     { slug: 'proofreading-skill', name: 'Коректура' },
//     { slug: 'editing-skill', name: 'Літературне редагування' },
//     { slug: 'transcription', name: 'Транскрибація' },
//     { slug: 'subtitles', name: 'Створення субтитрів' },
//   ],

//   // ─────────────────────────────────────────────
//   // ВІДЕО І АУДІО
//   // ─────────────────────────────────────────────
//   'video-audio': [
//     { slug: 'premiere-pro', name: 'Adobe Premiere Pro' },
//     { slug: 'davinci-resolve', name: 'DaVinci Resolve' },
//     { slug: 'final-cut-pro', name: 'Final Cut Pro' },
//     { slug: 'after-effects-skill', name: 'After Effects' },
//     { slug: 'capcut', name: 'CapCut' },
//     { slug: 'youtube-editing-skill', name: 'Монтаж для YouTube' },
//     { slug: 'reels-editing', name: 'Монтаж Reels / Shorts / TikTok' },
//     { slug: 'wedding-editing', name: 'Весільний монтаж' },
//     { slug: 'color-grading-skill', name: 'Колірна корекція' },
//     { slug: 'motion-graphics-skill', name: 'Motion graphics' },
//     { slug: 'animation-2d', name: '2D-анімація' },
//     { slug: 'animation-3d', name: '3D-анімація' },
//     { slug: 'logo-animation-skill', name: 'Анімація логотипу' },
//     { slug: 'voiceover-skill', name: 'Озвучка / диктор' },
//     { slug: 'sound-design', name: 'Саунд-дизайн' },
//     { slug: 'audio-mixing', name: 'Зведення звуку' },
//     { slug: 'audio-mastering', name: 'Мастерінг' },
//     { slug: 'music-production', name: 'Створення музики' },
//     { slug: 'podcast-editing', name: 'Монтаж подкастів' },
//     { slug: 'noise-removal', name: 'Чистка звуку від шуму' },
//   ],

//   // ─────────────────────────────────────────────
//   // БІЗНЕС
//   // ─────────────────────────────────────────────
//   business: [
//     { slug: 'business-planning', name: 'Бізнес-планування' },
//     { slug: 'financial-modeling', name: 'Фінансове моделювання' },
//     { slug: 'unit-economics', name: 'Юніт-економіка' },
//     { slug: 'strategy-consulting-skill', name: 'Стратегічний консалтинг' },
//     { slug: 'market-research', name: 'Дослідження ринку' },
//     { slug: 'competitive-analysis', name: 'Конкурентний аналіз' },
//     { slug: 'pitch-deck', name: 'Pitch deck для інвесторів' },
//     { slug: 'accounting-skill', name: 'Бухгалтерський облік' },
//     { slug: '1c-accounting', name: '1С-Бухгалтерія' },
//     { slug: 'medoc', name: 'M.E.Doc' },
//     { slug: 'tax-planning-skill', name: 'Податкове планування' },
//     { slug: 'fop-registration', name: 'Реєстрація ФОП' },
//     { slug: 'tov-registration', name: 'Реєстрація ТОВ' },
//     { slug: 'contract-drafting', name: 'Складання договорів' },
//     { slug: 'labor-law', name: 'Трудове право' },
//     { slug: 'corporate-law', name: 'Корпоративне право' },
//     { slug: 'gdpr-consulting', name: 'GDPR-консалтинг' },
//     { slug: 'court-representation', name: 'Представництво в суді' },
//   ],

//   // ─────────────────────────────────────────────
//   // АДМІНІСТРУВАННЯ
//   // ─────────────────────────────────────────────
//   admin: [
//     { slug: 'virtual-assistant-skill', name: 'Віртуальний асистент' },
//     { slug: 'calendar-management-skill', name: 'Управління календарем' },
//     { slug: 'email-management', name: 'Управління поштою' },
//     { slug: 'travel-planning', name: 'Планування поїздок' },
//     { slug: 'data-entry-skill', name: 'Введення даних' },
//     { slug: 'web-research', name: 'Ресерч в інтернеті' },
//     { slug: 'lead-research', name: 'Збір контактів / лідів' },
//     { slug: 'excel-google-sheets', name: 'Excel / Google Sheets' },
//     { slug: 'notion', name: 'Notion' },
//     { slug: 'airtable', name: 'Airtable' },
//     { slug: 'trello-asana', name: 'Trello / Asana' },
//     { slug: 'monday', name: 'Monday.com' },
//     { slug: 'crm-management', name: 'Робота з CRM' },
//     { slug: 'document-formatting', name: 'Форматування документів' },
//     { slug: 'powerpoint-presentations', name: 'Презентації PowerPoint' },
//   ],

//   // ─────────────────────────────────────────────
//   // ФОТОГРАФІЯ
//   // ─────────────────────────────────────────────
//   photo: [
//     { slug: 'product-photography', name: 'Предметна зйомка' },
//     { slug: 'portrait-photography', name: 'Портретна зйомка' },
//     { slug: 'event-photography', name: 'Зйомка подій' },
//     { slug: 'wedding-photography', name: 'Весільна фотозйомка' },
//     { slug: 'family-photography', name: 'Сімейна фотозйомка' },
//     { slug: 'food-photography', name: 'Фуд-фотографія' },
//     { slug: 'fashion-photography', name: 'Fashion-фотографія' },
//     { slug: 'real-estate-photography', name: 'Зйомка нерухомості' },
//     { slug: 'aerial-photography', name: 'Аерозйомка з дрону' },
//     { slug: 'studio-lighting', name: 'Студійне світло' },
//     { slug: 'lightroom', name: 'Adobe Lightroom' },
//     { slug: 'capture-one', name: 'Capture One' },
//     { slug: 'retouching-skill', name: 'Ретуш портретів' },
//     { slug: 'product-retouching', name: 'Ретуш товарів' },
//     { slug: 'beauty-retouching', name: 'Beauty-ретуш' },
//     { slug: 'photo-restoration', name: 'Реставрація старих фото' },
//     { slug: 'background-removal', name: 'Видалення фону' },
//   ],

//   // ─────────────────────────────────────────────
//   // ОСВІТА
//   // ─────────────────────────────────────────────
//   education: [
//     { slug: 'tutor-english', name: 'Англійська мова' },
//     { slug: 'tutor-german', name: 'Німецька мова' },
//     { slug: 'tutor-polish', name: 'Польська мова' },
//     { slug: 'tutor-french', name: 'Французька мова' },
//     { slug: 'tutor-spanish', name: 'Іспанська мова' },
//     { slug: 'tutor-ukrainian', name: 'Українська мова та література' },
//     { slug: 'tutor-math', name: 'Математика' },
//     { slug: 'tutor-physics', name: 'Фізика' },
//     { slug: 'tutor-chemistry', name: 'Хімія' },
//     { slug: 'tutor-biology', name: 'Біологія' },
//     { slug: 'tutor-history', name: 'Історія України' },
//     { slug: 'tutor-programming', name: 'Програмування' },
//     { slug: 'tutor-zno', name: 'Підготовка до ЗНО / НМТ' },
//     { slug: 'tutor-ielts', name: 'Підготовка до IELTS' },
//     { slug: 'tutor-toefl', name: 'Підготовка до TOEFL' },
//     { slug: 'tutor-children', name: 'Заняття з дітьми' },
//     { slug: 'online-teaching', name: 'Онлайн-викладання' },
//   ],

//   // ─────────────────────────────────────────────
//   // ПОСЛУГИ (домашні / побутові)
//   // ─────────────────────────────────────────────
//   'home-services': [
//     // Сантехніка
//     { slug: 'plumbing-install-hs', name: 'Установка сантехніки' },
//     { slug: 'pipe-replacement-hs', name: 'Заміна труб' },
//     { slug: 'leak-repair-hs', name: 'Усунення протікань' },
//     { slug: 'water-heater-install-hs', name: 'Монтаж бойлерів' },
//     { slug: 'mixer-install-hs', name: 'Установка змішувачів' },
//     { slug: 'toilet-install-hs', name: 'Установка унітазів' },
//     { slug: 'sewer-cleaning-hs', name: 'Прочистка каналізації' },

//     // Електрика
//     { slug: 'electrical-wiring-hs', name: 'Прокладка проводки' },
//     { slug: 'socket-install-hs', name: 'Установка розеток і вимикачів' },
//     { slug: 'lighting-install-hs', name: 'Монтаж освітлення' },
//     { slug: 'electrical-panel-hs', name: 'Збірка електрощитів' },
//     { slug: 'short-circuit-fix-hs', name: 'Усунення короткого замикання' },

//     // Оздоблювальні роботи
//     { slug: 'tile-laying-hs', name: 'Укладка плитки' },
//     { slug: 'plastering-hs', name: 'Штукатурні роботи' },
//     { slug: 'wallpaper-hs', name: 'Поклейка шпалер' },
//     { slug: 'painting-hs', name: 'Малярні роботи' },
//     { slug: 'drywall-hs', name: 'Гіпсокартонні конструкції' },
//     { slug: 'stretch-ceiling-hs', name: 'Натяжні стелі' },
//     { slug: 'laminate-flooring-hs', name: 'Укладка ламінату / паркету' },
//     { slug: 'thermal-insulation-hs', name: 'Утеплення стін' },
//     { slug: 'underfloor-heating-hs', name: 'Тепла підлога' },

//     // Будівельні / зварювальні
//     { slug: 'welding-mma-hs', name: 'Зварювання електродом (ММА)' },
//     { slug: 'welding-mig-hs', name: 'Зварювання MIG/MAG' },
//     { slug: 'welding-tig-hs', name: 'Аргонне зварювання (TIG)' },
//     { slug: 'masonry-hs', name: 'Кладка цегли / газоблоку' },
//     { slug: 'metal-fabrication-hs', name: 'Металообробка' },
//     { slug: 'lathe-works-hs', name: 'Токарні роботи' },
//     { slug: 'carpentry-hs', name: 'Тесля' },

//     // Меблі
//     { slug: 'furniture-making-hs', name: 'Виготовлення меблів на замовлення' },
//     { slug: 'furniture-assembly-hs', name: 'Збірка меблів' },
//     { slug: 'furniture-restoration-hs', name: 'Реставрація меблів' },
//     { slug: 'furniture-reupholstery-hs', name: 'Перетяжка меблів' },

//     // Прибирання
//     { slug: 'apartment-cleaning-hs', name: 'Прибирання квартир' },
//     { slug: 'general-cleaning-hs', name: 'Генеральне прибирання' },
//     { slug: 'post-construction-hs', name: 'Прибирання після ремонту' },
//     { slug: 'window-cleaning-hs', name: 'Миття вікон' },
//     { slug: 'sofa-dry-cleaning-hs', name: 'Хімчистка диванів і килимів' },
//     { slug: 'mold-removal-hs', name: 'Видалення плісняви' },
//     { slug: 'disinsection-hs', name: 'Дезінсекція / дератизація' },

//     // Ремонт техніки
//     { slug: 'fridge-repair-hs', name: 'Ремонт холодильників' },
//     { slug: 'washing-machine-repair-hs', name: 'Ремонт пральних машин' },
//     { slug: 'ac-repair-hs', name: 'Ремонт кондиціонерів' },
//     { slug: 'tv-repair-hs', name: 'Ремонт телевізорів' },
//     { slug: 'laptop-repair-hs', name: 'Ремонт ноутбуків / ПК' },
//     { slug: 'phone-repair-hs', name: 'Ремонт телефонів' },
//     { slug: 'soldering-hs', name: 'Пайка плат' },

//     // Енергозбереження
//     { slug: 'battery-repacking-hs', name: 'Перепаковка акумуляторів' },
//     { slug: 'powerbank-repair-hs', name: 'Ремонт повербанків' },
//     { slug: 'ups-repair-hs', name: 'Ремонт / установка UPS' },
//     { slug: 'generator-connection-hs', name: 'Підключення генераторів' },
//     { slug: 'solar-panels-hs', name: 'Монтаж сонячних панелей' },
//     { slug: 'starlink-install-hs', name: 'Установка Starlink' },

//     // Загальне
//     { slug: 'handyman-general-hs', name: 'Чоловік на годину' },
//     { slug: 'door-install-hs', name: 'Установка дверей' },
//     { slug: 'lock-replacement-hs', name: 'Заміна замків' },
//     { slug: 'tv-mounting-hs', name: 'Монтаж телевізора' },
//     { slug: 'window-installation-hs', name: 'Установка вікон' },
//   ],
// }

const SKILLS_BY_CATEGORY: Record<string, SeedSkill[]> = {
  volunteering: [
    // ─────────────────────────────
    // СОЦІАЛЬНА ДОПОМОГА
    // ─────────────────────────────
    { slug: 'elderly-help', name: 'Допомога літнім людям' },
    { slug: 'psychological-help', name: 'Психологічна допомога' },

    // ─────────────────────────────
    // ТРАНСПОРТ І ЛОГІСТИКА
    // ─────────────────────────────
    { slug: 'volunteer-transport', name: 'Транспортні перевезення' },
    { slug: 'fuel-delivery', name: 'Доставка пального' },

    // ─────────────────────────────
    // ГУМАНІТАРНА ДОПОМОГА
    // ─────────────────────────────
    { slug: 'food-delivery', name: 'Доставка їжі' },
    { slug: 'medicine-delivery', name: 'Доставка медикаментів' },

    // ─────────────────────────────
    // ЖИТЛО
    // ─────────────────────────────
    { slug: 'housing-search', name: 'Надання або пошук житла' },

    // ─────────────────────────────
    // ДОПОМОГА ТВАРИНАМ
    // ─────────────────────────────
    { slug: 'animal-rescue', name: 'Допомога тваринам' },
  ],
}
async function seed() {
  console.log('🌱 Seeding skills…')

  // Спочатку отримуємо мапу slug → id для всіх категорій,
  // щоб не ходити в БД на кожен скіл
  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true },
  })
  const categoryIdBySlug = new Map(allCategories.map((c) => [c.slug, c.id]))

  let totalProcessed = 0
  let skippedCategories = 0
  const missingCategories: string[] = []

  for (const [categorySlug, skills] of Object.entries(SKILLS_BY_CATEGORY)) {
    const categoryId = categoryIdBySlug.get(categorySlug)

    if (!categoryId) {
      missingCategories.push(categorySlug)
      skippedCategories++
      continue
    }

    console.log(`\n  📁 ${categorySlug} — ${skills.length} навичок`)

    for (let i = 0; i < skills.length; i++) {
      const sk = skills[i]
      await prisma.skill.upsert({
        where: { slug: sk.slug },
        create: {
          slug: sk.slug,
          name: sk.name,
          categoryId,
          sortOrder: i,
        },
        update: {
          name: sk.name,
          categoryId,
          sortOrder: i,
        },
      })
      totalProcessed++
    }
    console.log(`     ✓ оброблено ${skills.length}`)
  }

  const total = await prisma.skill.count()

  console.log('\n📊 Summary:')
  console.log(`   Processed in this run: ${totalProcessed}`)
  console.log(`   Total skills in DB:    ${total}`)

  if (missingCategories.length > 0) {
    console.log(
      `\n  ⚠ Пропущено категорій (немає в БД): ${missingCategories.join(', ')}`,
    )
    console.log(
      `    Перевірте slug-и в seed-categories.ts або в Prisma Studio.`,
    )
  }

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
