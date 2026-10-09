"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * КАРТОЧКА, КОТОРАЯ ПОВОРАЧИВАЕТСЯ ЗА КУРСОРОМ.
 *
 * Наклон и подъём считаются вручную и пишутся прямо в `transform` элемента:
 * если хранить их в состоянии React, компонент перерисовывался бы на каждом
 * кадре движения мыши и тянул за собой всё дерево внутри карточки.
 *
 * Поворот догоняет цель плавно, поэтому цикл кадров запускается только на
 * время движения и останавливается, как только карточка «доехала».
 */
export function TiltCard({
  children,
  className,
  /** Максимальный наклон в градусах. */
  max = 7,
  /** Насколько карточка поднимается над плоскостью. */
  lift = 26,
}: {
  children: React.ReactNode
  className?: string
  max?: number
  lift?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  const frame = React.useRef(0)
  const target = React.useRef({ x: 0, y: 0 })
  const current = React.useRef({ x: 0, y: 0 })

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    // При включённой настройке «меньше движения» карточка просто стоит ровно.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const loop = () => {
      const c = current.current
      const t = target.current

      c.x += (t.x - c.x) * 0.12
      c.y += (t.y - c.y) * 0.12

      el.style.transform = `perspective(1200px) rotateX(${c.y}deg) rotateY(${c.x}deg) translateZ(${lift}px)`

      const settled =
        Math.abs(t.x - c.x) < 0.01 && Math.abs(t.y - c.y) < 0.01

      if (settled) {
        // Дошли до цели — освобождаем кадры, пока мышь снова не двинется.
        el.style.transform = `perspective(1200px) rotateX(0deg) rotateY(0deg)`
        frame.current = 0
        return
      }

      frame.current = requestAnimationFrame(loop)
    }

    const start = () => {
      if (!frame.current) frame.current = requestAnimationFrame(loop)
    }

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      if (!rect.width || !rect.height) return

      // Смещение курсора от центра карточки, приведённое к диапазону −1…1.
      const nx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
      const ny = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)

      target.current.x = Math.max(-1, Math.min(1, nx)) * max
      // По вертикали наоборот: курсор сверху — край карточки уходит от нас.
      target.current.y = -Math.max(-1, Math.min(1, ny)) * max

      start()
    }

    const onLeave = () => {
      target.current.x = 0
      target.current.y = 0
      start()
    }

    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
    }
  }, [max, lift])

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  )
}
