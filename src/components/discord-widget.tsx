"use client"

import { discord } from "@/lib/profile"

/**
 * Официальный виджет сервера Discord.
 *
 * Это просто iframe с адресом discord.com, который сервер отдаёт любому,
 * кто его запросит: ни токен, ни регистрация не нужны, все данные приходят
 * со стороны Discord. Настройка требуется одна — включить виджет в
 * Настройках сервера; пока она выключена, Discord отвечает 404.
 *
 * Высота в 300px покрывает обе раскладки Discord, десктопную и мобильную.
 */
export function DiscordServerWidget() {
  if (!discord.widgetEnabled) return null

  return (
    <iframe
      title="Сервер Discord"
      src={`https://discord.com/widget/${discord.serverId}?theme=dark`}
      width="100%"
      height="300"
      // Прозрачный фон: виджет по умолчанию рисует свой белый прямоугольник,
      // который выбивается из тёмной карточки.
      style={{ background: "transparent", border: "0" }}
      allowTransparency
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
    />
  )
}
