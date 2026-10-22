"use client"

import * as React from "react"
import { profile } from "@/lib/profile"
import { useLang, type Lang } from "@/components/scene/lang"

/**
 * Заставка.
 *
 * Первый экран — чёрный, с «феррофлюидной» жижей за фоном. Сначала
 * человек выбирает язык интерфейса, затем отвечает на вопрос о музыке,
 * и только тогда заставка отпускает сцену: буквы названия отваливаются
 * вниз, как капли.
 */

type InkBlob = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  seed: number
}

/** Перебор символов: заголовок заставки собирается из шума. */
const NOISE = "-_/\\|<>*#=+~^"

function scrambleTo(el: HTMLElement, text: string, done?: () => void) {
  const from = el.textContent ?? ""
  const span = Math.max(from.length, text.length)
  const start = performance.now()
  const dur = 760

  const step = (now: number) => {
    const k = Math.min(1, (now - start) / dur)
    let out = ""
    for (let i = 0; i < span; i++) {
      const reach = (i / span) * 0.6 + 0.14
      if (k >= reach + 0.26) out += text.charAt(i) || ""
      else if (k >= reach - 0.1) {
        out += text.charAt(i) === " " ? " " : NOISE.charAt((Math.random() * NOISE.length) | 0)
      } else out += from.charAt(i) || ""
    }
    el.textContent = out
    if (k < 1) requestAnimationFrame(step)
    else if (done) done()
  }

  requestAnimationFrame(step)
}

const TITLES = ["Выберите язык", "Choose a language"]

