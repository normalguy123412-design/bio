"use client"

import * as React from "react"
import { useMusic } from "@/components/scene/music"

/**
 * Громкость.
 *
 * Стеклянный стакан с жидкостью: уровень = громкость, тянется пальцем
 * или мышкой. Пока держат, жидкость едет за пальцем; отпускают —
 * уровень запоминается.
 */

function MuteGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Zm11.3.3a3.6 3.6 0 0 1 0 4.4l-1.1-1.1a2 2 0 0 0 0-2.2l1.1-1.1Zm2.2-2.2a6.6 6.6 0 0 1 0 8.8l-1.1-1.1a5 5 0 0 0 0-6.6l1.1-1.1Z" />
    </svg>
  )
}

function HalfGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Zm11.3.3a3.6 3.6 0 0 1 0 4.4l-1.1-1.1a2 2 0 0 0 0-2.2l1.1-1.1Zm2.2-2.2a6.6 6.6 0 0 1 0 8.8l-1.1-1.1a5 5 0 0 0 0-6.6l1.1-1.1Z" />
    </svg>
  )
}

function FullGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Zm11.3.3a3.6 3.6 0 0 1 0 4.4l-1.1-1.1a2 2 0 0 0 0-2.2l1.1-1.1Zm2.2-2.2a6.6 6.6 0 0 1 0 8.8l-1.1-1.1a5 5 0 0 0 0-6.6l1.1-1.1Z" />
    </svg>
  )
}

export function VolumeDrop() {
  const { started, volume, muted } = useMusic()
  const [open, setOpen] = React.useState(false)

  return (
    <div className={`voldrop${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="voldrop-toggle"
        onClick={() => setOpen(true)}
        aria-label="Громкость"
        aria-expanded={open}
        style={{ opacity: started ? 1 : 0, pointerEvents: started ? "auto" : "none" }}
      >
        {muted || volume === 0 ? (
          <MuteGlyph />
        ) : volume < 0.5 ? (
          <HalfGlyph />
        ) : (
          <FullGlyph />
        )}
      </button>
      {open ? <FillGlass onLeave={() => setOpen(false)} /> : null}
    </div>
  )
}

type GlassProps = { onLeave: () => void }

function FillGlass({ onLeave }: GlassProps) {
  const { volume, muted, setVolume, setMuted } = useMusic()
  const shellRef = React.useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [view, setView] = React.useState(() => (muted ? 0 : volume))

  /* Клик мимо стакана сворачивает его. */
  React.useEffect(() => {
    const el = shellRef.current
    if (!el) return
    const away = (event: PointerEvent) => {
      if (!el.contains(event.target as Node)) onLeave()
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Мгновенный уровень и как выглядит стакан: держат или уже отпустили. */
  const shown = dragging ? view : muted ? 0 : volume
  const height = `${Math.round(shown * 100)}%`

  const locate = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = shellRef.current
    if (!box) return null
    const rect = box.getBoundingClientRect()
    const raw = 1 - (event.clientY - rect.top) / rect.height
    const clean = Math.min(1, Math.max(0, raw))
    return Number.isFinite(clean) ? Number(clean.toFixed(2)) : null
  }

  const grab = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return
    const v = locate(event)
    if (v === null) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    shellRef.current?.setAttribute("data-held", "true")
    setView(v)
    if (muted) setMuted(false)
    setVolume(v)
  }

  const drag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return
    const v = locate(event)
    if (v === null) return
    setView(v)
    setVolume(v)
  }

  const drop = () => {
    setDragging(false)
    shellRef.current?.removeAttribute("data-held")
  }

  const nudge = (step: number) => {
    const next = Number(Math.min(1, Math.max(0, shown + step)).toFixed(2))
    setView(next)
    if (next > 0 && muted) setMuted(false)
    setVolume(next)
  }

  return (
    <div
      ref={shellRef}
      className="fillmeter"
      role="slider"
      aria-label="Громкость"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      tabIndex={0}
      onPointerDown={grab}
      onPointerMove={drag}
      onPointerUp={drop}
      onPointerCancel={drop}
      onKeyDown={(event) => {
        if (event.key === "ArrowUp" || event.key === "ArrowRight") {
          event.preventDefault()
          nudge(0.05)
        }
        if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
          event.preventDefault()
          nudge(-0.05)
        }
      }}
      onBlur={drop}
    >
      <div className="liq" style={{ height, transition: dragging ? "none" : "height 0.22s ease-out" }} />
      <div className="ticks" aria-hidden />
      <div
        className="mark"
        style={{ ["--mark" as string]: `${Math.round((1 - shown) * 100)}%` } as React.CSSProperties}
        aria-hidden
      />
      <div className="num" aria-hidden>
        {Math.round(shown * 100)}
      </div>
    </div>
  )
}
