/**
 * Бот, который наблюдает за активностью пользователя в Discord и
 * отправляет её в облако (см. ../worker).
 *
 * Почему нужен именно бот. Активность видна только тем, кто состоит с
 * пользователем в одном сервере, и только если пользователь разрешил её
 * показывать. Бот, добавленный на сервер, получает такие сведения в
 * событии presenceUpdate. Браузер сайта их получить не может в принципе —
 * поэтому данные приходится выносить наружу ботом.
 *
 * Запуск:
 *   npm install
 *   $env:DISCORD_TOKEN = "токен бота"
 *   $env:DISCORD_USER_ID = "775664166538706954"
 *   $env:WORKER_URL = "https://discord-presence.<поддомен>.workers.dev"
 *   $env:WORKER_SECRET = "тот же пароль, что в wrangler secret put WRITE_SECRET"
 *   node index.js
 *
 * Требования к серверу Discord:
 *   1. Бот добавлен на сервер (приглашение с правом bot и scopes bot/guilds).
 *   2. Пользователь состоит в этом же сервере.
 *   3. У пользователя включена передача игровой активности — «Настройки
 *      пользователя → Конфиденциальность и безопасность → Игровая активность».
 *      Если выключена, бот получит только «онлайн/офлайн» без названия игры.
 *
 * Переменные хранятся в переменных окружения, а не в коде: токен бота —
 * это, по сути, пароль от сервера, и он не должен попасть в репозиторий.
 */

const { Client, GatewayIntentBits, ActivityType } = require("discord.js")

const TOKEN = process.env.DISCORD_TOKEN
const USER_ID = process.env.DISCORD_USER_ID
const WORKER_URL = process.env.WORKER_URL
const WORKER_SECRET = process.env.WORKER_SECRET

const missing = [
  ["DISCORD_TOKEN", TOKEN],
  ["DISCORD_USER_ID", USER_ID],
  ["WORKER_URL", WORKER_URL],
  ["WORKER_SECRET", WORKER_SECRET],
]
  .filter(([, value]) => !value)
  .map(([name]) => name)

if (missing.length > 0) {
  console.error(`Не хватает переменных окружения: ${missing.join(", ")}`)
  process.exit(1)
}

/**
 * Intent Guilds — единственный нужный. Он покрывает и присутствие:
 * отдельного intent на присутствие в discord.js v14 нет, отдельный
 * GuildMembers считается привилегированным и здесь не требуется.
 */
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
})

/** Последнее известное состояние: пересылается по таймеру, пока бот жив. */
let lastKnown = { userId: USER_ID, username: null, avatar: null, status: "offline", activity: null }

/**
 * Отправляет состояние в облако.
 *
 * Ошибка не роняет бота: если облако недоступно, статус просто не обновится
 * и карточка на сайте через несколько минут покажет «офлайн».
 */
async function publish(state) {
  lastKnown = state
  try {
    const response = await fetch(WORKER_URL, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-secret": WORKER_SECRET,
      },
      body: JSON.stringify(state),
    })
    if (!response.ok) {
      console.error(`Облако ответило ${response.status}: ${await response.text()}`)
    }
  } catch (error) {
    console.error("Не удалось отправить статус:", error.message)
  }
}

/**
 * Приводит присутствие Discord к тому виду, который ждёт страница.
 *
 * Берётся Playing, а вместе с ним Listening: страница показывает три
 * строки — «Listening to …», название и сколько идёт, и для трека это
 * как раз то, что нужно. Время начала хранится в облаке, а не здесь —
 * облако не даёт ему накапливаться впустую.
 */
function toState(presence, user) {
  const activities = presence.activities ?? []
  const activity =
    activities.find((item) => item.type === ActivityType.Playing) ??
    activities.find((item) => item.type === ActivityType.Listening) ??
    null

  const base = {
    userId: presence.userId,
    username: user?.globalName ?? user?.username ?? null,
    avatar: user?.displayAvatarURL({ size: 128 }) ?? null,
    status: presence.status ?? "offline",
  }

  if (!activity) return { ...base, activity: null }

  return {
    ...base,
    activity: {
      name: activity.name ?? null,
      details: activity.details ?? null,
      state: activity.state ?? null,
      // Обложка есть только у треков Spotify-подобного вида. У обычной
      // игры поля нет, и карточка просто останется без картинки справа.
      cover: activity.artURL ?? activity.art_url ?? null,
    },
  }
}

client.on("presenceUpdate", (oldPresence, newPresence) => {
  if (newPresence.userId !== USER_ID) return

  // Аватара и имени в самом событии нет, они лежат в кэше клиента.
  void client.users
    .fetch(USER_ID)
    .then((user) => publish(toState(newPresence, user)))
    .catch(() => publish(toState(newPresence, null)))
})

client.once("ready", async () => {
  console.log(`Бот ${client.user.tag} подключён, серверов: ${client.guilds.cache.size}`)

  let found = false

  // Разовая проверка на старте: если пользователь уже офлайн, событие
  // presenceUpdate не придёт, и статус остался бы неизвестным навсегда.
  //
  // Берётся присутствие из кэша, а не список участников: присутствие
  // приходит вместе с intent Guilds для всех участников, а вот запрос
  // полного списка участников требует привилегированного GuildMembers,
  // на который бот подавать заявку не должен.
  for (const guild of client.guilds.cache.values()) {
    const presence = guild.presences.cache.get(USER_ID)
    if (!presence) continue

    found = true
    const user = await client.users.fetch(USER_ID).catch(() => null)
    await publish(toState(presence, user))
    console.log(`Нашли пользователя на «${guild.name}»`)
    break
  }

  if (!found) {
    console.warn(
      `Пользователь ${USER_ID} не найден ни на одном сервере, где есть бот.\n` +
        "Проверьте, что бот добавлен на сервер вместе с пользователем.",
    )
    await publish({ ...lastKnown, status: "offline", activity: null })
  }

  // Пока бот жив, статус переотправляется: иначе данные в облаке устареют
  // и карточка на сайте погаснет, даже если бот всё ещё подключён.
  setInterval(() => void publish(lastKnown), 60_000)
})

client.login(TOKEN).catch((error) => {
  console.error("Не удалось войти:", error.message)
  process.exit(1)
})
