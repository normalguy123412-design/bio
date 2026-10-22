"use client"

import * as React from "react"

/**
 * Язык интерфейса.
 *
 * Опорный язык разметки — русский. Словарь переводит его на английский,
 * когда выбран другой язык; иначе строка уходит на страницу нетронутой.
 * Выбор запоминается в localStorage и читается при следующем открытии.
 */

export type Lang = "ru" | "en"

const STORAGE_KEY = "niceguy.lang"

/** Русский → английский. Ключи — точные строки из компонентов. */
const EN: Record<string, string> = {
  "Разделы": "Sections",
  "просмотры": "views",
  "Обо мне": "About",
  "Связь": "Contact",
  "Плей / пауза": "Play / pause",
  "Язык": "Language",
  "Русский": "Russian",
  "English": "English",
  "Выберите язык": "Choose a language",
  "С музыкой": "With music",
  "Включить музыку ?": "Play some music ?",
  "Включить": "Yes",
  "Не сейчас": "Not now",
  "музыка встретит дальше": "music will greet you",
  "найти": "find me",
  "github": "github",
  "иб-гид": "security guide",
  "telegram": "telegram",
  "связь": "reach me",
  "discord": "discord",
  "почта": "mail",
  "письмецо": "a letter",
  "Скопировать": "Copy",
  "скопировано": "copied",
  "чуть-чуть": "a bit",
  "о себе": "about me",
  "Если сжать меня до пары строк, выйдет примерно так:": "Squeezed into a couple of lines, this is roughly me:",
  "Я NiceGuy — junior-разработчик интерфейсов из Москвы. Собираю страницы на HTML/CSS, вожусь с Python и ботами. Развлекаюсь тем, что делаю свои маленькие проекты живыми: ночь, музыка, дождь и детали, которые замечаешь не сразу. Эта страница — одна из них.": "I'm NiceGuy — a junior interface developer from Moscow. I build pages with HTML/CSS and tinker with Python and bots. For fun I make my small projects feel alive: night, music, rain, details you notice on a second look. This page is one of them.",
  "наверх, к сцене": "back to the stage",
  "кто рядом": "who's around",
  "музыка": "music",
  "Плеер": "Player",
  "Discord": "Discord",
  "Что сейчас": "Right now",
  "Загружаю…": "Loading…",
  "Свободен": "Free",
  "В сети": "Online",
  "Отошёл": "Away",
  "Не мешать": "Do not disturb",
  "Играет в": "Playing",
  "Слушает": "Listening",
  "Стримит": "Streaming",
  "Смотрит": "Watching",
  "Сказал": "Said",
  "Занят": "Busy",
  "Скопировать id": "Copy id",
  "Открыть сервер": "Open server",
  "сервер": "server",
  "онлайн": "online",
  "где меня искать": "where to find me",
  "Строки, по которым до меня дотянуться.": "The lines you can reach me through.",
  "клик — и в буфер": "click to copy",
  "что за NiceGuy?": "who is NiceGuy?",
  "Здесь коротко о том, кто это — и сразу строка связи.": "A short word on who this is — with a contact line right away.",
  "почерк Caveat": "Caveat handwriting",
  "протереть и уйти": "wipe and leave",
  "RU": "RU",
  "EN": "EN",
}

function readLang(): Lang | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === "en" || value === "ru" ? value : null
  } catch {
    return null
  }
}

function writeLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Хранилище недоступно (приватный режим и подобное) — выбор просто
    // не переживёт перезагрузку, жить мешать это не будет.
  }
}

type LangState = {
  lang: Lang
  setLang: (lang: Lang) => void
  /** Переводит строку на текущий язык. */
  t: (ru: string) => string
}

const LangContext = React.createContext<LangState | null>(null)

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("ru")

  React.useEffect(() => {
    // Сохранённый выбор читаем после монтирования: на сервере его нет,
    // а чтобы не звать setState прямо в теле эффекта — через кадр.
    const saved = readLang()
    if (saved && saved !== "ru") {
      const id = window.requestAnimationFrame(() => setLangState(saved))
      return () => cancelAnimationFrame(id)
    }
  }, [])

  React.useEffect(() => {
    document.documentElement.lang = lang === "ru" ? "ru" : "en"
  }, [lang])

  const setLang = React.useCallback((next: Lang) => {
    setLangState((prev) => {
      if (prev !== next) writeLang(next)
      return next
    })
  }, [])

  const t = React.useCallback(
    (ru: string) => (lang === "en" ? EN[ru] ?? ru : ru),
    [lang],
  )

  const value = React.useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang() {
  const value = React.useContext(LangContext)
  if (!value) throw new Error("useLang — вне LangProvider")
  return value
}
