"use client"

import * as React from "react"
import { MacOsDock, type DockEntry } from "@/components/ui/mac-os-dock"
import { ICONS } from "@/components/icons"
import { sections } from "@/lib/profile"

/**
 * Правый док: переходы по разделам страницы.
 *
 * Активный раздел определяется через IntersectionObserver, а не по позиции
 * прокрутки: страница короткая, и обычный подсчёт «какой блок ближе к
 * середине окна» путался бы на блоках разной высоты — карточка с музыкой
 * вдвое выше шапки.
 */
export function SideNav() {
  const [active, setActive] = React.useState<string>(sections[0].id)

  React.useEffect(() => {
    const nodes = sections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null)

    if (!nodes.length) return

    const seen = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          seen.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0)
        }

        // Показываем тот раздел, чья полоса сейчас ближе всего к верху
        // окна: из видимых берём самый верхний.
        const visible = [...seen.entries()]
          .filter(([, ratio]) => ratio > 0)
          .sort((a, b) => a[0].localeCompare(b[0]))

        const first = sections.find((section) =>
          visible.some(([id]) => id === section.id)
        )

        if (first) setActive(first.id)
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    )

    for (const node of nodes) observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const entries = React.useMemo<DockEntry[]>(
    () =>
      sections.map((section) => ({
        key: section.id,
        label: section.label,
        icon: ICONS[section.icon],
        active: active === section.id,
        onSelect: () => {
          const node = document.getElementById(section.id)
          node?.scrollIntoView({ behavior: "smooth", block: "start" })
        },
      })),
    [active]
  )

  return <MacOsDock entries={entries} />
}
