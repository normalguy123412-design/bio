"use client"

import * as React from "react"
import { views } from "@/lib/profile"

/**
 * Мелкие общие детали сцены: искра-знак (бренд), знак Discord, появление
 * блоков при прокрутке и счётчик просмотров.
 */

/** Четырёхлучевая искра — знак бренда. Рисована вручную под страницу. */
export function Spark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <defs>
        <linearGradient id="spark-fill" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8fe3ff" />
          <stop offset="0.5" stopColor="#a8bbf5" />
          <stop offset="1" stopColor="#d49bff" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.4l2.3 6.2 6.3 2.3-6.3 2.3L12 18.4 9.7 12.2 3.4 9.9l6.3-2.3z"
        fill="url(#spark-fill)"
        stroke="url(#spark-fill)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="19" cy="19.5" r="1.6" fill="#e8edf3" />
    </svg>
  )
}

/** Знак Discord для карточек и строки сервера. */
export function DiscordMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d="M19.3 5.3A16.5 16.5 0 0 0 15.2 4l-.5 1a15 15 0 0 0-4.4 0l-.5-1a16.5 16.5 0 0 0-4.1 1.3C3.1 9.2 2.4 13 2.7 16.7a16.6 16.6 0 0 0 5 2.5l1-1.7c-.6-.2-1.1-.5-1.6-.8l.4-.3a11.8 11.8 0 0 0 10.1 0l.4.3c-.5.3-1 .6-1.6.8l1 1.7a16.6 16.6 0 0 0 5-2.5c.4-4.3-.7-8.1-2.9-11.4ZM9.1 14.5c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.8 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
    </svg>
  )
}

/**
 * Погодная интенсивность.
 *
 * Погодный слой и «мокрые» капли на нике работают в разных canvas, но
 * должны сползать вниз одной погодой. Перегонять это через React-состояние
 * медленно — значения меняются 60 раз в секунду. Поэтому простой общий
 * слот, который оба слоя читают/пишут в рамках своего кадра анимации.
 */
export const weatherIntensity = { wet: 0, slant: 0.1 }

/**
 * Появление блока при прокрутке: один раз раскрывается, когда попадает
 * на экран. Работает классами, без состояния React — нечему дёргаться.
 */
export function usePeek(showClass = "is-in") {
  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined") {
      el?.classList.add(showClass)
      return
    }

    const watcher = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add(showClass)
            watcher.unobserve(el)
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    )

    watcher.observe(el)
    return () => watcher.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return ref
}

/** Хук для карт: стекло с бегущим за курсором кольцом и лёгким наклоном. */
export function useGlassTilt() {
  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    el.classList.add("is-live")

    const glowIn = el.querySelector<HTMLElement>(".orb-ring")
    const glowBloom = el.querySelector<HTMLElement>(".orb-bloom")

    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      el.style.setProperty("--gx", `${x}px`)
      el.style.setProperty("--gy", `${y}px`)
      el.style.setProperty("--gr", `${Math.max(rect.width, rect.height) * 0.42}px`)
      el.style.setProperty("--ga", "1")

      const nx = x / rect.width - 0.5
      const ny = y / rect.height - 0.5
      el.style.setProperty("--ry", `${(nx * 5).toFixed(2)}deg`)
      el.style.setProperty("--rx", `${(-ny * 5).toFixed(2)}deg`)

      if (glowIn) {
        glowIn.style.setProperty("--gx", `${x}px`)
        glowIn.style.setProperty("--gy", `${y}px`)
        glowIn.style.setProperty("--gr", `${Math.max(rect.width, rect.height) * 0.42}px`)
      }
      if (glowBloom) {
        glowBloom.style.setProperty("--gx", `${x}px`)
        glowBloom.style.setProperty("--gy", `${y}px`)
        glowBloom.style.setProperty("--gr", `${Math.max(rect.width, rect.height) * 0.5}px`)
      }
    }

    const leave = () => {
      el.style.setProperty("--ga", "0")
      el.style.removeProperty("--rx")
      el.style.removeProperty("--ry")
    }

    el.addEventListener("pointermove", move)
    el.addEventListener("pointerleave", leave)
    return () => {
      el.removeEventListener("pointermove", move)
      el.removeEventListener("pointerleave", leave)
    }
  }, [])

  return ref
}

/** Номер, который CounterAPI и подобные отдают под разными ключами. */
function readCounter(data: unknown): number | null {
  if (typeof data === "number" && Number.isFinite(data)) return data
  if (data && typeof data === "object") {
    for (const value of Object.values(data as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value)) return value
      if (value && typeof value === "object") {
        const nested = readCounter(value)
        if (nested !== null) return nested
      }
    }
  }
  return null
}

/**
 * Счётчик просмотров. Адрес может быть пуст — тогда ничего не вернётся
 * и «остров» просто не нарисует свою глазную часть.
 */
export function useViewCount(): number | null {
  const [count, setCount] = React.useState<number | null>(null)

  React.useEffect(() => {
    const endpoint = views.endpoint
    if (!endpoint) return

    const controller = new AbortController()

    const ask = async () => {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal })
        if (!response.ok) return
        setCount(readCounter(await response.json()))
      } catch {
        // Счётчик опоздал или не отвечал — не страшно, повторим в следующий раз.
      }
    }

    void ask()
    const timer = window.setInterval(ask, 30_000)

    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  return count
}

/** «1:07» по секундам. */
export function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/** Копирование с запасным механизмом, когда clipboard API закрыт. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const helper = document.createElement("textarea")
      helper.value = text
      helper.style.position = "fixed"
      helper.style.opacity = "0"
      document.body.append(helper)
      helper.select()
      const ok = document.execCommand("copy")
      helper.remove()
      return ok
    } catch {
      return false
    }
  }
}
