"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { ICONS } from "@/components/icons"
import type { Link } from "@/lib/profile"

/**
 * Копирование в буфер обмена.
 *
 * `navigator.clipboard` есть только в защищённом контексте — то есть когда
 * страницу открыли по https. На http и с файла его нет, поэтому предусмотрен
 * запасной путь через скрытое поле.
 */
async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }

  const field = document.createElement("textarea")
  field.value = text
  field.setAttribute("readonly", "")
  field.style.position = "fixed"
  field.style.opacity = "0"
  document.body.append(field)
  field.select()
  document.execCommand("copy")
  field.remove()
  return Promise.resolve()
}

function LinkRow({ link }: { link: Link }) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef(0)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  const Icon = ICONS[link.icon]

  const onCopy = async () => {
    if (!link.copy) return
    try {
      await copyText(link.copy)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <li className="border-border bg-card hover:bg-accent/40 flex items-center gap-3 rounded-xl border p-3 transition-colors">
      <span
        aria-hidden
        className="bg-muted text-primary grid size-9 shrink-0 place-items-center rounded-lg"
      >
        <Icon className="size-4" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-muted-foreground text-[0.7rem] tracking-[0.08em] uppercase">
          {link.label}
        </span>
        <span className="truncate text-sm">{link.value}</span>
      </span>

      {link.copy ? (
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Скопировать: ${link.label}`}
          className="border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {copied ? (
            <>
              <CheckIcon className="size-3.5" />
              Скопировано
            </>
          ) : (
            <>
              <CopyIcon className="size-3.5" />
              Копировать
            </>
          )}
        </button>
      ) : null}

      {link.href ? (
        <a
          href={link.href}
          {...(link.external
            ? { target: "_blank", rel: "noreferrer noopener" }
            : {})}
          className="border-border hover:border-primary hover:text-primary shrink-0 rounded-lg border px-2.5 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label={`Открыть: ${link.label}`}
        >
          {link.external ? "Открыть" : "Написать"}
        </a>
      ) : null}
    </li>
  )
}

/** Список ссылок: каждая строка копируется и открывается. */
export function LinkList({ links }: { links: Link[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => (
        <LinkRow key={link.id} link={link} />
      ))}
    </ul>
  )
}
