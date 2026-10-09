"use client"

import { MapPinIcon } from "lucide-react"
import Image from "next/image"
import ContributionSkyline, {
  type ContributionDay,
} from "@/components/ui/contribution-skyline"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { SocialButtons } from "@/components/social-buttons"
import { TiltCard } from "@/components/tilt-card"
import { ViewCounter } from "@/components/view-counter"
import { emojis, links, media, profile } from "@/lib/profile"
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

/**
 * Отдел «Профиль».
 *
 * Карточка стеклянная и наклоняется за курсором — приём `TiltCard`. Внутри
 * неё всё, что о профиле: фотография, баннер, эмодзи, имя, роль, город,
 * счётчик просмотров и кнопки ссылок.
 */
export function ProfileRoom() {
  return (
    <Room id="profile" title="Профиль">
      <TiltCard className="[perspective:1200px]">
        <article className="border-border/70 relative overflow-hidden rounded-2xl border bg-card/45 shadow-2xl backdrop-blur-xl">
          {/* Баннер из public/banner.gif. */}
          <div className="relative h-44 w-full overflow-hidden sm:h-56">
            <Image
              src={media.banner}
              alt=""
              width={500}
              height={281}
              unoptimized
              priority
              className="size-full object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent"
            />

            {/*
              Эмодзи Discord. Держатся в одной строке с отрицательным
              отступом, поэтому стоят вплотную друг к другу: поодиночке они
              разъезжались и выглядели двумя случайными значками.
            */}
            <div className="absolute top-3 left-4 flex items-center">
              {[emojis.left, emojis.right].map((src, index) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={40}
                  height={40}
                  unoptimized
                  className={index === 1 ? "-ml-3 size-9" : "size-10"}
                />
              ))}
            </div>
          </div>

          <div className="px-5 pb-6 sm:px-6">
            {/* Фотография с мягким свечением и медленно вращающимся кольцом. */}
            <div className="relative -mt-12 inline-block">
              <div
                aria-hidden
                className="from-sky-400 to-emerald-400 animate-spin-slow absolute -inset-1.5 rounded-full bg-gradient-to-tr opacity-40 blur-md"
              />
              <Image
                src={media.avatar}
                alt={profile.name}
                width={80}
                height={80}
                unoptimized
                priority
                className="relative size-20 rounded-full border-4 border-card object-cover"
              />
            </div>

            {/* По имени и роли бежит световая волна. */}
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

            <div className="border-border/70 mt-6 border-t pt-6">
              <p className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
                Написать
              </p>
              <SocialButtons links={links} />
            </div>
          </div>
        </article>
      </TiltCard>
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
