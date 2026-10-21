"use client"

import * as React from "react"
import { EyeIcon } from "lucide-react"
import { views } from "@/lib/profile"

/**
 * СЧЁТЧИК ПРОСМОТРОВ.
 *
 * Страница статическая, своего сервера у неё нет, поэтому число хранит
 * внешний сервис: одно обращение по адресу из `views.endpoint` и увеличивает
 * счётчик, и возвращает новое значение.
 *
 * Считает только приём в игре, а не каждый рендер: обновление состояния в
 * React в разработке вызывается дважды, и иначе каждое открытие страницы
 * добавляло бы два просмотра. Флаг живёт в useRef — он переживает
 * повторный рендер, но не переживает перезагрузку, как и нужно.
 *
 * Если адрес не задан или сервис не отвечает, состояние остаётся `null`:
 * показываются не «0» и не ошибка, а ничего.
 */
export function useViewCount(): number | null {
  const [count, setCount] = React.useState<number | null>(null)
  const counted = React.useRef(false)

  React.useEffect(() => {
    if (counted.current || !views.endpoint) return
    counted.current = true

    const controller = new AbortController()

    fetch(views.endpoint, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json()
      })
      .then((data: unknown) => {
        const raw = (data as { count?: unknown; total?: unknown } | null)?.count
        const value = typeof raw === "number" ? raw : Number(raw)
        if (Number.isFinite(value)) setCount(value)
      })
      .catch(() => {
        // Сервис недоступен или ключа нет — счётчик просто не показываем.
      })

    return () => controller.abort()
  }, [])

  return count
}

/** Склонение слова «просмотр». */
function viewing(count: number) {
  return count % 10 === 1 && count % 100 !== 11
    ? "просмотр"
    : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)
      ? "просмотра"
      : "просмотров"
}

/** Полная подпись «N просмотров» — живёт в карточке раздела. */
export function ViewCounter() {
  const count = useViewCount()

  if (count === null) return null

  return (
    <p className="flex items-center gap-1.5 text-[11px] text-[#7d8894]">
      <EyeIcon className="size-3.5" />
      {new Intl.NumberFormat("ru-RU").format(count)}
      {viewing(count)}
    </p>
  )
}
