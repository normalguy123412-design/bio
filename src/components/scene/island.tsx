"use client"

import * as React from "react"
import { track } from "@/lib/profile"
import { useLang } from "@/components/scene/lang"
import { useMusic, formatTime } from "@/components/scene/music"
import { useViewCount } from "@/components/scene/parts"

/**
 * «Остров» навигации — стеклянная пилюля сверху. Внутри: счётчик
 * просмотров, пункты разделов, кнопка музыки и языковая стрелка. Рядом
 * живёт пара: часы по Москве справа и мини-остров с идущим треком, когда
 * первый экран остался позади.
 */

export function IslandDock({ away }: { away: boolean }) {
  const { t, lang, setLang } = useLang()
  const { started, playing, toggle, current, duration } = useMusic()
  const count = useViewCount()

  const nowPlaying = started && duration > 0
  const numb = new Intl.NumberFormat()

  return (
    <header className="island-dock" id="island">
      <nav className="island" aria-label={t("Разделы")}>
        {count !== null ? (
          <>
            <a className="i-item i-views" href="#hero" title={t("просмотры")}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 5C6.4 5 2.6 9.4 1.3 11.4a1.2 1.2 0 0 0 0 1.2C2.6 14.6 6.4 19 12 19s9.4-4.4 10.7-6.4a1.2 1.2 0 0 0 0-1.2C21.4 9.4 17.6 5 12 5Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
              </svg>
              <span className="sr-only">{t("просмотры")}: </span>
              <b>{numb.format(count)}</b>
            </a>
            <span className="island-sep" aria-hidden />
          </>
        ) : null}

        <a className="i-item" href="#about">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z" />
          </svg>
          <span>{t("Обо мне")}</span>
        </a>

        <span className="island-sep" aria-hidden />

        <a className="i-item" href="#connect">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18 16.1c-.8 0-1.5.3-2 .8l-7.1-4.2c.1-.2.1-.5.1-.7s0-.5-.1-.7L16 7.2c.5.5 1.2.8 2 .8a3 3 0 1 0-3-3c0 .2 0 .5.1.7L8 9.8A3 3 0 1 0 6 15c.8 0 1.5-.3 2-.8l7.1 4.2c-.1.2-.1.4-.1.6a2.9 2.9 0 1 0 3-2.9Z" />
          </svg>
          <span>{t("Связь")}</span>
        </a>

        <span className="island-gap" aria-hidden />

        <button
          type="button"
          className="i-btn"
          onClick={toggle}
          aria-label={t("Плей / пауза")}
          aria-pressed={playing}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M7 5h3.4v14H7Zm6.6 0H17v14h-3.4Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          className="i-btn"
          onClick={() => setLang(lang === "ru" ? "en" : "ru")}
          aria-label={t("Язык")}
          title={lang === "ru" ? "English" : "Русский"}
        >
          <span className="lang-flag" aria-hidden>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="12" fill="#242b38" />
              <text
                x="12"
                y="15.4"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="#dfe6ff"
                fontFamily="inherit"
              >
                {lang === "ru" ? "EN" : "RU"}
              </text>
            </svg>
          </span>
        </button>
      </nav>

      {away && nowPlaying ? (
        <div className="mini-dock">
          <div className="island">
            <button type="button" className="mini-track" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 3v10.6a3.5 3.5 0 1 0 2 3.2V8h6V3h-8z" />
              </svg>
              <span>
                {track.title} — {track.artist} · {formatTime(current)} / {formatTime(duration)}
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}

/** Часы справа: дата и время по Москве. */
export function HudClock() {
  const { t, lang } = useLang()
  const [stamped, setStamped] = React.useState<string | null>(null)

  React.useEffect(() => {
    const read = () => {
      const zone = "Europe/Moscow"
      const date = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ru-RU", {
        timeZone: zone,
        day: "numeric",
        month: "short",
        weekday: "short",
      }).format(new Date())
      const time = new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "ru-RU", {
        timeZone: zone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date())
      setStamped(`${date}|${time}`)
    }

    read()
    const timer = window.setInterval(read, 20_000)
    return () => window.clearInterval(timer)
  }, [lang])

  const show = (part: "date" | "time") => (stamped ? stamped.split("|")[part === "date" ? 0 : 1] : null)

  return (
    <div className="island hudclock" role="timer" aria-label="Дата и время по Москве">
      <span className="c-item c-date">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm-2 8h14v10H5V10Z" />
        </svg>
        <span>{show("date") ?? "\u00a0"}</span>
      </span>

      <span className="hud-clock-sep" aria-hidden />

      <span className="c-item">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 5v5.4l3.6 2.1-1 1.7L11 13V7h2Z" />
        </svg>
        <span className="c-time">{show("time") ?? "--:--"}</span>
        <span className="c-zone">{t(lang === "ru" ? "МСК" : "MSK")}</span>
      </span>
    </div>
  )
}
