# bio

Персональная страница: имя, роль, ссылки, календарь коммитов и плеер.

**Адрес:** https://normalguy123412-design.github.io/bio/

## Что внутри

| Файл | Зачем |
| --- | --- |
| `src/lib/profile.ts` | Все тексты и ссылки страницы. Единственное место, где их нужно менять |
| `src/components/icons.tsx` | Иконки и знак GitHub, которого нет в lucide |
| `src/components/ui/mac-os-dock.tsx` | Док у правого края экрана |
| `src/components/ui/contribution-skyline.tsx` | Календарь коммитов: плоская карта и 3D-скайлайн |
| `src/components/music-player.tsx` | Плеер с визуализацией звука |
| `src/components/link-list.tsx` | Строки ссылок с копированием |
| `src/components/side-nav.tsx` | Разделы страницы для дока и активный пункт |
| `src/data/contributions.json` | Коммиты за год, выгруженные с GitHub |
| `public/audio/track.mp3` | Музыка |
| `scripts/sync-contributions.mjs` | Обновляет `contributions.json` |

## Запуск

```bash
npm install
npm run dev
```

Страница откроется на http://localhost:3000/ .

Сборка и проверка:

```bash
npm run lint
npm run build
```

## Обновить календарь коммитов

Данные лежат в репозитории и не обновляются сами:

```bash
npm run sync:contributions
git commit -am "Календарь коммитов на свежую дату"
git push
```

Скрипт читает стандартный календарь активности GitHub и раскладывает дни в
`src/data/contributions.json`.

## Поменять музыку

Положите файл в `public/audio/` и поправьте `track.src` в `src/lib/profile.ts`.
Название трека берётся оттуда же — в исходном файле метаданных не было.

Формат: MP3 или OGG. **FLAC не подойдёт** — его умеют играть Safari и Firefox,
но не Chrome, и страница в Chrome будет молчать.

## Заменить ссылки и тексты

Всё в `src/lib/profile.ts`: имя, роли, описание, город и массив `links`.
Добавить свою иконку — дописать имя в `IconName` и компонент в `ICONS`
в `src/components/icons.tsx`.
