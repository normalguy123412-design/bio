/**
 * Облако для статуса Discord.
 *
 * Зачем оно нужно. Discord не отдаёт сайту, во что играет конкретный
 * пользователь: публичного адреса вида «что делает этот юзер» просто нет.
 * Наблюдать за активностью может только бот, стоящий в одном сервере с
 * этим пользователем, и только если у того включена передача игровой
 * активности. Значит, кто-то должен принести эти данные изнутри Discord
 * наружу — это делает бот (см. ../bot), а хранит их это облако.
 *
 * Сайт сюда только читает: он собран статически, своего сервера у него нет.
 * Поэтому и хранить больше негде.
 *
 * Почему синтаксис service worker, а не модули. Модули (`export default`)
 * загружаются multipart-запросом, часть которого зовётся именем файла, и
 * такой запрос не всегда собирается из-под API. Сервис-воркер грузится
 * целиком одним `PUT` с типом `application/javascript`, и привязки в нём
 * доступны как глобальные переменные — поэтому здесь `PRESENCE`, а не
 * `env.PRESENCE`.
 *
 * Настройка:
 *   npm i -g wrangler
 *   wrangler kv namespace create PRESENCE     # id — в wrangler.toml
 *   wrangler secret put WRITE_SECRET          # пароль, который знает и бот
 *   wrangler deploy
 *
 * Пароль — только латиницей. Он передаётся в заголовке x-secret, а
 * заголовки HTTP умеют лишь ASCII: стоит вписать кириллицу, и запрос не
 * уйдёт даже до сети.
 *
 * Писать данные может только бот: он предъявляет WRITE_SECRET. Читать может
 * кто угодно, в том числе браузер с любой страницы, поэтому секрет в адрес
 * не входит и в браузер не попадает.
 */

/** Сколько секунд данные считаются свежими. */
const STALE_AFTER_SECONDS = 60 * 5

/** Ключ в хранилище. Один статус на всех. */
const KEY = "current"

const CORS = {
  // Страница живёт на bio-dt6.pages.dev, а статус — на workers.dev: это
  // разные источники, и без заголовка браузер не отдаст ответ компоненту.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-secret",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({}, CORS, {
      "Content-Type": "application/json; charset=utf-8",
    }),
  })
}

async function handle(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: CORS })
  }

  if (request.method === "GET") {
    const raw = await PRESENCE.get(KEY)
    if (!raw) {
      // Не ошибка: бот ещё ни разу не писал, и страница должна показать
      // «офлайн», а не пустую карточку с ошибкой в консоли.
      return json({ status: "offline", stale: true })
    }

    let data
    try {
      data = JSON.parse(raw)
    } catch {
      return json({ status: "offline", stale: true })
    }

    // Данные не удаляются, а просто устаревают: если бот выключился,
    // через несколько минут карточка сама станет «офлайн».
    const stale = Date.now() - (data.updatedAt || 0) > STALE_AFTER_SECONDS * 1000

    return json(Object.assign({}, data, { stale }))
  }

  if (request.method === "PUT") {
    if (request.headers.get("x-secret") !== WRITE_SECRET) {
      return json({ error: "forbidden" }, 403)
    }

    let text
    try {
      text = await request.text()
    } catch {
      return json({ error: "cannot read body" }, 400)
    }

    /*
      id берётся из текста запроса, а не из распарсенного объекта.
      Снежинки Discord длиннее 2^53, поэтому JSON.parse превращает их в
      число с округлением: 775664166538706954 стал бы 775664166538707000,
      и в базу легло бы уже чужое id. Здесь цифры сохраняются как есть.

      Допускаются и число, и текст: discord.py отдаёт id числом, обычные
      JSON-клиенты присылают строкой. Раньше стояла строгая проверка
      typeof === "string", по которой бот на discord.py получал 400-м,
      молча повторял его каждые полминуты и ни разу ничего не записал.
    */
    const found = text.match(/"userId"\s*:\s*"?(\d+)"?/)
    const userId = found ? found[1] : null
    if (!userId) {
      return json({ error: "userId is required" }, 400)
    }

    let payload
    try {
      payload = JSON.parse(text)
    } catch {
      return json({ error: "bad json" }, 400)
    }

    const now = Date.now()
    const current = await PRESENCE.get(KEY, "json")
    const activity = payload.activity || null

    // Секунды игры копятся только пока статус живой, иначе после суток
    // молчания карточка показывала бы «играет 400 дней».
    const startedAt = activity ? (current?.activity?.startedAt ?? now) : null

    await PRESENCE.put(
      KEY,
      JSON.stringify({
        userId,
        username: payload.username || null,
        avatar: payload.avatar || null,
        status: payload.status || "online",
        activity: activity ? { ...activity, startedAt } : null,
        updatedAt: now,
      }),
      // Подстраховка от вечной записи, если бот больше никогда не придёт.
      { expirationTtl: 60 * 60 * 24 },
    )

    return json({ ok: true })
  }

  return json({ error: "method not allowed" }, 405)
}

addEventListener("fetch", (event) => {
  event.respondWith(handle(event.request))
})