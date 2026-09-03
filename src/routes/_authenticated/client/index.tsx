import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, LogOut, Star, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/client/")({
  head: () => ({
    meta: [
      { title: "Личный кабинет клиента — Point-Clean" },
      {
        name: "description",
        content:
          "Личный кабинет Point-Clean: профиль, баланс, рейтинг и быстрый доступ к заказам на уборку.",
      },
      { property: "og:title", content: "Личный кабинет клиента — Point-Clean" },
      {
        property: "og:description",
        content: "Профиль, баланс и заказы на уборку в одном месте.",
      },
    ],
  }),
  component: ClientDashboard,
});

function ClientDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["client-dashboard"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      const [profileRes, ordersRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle(),
        supabase.from("orders").select("id,status,price").eq("client_id", user!.id),
        supabase.from("user_roles").select("role").eq("user_id", user!.id),
      ]);
      return {
        email: user?.email ?? "",
        profile: profileRes.data,
        orders: ordersRes.data ?? [],
        roles: (rolesRes.data ?? []).map((r) => r.role),
      };
    },
  });

  const orders = data?.orders ?? [];
  const active = orders.filter((o) => o.status !== "completed").length;
  const spent = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + Number(o.price), 0);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8">
      <Toaster />
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              На главную
            </Link>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 size-4" />
            Выйти
          </Button>
        </div>

        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">
          Привет, {data?.profile?.name || "клиент"}!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{data?.email}</p>

        {(data?.roles ?? []).some((r) => r === "admin" || r === "cleaner") && (
          <div className="mt-4 flex flex-wrap gap-2">
            {(data?.roles ?? []).includes("admin") && (
              <Button variant="secondary" size="sm" asChild>
                <Link to="/admin">Панель администратора</Link>
              </Button>
            )}
            {(data?.roles ?? []).includes("cleaner") && (
              <Button variant="secondary" size="sm" asChild>
                <Link to="/cleaner">Кабинет клинера</Link>
              </Button>
            )}
          </div>
        )}


        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard icon={ClipboardList} label="Активные заказы" value={String(active)} />
          <StatCard icon={Wallet} label="Потрачено" value={`${spent.toLocaleString("ru-RU")} ₽`} />
          <StatCard
            icon={Star}
            label="Рейтинг"
            value={(data?.profile?.public_rating ?? 5).toFixed(1)}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-lg font-bold">Заказы</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Всего заказов: {orders.length}. Приёмка и споры — на странице заказов.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/client/orders">Мои заказы</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link
                to="/client/new-order"
                search={{ rooms: 2, bathrooms: 1, extras: "", subscription: 0 }}
              >
                Заказать уборку
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <Icon className="size-5 text-primary" />
      <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-extrabold">{value}</p>
    </div>
  );
}
