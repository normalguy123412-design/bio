"use client"

import * as React from "react"
import { links, discord, profile } from "@/lib/profile"
import { useLang } from "@/components/scene/lang"
import { copyText, Spark } from "@/components/scene/parts"
import { NickWater } from "@/components/scene/weather"

/**
 * Первый экран сцены: огромный курсивный ник с отражением в «лужице»,
 * рельс ссылок справа со светлячком и стрелка вниз.
 */

export function Board({ spotTick, onLetter }: { spotTick: number; onLetter: () => void }) {
  const { t } = useLang()
  const [copiedNow, setCopiedNow] = React.useState(false)
  const [spotted, setSpotted] = React.useState(false)

  // Прожектор пробегает по рельсу при входе на сцену и при возврате наверх.
  React.useEffect(() => {
    let timer = 0
    const id = window.requestAnimationFrame(() => {
      setSpotted(true)
      timer = window.setTimeout(() => setSpotted(false), 3000)
    })
    return () => {
      window.cancelAnimationFrame(id)
      window.clearTimeout(timer)
    }
  }, [spotTick])

  const copyDiscord = async () => {
    const done = await copyText(discord.userId)
    if (!done) return
    setCopiedNow(true)
    window.setTimeout(() => setCopiedNow(false), 1400)
  }

  const findLinks = links.filter((item) => item.id !== "email")
  const mail = links.find((item) => item.id === "email")

  return (
    <main className="board" id="hero">
      <a className="brandmark" href="#hero" aria-label="NiceGuy — био">
        <Spark />
        <b>niceguy</b>
      </a>

      <nav className={`cane${spotted ? " is-spot" : ""}`} aria-label={t("где меня искать")}>
        <span className="firefly" aria-hidden />

        <div className="canegroup">
          <span className="canebadge">{t("найти")}</span>
          {findLinks.map((item, index) => (
            <a
              key={item.id}
              className="caneitem"
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener" : undefined}
              style={{ ["--si" as string]: index } as React.CSSProperties}
            >
              {t(item.id === "ib-gid" ? "иб-гид" : item.id)}
            </a>
          ))}
        </div>

        <div className="canegroup">
          <span className="canebadge">{t("связь")}</span>
          <button
            type="button"
            className="caneitem"
            onClick={copyDiscord}
            aria-label={`${t("discord")} — ${t("Скопировать")}`}
            style={{ ["--si" as string]: findLinks.length } as React.CSSProperties}
          >
            {t("discord")}
            <span className={`cane-note${copiedNow ? " is-shown" : ""}`} role="status">
              {t("скопировано")}
            </span>
          </button>
          {mail ? (
            <a
              className="caneitem"
              href={mail.href}
              style={{ ["--si" as string]: findLinks.length + 1 } as React.CSSProperties}
            >
              {t("почта")}
            </a>
          ) : null}
          <button
            type="button"
            className="caneitem"
            onClick={onLetter}
            style={{ ["--si" as string]: findLinks.length + 2 } as React.CSSProperties}
          >
            {t("письмецо")}
          </button>
        </div>
      </nav>

      <h1 className="nickname" aria-label={profile.name}>
        <span className="nickword" id="nick-word" aria-hidden>
          {profile.name}
        </span>
        <span className="nickpond" aria-hidden>
          {profile.name}
        </span>
        <NickWater />
      </h1>

      <a className="droplink" href="#about" aria-label="Вниз к разделам">
        <svg className="fill-svg" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 16.5 4.5 9l1.4-1.4L12 13.7l6.1-6.1L19.5 9z" />
        </svg>
      </a>
    </main>
  )
}
