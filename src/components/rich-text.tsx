"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "cn"

/**
 * РАЗМЕТКА В СКОБКАХ — как на страницах bio.
 *
 * Текст пишется теми же тегами, что и на образце:
 * `[em]…[/em]`, `[color=00AA72]…[/color]`, `[dc-emoji-id]…[/dc-emoji-id]`
 * и так далее. Раньше такой текст выводился как есть, вместе со скобками;
 * теперь теги разбираются и превращаются в оформление.
 *
 * Разбор сделан вручную, без библиотеки: набор тегов небольшой и известный,
 * а лишняя зависимость ради двадцати строк регулярных выражений здесь не
 * оправдана. Незакрытый или неизвестный тег показывается как обычный текст —
 * виноват не пользователь, а опечатка.
 */

type Node =
  | { kind: "text"; value: string }
  /**
   * У тегов-одиночек (`[br]`, `[hr]`, эмодзи) содержимого нет вовсе, поэтому
   * `children` необязателен — иначе пришлось бы вставлять пустой массив
   * в каждую из них.
   */
  | { kind: "tag"; tag: string; attr?: string; children?: Node[] }

/** Оформление по тегу. Пустая строка — тег-обёртка, влияния не имеет. */
const STYLES: Record<string, string> = {
  h: "text-lg font-semibold",
  b: "font-semibold",
  em: "italic",
  u: "underline underline-offset-2",
  del: "line-through opacity-70",
  code: "font-mono rounded bg-muted px-1 py-0.5 text-[0.9em]",
  quote: "border-primary/60 block border-l-2 pl-3 italic",
  highlight: "rounded bg-amber-300/30 px-1",
  spoiler: "bg-muted rounded px-1 transition-[filter] hover:filter-none",
  // Эти теги только обрамляют содержимое и сами по себе ничего не меняют.
  theme: "",
  // У `color` оформления нет: цвет приходит значением в скобках, `[color=00AA72]`.
  color: "",
  list: "my-1 flex list-disc flex-col pl-5",
  item: "",
  left: "",
  center: "",
  right: "",
}

/**
 * Приводит значение из `[color=…]` к тому, чему CSS готов.
 *
 * На образце цвет пишут без решётки — `00AA72`. В styles такой строкой React
 * считать нечего и просто выбрасывает её, поэтому решётка ставится здесь.
 * Готовые выражения (`var(…)`, `rgb(…)`, `oklch(…)`) не трогаем.
 */
function toColor(raw: string) {
  const value = raw.trim()
  if (!value) return null
  if (value.startsWith("#")) return value
  if (/^(var|rgb|rgba|hsl|oklch|color)\(/i.test(value)) return value
  return `#${value}`
}

/** Теги, после которых текст продолжается с новой строки. */
const BREAKS = new Set(["hr", "hr-theme", "br"])

const TAG = /\[(\/?)([a-zA-Z-]+)(?:=([^\]]+))?\]/g

function parse(input: string): Node[] {
  const root: Node[] = []
  // Стек открытых тегов. Последний элемент — текущий контейнер.
  const stack: { tag: string; attr?: string; children: Node[] }[] = [
    { tag: "root", children: root },
  ]

  const top = () => stack[stack.length - 1].children

  let cursor = 0
  TAG.lastIndex = 0

  for (let match = TAG.exec(input); match; match = TAG.exec(input)) {
    if (match.index > cursor) {
      top().push({
        kind: "text",
        value: input.slice(cursor, match.index),
      })
    }
    cursor = match.index + match[0].length

    const [, closing, rawTag, attr] = match
    const tag = rawTag.toLowerCase()

    if (closing) {
      // Ищем соответствующий открывающий тег. Если его нет — считаем
      // тег обычным текстом, чтобы не потерять содержимое.
      const index = stack.map((item) => item.tag).lastIndexOf(tag)
      if (index > 0) stack.length = index
      continue
    }

    if (tag === "dc-emoji-id") {
      // У тега-эмодзи отдельный закрывающий, содержимое между ними — его id.
      const close = input.indexOf("[/dc-emoji-id]", cursor)
      const id = (
        close === -1 ? input.slice(cursor) : input.slice(cursor, close)
      ).trim()
      top().push({ kind: "tag", tag: "dc-emoji-id", attr: id })
      TAG.lastIndex = close === -1 ? input.length : close + "[/dc-emoji-id]".length
      cursor = TAG.lastIndex
      continue
    }

    if (BREAKS.has(tag)) {
      top().push({ kind: "tag", tag })
      continue
    }

    const node = { tag, attr, children: [] as Node[] }
    top().push({ kind: "tag", ...node })
    stack.push(node)
  }

  if (cursor < input.length) {
    top().push({ kind: "text", value: input.slice(cursor) })
  }

  return root
}

function render(nodes: Node[], keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`

    if (node.kind === "text") {
      return <React.Fragment key={key}>{node.value}</React.Fragment>
    }

    if (node.tag === "dc-emoji-id") {
      if (!node.attr) return null
      return (
        <Image
          key={key}
          src={`https://cdn.discordapp.com/emojis/${node.attr}.webp?animated=true`}
          alt=""
          width={32}
          height={32}
          unoptimized
          className="inline-block size-7 align-[-0.15em]"
        />
      )
    }

    if (node.tag === "br") return <br key={key} />
    if (node.tag === "hr" || node.tag === "hr-theme") {
      return (
        <hr
          key={key}
          className="border-border/70 my-4 w-full border-t"
        />
      )
    }

    // Неизвестный тег: содержимое показываем как есть, без обрамления.
    const style = STYLES[node.tag]
    const children = render(node.children ?? [], key)

    if (style === undefined) return <React.Fragment key={key}>{children}</React.Fragment>

    const color = node.tag === "color" ? toColor(node.attr ?? "") : null

    return (
      <span key={key} className={style} style={color ? { color } : undefined}>
        {children}
      </span>
    )
  })
}

/** Выравнивание забирается из строки целиком: в разметке оно блоковое. */
function alignmentOf(source: string) {
  for (const tag of ["center", "left", "right"]) {
    if (source.includes(`[${tag}]`)) {
      return tag === "center" ? "text-center" : tag === "left" ? "text-left" : "text-right"
    }
  }
  return null
}

export function RichText({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  // Разбор — чистая функция от строки, поэтому его можно считать на этапе
  // рендера без состояния.
  const nodes = React.useMemo(() => parse(children), [children])
  const align = alignmentOf(children)

  return <p className={cn("leading-relaxed", align, className)}>{render(nodes, "n")}</p>
}
