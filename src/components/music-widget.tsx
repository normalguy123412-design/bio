"use client"

import * as React from "react"
import Image from "next/image"
import {
  MusicIcon,
  PauseIcon,
  PlayIcon,
  Volume1Icon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react"
import { cn } from "cn"
import { track } from "@/lib/profile"

/**
 * МУЗЫКА ОБЩАЯ ДЛЯ ВСЕЙ СТРАНИЦЫ.
 *
 * Звук один и живёт в провайдере: заставка просит разрешения, «остров» и
 * музыкальный уголок запускают и останавливают трек, а карточка плеера
 * рисует по слушанию волну. Все они получают одно и то же состояние через
 * контекст — иначе у каждого значка была бы своя копия проигрывателя.
 *
 * Почему без автозапуска. Браузер запрещает включать звук без действия
 * пользователя, и обойти это нельзя. Раньше страница пыталась включить
 * трек сама, ловила отказ и потом заново пыталась при каждом нажатии —
 * из-за этого музыка то включалась, то нет, и выглядело это как сбой.
 * Теперь выбор делает заставка: «Включить музыку» или «Без звука».
 */
const STORE = {
  volume: "bio:volume",
  muted: "bio:muted",
} as const

function readStored(key: string, fallback: string) {
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

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00"
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

/** Почему у плеера стоит один <audio>, но не два: см. выше. */
type MusicApi = {
  /** Заставка уже скрыта — первое нажатие произошло. */
  started: boolean
  /** Трек сейчас играет (после полной загрузки файла значение честное). */
  playing: boolean
  /** Браузер не смог запустить трек — строка с извинением. */
  failed: boolean
  current: number
  duration: number
  volume: number
  muted: boolean
  /** Запустить или остановить трек. Первое нажатие всегда начинает его. */
  toggle: () => void
  /** Выбор, сделанный на заставке: показывать сайт и, возможно, включить звук. */
  begin: (withMusic: boolean) => void
  /** Перемотка: время от 0 до 1. */
  seekTo: (ratio: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  /** Анализатор для рисования волны. До запуска графа тут `null`. */
  wave: React.RefObject<AnalyserNode | null>
}

const MusicContext = React.createContext<MusicApi | null>(null)

export function useMusic(): MusicApi {
  const api = React.useContext(MusicContext)
  if (!api) throw new Error("MusicProvider не найден выше по дереву")
  return api
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const wave = React.useRef<AnalyserNode | null>(null)
  const graphReady = React.useRef(false)

  const [started, setStarted] = React.useState(false)
  const [playing, setPlaying] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const [muted, setMuted] = React.useState(false)
  const [volume, setVolumeState] = React.useState(0.5)
  const [current, setCurrent] = React.useState(0)
  const [duration, setDuration] = React.useState(0)

  /**
   * Подключение к Web Audio.
   *
   * `createMediaElementSource` навсегда переводит звук в Web Audio, поэтому
   * подключать элемент можно только один раз на страницу — флаг в ref это
   * гарантирует. Визуализатор нужен лишь карточке плеера, но проще
   * подключить его здесь и отдать через контекст.
   */
  const startGraph = React.useCallback(() => {
    if (graphReady.current) return
    graphReady.current = true

    const audio = audioRef.current
    if (!audio) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const LegacyCtx = (
      window as unknown as { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext
    const Ctx = window.AudioContext ?? LegacyCtx
    if (!Ctx) return

    try {
      const audioContext = new Ctx()
      void audioContext.resume()

      const node = audioContext.createAnalyser()
      node.fftSize = 512
      node.smoothingTimeConstant = 0.75
      audioContext.createMediaElementSource(audio).connect(node)
      node.connect(audioContext.destination)
      wave.current = node
    } catch {
      // Отказ Web Audio — не повод ломать плеер: волну просто не рисуем.
      wave.current = null
    }
  }, [])

  /** Первое нажатие на заставке: спрятать её и, возможно, включить звук. */
  const begin = React.useCallback((withMusic: boolean) => {
    setStarted(true)
    const audio = audioRef.current
    if (!audio || !withMusic) return

    // Граф строим не дожидаясь: вызов play() обязан остаться в обработчике
    // события, как только await — браузер забывает, что нажимал пользователь.
    startGraph()

    audio
      .play()
      .then(() => setFailed(false))
      .catch(() => setFailed(true))
  }, [startGraph])

  const toggle = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!started) {
      begin(true)
      return
    }

    if (audio.paused) {
      void startGraph()
      audio
        .play()
        .then(() => setFailed(false))
        .catch(() => setFailed(true))
    } else {
      audio.pause()
    }
  }, [begin, started, startGraph])

  const seekTo = React.useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.min(1, Math.max(0, ratio)) * audio.duration
  }, [])

  const setVolume = React.useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value))
    const audio = audioRef.current
    if (audio) {
      audio.volume = next
      if (next > 0 && audio.muted) {
        audio.muted = false
        setMuted(false)
      }
    }
    setVolumeState(next)
    writeStored(STORE.volume, String(next))
  }, [])

  const toggleMute = React.useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = !audio.muted
    setMuted(audio.muted)
    writeStored(STORE.muted, audio.muted ? "1" : "0")
  }, [])

  // Настройки читаются один раз: звук ещё не идёт, а состояние восстановится.
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
    setVolumeState(restored)
    setMuted(storedMuted)
  }, [])

  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoaded = () => setDuration(audio.duration)
    const onTime = () => setCurrent(audio.currentTime)
    const onError = () => setFailed(true)

    audio.addEventListener("loadedmetadata", onLoaded)
    audio.addEventListener("timeupdate", onTime)
    audio.addEventListener("error", onError)

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded)
      audio.removeEventListener("timeupdate", onTime)
      audio.removeEventListener("error", onError)
    }
  }, [])

  const api = React.useMemo<MusicApi>(
    () => ({
      started,
      playing,
      failed,
      current,
      duration,
      volume,
      muted,
      toggle,
      begin,
      seekTo,
      setVolume,
      toggleMute,
      wave,
    }),
    [started, playing, failed, current, duration, volume, muted, toggle, begin, seekTo, setVolume, toggleMute],
  )

  return (
    <MusicContext value={api}>
      {children}

      {/*
        Сам трек: короткий, поэтому играет по кругу. Смена иконок и надписей
        происходит в тех компонентах, что слушают контекст, — здесь держат
        только слушатели событий файла.
      */}
      <audio
        ref={audioRef}
        src={track.src}
        preload="auto"
        loop
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </MusicContext>
  )
}

