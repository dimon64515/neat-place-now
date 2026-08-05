import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Camera,
  Clock3,
  Wallet,
  Home,
  BedDouble,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QuickCalculator } from "@/components/landing/QuickCalculator";
import heroImage from "@/assets/hero-clean.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cleanly — уборка квартир по фиксированной цене" },
      {
        name: "description",
        content:
          "Маркетплейс клининга: прозрачная цена за 10 секунд, фото-отчёт до и после, оплата после приёмки. Для жильцов, хостов посуточной аренды и клинеров.",
      },
      { property: "og:title", content: "Cleanly — уборка квартир по фиксированной цене" },
      {
        property: "og:description",
        content: "Маркетплейс клининга: прозрачная цена за 10 секунд, фото-отчёт до и после, оплата после приёмки. Для жильцов, хостов посуточной аренды и клинеров.",
      },
    ],
  }),
  component: Index,
});

const STEPS = [
  {
    icon: Sparkles,
    title: "Считаете цену",
    text: "Комнаты, санузлы и допуслуги — итог виден сразу, без менеджеров.",
  },
  {
    icon: Clock3,
    title: "Клинер берёт заказ",
    text: "Свободный исполнитель забирает заявку с доски за считанные минуты.",
  },
  {
    icon: Camera,
    title: "Принимаете по фото",
    text: "Фото «до» и «после» в приложении. Не понравилось — открываете спор.",
  },
];

const AUDIENCES = [
  {
    icon: Home,
    tag: "Жильцам",
    title: "Уборка без торга",
    points: ["Фиксированный прайс", "Подписка со скидкой 15%", "Оплата после приёмки"],
  },
  {
    icon: BedDouble,
    tag: "Посуточной аренде",
    title: "Окно 12:00–14:00",
    points: ["Срочный тариф между гостями", "Фиксация ущерба на фото", "Учёт расходников"],
  },
  {
    icon: Wallet,
    tag: "Клинерам",
    title: "Заказы и вывод денег",
    points: ["Доска свободных заказов", "Рейтинг и карма", "Вывод по запросу"],
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-secondary">
              <Sparkles className="size-4 text-primary" />
            </span>
            <span className="truncate font-display text-lg font-extrabold">Cleanly</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <Link to="/client/orders">Мои заказы</Link>
            </Button>
            <Button asChild size="sm" variant="secondary" className="rounded-full">
              <a href="#calc">Рассчитать</a>
            </Button>
          </div>

        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-14 sm:pt-16">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1 text-xs font-semibold text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Деньги замораживаются до приёмки
              </span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold sm:text-6xl">
                Чистая квартира
                <br />
                за фиксированную цену
              </h1>
              <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">
                Маркетплейс уборки для жильцов, владельцев посуточной аренды и клинеров. Цена
                считается онлайн, работа принимается по фото-отчёту.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full">
                  <a href="#calc">
                    Рассчитать уборку
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                <span className="text-sm text-muted-foreground">от 2 200 ₽ · сегодня</span>
              </div>

              <div className="mt-10 overflow-hidden rounded-3xl border">
                <img
                  src={heroImage}
                  alt="Светлая гостиная после профессиональной уборки"
                  width={1408}
                  height={1104}
                  className="h-52 w-full object-cover sm:h-72"
                />
              </div>
            </div>

            <div id="calc" className="scroll-mt-24">
              <QuickCalculator />
            </div>
          </div>
        </section>

        <section className="border-y bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Как это работает</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <div key={step.title} className="rounded-3xl border bg-card p-5 shadow-soft">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent">
                      <step.icon className="size-4 text-accent-foreground" />
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground">
                      Шаг {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Три роли — одна платформа</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map((a) => (
              <div key={a.tag} className="rounded-3xl border p-5 transition-shadow hover:shadow-lift">
                <div className="flex items-center gap-2">
                  <a.icon className="size-4 shrink-0 text-primary" />
                  <span className="truncate text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {a.tag}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{a.title}</h3>
                <ul className="mt-3 space-y-2">
                  {a.points.map((p) => (
                    <li key={p} className="flex gap-2 text-sm text-muted-foreground">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16">
          <div className="rounded-3xl bg-secondary px-6 py-12 text-center text-secondary-foreground">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Готовы к чистоте?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm opacity-80">
              Посчитайте стоимость и оформите заказ — оплата спишется только после того, как вы
              примете работу.
            </p>
            <Button asChild size="lg" className="mt-6 rounded-full">
              <a href="#calc">Посчитать стоимость</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Cleanly
        </div>
      </footer>
    </div>
  );
}
