"use client"

import * as React from "react"
import { weatherIntensity } from "@/components/scene/parts"

/**
 * Погодная система сцены.
 *
 * Слой работает сам по себе: дождь, изредка гроза; по ссылке «?wx=snow»
 * или «?wx=sun» — снег и ясное небо. Режим выбирается автоматически
 * (дождь чаще грозы), конкретный форс в адресе его перебивает.
 * Интенсивность пишется в общий слот weatherIntensity — оттуда её читают
 * капли на нике.
 */

type Mode = "rain" | "storm" | "snow" | "sun"

const MODES: Mode[] = ["rain", "storm", "snow", "sun"]

type Drop = { x: number; y: number; len: number; speed: number; alpha: number }
type Flake = { x: number; y: number; r: number; speed: number; drift: number }
type Ripple = { x: number; y: number; r: number; alpha: number }
type Bolt = { path: number[][]; twigs: number[][][]; life: number }

function pickMode(previous: Mode): Mode {
  // Дождь заметно чаще грозы; снег и ясное небо сами по себе не выпадают.
  const bag: Mode[] = ["rain", "rain", "rain", "storm", "storm"]
  let next = bag[Math.floor(Math.random() * bag.length)]
  let guard = 0
  while (next === previous && guard++ < 8) {
    next = bag[Math.floor(Math.random() * bag.length)]
  }
  return next
}

