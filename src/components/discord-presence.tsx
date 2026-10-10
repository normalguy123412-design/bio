"use client"

import * as React from "react"
import Image from "next/image"
import { LeafIcon } from "lucide-react"
import { discord } from "@/lib/profile"

/**
 * Карточка «что делает человек в Discord».
 *
 * Данные приходят извне, с адреса в настройках: Discord не отдаёт сайту
 * активность пользователя, поэтому её приносит бот через своё облако
 * (см. папку discord в репозитории). Пока адрес не задан, карточка не
 * рисуется — показывать нечего, и пустая рамка только пугает.
 *
 * Опрос идёт каждые 15 секунд: чаще нет смысла, реже — карточка заметно
 * запаздывает за реальностью.
 */

/** Что приходит из облака. */
type Presence = {
  status: "online" | "idle" | "dnd" | "offline" | string
  username?: string | null
  avatar?: string | null
  activity?: {
    name?: string | null
    details?: string | null
    state?: string | null
    /** Обложка трека. Приходит только у Spotify-подобных активностей. */
    cover?: string | null
    startedAt?: number | null
  } | null
  stale?: boolean
}

/** Цвета статусов — те же, что показывает сам Discord. */
const STATUS_COLOR: Record<string, string> = {
  online: "#23a55a",
  idle: "#faa61a",
  dnd: "#f23f43",
  offline: "#80848e",
}

/**
 * Сколько прошло времени словами: «12 секунд», «53 минуты», «2 часа».
 *
 * Пишется вручную, потому что встроенный `Intl.DurationFormat` умеет
 * только «pt53m», а такую надпись на странице видеть не хочется.
 */
function humanDuration(ms: number) {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 5) return "только что"

  if (seconds < 60) {
    return `${seconds} ${plural(seconds, "секунду", "секунды", "секунд")}`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} ${plural(minutes, "минуту", "минуты", "минут")}`
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hoursText = `${hours} ${plural(hours, "час", "часа", "часов")}`
  if (rest === 0) return hoursText

  return `${hoursText} ${rest} ${plural(rest, "минуту", "минуты", "минут")}`
}

function plural(n: number, one: string, few: string, many: string) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export function DiscordPresence() {
  const [presence, setPresence] = React.useState<Presence | null>(null)
  /**
   * Время последней проверки. Оно нужно, чтобы надпись «уже 53 минуты» не
   * застывала: считать `Date.now()` прямо при отрисовке нельзя — значение
   * менялось бы от рендера к рендеру и ломало бы правило чистоты React.
   */
  const [now, setNow] = React.useState<number | null>(null)

  React.useEffect(() => {
    // Без адреса запроса не существует, опрос не запускается вовсе.
    if (!discord.presenceEndpoint) return

    const controller = new AbortController()

    async function poll() {
      try {
        const response = await fetch(discord.presenceEndpoint, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) return
        const data = (await response.json()) as Presence
        setPresence(data)
        setNow(Date.now())
      } catch {
        // Обрыв связи — не повод ничего показывать: прошлые данные вернее
        // пустой карточки, а сбой сам по себе интереса не представляет.
      }
    }

    void poll()
    const timer = setInterval(() => void poll(), 15_000)

    return () => {
      controller.abort()
      clearInterval(timer)
    }
  }, [])

  if (!discord.presenceEndpoint || !presence) return null

  // Данные протухли — значит бот выключился, и показывать его старый статус
  // как актуальный нельзя.
  if (presence.stale || presence.status === "offline") return null

  const color = STATUS_COLOR[presence.status] ?? STATUS_COLOR.offline
  const activity = presence.activity

  /*
    Текст активности собирается из трёх возможных строк, и берутся они в том
    порядке, в каком Discord их отдаёт. У игры заполнено `name`, у трека —
    `state` («Listening to …») и `details` (название), поэтому порядок
    разный, а вид одинаковый.
  */
  const lines: string[] = []
  if (activity?.state) lines.push(activity.state)
  else if (activity?.name) lines.push(`Играет в ${activity.name}`)
  if (activity?.details) lines.push(activity.details)
  if (activity?.startedAt && now) lines.push(`уже ${humanDuration(now - activity.startedAt)}`)

  const hasActivity = lines.length > 0
  const cover = activity?.cover

  return (
    <div className="flex items-center gap-4">
      {/*
        Аватар с точкой статуса. Точка лежит абсолютно на углу фотографии,
        а не сдвигается соседним элементом: раньше она стояла отдельным
        блоком во flex с отступами -mt-12 ml-12, и при любой другой высоте
        строки уезжала вверх от аватара, повисая над ним отдельно.
      */}
      <span className="relative shrink-0">
        {presence.avatar ? (
          <Image
            src={presence.avatar}
            alt=""
            width={64}
            height={64}
            unoptimized
            className="size-16 rounded-full"
          />
        ) : (
          <span className="bg-muted block size-16 rounded-full" />
        )}

        <span
          aria-hidden
          className="border-card absolute -right-0.5 -bottom-0.5 size-4 rounded-full border-2"
          style={{ backgroundColor: color }}
        />
      </span>

      <div className="min-w-0 flex-1">
        {/*
          Правая часть строки: обложка трека, если играет, иначе тег
          сервера. Раньше здесь стояла галочка верификации, которой у
          обычного аккаунта нет и которая ничего не значит.
        */}
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            {presence.username ?? "Discord"}
          </span>

          {!hasActivity && discord.serverTag ? (
            <span
              className="bg-card/70 text-muted-foreground ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
              title="Тег сервера"
            >
              <LeafIcon className="size-3.5 text-emerald-400" />
              {discord.serverTag}
            </span>
          ) : null}
        </div>

        {hasActivity ? (
          <p className="mt-1 space-y-0.5 text-sm leading-snug">
            {lines.map((line, index) => (
              <span key={index} className="block truncate">
                {index === lines.length - 1 ? (
                  <span className="text-muted-foreground">{line}</span>
                ) : (
                  line
                )}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      {hasActivity && cover ? (
        <Image
          src={cover}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="size-16 shrink-0 rounded-lg"
        />
      ) : null}
    </div>
  )
}