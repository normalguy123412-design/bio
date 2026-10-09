import type * as React from "react"
import { cn } from "cn"

/**
 * БЛЕК ТЕКСТА.
 *
 * Взято из монорепозитория сайта 21st.dev (`apps/web/components/ui/text-shimmer.tsx`)
 * и переписано под наши цвета: там светлая подложка и переменные со своими
 * значениями, здесь фон чёрный, поэтому блик белый.
 *
 * Зависимостей ровно две — `motion/react` и `cn`, обе уже стоят в проекте,
 * так что файл переносится как есть.
 */
export function TextShimmer({
  children,
  as: Component = "p",
  className,
  duration = 2.4,
  spread = 2,
}: {
  children: string
  as?: React.ElementType
  className?: string
  duration?: number
  spread?: number
}) {
  const MotionComponent = Component

  return (
    <MotionComponent
      className={cn(
        "bg-clip-text text-transparent",
        "[--base-color:var(--foreground)]",
        "[--base-gradient-color:#ffffff]",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--base-gradient-color),#0000_calc(50%+var(--spread)))]",
        "[background-repeat:no-repeat,padding-box]",
        className,
      )}
      initial={{ backgroundPosition: "100% center" }}
      animate={{ backgroundPosition: "0% center" }}
      transition={{ repeat: Infinity, duration, ease: "linear" }}
      style={
        {
          "--spread": `${children.length * spread}px`,
          backgroundImage: `var(--bg), linear-gradient(var(--base-color), var(--base-color))`,
        } as React.CSSProperties
      }
    >
      {children}
    </MotionComponent>
  )
}
