import { SiteShell } from "@/components/site-shell"

/**
 * Одностраничная страница био.
 *
 * Разметки здесь почти нет: всё рисует SiteShell. Он держит открытым ровно
 * один отдел и переключает их кнопками дока, поэтому страница не
 * прокручивается — отделы закрытые.
 */
export default function Home() {
  return <SiteShell />
}
