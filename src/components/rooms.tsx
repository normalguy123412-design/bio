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
import { DiscordPresence } from "@/components/discord-presence"
import { DiscordServerWidget } from "@/components/discord-widget"
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
      className="animate-zoom-out flex h-full flex-col overflow-y-auto px-4 py-10 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
    >
      <div className="mx-auto my-auto w-full max-w-[751px]">{children}</div>
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
          className={`animate-twinkle animate-rainbow absolute ${spot.size}`}
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
        {/*
          Коробка повторяет настройки страницы-образца: ширина 751px,
          цвет #141417 при 50% прозрачности, размытие 20px, скругление 10px,
          рамка 1px цвета #78726D при 20% и тень цвета фона.
        */}
        <article className="border-border/20 bg-card/50 max-w-[751px] overflow-hidden rounded-[10px] border shadow-2xl backdrop-blur-[20px]">
          {/*
            Баннер. Высота на образце не задаётся отдельно: там она равна
            ширине коробки (751px) умноженной на 130 — то есть полоса низкая
            и широкая. Раньше здесь стояло 176/224px, и картинка обрезалась
            совсем иначе.
          */}
          <div className="relative h-[130px] w-full overflow-hidden">
            <Image
              src={media.banner}
              alt=""
              width={751}
              height={130}
              unoptimized
              priority
              className="size-full object-cover"
            />
          </div>

          <div className="flex flex-col items-center px-9 pt-0 pb-9 text-center">
            {/* Фотография. Кольцо вокруг неё вращается. */}
            <div className="relative -mt-16">
              <div
                aria-hidden
                className="animate-spin-slow absolute -inset-1.5 rounded-full opacity-70 blur-[2px]"
                style={{
                  background:
                    "conic-gradient(from 0deg, #9d4848, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #9d4848)",
                }}
              />
              <Image
                src={media.avatar}
                alt={profile.name}
                width={128}
                height={128}
                unoptimized
                priority
                className="relative size-32 rounded-full border-4 border-card object-cover"
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
                className="font-heading text-4xl font-bold text-balance sm:text-5xl"
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

            {/* Теги: на образце это «Coding on HTML/CSS» и «Coding on Python». */}
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {profile.tags.map((tag) => (
                <li
                  key={tag}
                  className="border-border/30 bg-card/60 rounded-full border px-3 py-1 text-xs"
                >
                  {tag}
                </li>
              ))}
            </ul>

            {/* Разделение перед активностью. */}
            <div className="border-border/20 mt-6 w-full border-t pt-6">
              <p className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
                Активность
              </p>
              <Activity />
            </div>

            {/* И ещё одно разделение — перед ссылками. */}
            <div className="border-border/20 mt-6 w-full border-t pt-6">
              <p className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
                Написать
              </p>
              <div className="flex justify-center">
                <SocialButtons links={links} />
              </div>
            </div>

            {/*
              Discord: карточка активности и виджет сервера. Обе части
              молча скрыты, пока для них не настроено то, что снаружи сайта:
              виджет ещё не включён на сервере, а данные об активности
              приходят из бота и облака (см. папку discord).
            */}
            <div className="mt-6 w-full space-y-4">
              <DiscordPresence />
              <DiscordServerWidget />
            </div>
          </div>
        </article>
      </TiltCard>
    </Room>
  )
}