/* ---------------- Громкость ---------------- */

/**
 * Ползунок громкости: значок + полоса + процент. В поповере «острова»
 * рисуется узким, в карточке плеера — во всю ширину (`wide`). Значение
 * переживает перезагрузку (localStorage).
 *
 * Значок собирается прямо в JSX тернарником: локальная переменная
 * «Компонент» заставляет правило хуков считать, что компонент создан
 * во время рендера.
 */
export function VolumeSlider({ wide = false }: { wide?: boolean }) {
  const { volume, muted, setVolume, toggleMute } = useMusic()

  return (
    <div className={cn("flex items-center px-0.5", wide ? "mt-2 w-full gap-2.5" : "gap-2")}>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Включить звук" : "Выключить звук"}
        className="text-[#7d8894] hover:text-foreground grid shrink-0 cursor-pointer place-items-center transition-colors focus-visible:outline-none"
      >
        {muted || volume === 0 ? (
          <VolumeXIcon className="size-3.5" />
        ) : volume < 0.5 ? (
          <Volume1Icon className="size-3.5" />
        ) : (
          <Volume2Icon className="size-3.5" />
        )}
      </button>

      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={muted ? 0 : volume}
        onChange={(event) => setVolume(Number(event.target.value))}
        aria-label="Громкость"
        style={{ ["--v" as string]: `${volume * 100}%` }}
        className={cn("rng", wide && "rng-wide")}
      />

      {wide ? (
        <span className="w-8 shrink-0 text-right font-mono text-[10px] tabular-nums text-[#7d8894]">
          {Math.round(volume * 100)}%
        </span>
      ) : null}
    </div>
  )
}

/**
 * Пилюля громкости для «острова» и музыкального уголка: значок, из-под
 * которого выплывает стеклянная табличка с ползунком.
 */
export function VolumeControl({ className, popClassName }: { className?: string; popClassName?: string }) {
  const { volume, muted } = useMusic()
  const [open, setOpen] = React.useState(false)
  const boxRef = React.useRef<HTMLDivElement>(null)

  // Клик мимо пилюли закрывает её: слушатель ставится, пока открыта.
  React.useEffect(() => {
    if (!open) return
    const away = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", away)
    return () => document.removeEventListener("pointerdown", away)
  }, [open])

  return (
    <div ref={boxRef} className={cn("vol-pill", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Громкость"
        aria-expanded={open}
        className="vol-trigger"
      >
        {muted || volume === 0 ? (
          <VolumeXIcon aria-hidden />
        ) : volume < 0.5 ? (
          <Volume1Icon aria-hidden />
        ) : (
          <Volume2Icon aria-hidden />
        )}
      </button>

      {open ? (
        <div className={cn("vol-pop", popClassName)}>
          <VolumeSlider />
        </div>
      ) : null}
    </div>
  )
}

/* ---------------- Полоса перемотки ---------------- */

/** Полоса перемотки: клик и перетаскивание переводят позицию в seekTo. */
function Seekbar({ ratio }: { ratio: number }) {
  const { seekTo } = useMusic()
  const barRef = React.useRef<HTMLDivElement>(null)
  const dragging = React.useRef(false)

  const at = (clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0) return 0
    return (clientX - rect.left) / rect.width
  }

  return (
    <div
      ref={barRef}
      role="slider"
      aria-label="Перемотка трека"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      tabIndex={0}
      className="seekball"
      onPointerDown={(event) => {
        dragging.current = true
        event.currentTarget.setPointerCapture(event.pointerId)
        seekTo(at(event.clientX))
      }}
      onPointerMove={(event) => {
        if (dragging.current) seekTo(at(event.clientX))
      }}
      onPointerUp={() => {
        dragging.current = false
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          seekTo(ratio - 0.02)
        }
        if (event.key === "ArrowRight") {
          event.preventDefault()
          seekTo(ratio + 0.02)
        }
      }}
    >
      <span style={{ ["--p" as string]: `${ratio * 100}%` }}>
        <i />
      </span>
    </div>
  )
}

