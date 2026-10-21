"use client"

import * as React from "react"
import Image from "next/image"
import { CheckIcon, CopyIcon, MapPinIcon } from "lucide-react"
import { cn } from "cn"
import ContributionSkyline, {
  type ContributionDay,
} from "@/components/ui/contribution-skyline"
import { Reveal } from "@/components/ui/reveal"
import { RichText } from "@/components/rich-text"
import { ViewCounter } from "@/components/view-counter"
import { DiscordPresence } from "@/components/discord-presence"
import { DiscordServerCard } from "@/components/discord-widget"
import { PlayerCard } from "@/components/music-widget"
import { ICONS } from "@/components/icons"
import { discord, links, media, profile } from "@/lib/profile"
import contributions from "@/data/contributions.json"

/**
 * РАЗДЕЛЫ НИЖЕ ПЕРВОГО ЭКРАНА.
 *
 * Здесь два отдела: «Кто я такой» — три стеклянные карточки (обо мне,
 * плеер, Discord) — и «Написать мне» — строки со ссылками. Первый экран
 * рисует SiteShell, у него свои concerns.
 */

/**
 * Стеклянная карточка, чьё кольцо «дышит» за курсором.
 *
 * Позиция курсора пишется прямо в CSS-переменные (--gx/--gy) минуя React:
 * если хранить её в состоянии, на каждый пиксель шевеления мыши перестроится
 * всё поддерево карточки вместе с виджетами внутри.
 */
function GlowCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = React.useRef<HTMLElement>(null)

  const onMove = (event: React.PointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty("--gx", `${event.clientX - rect.left}px`)
    el.style.setProperty("--gy", `${event.clientY - rect.top}px`)
  }

  return (
    <article
      ref={ref}
      onPointerMove={onMove}
      className={cn("glass glow-zone relative min-h-[380px] overflow-hidden", className)}
    >
      <span aria-hidden className="glow-ring" />
      <span aria-hidden className="glow-tint" />
      {children}
    </article>
  )
}

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

/** Тонкая подпись-надзаголовок поверх Карточки. */

/**
 * Разметка, которую RichText умеет превращать в курсив и эмодзи Discord,
 * одинаково приятно читается как в карточке, так и на заставке.
 */
function CardMe() {
  return (
    <GlowCard className="p-5">
      <div className="card-meta">
        <span className="flex items-center gap-2">
          <span className="dot on" />
          Москва
        </span>
        <ViewCounter />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Image
          src={media.avatar}
          alt={profile.name}
          width={96}
          height={96}
          unoptimized
          priority
          className="size-14 shrink-0 rounded-full border border-white/15 object-cover"
        />
        <div className="min-w-0">
          <h3 className="card-title">{profile.name}</h3>
          <p className="mt-1.5 truncate text-[10.5px] text-[#7d8894]">
            {profile.roles.join(" · ")}
          </p>
        </div>
      </div>

      <RichText className="mt-4 text-[11.5px] leading-relaxed text-[rgb(231_236_241/0.75)]">
        {profile.bio}
      </RichText>

      <ul className="mt-4 flex flex-wrap gap-2">
        {profile.tags.map((tag) => (
          <li
            key={tag}
            className="chip"
            style={{ background: "rgb(255 255 255 / 0.03)", borderColor: "rgb(255 255 255 / 0.09)", fontWeight: 400 }}
          >
            {tag}
          </li>
        ))}
      </ul>

      <p className="card-meta mt-auto pt-4 text-[#7d8894]">
        <span className="flex items-center gap-2">
          <MapPinIcon className="size-3.5" />
          {profile.location}
        </span>
      </p>

      <div className="mt-3 border-t border-white/[0.06] pt-4 text-[11px] text-[#7d8894]">
        <Activity />
      </div>
    </GlowCard>
  )
}

/**
 * Карточка Discord — заголовок, живые данные присутствия, приглашение на
 * сервер и кнопка копирования id. Имя взято из настроек бота и облака:
 * пока они не отвечают, вместо данных рисуется только карточка сервера.
 */
function CardDiscord() {
  const [copied, setCopied] = React.useState(false)

  return (
    <GlowCard className="p-5">
      <div className="card-meta">
        <span className="flex items-center gap-2 font-semibold text-[color:var(--foreground)]">
          Discord
        </span>
        <span className="text-[10px] text-[#7d8894]">{discord.userId.slice(0, 4)}…</span>
      </div>

      <div className="mt-5">
        <DiscordPresence />
      </div>

      <div className="mt-auto space-y-2.5">
        <DiscordServerCard />

        <button
          type="button"
          onClick={() => {
            void navigator.clipboard
              .writeText(discord.userId)
              .then(() => setCopied(true))
              .catch(() => setCopied(true))
            setTimeout(() => setCopied(false), 1600)
          }}
          aria-label="Скопировать Discord id"
          className="row-copy"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </div>
    </GlowCard>
  )
}

/* Кнопка копирования в строках связей. */
function CopyChip({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false)

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void navigator.clipboard
          .writeText(value)
          .then(() => setCopied(true))
          .catch(() => setCopied(true))
        setTimeout(() => setCopied(false), 1600)
      }}
      aria-label="Скопировать"
      className="row-copy"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  )
}

/**
 * ОТДЕЛ «Кто я такой».
 *
 * Три карточки: обо мне, плеер и Discord. Одна сетка, на узких экранах —
 * колонка. Появление — через Reveal, вторая и третья карточки чуть
 * запаздывают, чтобы полотно не прыгало единым куском.
 */
export function AboutSection() {
  return (
    <section id="about" className="sec" aria-label="Кто я такой">
      <div className="wrap">
        <Reveal>
          <h2 className="t">
            Кто <em>я</em> такой
          </h2>
          <p className="lead big">
            Фронтендер и фрилансер. Собираю интерфейсы, которые{" "}
            <em>жизнью</em> откликаются: живые, тихие и быстрые.
          </p>
        </Reveal>

        <div className="grid gap-[18px] md:grid-cols-3">
          <Reveal delay={0}>
            <CardMe />
          </Reveal>
          <Reveal delay={120}>
            <GlowCard className="p-5">
              <div className="card-meta">
                <span>плеер</span>
                <span className="text-[10px] text-[#7d8894]">по кругу</span>
              </div>
              <PlayerCard />
            </GlowCard>
          </Reveal>
          <Reveal delay={240}>
            <CardDiscord />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

/**
 * ОТДЕЛ «Написать мне».
 *
 * Строки со ссылками вместо круглых кнопок: значок в квадратике слева,
 * значение справа. Клик по строке открывает ссылку, клик по квадратике
 * копирует значение в буфер.
 */
export function ConnectSection() {
  return (
    <section id="connect" className="sec" aria-label="Написать мне">
      <div className="wrap">
        <Reveal>
          <h2 className="t">
            Написать <em>мне</em>
          </h2>
          <p className="lead">
            Быстрее всего — Telegram. Почта и GitHub живут рядом: строка копирует
            	значение, клик открывает.
          </p>
        </Reveal>

        <Reveal delay={140}>
          <div className="glass gap-2 p-2">
            {links.map((link) => {
              const Icon = ICONS[link.icon]

              return (
                <a
                  key={link.id}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer noopener" : undefined}
                  className="row-link group"
                >
                  <span className="mini-tile">
                    <Icon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="row-label">{link.label}</span>
                    <span className="row-value">{link.value}</span>
                  </span>
                  <CopyChip value={link.copy ?? link.value} />
                </a>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
