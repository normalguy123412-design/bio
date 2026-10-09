import type { Metadata } from "next"
import { Inter, JetBrains_Mono, Unbounded } from "next/font/google"
import { profile } from "@/lib/profile"
import "./globals.css"

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

/**
 * Заголовки — Unbounded. На странице-образце именно он (`font: Unbounded`),
 * и начертание у него геометрическое, с заметными срезанными углами: с
 * обычным Inter имя выглядит совсем другим, а это главный элемент страницы.
 * Начертание содержит и кириллицу, поэтому русский текст не выпадает.
 */
const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
})

export const metadata: Metadata = {
  // Заголовок вкладки на образце — просто имя, без описания. Длинный
  // вариант выглядел бы вкладкой, размазанной по всему экрану.
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
 * переключатель ей не нужен. Класс `.dark` включает токены из globals.css.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={`dark ${inter.variable} ${mono.variable} ${unbounded.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
