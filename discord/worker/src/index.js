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
 * Сайт (статический GitHub Pages) сюда только читает. Серверов у него нет,
 * поэтому и хранить больше негде.
 *
 * Почему Workers. Бесплатного тарифа хватает с большим запасом: страница
 * опрашивает адрес раз в 15 секунд, то есть около шести тысяч запросов в
 * сутки, а лимит измеряется десятками миллионов.
 *
 * Настройка (команды wrangler):
 *   npm i -g wrangler
 *   wrangler kv namespace create PRESENCE     # вернёт id — вписать в wrangler.toml
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
  // Страница живёт на github.io, а статус — на workers.dev: это разные
  // источники, и без заголовка браузер не отдаст ответ компоненту.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, x-secret",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  })
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS })
    }

    if (request.method === "GET") {
      const raw = await env.PRESENCE.get(KEY)
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
      const stale = Date.now() - (data.updatedAt ?? 0) > STALE_AFTER_SECONDS * 1000

      return json({ ...data, stale })
    }

    if (request.method === "PUT") {
      if (request.headers.get("x-secret") !== env.WRITE_SECRET) {
        return json({ error: "forbidden" }, 403)
      }

      let payload
      try {
        payload = await request.json()
      } catch {
        return json({ error: "bad json" }, 400)
      }

      if (typeof payload?.userId !== "string") {
        return json({ error: "userId is required" }, 400)
      }

      const now = Date.now()
      const current = await env.PRESENCE.get(KEY, "json")
      const activity = payload.activity ?? null

      // Секунды игры копятся только пока статус живой, иначе после суток
      // молчания карточка показывала бы «играет 400 дней».
      const startedAt = activity ? (current?.activity?.startedAt ?? now) : null

      await env.PRESENCE.put(
        KEY,
        JSON.stringify({
          userId: payload.userId,
          username: payload.username ?? null,
          avatar: payload.avatar ?? null,
          status: payload.status ?? "online",
          activity: activity ? { ...activity, startedAt } : null,
          updatedAt: now,
        }),
        // Подстраховка от вечной записи, если бот больше никогда не придёт.
        { expirationTtl: 60 * 60 * 24 },
      )

      return json({ ok: true })
    }

    return json({ error: "method not allowed" }, 405)
  },
}
