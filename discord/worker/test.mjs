/**
 * Проверка воркера без Cloudflare: подменяем хранилище своим объектом и
 * прогоняем те же запросы, что прилетят с бота и со страницы.
 *
 * Запуск:  node test.mjs
 */

import worker from "./src/index.js"

const store = new Map()

/**
 * Секрет — только латиницей. Заголовки HTTP не умеют не-ASCII: если в
 * пароле окажется кириллица, `fetch` упадёт ещё до отправки запроса.
 */
const SECRET = "s3cret-pass-phrase"

const env = {
  WRITE_SECRET: SECRET,
  PRESENCE: {
    async get(key, type) {
      if (!store.has(key)) return null
      const raw = store.get(key)
      return type === "json" ? JSON.parse(raw) : raw
    },
    async put(key, value) {
      store.set(key, value)
    },
  },
}

const USER = "775664166538706954"

let failures = 0

function check(name, condition, extra = "") {
  if (condition) {
    console.log(`  ок    ${name}`)
  } else {
    failures += 1
    console.log(`  СБОЙ  ${name} ${extra}`)
  }
}

async function call(method, body, headers = {}) {
  return worker.fetch(
    new Request("https://x/", {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  )
}

console.log("пустое хранилище")
{
  const response = await call("GET")
  const data = await response.json()
  check("отвечает 200, а не ошибкой", response.status === 200)
  check("состояние — offline", data.status === "offline")
  check("помечено протухшим", data.stale === true)
}

console.log("запись")
{
  const response = await call(
    "PUT",
    { userId: USER, status: "online", username: "Человек" },
    { "x-secret": SECRET },
  )
  check("принимает с верным секретом", response.status === 200)
}

{
  const response = await call("PUT", { userId: USER }, { "x-secret": "wrong-pass" })
  check("отбивает неверный секрет", response.status === 403)
  check("и не записал ничего", store.size === 1)
}

{
  // Секрет верный: иначе запрос отбился бы на проверке прав раньше, чем
  // дошёл бы до проверки тела.
  const response = await call("PUT", { без: "userId" }, { "x-secret": SECRET })
  check("требует userId", response.status === 400)
}

{
  const response = await call("POST", {})
  check("прочие методы запрещены", response.status === 405)
}

console.log("чтение свежих данных")
{
  const response = await call("GET")
  const data = await response.json()
  check("CORS на месте", response.headers.get("Access-Control-Allow-Origin") === "*")
  check("имя дошло", data.username === "Человек")
  check("не протухло", data.stale === false)
}

console.log("игра и накопление времени")
{
  await call(
    "PUT",
    {
      userId: USER,
      status: "online",
      activity: { name: "ROBLOX" },
    },
    { "x-secret": SECRET },
  )
  const first = (await (await call("GET")).json()).activity.startedAt

  // Второе обновление приходит, когда игра уже идёт: время начала обязано
  // остаться прежним, а не перескочить на «сейчас».
  store.set("current", JSON.stringify({ ...JSON.parse(store.get("current")), updatedAt: Date.now() }))
  await call(
    "PUT",
    {
      userId: USER,
      status: "online",
      activity: { name: "ROBLOX" },
    },
    { "x-secret": SECRET },
  )
  const second = (await (await call("GET")).json()).activity.startedAt

  check("начало игры не сбилось", first === second)
  check("название игры на месте", second !== null)
}

console.log("устаревание")
{
  const data = JSON.parse(store.get("current"))
  data.updatedAt = Date.now() - 10 * 60 * 1000
  store.set("current", JSON.stringify(data))

  const read = await (await call("GET")).json()
  check("устаревшее помечается флагом", read.stale === true)
  check("данные при этом не выбрасываются", read.activity?.name === "ROBLOX")
}

console.log("битый JSON в хранилище")
{
  store.set("current", "{это не json")
  const response = await call("GET")
  const data = await response.json()
  check("не падает, а отдаёт offline", response.status === 200 && data.status === "offline")
}

console.log(failures === 0 ? "\nвсе проверки пройдены" : `\nпровалено проверок: ${failures}`)
process.exit(failures === 0 ? 0 : 1)
