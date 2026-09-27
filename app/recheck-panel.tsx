"use client";
import { useEffect, useState } from "react";
import { ScanLine, LoaderCircle, Check, X } from "lucide-react";
import {
  applyIdentification,
  componentSchema,
  type Component,
  type Recheck,
} from "../lib/schema";
export default function RecheckPanel({
  component,
  batchId,
  itemId,
  onApply,
}: {
  component: Component;
  batchId?: string;
  itemId?: string;
  onApply: (value: Component) => void;
}) {
  const [hint, setHint] = useState(""),
    [observationIndex, setObservationIndex] = useState(0);
  const [job, setJob] = useState<Recheck | null>(null),
    [error, setError] = useState(""),
    [starting, setStarting] = useState(false),
    [applied, setApplied] = useState(false);
  const pending =
    starting || job?.status === "queued" || job?.status === "processing";
  const stale =
    job &&
    JSON.stringify(job.request.component) !==
      JSON.stringify(componentSchema.safeParse(component).data);
  useEffect(() => {
    if (!job || !["queued", "processing"].includes(job.status)) return;
    let stopped = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/rechecks/" + job.id);
        const data = await res.json();
        if (!res.ok) throw Error(data.error);
        if (!stopped) setJob(data);
      } catch (e) {
        if (!stopped) setError(String(e));
      }
    }, 1500);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [job?.id, job?.status]);
  async function start() {
    setError("");
    setStarting(true);
    setApplied(false);
    try {
      const response = await fetch("/api/rechecks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          itemId,
          component,
          hint,
          observationIndex: Math.min(
            observationIndex,
            Math.max(0, component.observations.length - 1),
          ),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setJob(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStarting(false);
    }
  }
  return (
    <div className="recheck-panel">
      <div className="recheck-heading">
        <ScanLine size={19} />
        <div>
          <strong>Revérifier ce module</strong>
          <p>
            Gros plan de l’original · analyse approfondie · proposition à
            valider
          </p>
        </div>
      </div>
      {component.observations.length > 1 && (
        <label className="field">
          <span>Cadre principal à examiner</span>
          <select
            value={Math.min(
              observationIndex,
              component.observations.length - 1,
            )}
            disabled={!!pending}
            onChange={(e) => setObservationIndex(Number(e.target.value))}
          >
            {component.observations.map((_, i) => (
              <option key={i} value={i}>
                Cadre {i + 1}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>Un indice ? Facultatif</span>
        <input
          value={hint}
          maxLength={1000}
          disabled={!!pending}
          onChange={(e) => setHint(e.target.value)}
          placeholder="Ex. marque M5Stack, doute entre deux versions…"
        />
      </label>
      <button
        type="button"
        disabled={!!pending || !component.observations.length}
        onClick={start}
      >
        {pending ? (
          <LoaderCircle size={16} className="spin" />
        ) : (
          <ScanLine size={16} />
        )}{" "}
        {pending ? "Examen en cours…" : "Lancer la revérification"}
      </button>
      {!component.observations.length && (
        <p className="hint">
          Ajoutez d’abord un cadre autour du module sur une image.
        </p>
      )}
      {job && (
        <p className="hint">
          {job.model} · effort élevé · {job.message}
        </p>
      )}
      {(error || job?.status === "error") && (
        <p role="alert" className="recheck-error">
          {error || job?.message}
        </p>
      )}
      {job?.crops.length ? (
        <div className="recheck-crops">
          {job.crops.map((f, i) => (
            <a
              href={`/api/rechecks/${job.id}/crop/${i}`}
              key={f.id}
              target="_blank"
              rel="noreferrer"
            >
              <img
                src={`/api/rechecks/${job.id}/crop/${i}`}
                alt={`Gros plan analysé ${i + 1}`}
              />
              <span>
                {f.width} × {f.height} px
              </span>
            </a>
          ))}
        </div>
      ) : null}
      {job?.result && (
        <div className="recheck-result">
          <div className="section-title">
            <h3>{job.result.name}</h3>
            <span className="badge">
              {job.result.certainty === "confirmed"
                ? "Confirmé visuellement"
                : job.result.certainty === "probable"
                  ? "Probable"
                  : "À confirmer"}
            </span>
          </div>
          <p>
            <b>Référence :</b> {job.result.reference || "Non confirmée"} ·{" "}
            {Math.round(job.result.confidence * 100)} % de confiance estimée
          </p>
          <p>
            <b>Marquages lus :</b>{" "}
            {job.result.visibleText.join(" · ") ||
              "Aucun marquage suffisamment lisible"}
          </p>
          <ul>
            {job.result.evidence.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
          {job.result.alternatives.length > 0 && (
            <details>
              <summary>Autres modèles possibles</summary>
              {job.result.alternatives.map((a, i) => (
                <p key={i}>
                  <b>{a.name} :</b> {a.reason}
                </p>
              ))}
            </details>
          )}
          {job.result.limitations && (
            <p className="notice">{job.result.limitations}</p>
          )}
          {job.result.nextPhoto && (
            <p>
              <b>Pour trancher :</b> {job.result.nextPhoto}
            </p>
          )}
          {applied ? (
            <p className="badge">
              <Check size={14} /> Proposition reportée dans le formulaire.
              Enregistrez pour la conserver.
            </p>
          ) : stale ? (
            <p className="notice">
              La fiche ou ses cadres ont changé depuis le lancement. Relancez la
              revérification avant d’appliquer une proposition.
            </p>
          ) : (
            <div className="recheck-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  onApply(applyIdentification(component, job.result!));
                  setApplied(true);
                }}
              >
                <Check size={16} /> Utiliser cette proposition
              </button>
              <button type="button" onClick={() => setJob(null)}>
                <X size={15} /> Garder ma fiche
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
