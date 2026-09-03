import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Loader2, Search, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];
type OrderStatus = Database["public"]["Enums"]["order_status"];

const ROLES: AppRole[] = ["client", "host", "cleaner", "admin"];

const ROLE_LABEL: Record<AppRole, string> = {
  client: "Клиент",
  host: "Хост",
  cleaner: "Клинер",
  admin: "Админ",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Новый",
  assigned: "Назначен",
  in_progress: "В работе",
  awaiting_approval: "Ждёт приёмки",
  disputed: "Спор",
  completed: "Завершён",
};

const STATUS_FILTERS: (OrderStatus | "all")[] = [
  "all",
  "new",
  "assigned",
  "in_progress",
  "awaiting_approval",
  "disputed",
  "completed",
];

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Панель администратора — Point-Clean" },
      {
        name: "description",
        content:
          "Админ-панель Point-Clean: управление заказами и спорами, роли пользователей, база клиентов и статистика выручки.",
      },
      { property: "og:title", content: "Панель администратора — Point-Clean" },
      {
        property: "og:description",
        content: "Управляйте заказами, спорами и ролями пользователей Point-Clean.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function money(value: number) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.round(value))} ₽`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AdminPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userData.user!.id,
        _role: "admin",
      });
      if (!isAdmin) return { isAdmin: false as const };

      const [profilesRes, rolesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
      ]);

      return {
        isAdmin: true as const,
        profiles: (profilesRes.data ?? []) as Profile[],
        roles: (rolesRes.data ?? []) as { user_id: string; role: AppRole }[],
        orders: (ordersRes.data ?? []) as Order[],
      };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-overview"] });

  const setOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const patch: Database["public"]["Tables"]["orders"]["Update"] =
        status === "completed"
          ? { status, dispute_resolved_at: new Date().toISOString() }
          : { status };
      const { error } = await supabase.from("orders").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Статус заказа обновлён");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка обновления"),
  });

  const assignCleaner = useMutation({
    mutationFn: async ({ id, cleanerId }: { id: string; cleanerId: string | null }) => {
      const { error } = await supabase
        .from("orders")
        .update(
          cleanerId
            ? { cleaner_id: cleanerId, status: "assigned" as OrderStatus }
            : { cleaner_id: null, status: "new" as OrderStatus },
        )
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Исполнитель обновлён");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка назначения"),
  });

  const toggleRole = useMutation({
    mutationFn: async ({
      userId,
      role,
      has,
    }: {
      userId: string;
      role: AppRole;
      has: boolean;
    }) => {
      if (has) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Роли обновлены");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Не удалось изменить роль"),
  });

  const rolesByUser = useMemo(() => {
    const map = new Map<string, AppRole[]>();
    for (const r of data?.isAdmin ? data.roles : []) {
      map.set(r.user_id, [...(map.get(r.user_id) ?? []), r.role]);
    }
    return map;
  }, [data]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of data?.isAdmin ? data.profiles : []) {
      map.set(p.id, p.name || p.phone || p.id.slice(0, 8));
    }
    return map;
  }, [data]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!data?.isAdmin) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert className="size-8 text-destructive" />
        <h1 className="font-display text-xl font-bold">Доступ только для администраторов</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          У вашей учётной записи нет роли «admin».
        </p>
        <Button asChild variant="outline">
          <Link to="/">На главную</Link>
        </Button>
      </main>
    );
  }

  const { profiles, orders } = data;

  const cleaners = profiles.filter((p) => (rolesByUser.get(p.id) ?? []).includes("cleaner"));

  const ordersByUser = new Map<string, { count: number; sum: number }>();
  for (const o of orders) {
    const prev = ordersByUser.get(o.client_id) ?? { count: 0, sum: 0 };
    ordersByUser.set(o.client_id, { count: prev.count + 1, sum: prev.sum + Number(o.price) });
  }

  const q = query.trim().toLowerCase();
  const filteredProfiles = profiles.filter(
    (p) =>
      !q ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q),
  );

  const filteredOrders = orders.filter((o) => statusFilter === "all" || o.status === statusFilter);

  const revenue = orders.reduce((s, o) => s + Number(o.price), 0);
  const commission = orders.reduce((s, o) => s + Number(o.commission), 0);
  const disputes = orders.filter((o) => o.status === "disputed").length;
  const active = orders.filter(
    (o) => o.status !== "completed" && o.status !== "disputed",
  ).length;

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8">
      <Toaster />
      <div className="mx-auto w-full max-w-6xl">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-1 size-4" />
            На главную
          </Link>
        </Button>

        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          Панель администратора
        </h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Пользователей" value={String(profiles.length)} />
          <Stat label="Заказов" value={String(orders.length)} />
          <Stat label="Активных" value={String(active)} />
          <Stat label="Споров" value={String(disputes)} />
          <Stat label="Оборот" value={money(revenue)} />
          <Stat label="Комиссия" value={money(commission)} />
        </div>

        <Tabs defaultValue="orders" className="mt-6">
          <TabsList>
            <TabsTrigger value="orders">Заказы</TabsTrigger>
            <TabsTrigger value="clients">Пользователи</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((s) => {
                  const activeTab = statusFilter === s;
                  const count =
                    s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      aria-pressed={activeTab}
                      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        activeTab
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s === "all" ? "Все" : STATUS_LABEL[s]}{" "}
                      <span className="opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                {filteredOrders.map((o) => (
                  <article key={o.id} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-base font-bold">
                          {o.rooms} комн. · {o.bathrooms} с/у · {money(Number(o.price))}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {o.address || "Адрес не указан"} · {formatDate(o.scheduled_for)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Клиент: {nameById.get(o.client_id) ?? "—"} · Клинер:{" "}
                          {o.cleaner_id ? nameById.get(o.cleaner_id) ?? "—" : "не назначен"}
                        </p>
                      </div>
                      <Badge variant="secondary">{STATUS_LABEL[o.status]}</Badge>
                    </div>

                    {o.status === "disputed" && (
                      <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                        <p className="flex items-center gap-2 font-medium text-destructive">
                          <AlertTriangle className="size-4" /> Спор от {formatDate(o.disputed_at)}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Клиент: {o.dispute_reason || "причина не указана"}
                        </p>
                        {o.dispute_reply && (
                          <p className="mt-1 text-muted-foreground">Клинер: {o.dispute_reply}</p>
                        )}
                      </div>
                    )}

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <Select
                        value={o.status}
                        onValueChange={(v) =>
                          setOrderStatus.mutate({ id: o.id, status: v as OrderStatus })
                        }
                      >
                        <SelectTrigger aria-label="Статус заказа">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={o.cleaner_id ?? "none"}
                        onValueChange={(v) =>
                          assignCleaner.mutate({ id: o.id, cleanerId: v === "none" ? null : v })
                        }
                      >
                        <SelectTrigger aria-label="Исполнитель">
                          <SelectValue placeholder="Исполнитель" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Без исполнителя</SelectItem>
                          {cleaners.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name || c.phone || c.id.slice(0, 8)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </article>
                ))}
                {filteredOrders.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Заказов в этом статусе нет
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-bold">База пользователей</h2>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по имени, телефону, ID"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Имя</th>
                      <th className="py-2 pr-4 font-medium">Телефон</th>
                      <th className="py-2 pr-4 font-medium">Роли</th>
                      <th className="py-2 pr-4 font-medium">Заказы</th>
                      <th className="py-2 pr-4 font-medium">Сумма</th>
                      <th className="py-2 pr-4 font-medium">Регистрация</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfiles.map((p) => {
                      const stats = ordersByUser.get(p.id) ?? { count: 0, sum: 0 };
                      const userRoles = rolesByUser.get(p.id) ?? [];
                      return (
                        <tr key={p.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-medium">{p.name || "—"}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.phone || "—"}</td>
                          <td className="py-3 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {ROLES.map((r) => {
                                const has = userRoles.includes(r);
                                return (
                                  <button
                                    key={r}
                                    type="button"
                                    disabled={toggleRole.isPending}
                                    onClick={() =>
                                      toggleRole.mutate({ userId: p.id, role: r, has })
                                    }
                                    title={has ? "Снять роль" : "Назначить роль"}
                                  >
                                    <Badge
                                      variant={has ? "default" : "outline"}
                                      className={has ? "" : "opacity-50"}
                                    >
                                      {ROLE_LABEL[r]}
                                    </Badge>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="py-3 pr-4">{stats.count}</td>
                          <td className="py-3 pr-4">{money(stats.sum)}</td>
                          <td className="py-3 pr-4 text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString("ru-RU")}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProfiles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          Ничего не найдено
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}
