"use client"

import * as React from "react"
import { useMusic } from "@/components/scene/music"

/**
 * Полоса перемотки на нижнем крае экрана: тонкая линия прогресса во всю
 * ширину. Клик по ней переставляет трек на выбранную часть.
 */
export function SeekLine() {
  const { started, current, duration, seek } = useMusic()
  const stripRef = React.useRef<HTMLDivElement>(null)

  const fraction = duration > 0 ? Math.min(1, current / duration) : 0

  const jump = (event: React.PointerEvent<HTMLDivElement>) => {
    const el = stripRef.current
    if (!el || duration <= 0) return
    const rect = el.getBoundingClientRect()
    seek((event.clientX - rect.left) / rect.width)
  }

  return (
    <div ref={stripRef} className="seekline" onPointerDown={jump} role="presentation" aria-hidden={!started}>
      <i style={{ width: `${fraction * 100}%`, opacity: started ? 1 : 0 }} />
    </div>
  )
}
