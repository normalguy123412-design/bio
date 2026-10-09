"use client"

import * as React from "react"
import Image from "next/image"
import { CheckCircleIcon } from "lucide-react"
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
  activity?: { name?: string | null; startedAt?: number | null } | null
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
 * Сколько прошло времени словами: «53 минуты», «2 часа 5 минут».
 *
 * Пишется вручную, потому что встроенный `Intl.DurationFormat` умеет
 * только «pt53m», а такую надпись на странице видеть не хочется.
 */
function humanDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return "меньше минуты"
  if (minutes < 60) return `${minutes} ${plural(minutes, "минуту", "минуты", "минут")}`

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
  const activity = presence.activity?.name

  return (
    <div className="border-border/20 bg-card/40 flex items-center gap-4 rounded-xl border p-4 text-left">
      {presence.avatar ? (
        <Image
          src={presence.avatar}
          alt=""
          width={64}
          height={64}
          unoptimized
          className="relative size-16 shrink-0 rounded-full"
        />
      ) : (
        <div className="bg-muted relative size-16 shrink-0 rounded-full" />
      )}

      {/* Точка статуса налезает на угол аватара, как в Discord. */}
      <span
        aria-hidden
        className="relative -mt-12 ml-12 size-4 shrink-0 rounded-full border-2 border-card"
        style={{ backgroundColor: color }}
      />

      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{presence.username ?? "Discord"}</span>
          <CheckCircleIcon className="size-4 shrink-0 text-sky-400" />
        </p>

        {activity ? (
          <div className="text-muted-foreground mt-1 text-sm">
            <p className="truncate">
              Играет в <span className="text-foreground font-medium">{activity}</span>
            </p>
            {presence.activity?.startedAt && now ? (
              <p className="text-xs">
                уже {humanDuration(now - presence.activity.startedAt)}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">Не играет</p>
        )}
      </div>
    </div>
  )
}
