"use client";
import type { Filament } from "../lib/schema";
import {
  filamentPalette,
  filamentColor,
  swatchBackground,
} from "../lib/colors";
export function ColorSwatch({
  value,
  compact = false,
}: {
  value: Filament;
  compact?: boolean;
}) {
  return (
    <span className="color-chip" title={value.color || "Couleur inconnue"}>
      <span
        className="color-dot"
        style={{ background: swatchBackground(value) }}
        aria-hidden="true"
      />
      {!compact && <span>{value.color || "Couleur à préciser"}</span>}
    </span>
  );
}
export function FilamentColorPicker({
  value,
  onChange,
}: {
  value: Filament;
  onChange: (v: Filament) => void;
}) {
  const hex = filamentColor(value);
  return (
    <div className="filament-colors full">
      <div className="color-heading">
        <strong>Couleur du filament</strong>
        <ColorSwatch value={value} />
      </div>
      <p>Teinte proposée d’après la photo, à confirmer selon l’éclairage.</p>
      <div
        className="color-palette"
        role="group"
        aria-label="Palette du filament"
      >
        {filamentPalette.map((p) => (
          <button
            type="button"
            key={p.name}
            aria-label={"Couleur " + p.name}
            title={p.name}
            aria-pressed={
              value.color === p.name && (value.colorHex || null) === p.hex
            }
            onClick={() =>
              onChange({ ...value, color: p.name, colorHex: p.hex })
            }
          >
            <span
              style={{
                background: swatchBackground({
                  color: p.name,
                  colorHex: p.hex,
                }),
              }}
            />
            {p.name}
          </button>
        ))}
      </div>
      <div className="color-custom">
        <label className="field">
          <span>Nom ou nuance</span>
          <input
            value={value.color}
            placeholder="Ex. Bleu nuit, soie bicolore…"
            onChange={(e) =>
              onChange({ ...value, color: e.target.value, colorHex: null })
            }
          />
        </label>
        <label className="field">
          <span>Affiner la teinte</span>
          <input
            type="color"
            aria-label="Teinte personnalisée du filament"
            value={hex || "#808080"}
            onChange={(e) =>
              onChange({
                ...value,
                color:
                  value.color && !/transparent|multicolore/i.test(value.color)
                    ? value.color
                    : "Personnalisée",
                colorHex: e.target.value,
              })
            }
          />
        </label>
        <button
          type="button"
          onClick={() => onChange({ ...value, color: "", colorHex: null })}
        >
          Couleur inconnue
        </button>
      </div>
    </div>
  );
}
