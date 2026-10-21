"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * ПОЯВЛЕНИЕ ПРИ ПРОКРУТКЕ.
 *
 * Раньше весь сайт помещался в один экран, и ничего «приезжало» — нечему
 * было. С прокруткой же каждый отдел обязан появляться из лёгкой дымки,
 * иначе страница похожа на выписанную таблицу: контент ниже края экрана
 * висит в готовом виде.
 *
 * Смотрит IntersectionObserver. Увидели один раз — и всё: если следующий
 * кадр затухания не показать, элемент так и останется видимым, поэтому
 * наблюдение прекращается сразу после первого вхождения.
 */
export function Reveal({
  children,
  className,
  /** Задержка старта в миллисекундах: сети с карточек встают по очереди. */
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    /*
      При включённой настройке «меньше движения» отдельная ветка не нужна:
      глобальный запрет анимаций в CSS сделает появление мгновенным, а
      setState здесь и так вызывается из колбэка наблюдателя, не из тела.
    */
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn("reveal", shown && "reveal-in", className)}
    >
      {children}
    </div>
  )
}
