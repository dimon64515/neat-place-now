export const BASE_PRICE = 2200;
export const ROOM_PRICE = 900;
export const BATHROOM_PRICE = 700;
export const SUBSCRIPTION_DISCOUNT = 0.15;
export const COMMISSION_RATE = 0.2;

export const EXTRAS = [
  { id: "fridge", label: "Внутри холодильника", price: 600 },
  { id: "oven", label: "Внутри духовки", price: 700 },
  { id: "windows", label: "Мытьё окон", price: 900 },
] as const;

export type ExtraId = (typeof EXTRAS)[number]["id"];

export function calcPrice(opts: {
  rooms: number;
  bathrooms: number;
  extras: string[];
  subscription: boolean;
}) {
  const extrasSum = EXTRAS.filter((e) => opts.extras.includes(e.id)).reduce(
    (acc, e) => acc + e.price,
    0,
  );
  const gross =
    BASE_PRICE + opts.rooms * ROOM_PRICE + opts.bathrooms * BATHROOM_PRICE + extrasSum;
  const saved = opts.subscription ? Math.round(gross * SUBSCRIPTION_DISCOUNT) : 0;
  const total = gross - saved;
  return { total, saved, commission: Math.round(total * COMMISSION_RATE) };
}

export const formatRub = (v: number) => `${v.toLocaleString("ru-RU")} ₽`;
