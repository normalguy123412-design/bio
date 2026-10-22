"use client"

import * as React from "react"
import { links, profile, type Link } from "@/lib/profile"
import { useLang } from "@/components/scene/lang"
import { copyText } from "@/components/scene/parts"

/**
 * «Письмецо» — стеклянный лист поверх всей сцены. Открывается кнопкой
 * «письмецо» на рельсе: размытое стекло, рукописный заголовок и строки
 * связи. Уходит, когда лист «протирают» — и стеклянный блик съезжает.
 */
export function Mist({ onDone }: { onDone: () => void }) {
  const { t } = useLang()
  const [wiping, setWiping] = React.useState(false)

  const leave = React.useCallback(() => {
    setWiping((prev) => {
      if (prev) return prev
      window.setTimeout(onDone, 550)
      return true
    })
  }, [onDone])

  React.useEffect(() => {
    const press = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave()
    }
    window.addEventListener("keydown", press)
    return () => window.removeEventListener("keydown", press)
  }, [leave])

  return (
    <section
      className={`mist${wiping ? " is-wiping" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Письмецо"
      onClick={(event) => {
        if (event.target === event.currentTarget) leave()
      }}
    >
      <button type="button" className="mist-close" onClick={leave}>
        {t("протереть и уйти")}
      </button>

      <div className="mist-in">
        <h2 className="mist-head">{t("что за NiceGuy?")}</h2>
        <p className="mist-lead">
          {t("Здесь коротко о том, кто это — и сразу строка связи.")}{" "}
          <b>{profile.name}</b> · {t("почерк Caveat")}.
        </p>

        <ul className="mist-rows">
          {links.map((link) => (
            <li key={link.id} className="mist-row">
              <MistRow link={link} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function MistRow({ link }: { link: Link }) {
  const { t } = useLang()
  const [copied, setCopied] = React.useState(false)

  const copyValue = async () => {
    if (await copyText(link.copy ?? link.value)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  const big = link.external ? (
    <a className="m-act" href={link.href} target="_blank" rel="noopener">
      {link.label} — {link.value}
    </a>
  ) : (
    <button type="button" className="m-act" onClick={() => void copyValue()}>
      {link.label} — {link.value}
    </button>
  )

  return (
    <>
      <p>{big}</p>
      <footer>
        <span>{link.external ? link.href : link.value}</span>
        <button type="button" className="m-act" onClick={() => void copyValue()}>
          {copied ? t("скопировано") : t("клик — и в буфер")}
        </button>
      </footer>
    </>
  )
}
