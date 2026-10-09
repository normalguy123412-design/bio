"use client"

import * as React from "react"
import Image from "next/image"
import {
  ChevronDownIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { emojis, profile, track } from "@/lib/profile"

/**
 * НАСТРОЙКИ, КОТОРЫЕ ПЕРЕЖИВАЮТ ПЕРЕЗАГРУЗКУ.
 *
 * Всё в localStorage: громкость, отключение звука и раскрытое состояние
 * панели. Без этого при каждой перезагрузке звук возвращался к половине, и
 * настройку приходилось бы подбирать заново.
 *
 * Запись обёрнута в try/catch: в приватном режиме Safari и при запрете
 * хранилища localStorage бросает исключение, и это не повод ломать плеер.
 */
const STORE = {
  volume: "bio:volume",
  muted: "bio:muted",
  open: "bio:open",
} as const

function readStored(key: string, fallback: string | null) {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writeStored(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // хранилище недоступно — настройка просто не переживёт перезагрузку
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00"
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/** Градиент заливки ползунка: пройдено одним цветом, остальное — приглушённое. */
function trackStyle(ratio: number, idle: string) {
  const stop = `${(Math.min(1, Math.max(0, ratio)) * 100).toFixed(2)}%`
  return {
    background: `linear-gradient(90deg, #38bdf8 0%, #22d3ee ${stop}, ${idle} ${stop})`,
  }
}

/**
 * МУЗЫКАЛЬНЫЙ ВИДЖЕТ — круглый значок звука в углу.
 *
 * Панель висит поверх любого отдела и ни с чем не пересекается.
 *
 * Почему без автозапуска. Браузер запрещает включать звук без действия
 * пользователя, и обойти это нельзя. Раньше страница пыталась включить
 * трек сама, ловила отказ и потом заново пыталась при каждом нажатии — из-за
 * этого музыка то включалась, то нет, и выглядело это как сбой. Теперь
 * всё однозначно: при открытии висит экран «нажмите, чтобы начать», и
 * первое же нажатие включает музыку. Никаких молчаливых попыток.
 */
export function MusicWidget() {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [started, setStarted] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const [playing, setPlaying] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [muted, setMuted] = React.useState(false)
  const [volume, setVolume] = React.useState(0.5)
  const [current, setCurrent] = React.useState(0)
  const [duration, setDuration] = React.useState(0)
  const [coverFailed, setCoverFailed] = React.useState(false)

  const analyser = React.useRef<AnalyserNode | null>(null)
  const levels = React.useRef<Float32Array | null>(null)
  const visualizerStarted = React.useRef(false)
  const frame = React.useRef(0)

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
    const gap = width / bars
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
      ctx.fillRect(i * gap, (height - barHeight) / 2, gap * 0.55, barHeight)
    }

    frame.current = requestAnimationFrame(step)
  }, [])

  /**
   * Подключение к Web Audio.
   *
   * `createMediaElementSource` навсегда переводит звук в Web Audio, поэтому
   * подключать его можно только на работающем контексте: иначе плеер играл
   * бы в тишине навсегда.
   */
  const startVisualizer = React.useCallback(async () => {
    // Флаг живёт в ref, а не в состоянии: подключать плеер к Web Audio
    // можно только один раз на элемент, и перерисовывать всё дерево из-за
    // этого флага незачем.
    if (visualizerStarted.current) return
    visualizerStarted.current = true

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

  /** Одно нажатие пользователя: включаем трек и снимаем заставку. */
  const begin = React.useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    void startVisualizer()
    setStarted(true)

    try {
      await audio.play()
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }, [startVisualizer])

  // Настройки читаются один раз: до первого нажатия звук всё равно не идёт,
  // а состояние панели восстановится само из хранилища.
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const storedVolume = Number(readStored(STORE.volume, "0.5"))
    const storedMuted = readStored(STORE.muted, "0") === "1"

    const restored = Number.isFinite(storedVolume)
      ? Math.min(1, Math.max(0, storedVolume))
      : 0.5

    audio.volume = restored
    audio.muted = storedMuted
    setVolume(restored)
    setMuted(storedMuted)
    setOpen(readStored(STORE.open, "0") === "1")

    drawIdle()
  }, [drawIdle])

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration)
    const onTime = () => setCurrent(audio.currentTime)
    const onEnded = () => {
      setPlaying(false)
      setCurrent(0)
    }
    const onError = () => setFailed(true)

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
  }, [])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    setOpen(true)

    if (!started) {
      await begin()
      return
    }

    if (audio.paused) {
      try {
        await audio.play()
        setFailed(false)
      } catch {
        setFailed(true)
      }
    } else {
      audio.pause()
    }
  }

  const setVolumeAndSave = (value: number) => {
    const next = Math.min(1, Math.max(0, value))
    const audio = audioRef.current
    if (audio) audio.volume = next
    setVolume(next)
    writeStored(STORE.volume, String(next))
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
    writeStored(STORE.muted, audio.muted ? "1" : "0")
  }

  const collapse = () => {
    setOpen(false)
    writeStored(STORE.open, "0")
  }

  const restart = async () => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrent(0)
    if (audio.paused) await toggle()
  }

  /** Значок громкости отражает реальный уровень, а не только факт отключения. */
  const VolumeIcon =
    muted || volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon

  return (
    <>
      <audio
        ref={audioRef}
        src={track.src}
        preload="auto"
        /* Трек короткий, поэтому играет по кругу — как на странице-образце. */
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/*
        Заставка. Браузер всё равно не пускает музыку без действия
        пользователя, поэтому вместо тихих попыток включить трек самому
        показывается честное предложение нажать. Одно нажатие в любом месте
        экрана запускает музыку и убирает заставку.

        Затемнение намеренно слабое: раньше здесь стоял почти чёрный фон с
        размытием, и страница под ним была не видна вовсе — вместе с
        баннером и фоновым видео. Теперь видно всё, и остаётся только
        подсказка.
      */}
      <AnimatePresence>
        {!started ? (
          <motion.button
            type="button"
            onClick={() => void begin()}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="group absolute inset-0 z-40 flex cursor-pointer flex-col items-center justify-center gap-5 bg-background/35 backdrop-blur-[2px]"
          >
            {/* Эмодзи стоят на заставке, а не на баннере: так же, как на
                образце, и сразу видны при первом открытии. */}
            <span className="flex items-center">
              {[emojis.left, emojis.right].map((src, index) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={48}
                  height={48}
                  unoptimized
                  priority
                  className={index === 1 ? "-ml-3 size-11" : "size-12"}
                />
              ))}
            </span>

            <span className="border-primary/60 text-primary grid size-16 place-items-center rounded-full border-2 bg-background/60 transition-transform duration-300 group-hover:scale-110">
              <PlayIcon className="size-7 translate-x-0.5" />
            </span>
            <span className="rounded-full bg-background/70 px-4 py-1.5 text-center">
              <span className="font-heading block text-xl font-semibold tracking-tight">
                {profile.name}
              </span>
              <span className="text-muted-foreground block text-xs">
                Нажмите в любом месте, чтобы включить музыку
              </span>
            </span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      {/* Значок в углу: остаётся на месте, пока панель не открыта. */}
      <button
        type="button"
        onClick={() => (open ? collapse() : void toggle())}
        aria-label={open ? "Свернуть плеер" : "Открыть плеер"}
        aria-expanded={open}
        className="border-border bg-background/80 fixed right-5 bottom-5 z-50 grid size-12 place-items-center rounded-full border shadow-lg backdrop-blur-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:outline-none"
      >
        {open ? <ChevronDownIcon className="size-5" /> : <VolumeIcon className="size-5" />}

        {/* Кольцо напоминает: музыку ещё не включили. */}
        {!playing ? (
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
                /* Обложка не обязательна: если файла нет, рисуем заглушку. */
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
                <VolumeIcon className="size-4" />
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
                  audio.currentTime = (Number(event.target.value) / 100) * duration
                }}
                aria-label="Перемотка трека"
                style={trackStyle(
                  duration ? current / duration : 0,
                  "oklch(0.269 0 0)"
                )}
                className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full focus-visible:ring-2 focus-visible:outline-none"
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

            {/* Громкость. Значение сохраняется и переживает перезагрузку. */}
            <div className="mt-3 flex items-center gap-3">
              <VolumeIcon className="text-muted-foreground size-4 shrink-0" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => setVolumeAndSave(Number(event.target.value))}
                aria-label="Громкость"
                style={trackStyle(volume, "oklch(0.269 0 0)")}
                className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full focus-visible:ring-2 focus-visible:outline-none"
              />
              <span className="text-muted-foreground w-9 shrink-0 text-right font-mono text-xs tabular-nums">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {failed ? (
              <p className="text-muted-foreground mt-2 text-xs">
                Браузер не смог запустить трек — попробуйте нажать ещё раз.
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
