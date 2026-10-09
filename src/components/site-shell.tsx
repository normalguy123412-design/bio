"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import { MacOsDock, type DockEntry } from "@/components/ui/mac-os-dock"
import { ICONS } from "@/components/icons"
import { MusicWidget } from "@/components/music-widget"
import { useScrambledTitle } from "@/components/ui/text-shimmer"
import { ProfileRoom } from "@/components/rooms"
import { sections, media, profile } from "@/lib/profile"

/** Что показывать в каждом отделе. */
const ROOMS: Record<string, React.ReactNode> = {
  profile: <ProfileRoom />,
}

/**
 * ОБОЛОЧКА САЙТА.
 *
 * Отделы закрытые: открыт ровно один, и попасть в другой можно только
 * кнопкой в доке. Никакой прокрутки страницы нет — ни колесом, ни клавишами, —
 * иначе можно было бы перелистнуть мимо кнопки, а отделы как раз задуманы
 * переключаемыми. Внутри отдела прокрутка осталась: на узком экране
 * содержимое может не поместиться по высоте.
 */
export function SiteShell() {
  const [current, setCurrent] = React.useState(sections[0].id)

  /*
    Заголовок вкладки собирается из шума один раз при открытии страницы:
    сначала случайные символы, потом настоящее имя. Дальше не трогаем.
  */
  useScrambledTitle(`${profile.name} — ${profile.roles.join(" и ").toLowerCase()}`)

  const entries = React.useMemo<DockEntry[]>(
    () =>
      sections.map((section) => ({
        key: section.id,
        label: section.label,
        icon: ICONS[section.icon],
        active: current === section.id,
        onSelect: () => setCurrent(section.id),
      })),
    [current]
  )

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/*
        Фоновая запись под всей страницей. Идёт по кругу и без звука, при
        гашения: это фон, а не содержимое.
        `autoPlay muted` здесь обязателен: без них видео не грузится вообще
        и фон остаётся пустым чёрным — именно так он и выглядел, пока
        `preload` был «none», а автозапуска не было.
        `aria-hidden` — чтобы экранный диктор не пытался его озвучить.
      */}
      <video
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-30"
        src={media.background}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />

      {/* Крупная полупрозрачная подпись на фоне — приём из ИБ-Гида. */}
      <div
        aria-hidden
        className="text-foreground/[0.055] pointer-events-none absolute inset-0 flex -translate-y-1/4 items-center justify-center overflow-hidden text-[26vw] leading-none font-bold tracking-tight select-none"
      >
        NiceGuy
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="absolute inset-0"
        >
          {ROOMS[current]}
        </motion.div>
      </AnimatePresence>

      <MacOsDock entries={entries} />
      <MusicWidget />
    </div>
  )
}
