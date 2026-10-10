"use client"

import * as React from "react"
import Image from "next/image"
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

/** Одна активность. Их может быть несколько сразу: игра, стрим и трек. */
type Activity = {
  name?: string | null
  /** Тип от Discord: playing, listening, streaming, watching. */
  type?: string | null
  details?: string | null
  state?: string | null
  /** Обложка трека. Приходит только у Spotify-подобных активностей. */
  cover?: string | null
  startedAt?: number | null
}

/** Что приходит из облака. */
type Presence = {
  status: "online" | "idle" | "dnd" | "offline" | string
  username?: string | null
  avatar?: string | null
  activities?: Activity[]
  /** Первая активность отдельно — для старых версий данных. */
  activity?: Activity | null
  stale?: boolean
}

/** Цвета статусов — те же, что показывает сам Discord. */
const STATUS_COLOR: Record<string, string> = {
  online: "#23a55a",
  idle: "#faa61a",
  dnd: "#f23f43",
  offline: "#80848e",
}

/** Глаголы по типу активности: Discord шлёт названия вперемешку. */
const VERB: Record<string, string> = {
  playing: "Играет в",
  listening: "Слушает",
  streaming: "Стримит",
  watching: "Смотрит",
  custom: "Занимается",
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

/** Три строки текста активности: что делает, что именно, сколько идёт. */
function activityLines(activity: Activity, now: number | null) {
  const lines: string[] = []

  const verb = activity.type ? VERB[activity.type] : undefined
  if (verb && activity.name) lines.push(`${verb} ${activity.name}`)
  else if (activity.state) lines.push(activity.state)
  else if (activity.name) lines.push(activity.name)

  if (activity.details) lines.push(activity.details)
  if (activity.startedAt && now) lines.push(`уже ${humanDuration(now - activity.startedAt)}`)

  return lines
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

  // Список приходит от бота; если его нет, берётся одиночная активность —
  // так формат переживает старые данные, не дожидаясь новой записи.
  const list = Array.isArray(presence.activities)
    ? presence.activities
    : presence.activity
      ? [presence.activity]
      : []

  return (
    <div className="flex items-start gap-4">
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
        <p className="flex items-center gap-2">
          <span className="truncate font-medium">
            {presence.username ?? "Discord"}
          </span>

          {/*
            Тег сервера занимает то место, где у образца стоит обложка трека:
            когда активностей нет — видно тег, когда есть — обложку.
            Раньше здесь была галочка верификации, которой у обычного
            аккаунта нет и которая ничего не значит.
          */}
          {list.length === 0 && discord.serverTag ? (
            <span
              className="bg-card/70 text-muted-foreground ml-auto inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs"
              title="Тег сервера"
            >
              {discord.serverTag}
            </span>
          ) : null}
        </p>

        {list.length > 0 ? (
          <ul className="mt-1 space-y-2">
            {list.map((activity, index) => {
              const lines = activityLines(activity, now)
              if (lines.length === 0 && !activity.cover) return null

              return (
                <li key={index} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    {lines.map((line, lineIndex) => (
                      <span
                        key={lineIndex}
                        className={
                          lineIndex === lines.length - 1
                            ? "text-muted-foreground block truncate text-sm"
                            : "block truncate text-sm"
                        }
                      >
                        {line}
                      </span>
                    ))}
                  </div>

                  {activity.cover ? (
                    <Image
                      src={activity.cover}
                      alt=""
                      width={64}
                      height={64}
                      unoptimized
                      className="size-16 shrink-0 rounded-lg"
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </div>
  )
}