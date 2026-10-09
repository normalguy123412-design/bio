"use client"

import * as React from "react"
import { MusicIcon, PauseIcon, PlayIcon, RotateCcwIcon } from "lucide-react"
import { track } from "@/lib/profile"

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00"
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/**
 * ПЛЕЕР.
 *
 * Трек лежит рядом с сайтом, а не на внешнем хостинге: ссылка не протухнет.
 * Громкость по умолчанию вдвое ниже максимальной — фоновая музыка не должна
 * перебивать страницу.
 *
 * Волна под названием рисуется через Web Audio по данным AnalyserNode.
 * Подключение выполняется по нажатию и только после того, как контекст
 * действительно запустился: `createMediaElementSource` навсегда переводит
 * звук в Web Audio, и подключённый к приостановленному контексту плеер
 * играл бы в тишине. Не вышло — остаётся ровная линия, музыка играет
 * обычным способом.
 */
export function MusicPlayer() {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = React.useState(false)
  const [current, setCurrent] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [failed, setFailed] = React.useState(false)

  const analyser = React.useRef<AnalyserNode | null>(null)
  const context = React.useRef<AudioContext | null>(null)
  const levels = React.useRef<Float32Array | null>(null)
  const started = React.useRef(false)
  const frame = React.useRef(0)

  const reduceMotion = React.useRef(false)

  React.useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration)
    const onTime = () => setCurrent(audio.currentTime)
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
      paint(0)
    }
    const onError = () => setFailed(true)

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
      cancelAnimationFrame(frame.current)
    }
  }, [])

  /** Заливка ползунка. */
  function paint(ratio: number) {
    const input = document.getElementById("seek")
    if (input instanceof HTMLInputElement) {
      input.style.setProperty("--played", `${(ratio * 100).toFixed(2)}%`)
    }
  }

  /** Ровная линия в покое и на любом отказе от визуализатора. */
  function drawIdle() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)"
    const bars = 56
    const step = width / bars
    for (let i = 0; i < bars; i += 1) {
      ctx.fillRect(i * step, (height - 3) / 2, step * 0.55, 3)
    }
  }

  function drawWave() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const node = analyser.current
    if (!canvas || !ctx || !node) return

    const { width, height } = canvas
    const data = new Uint8Array(node.frequencyBinCount)
    node.getByteFrequencyData(data)

    const bars = 56
    const step = width / bars
    const perBar = Math.floor(data.length / bars)
    const level = levels.current ?? (levels.current = new Float32Array(bars))

    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, "#38bdf8")
    gradient.addColorStop(0.5, "#22d3ee")
    gradient.addColorStop(1, "#34d399")
    ctx.fillStyle = gradient

    ctx.clearRect(0, 0, width, height)

    for (let i = 0; i < bars; i += 1) {
      let peak = 0
      for (let j = 0; j < perBar; j += 1) peak = Math.max(peak, data[i * perBar + j])
      // Смягчаем, иначе столбики дёргаются на каждом кадре.
      level[i] = level[i] * 0.65 + (peak / 255) * 0.35
      const barHeight = Math.max(3, level[i] * height)
      ctx.fillRect(i * step, (height - barHeight) / 2, step * 0.55, barHeight)
    }

    frame.current = requestAnimationFrame(drawWave)
  }

  async function startVisualizer() {
    if (started.current || reduceMotion.current) return
    started.current = true

    const audio = audioRef.current
    // `webkitAudioContext` — устаревшее имя, оставшееся в типах TypeScript
    // нет. Современные браузеры дают AudioContext, но проверить лишним не
    // будет: на старом Safari работает только префиксная версия.
    const LegacyCtx = (
      window as unknown as { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext
    const Ctx = window.AudioContext ?? LegacyCtx
    if (!audio || !Ctx) return

    try {
      const ctxAudio = new Ctx()
      await ctxAudio.resume()
      if (ctxAudio.state !== "running") throw new Error("контекст не запустился")

      const node = ctxAudio.createAnalyser()
      node.fftSize = 512
      node.smoothingTimeConstant = 0.75

      ctxAudio.createMediaElementSource(audio).connect(node)
      node.connect(ctxAudio.destination)

      context.current = ctxAudio
      analyser.current = node
      drawWave()
    } catch {
      analyser.current = null
      drawIdle()
    }
  }

  React.useEffect(() => {
    drawIdle()
  }, [])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (audio.paused) {
      audio.volume = 0.5
      void startVisualizer()
      try {
        await audio.play()
      } catch {
        setFailed(true)
      }
    } else {
      audio.pause()
    }
  }

  const restart = async () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrent(0)
    paint(0)
    if (audio.paused) {
      await toggle()
    }
  }

  return (
    <div className="border-border bg-card text-card-foreground flex items-center gap-4 rounded-xl border p-4">
      <div
        aria-hidden
        className="from-primary/40 to-muted grid size-20 shrink-0 place-items-center rounded-lg bg-gradient-to-br sm:size-24"
      >
        <MusicIcon className="size-7 text-foreground/70" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate text-sm font-medium">{track.title}</p>
          {failed ? (
            <span className="text-muted-foreground text-xs">файл не загрузился</span>
          ) : null}
        </div>

        <canvas
          ref={canvasRef}
          width={600}
          height={48}
          aria-hidden
          className="my-1.5 block h-10 w-full"
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Пауза" : "Слушать трек"}
            className="border-border hover:border-primary hover:text-primary grid size-10 shrink-0 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            {playing ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
          </button>

          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {formatTime(current)}
          </span>

          <input
            id="seek"
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={duration ? (current / duration) * 100 : 0}
            onChange={(event) => {
              const audio = audioRef.current
              if (!audio || !duration) return
              const ratio = Number(event.target.value) / 100
              audio.currentTime = ratio * duration
              paint(ratio)
            }}
            aria-label="Перемотка трека"
            className="bg-muted h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full accent-sky-400 focus-visible:ring-2 focus-visible:outline-none"
          />

          <span className="text-muted-foreground font-mono text-xs tabular-nums">
            {formatTime(duration)}
          </span>

          <button
            type="button"
            onClick={restart}
            aria-label="Сначала"
            className="text-muted-foreground hover:text-foreground grid size-8 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <RotateCcwIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Плеер невидим для браузера, но доступен: без него клавиатура и
          скринридер не смогли бы ни включить трек, ни перемотать. */}
      <audio
        ref={audioRef}
        src={track.src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </div>
  )
}