export function Gate({ onEnter, onGone }: { onEnter: (withSound: boolean) => void; onGone: () => void }) {
  const { t, setLang } = useLang()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const titleRef = React.useRef<HTMLHeadingElement>(null)
  const [phase, setPhase] = React.useState<"lang" | "sound" | "leaving">("lang")

  /* ---------- жижа за заставкой ---------- */
  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let w = 0
    let h = 0

    const size = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    // капли чернил: плавают, чуть притягиваются к курсору и слипаются
    const makeBlobs = (count: number): InkBlob[] =>
      Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 26 + Math.random() * 60,
        seed: Math.random() * Math.PI * 2,
      }))

    const pointer = { x: 0.5, y: 0.5, seen: false }
    let blobs: InkBlob[] = []
    let raf = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const time = now / 1000

      ctx.clearRect(0, 0, w, h)

      for (const b of blobs) {
        // вольный дрейф + мягкий чирк к курсору
        b.vx += Math.sin(time * 0.6 + b.seed) * 0.006
        b.vy += Math.cos(time * 0.45 + b.seed * 1.7) * 0.006
        if (pointer.seen) {
          b.vx += ((pointer.x * w - b.x) / w) * 0.0022
          b.vy += ((pointer.y * h - b.y) / h) * 0.0022
        }
        b.vx *= 0.985
        b.vy *= 0.985
        b.x += b.vx
        b.y += b.vy

        // края играют роль стен
        if (b.x < -b.r) b.x = w + b.r
        if (b.x > w + b.r) b.x = -b.r
        if (b.y < -b.r) b.y = h + b.r
        if (b.y > h + b.r) b.y = -b.r

        const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        glow.addColorStop(0, "rgba(64, 78, 132, 0.95)")
        glow.addColorStop(0.72, "rgba(38, 48, 92, 0.85)")
        glow.addColorStop(1, "rgba(24, 30, 62, 0)")
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()

        // влажный блик, чуть смещённый к верху-лево
        ctx.fillStyle = "rgba(214, 228, 255, 0.5)"
        ctx.beginPath()
        ctx.arc(b.x - b.r * 0.24, b.y - b.r * 0.26, Math.max(1.5, b.r * 0.09), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const move = (event: PointerEvent) => {
      pointer.x = event.clientX / window.innerWidth
      pointer.y = event.clientY / window.innerHeight
      pointer.seen = true
    }

    size()
    blobs = makeBlobs(Math.round(24 + Math.min(16, window.innerWidth / 90)))
    canvas.classList.add("is-on")
    window.addEventListener("resize", size)
    window.addEventListener("pointermove", move, { passive: true })
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", size)
      window.removeEventListener("pointermove", move)
    }
  }, [])

  /* ---------- заголовок перебирает языки ---------- */
  React.useEffect(() => {
    const title = titleRef.current
    if (!title || phase !== "lang") return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      title.textContent = t(TITLES[0])
      return
    }

    let stop = false
    let timer = 0
    let pick = 0
    const rotate = () => {
      if (stop) return
      scrambleTo(title, t(TITLES[pick]))
      pick = (pick + 1) % TITLES.length
      timer = window.setTimeout(rotate, 3400)
    }
    rotate()

    return () => {
      stop = true
      window.clearTimeout(timer)
    }
  }, [phase, t])

  /* ---------- выбор языка ---------- */
  const chooseLang = (next: Lang) => {
    setLang(next)
    window.setTimeout(() => setPhase("sound"), 620)
  }

  /* ---------- вход ---------- */
  const enter = (withSound: boolean) => {
    onEnter(withSound)
    setPhase("leaving")
    window.setTimeout(onGone, 1500)
  }

  const letters = React.useMemo(() => profile.name.split(""), [])
  const leaving = phase === "leaving"

  return (
    <div className={`gate${leaving ? " is-leaving" : ""}`} role="dialog" aria-label="Вход на страницу">
      {/* сводящий чернила фильтр для жижи */}
      <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
        <filter id="ink-goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="soft" />
          <feColorMatrix in="soft" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </svg>
      <canvas ref={canvasRef} className="gate-canvas" style={{ filter: "url(#ink-goo)" }} aria-hidden />

      {phase === "lang" ? (
        <div className="gate-lang">
          <p className="gate-kicker">niceguy — био</p>
          <h2 ref={titleRef} className="gate-title">
            Выберите язык
          </h2>
          <div className="gate-btns">
            <button type="button" className="gate-b" onClick={() => chooseLang("ru")}>
              <span className="flagcirc" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="12" fill="#f4f6fb" />
                  <rect x="0" y="8" width="24" height="8" fill="#3d5da7" />
                  <rect x="0" y="14.5" width="24" height="7.5" fill="#c9484f" />
                </svg>
              </span>
              <span>{t("Русский")}</span>
              <svg className="gate-arr fill-svg" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h13m-5.5-6.5L19 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button type="button" className="gate-b" onClick={() => chooseLang("en")}>
              <span className="flagcirc" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="12" fill="#0a1a4a" />
                  <path d="M11 4h2v6H21v2h-8v8h-2v-8H3v-2h8z" fill="#e8edf3" />
                  <path d="M11.6 5.6h.8V9.8h4.4v.8h-4.4v6.9h-.8v-6.9H7.1V9.8h4.5z" fill="#c9484f" />
                </svg>
              </span>
              <span>{t("English")}</span>
              <svg className="gate-arr fill-svg" viewBox="0 0 24 24" aria-hidden>
                <path d="M5 12h13m-5.5-6.5L19 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <p className="gate-note">
            <svg className="fill-svg" viewBox="0 0 24 24" aria-hidden>
              <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12.5-7.5a1 1 0 0 0 0-1.7L8.5 3.6A1 1 0 0 0 7 4.5z" />
            </svg>
            {t("музыка встретит дальше")}
          </p>
        </div>
      ) : null}

      {phase === "sound" ? (
        <div className="gate-sound" role="group" aria-label="Музыка">
          <h2>{t("Включить музыку ?")}</h2>
          <div className="pair">
            <button type="button" className="gate-b2 yes" onClick={() => enter(true)}>
              <svg className="fill-svg" viewBox="0 0 24 24" aria-hidden>
                <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12.5-7.5a1 1 0 0 0 0-1.7L8.5 3.6A1 1 0 0 0 7 4.5z" />
              </svg>
              {t("Включить")}
            </button>
            <button type="button" className="gate-b2 no" onClick={() => enter(false)}>
              <svg className="fill-svg" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.2 12.8-1.4 1.4L12 13.4l-2.8 2.8-1.4-1.4 2.8-2.8L7.8 9.2l1.4-1.4 2.8 2.8 2.8-2.8 1.4 1.4-2.8 2.8 2.8 2.8z" />
              </svg>
              {t("Не сейчас")}
            </button>
          </div>
        </div>
      ) : null}

      {leaving ? (
        <p className="gate-name" aria-hidden>
          {letters.map((letter, index) => (
            <span key={index} className="lt" style={{ ["--d" as string]: `${0.05 + index * 0.06}s` } as React.CSSProperties}>
              {letter === " " ? "\u00a0" : letter}
            </span>
          ))}
        </p>
      ) : null}
    </div>
  )
}
