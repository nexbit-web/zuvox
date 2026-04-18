export interface Message {
  id: string
  text: string
  time: string
  isMe: boolean
  read?: boolean
}

export interface Chat {
  id: string
  name: string
  avatar: string
  lastMessage: string
  time: string
  unread: number
  online: boolean
  messages: Message[]
}

export const chats: Chat[] = [
  {
    id: '1',
    name: 'Марина Коваленко',
    avatar: '',
    lastMessage: 'Дякую за роботу! Все чудово 🔥',
    time: 'Зараз',
    unread: 2,
    online: true,
    messages: [
      {
        id: '1',
        text: 'Привіт! Мене цікавить розробка лендінгу',
        time: '14:10',
        isMe: false,
      },
      {
        id: '2',
        text: 'Добрий день! Розкажіть детальніше про проєкт',
        time: '14:12',
        isMe: true,
        read: true,
      },
      {
        id: '3',
        text: 'Потрібен лендінг для онлайн-курсу з дизайну. Дедлайн — 2 тижні',
        time: '14:15',
        isMe: false,
      },
      {
        id: '4',
        text: 'Зрозумів. Можу зробити за 10 днів. Вартість — 2500 грн',
        time: '14:18',
        isMe: true,
        read: true,
      },
      {
        id: '5',
        text: 'Відмінно! Коли можемо почати?',
        time: '14:25',
        isMe: false,
      },
      {
        id: '6',
        text: 'Завтра з ранку. Надішліть ТЗ і референси',
        time: '14:28',
        isMe: true,
        read: true,
      },
      {
        id: '7',
        text: 'Дякую за роботу! Все чудово 🔥',
        time: '14:32',
        isMe: false,
      },
    ],
  },
  {
    id: '2',
    name: 'Денис Петров',
    avatar: '',
    lastMessage: 'Можна уточнити деталі?',
    time: '12:15',
    unread: 1,
    online: true,
    messages: [
      {
        id: '1',
        text: 'Доброго дня! Бачив ваше портфоліо',
        time: '11:50',
        isMe: false,
      },
      {
        id: '2',
        text: 'Вітаю! Чим можу допомогти?',
        time: '11:55',
        isMe: true,
        read: true,
      },
      { id: '3', text: 'Можна уточнити деталі?', time: '12:15', isMe: false },
    ],
  },
  {
    id: '3',
    name: 'Сергій Іваненко',
    avatar: '',
    lastMessage: 'Окей, чекаю на файли',
    time: 'Вчора',
    unread: 0,
    online: false,
    messages: [
      { id: '1', text: 'Привіт! Готові макети?', time: '18:00', isMe: false },
      {
        id: '2',
        text: 'Майже, ще пару годин',
        time: '18:05',
        isMe: true,
        read: true,
      },
      { id: '3', text: 'Окей, чекаю на файли', time: '18:10', isMe: false },
    ],
  },
  {
    id: '4',
    name: 'Олена Бондаренко',
    avatar: '',
    lastMessage: 'Супер! Домовились 👍',
    time: 'Вчора',
    unread: 0,
    online: false,
    messages: [
      {
        id: '1',
        text: 'Добрий день! Скільки коштує SEO аудит?',
        time: '15:00',
        isMe: false,
      },
      {
        id: '2',
        text: 'Від 1500 грн залежно від обсягу сайту',
        time: '15:10',
        isMe: true,
        read: true,
      },
      { id: '3', text: 'Супер! Домовились 👍', time: '15:15', isMe: false },
    ],
  },
  {
    id: '5',
    name: 'Андрій Мельник',
    avatar: '',
    lastMessage: 'Дякую, все зрозуміло',
    time: 'Пн',
    unread: 0,
    online: false,
    messages: [
      {
        id: '1',
        text: 'Вітаю! Маєте досвід з React Native?',
        time: '10:00',
        isMe: false,
      },
      {
        id: '2',
        text: 'Так, є кілька проєктів в портфоліо',
        time: '10:05',
        isMe: true,
        read: true,
      },
      { id: '3', text: 'Дякую, все зрозуміло', time: '10:20', isMe: false },
    ],
  },
]

export function initials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(escaped, 'gi'), (m) => `<mark>${m}</mark>`)
}
