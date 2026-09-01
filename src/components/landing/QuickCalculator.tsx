import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { EXTRAS, calcPrice } from "@/lib/pricing";

export { EXTRAS };

function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 8,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
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
          disabled={value <= min}
          onClick={() => onChange(Math.max(min, value - 1))}
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
          disabled={value >= max}
          onClick={() => onChange(Math.min(max, value + 1))}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function QuickCalculator() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [extras, setExtras] = useState<string[]>([]);
  const [subscription, setSubscription] = useState(false);
  const submitting = false;

  const { total, saved } = useMemo(
    () => calcPrice({ rooms, bathrooms, extras, subscription }),
    [rooms, bathrooms, extras, subscription],
  );

  const toggleExtra = (id: string) =>
    setExtras((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = () => {
    navigate({
      to: "/client/new-order",
      search: {
        rooms,
        bathrooms,
        extras: extras.join(","),
        subscription: subscription ? 1 : 0,
      },
    });
  };

  return (
    <div className="rounded-3xl border bg-card p-5 shadow-lift sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Расчёт за 10 секунд</h2>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
          Без звонков
        </span>
      </div>

      <div className="mt-5 space-y-3">
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

      <div className="mt-5 flex items-end justify-between border-t pt-5">
        <div>
          <Label className="text-xs text-muted-foreground">Итого</Label>
          <p className="font-display text-3xl font-extrabold tabular-nums">
            {total.toLocaleString("ru-RU")} ₽
          </p>
          {saved > 0 && (
            <p className="text-xs font-medium text-muted-foreground">
              Экономия {saved.toLocaleString("ru-RU")} ₽
            </p>
          )}
        </div>
      </div>

      <Button size="lg" className="mt-4 w-full rounded-full" onClick={submit} disabled={submitting}>
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {submitting ? "Считаем..." : "Оформить заказ"}
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Оплата после приёмки фото-отчёта
      </p>
    </div>
  );
}
