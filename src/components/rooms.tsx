"use client"

import { MapPinIcon, SparklesIcon } from "lucide-react"
import Image from "next/image"
import ContributionSkyline, {
  type ContributionDay,
} from "@/components/ui/contribution-skyline"
import { TextShimmer } from "@/components/ui/text-shimmer"
import { SocialButtons } from "@/components/social-buttons"
import { RichText } from "@/components/rich-text"
import { TiltCard } from "@/components/tilt-card"
import { ViewCounter } from "@/components/view-counter"
import { links, media, profile } from "@/lib/profile"
import contributions from "@/data/contributions.json"

/**
 * Общая рамка «отдела».
 *
 * Отдел занимает весь экран и не прокручивается вместе с остальными: если
 * содержимое не помещается по высоте, прокручивается только оно само.
 * Полоса прокрутки скрыта, а колесо мыши внутри всё равно работает.
 *
 * Центрирование сделано на автоматических полях, а не на `justify-center`:
 * когда содержимое выше экрана, `justify-center` выталкивает его верх за
 * границу и до баннера нельзя доскроллить — он просто пропадает. Автоматические
 * поля при нехватке места превращаются в отступ и ничего не режут.
 */
export function Room({
  id,
  children,
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className="flex h-full flex-col overflow-y-auto px-4 py-10 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto my-auto w-full max-w-3xl">{children}</div>
    </section>
  )
}

/** Календарь коммитов. Живёт внутри карточки профиля, отдельным отделом не является. */
function Activity() {
  return (
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
  )
}

/** Искры вокруг имени. На странице-образце их роль играет гифка с блёстками. */
function Sparkles() {
  // Разброс задан явно: случайные позиции менялись бы при каждом рендере,
  // и искры прыгали бы на новом месте. У каждой точки указана либо левая,
  // либо правая сторона — обе сразу быть не может.
  const spots: readonly {
    top: string
    left?: string
    right?: string
    size: string
    delay: string
  }[] = [
    { top: "-10%", left: "-6%", size: "size-4", delay: "0s" },
    { top: "-22%", left: "18%", size: "size-3", delay: "0.6s" },
    { top: "4%", left: "-16%", size: "size-3", delay: "1.1s" },
    { top: "-6%", right: "-4%", size: "size-5", delay: "1.7s" },
    { top: "-24%", right: "16%", size: "size-3", delay: "2.2s" },
    { top: "10%", right: "-18%", size: "size-4", delay: "2.8s" },
  ]

  return (
    <>
      {spots.map((spot, index) => (
        <SparklesIcon
          key={index}
          aria-hidden
          className={`animate-twinkle text-sky-300/80 absolute ${spot.size}`}
          style={{
            top: spot.top,
            left: spot.left,
            right: spot.right,
            animationDelay: spot.delay,
          }}
        />
      ))}
    </>
  )
}

/**
 * ОТДЕЛ «ПРОФИЛЬ».
 *
 * Всё в одном отдел��, как на странице-образце: фотография, имя, роль,
 * город, счётчик просмотров, активность и кнопки ссылок. Отдельных
 * «Активности» и «Ссылок» больше нет — до них и так было видно сразу.
 *
 * Аватар и имя стоят по центру и выровнены по центру же, а не по левому
 * краю: на странице-образце так же.
 */
export function ProfileRoom() {
  return (
    <Room id="profile">
      <TiltCard>
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
          </div>

          <div className="flex flex-col items-center px-5 pt-0 pb-7 text-center sm:px-6">
            {/* Фотография с мягким свечением и медленно вращающимся кольцом. */}
            <div className="relative -mt-14">
              <div
                aria-hidden
                className="from-sky-400 to-emerald-400 animate-spin-slow absolute -inset-1.5 rounded-full bg-gradient-to-tr opacity-40 blur-md"
              />
              <Image
                src={media.avatar}
                alt={profile.name}
                width={112}
                height={112}
                unoptimized
                priority
                className="relative size-28 rounded-full border-4 border-card object-cover"
              />
            </div>

            {/*
              Имя собирается из шума и держит на себе световую волну.
              Блик считается по итоговой длине строки, поэтому расшифровка
              его не дёргает. Обёртка нужна для искр по краям.
            */}
            <div className="relative mt-5 inline-block">
              <Sparkles />
              <TextShimmer
                as="h1"
                scramble
                duration={2.6}
                className="font-heading text-5xl font-bold tracking-tight text-balance sm:text-6xl"
              >
                {profile.name}
              </TextShimmer>
            </div>

            <TextShimmer
              as="p"
              duration={3.6}
              spread={1}
              className="text-muted-foreground mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[0.95rem]"
            >
              {profile.roles.join("  ·  ")}
            </TextShimmer>

            <RichText className="mt-4 max-w-xl text-sm">{profile.bio}</RichText>

            <div className="text-muted-foreground mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5">
                <MapPinIcon className="size-4" />
                {profile.location}
              </span>
              <ViewCounter />
            </div>

            {/* Разделение перед активностью. */}
            <div className="border-border/70 mt-6 w-full border-t pt-6">
              <p className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
                Активность
              </p>
              <Activity />
            </div>

            {/* И ещё одно разделение — перед ссылками. */}
            <div className="border-border/70 mt-6 w-full border-t pt-6">
              <p className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
                Написать
              </p>
              <div className="flex justify-center">
                <SocialButtons links={links} />
              </div>
            </div>
          </div>
        </article>
      </TiltCard>
    </Room>
  )
}
