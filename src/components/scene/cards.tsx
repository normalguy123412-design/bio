"use client"

import * as React from "react"
import {
  discord,
  emojis,
  media,
  profile,
  track,
} from "@/lib/profile"
import { useLang } from "@/components/scene/lang"
import { useMusic, formatTime } from "@/components/scene/music"
import { copyText, DiscordMark, useGlassTilt } from "@/components/scene/parts"

/**
 * Три стеклянные карточки раздела «обо мне»: баннер с автором, плеер
 * и Discord. Каждая светится от курсора и чуть наклоняется — общий
 * механизм `useGlassTilt`.
 */

/* ---------- общие данные Discord ---------- */

type Presence = {
  status: "online" | "idle" | "dnd" | "offline" | string
  username?: string | null
  avatar?: string | null
  activities?: Activity[]
  activity?: Activity | null
  stale?: boolean
}

type Activity = {
  name?: string | null
  type?: string | null
  details?: string | null
  state?: string | null
  startedAt?: number | null
}

/** Глагол по типу активности; Discord шлёт типы по-английски. */
function verb(type: string | null | undefined) {
  switch (type) {
    case "playing":
      return "Играет в"
    case "listening":
      return "Слушает"
    case "streaming":
      return "Стримит"
    case "watching":
      return "Смотрит"
    case "custom":
      return "Сказал"
    default:
      return "Занят"
  }
}

function usePresence(): Presence | null {
  const [presence, setPresence] = React.useState<Presence | null>(null)

  React.useEffect(() => {
    if (!discord.presenceEndpoint) return
    const controller = new AbortController()

    const ask = async () => {
      try {
        const response = await fetch(discord.presenceEndpoint, { cache: "no-store", signal: controller.signal })
        if (!response.ok) return
        setPresence((await response.json()) as Presence)
      } catch {
        // Промолчим: прошлые данные вернее пустой карточки.
      }
    }

    void ask()
    const timer = window.setInterval(ask, 15_000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  return presence
}

type InviteGuild = {
  guild?: { id?: string | null; name?: string | null; icon?: string | null } | null
  approximate_presence_count?: number
}

function useInvite(): InviteGuild | null {
  const [invite, setInvite] = React.useState<InviteGuild | null>(null)

  React.useEffect(() => {
    if (!discord.invite) return
    const controller = new AbortController()

    const ask = async () => {
      try {
        const response = await fetch(
          `https://discord.com/api/invites/${discord.invite}?with_counts=true&with_expiration=false`,
          { signal: controller.signal },
        )
        if (!response.ok) return
        setInvite((await response.json()) as InviteGuild)
      } catch {
        // Сервер может быть отключён — карточка переживёт.
      }
    }

    void ask()
    return () => controller.abort()
  }, [])

  return invite
}

/* ---------- 1. кто это ---------- */

/** Био приходит в разметке bio-страниц; карточке нужен только текст. */
const readableBio = profile.bio
  .replace(/\[\/?dc-emoji-id\]/g, "")
  .replace(/\[[^\]]*\]/g, "")
  .replace(/\d{16,}/g, "")
  .trim()

export function IdentCard() {
  const { t } = useLang()
  const tilt = useGlassTilt()

  return (
    <article ref={tilt} className="glassbase ident-card" id="c-ident" aria-label="Who I am">
      <div className="cardrow">
        <span className="l">
          <i className="dot" aria-hidden />
          {t("кто рядом")}
        </span>
        <b>{profile.handle}</b>
      </div>

      <div className="ident-banner">
        <img src={media.banner} alt="" loading="lazy" />
      </div>

      <div className="ident-body">
        <h3 className="ident-name">{profile.name}</h3>
        <p className="ident-sub">{profile.location}</p>

        <div className="tagset">
          {profile.roles.map((role) => (
            <span key={role}>{role}</span>
          ))}
          {profile.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>

        <p className="ident-note">
          {emojis.left ? <img src={emojis.left} alt="" height={16} style={{ verticalAlign: "-3px" }} /> : null}{" "}
          {readableBio}{" "}
          {emojis.right ? <img src={emojis.right} alt="" height={16} style={{ verticalAlign: "-3px" }} /> : null}
        </p>
      </div>
    </article>
  )
}

/* ---------- 2. плеер ---------- */

export function PlayerCard() {
  const { t } = useLang()
  const { playing, started, failed, current, duration, toggle, seek } = useMusic()
  const tilt = useGlassTilt()

  const fraction = duration > 0 ? Math.min(1, current / duration) : 0

  const jump = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.currentTarget.getBoundingClientRect()
    seek((event.clientX - target.left) / target.width)
  }

  return (
    <article ref={tilt} className="glassbase pc" id="c-player" aria-label="Player">
      <div className="cardrow">
        <span className="l">
          <i className="dot" aria-hidden />
          {t("музыка")}
        </span>
        <b>{track.artist}</b>
      </div>

      <div className="pc-case" aria-hidden>
        <div className="caseplate">
          <svg viewBox="0 0 24 24">
            <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 4.6a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z" />
          </svg>
        </div>
        <div className="case-tint" />
      </div>

      <p className="pc-title">{track.title}</p>
      <p className="pc-artist">{track.artist}</p>

      <div className="pc-ctrl">
        <button
          type="button"
          className="playbtn"
          onClick={toggle}
          aria-label={playing ? "Пауза" : "Играть"}
          aria-pressed={playing}
          disabled={failed}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" strokeLinecap="round">
              <path d="M6 4.5h4.4v15H6Zm7.6 0H18v15h-4.4Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" strokeLinecap="round">
              <path d="M8.5 5.6v12.8a1 1 0 0 0 1.55.84l9.8-6.4a1 1 0 0 0 0-1.68l-9.8-6.4A1 1 0 0 0 8.5 5.6Z" />
            </svg>
          )}
        </button>
      </div>

      <div className="pc-slot">
        <span>{formatTime(current)}</span>
        <div className="pcb" onPointerDown={jump} role="presentation">
          <span className="pcb-in">
            <i className="pcb-fill" style={{ width: `${fraction * 100}%`, opacity: started ? 1 : 0.4 }} />
          </span>
        </div>
        <span>{formatTime(duration)}</span>
      </div>
    </article>
  )
}

