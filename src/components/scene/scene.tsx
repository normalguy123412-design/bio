"use client"

import * as React from "react"
import { media } from "@/lib/profile"
import { LangProvider } from "@/components/scene/lang"
import { MusicProvider, useMusic } from "@/components/scene/music"
import { Weather } from "@/components/scene/weather"
import { Board } from "@/components/scene/board"
import { HudClock, IslandDock } from "@/components/scene/island"
import { VolumeDrop } from "@/components/scene/volume"
import { SeekLine } from "@/components/scene/seekline"
import { Acts } from "@/components/scene/acts"
import { Mist } from "@/components/scene/mist"
import { Gate } from "@/components/scene/gate"

/**
 * Сцена целиком.
 *
 * Провайдеры (язык, музыка) над содержимым; внутри — фоновая запись,
 * погодный слой, первый экран с ником и рельсом, «остров» с часами,
 * стакан громкости, полоса перемотки, разделы и лист «письмецо».
 * Заставка живёт своей фазой: язык, музыка, отлетающие буквы — и только
 * потом сцена остаётся одна.
 */
export function Scene() {
  return (
    <LangProvider>
      <MusicProvider>
        <Stage />
      </MusicProvider>
    </LangProvider>
  )
}

type GatePhase = "boot" | "open" | "gone"

function Stage() {
  const { playing, begin } = useMusic()
  const [gate, setGate] = React.useState<GatePhase>("open")
  const [away, setAway] = React.useState(false)
  const [mistOpen, setMistOpen] = React.useState(false)
  const [spotTick, setSpotTick] = React.useState(0)

  /* Заставка пропускается, если в этой вкладке её уже прошли. */
  React.useEffect(() => {
    let skipped = false
    try {
      skipped = sessionStorage.getItem("niceguy.gate") === "1"
    } catch {
      skipped = false
    }
    if (skipped) {
      const id = window.requestAnimationFrame(() => setGate("gone"))
      return () => window.cancelAnimationFrame(id)
    }
  }, [])

  /* Первый экран остался позади? Приглушаем свет и показываем мини-остров. */
  React.useEffect(() => {
    let raf = 0
    const measure = () => {
      setAway(window.scrollY > window.innerHeight * 0.55)
    }
    const onScroll = () => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(measure)
    }
    raf = window.requestAnimationFrame(measure)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  /* Возврат наверх — прожектор снова пробегает по рельсу. */
  const wasAway = React.useRef(false)
  React.useEffect(() => {
    if (!away && wasAway.current) {
      const id = window.requestAnimationFrame(() => setSpotTick((tick) => tick + 1))
      wasAway.current = away
      return () => window.cancelAnimationFrame(id)
    }
    wasAway.current = away
  }, [away])

  /* Заставка ушла — светим ещё раз для входа. */
  React.useEffect(() => {
    if (gate !== "gone") return
    const id = window.requestAnimationFrame(() => setSpotTick((tick) => tick + 1))
    return () => window.cancelAnimationFrame(id)
  }, [gate])

  /* Флаги на body: заставка, «ушли с первого экрана», музыка играет, лист открыт. */
  React.useEffect(() => {
    document.body.classList.toggle("has-gate", gate !== "gone")
    document.body.classList.toggle("is-away", away)
    return () => {
      document.body.classList.remove("has-gate")
    }
  }, [gate, away])

  React.useEffect(() => {
    document.body.classList.toggle("is-playing", playing)
  }, [playing])

  React.useEffect(() => {
    document.body.classList.toggle("mist-open", mistOpen)
    return () => document.body.classList.remove("mist-open")
  }, [mistOpen])

  const enterScene = (withSound: boolean) => {
    try {
      sessionStorage.setItem("niceguy.gate", "1")
    } catch {
      // не критично: в этой вкладке заставка просто останется
    }
    begin(withSound)
  }

  return (
    <>
      {/* фоновая запись и мягкие пятна света */}
      <div className="night-wash" aria-hidden />
      <div className="scene-video is-on" aria-hidden>
        <video src={media.background} autoPlay muted loop playsInline disablePictureInPicture tabIndex={-1} />
      </div>
      <div className="scene-vignette is-on" aria-hidden />
      <div className="night-grain" aria-hidden />

      {/* погодный слой */}
      <Weather />

      {/* первый экран */}
      <Board spotTick={spotTick} onLetter={() => setMistOpen(true)} />

      {/* служебные панели */}
      <IslandDock away={away && !mistOpen} />
      <HudClock />
      <VolumeDrop />
      <SeekLine />

      {/* содержимое под первым экраном */}
      <Acts />

      {/* стеклянный лист */}
      {mistOpen ? <Mist onDone={() => setMistOpen(false)} /> : null}

      {/* заставка */}
      {gate === "open" ? <Gate onEnter={enterScene} onGone={() => setGate("gone")} /> : null}
    </>
  )
}
