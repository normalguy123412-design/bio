import type { Metadata } from "next"
import { Caveat, Instrument_Serif, Martian_Mono, Unbounded } from "next/font/google"

import "./globals.css"

/*
  Шрифты страницы — четыре характера одной ночной сцены:

  • Martian Mono — основной:technical подача, числа, мелкие подписи.
  • Instrument Serif — единственный курсив в наборе: ник, заголовки
    разделов и пункты рельса ссылок. Отдаётся с двумя начертаниями, чтобы
    не было рывка при подстановке.
  • Caveat — рукописный: им пишется стеклянный лист «письмецо».
  • Unbounded — широкий гротеск: брендовая строка и название трека, там,
    где нужен плотный акцент.
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

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "NiceGuy",
  description: "NiceGuy — junior-разработчик интерфейсов. Личная страница-сцена с музыкой.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body
        className={`${martian.className} ${martian.variable} ${display.variable} ${caveat.variable} ${unbounded.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
