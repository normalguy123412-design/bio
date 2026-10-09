import { MapPinIcon } from "lucide-react"
import ContributionSkyline from "@/components/ui/contribution-skyline"
import type { ContributionDay } from "@/components/ui/contribution-skyline"
import { LinkList } from "@/components/link-list"
import { MusicPlayer } from "@/components/music-player"
import { SideNav } from "@/components/side-nav"
import { links, profile } from "@/lib/profile"
import contributions from "@/data/contributions.json"

/** Баннер и подпись за контентом — приёмы из проекта «ИБ-Гид». */
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

/** Крупная полупрозрачная подпись на фоне страницы. */
function Ghost({ children }: { children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="text-foreground/[0.055] pointer-events-none absolute inset-0 flex -translate-y-1/4 items-center justify-center overflow-hidden text-[26vw] leading-none font-bold tracking-tight select-none"
    >
      {children}
    </span>
  )
}

export default function Home() {
  return (
    <>
      <SideNav />

      {/* Подпись едет вместе с содержимым — отдельного слоя с анимацией не нужно. */}
      <div className="relative isolate">
        <Ghost>NiceGuy</Ghost>

        <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-16 px-4 py-12 sm:py-16">
          {/* ШАПКА: баннер, аватар, имя, роль, био, локация */}
          <header id="profile" className="scroll-mt-8">
            <section className="border-border bg-card relative overflow-hidden rounded-2xl border">
              <Banner />

              <div className="px-5 pb-6 sm:px-6">
                <div className="from-sky-400 to-emerald-400 -mt-10 grid size-20 place-items-center rounded-full border-4 border-card bg-gradient-to-br text-2xl font-bold text-black">
                  {profile.avatar}
                </div>

                <h1 className="font-heading mt-4 text-4xl font-bold tracking-tight text-balance sm:text-5xl">
                  {profile.name}
                </h1>

                <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {profile.roles.map((role, index) => (
                    <span key={role} className="flex items-center gap-2">
                      {index > 0 ? (
                        <span aria-hidden className="text-sky-400">
                          ·
                        </span>
                      ) : null}
                      {role}
                    </span>
                  ))}
                </p>

                <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed italic">
                  {profile.bio}
                </p>

                <p className="text-muted-foreground mt-4 flex items-center gap-1.5 text-sm">
                  <MapPinIcon className="size-4" />
                  {profile.location}
                </p>
              </div>
            </section>
          </header>

          {/* ССЫЛКИ */}
          <section id="links" className="scroll-mt-8">
            <h2 className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
              Ссылки
            </h2>
            <LinkList links={links} />
          </section>

          {/* АКТИВНОСТЬ: год коммитов с GitHub */}
          <section id="activity" className="scroll-mt-8">
            <h2 className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
              Активность
            </h2>
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
          </section>

          {/* МУЗЫКА */}
          <section id="music" className="scroll-mt-8">
            <h2 className="text-muted-foreground mb-3 text-xs tracking-[0.08em] uppercase">
              Музыка
            </h2>
            <MusicPlayer />
          </section>

          <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 border-t pt-5 text-sm">
            <span>© {new Date().getFullYear()} {profile.name}</span>
            <a
              href="https://github.com/normalguy123412-design/bio"
              target="_blank"
              rel="noreferrer noopener"
              className="hover:text-sky-400 transition-colors"
            >
              исходники страницы
            </a>
          </footer>
        </main>
      </div>
    </>
  )
}
