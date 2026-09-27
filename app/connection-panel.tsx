"use client";
import { useState, useEffect } from "react";
type Provider = "codex" | "claude" | "gemini";
type Status = {
  provider: Provider;
  connected: boolean;
  message: string;
  plan: string | null;
  models: { model: string; displayName: string; inputModalities?: string[] }[];
  settings: { provider: Provider; model: string; recheckModel: string };
  login: { pending: boolean; message: string };
};
const providers = [
  {
    id: "codex",
    name: "ChatGPT",
    cli: "Codex",
    detail: "Votre compte ChatGPT",
    docs: "https://learn.chatgpt.com/docs/pricing",
    install: "npm ci",
  },
  {
    id: "claude",
    name: "Claude",
    cli: "Claude Code",
    detail: "Votre compte Claude",
    docs: "https://code.claude.com/docs/en/quickstart",
    install: "npm install -g @anthropic-ai/claude-code",
  },
  {
    id: "gemini",
    name: "Gemini",
    cli: "Gemini CLI",
    detail: "Votre compte Google",
    docs: "https://geminicli.com/docs/get-started/authentication/",
    install: "npm install -g @google/gemini-cli",
  },
] as const;
export default function ConnectionPanel({
  onClose,
  onUpdated,
}: {
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const [model, setModel] = useState(""),
    [recheckModel, setRecheckModel] = useState("");
  const current =
    providers.find((p) => p.id === (provider || status?.provider)) ||
    providers[0];
  async function load(id: Provider | null, force = false) {
    const query = new URLSearchParams();
    if (id) query.set("provider", id);
    if (force) query.set("refresh", "1");
    const r = await fetch("/api/connection?" + query);
    const data = await r.json();
    if (!r.ok) throw Error(data.error);
    return data as Status;
  }
  useEffect(() => {
    let active = true;
    setStatus(null);
    setError("");
    setSaved(false);
    load(provider)
      .then((data) => {
        if (!active) return;
        setStatus(data);
        setModel(data.settings.model);
        setRecheckModel(data.settings.recheckModel);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [provider]);
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      setStatus(await load(current.id, true));
      onUpdated();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function action(action: string) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const r = await fetch("/api/connection/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: current.id, model, recheckModel }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setStatus(await load(current.id, action === "login"));
      onUpdated();
      if (action === "settings") setSaved(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="modal-backdrop">
      <section
        className="modal connection-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Connexion et modèles"
      >
        <div className="section-title">
          <div>
            <span className="eyebrow">À chacun son assistant</span>
            <h2>Connexion & modèles</h2>
          </div>
          <button onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <p>
          Choisissez le compte à utiliser pour vos photos, vos vidéos et vos
          projets.
        </p>
        <div className="provider-choices" aria-label="Assistant">
          {providers.map((p) => (
            <button
              key={p.id}
              className={
                current.id === p.id ? "provider-card selected" : "provider-card"
              }
              aria-pressed={current.id === p.id}
              disabled={busy}
              onClick={() => setProvider(p.id)}
            >
              <span className={"provider-icon " + p.id}>
                {p.id === "codex" ? "◎" : p.id === "claude" ? "✳" : "✦"}
              </span>
              <strong>{p.name}</strong>
              <small>{p.cli}</small>
            </button>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!status ? (
          <p role="status">Vérification de {current.name}…</p>
        ) : (
          <>
            <div className="provider-status">
              <span
                className={
                  status.connected
                    ? "connection-dot connected"
                    : "connection-dot"
                }
              />
              <div>
                <strong>
                  {status.connected
                    ? current.id === "claude"
                      ? "Compte détecté"
                      : "Compte connecté"
                    : "Connexion à terminer"}
                  {status.plan ? ` · ${status.plan}` : ""}
                </strong>
                <p>{status.message}</p>
              </div>
            </div>
            <details className="connection-guide" open={!status.connected}>
              <summary>Connecter ou reconnecter {current.name}</summary>
              {current.id === "codex" && (
                <p>
                  <button
                    className="primary"
                    disabled={busy || status.login.pending}
                    onClick={() => action("login")}
                  >
                    {status.login.pending
                      ? "Connexion en cours…"
                      : "Se connecter avec ChatGPT"}
                  </button>
                </p>
              )}
              <p>
                Dans un terminal ouvert dans le dossier SmartAtelier, lancez :
              </p>
              <div className="connection-command">
                <code>npm run connect -- {current.id}</code>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `npm run connect -- ${current.id}`,
                      );
                    } catch {
                      setError("Copiez la commande affichée ci-dessus.");
                    }
                  }}
                >
                  Copier
                </button>
              </div>
              <p>
                {current.id === "gemini"
                  ? "Choisissez « Login with Google », terminez la connexion dans votre navigateur, puis quittez Gemini avec /quit."
                  : "Terminez la connexion dans la fenêtre officielle du fournisseur."}{" "}
                Revenez ensuite actualiser ici.
              </p>
              <details>
                <summary>Installer {current.cli} si nécessaire</summary>
                <code>{current.install}</code>
              </details>
              <a href={current.docs} target="_blank" rel="noreferrer">
                Connexion et offres compatibles ↗
              </a>
            </details>
            <button disabled={busy} onClick={refresh}>
              {busy ? "Vérification…" : "Actualiser la connexion"}
            </button>
            <div className="fields connection-fields">
              {(
                [
                  ["Analyse et projets", model, setModel],
                  ["Revérification approfondie", recheckModel, setRecheckModel],
                ] as const
              ).map(([label, value, set]) => (
                <label className="field full" key={label}>
                  <span>{label}</span>
                  <select
                    disabled={busy}
                    value={value}
                    onChange={(e) => {
                      set(e.target.value);
                      setSaved(false);
                    }}
                  >
                    <option value="">Automatique · choix du fournisseur</option>
                    {value && !status.models.some((m) => m.model === value) && (
                      <option value={value} disabled>
                        {value} · indisponible
                      </option>
                    )}
                    {status.models
                      .filter((m) =>
                        (m.inputModalities || ["image"]).includes("image"),
                      )
                      .map((m) => (
                        <option key={m.model} value={m.model}>
                          {m.displayName}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </div>
            <p className="muted">
              {current.id === "claude"
                ? "Sonnet, Opus et Haiku sont des choix de famille. Claude Code décide de leur disponibilité selon votre compte."
                : "La liste des modèles vient du CLI connecté. L’offre n’impose pas de modèle figé dans SmartAtelier."}
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() => action("settings")}
            >
              Utiliser {current.name}
            </button>
            {saved && (
              <p role="status">
                {current.name} sélectionné
                {status.connected
                  ? ". Sélection enregistrée pour les prochaines analyses."
                  : ". Terminez la connexion avant la première analyse."}
              </p>
            )}
            <p className="muted">
              Aucune clé API à saisir. Chaque service garde ses propres
              conditions d’accès et quotas ; aucun basculement automatique vers
              un service payant. Les médias sélectionnés sont transmis à
              l’assistant choisi. Votre stock reste sur cet ordinateur.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
