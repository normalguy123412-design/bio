"use client"

import * as React from "react"
import Image from "next/image"
import { discord } from "@/lib/profile"

/**
 * Карточка сервера Discord.
 *
 * Официальный виджет (`discord.com/widget/<id>`) показывается только если
 * виджет включён в настройках сервера, а это может сделать лишь тот, кто
 * сервером владеет. Чужой сервер открыт для чтения по коду приглашения:
 * адрес отдаёт название, иконку и число участников онлайн, и никаких прав
 * на сервер для этого не требуется. Поэтому виджет заменён собственной
 * вёрсткой по этим данным — выглядит так же, но работает с любым сервером.
 *
 * Ответ приходит с заголовком, разрешающим запрос с чужого домена, то есть
 * прямо из браузера. Ограничение на частоту запросов у Discord есть, и оно
 * общее на всех посетителей, поэтому при сбое показывается прошлый ответ:
 * он всё равно лучше пустой карточки.
 */

const CACHE_KEY = "bio:discord-invite"

type Invite = {
  name: string
  icon: string | null
  online: number | null
  members: number | null
  fetchedAt: number
}

function cacheKey(invite: string) {
  return `${CACHE_KEY}:${invite}`
}

/** Иконка сервера лежит на CDN Discord по хешу из ответа. */
function iconUrl(serverId: string, hash: string | null) {
  if (!hash) return null
  return `https://cdn.discordapp.com/icons/${serverId}/${hash}.webp?size=128`
}

export function DiscordServerCard() {
  const [invite, setInvite] = React.useState<Invite | null>(null)

  React.useEffect(() => {
    const key = cacheKey(discord.invite)
    let cancelled = false

    void fetch(
      `https://discord.com/api/v9/invites/${discord.invite}?with_counts=true&with_expiration=true`,
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data?.guild || cancelled) return

        const fresh: Invite = {
          name: data.guild.name,
          icon: iconUrl(data.guild.id, data.guild.icon),
          online: data.approximate_presence_count ?? null,
          members: data.approximate_member_count ?? null,
          fetchedAt: Date.now(),
        }

        localStorage.setItem(key, JSON.stringify(fresh))
        setInvite(fresh)
      })
      .catch(() => {
        // Запрос не прошёл: показываем прошлый ответ. Показать его сразу
        // при открытии нельзя — это означало бы читать localStorage во
        // время отрисовки, и серверный HTML разошёлся бы с браузерным.
        const cached = localStorage.getItem(key)
        if (!cached || cancelled) return
        try {
          setInvite(JSON.parse(cached) as Invite)
        } catch {
          localStorage.removeItem(key)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (!discord.invite) return null

  return (
    <a
      href={`https://discord.gg/${discord.invite}`}
      target="_blank"
      rel="noreferrer noopener"
      className="group border-border/20 bg-card/30 flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-card/60"
    >
      {invite?.icon ? (
        <Image
          src={invite.icon}
          alt=""
          width={48}
          height={48}
          unoptimized
          className="size-12 shrink-0 rounded-2xl"
        />
      ) : (
        <span className="bg-muted grid size-12 shrink-0 place-items-center rounded-2xl text-lg">
          {invite?.name ? invite.name.trim()[0] : "?"}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{invite?.name ?? "Сервер Discord"}</p>

        {/* Числа появляются только после ответа: показанные наугад или
            устаревшие на видном месте смотрелись бы как настоящие. */}
        {invite?.online !== null && invite?.online !== undefined ? (
          <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-sm">
            <span className="size-2 rounded-full bg-emerald-500" />
            <span className="text-foreground">{invite.online} Online</span>
            {invite.members ? (
              <>
                <span className="size-2 rounded-full bg-zinc-400" />
                {invite.members} Members
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-muted-foreground mt-0.5 text-sm">Присоединиться к серверу</p>
        )}
      </div>

      <span className="bg-primary text-primary-foreground shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-opacity group-hover:opacity-90">
        Join
      </span>
    </a>
  )
}