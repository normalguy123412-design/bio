"use client"

import { ICONS } from "@/components/icons"
import type { Link } from "@/lib/profile"

/**
 * Цвет каждой кнопки.
 *
 * В исходном варианте цвет был зашит в разметку каждой кнопки: зелёная
 * рамка здесь, красное свечение на наведении там. Собрано в одну таблицу,
 * иначе пришлось бы копировать одну и ту же строку классов четыре раза.
 */
const TINT: Record<string, { ring: string; text: string; shine: string }> = {
  github: {
    ring: "border-white/20 hover:border-white/40",
    text: "text-white group-hover:text-white/90",
    shine: "via-white/15",
  },
  telegram: {
    ring: "border-green-500/20 hover:border-green-500/50",
    text: "text-green-500 group-hover:text-green-400",
    shine: "via-green-400/25",
  },
  shield: {
    ring: "border-sky-500/20 hover:border-sky-500/50",
    text: "text-sky-400 group-hover:text-sky-300",
    shine: "via-sky-400/25",
  },
  mail: {
    ring: "border-red-500/20 hover:border-red-500/50",
    text: "text-red-500 group-hover:text-red-400",
    shine: "via-red-400/25",
  },
}

/**
 * Круглые кнопки ссылок — стеклянные, из найденного вами образца.
 *
 * Отличия от исходника: вместо Discord и YouTube там ваши четыре ссылки, и
 * кнопка стала `<a>`, а не `<button>` без обработчика — в примере клик по
 * ней ничего не делал. Значок каждой берётся из общей таблицы иконок.
 *
 * Подпись под кнопкой всегда видна, а не только при наведении: по кружку
 * непонятно, куда он ведёт, и приходилось бы наводить на каждый.
 */
export function SocialButtons({ links }: { links: Link[] }) {
  return (
    <div className="grid max-w-md grid-cols-4 gap-4">
      {links.map((link) => {
        const Icon = ICONS[link.icon]
        const tint = TINT[link.icon] ?? TINT.github

        return (
          <a
            key={link.id}
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            title={link.value}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <span
              className={`relative block cursor-pointer overflow-hidden rounded-full border bg-gradient-to-tr from-black/60 to-black/40 p-4 shadow-lg backdrop-blur-lg transition-all duration-300 ease-out hover:scale-110 hover:rotate-3 hover:shadow-2xl hover:from-white/10 active:scale-95 active:rotate-0 ${tint.ring} ${tint.text}`}
            >
              {/* Полоса света, пробегающая по кнопке при наведении. */}
              <span
                aria-hidden
                className={`absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full ${tint.shine}`}
              />
              <Icon className="relative z-10 size-6 transition-colors duration-300" />
            </span>

            <span className="text-muted-foreground group-hover:text-foreground text-xs transition-colors">
              {link.label}
            </span>
          </a>
        )
      })}
    </div>
  )
}