/* ---------- 3. discord ---------- */

export function DiscordCard() {
  const { t } = useLang()
  const presence = usePresence()
  const guild = useInvite()
  const tilt = useGlassTilt()
  const [copied, setCopied] = React.useState(false)

  const status = presence && !presence.stale && presence.status !== "offline" ? presence.status : null
  const statusText =
    status === "online"
      ? t("В сети")
      : status === "idle"
        ? t("Отошёл")
        : status === "dnd"
          ? t("Не мешать")
          : t("Загружаю…")

  const list = presence && Array.isArray(presence.activities) ? presence.activities : presence?.activity ? [presence.activity] : []

  const copyId = async () => {
    if (await copyText(discord.userId)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    }
  }

  return (
    <article ref={tilt} className="glassbase dc" id="c-dc" aria-label="Discord">
      <div className="cardrow">
        <span className="dc-brandrow">
          <DiscordMark />
          Discord
        </span>
        <span className={`statuschip${status ? ` t-${status}` : ""}`}>
          <i className="dot" aria-hidden />
          {statusText}
        </span>
      </div>

      <div className="dc-prof">
        <div className={`dc-avatar${status ? ` t-${status}` : ""}`}>
          {presence?.avatar ? (
            <img src={presence.avatar} alt="" />
          ) : (
            <em>{profile.name.charAt(0)}</em>
          )}
          <i aria-hidden />
        </div>
        <div className="dc-who">
          <strong>{presence?.username ?? profile.name}</strong>
          <span>{profile.handle}</span>
        </div>
      </div>

      <button type="button" className="dc-copy" onClick={copyId}>
        <svg viewBox="0 0 24 24" aria-hidden>
          <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12Zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm0 16H8V7h11Z" />
        </svg>
        {copied ? t("скопировано") : discord.userId}
      </button>

      <div className={`dc-life${status ? "" : " is-idle"}`}>
        {status ? (
          <>
            <span className="k">{t("Что сейчас")}</span>
            {list.length > 0 ? (
              list.map((activity, index) => (
                <span key={index} className="v">
                  {activity.name ? `${t(verb(activity.type))} ${activity.name}` : t(activity.state ?? activity.name ?? "")}
                </span>
              ))
            ) : (
              <span className="v">{t("Свободен")}</span>
            )}
          </>
        ) : guild?.guild?.name ? (
          <>
            <span className="k">{t("сервер")}</span>
            <span className="v">
              {guild.guild.name} · {guild.approximate_presence_count ?? 0} {t("онлайн")}
            </span>
          </>
        ) : null}
      </div>

      {discord.invite ? (
        <a
          className="dc-copy"
          href={`https://discord.gg/${discord.invite}`}
          target="_blank"
          rel="noopener"
          style={{ marginTop: 10 }}
        >
          {t("Открыть сервер")}
          <svg viewBox="0 0 24 24" aria-hidden style={{ fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" }}>
            <path d="M7 17 17 7m0 0h-8m8 0v8" />
          </svg>
        </a>
      ) : null}
    </article>
  )
}
