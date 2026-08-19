import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Search, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABEL: Record<AppRole, string> = {
  client: "Клиент",
  host: "Хост",
  cleaner: "Клинер",
  admin: "Админ",
};

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Панель администратора — Point-Clean" },
      {
        name: "description",
        content:
          "Админ-панель Point-Clean: база клиентов, роли пользователей, статистика заказов и выручки.",
      },
      { property: "og:title", content: "Панель администратора — Point-Clean" },
      {
        property: "og:description",
        content: "База клиентов и сводка по заказам сервиса Point-Clean.",
      },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [query, setQuery] = useState("");

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
        supabase.from("orders").select("id,client_id,status,price"),
      ]);

      return {
        isAdmin: true as const,
        profiles: (profilesRes.data ?? []) as Profile[],
        roles: rolesRes.data ?? [],
        orders: ordersRes.data ?? [],
      };
    },
  });

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

  const { profiles, roles, orders } = data;
  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of roles) {
    rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role]);
  }
  const ordersByUser = new Map<string, { count: number; sum: number }>();
  for (const o of orders) {
    const prev = ordersByUser.get(o.client_id) ?? { count: 0, sum: 0 };
    ordersByUser.set(o.client_id, { count: prev.count + 1, sum: prev.sum + Number(o.price) });
  }

  const q = query.trim().toLowerCase();
  const filtered = profiles.filter(
    (p) =>
      !q ||
      (p.name ?? "").toLowerCase().includes(q) ||
      (p.phone ?? "").toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q),
  );

  const revenue = orders.reduce((s, o) => s + Number(o.price), 0);

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8">
      <Toaster />
      <div className="mx-auto w-full max-w-5xl">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="mr-1 size-4" />
            На главную
          </Link>
        </Button>

        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          Панель администратора
        </h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Пользователей" value={String(profiles.length)} />
          <Stat label="Заказов" value={String(orders.length)} />
          <Stat label="Оборот" value={`${revenue.toLocaleString("ru-RU")} ₽`} />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">База клиентов</h2>
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
                {filtered.map((p) => {
                  const stats = ordersByUser.get(p.id) ?? { count: 0, sum: 0 };
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{p.name || "—"}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{p.phone || "—"}</td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(rolesByUser.get(p.id) ?? []).map((r) => (
                            <Badge key={r} variant="secondary">
                              {ROLE_LABEL[r]}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-4">{stats.count}</td>
                      <td className="py-3 pr-4">{stats.sum.toLocaleString("ru-RU")} ₽</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("ru-RU")}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
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
