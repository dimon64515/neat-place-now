import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  new: { label: "Новый", className: "bg-muted text-muted-foreground" },
  assigned: { label: "Назначен клинер", className: "bg-accent text-accent-foreground" },
  in_progress: { label: "Убирают", className: "bg-accent text-accent-foreground" },
  awaiting_approval: { label: "Ждёт приёмки", className: "bg-primary text-primary-foreground" },
  disputed: { label: "Спор", className: "bg-destructive text-destructive-foreground" },
  completed: { label: "Завершён", className: "bg-secondary text-secondary-foreground" },
};

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новые" },
  { value: "assigned", label: "Назначенные" },
  { value: "in_progress", label: "В работе" },
  { value: "awaiting_approval", label: "На приёмке" },
  { value: "disputed", label: "Споры" },
  { value: "completed", label: "Завершённые" },
];

export const Route = createFileRoute("/_authenticated/client/orders")({
  head: () => ({
    meta: [
      { title: "Мои заказы на уборку — Point-Clean" },
      {
        name: "description",
        content:
          "Кабинет клиента Point-Clean: список заказов на уборку с фильтром по статусам, приёмка работы и открытие спора по фото-отчёту.",
      },
      { property: "og:title", content: "Мои заказы на уборку — Point-Clean" },
      {
        property: "og:description",
        content: "Фильтруйте заказы по статусу, подтверждайте приёмку или открывайте спор.",
      },
    ],
  }),
  component: ClientOrdersPage,
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

function ClientOrdersPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [disputeOrder, setDisputeOrder] = useState<Order | null>(null);
  const [disputeText, setDisputeText] = useState("");

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["client-orders"],
    queryFn: async (): Promise<Order[]> => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("client_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      disputeReason,
    }: {
      id: string;
      status: OrderStatus;
      disputeReason?: string;
    }) => {
      const patch: Database["public"]["Tables"]["orders"]["Update"] =
        status === "disputed"
          ? {
              status,
              dispute_reason: disputeReason ?? null,
              disputed_at: new Date().toISOString(),
              dispute_resolved_at: null,
            }
          : status === "completed"
            ? { status, dispute_resolved_at: new Date().toISOString() }
            : { status };
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["client-orders"] });
      toast.success(vars.status === "completed" ? "Заказ принят" : "Спор открыт");
      setDisputeOrder(null);
      setDisputeText("");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Не удалось обновить заказ");
    },
  });

  const list = (orders ?? []).filter((o) => filter === "all" || o.status === filter);
  const counts = (orders ?? []).reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-muted/30 pb-16">
      <Toaster />
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground" aria-label="На главную">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-lg font-extrabold tracking-tight text-foreground">
            Мои заказы
          </h1>
        </div>
        <div className="mx-auto max-w-3xl overflow-x-auto px-4 pb-3">
          <div className="flex gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.value;
              const count = f.value === "all" ? orders?.length ?? 0 : counts[f.value] ?? 0;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  aria-pressed={active}
                  className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label} {count > 0 && <span className="opacity-70">{count}</span>}
                </button>
              );
            })}
          </div>
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
            <p className="text-sm text-muted-foreground">
              {filter === "all" ? "У вас пока нет заказов." : "В этом статусе заказов нет."}
            </p>
            <Button asChild className="mt-4">
              <Link to="/">Рассчитать уборку</Link>
            </Button>
          </div>
        )}

        {list.map((order) => {
          const meta = STATUS_META[order.status];
          const canAct = order.status === "awaiting_approval";
          const busy = updateStatus.isPending && updateStatus.variables?.id === order.id;
          return (
            <article
              key={order.id}
              className="rounded-2xl border border-border bg-background p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold text-foreground">
                    {order.rooms} комн. · {order.bathrooms} с/у
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {order.address || "Адрес не указан"}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatDate(order.scheduled_for)}
                  </p>
                </div>
                <Badge className={meta.className}>{meta.label}</Badge>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="font-display text-lg font-extrabold text-foreground">
                  {formatPrice(order.price)}
                </span>
                {order.is_subscription && (
                  <span className="text-xs text-muted-foreground">Подписка</span>
                )}
              </div>

              {canAct && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    disabled={busy}
                    onClick={() => updateStatus.mutate({ id: order.id, status: "completed" })}
                  >
                    <CheckCircle2 className="size-4" /> Подтвердить
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={busy}
                    onClick={() => {
                      setDisputeOrder(order);
                      setDisputeText(order.dispute_reason ?? "");
                    }}
                  >
                    <AlertTriangle className="size-4" /> Открыть спор
                  </Button>
                </div>
              )}

              {order.status === "disputed" && (
                <div className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
                  <p className="text-sm font-medium text-destructive">Спор открыт</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.dispute_reason || "Причина не указана"}
                  </p>
                  {order.dispute_reply ? (
                    <p className="mt-2 rounded-lg bg-background p-2 text-sm text-muted-foreground">
                      Ответ клинера: {order.dispute_reply}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Ждём ответ клинера…</p>
                  )}
                  <Button
                    className="mt-3 w-full"
                    disabled={busy}
                    onClick={() => updateStatus.mutate({ id: order.id, status: "completed" })}
                  >
                    <CheckCircle2 className="size-4" /> Принять работу и закрыть спор
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <Dialog open={disputeOrder !== null} onOpenChange={(open) => !open && setDisputeOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Открыть спор</DialogTitle>
            <DialogDescription>
              Опишите, что пошло не так. Заказ уйдёт на разбор поддержке, оплата будет удержана.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={disputeText}
            onChange={(e) => setDisputeText(e.target.value)}
            placeholder="Например: не помыты окна на кухне"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDisputeOrder(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={updateStatus.isPending || disputeText.trim().length < 5}
              onClick={() =>
                disputeOrder &&
                updateStatus.mutate({
                  id: disputeOrder.id,
                  status: "disputed",
                  comment: disputeText.trim(),
                })
              }
            >
              Открыть спор
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
