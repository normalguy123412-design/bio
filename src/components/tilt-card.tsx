"use client"

import * as React from "react"
import { cn } from "cn"

/**
 * КАРТОЧКА, КОТОРАЯ ЖИВЁТ.
 *
 * Наклон считается вручную и пишется прямо в `transform`: если хранить его
 * в состоянии React, компонент перерисовывался бы на каждом кадре движения
 * мыши и тянул за собой всё дерево внутри карточки.
 *
 * Два отличия от простого «следуй за курсором»:
 *
 *   • Слушается вся страница, а не сама карточка. Иначе наклон начинался бы
 *     только тогда, когда курсор уже над карточкой, — реагировать было бы
 *     поздно.
 *
 *   • Движение не прекращается. К положению курсора добавляется медленный
 *     дрейф по синусоиде, поэтому карточка всегда чуть покачивается и не
 *     замирает, когда курсор стоит на месте. По той же причине цикл кадров
 *     не останавливается: он дешёвый и рисует одну строку transform.
 */
export function TiltCard({
  children,
  className,
  /** Максимальный наклон в градусах от курсора. */
  max = 6,
  /** Небольшое постоянное покачивание, градусы. */
  drift = 2.5,
  /** Во сколько раз карточка крупнее наклона — как у macOS-окон. */
  scale = 1.04,
}: {
  children: React.ReactNode
  className?: string
  max?: number
  drift?: number
  scale?: number
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    // При включённой настройке «меньше движения» карточка стоит ровно.
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    if (reduceMotion) return

    // Положение курсора в диапазоне −1…1 относительно центра экрана.
    const pointer = { x: 0, y: 0 }
    const eased = { x: 0, y: 0 }

    const onMove = (event: PointerEvent) => {
      const nx = (event.clientX - window.innerWidth / 2) / (window.innerWidth / 2)
      const ny = (event.clientY - window.innerHeight / 2) / (window.innerHeight / 2)
      pointer.x = Math.max(-1, Math.min(1, nx))
      pointer.y = Math.max(-1, Math.min(1, ny))
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")

    let frame = 0
    const started = performance.now()

    const loop = (now: number) => {
      const t = (now - started) / 1000

      // Медленный дрейф: две синусоиды разной длины, чтобы движение не
      // выглядело покачиванием с одним периодом.
      const wobbleX = Math.sin(t * 0.45) * drift
      const wobbleY = Math.cos(t * 0.31 + 1.2) * drift

      // К положению курсора добавляется доля наклона: чем ближе он к центру
      // и к самой карточке, тем сильнее карточка его слушается.
      eased.x += (pointer.x * max - eased.x) * 0.08
      eased.y += (pointer.y * max - eased.y) * 0.08

      el.style.transform =
        `perspective(1100px) ` +
        `rotateX(${(-eased.y + wobbleY).toFixed(3)}deg) ` +
        `rotateY(${(eased.x + wobbleX).toFixed(3)}deg) ` +
        `scale(${scale})`

      frame = requestAnimationFrame(loop)
    }

    frame = requestAnimationFrame(loop)
    window.addEventListener("pointermove", onMove, { passive: true })
    void reduce

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("pointermove", onMove)
    }
  }, [max, drift, scale])

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
