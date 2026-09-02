import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, PlayCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Toaster } from "@/components/ui/sonner";
import { PhotoUploader } from "@/components/cleaner/PhotoUploader";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];
type ChecklistItem = { id: string; label: string; done: boolean };

const DEFAULT_CHECKLIST: { id: string; label: string }[] = [
  { id: "kitchen", label: "Кухня: плита, поверхности, раковина" },
  { id: "bath", label: "Санузел: сантехника, зеркала, плитка" },
  { id: "floors", label: "Полы: пылесос и влажная уборка" },
  { id: "dust", label: "Пыль: мебель, подоконники, техника" },
  { id: "trash", label: "Мусор вынесен" },
  { id: "final", label: "Финальный осмотр и проветривание" },
];

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  new: { label: "Новый", className: "bg-muted text-muted-foreground" },
  assigned: { label: "Взят в работу", className: "bg-accent text-accent-foreground" },
  in_progress: { label: "Убираю", className: "bg-accent text-accent-foreground" },
  awaiting_approval: { label: "Ждёт приёмки", className: "bg-primary text-primary-foreground" },
  disputed: { label: "Спор", className: "bg-destructive text-destructive-foreground" },
  completed: { label: "Завершён", className: "bg-secondary text-secondary-foreground" },
};

export const Route = createFileRoute("/_authenticated/cleaner/")({
  head: () => ({
    meta: [
      { title: "Кабинет клинера — Point-Clean" },
      {
        name: "description",
        content:
          "Кабинет клинера Point-Clean: лента новых заказов, кнопка «Взять в работу», фото до и после и чеклист уборки.",
      },
      { property: "og:title", content: "Кабинет клинера — Point-Clean" },
      {
        property: "og:description",
        content: "Берите заказы в работу, загружайте фото-отчёт и отмечайте выполненные задачи.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CleanerDashboard,
});

function formatPrice(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₽`;
}

function formatDate(value: string | null) {
  if (!value) return "Дата не выбрана";
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toChecklist(raw: unknown): ChecklistItem[] {
  const stored = Array.isArray(raw) ? (raw as ChecklistItem[]) : [];
  return DEFAULT_CHECKLIST.map((item) => ({
    ...item,
    done: stored.find((s) => s?.id === item.id)?.done ?? false,
  }));
}

function CleanerDashboard() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"feed" | "mine">("feed");

  const { data: userId } = useQuery({
    queryKey: ["cleaner-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["cleaner-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [feedRes, mineRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .eq("status", "new")
          .is("cleaner_id", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .eq("cleaner_id", userId!)
          .order("created_at", { ascending: false }),
      ]);
      if (feedRes.error) throw feedRes.error;
      if (mineRes.error) throw mineRes.error;
      return { feed: (feedRes.data ?? []) as Order[], mine: (mineRes.data ?? []) as Order[] };
    },
  });

  const patchOrder = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Database["public"]["Tables"]["orders"]["Update"];
      message?: string;
    }) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["cleaner-orders"] });
      if (vars.message) toast.success(vars.message);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Не удалось обновить заказ"),
  });

  const feed = data?.feed ?? [];
  const mine = data?.mine ?? [];
  const list = tab === "feed" ? feed : mine;

  return (
    <main className="min-h-screen bg-muted/30 pb-16">
      <Toaster />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground" aria-label="На главную">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-lg font-extrabold tracking-tight">Кабинет клинера</h1>
        </div>
        <div className="mx-auto flex max-w-3xl gap-2 px-4 pb-3">
          {(
            [
              { value: "feed", label: `Новые заказы ${feed.length || ""}` },
              { value: "mine", label: `Мои смены ${mine.length || ""}` },
            ] as const
          ).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              aria-pressed={tab === t.value}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                tab === t.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Загружаем заказы…
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Не удалось загрузить заказы. Обновите страницу.
          </p>
        )}

        {!isLoading && !error && list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-background p-10 text-center">
            <Sparkles className="mx-auto size-6 text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">
              {tab === "feed"
                ? "Свободных заказов пока нет. Загляните позже."
                : "Вы ещё не взяли ни одного заказа."}
            </p>
          </div>
        )}

        {list.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            userId={userId ?? ""}
            busy={patchOrder.isPending && patchOrder.variables?.id === order.id}
            onPatch={(patch, message) => patchOrder.mutate({ id: order.id, patch, message })}
          />
        ))}
      </section>
    </main>
  );
}

function OrderCard({
  order,
  userId,
  busy,
  onPatch,
}: {
  order: Order;
  userId: string;
  busy: boolean;
  onPatch: (
    patch: Database["public"]["Tables"]["orders"]["Update"],
    message?: string,
  ) => void;
}) {
  const meta = STATUS_META[order.status];
  const checklist = toChecklist(order.checklist);
  const doneCount = checklist.filter((c) => c.done).length;
  const isMine = order.cleaner_id === userId;
  const working = isMine && (order.status === "assigned" || order.status === "in_progress");

  function toggleItem(id: string, done: boolean) {
    const next = checklist.map((c) => (c.id === id ? { ...c, done } : c));
    onPatch({
      checklist: next,
      checklist_completed: next.every((c) => c.done),
      status: order.status === "assigned" ? "in_progress" : order.status,
    });
  }

  function finish() {
    if (!checklist.every((c) => c.done)) {
      toast.error("Отметьте все пункты чеклиста");
      return;
    }
    if (order.after_photos.length === 0) {
      toast.error("Загрузите фото после уборки");
      return;
    }
    onPatch({ status: "awaiting_approval" }, "Заказ отправлен на приёмку");
  }

  return (
    <article className="rounded-2xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold">
            {order.rooms} комн. · {order.bathrooms} с/у
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {order.address || "Адрес не указан"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{formatDate(order.scheduled_for)}</p>
        </div>
        <Badge className={meta.className}>{meta.label}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span className="font-display text-lg font-extrabold">{formatPrice(order.price)}</span>
        <span className="text-xs text-muted-foreground">
          Комиссия {formatPrice(order.commission)}
        </span>
      </div>

      {order.status === "new" && !isMine && (
        <Button
          className="mt-3 w-full"
          disabled={busy}
          onClick={() =>
            onPatch(
              { cleaner_id: userId, status: "assigned", checklist },
              "Заказ взят в работу",
            )
          }
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
          Взять в работу
        </Button>
      )}

      {isMine && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <PhotoUploader
            orderId={order.id}
            kind="before"
            paths={order.before_photos ?? []}
            disabled={!working}
            onUploaded={(paths) => onPatch({ before_photos: paths })}
          />
          <PhotoUploader
            orderId={order.id}
            kind="after"
            paths={order.after_photos ?? []}
            disabled={!working}
            onUploaded={(paths) => onPatch({ after_photos: paths })}
          />

          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Чеклист уборки</p>
              <span className="text-xs text-muted-foreground">
                {doneCount} из {checklist.length}
              </span>
            </div>
            <ul className="mt-2 space-y-2">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`${order.id}-${item.id}`}
                    checked={item.done}
                    disabled={!working || busy}
                    onCheckedChange={(v) => toggleItem(item.id, v === true)}
                  />
                  <label
                    htmlFor={`${order.id}-${item.id}`}
                    className="text-sm leading-tight text-muted-foreground"
                  >
                    {item.label}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {working && (
            <Button className="w-full" disabled={busy} onClick={finish}>
              <CheckCircle2 className="size-4" /> Сдать работу
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
