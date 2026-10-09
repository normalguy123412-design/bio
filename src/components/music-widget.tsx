"use client"

import * as React from "react"
import Image from "next/image"
import {
  ChevronDownIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { track } from "@/lib/profile"

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00"
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/**
 * МУЗЫКАЛЬНЫЙ ВИДЖЕТ — круглый значок звука в углу.
 *
 * Панель музыки вынесена из разделов: раньше она была отдельным разделом,
 * и до неё ещё надо было добраться переключением. Теперь значок висит в
 * углу поверх всего и открывает плеер поверх любого раздела.
 *
 * Автозапуск. Браузер не даёт включать звук без действия пользователя, и
 * обойти это нельзя — можно только не мешать пользователю. Поэтому:
 *   1) пробуем включить сразу при открытии страницы;
 *   2) если браузер отказал, повторяем попытку при первом же нажатии в любом
 *      месте — то есть музыка начинает играть, как только человек что-то
 *      сделал;
 *   3) если и это не вышло, на значке остаётся пульсирующее кольцо —
 *      видно, что звук выключен и его надо включить вручную.
 */
export function MusicWidget() {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [open, setOpen] = React.useState(false)
  const [playing, setPlaying] = React.useState(false)
  const [blocked, setBlocked] = React.useState(false)
  const [muted, setMuted] = React.useState(false)
  const [current, setCurrent] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [coverFailed, setCoverFailed] = React.useState(false)

  const analyser = React.useRef<AnalyserNode | null>(null)
  const levels = React.useRef<Float32Array | null>(null)
  const started = React.useRef(false)
  const frame = React.useRef(0)

  /** Заливка ползунка. */
  const paint = React.useCallback((ratio: number) => {
    document.documentElement.style.setProperty("--played", `${(ratio * 100).toFixed(2)}%`)
  }, [])

  /** Ровная линия в покое и на любом отказе от визуализатора. */
  const drawIdle = React.useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "rgba(255, 255, 255, 0.16)"
    const bars = 48
    const step = width / bars
    for (let i = 0; i < bars; i += 1) {
      ctx.fillRect(i * step, (height - 3) / 2, step * 0.55, 3)
    }
  }, [])

  /**
   * Кадр волны. Следующий кадр планируется на имя самой функции — так
   * рекурсия не идёт через внешнюю переменную, которую правило
   * react-hooks/immutability считает изменяемой во время рендера.
   */
  const drawWave = React.useCallback(function step() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const node = analyser.current
    if (!canvas || !ctx || !node) return

    const { width, height } = canvas
    const data = new Uint8Array(node.frequencyBinCount)
    node.getByteFrequencyData(data)

    const bars = 48
    const step2 = width / bars
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
      ctx.fillRect(i * step2, (height - barHeight) / 2, step2 * 0.55, barHeight)
    }

    frame.current = requestAnimationFrame(step)
  }, [])

  /**
   * Подключение к Web Audio.
   *
   * `createMediaElementSource` навсегда переводит звук в Web Audio, поэтому
   * подключать его можно только на работающем контексте: иначе плеер играл
   * бы в тишине навсегда. Если не вышло — остаётся ровная линия, музыка
   * играет обычным способом.
   */
  const startVisualizer = React.useCallback(async () => {
    if (started.current) return
    started.current = true

    const audio = audioRef.current
    if (!audio) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const LegacyCtx = (
      window as unknown as { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext
    const Ctx = window.AudioContext ?? LegacyCtx
    if (!Ctx) return

    try {
      const ctxAudio = new Ctx()
      await ctxAudio.resume()
      if (ctxAudio.state !== "running") throw new Error("контекст не запустился")

      const node = ctxAudio.createAnalyser()
      node.fftSize = 512
      node.smoothingTimeConstant = 0.75
      ctxAudio.createMediaElementSource(audio).connect(node)
      node.connect(ctxAudio.destination)

      analyser.current = node
      drawWave()
    } catch {
      analyser.current = null
      drawIdle()
    }
  }, [drawIdle, drawWave])

  /** Одна попытка включить. Возвращает true, если заработало. */
  const attemptPlay = React.useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return false
    if (!audio.paused) return true
    try {
      await audio.play()
      return true
    } catch {
      return false
    }
  }, [])

  // Попытка при открытии страницы.
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = 0.5
    drawIdle()

    let cancelled = false
    void attemptPlay().then((ok) => {
      if (!cancelled) setBlocked(!ok)
    })

    return () => {
      cancelled = true
    }
  }, [attemptPlay, drawIdle])

  /**
   * Второй шанс — первое же действие пользователя.
   *
   * Именно здесь автозапуск обычно и срабатывает: браузер снимает запрет
   * после первого клика, и музыка начинает играть сама, как только человек
   * начал пользоваться страницей.
   */
  React.useEffect(() => {
    const retry = async () => {
      const audio = audioRef.current
      if (!audio || !audio.paused) return
      const ok = await attemptPlay()
      if (ok) {
        setBlocked(false)
        void startVisualizer()
        window.removeEventListener("pointerdown", retry)
        window.removeEventListener("keydown", retry)
      }
    }

    window.addEventListener("pointerdown", retry)
    window.addEventListener("keydown", retry)
    return () => {
      window.removeEventListener("pointerdown", retry)
      window.removeEventListener("keydown", retry)
    }
  }, [attemptPlay, startVisualizer])

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration)
    const onTime = () => {
      setCurrent(audio.currentTime)
      if (audio.duration) paint(audio.currentTime / audio.duration)
    }
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
      paint(0)
    }
    const onError = () => setBlocked(true)

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("error", onError)

    return () => {
      cancelAnimationFrame(frame.current)
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("error", onError)
    }
  }, [paint])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    setOpen(true)

    if (audio.paused) {
      void startVisualizer()
      const ok = await attemptPlay()
      setBlocked(!ok)
    } else {
      audio.pause()
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
  }

  const restart = async () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrent(0)
    paint(0)
    if (audio.paused) await toggle()
  }

  return (
    <>
      <audio
        ref={audioRef}
        src={track.src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Значок в углу: остаётся на месте, пока панель не открыта. */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : void toggle())}
        aria-label={open ? "Свернуть плеер" : "Открыть плеер"}
        aria-expanded={open}
        className="border-border bg-background/80 fixed right-5 bottom-5 z-50 grid size-12 place-items-center rounded-full border shadow-lg backdrop-blur-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-none"
      >
        {open ? (
          <ChevronDownIcon className="size-5" />
        ) : muted ? (
          <VolumeXIcon className="size-5" />
        ) : (
          <Volume2Icon className="size-5" />
        )}

        {/* Кольцо напоминает: браузер не дал включить звук сам. */}
        {blocked ? (
          <span
            aria-hidden
            className="border-primary absolute inset-0 animate-ping rounded-full border-2 opacity-75"
          />
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="border-border bg-card/95 fixed right-5 bottom-20 z-50 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              {coverFailed ? (
                <div
                  aria-hidden
                  className="from-primary/40 to-muted grid size-16 shrink-0 place-items-center rounded-lg bg-gradient-to-br"
                >
                  <MusicIcon className="size-6 text-foreground/70" />
                </div>
              ) : (
                /* Обложка не обязательна: если файла нет, показываем заглушку. */
                <Image
                  src={track.cover}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  onError={() => setCoverFailed(true)}
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{track.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {track.artist}
                </p>
              </div>

              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? "Включить звук" : "Выключить звук"}
                className="text-muted-foreground hover:text-foreground grid size-8 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {muted ? (
                  <VolumeXIcon className="size-4" />
                ) : (
                  <Volume2Icon className="size-4" />
                )}
              </button>
            </div>

            <canvas
              ref={canvasRef}
              width={560}
              height={40}
              aria-hidden
              className="mt-3 block h-9 w-full"
            />

            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? "Пауза" : "Слушать трек"}
                className="border-border hover:border-primary hover:text-primary grid size-10 shrink-0 place-items-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                {playing ? (
                  <PauseIcon className="size-4" />
                ) : (
                  <PlayIcon className="size-4" />
                )}
              </button>

              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {formatTime(current)}
              </span>

              <input
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

            {blocked ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Браузер не даёт включить звук сам — нажмите на плей.
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
