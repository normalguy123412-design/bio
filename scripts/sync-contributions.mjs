/**
 * Обновление данных о коммитах.
 *
 * GitHub не отдаёт календарь активности через REST — график подгружается
 * отдельным фрагментом страницы. Скрипт забирает именно его и раскладывает
 * по дням в src/data/contributions.json.
 *
 * Запуск: npm run sync:contributions
 */

import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const LOGIN = "normalguy123412-design"
const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(HERE, "..", "src", "data", "contributions.json")

/** Из строки «12 contributions on March 3rd.» — число. */
function countFromTooltip(text) {
  const match = /(\d+)\s+contribution/.exec(text)
  return match ? Number(match[1]) : 0
}

const response = await fetch(`https://github.com/users/${LOGIN}/contributions`, {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "text/html",
  },
})

if (!response.ok) {
  throw new Error(`GitHub ответил ${response.status}`)
}

const html = await response.text()

// Ячейка календаря и её подсказка идут рядом: сначала td с data-date и id,
// затем tool-tip на тот же id — с текстом вроде «No contributions on …».
const cell =
  /data-date="(?<date>\d{4}-\d{2}-\d{2})" id="contribution-day-component-(?<ix>\d+-\d+)"[\s\S]{0,300}?for="contribution-day-component-\k<ix>"[^>]*>(?<tip>[^<]*)<\/tool-tip/g

const days = []
for (const match of html.matchAll(cell)) {
  days.push({ date: match.groups.date, count: countFromTooltip(match.groups.tip) })
}

if (!days.length) {
  throw new Error("Не удалось разобрать календарь — разметка GitHub изменилась")
}

days.sort((a, b) => a.date.localeCompare(b.date))

await writeFile(OUT, JSON.stringify(days, null, 2) + "\n", "utf8")

const total = days.reduce((sum, day) => sum + day.count, 0)
const active = days.filter((day) => day.count > 0).length

console.log(
  `Записано ${days.length} дней (${days[0].date} — ${days.at(-1).date}) в ${path.relative(process.cwd(), OUT)}`
)
console.log(`Всего коммитов: ${total}, активных дней: ${active}`)
