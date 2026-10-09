"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * БЛЕК ТЕКСТА.
 *
 * Взято из монорепозитория сайта 21st.dev
 * (`apps/web/components/ui/text-shimmer.tsx`) и переписано под наши цвета:
 * там светлая подложка и свои значения переменных, здесь фон чёрный, поэтому
 * блик белый.
 *
 * С опцией `scramble` текст сначала выглядит случайными символами и
 * постепенно собирается в нужный: слева буквы встают на места раньше
 * правых. Похоже на расшифровку. Останавливается один раз и не
 * перезапускается — иначе надпись дёргалась бы снова и снова.
 */
const NOISE =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#$%&*+<>=?@"

/**
 * Случайные символы, постепенно превращающиеся в `target`.
 *
 * Возвращает текущую строку. Готовый текст больше не меняется: цикл кадров
 * останавливается, иначе надпись продолжала бы «мерцать» после того, как
 * расшифровалась.
 *
 * Хук вызывается безусловно, поэтому анимация включается флагом `enabled`,
 * а не тем, вызвали ли мы его. Иначе порядок хуков менялся бы от рендера к
 * рендеру и React падал бы.
 */
function useScramble(target: string, duration: number, enabled: boolean) {
  const [shown, setShown] = React.useState(target)
  const done = React.useRef(false)

  React.useEffect(() => {
    if (!enabled || done.current) return
    done.current = true

    // При включённом «меньше движения» текст просто остаётся готовым:
    // вызывать setState прямо в эффекте запрещено, но и не нужно — он и так
    // изначально равен target.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const chars = [...target]
    // Доля времени, за которую все символы встают на места. Остальное
    // отдано готовому тексту — чтобы он не дрожал в самом конце.
    const lockShare = 0.65
    const start = performance.now()

    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const per = chars.length ? lockShare / chars.length : 1

      const next = chars
        .map((char, index) => {
          // Пробел держим пробелом: он в шуме не читался бы как буква.
          if (char === " ") return " "
          if (progress >= per * (index + 1)) return char
          return NOISE[Math.floor(Math.random() * NOISE.length)]
        })
        .join("")

      setShown(next)

      if (progress >= lockShare) {
        setShown(target)
        return
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, enabled])

  return shown
}

export function TextShimmer({
  children,
  as: Component = "p",
  className,
  duration = 2.4,
  spread = 2,
  scramble = false,
}: {
  children: string
  as?: React.ElementType
  className?: string
  duration?: number
  spread?: number
  /** Показать текст случайными символами, пока он не сложится в нужный. */
  scramble?: boolean
}) {
  // Ширина блика считается по итоговому тексту: во время расшифровки длина
  // строки прыгает, и блик дёргался бы вместе с ней.
  const shown = useScramble(children, duration * 400, scramble)

  return (
    <Component
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
      {shown}
    </Component>
  )
}

/**
 * Заголовок вкладки, который собирается из шума.
 *
 * Один раз при открытии страницы: сначала случайные символы, потом
 * `NiceGuy — ...`. Дальше не трогаем — перезаписывать заголовок на каждом
 * рендере было бы и лишней работой, и источником расхождений между
 * серверной и клиентской разметкой.
 */
export function useScrambledTitle(target: string, duration = 1400) {
  const done = React.useRef(false)

  React.useEffect(() => {
    if (done.current) return
    done.current = true

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.title = target
      return
    }

    const chars = [...target]
    const start = performance.now()
    const lockShare = 0.6
    const per = chars.length ? lockShare / chars.length : 1

    let frame = 0

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      document.title = chars
        .map((char, index) => {
          if (char === " ") return " "
          if (progress >= per * (index + 1)) return char
          return NOISE[Math.floor(Math.random() * NOISE.length)]
        })
        .join("")

      if (progress >= lockShare) {
        document.title = target
        return
      }

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])
}
