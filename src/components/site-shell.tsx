"use client"

import * as React from "react"
import { AnimatePresence, motion } from "motion/react"
import Image from "next/image"
import {
  ChevronDownIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react"
import { cn } from "cn"
import { useScrambledTitle } from "@/components/ui/text-shimmer"
import { MusicProvider, formatTime, useMusic, VolumeControl } from "@/components/music-widget"
import { useViewCount } from "@/components/view-counter"
import { AboutSection, ConnectSection } from "@/components/sections"
import { discord, emojis, links, media, profile, track } from "@/lib/profile"

/**
 * ОБОЛОЧКА САЙТА.
 *
 * Страница живая и прокручивается: первый экран — сцена с огромным
 * курсивным ником, ниже — разделы. Над всем плавает стеклянный «остров»
 * с навигацией и звуком, в левом углу — музыкальный уголок, а у правого
 * края первого экрана спускается рельс ссылок.
 *
 * Раньше отделы были закрытыми, и страница не листалась вовсе. Теперь
 * экранов несколько, между ними переходят кликом «острова» и стрелкой.
 */
export function SiteShell() {
  return (
    <MusicProvider>
      <Experience />
    </MusicProvider>
  )
}

/**
 * Панель-заставка.
 *
 * Браузер не даёт включить звук без действия пользователя, поэтому первый
 * экран отдан выбору: включить трек или посмотреть без звука. Сайт под
 * заставкой уже готов и виден во время растворения.
 */
function Splash({ onEnter }: { onEnter: (withMusic: boolean) => void }) {
  return (
    <motion.div
      key="splash"
      role="dialog"
      aria-label="Заставка сайта"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: "blur(6px)" }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="splash"
    >
      <div className="splash-panel">
        <div className="flex items-center">
          {[emojis.left, emojis.right].map((src, index) => (
            <Image
              key={src}
              src={src}
              alt=""
              width={44}
              height={44}
              unoptimized
              priority
              className={index === 1 ? "-ml-3 size-10" : "size-11"}
            />
          ))}
        </div>

        <p className="splash-kicker">{profile.name} / bio</p>
        <h2 className="splash-title">Привет — со звуком?</h2>
        <p className="splash-sub">
          На сайте играет трек, зацикленный сам на себя. Отказ — тоже ответ:
          без звука ничем хуже.
        </p>

        <div className="splash-row">
          <button
            type="button"
            className="splash-b splash-yes"
            onClick={() => onEnter(true)}
          >
            <PlayIcon aria-hidden />
            Включить музыку
          </button>
          <button
            type="button"
            className="splash-b splash-no"
            onClick={() => onEnter(false)}
          >
            Без звука
          </button>
        </div>

        <p className="splash-hint">управление — значок громкости вверху</p>
      </div>
    </motion.div>
  )
}

/**
 * Стеклянный «остров» — экранная навигация, плавающая поверх всех
 * разделов. На телефонах переезжает на нижний край: пальцу легче.
 */
