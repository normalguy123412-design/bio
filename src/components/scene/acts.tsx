"use client"

import * as React from "react"
import { BookOpenIcon, MailIcon, SendIcon, ShieldCheckIcon } from "lucide-react"
import { links, type Link, type IconName } from "@/lib/profile"
import { useLang } from "@/components/scene/lang"
import { copyText, Spark, usePeek } from "@/components/scene/parts"
import { DiscordCard, IdentCard, PlayerCard } from "@/components/scene/cards"

/**
 * Разделы после первого экрана: «чуть-чуть о себе» со стеклянными
 * карточками и «где меня искать» со строками-ссылками. Внизу — подпись
 * страницы. Разделы раскрывают содержимое, когда докручивают до них.
 */

/* Иконки строк-ссылок: lucide для общего и своя — для GitHub. */
function GithubGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.69.82.57A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

const GLYPHS: Record<IconName, (props: { className?: string }) => React.ReactNode> = {
  github: GithubGlyph,
  shield: ShieldCheckIcon,
  send: SendIcon,
  mail: MailIcon,
  book: BookOpenIcon,
}

/** Блок, который раскрывается, когда доскроллили до него. */
function Pop({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = usePeek()
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={`popp${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  )
}

/* ---------- раздел «чуть-чуть о себе» ---------- */

function AboutAct() {
  const { t } = useLang()

  return (
    <section className="act" id="about">
      <div className="inner">
        <Pop>
          <h2 className="h1t">
            {t("чуть-чуть")} <em>{t("о себе")}.</em>
          </h2>
          <p className="intro">{t("Если сжать меня до пары строк, выйдет примерно так:")}</p>
          <p className="long">{t("Я NiceGuy — junior-разработчик интерфейсов из Москвы. Собираю страницы на HTML/CSS, вожусь с Python и ботами. Развлекаюсь тем, что делаю свои маленькие проекты живыми: ночь, музыка, дождь и детали, которые замечаешь не сразу. Эта страница — одна из них.")}</p>
        </Pop>

        <Pop className="cardset">
          <IdentCard />
          <PlayerCard />
          <DiscordCard />
        </Pop>
      </div>
    </section>
  )
}

/* ---------- раздел «где меня искать» ---------- */

function ConnectAct() {
  const { t } = useLang()

  return (
    <section className="act" id="connect">
      <div className="inner">
        <Pop>
          <h2 className="h1t">
            {t("где меня")} <em>{t("искать")}.</em>
          </h2>
          <p className="intro">{t("Строки, по которым до меня дотянуться.")}</p>
        </Pop>

        <Pop>
          <ul className="lineset">
            {links.map((link) => (
              <li key={link.id}>
                <RowShell link={link} />
              </li>
            ))}
          </ul>
        </Pop>
      </div>
    </section>
  )
}

/** Строка-ссылка: ссылка открывается, кнопка внутри копирует значение. */
function RowShell({ link }: { link: Link }) {
  const { t } = useLang()
  const [copied, setCopied] = React.useState(false)
  const Glyph = GLYPHS[link.icon]

  const copyValue = async () => {
    if (await copyText(link.copy ?? link.value)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    }
  }

  const inner = (
    <>
      <span className="dropmark" aria-hidden>
        <Glyph />
      </span>
      <span className="tiny-name">{link.label}</span>
      <span className="big-name">{link.value}</span>
      <button
        type="button"
        className={`fine-copy${copied ? " is-done" : ""}`}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          void copyValue()
        }}
      >
        {copied ? t("скопировано") : t("клик — и в буфер")}
      </button>
    </>
  )

  if (link.href) {
    return (
      <a className="linem" href={link.href} target={link.external ? "_blank" : undefined} rel={link.external ? "noopener" : undefined}>
        {inner}
      </a>
    )
  }

  return <button type="button" className="linem">{inner}</button>
}

/* ---------- подпись внизу ---------- */

export function SiteFoot() {
  const { t } = useLang()
  const ref = usePeek()

  return (
    <footer className="sitefoot">
      <div ref={ref as React.Ref<HTMLDivElement>} className="popp fb">
        <Spark />
        niceguy <i>/ био</i>
      </div>
      <small>
        {t("Музыка играет по кругу после введения.")} · {new Date().getFullYear()}
      </small>
    </footer>
  )
}

export function Acts() {
  return (
    <>
      <AboutAct />
      <ConnectAct />
      <SiteFoot />
    </>
  )
}
