import type { Metadata } from "next"
import { Caveat, Instrument_Serif, Martian_Mono } from "next/font/google"
import { profile } from "@/lib/profile"
import "./globals.css"

/*
  Суть сайта — ночь и машина. Три шрифта выстраивают всю сцену:

  • Martian Mono — основной: машинописный, «терминальный», им набраны
    подписи, абзацы и весь интерфейс. Есть кириллица.
  • Instrument Serif — курсивный Serif с тонкими засечками: огромный ник
    и заголовки разделов. Кириллицы у него нет, поэтому русские слова
    уходят в Times New Roman (умышленный приём — контраст двух Serif),
    латиница остаётся в Instrument.
  • Caveat — рукописный, с кириллицей: приветствие на заставке и имя
    трека в плеере.
*/
const martian = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
})

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

export const metadata: Metadata = {
  title: profile.name,
  description:
    "Фронтенд-разработчик и фриланс: интерфейсы на React и TypeScript, вёрстка, анимации, адаптив. Сайты под ключ.",
  openGraph: {
    title: profile.name,
    description: "Фронтенд-разработчик и фриланс.",
    type: "profile",
    locale: "ru_RU",
  },
}

/**
 * Тёмная тема задана прямо на html: страница одноцветная, и отдельный
 * переключатель ей не нужен. Класс `.dark` включает ночные токены из
 * globals.css.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`dark ${martian.variable} ${display.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