/* ---------------- Карточка плеера ---------------- */

/**
 * КАРТОЧКА ПЛЕЕРА.
 *
 * Одна обложка, один трек по кругу и волна: пока музыка играет, частоты
 * из анализатора кладутся в экран за кнопкой; в тишине рисуется прежняя
 * ровная полоска, чтобы карточка не пустовала.
 */
export function PlayerCard({ className }: { className?: string }) {  const { playing, started, failed, current, duration, toggle, wave } = useMusic()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const levels = React.useRef<Float32Array | null>(null)
  const frame = React.useRef(0)
  const [coverFailed, setCoverFailed] = React.useState(false)

  /** Ровная линия в покое и на любом отказе от анализатора. */
  const drawIdle = React.useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "rgba(231, 236, 241, 0.14)"
    const bars = 48
    const step = width / bars
    for (let i = 0; i < bars; i += 1) {
      ctx.fillRect(i * step, (height - 3) / 2, step * 0.55, 3)
    }
  }, [])

  /** Один кадр волны; кадр за кадром планирует сама — так рекурсия не
   *  идёт через внешнюю переменную, которую lint считает изменяемой. */
  const drawWave = React.useCallback(function step() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const node = wave.current
    if (!canvas || !ctx || !node) return

    const { width, height } = canvas
    const data = new Uint8Array(node.frequencyBinCount)
    node.getByteFrequencyData(data)

    const bars = 48
    const gap = width / bars
    const perBar = Math.floor(data.length / bars)
    const level = levels.current ?? (levels.current = new Float32Array(bars))

    ctx.clearRect(0, 0, width, height)

    const gradient = ctx.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, "#a8baf5")
    gradient.addColorStop(0.55, "#9fbcff")
    gradient.addColorStop(1, "#dfe7ff")
    ctx.fillStyle = gradient

    for (let i = 0; i < bars; i += 1) {
      let peak = 0
      for (let j = 0; j < perBar; j += 1) peak = Math.max(peak, data[i * perBar + j])
      // Смягчаем, иначе столбики дёргаются на каждом кадре.
      level[i] = level[i] * 0.65 + (peak / 255) * 0.35
      const barHeight = Math.max(3, level[i] * height)
      ctx.fillRect(i * gap, (height - barHeight) / 2, gap * 0.55, barHeight)
    }

    frame.current = requestAnimationFrame(step)
  }, [wave])

  React.useEffect(() => {
    cancelAnimationFrame(frame.current)

    if (!playing || !wave.current) {
      drawIdle()
      return
    }

    drawWave()
    return () => cancelAnimationFrame(frame.current)
  }, [playing, drawIdle, drawWave, wave])

  const ratio = duration ? current / duration : 0

  return (
    <div className={cn("mt-auto px-5 pb-5", className)}>
      {/* Обложка: файл может не лежать на месте — рисуем градиентную заглушку. */}
      <div className="player-cover">
        {!coverFailed ? (
          <Image
            src={track.cover}
            alt=""
            width={296}
            height={296}
            unoptimized
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <MusicIcon aria-hidden />
        )}
      </div>

      <p className="player-title">{track.title}</p>
      <p className="player-artist">{track.artist}</p>

      <canvas
        ref={canvasRef}
        width={560}
        height={40}
        aria-hidden
        className="mt-3 block h-10 w-full"
      />

      <div className="player-ctrl">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Пауза" : "Слушать трек"}
          className="play-big"
        >
          {playing ? <PauseIcon /> : <PlayIcon className="translate-x-px" />}
        </button>
      </div>

      <div className="seekrow">
        <span>{formatTime(current)}</span>
        <Seekbar ratio={ratio} />
        <span>{formatTime(duration)}</span>
      </div>

      <VolumeSlider wide />

      {failed ? (
        <p className="text-center text-[10px] text-[#7d8894]">
          Браузер не смог запустить трек — попробуйте нажать ещё раз.
        </p>
      ) : (
        /* Пока не запустили — мягкая подсказка, исчезающая после первого клика. */
        !started ? (
          <p className="text-center text-[10px] text-[#7d8894]">
            Нажмите кнопку — трек зациклится сам.
          </p>
        ) : null
      )}
    </div>
  )
}
