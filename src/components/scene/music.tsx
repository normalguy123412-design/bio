"use client"

import * as React from "react"
import { track } from "@/lib/profile"

/**
 * Музыка сцены.
 *
 * Один трек, один <audio> на всю страницу. Управлять звуком можно из
 * трёх мест — заставки, «острова» и карточки плеера, — поэтому состояние
 * живёт здесь, в общем провайдере. Громкость и «без звука» переживают
 * перезагрузку, потому что хранятся в localStorage.
 */

const VOL_KEY = "niceguy.volume"
const MUTE_KEY = "niceguy.mute"
const SOUND_KEY = "niceguy.sound"

function readNumber(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    const num = raw === null ? NaN : Number(raw)
    return Number.isFinite(num) ? Math.min(1, Math.max(0, num)) : fallback
  } catch {
    return fallback
  }
}

function readBoolean(key: string) {
  try {
    return typeof window !== "undefined" && localStorage.getItem(key) === "1"
  } catch {
    return false
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // недоступное хранилище — переживём
  }
}

type MusicState = {
  /** Заставка выбрала режим и вступила в сцену. */
  started: boolean
  playing: boolean
  /** Файл не открылся (нет сети, битый путь) — плеер признаёт провал. */
  failed: boolean
  volume: number
  muted: boolean
  current: number
  duration: number
}

type MusicApi = MusicState & {
  begin: (withSound: boolean) => void
  toggle: () => void
  /** Доля от 0 до 1. */
  seek: (fraction: number) => void
  setVolume: (volume: number) => void
  setMuted: (muted: boolean) => void
}

const MusicContext = React.createContext<MusicApi | null>(null)

const JUST_STARTED: MusicState = {
  started: false,
  playing: false,
  failed: false,
  volume: 0.5,
  muted: false,
  current: 0,
  duration: 0,
}

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<MusicState>(JUST_STARTED)
  const audioRef = React.useRef<HTMLAudioElement | null>(null)

  /** Актуальную громкость/мут читаем в момент создания аудио. */

  const patch = React.useCallback((change: Partial<MusicState>) => {
    setState((prev) => ({ ...prev, ...change }))
  }, [])

  const ensureAudio = React.useCallback(() => {
    if (audioRef.current) return audioRef.current

    const el = new Audio(track.src)
    el.preload = "auto"
    el.loop = true
    el.volume = readNumber(VOL_KEY, 0.5)
    el.muted = readBoolean(MUTE_KEY)

    el.addEventListener("play", () => patch({ playing: true }))
    el.addEventListener("pause", () => patch({ playing: false }))
    el.addEventListener("ended", () => patch({ playing: false }))
    el.addEventListener("error", () => patch({ failed: true }))
    el.addEventListener("loadedmetadata", () => {
      patch({ duration: Number.isFinite(el.duration) ? el.duration : 0 })
    })
    el.addEventListener("timeupdate", () => {
      patch({ current: el.currentTime })
    })

    audioRef.current = el
    return el
  }, [patch])

  const begin = React.useCallback(
    (withSound: boolean) => {
      const el = ensureAudio()
      patch({ started: true, volume: el.volume, muted: el.muted })
      store(SOUND_KEY, withSound ? "1" : "0")
      if (!withSound) return

      // Плей вызван прямо из обработчика щелчка заставки — это жест
      // пользователя, так что браузер звук даст.
      const attempt = el.play()
      if (attempt) {
        attempt.catch(() => {
          // Редкий случай: жест не был распознан. Молча оставим плеер
          // запасённым — кнопку можно нажать позже.
        })
      }
    },
    [ensureAudio, patch],
  )

  React.useEffect(() => {
    // Возврат в ту же вкладку без заставки: если ранее выбрали «со
    // звуком», попробуем включить сразу. Отказ браузера — не беда.
    if (readBoolean(SOUND_KEY)) {
      const el = ensureAudio()
      void el.play().catch(() => {})
    }
    return () => {
      audioRef.current?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = React.useCallback(() => {
    const el = ensureAudio()
    if (el.paused) {
      void el.play().catch(() => patch({ failed: true }))
    } else {
      el.pause()
    }
  }, [ensureAudio, patch])

  const seek = React.useCallback(
    (fraction: number) => {
      const el = audioRef.current
      if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
      el.currentTime = Math.min(1, Math.max(0, fraction)) * el.duration
      patch({ current: el.currentTime })
    },
    [patch],
  )

  const setVolume = React.useCallback(
    (volume: number) => {
      const clean = Math.min(1, Math.max(0, volume))
      const el = ensureAudio()
      el.volume = clean
      if (clean > 0 && el.muted) el.muted = false
      store(VOL_KEY, String(clean))
      patch({
        volume: clean,
        muted: clean > 0 ? false : el.muted,
      })
    },
    [ensureAudio, patch],
  )

  const setMuted = React.useCallback(
    (muted: boolean) => {
      ensureAudio().muted = muted
      store(MUTE_KEY, muted ? "1" : "0")
      patch({ muted })
    },
    [ensureAudio, patch],
  )

  const api = React.useMemo<MusicApi>(() => ({ ...state, begin, toggle, seek, setVolume, setMuted }), [state, begin, toggle, seek, setVolume, setMuted])

  return <MusicContext.Provider value={api}>{children}</MusicContext.Provider>
}

export function useMusic() {
  const value = React.useContext(MusicContext)
  if (!value) throw new Error("useMusic — вне MusicProvider")
  return value
}

/** Время «1:23» для мелких надписей. */
export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const rest = String(total % 60).padStart(2, "0")
  return `${minutes}:${rest}`
}
