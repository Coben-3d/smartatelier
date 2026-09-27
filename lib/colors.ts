import type { Filament } from "./schema.ts";
export const filamentPalette = [
  { name: "Blanc", hex: "#f4f3ed" },
  { name: "Noir", hex: "#252528" },
  { name: "Gris", hex: "#92969b" },
  { name: "Rouge", hex: "#d74440" },
  { name: "Orange", hex: "#ed8734" },
  { name: "Jaune", hex: "#f2cd45" },
  { name: "Vert", hex: "#4b9964" },
  { name: "Bleu", hex: "#367cc2" },
  { name: "Violet", hex: "#865cad" },
  { name: "Rose", hex: "#e58dae" },
  { name: "Marron", hex: "#885b41" },
  { name: "Beige", hex: "#d4bf93" },
  { name: "Transparent", hex: null },
  { name: "Multicolore", hex: null },
] as const;
export function filamentColor(value: Pick<Filament, "color" | "colorHex">) {
  if (value.colorHex && /^#[0-9a-f]{6}$/i.test(value.colorHex))
    return value.colorHex;
  return (
    filamentPalette.find(
      (p) => p.name.toLowerCase() === value.color.trim().toLowerCase(),
    )?.hex || null
  );
}
export function swatchBackground(value: Pick<Filament, "color" | "colorHex">) {
  const hex = filamentColor(value);
  if (hex) return hex;
  if (/multicolore|arc.en.ciel/i.test(value.color))
    return "conic-gradient(#df565b,#e8cd61,#72ac78,#608ecd,#af69ad,#df565b)";
  return "repeating-linear-gradient(135deg,#eee 0 5px,#fff 5px 10px)";
}
