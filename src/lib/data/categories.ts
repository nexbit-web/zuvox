export interface Service {
  text: string
  category: string
}
export interface SubCategory {
  title: string
  items: string[]
}
export interface Category {
  name: string
  icon: string
  subs: SubCategory[]
}

export const categories: Category[] = [
  {
    name: 'Веб-розробка',
    icon: '💻',
    subs: [
      {
        title: 'Frontend',
        items: [
          'React / Next.js',
          'Vue / Nuxt',
          'SvelteKit',
          'HTML / CSS',
          'TypeScript',
        ],
      },
      {
        title: 'Backend',
        items: [
          'Node.js',
          'Python / Django',
          'PHP / Laravel',
          'API інтеграція',
          'GraphQL',
        ],
      },
      {
        title: 'CMS',
        items: ['WordPress', 'Webflow', 'Shopify', 'Strapi', 'Sanity'],
      },
    ],
  },
  {
    name: 'UI/UX Дизайн',
    icon: '🎨',
    subs: [
      {
        title: 'Веб-дизайн',
        items: [
          'Лендінги',
          'Корпоративні сайти',
          'Інтернет-магазини',
          'Dashboard',
        ],
      },
      {
        title: 'Мобільний',
        items: [
          'iOS дизайн',
          'Android дизайн',
          'Прототипування',
          'Анімації Figma',
        ],
      },
      {
        title: 'Брендинг',
        items: ['Логотипи', 'Фірмовий стиль', 'Гайдлайни', 'Упаковка'],
      },
    ],
  },
  {
    name: 'Мобільні застосунки',
    icon: '📱',
    subs: [
      { title: 'iOS', items: ['Swift', 'React Native', 'Flutter', 'Expo'] },
      {
        title: 'Android',
        items: ['Kotlin', 'React Native', 'Flutter', 'Java'],
      },
      {
        title: 'Крос-платформа',
        items: ['Flutter', 'React Native', 'Ionic', 'Capacitor'],
      },
    ],
  },
  {
    name: 'SEO та маркетинг',
    icon: '📈',
    subs: [
      {
        title: 'SEO',
        items: [
          'Технічний SEO',
          'Контентний SEO',
          'Локальний SEO',
          'Аудит сайту',
        ],
      },
      {
        title: 'Реклама',
        items: ['Google Ads', 'Facebook Ads', 'TikTok Ads', 'Таргетинг'],
      },
      { title: 'SMM', items: ['Instagram', 'TikTok', 'LinkedIn', 'Telegram'] },
    ],
  },
  {
    name: 'Копірайтинг',
    icon: '✍️',
    subs: [
      {
        title: 'Тексти',
        items: [
          'Статті та блоги',
          'SEO-тексти',
          'Описи товарів',
          'Прес-релізи',
        ],
      },
      {
        title: 'Реклама',
        items: [
          'Рекламні тексти',
          'Email-розсилки',
          'Скрипти продажів',
          'Слогани',
        ],
      },
      {
        title: 'Переклади',
        items: ['Укр / Англ', 'Технічні', 'Юридичні', 'Субтитри'],
      },
    ],
  },
  {
    name: 'Відео та анімація',
    icon: '🎬',
    subs: [
      {
        title: 'Відео',
        items: ['Монтаж', 'Відеографія', 'Reels / Shorts', 'YouTube'],
      },
      {
        title: 'Анімація',
        items: [
          '2D анімація',
          '3D анімація',
          'Motion graphics',
          'Лого анімація',
        ],
      },
      {
        title: 'Озвучення',
        items: ['Дикторське озвучення', 'Подкасти', 'Аудіокниги', 'Реклама'],
      },
    ],
  },
  {
    name: 'Фото та графіка',
    icon: '📷',
    subs: [
      {
        title: 'Фото',
        items: ['Предметна зйомка', 'Портретна', 'Репортажна', 'Обробка фото'],
      },
      {
        title: 'Графіка',
        items: ['Ілюстрації', 'Іконки', 'Інфографіка', 'Банери'],
      },
      {
        title: 'Поліграфія',
        items: ['Флаєри', 'Візитки', 'Плакати', 'Презентації'],
      },
    ],
  },
  {
    name: 'Бізнес-послуги',
    icon: '💼',
    subs: [
      {
        title: 'Консалтинг',
        items: ['Бізнес-аналіз', 'Стратегія', 'Фінансовий аналіз', 'HR'],
      },
      {
        title: 'Юридичні',
        items: ['Договори', 'Реєстрація ФОП', 'Патенти', 'Авторські права'],
      },
      { title: 'Бухгалтерія', items: ['Облік', 'Звітність', '1С', 'Аудит'] },
    ],
  },
  {
    name: 'Освіта та навчання',
    icon: '🎓',
    subs: [
      {
        title: 'IT навчання',
        items: ['Програмування', 'Дизайн', 'Верстка', 'DevOps'],
      },
      {
        title: 'Мови',
        items: ['Англійська', 'Польська', 'Німецька', 'Іспанська'],
      },
      {
        title: 'Шкільні предмети',
        items: ['Математика', 'ЗНО / НМТ', 'Фізика', 'Хімія'],
      },
    ],
  },
  {
    name: 'Аудіо та музика',
    icon: '🎵',
    subs: [
      {
        title: 'Створення',
        items: ['Написання треків', 'Аранжування', 'Мікшування', 'Мастеринг'],
      },
      { title: 'Запис', items: ['Вокал', 'Подкаст', 'Аудіокнига', 'Джингл'] },
      {
        title: 'Партитури',
        items: ['Ноти', 'Транскрипція', 'Табулатури', 'MIDI'],
      },
    ],
  },
]

export const allServices: Service[] = categories.flatMap((cat) =>
  cat.subs.flatMap((sub) =>
    sub.items.map((item) => ({
      text: item,
      category: `${cat.name} / ${sub.title}`,
    })),
  ),
)
