"use client";
import { FilamentColorPicker } from "./filament-color";
import {
  emptyFilament,
  canResearchFilament,
  profileKey,
  type Component,
  type Filament,
  type PrintProfile,
} from "../lib/schema";
export function FilamentFields({
  value,
  onChange,
}: {
  value: Component;
  onChange: (c: Component) => void;
}) {
  const f = value.filament;
  const set = (key: keyof Filament, v: string | number | null) =>
    onChange({ ...value, filament: { ...f!, [key]: v } });
  return (
    <>
      <label className="field full">
        <span>Type d’article</span>
        <select
          value={f ? "filament" : "component"}
          onChange={(e) =>
            onChange({
              ...value,
              category:
                e.target.value === "filament" ? "Filaments 3D" : "Autre",
              filament: e.target.value === "filament" ? emptyFilament() : null,
            })
          }
        >
          <option value="component">Composant électronique</option>
          <option value="filament">Bobine de filament 3D</option>
        </select>
      </label>
      {f && (
        <fieldset className="filament-fields full">
          <legend>La bobine</legend>
          <p>
            La couleur peut être estimée sur photo. Le polymère doit être lu sur
            l’étiquette ou renseigné par vous.
          </p>
          <div className="fields">
            <FilamentColorPicker
              value={f}
              onChange={(filament) => onChange({ ...value, filament })}
            />
            {(
              [
                ["brand", "Marque", "Ex. Bambu Lab, Prusament, eSUN"],
                ["product", "Gamme exacte", "Ex. PLA Basic, PETG HF, PLA+"],
                ["polymer", "Polymère", "Ex. PLA, PETG, ABS, TPU 95A"],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <input
                  value={f[key]}
                  placeholder={placeholder}
                  onChange={(e) => set(key, e.target.value)}
                />
              </label>
            ))}
            {(
              [
                ["diameterMm", "Diamètre · mm", "1.75"],
                ["netWeightG", "Poids net nominal · g", "1000"],
                [
                  "remainingWeightG",
                  "Filament restant · g",
                  "À peser, sans la bobine vide",
                ],
              ] as const
            ).map(([key, label, placeholder]) => (
              <label className="field" key={key}>
                <span>{label}</span>
                <input
                  type="number"
                  min={key === "diameterMm" ? "0.5" : "0"}
                  max={key === "diameterMm" ? "5" : "100000"}
                  step={key === "diameterMm" ? "0.01" : "1"}
                  value={f[key] ?? ""}
                  placeholder={placeholder}
                  onChange={(e) =>
                    set(
                      key,
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <p>
            Poids en grammes de filament, hors support. Laisser vide si inconnu.
            Une fiche par bobine permet de suivre son poids restant.
          </p>
          <p>
            Après enregistrement ou validation, la recherche démarre
            automatiquement si marque, gamme, polymère et diamètre sont
            renseignés. Le poids n’est pas nécessaire pour chercher les
            réglages.
          </p>
        </fieldset>
      )}
    </>
  );
}
export function FilamentProfile({
  value,
  profiles,
  onRetry,
}: {
  value: Component & { id?: string };
  profiles: PrintProfile[];
  onRetry: () => void;
}) {
  const f = value.filament;
  if (!f) return null;
  const profile = profiles.find((p) => p.id === profileKey(f));
  const result = profile?.result;
  return (
    <section className="filament-profile">
      <h3>Paramètres d’impression</h3>
      {!canResearchFilament(f) ? (
        <p>
          Complétez marque, gamme exacte, polymère et diamètre. Les valeurs
          inconnues peuvent rester vides ; aucun réglage ne sera deviné.
        </p>
      ) : !profile ? (
        <p>
          Enregistrez cette fiche pour lancer la recherche des recommandations
          fabricant.
        </p>
      ) : (
        <>
          <p role="status">{profile.message}</p>
          {result && (
            <>
              <p>{result.summary}</p>
              {result.match !== "exact" && (
                <strong>
                  Aucun réglage à appliquer tant que la référence n’est pas
                  confirmée.
                </strong>
              )}
              {result.settings.length > 0 && (
                <dl>
                  {result.settings.map((s, i) => (
                    <div key={i}>
                      <dt>{s.parameter}</dt>
                      <dd>
                        <b>{s.value}</b>
                        {s.conditions && <p>{s.conditions}</p>}
                        <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                          Source fabricant ↗
                        </a>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {result.warnings.map((w, i) => (
                <p key={i} className="profile-note">
                  {w}
                </p>
              ))}
              <div className="profile-sources">
                {result.sources.map((s, i) => (
                  <a key={i} href={s.url} target="_blank" rel="noreferrer">
                    {s.title} ↗
                  </a>
                ))}
              </div>
              <small>
                Recherche du{" "}
                {new Date(profile.createdAt).toLocaleDateString("fr-FR")} ·
                Recommandations générales, à adapter à votre imprimante.
              </small>
            </>
          )}
          {!["queued", "processing"].includes(profile.status) && value.id && (
            <button type="button" onClick={onRetry}>
              Relancer la recherche sur la fiche enregistrée
            </button>
          )}
        </>
      )}
    </section>
  );
}
