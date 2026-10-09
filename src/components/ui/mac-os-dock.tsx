"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import type { IconComponent } from "@/components/icons"
import { cn } from "cn"

export type DockAction = {
  key: string
  label: string
  icon: IconComponent
  onSelect: () => void
  active?: boolean
  /**
   * Признак-разделитель. Объявлен и у обычного пункта — иначе TypeScript
   * не сужает объединение по `entry.separator`.
   */
  separator?: false
}

export type DockSeparator = { key: string; separator: true }

export type DockEntry = DockAction | DockSeparator

/**
 * Подпись к кнопке.
 *
 * Позиционирование вынесено в обычную обёртку, а анимируется только
 * содержимое: и `-translate-x-1/2`, и `animate={{x}}` писали бы в один
 * `transform`, и motion затирал бы сдвиг — подпись уезжала бы от кнопки.
 */
function DockTooltip({
  children,
  content,
}: {
  children: React.ReactNode
  content: string
}) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <div className="pointer-events-none absolute top-1/2 right-full -translate-y-1/2 translate-x-2">
        <AnimatePresence>
          {visible ? (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="mr-2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-lg"
            >
              {content}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * Кнопка дока: при наведении подпрыгивает и растёт, у активного пункта
 * остаётся постоянная подсветка — иначе в доке непонятно, где вы находитесь.
 */
function DockItem({
  children,
  tooltip,
  active,
}: {
  children: React.ReactNode
  tooltip: string
  active?: boolean
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.15, x: -4 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="relative"
    >
      <DockTooltip content={tooltip}>{children}</DockTooltip>
      {active ? (
        <span className="absolute top-1/2 -right-1.5 size-1.5 -translate-y-1/2 rounded-full bg-sky-400" />
      ) : null}
    </motion.div>
  )
}

function DockDivider() {
  return <span aria-hidden className="mx-1 h-px w-8 self-center bg-border" />
}

function DockButton({
  label,
  active,
  onSelect,
  children,
}: {
  label: string
  active?: boolean
  onSelect: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-current={active ? "true" : undefined}
      className={cn(
        "grid size-11 place-items-center rounded-full transition-colors",
        "hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
        active ? "text-sky-400" : "text-foreground/70 hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

/**
 * ДОК В СТИЛЕ macOS, вертикальный, у правого края экрана.
 *
 * На странице био переключать разделы удобнее сбоку: колонка занимает
 * правую кромку, ничего не перекрывает по центру и не исчезает при прокрутке.
 * В отличие от нижнего дока в «ИБ-Гиде» он всегда на виду — здесь страница
 * короткая и прятать навигацию незачем.
 */
export function MacOsDock({ entries }: { entries: DockEntry[] }) {
  return (
    <motion.nav
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      aria-label="Разделы страницы"
      className="fixed top-1/2 right-4 z-40 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border bg-background/80 px-3 py-4 shadow-lg backdrop-blur-lg"
    >
      {entries.map((entry) =>
        entry.separator ? (
          <DockDivider key={entry.key} />
        ) : (
          <DockItem key={entry.key} tooltip={entry.label} active={entry.active}>
            <DockButton
              label={entry.label}
              active={entry.active}
              onSelect={entry.onSelect}
            >
              <entry.icon className="size-4" />
            </DockButton>
          </DockItem>
        )
      )}
    </motion.nav>
  )
}
