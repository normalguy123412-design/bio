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
  /**
   * О себе — в разметке bio-страниц, теми же тегами:
   * `[em]` — курсив, `[color=…]` — цвет, `[h]` — выделение,
   * `[dc-emoji-id]…[/dc-emoji-id]` — эмодзи Discord по его id.
   * Разбирает их компонент RichText, так что в тексте видны не скобки,
   * а оформление.
   */
  bio: "[em][theme][color=00AA72][center][h][dc-emoji-id]1508936569032282273[/dc-emoji-id] Hi, I’m a junior developer. [dc-emoji-id]1508936569032282273[/dc-emoji-id][/h][/center][/color][/theme][/em]",
  location: "Москва, Россия",
  /** Теги под описанием — как на странице-образце. */
  tags: ["Coding on HTML/CSS", "Coding on Python"],
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
 * Файлы в public/.
 *
 * Путь собирается вручную: на localhost префикс пустой, на GitHub Pages —
 * /bio. Файлы лежат рядом с кодом, поэтому ссылка на них не протухнет.
 */
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const media = {
  /** Фотография профиля. */
  avatar: `${base}/avatar.jpg`,
  /** Анимированный баннер карточки. */
  banner: `${base}/banner.gif`,
  /**
   * Фоновая видеозапись под всей страницей. Исходник весил 15 МБ, поэтому
   * пережат: 1280px, 24 кадра в секунду, без звука — 1,7 МБ.
   */
  background: `${base}/background.mp4`,
} as const

/**
 * Эмодзи Discord.
 *
 * Адрес ведёт прямо на CDN Discord, где лежат анимированные версии: без
 * `animated=true` сервер отдаёт статичный кадр. Показываются всегда парой и
 * рядом — поодиночке они терялись на фоне.
 */
export const emojis = {
  left: "https://cdn.discordapp.com/emojis/1504516583370788864.webp?animated=true",
  right: "https://cdn.discordapp.com/emojis/1504516589943263292.webp?animated=true",
} as const

/**
 * Разделы страницы для боковой навигации.
 *
 * Отдел остался один: активность переехала внутрь карточки профиля, а
 * кнопки ссылок и раньше были внизу той же карточки. Держать ради одного
 * раздела отдельную кнопку в доке незачем.
 */
export const sections: { id: string; label: string; icon: IconName }[] = [
  { id: "profile", label: "Профиль", icon: "book" },
]

/**
 * Discord.
 *
 * Здесь три разные вещи, и их часто путают:
 *
 * 1. `userId` — обычный числовой id аккаунта. Он виден в настройках профиля
 *    и нужен боту, чтобы следить за активностью этого человека.
 *
 * 2. `serverId` и `invite` — сервер Discord для карточки. Сервер может быть
 *    чужим: карточка строится по коду приглашения, который отдаёт название,
 *    иконку и число участников онлайн. Официальный виджет для этого не
 *    годится — его можно включить только на своём сервере.
 *
 * 3. `presenceEndpoint` — адрес облака, откуда страница берёт строку
 *    «Играет в…». Пока адрес пуст, карточка не рисуется вовсе: без облака
 *    и бота данных просто не существует, и показывать их неоткуда.
 *    После настройки (см. папку discord) впишите сюда адрес вида
 *    `https://discord-presence.<поддомен>.workers.dev`.
 */
export const discord = {
  userId: "775664166538706954",
  serverId: "1351946367362404362",
  /**
   * Код приглашения. По нему Discord отдаёт название сервера, иконку и
   * число участников онлайн — этого хватает на карточку, и права на сервер
   * для этого не нужны. Сервер может быть чужим.
   */
  invite: "cQJ6bNn2ek",
  /**
   * Тег сервера Discord — короткая метка рядом с ником, как `yui` на
   * странице-образце. Раньше на этом месте стояла галочка верификации,
   * которой у обычного аккаунта нет и которая ничего не значит.
   *
   * Тег задаётся вручную: Discord не отдаёт его ни через приглашение,
   * ни через публичные адреса, он виден только в самом клиенте. Узнать
   * его можно, наведя курсор на своё имя в том сервере, где выставлен
   * тег, либо посмотрев разметку чужой страницы с работающим виджетом.
   *
   * Значок рядом с тегом — картинка с CDN Discord
   * (`cdn.discordapp.com/guild-tag-badges/...`). Без неё показывается
   * один текст, это тоже нормально.
   */
  serverTag: "",
  serverTagBadge: "",
  /**
   * Откуда страница берёт «Играет в…».
   *
   * Данные кладёт туда бот (discord/bot), а хранит Worker
   * (discord/worker). Адрес с https обязателен: страница живёт на
   * https, и запрос с защищённой страницы на http браузер заблокирует.
   */
  presenceEndpoint: "https://discord-presence.niceguy-bio.workers.dev/",
} as const

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
  title: "Вечно молодой",
  artist: "OLEHAN",
  /**
   * Обложка. Файла пока нет — плеер рисует градиентную заглушку. Положите
   * картинку в public/audio/cover.jpg (квадрат, от 512×512) и путь встанет
   * сюда.
   */
  cover: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/audio/cover.jpg`,
} as const
