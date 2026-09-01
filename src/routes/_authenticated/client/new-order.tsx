import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { EXTRAS, calcPrice, formatRub } from "@/lib/pricing";
import { supabase } from "@/integrations/supabase/client";

type Search = {
  rooms: number;
  bathrooms: number;
  extras: string;
  subscription: number;
};

export const Route = createFileRoute("/_authenticated/client/new-order")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    rooms: Math.min(8, Math.max(1, Number(search['rooms']) || 2)),
    bathrooms: Math.min(8, Math.max(1, Number(search['bathrooms']) || 1)),
    extras: typeof search['extras'] === "string" ? search['extras'] : "",
    subscription: Number(search['subscription']) === 1 ? 1 : 0,
  }),
  head: () => ({
    meta: [
      { title: "Оформление заказа на уборку — Point-Clean" },
      {
        name: "description",
        content:
          "Оформите заказ на уборку в Point-Clean: параметры квартиры, адрес, дата и точная цена без звонков.",
      },
      { property: "og:title", content: "Оформление заказа на уборку — Point-Clean" },
      {
        property: "og:description",
        content: "Параметры, адрес и дата уборки — заказ создаётся за минуту.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewOrderPage,
});

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      <div className="flex shrink-0 items-center gap-1 rounded-full border bg-background p-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 rounded-full"
          aria-label={`Уменьшить: ${label}`}
          disabled={value <= 1}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          <Minus className="size-4" />
        </Button>
        <span className="w-7 text-center text-sm font-semibold tabular-nums">{value}</span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 rounded-full"
          aria-label={`Увеличить: ${label}`}
          disabled={value >= 8}
          onClick={() => onChange(Math.min(8, value + 1))}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function NewOrderPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState(search.rooms);
  const [bathrooms, setBathrooms] = useState(search.bathrooms);
  const [extras, setExtras] = useState<string[]>(
    search.extras ? search.extras.split(",").filter(Boolean) : [],
  );
  const [subscription, setSubscription] = useState(search.subscription === 1);
  const [address, setAddress] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const { total, saved, commission } = useMemo(
    () => calcPrice({ rooms, bathrooms, extras, subscription }),
    [rooms, bathrooms, extras, subscription],
  );

  const toggleExtra = (id: string) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  async function createOrder() {
    if (!address.trim()) {
      toast.error("Укажите адрес уборки");
      return;
    }
    if (!scheduledFor) {
      toast.error("Выберите дату и время");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSaving(false);
      navigate({ to: "/auth" });
      return;
    }
    const { error } = await supabase.from("orders").insert({
      client_id: user.id,
      type: "b2c_regular",
      status: "new",
      price: total,
      commission,
      address: address.trim(),
      comment: comment.trim() || null,
      rooms,
      bathrooms,
      extras,
      is_subscription: subscription,
      scheduled_for: new Date(scheduledFor).toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error("Не удалось создать заказ", { description: error.message });
      return;
    }
    toast.success("Заказ создан", { description: "Ищем клинера поблизости" });
    navigate({ to: "/client/orders" });
  }

  return (
    <div className="min-h-dvh bg-background pb-28">
      <Toaster />
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button asChild size="icon" variant="ghost" className="rounded-full">
            <Link to="/client" aria-label="Назад в кабинет">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-base font-bold">Новый заказ</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        <section className="rounded-3xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground">Параметры</h2>
          <div className="mt-4 space-y-3">
            <Stepper label="Комнаты" value={rooms} onChange={setRooms} />
            <Stepper label="Санузлы" value={bathrooms} onChange={setBathrooms} />
          </div>
          <div className="mt-5 space-y-2 border-t pt-5">
            {EXTRAS.map((extra) => (
              <label
                key={extra.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted"
              >
                <Checkbox
                  checked={extras.includes(extra.id)}
                  onCheckedChange={() => toggleExtra(extra.id)}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{extra.label}</span>
                <span className="shrink-0 text-sm text-muted-foreground">+{extra.price} ₽</span>
              </label>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-5">
            {[
              { key: false, title: "Разовая", note: "один визит" },
              { key: true, title: "Подписка", note: "−15% каждый раз" },
            ].map((opt) => (
              <button
                key={String(opt.key)}
                type="button"
                onClick={() => setSubscription(opt.key)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition-all",
                  subscription === opt.key
                    ? "border-primary bg-accent shadow-soft"
                    : "hover:border-muted-foreground/30",
                )}
              >
                <span className="block text-sm font-semibold">{opt.title}</span>
                <span className="block text-xs text-muted-foreground">{opt.note}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border bg-card p-5">
          <h2 className="text-sm font-semibold text-muted-foreground">Куда и когда</h2>
          <div className="space-y-2">
            <Label htmlFor="address">Адрес</Label>
            <Input
              id="address"
              placeholder="Город, улица, дом, квартира"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Дата и время</Label>
            <Input
              id="date"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              placeholder="Код домофона, животные, пожелания"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">Итого</p>
            <p className="font-display text-2xl font-extrabold tabular-nums">{formatRub(total)}</p>
            {saved > 0 && (
              <p className="text-xs text-muted-foreground">Экономия {formatRub(saved)}</p>
            )}
          </div>
          <Button
            size="lg"
            className="rounded-full"
            onClick={createOrder}
            disabled={saving}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {saving ? "Создаём..." : "Заказать уборку"}
          </Button>
        </div>
      </div>
    </div>
  );
}
