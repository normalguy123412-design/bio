/**
 * Данные страницы био.
 *
 * Всё, что видно посетителю, лежит здесь: и тексты, и ссылки. Компоненты
 * ничего не знают о содержании — они только раскладывают его по разметке.
 *
 * Модуль намеренно без React и без `"use client"`: и серверные компоненты
 * читают отсюда заголовок страницы, и клиентские — списки ссылок. Иконки
 * хранятся не компонентами, а именами: компонент нельзя положить в данные,
 * которые пересекают границу сервер/клиент (Next об этом ругается).
 */

/** Какие иконки есть в распоряжении. Сами компоненты — в components/icons. */
export type IconName = "github" | "shield" | "mail" | "send" | "book"

export const profile = {
  name: "NiceGuy",
  handle: "@Chea1eRs",
  roles: ["Разработчик интерфейсов", "Фриланс"],
  bio: "Делаю интерфейсы на React и TypeScript: вёрстка, анимации, адаптив. Беру заказы под ключ — от идеи до готовой страницы.",
  location: "Москва, Россия",
  avatar: "NG",
} as const

export type Link = {
  id: string
  label: string
  value: string
  href?: string
  /** Что копирует кнопка: ссылку целиком или только значение. */
  copy?: string
  icon: IconName
  /** Ряд откроется в новой вкладке. */
  external?: boolean
}

export const links: Link[] = [
  {
    id: "github",
    label: "GitHub",
    value: "normalguy123412-design",
    href: "https://github.com/normalguy123412-design",
    copy: "https://github.com/normalguy123412-design",
    icon: "github",
    external: true,
  },
  {
    id: "ib-gid",
    label: "ИБ-Гид",
    value: "Сайт по информационной безопасности",
    href: "https://normalguy123412-design.github.io/ib-gid/",
    copy: "https://normalguy123412-design.github.io/ib-gid/",
    icon: "shield",
    external: true,
  },
  {
    id: "telegram",
    label: "Telegram",
    value: "@Chea1eRs",
    href: "https://t.me/Chea1eRs",
    copy: "https://t.me/Chea1eRs",
    icon: "send",
    external: true,
  },
  {
    id: "email",
    label: "Почта",
    value: "normalguy123412@gmail.com",
    href: "mailto:normalguy123412@gmail.com",
    copy: "normalguy123412@gmail.com",
    icon: "mail",
  },
]

/**
 * Разделы страницы для боковой навигации. Порядок совпадает с порядком на
 * странице.
 *
 * Отдельного отдела «Ссылки» больше нет: кнопки ссылок переехали вниз
 * карточки профиля, где их и видно сразу, без лишнего переключения.
 */
export const sections: { id: string; label: string; icon: IconName }[] = [
  { id: "profile", label: "Профиль", icon: "book" },
  { id: "activity", label: "Активность", icon: "shield" },
]

/**
 * Счётчик просмотров профиля.
 *
 * Сайт собран статически (`next build` при `output: "export"`), считать
 * просмотры на своей стороне нечем: сервера у страницы нет. Поэтому число
 * берётся с внешнего сервиса, который сам его хранит и увеличивает при
 * обращении.
 *
 * Бесплатных сервисов без регистрации не осталось — все прежние
 * (countapi.xyz и подобные) отвечают 404. Нужен ключ CounterAPI:
 * зарегистрируйтесь на counterapi.dev, создайте публичный счётчик и
 * подставьте его id в `endpoint` вида
 * `https://counterapi.dev/api/v1/<id>/counter`.
 *
 * Пока адрес не задан или сервис не отвечает, счётчик просто не рисуется —
 * лучше ничего, чем «0» или ошибка на видном месте.
 */
export const views = {
  endpoint: "",
} as const

/** Трек для плеера. Сам файл лежит в public/audio. */
export const track = {
  /**
   * Путь собирается вручную, а не через next/image: тот умеет префикс
   * страницы подставлять сам, а у <audio> такой возможности нет. На
   * localhost префикс пустой, на GitHub Pages — /bio.
   */
  src: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/track.mp3`,
  title: "Запомни меня",
  artist: "OLEHAN",
  /**
   * Обложка. Файла пока нет — плеер рисует градиентную заглушку. Положите
   * картинку в public/audio/cover.jpg (квадрат, от 512×512) и путь встанет
   * сюда.
   */
  cover: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/cover.jpg`,
} as const