function Island({ entered }: { entered: boolean }) {
  const views = useViewCount()
  const { playing, toggle } = useMusic()

  return (
    <div
      className={cn(
        "isl-wrap transition-[opacity,transform] duration-700",
        entered ? "opacity-100" : "pointer-events-none -translate-y-4 opacity-0",
      )}
    >
      <nav className="isl" aria-label="Навигация по сайту">
        {views !== null ? (
          <>
            <span className="isl-item" title="Просмотры профиля">
              <EyeIcon aria-hidden />
              <b>{new Intl.NumberFormat("ru-RU").format(views)}</b>
            </span>
            <span aria-hidden className="isl-sep" />
          </>
        ) : null}

        <a className="isl-item" href="#hero">
          Начало
        </a>
        <a className="isl-item" href="#about">
          Профиль
        </a>
        <a className="isl-item" href="#connect">
          Связь
        </a>

        <span aria-hidden className="isl-sep" />

        <button
          type="button"
          className="isl-play"
          onClick={toggle}
          aria-label={playing ? "Пауза" : "Слушать трек"}
        >
          {playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
        </button>

        <VolumeControl />
      </nav>
    </div>
  )
}

/**
 * Музыкальный уголок в левом верхнем углу первого экрана: имя трека,
 * время и пилюля громкости. Уезжает, как только листаешь дальше первого
 * экрана, — у разделов своих углов нет.
 */
function CornerMusic({ entered, heroVisible }: { entered: boolean; heroVisible: boolean }) {
  const { playing, toggle, current, duration } = useMusic()

  return (
    <div
      className={cn(
        "corner-wrap",
        (!entered || !heroVisible) && "pointer-events-none opacity-0",
      )}
      aria-hidden={!entered || !heroVisible}
    >
      <span className="corner-track">
        {track.artist} — {track.title}
      </span>

      <button
        type="button"
        className="corner-music"
        onClick={toggle}
        aria-label={playing ? "Пауза" : "Слушать трек"}
      >
        {playing ? <PauseIcon aria-hidden /> : <PlayIcon aria-hidden />}
        <span>
          {formatTime(current)} / {formatTime(duration)}
        </span>
      </button>

      <VolumeControl />
    </div>
  )
}

/**
 * Первый экран.
 *
 * Нежный курсивный ник на пол-экрана с отражением и рельс ссылок справа.
 * Момент идёт по кругу беззвучно: он фон, а не содержимое.
 */
function Hero({
  entered,
  onHeroChange,
}: {
  entered: boolean
  onHeroChange: (visible: boolean) => void
}) {
  /** Показ «скопировано» — который клик discord id. */
  const [copied, setCopied] = React.useState(false)
  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => onHeroChange(entry.isIntersecting),
      { threshold: 0.3 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [onHeroChange])

  /** Сылки рельса: часть — настоящие href, discord id — копируется в буфер. */
  const groups = [
    {
      owner: "связь",
      items: links
        .filter((link) => link.id !== "ib-gid")
        .map((link) => ({ label: link.label.toLowerCase(), href: link.href, external: link.external })),
    },
    {
      owner: "проект",
      items: links
        .filter((link) => link.id === "ib-gid")
        .map((link) => ({ label: link.label.toLowerCase(), href: link.href, external: link.external })),
    },
  ]

  return (
    <section
      id="hero"
      ref={ref}
      className={cn("stage", entered && "is-entered")}
      aria-label={profile.name}
    >
      {/*
        Фоновая запись под всей сценой. Идёт по кругу и без звука, глушится
        градиентами и зерном: это фон, а не содержимое.
        `autoPlay muted` обязателен: без них видео не грузится вообще.
      */}
      <video
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-[5] size-full object-cover opacity-40 brightness-[.6] saturate-[.8]"
        src={media.background}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />

      {/*
        Рельс ссылок. Внутри одна «связь» — раскладка на группы никуда не
        делась: свой набор — своя подпись сверху.
      */}
      <nav className="rail" aria-label="Ссылки">
        {groups.map((group) => (
          <div key={group.owner} className="rail-group">
            <span className="rail-owner">{group.owner}</span>
            {group.items.map((item) => (
              <a
                key={item.label}
                className="rail-link"
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noreferrer noopener" : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
        ))}

        <div className="rail-group">
          <span className="rail-owner">discord</span>
          <button
            type="button"
            className="rail-link"
            onClick={() => {
              void navigator.clipboard
                .writeText(discord.userId)
                .then(() => setCopied(true))
                .catch(() => setCopied(true))
              setTimeout(() => setCopied(false), 1600)
            }}
            aria-label="Скопировать Discord id"
          >
            discord
            {copied ? (
              <span role="status" className="copied">
                id скопирован
              </span>
            ) : null}
          </button>
        </div>
      </nav>

      <div className="nick nick-block">
        <span className="nick-line" aria-hidden>
          {profile.name}
        </span>
        <span className="puddle" aria-hidden>
          {profile.name}
        </span>
      </div>

      <a className="down" href="#about" aria-label="Ниже — профиль">
        <ChevronDownIcon aria-hidden />
      </a>
    </section>
  )
}

/** Подвал: имя, звезда-акцент и год без лишних оглядок. */
function Footer() {
  return (
    <footer className="foot">
      <p className="foot-brand">
        <svg viewBox="0 0 24 24" aria-hidden fill="url(#foot-glow)">
          <defs>
            <linearGradient id="foot-glow" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#8fe3ff" />
              <stop offset=".55" stopColor="#a8baf5" />
              <stop offset="1" stopColor="#d49bff" />
            </linearGradient>
          </defs>
          <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8 6.6 19.7l1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
        <span>
          {profile.name}.bio <i>|</i> {new Date().getFullYear()}
        </span>
      </p>
      <small>сделано ночью, под музыку</small>
    </footer>
  )
}

/** Всё, что ниже заставки, — «опыт»; отсюда и слушание контекста музыки. */
function Experience() {
  const api = useMusic()
  const [entered, setEntered] = React.useState(false)
  const [heroVisible, setHeroVisible] = React.useState(true)
  const playing = api.playing

  /*
    Заголовок вкладки собирается из шума один раз при открытии страницы:
    сначала случайные символы, потом настоящее имя. Дальше не трогаем.
  */
  useScrambledTitle(`${profile.name} — ${profile.roles.join(" и ").toLowerCase()}`)

  /*
    Пока открыт выбор звука, страница не листается: фон на экране «генирит»
    автомorphism, и прокрутка в этот момент только мешает.
  */
  React.useEffect(() => {
    document.documentElement.style.overflow = entered ? "" : "hidden"
    return () => {
      document.documentElement.style.overflow = ""
    }
  }, [entered])

  const enter = (withMusic: boolean) => {
    api.begin(withMusic)
    setEntered(true)
  }

  const onHeroChange = React.useCallback((visible: boolean) => setHeroVisible(visible), [])

  return (
    <div className={cn("relative min-h-svh overflow-x-clip", entered && "is-entered", playing && "body-playing")}>
      {/* Подложка: цвет фона, разводы и виньетка лежат под содержимым. */}
      <div aria-hidden className="halo fixed inset-0 z-0 pointer-events-none" />

      <div
        className={cn(
          "relative z-10 transition-opacity duration-700",
          entered ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <Island entered={entered} />
        <CornerMusic entered={entered} heroVisible={heroVisible} />

        <main>
          <Hero entered={entered} onHeroChange={onHeroChange} />
          <AboutSection />
          <ConnectSection />
        </main>

        <Footer />
      </div>

      {/* Зерно всегда поверх: он и под заставкой крадёт гладкость. */}
      <div aria-hidden className="grain fixed inset-0 z-30 pointer-events-none" />

      <AnimatePresence>{!entered ? <Splash onEnter={enter} /> : null}</AnimatePresence>
    </div>
  )
}