export function Weather() {
  const sunRef = React.useRef<HTMLDivElement>(null)
  const zapRef = React.useRef<HTMLDivElement>(null)
  const rainRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const sun = sunRef.current
    const zap = zapRef.current
    const canvas = rainRef.current
    if (!sun || !zap || !canvas) return

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const query = new URLSearchParams(window.location.search)
    const forbidden = query.get("wx")
    const forced: Mode | null = forbidden && MODES.includes(forbidden as Mode) ? (forbidden as Mode) : null
    let mode: Mode = forced ?? "rain"

    // Включаем слой плавным появлением.
    canvas.classList.add("is-on")

    if (reduce) {
      // Без движений рисуем только световую подложку.
      sun.style.opacity = mode === "sun" ? "1" : "0"
      return
    }

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let w = 0
    let h = 0
    let dropPool: Drop[] = []
    let flakePool: Flake[] = []
    const ripples: Ripple[] = []
    const bolts: Bolt[] = []

    const makeDrop = (seeded: boolean): Drop => ({
      x: Math.random() * w,
      y: seeded ? Math.random() * h : -24,
      len: 9 + Math.random() * 18,
      speed: 9 + Math.random() * 9,
      alpha: 0.08 + Math.random() * 0.22,
    })

    const makeFlake = (seeded: boolean): Flake => ({
      x: Math.random() * w,
      y: seeded ? Math.random() * h : -10,
      r: 0.8 + Math.random() * 2,
      speed: 0.5 + Math.random(),
      drift: Math.random() * Math.PI * 2,
    })

    const size = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      dropPool = Array.from({ length: Math.round(w / 6) }, () => makeDrop(true))
      flakePool = Array.from({ length: Math.round(w / 7) }, () => makeFlake(true))
    }

    /** Уровни режимов от 0 до 1: непрозрачности догоняют цели со скоростью лерп. */
    const level = { rain: 0, storm: 0, snow: 0, sun: 0 }
    const target = { rain: 1, storm: 0, snow: 0, sun: 0 }

    const applyMode = (next: Mode) => {
      mode = next
      target.rain = next === "rain" ? 1 : next === "storm" ? 0.75 : 0
      target.storm = next === "storm" ? 1 : 0
      target.snow = next === "snow" ? 1 : 0
      target.sun = next === "sun" ? 1 : 0
    }

    const growBolt = () => {
      const startX = w * (0.12 + Math.random() * 0.76)
      const endY = h * (0.35 + Math.random() * 0.35)
      const finishX = startX + (Math.random() - 0.5) * w * 0.16
      const path: number[][] = [[startX, 0]]
      const twigs: number[][][] = []
      let x = startX
      let y = 0

      while (y < endY) {
        y += 16 + Math.random() * 30
        x += (Math.random() - 0.5) * 46 + (finishX - x) * 0.06
        path.push([x, y])

        if (Math.random() < 0.13) {
          const twig: number[][] = []
          let tx = x
          let ty = y
          const dir = Math.random() < 0.5 ? -1 : 1
          const twigLen = 3 + Math.floor(Math.random() * 5)
          for (let k = 0; k < twigLen; k++) {
            tx += dir * (8 + Math.random() * 22)
            ty += 8 + Math.random() * 20
            twig.push([tx, ty])
          }
          twigs.push(twig)
        }
      }

      bolts.push({ path, twigs, life: 1 })
      bornAt = performance.now()
    }

    let raf = 0
    let bornAt = 0
    let zapLevel = 0
    let nextFlash = 0

    const paintPath = (points: number[][], width: number, alpha: number) => {
      ctx.lineWidth = width
      ctx.strokeStyle = `rgba(227, 238, 255, ${alpha})`
      ctx.beginPath()
      ctx.moveTo(points[0][0], points[0][1])
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
      ctx.stroke()
    }

    const frame = () => {
      for (const key of MODES) level[key] += (target[key] - level[key]) * 0.016

      const rainPower = Math.min(1, level.rain * 0.55 + level.storm)
      const slant = 0.08 + level.storm * 0.2
      const speedUp = 1 + level.storm * 0.55
      const now = performance.now()

      weatherIntensity.wet = level.rain * 0.6 + level.storm * 1.25
      weatherIntensity.slant = slant

      sun.style.opacity = (level.sun * 0.9).toFixed(3)
      ctx.clearRect(0, 0, w, h)

      const floor = h * 0.88

      // дождь со специфичным перекосом в грозе
      ctx.lineWidth = 1
      const visibleDrops = Math.round(dropPool.length * rainPower)
      for (let i = 0; i < visibleDrops; i++) {
        const d = dropPool[i]
        const v = d.speed * speedUp
        ctx.strokeStyle = `rgba(190, 214, 238, ${d.alpha})`
        ctx.beginPath()
        ctx.moveTo(d.x, d.y)
        ctx.lineTo(d.x - d.len * slant, d.y + d.len)
        ctx.stroke()

        d.y += v
        d.x -= v * slant

        if (d.y > floor + Math.random() * h * 0.1) {
          if (Math.random() < 0.3) {
            ripples.push({ x: d.x, y: floor + Math.random() * h * 0.08, r: 1, alpha: 0.25 })
          }
          dropPool[i] = makeDrop(false)
        }
        if (d.x < -30) d.x = w + Math.random() * 30
      }

      // круги на «воде» у горизонта экрана
      ctx.lineWidth = 1
      for (let i = ripples.length - 1; i >= 0; i--) {
        const q = ripples[i]
        q.r += 0.75
        q.alpha -= 0.006
        if (q.alpha <= 0) {
          ripples.splice(i, 1)
          continue
        }
        ctx.strokeStyle = `rgba(200, 214, 250, ${q.alpha})`
        ctx.beginPath()
        ctx.ellipse(q.x, q.y, q.r * 2.4, q.r * 0.6, 0, 0, Math.PI * 2)
        ctx.stroke()
      }

      // снег
      const visibleFlakes = Math.round(flakePool.length * level.snow)
      for (let i = 0; i < visibleFlakes; i++) {
        const f = flakePool[i]
        f.drift += 0.012
        f.y += f.speed
        f.x += Math.sin(f.drift) * 0.5 + 0.12

        if (f.y > h + 6) {
          flakePool[i] = makeFlake(false)
          continue
        }
        if (f.x > w + 6) f.x = -6

        const a = (0.45 + (f.r / 2.8) * 0.4) * Math.min(1, level.snow * 1.2)
        ctx.fillStyle = `rgba(238, 244, 255, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
        ctx.fill()
      }

      // молнии в грозе
      if (level.storm > 0.62 && now > nextFlash) {
        growBolt()
        nextFlash = now + 2600 + Math.random() * 6400
      }
      ctx.save()
      ctx.lineJoin = "round"
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]
        b.life -= 0.04
        if (b.life <= 0) {
          bolts.splice(i, 1)
          continue
        }
        const a = b.life * (Math.random() > 0.25 ? 1 : 0.45)
        ctx.shadowBlur = 18
        ctx.shadowColor = `rgba(150, 180, 255, ${a})`
        paintPath(b.path, 2.2, a)
        for (const twig of b.twigs) paintPath(twig, 1.1, a * 0.8)
      }
      ctx.restore()

      // вспышка молнии: рождается ярко и тут же меркнет, чуть подмигивая
      if (bornAt && now - bornAt < 170 && zapLevel < 0.6) zapLevel = 0.5 + Math.random() * 0.35
      zapLevel *= 0.9
      zap.style.opacity = (zapLevel < 0.01 ? 0 : zapLevel).toFixed(3)

      raf = window.requestAnimationFrame(frame)
    }

    size()
    applyMode(mode)
    window.addEventListener("resize", size)
    raf = window.requestAnimationFrame(frame)

    // Небо само перекрашивается по расписанию, а ясность и снег — только
    // коротким сеансом, затем снова дождь и гроза.
    let timer = 0
    const scheduleWeather = () => {
      timer = window.setTimeout(() => {
        if (forced) return
        const next = pickMode(mode)
        if (next !== mode) applyMode(next)
        if (next === "snow" || next === "sun") {
          timer = window.setTimeout(() => {
            if (mode === "snow" || mode === "sun") applyMode(pickMode(mode))
            scheduleWeather()
          }, 12000)
        } else {
          scheduleWeather()
        }
      }, 19000 + Math.random() * 22000)
    }
    scheduleWeather()

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("resize", size)
      window.clearTimeout(timer)
      weatherIntensity.wet = 0
    }
  }, [])

  return (
    <>
      <div ref={sunRef} className="sunny" aria-hidden />
      <div ref={zapRef} className="zap" aria-hidden />
      <canvas ref={rainRef} className="raincv" aria-hidden />
    </>
  )
}

/**
 * Вода, стекающая по буквам ника.
 *
 * Отдельная канва над словом. Двухслойная: намокание и капли кладутся
 * внутрь букв через маску из курсивного текста, струи и круги у кромки
 * живут поверх, как настоящая вода.
 */
export function NickWater() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useEffect(() => {
    const canvas = canvasRef.current
    const word = document.getElementById("nick-word")
    if (!canvas || !word) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const mask = document.createElement("canvas")
    const mx = mask.getContext("2d")
    const tank = document.createElement("canvas")
    const tx = tank.getContext("2d")
    if (!mx || !tx) return

    let w = 0
    let h = 0
    let fontPx = 100
    let baseline = 90
    let family = '"Times New Roman", serif'

    type Bead = { x: number; y: number; v: number; r: number; wobble: number; trail: number[][] }
    type Streak = { x: number; y: number; v: number; len: number; alpha: number }
    type EdgeRipple = { x: number; y: number; r: number; a: number }

    let beads: Bead[] = []
    let streaks: Streak[] = []
    const edge = [] as EdgeRipple[]

    const layout = () => {
      const wordRect = word.getBoundingClientRect()
      const hostRect = (canvas.parentElement ?? word).getBoundingClientRect()
      const styles = getComputedStyle(word)

      fontPx = parseFloat(styles.fontSize) || 100
      family = styles.fontFamily || '"Times New Roman", serif'
      w = Math.ceil(wordRect.width) + 8
      h = Math.ceil(hostRect.height)

      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`

      mask.width = tank.width = canvas.width
      mask.height = tank.height = canvas.height

      // Маска формы букв — тем же шрифтом тем же размером, что и на экране.
      mx.setTransform(dpr, 0, 0, dpr, 0, 0)
      mx.clearRect(0, 0, w, h)
      mx.font = `italic 400 ${fontPx}px ${family}`
      if ("letterSpacing" in mx) mx.letterSpacing = `${(-0.02 * fontPx).toFixed(2)}px`
      mx.textBaseline = "alphabetic"
      mx.fillStyle = "#000"

      const measure = mx.measureText(word.textContent ?? "")
      const ascent = measure.fontBoundingBoxAscent || fontPx * 0.9
      const descent = measure.fontBoundingBoxDescent || fontPx * 0.3
      baseline = (fontPx - (ascent + descent)) / 2 + ascent
      mx.fillText(word.textContent ?? "", 0, baseline)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    let raf = 0

    const frame = () => {
      raf = window.requestAnimationFrame(frame)

      const wet = weatherIntensity.wet
      const slant = weatherIntensity.slant

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      if (wet < 0.03 || w <= 0) {
        beads = []
        streaks = []
        return
      }

      // Внутрибуквенный слой: намокание + капли, обрезанные по буквам.
      tx.setTransform(dpr, 0, 0, dpr, 0, 0)
      tx.clearRect(0, 0, w, h)
      const gloss = tx.createLinearGradient(0, 0, 0, h)
      gloss.addColorStop(0, `rgba(198, 224, 252, ${(0.2 * Math.min(1, wet)).toFixed(3)})`)
      gloss.addColorStop(1, `rgba(198, 224, 252, ${(0.04 * Math.min(1, wet)).toFixed(3)})`)
      tx.fillStyle = gloss
      tx.fillRect(0, 0, w, h)

      if (Math.random() < wet * 0.7) {
        beads.push({
          x: Math.random() * w,
          y: fontPx * (0.1 + Math.random() * 0.3),
          v: 0.4 + Math.random() * 0.6,
          r: 1.5 + Math.random() * 2.2,
          wobble: Math.random() * 6,
          trail: [],
        })
      }
      tx.lineCap = "round"
      for (let i = beads.length - 1; i >= 0; i--) {
        const b = beads[i]
        b.v += 0.035
        b.y += b.v
        b.x += Math.sin(b.y * 0.05 + b.wobble) * 0.16
        b.trail.push([b.x, b.y])
        if (b.trail.length > 36) b.trail.shift()

        if (b.y > baseline + fontPx * 0.03) {
          edge.push({ x: b.x, y: baseline + fontPx * 0.05, r: 1, a: 0.3 })
          beads.splice(i, 1)
          continue
        }

        tx.strokeStyle = "rgba(176, 217, 255, 0.6)"
        tx.lineWidth = Math.max(1, b.r * 0.7)
        tx.beginPath()
        if (b.trail.length > 0) tx.moveTo(b.trail[0][0], b.trail[0][1])
        for (const [px, py] of b.trail) tx.lineTo(px, py)
        tx.stroke()

        tx.fillStyle = "rgba(235, 247, 255, 0.9)"
        tx.beginPath()
        tx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        tx.fill()
        tx.fillStyle = "rgba(255, 255, 255, 0.95)"
        tx.beginPath()
        tx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.35, 0, Math.PI * 2)
        tx.fill()
      }

      // Смешиваем слой внутрь букв.
      tx.setTransform(1, 0, 0, 1, 0, 0)
      tx.globalCompositeOperation = "destination-in"
      tx.drawImage(mask, 0, 0)
      tx.globalCompositeOperation = "source-over"
      ctx.drawImage(tank, 0, 0, w, h)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Струи поверх — они не в маске и идут только до базовой линии.
      if (Math.random() < wet * 0.9) {
        streaks.push({
          x: Math.random() * w,
          y: 0,
          v: 12 + Math.random() * 8,
          len: 13 + Math.random() * 18,
          alpha: 0.22 + Math.random() * 0.28,
        })
      }
      for (let i = streaks.length - 1; i >= 0; i--) {
        const s = streaks[i]
        s.y += s.v
        s.x -= s.v * slant
        if (s.y > baseline) {
          streaks.splice(i, 1)
          continue
        }
        const a = s.alpha * Math.min(1, s.y / (fontPx * 0.3))
        ctx.strokeStyle = `rgba(206, 228, 250, ${a.toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(s.x - s.len * slant, s.y + s.len)
        ctx.stroke()
      }

      // Круги у нижней кромки букв.
      ctx.lineWidth = 1
      for (let i = edge.length - 1; i >= 0; i--) {
        const d = edge[i]
        d.r += 0.75
        d.a -= 0.006
        if (d.a <= 0) {
          edge.splice(i, 1)
          continue
        }
        ctx.strokeStyle = `rgba(200, 215, 250, ${d.a})`
        ctx.beginPath()
        ctx.ellipse(d.x, d.y + fontPx * 0.08, d.r * 2.2, d.r * 0.55, 0, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    layout()
    if (document.fonts?.ready) void document.fonts.ready.then(layout)
    window.addEventListener("resize", layout)
    raf = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("resize", layout)
    }
  }, [])

  return <canvas ref={canvasRef} className="wetcanvas" aria-hidden />
}
