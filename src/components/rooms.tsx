"use client"

import { MapPinIcon } from "lucide-react"
import ContributionSkyline, {
  type ContributionDay,
} from "@/components/ui/contribution-skyline"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { SocialButtons } from "@/components/social-buttons"
import { ViewCounter } from "@/components/view-counter"
import { links, profile } from "@/lib/profile"
import contributions from "@/data/contributions.json"

/**
 * Общая рамка «отдела».
 *
 * Отдел занимает весь экран и не прокручивается вместе с остальными: если
 * содержимое не помещается по высоте, прокручивается только оно само.
 * Полоса прокрутки скрыта, а колесо мыши внутри всё равно работает.
 */
export function Room({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-8 flex h-full flex-col justify-center overflow-y-auto px-4 py-10 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto w-full max-w-3xl">
        <h2 className="text-muted-foreground mb-4 text-xs tracking-[0.08em] uppercase">
          {title}
        </h2>
        {children}
      </div>
    </section>
  )
}

function Banner() {
  return (
    <div
      aria-hidden
      className="from-primary/30 via-cyan-500/20 h-44 w-full bg-gradient-to-br sm:h-56"
    >
      {/* Едва заметная сетка поверх градиента — как на фоне ИБ-Гида. */}
      <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
    </div>
  )
}

/**
 * Отдел «Профиль».
 *
 * Здесь же внизу карточки живут кнопки ссылок — раньше для них был отдельный
 * отдел и до них ещё надо было добраться переключением.
 */
export function ProfileRoom() {
  return (
    <Room id="profile" title="Профиль">
      <article className="border-border bg-card relative overflow-hidden rounded-2xl border">
        <Banner />

        <div className="px-5 pb-6 sm:px-6">
          {/* Аватар с мягким свечением и медленным поворотом кольца. */}
          <div className="relative -mt-10 inline-block">
            <div
              aria-hidden
              className="from-sky-400 to-emerald-400 animate-spin-slow absolute -inset-1.5 rounded-full bg-gradient-to-tr opacity-40 blur-md"
            />
            <div className="from-sky-400 to-emerald-400 relative grid size-20 place-items-center rounded-full border-4 border-card bg-gradient-to-br text-2xl font-bold text-black">
              {profile.avatar}
            </div>
          </div>

          {/* По имени и роли бежит светлая волна. */}
          <TextShimmer
            as="h1"
            duration={3}
            className="font-heading mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl"
          >
            {profile.name}
          </TextShimmer>

          <TextShimmer
            as="p"
            duration={3.6}
            spread={1}
            className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.95rem]"
          >
            {profile.roles.join("  ·  ")}
          </TextShimmer>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed italic">
            {profile.bio}
          </p>

          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-4" />
              {profile.location}
            </span>
            <ViewCounter />
          </div>

          <div className="border-border mt-6 border-t pt-6">
            <p className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
              Написать
            </p>
            <SocialButtons links={links} />
          </div>
        </div>
      </article>
    </Room>
  )
}

/** Отдел «Активность»: год коммитов с GitHub. */
export function ActivityRoom() {
  return (
    <Room id="activity" title="Активность">
      <ContributionSkyline
        data={contributions as ContributionDay[]}
        palette="ocean"
        defaultView="2d"
        locale="ru-RU"
        weekStart={1}
        unit="коммит"
        unitPlural="коммитов"
        footer="Данные из календаря коммитов GitHub"
      />
      <p className="text-muted-foreground mt-2 text-xs">
        Обновляется скриптом{" "}
        <code className="font-mono">npm run sync:contributions</code>.
      </p>
    </Room>
  )
}
