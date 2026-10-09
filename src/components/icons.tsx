import type * as React from "react"
import {
  BookOpenIcon,
  MailIcon,
  SendIcon,
  ShieldCheckIcon,
} from "lucide-react"
import type { IconName } from "@/lib/profile"

/**
 * Тип иконки.
 *
 * Иконки lucide — это `ForwardRefExoticComponent`, а свои иконки обычно
 * обычные функции. `LucideIcon` поэтому не подходит: свой знак в него не
 * влезает. Структурный тип принимает и то, и другое.
 */
export type IconComponent = (props: { className?: string }) => React.ReactNode

/**
 * Знак GitHub.
 *
 * В lucide-react больше нет иконок брендов, поэтому знак нарисован здесь
 * один раз и переиспользуется и в списке ссылок, и в боковой навигации.
 */
export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.2c-3.34.72-4.04-1.6-4.04-1.6-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.1-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.32.47-2.39 1.24-3.23-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18a4.7 4.7 0 0 1 1.24 3.23c0 4.62-2.81 5.64-5.49 5.94.43.37.82 1.1.82 2.22v3.29c0 .32.21.69.82.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}

/**
 * Имя иконки → компонент.
 *
 * Нужен потому, что компонент нельзя хранить в данных: массив ссылок
 * лежит в общем модуле, который читает и сервер, а функции через границу
 * RSC не проходят. В данных остаётся строка, компонент подставляется здесь.
 */
export const ICONS: Record<IconName, IconComponent> = {
  github: GithubIcon,
  shield: ShieldCheckIcon,
  mail: MailIcon,
  send: SendIcon,
  book: BookOpenIcon,
}
