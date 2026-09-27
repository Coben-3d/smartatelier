"use client";
import SupportCard from "./support-card";
import { ColorSwatch } from "./filament-color";
import ConnectionPanel from "./connection-panel";
import RecheckPanel from "./recheck-panel";
import { FilamentFields, FilamentProfile } from "./filament-fields";
import { emptyFilament, profileKey, type PrintProfile } from "../lib/schema";
import { useEffect, useState, useRef, useId } from "react";
import {
  Cpu,
  Boxes,
  ScanLine,
  Plus,
  Search,
  FolderOpen,
  ArrowUpRight,
  Upload,
  Film,
  Image as ImageIcon,
  Check,
  Minus,
  X,
  Trash2,
  Pencil,
  MapPin,
  Mic,
  Download,
  LoaderCircle,
  ChevronRight,
  Layers,
  CheckCheck,
  AlertCircle,
  Square,
  Merge,
  RefreshCw,
} from "lucide-react";
import type {
  Analysis,
  Component,
  Item,
  Frame,
  Media,
  Plan,
} from "../lib/schema";
type Batch = {
  id: string;
  status: string;
  message: string;
  createdAt: string;
  media: Media[];
  analysis: Analysis | null;
};
type Source = Frame & { mediaName: string; kind: string; originalPath: string };
type Requirement = {
  name: string;
  quantity: number;
  itemId: string | null;
  reason: string;
  index: number;
  item: Item | null;
  available: number;
  take: number;
  missing: number;
};
type Project = {
  id: string;
  description: string;
  status: string;
  message: string;
  plan: Plan | null;
  picked: string[];
  requirements: Requirement[];
};
type State = {
  items: Item[];
  batches: Batch[];
  frames: Record<string, Source>;
  projects: Project[];
  filamentProfiles: PrintProfile[];
};
const blank = (): Component => ({
  name: "",
  reference: "",
  category: "Autre",
  quantity: 1,
  confidence: 1,
  location: "",
  notes: "",
  observations: [],
});
const url = (id: string) => `/api/media/${id}`;
async function api(path: string, method = "GET", data?: unknown) {
  const r = await fetch("/api/" + path, {
    method,
    headers:
      data instanceof FormData
        ? {}
        : data
          ? { "Content-Type": "application/json" }
          : {},
    body:
      data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
  });
  const json = await r.json();
  if (!r.ok) throw Error(json.error || "Erreur de connexion");
  return json;
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function ComponentFields({
  value,
  onChange,
}: {
  value: Component;
  onChange: (v: Component) => void;
}) {
  const set = (k: keyof Component, v: unknown) =>
    onChange({ ...value, [k]: v });
  return (
    <div className="fields">
      <FilamentFields value={value} onChange={onChange} />
      <Field label="Nom">
        <input
          required
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
        />
      </Field>
      <Field label="Référence">
        <input
          value={value.reference}
          placeholder="Si lisible ou connue"
          onChange={(e) => set("reference", e.target.value)}
        />
      </Field>
      <Field label="Catégorie">
        <input
          required
          readOnly={Boolean(value.filament)}
          value={value.filament ? "Filaments 3D" : value.category}
          onChange={(e) => set("category", e.target.value)}
        />
      </Field>
      <Field label={value.filament ? "Nombre de bobines" : "Quantité"}>
        <input
          type="number"
          min="0"
          max="100000"
          required
          value={value.quantity}
          onChange={(e) => set("quantity", Number(e.target.value))}
        />
      </Field>
      <Field label="Emplacement · facultatif">
        <input
          value={value.location}
          placeholder="Ex. Tiroir A · case 3"
          onChange={(e) => set("location", e.target.value)}
        />
      </Field>
      <Field label="Confiance · % estimé">
        <input
          type="number"
          min="0"
          max="100"
          value={Math.round(value.confidence * 100)}
          onChange={(e) => set("confidence", Number(e.target.value) / 100)}
        />
      </Field>
      <label className="field full">
        <span>Notes</span>
        <textarea
          rows={2}
          value={value.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>
    </div>
  );
}
function Photo({
  frame,
  observations,
  focus = false,
  onDraw,
  selectable = [],
}: {
  frame: Source | Frame;
  observations: Component["observations"];
  focus?: boolean;
  selectable?: {
    box: Component["observations"][number]["box"];
    label: string;
    selected: boolean;
    select: () => void;
  }[];
  onDraw?: (b: { x: number; y: number; w: number; h: number }) => void;
}) {
  const id = useId().replaceAll(":", "");
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [draft, setDraft] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const boxes = observations
    .filter((o) => o.frameId === frame.id)
    .map((o) => o.box);
  const point = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };
  return (
    <div
      className={"photo " + (onDraw ? "drawable" : "")}
      style={{ aspectRatio: `${frame.width}/${frame.height}` }}
    >
      <img
        src={url(frame.id)}
        alt="Vue originale des composants"
        draggable={false}
      />
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        onPointerDown={(e) => {
          if (!onDraw) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setStart(point(e));
        }}
        onPointerMove={(e) => {
          if (!start) return;
          const p = point(e);
          setDraft({
            x: Math.min(start.x, p.x),
            y: Math.min(start.y, p.y),
            w: Math.abs(start.x - p.x),
            h: Math.abs(start.y - p.y),
          });
        }}
        onPointerUp={(e) => {
          if (start && onDraw) {
            const p = point(e),
              b = {
                x: Math.min(start.x, p.x),
                y: Math.min(start.y, p.y),
                w: Math.abs(start.x - p.x),
                h: Math.abs(start.y - p.y),
              };
            if (b.w > 0.005 && b.h > 0.005) onDraw(b);
          }
          setStart(null);
          setDraft(null);
        }}
      >
        <defs>
          <mask id={id}>
            <rect width="1" height="1" fill="white" />
            {boxes.map((b, i) => (
              <rect key={i} {...b} width={b.w} height={b.h} fill="black" />
            ))}
          </mask>
        </defs>
        {focus && (
          <rect
            width="1"
            height="1"
            fill="rgba(6,19,14,.72)"
            mask={`url(#${id})`}
          />
        )}{" "}
        {!onDraw &&
          selectable.map((target, i) => (
            <rect
              key={"select-" + i}
              x={target.box.x}
              y={target.box.y}
              width={target.box.w}
              height={target.box.h}
              fill="transparent"
              stroke={target.selected ? "#19805c" : "#81958a"}
              strokeWidth={target.selected ? "3" : "1.5"}
              strokeDasharray={target.selected ? undefined : "5 4"}
              vectorEffect="non-scaling-stroke"
              role="button"
              tabIndex={0}
              aria-label={"Sélectionner " + target.label}
              style={{ cursor: "pointer" }}
              onClick={target.select}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  target.select();
                }
              }}
            >
              <title>{target.label}</title>
            </rect>
          ))}
        {[...boxes, ...(draft ? [draft] : [])].map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill="none"
            pointerEvents="none"
            stroke={focus ? "#6cf2a4" : "#19805c"}
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
}
export default function Home() {
  const [state, setState] = useState<State>({
    items: [],
    batches: [],
    frames: {},
    projects: [],
    filamentProfiles: [],
  });
  const [connectionOpen, setConnectionOpen] = useState(false);
  const [tab, setTab] = useState("stock");
  const [status, setStatus] = useState<{
    connected: boolean;
    label: string;
    message: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState("");
  const [edit, setEdit] = useState<(Component & { id?: string }) | null>(null);
  const [review, setReview] = useState<Batch | null>(null);
  const [viewer, setViewer] = useState<{
    items: Item[];
    project?: Project;
  } | null>(null);
  const [description, setDescription] = useState("");
  const [drag, setDrag] = useState(false);
  const [listening, setListening] = useState(false);
  const recognition = useRef<any>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  async function refresh() {
    try {
      setState(await api("state"));
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    refresh();
    api("status")
      .then(setStatus)
      .catch((e) => setError(String(e)));
    const t = setInterval(refresh, 2500);
    return () => {
      clearInterval(t);
      recognition.current?.stop();
    };
  }, []);
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | File[] | null) {
    if (!files?.length) return;
    setTab("imports");
    await act(async () => {
      const data = new FormData();
      Array.from(files).forEach((f) => data.append("files", f));
      await api("imports", "POST", data);
    });
    if (fileInput.current) fileInput.current.value = "";
  }
  function voice() {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setError(
        "La dictée du navigateur n’est pas disponible ici. Utilisez la dictée macOS dans le champ texte (touche micro / Fn), ou ouvrez l’app dans Chrome.",
      );
      return;
    }
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const r = new SR();
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e: any) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++)
        text += e.results[i][0].transcript + " ";
      setDescription((d) => d + (d ? " " : "") + text.trim());
    };
    r.onerror = (e: any) => {
      setError(
        "Dictée indisponible : " +
          e.error +
          ". Vous pouvez utiliser la dictée macOS.",
      );
      setListening(false);
    };
    r.onend = () => setListening(false);
    recognition.current = r;
    r.start();
    setListening(true);
  }
  const pending = state.batches.filter((b) => b.status === "review").length;
  const filtered = state.items.filter(
    (i) =>
      `${i.name} ${i.reference} ${i.location} ${i.notes} ${i.filament ? [i.filament.brand, i.filament.product, i.filament.polymer, i.filament.color].join(" ") : ""}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (!category || (i.filament ? "Filaments 3D" : i.category) === category) &&
      (!filter ||
        (filter === "empty"
          ? i.quantity === 0 || i.filament?.remainingWeightG === 0
          : i.confidence < 0.8)),
  );
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="/">
          <span>
            <Cpu size={23} />
          </span>
          SmartAtelier<span className="brand-dot">.</span>
        </a>
        <button
          className="connection-button"
          onClick={() => setConnectionOpen(true)}
        >
          Connexion & modèles
        </button>
        <div className="aside-label">MON ATELIER</div>
        <nav>
          {[
            {
              id: "stock",
              icon: Boxes,
              title: "Inventaire",
              count: state.items.length,
            },
            {
              id: "imports",
              icon: ScanLine,
              title: "Importer & vérifier",
              count: pending,
            },
            {
              id: "projects",
              icon: FolderOpen,
              title: "Mes projets",
              count: state.projects.length,
            },
          ].map((t) => (
            <button
              className={tab === t.id ? "active" : ""}
              key={t.id}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={19} />
              {t.title}
              <small>{t.count || ""}</small>
            </button>
          ))}
        </nav>
        <div className="aside-note">
          <Layers size={24} />
          <p>
            Du tiroir
            <br />à votre prochain projet.
          </p>
          <span>
            Photos, vidéos et stock,
            <br />
            réunis au même endroit.
          </span>
        </div>
        <div className="connection">
          <i className={status?.connected ? "online" : ""} />
          <span>
            {status?.connected
              ? `${status.label} · sélectionné`
              : status
                ? `${status.label} à connecter`
                : "Vérification de l’assistant…"}
          </span>
        </div>
        <span className="local-note">Stockage sur cet ordinateur</span>
      </aside>
      <main>
        {process.env.NEXT_PUBLIC_STOCKATELIER_PREVIEW === "1" && (
          <div className="preview-banner">
            <strong>Aperçu · SmartAtelier 0.4</strong>
            <span>
              Inventaire de test séparé · Vos modifications restent dans cet
              aperçu.
            </span>
          </div>
        )}
        <header>
          <span>VOTRE ÉTABLI NUMÉRIQUE</span>
          <a href="/api/export" className="text-button">
            <Download size={15} /> Exporter le stock
          </a>
        </header>
        {error && (
          <div className="error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Fermer le message">
              <X size={16} />
            </button>
          </div>
        )}
        {tab === "stock" && (
          <>
            <div className="page-title">
              <div>
                <div className="eyebrow">01 / INVENTAIRE</div>
                <h1>Tout sous la main.</h1>
                <p>Composants et filaments. Tout pour votre prochain projet.</p>
              </div>
              <button
                className="primary"
                onClick={() => {
                  setTab("imports");
                  fileInput.current?.click();
                }}
              >
                <Plus size={18} /> Importer des médias
              </button>
            </div>
            <div className="stock-summary">
              <span>
                <b>{state.items.length}</b> références
              </span>
              <span>
                <b>{state.items.reduce((s, i) => s + i.quantity, 0)}</b> pièces
                en stock
              </span>
              {pending > 0 && (
                <button onClick={() => setTab("imports")}>
                  {pending} import(s) à vérifier <ArrowUpRight size={16} />
                </button>
              )}
              <button
                onClick={() =>
                  setEdit({
                    ...blank(),
                    name: "Bobine de filament",
                    category: "Filaments 3D",
                    filament: emptyFilament(),
                  })
                }
              >
                <Plus size={16} /> Bobine à la main
              </button>
              <button className="manual-add" onClick={() => setEdit(blank())}>
                <Plus size={16} /> Ajouter à la main
              </button>
            </div>
            <div className="filament-photo-entry">
              <div>
                <strong>Vos bobines, en une photo</strong>
                <p>
                  Détection, comptage et cadres automatiques. Complétez ensuite
                  chaque bobine avant de l’ajouter au stock.
                </p>
              </div>
              <button
                className="primary"
                onClick={() => {
                  setTab("imports");
                  fileInput.current?.click();
                }}
              >
                <ImageIcon size={18} /> Ajouter des bobines par photo
              </button>
            </div>
            <div className="toolbar">
              <div className="search">
                <Search size={18} />
                <input
                  aria-label="Rechercher dans le stock"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Un composant, une référence, un tiroir…"
                />
              </div>
              <select
                aria-label="Catégorie"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {[
                  ...new Set([
                    "Filaments 3D",
                    ...state.items.map((i) =>
                      i.filament ? "Filaments 3D" : i.category,
                    ),
                  ]),
                ]
                  .sort()
                  .map((c) => (
                    <option key={c}>{c}</option>
                  ))}
              </select>
              <select
                aria-label="État du stock"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Tous les états</option>
                <option value="uncertain">À confirmer (&lt; 80 %)</option>
                <option value="empty">Épuisés</option>
              </select>
            </div>
            {!state.items.length ? (
              <div className="empty">
                <div className="empty-art">
                  <Cpu size={65} strokeWidth={1} />
                  <span className="mini-chip">
                    <Layers size={24} />
                  </span>
                </div>
                <div className="eyebrow">UN ÉTABLI BIEN RANGÉ COMMENCE ICI</div>
                <h2>Vos composants ont leur place.</h2>
                <p>
                  Déposez une photo ou une courte vidéo.
                  <br />
                  Votre assistant propose, vous vérifiez, l’inventaire se
                  remplit.
                </p>
                <button className="primary" onClick={() => setTab("imports")}>
                  <Upload size={17} /> Faire mon premier import
                </button>
                <button
                  className="text-button"
                  onClick={() => setEdit(blank())}
                >
                  Ou ajouter un composant à la main <ChevronRight size={14} />
                </button>
              </div>
            ) : !filtered.length ? (
              <div className="empty">
                <Search size={35} />
                <h2>Aucun résultat</h2>
                <p>Essayez un autre terme ou retirez les filtres.</p>
              </div>
            ) : (
              <div className="item-grid">
                {filtered.map((i) => {
                  const observation = i.observations.find(
                    (o) => state.frames[o.frameId],
                  );
                  return (
                    <article className="item-card" key={i.id}>
                      <button
                        className="card-picture"
                        onClick={() => setViewer({ items: [i] })}
                        aria-label={"Voir " + i.name}
                      >
                        {observation ? (
                          <img
                            className="component-thumbnail"
                            src={`/api/items/${i.id}/thumbnail?v=${encodeURIComponent(JSON.stringify(observation))}`}
                            alt={`Gros plan : ${i.name}`}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <Cpu size={55} strokeWidth={1} />
                        )}
                        <span className="category-tag">{i.category}</span>
                      </button>
                      <div className="card-content">
                        <div className="ref">
                          {i.reference || "Référence non précisée"}
                        </div>
                        <h3>{i.name}</h3>
                        {i.filament && (
                          <div className="filament-summary">
                            <ColorSwatch value={i.filament} />
                            <span>
                              {[
                                i.filament.brand,
                                i.filament.polymer,
                                i.filament.color,
                              ]
                                .filter(Boolean)
                                .join(" · ") || "Matière à renseigner"}
                            </span>
                            <b>
                              {i.filament.remainingWeightG === null
                                ? "Poids restant inconnu"
                                : `${i.filament.remainingWeightG} g restants par bobine`}
                            </b>
                            <small>
                              {state.filamentProfiles.find(
                                (p) => p.id === profileKey(i.filament!),
                              )?.message ||
                                "Compléter la fiche pour les paramètres"}
                            </small>
                          </div>
                        )}
                        <div className="location">
                          <MapPin size={13} />
                          {i.location || "Emplacement libre"}
                        </div>
                        <div className="card-bottom">
                          <div className="stepper">
                            <button
                              disabled={busy || i.quantity === 0}
                              aria-label={"Retirer une unité de " + i.name}
                              onClick={() =>
                                act(() =>
                                  api(`items/${i.id}/quantity`, "POST", {
                                    delta: -1,
                                  }),
                                )
                              }
                            >
                              <Minus size={14} />
                            </button>
                            <strong>{i.quantity}</strong>
                            <button
                              disabled={busy}
                              aria-label={"Ajouter une unité de " + i.name}
                              onClick={() =>
                                act(() =>
                                  api(`items/${i.id}/quantity`, "POST", {
                                    delta: 1,
                                  }),
                                )
                              }
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span
                            className={
                              "confidence " +
                              (i.confidence < 0.8 ? "uncertain" : "")
                            }
                          >
                            {Math.round(i.confidence * 100)} %
                          </span>
                          <button
                            className="icon-button"
                            aria-label={"Modifier " + i.name}
                            onClick={() => setEdit(i)}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
        {tab === "imports" && (
          <>
            <div className="page-title">
              <div>
                <div className="eyebrow">02 / CAPTURE & VALIDATION</div>
                <h1>Du vrac à l’inventaire.</h1>
                <p>Une photo, une vidéo. Vous gardez le dernier mot.</p>
              </div>
            </div>
            <div
              className={"dropzone " + (drag ? "dragging" : "")}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                upload(e.dataTransfer.files);
              }}
            >
              <div className="upload-icons">
                <ImageIcon />
                <Plus size={14} />
                <Film />
              </div>
              <h2>Déposez vos photos et vidéos ici</h2>
              <p>
                Composants et bobines sont reconnus ensemble. Séparez les
                bobines, éclairez le filament et rendez les étiquettes visibles.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={17} />
                ) : (
                  <Upload size={17} />
                )}{" "}
                Choisir des fichiers
              </button>
              <small>
                JPG, PNG, WebP, HEIC · MP4, MOV, WebM · 250 Mo / fichier · vidéo
                ≤ 3 min
              </small>
            </div>
            <div className="process-strip">
              <span>
                <b>1</b> Quelques vues utiles
              </span>
              <ChevronRight size={15} />
              <span>
                <b>2</b> Analyse & déduplication
              </span>
              <ChevronRight size={15} />
              <span>
                <b>3</b> Votre validation
              </span>
            </div>
            <p className="privacy">
              Originaux et stock conservés sur cet ordinateur. Les vues
              sélectionnées sont envoyées à l’assistant choisi, via votre
              compte. Aucun ajout au stock avant validation.
            </p>
            <div className="section-title">
              <h2>Vos imports</h2>
              <span>{state.batches.length} lot(s)</span>
            </div>
            {!state.batches.length ? (
              <div className="empty compact">
                <ScanLine size={28} />
                <p>
                  Vos imports et les propositions de votre assistant
                  apparaîtront ici.
                </p>
              </div>
            ) : (
              state.batches.map((b) => (
                <div className="batch" key={b.id}>
                  <div className="batch-preview">
                    {b.media[0]?.frames[0] ? (
                      <img
                        src={url(b.media[0].frames[0].id)}
                        alt="Aperçu du lot"
                      />
                    ) : (
                      <Layers />
                    )}
                  </div>
                  <div className="batch-info">
                    <h3>
                      {b.media.map((m) => m.name).join(", ") || "Nouveau lot"}
                    </h3>
                    <p>{b.message}</p>
                    <small>
                      {new Date(b.createdAt).toLocaleString("fr-FR")} ·{" "}
                      {b.media.flatMap((m) => m.frames).length} vue(s)
                      retenue(s)
                      {b.media.some((m) => m.kind === "video")
                        ? " · vidéo"
                        : ""}
                    </small>
                  </div>
                  {["processing", "queued"].includes(b.status) ? (
                    <LoaderCircle className="spin" />
                  ) : b.status === "review" ? (
                    <button
                      className="primary"
                      onClick={() => setReview(structuredClone(b))}
                    >
                      Vérifier <ArrowUpRight size={16} />
                    </button>
                  ) : b.status === "validated" ? (
                    <span className="badge">
                      <CheckCheck size={15} /> En stock
                    </span>
                  ) : (
                    <button
                      onClick={() =>
                        act(() => api(`imports/${b.id}/retry`, "POST"))
                      }
                    >
                      <RefreshCw size={16} /> Réessayer
                    </button>
                  )}
                </div>
              ))
            )}
          </>
        )}
        {tab === "projects" && (
          <>
            <div className="page-title">
              <div>
                <div className="eyebrow">03 / DE L’IDÉE AU MONTAGE</div>
                <h1>Et si on fabriquait…</h1>
                <p>Partez d’une idée. Retrouvez ce que vous avez déjà.</p>
              </div>
            </div>
            <div className="project-composer">
              <label htmlFor="project-description">
                Qu’avez-vous en tête ?
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Un capteur de température avec un petit écran, alimenté par USB…"
                rows={4}
              />
              <div>
                <button
                  className={listening ? "recording" : ""}
                  onClick={voice}
                >
                  {listening ? <Square size={16} /> : <Mic size={16} />}{" "}
                  {listening ? "Arrêter la dictée" : "Dicter mon idée"}
                </button>
                <button
                  className="primary"
                  disabled={busy || !description.trim() || listening}
                  onClick={() =>
                    act(async () => {
                      await api("projects", "POST", { description });
                      setDescription("");
                    })
                  }
                >
                  Consulter mon stock <ArrowUpRight size={17} />
                </button>
              </div>
              <small>
                La dictée dépend du navigateur et peut utiliser son service
                vocal. Vous pouvez aussi utiliser la dictée macOS.
              </small>
            </div>
            <div className="section-title">
              <h2>Mes projets</h2>
              <span>{state.projects.length} projet(s)</span>
            </div>
            {!state.projects.length ? (
              <div className="empty compact">
                <FolderOpen size={30} />
                <p>Votre prochaine réalisation commence juste au-dessus.</p>
              </div>
            ) : (
              state.projects.map((p) => (
                <article className="project-card" key={p.id}>
                  <div className="section-title">
                    <h2>{p.plan?.title || p.description}</h2>
                    {p.status === "ready" ? (
                      <span className="badge">Liste prête</span>
                    ) : p.status === "error" ? (
                      <span className="confidence uncertain">À relancer</span>
                    ) : (
                      <LoaderCircle className="spin" />
                    )}
                  </div>
                  <p>{p.plan?.summary || p.message}</p>
                  {p.plan && (
                    <>
                      <div className="requirements">
                        {p.requirements.map((r) => (
                          <div key={r.index}>
                            <span
                              className={r.missing ? "need-dot" : "have-dot"}
                            />
                            <div>
                              <strong>{r.name}</strong>
                              <small>{r.reason}</small>
                            </div>
                            <span>
                              {r.take > 0 ? `${r.take} en stock` : ""}
                              {r.missing > 0
                                ? ` · ${r.missing} manquant(s)`
                                : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                      {p.plan.warnings.length > 0 && (
                        <div className="notice">
                          {p.plan.warnings.map((w, i) => (
                            <p key={i}>{w}</p>
                          ))}
                        </div>
                      )}
                      <button
                        className="primary"
                        disabled={!p.requirements.some((r) => r.take > 0)}
                        onClick={() =>
                          setViewer({
                            items: p.requirements
                              .filter((r) => r.take > 0 && r.item)
                              .map((r) => r.item!),
                            project: p,
                          })
                        }
                      >
                        <ScanLine size={17} /> Montre-moi quoi prendre
                      </button>
                    </>
                  )}
                </article>
              ))
            )}
          </>
        )}
        <SupportCard />
        <footer>
          <span>SmartAtelier / V0.4 bêta</span>
          <span>Moins chercher. Plus fabriquer.</span>
        </footer>
      </main>
      <input
        ref={fileInput}
        type="file"
        multiple
        hidden
        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,.webm,.m4v"
        onChange={(e) => upload(e.target.files)}
      />
      {edit && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Fiche composant"
          >
            <div className="section-title">
              <h2>
                {edit.filament
                  ? "Fiche bobine"
                  : edit.id
                    ? "Modifier le composant"
                    : "Nouveau composant"}
              </h2>
              <button aria-label="Fermer" onClick={() => setEdit(null)}>
                <X size={19} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api(
                    edit.id ? "items/" + edit.id : "items",
                    edit.id ? "PUT" : "POST",
                    edit,
                  );
                  setEdit(null);
                });
              }}
            >
              <ComponentFields value={edit} onChange={setEdit} />
              <FilamentProfile
                value={edit}
                profiles={state.filamentProfiles}
                onRetry={() =>
                  act(() => api(`items/${edit.id}/filament-profile`, "POST"))
                }
              />
              {edit.id && (
                <ItemInspection
                  key={edit.id}
                  value={edit}
                  frames={state.frames}
                  onChange={setEdit}
                />
              )}

              <div className="modal-actions">
                {edit.id && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      if (
                        confirm(
                          "Supprimer ce composant du stock ? Les médias originaux seront conservés.",
                        )
                      )
                        act(async () => {
                          await api("items/" + edit.id, "DELETE");
                          setEdit(null);
                        });
                    }}
                  >
                    <Trash2 size={16} /> Supprimer
                  </button>
                )}
                <button type="button" onClick={() => setEdit(null)}>
                  Annuler
                </button>
                <button className="primary" disabled={busy}>
                  <Check size={16} /> Enregistrer
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {review && (
        <Review
          batch={review}
          frames={state.frames}
          busy={busy}
          onClose={() => setReview(null)}
          onSave={(a) =>
            act(async () => {
              await api(`imports/${review.id}/validate`, "POST", a);
              setReview(null);
              setTab("stock");
            })
          }
        />
      )}
      {viewer && (
        <Viewer
          items={viewer.items}
          frames={state.frames}
          project={state.projects.find((p) => p.id === viewer.project?.id)}
          busy={busy}
          onClose={() => setViewer(null)}
          onPick={(p, picked) =>
            act(() => api("projects/" + p.id, "PATCH", { picked }))
          }
        />
      )}
      {connectionOpen && (
        <ConnectionPanel
          onClose={() => setConnectionOpen(false)}
          onUpdated={() =>
            api("status")
              .then(setStatus)
              .catch(() => {})
          }
        />
      )}
      {busy && (
        <div className="busy-toast">
          <LoaderCircle size={16} className="spin" /> Enregistrement…
        </div>
      )}
    </div>
  );
}
function Review({
  batch,
  frames,
  busy,
  onClose,
  onSave,
}: {
  batch: Batch;
  frames: Record<string, Source>;
  busy: boolean;
  onClose: () => void;
  onSave: (a: Analysis) => void;
}) {
  const [value, setValue] = useState<Analysis>(batch.analysis!);
  const [selected, setSelected] = useState(0);
  const [frameId, setFrameId] = useState(
    batch.analysis?.components[0]?.observations[0]?.frameId ||
      batch.media[0]?.frames[0]?.id,
  );
  const [draw, setDraw] = useState(false);
  const [mergeTo, setMergeTo] = useState("");
  const c = value.components[selected];
  const f = frames[frameId];
  const set = (v: Component) =>
    setValue((a) => ({
      ...a,
      components: a.components.map((x, i) => (i === selected ? v : x)),
    }));
  const choose = (i: number) => {
    setSelected(i);
    setDraw(false);
    setMergeTo("");
    const id = value.components[i]?.observations[0]?.frameId;
    if (id) setFrameId(id);
  };
  return (
    <div className="modal-backdrop">
      <section
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-label="Validation de l’import"
      >
        <div className="section-title">
          <div>
            <div className="eyebrow">RIEN N’EST ENCORE AJOUTÉ</div>
            <h2>Vérifier avant de ranger</h2>
          </div>
          <button aria-label="Fermer" onClick={onClose}>
            <X />
          </button>
        </div>
        <p>{value.summary}</p>
        {value.components.some((x) => x.filament) && (
          <div className="filament-review-summary">
            <strong>
              {value.components
                .filter((x) => x.filament)
                .reduce((n, x) => n + x.quantity, 0)}{" "}
              bobine(s) détectée(s) · à confirmer
            </strong>
            <p>
              Choisissez une bobine dans l’image ou la liste : vérifiez sa
              couleur, puis complétez marque, polymère et poids. Une fiche par
              bobine pour suivre le poids restant.
            </p>
          </div>
        )}
        {value.warnings.length > 0 && (
          <div className="notice">
            {value.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
        <div className="review-layout">
          <div>
            <div className="frame-tabs">
              {batch.media
                .flatMap((m) => m.frames)
                .map((fr) => (
                  <button
                    className={fr.id === frameId ? "selected" : ""}
                    key={fr.id}
                    onClick={() => setFrameId(fr.id)}
                  >
                    <img src={url(fr.id)} alt="Choisir cette vue" />
                    <small>
                      {fr.timestamp === null
                        ? "Photo"
                        : `${fr.timestamp.toFixed(1)} s`}
                    </small>
                  </button>
                ))}
            </div>
            {f && (
              <Photo
                frame={f}
                observations={c?.observations || []}
                selectable={value.components.flatMap((item, index) =>
                  item.observations
                    .filter((o) => o.frameId === frameId)
                    .map((o) => ({
                      box: o.box,
                      label: `${index + 1}. ${item.name}`,
                      selected: index === selected,
                      select: () => choose(index),
                    })),
                )}
                onDraw={
                  draw && c
                    ? (b) => {
                        set({
                          ...c,
                          observations: [
                            ...c.observations,
                            { frameId, box: b },
                          ],
                        });
                        setDraw(false);
                      }
                    : undefined
                }
              />
            )}
            <div className="source-caption">
              {f?.mediaName}
              {f?.timestamp !== null && f?.timestamp !== undefined
                ? ` · ${f.timestamp.toFixed(1)} s`
                : ""}
            </div>
            {c && (
              <>
                <button
                  onClick={() => setDraw(!draw)}
                  className={draw ? "selected" : ""}
                >
                  <ScanLine size={16} />
                  {draw
                    ? "Tracez un cadre sur l’image"
                    : "Ajouter / corriger un cadre"}
                </button>
                <p className="hint">
                  Pour remplacer un cadre, supprimez l’ancien puis tracez le
                  nouveau. Plusieurs cadres sont possibles pour un lot.
                </p>
                <div className="box-list">
                  {c.observations.map((o, i) => (
                    <div key={i}>
                      <span>
                        Cadre {i + 1} ·{" "}
                        {frames[o.frameId]?.timestamp == null
                          ? "photo"
                          : frames[o.frameId]?.timestamp?.toFixed(1) + " s"}
                      </span>
                      <button
                        aria-label={"Supprimer le cadre " + (i + 1)}
                        onClick={() =>
                          set({
                            ...c,
                            observations: c.observations.filter(
                              (_, j) => i !== j,
                            ),
                          })
                        }
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="review-edit">
            <div className="component-tabs">
              {value.components.map((x, i) => (
                <button
                  key={i}
                  className={selected === i ? "selected" : ""}
                  onClick={() => choose(i)}
                >
                  {x.filament && <ColorSwatch value={x.filament} compact />}{" "}
                  {i + 1}. {x.name} <small>×{x.quantity}</small>
                </button>
              ))}
              <button
                onClick={() => {
                  const n = value.components.length;
                  setValue((a) => ({
                    ...a,
                    components: [...a.components, blank()],
                  }));
                  setSelected(n);
                }}
              >
                <Plus size={15} /> Composant oublié
              </button>
              <button
                onClick={() => {
                  const n = value.components.length;
                  setValue((a) => ({
                    ...a,
                    components: [
                      ...a.components,
                      {
                        ...blank(),
                        name: "Bobine de filament",
                        category: "Filaments 3D",
                        filament: emptyFilament(),
                      },
                    ],
                  }));
                  setSelected(n);
                  setDraw(true);
                }}
              >
                <Plus size={15} /> Bobine oubliée
              </button>
            </div>
            {c ? (
              <>
                <ComponentFields value={c} onChange={set} />
                {!c.filament && (
                  <RecheckPanel
                    key={selected}
                    component={c}
                    batchId={batch.id}
                    onApply={set}
                  />
                )}

                <div className="review-tools">
                  <button
                    className="danger"
                    onClick={() => {
                      setValue((a) => ({
                        ...a,
                        components: a.components.filter(
                          (_, i) => i !== selected,
                        ),
                      }));
                      setSelected(0);
                    }}
                  >
                    <Trash2 size={15} /> Exclure
                  </button>
                  {value.components.length > 1 && (
                    <>
                      <select
                        aria-label="Fusionner un doublon avec"
                        value={mergeTo}
                        onChange={(e) => setMergeTo(e.target.value)}
                      >
                        <option value="">Doublon de…</option>
                        {value.components.map((x, i) =>
                          i !== selected ? (
                            <option key={i} value={i}>
                              {x.name}
                            </option>
                          ) : null,
                        )}
                      </select>
                      <button
                        disabled={!mergeTo}
                        title="Conserve le maximum des quantités ; vérifiez le total ensuite"
                        onClick={() => {
                          const n = Number(mergeTo),
                            target = value.components[n];
                          const merged = {
                            ...target,
                            quantity: Math.max(target.quantity, c.quantity),
                            observations: [
                              ...target.observations,
                              ...c.observations,
                            ],
                            notes: [
                              target.notes,
                              c.notes,
                              "Fusion manuelle : quantité à vérifier.",
                            ]
                              .filter(Boolean)
                              .join("\n"),
                          };
                          setValue((a) => ({
                            ...a,
                            components: a.components
                              .map((x, i) => (i === n ? merged : x))
                              .filter((_, i) => i !== selected),
                          }));
                          setSelected(n > selected ? n - 1 : n);
                          setMergeTo("");
                        }}
                      >
                        <Merge size={15} /> Fusionner
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <p>
                Aucun composant retenu. Ajoutez les objets oubliés ou terminez
                ce lot vide.
              </p>
            )}
          </div>
        </div>
        <div className="notice">
          Vérifiez les quantités : les mêmes objets vus dans plusieurs images ne
          doivent être comptés qu’une fois. Un nouvel import ne se fusionne pas
          automatiquement avec un stock existant.
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Revenir plus tard</button>
          <button
            className="primary"
            disabled={
              busy ||
              value.components.some(
                (c) =>
                  !c.name.trim() ||
                  !c.category.trim() ||
                  !Number.isInteger(c.quantity) ||
                  c.quantity < 0 ||
                  c.quantity > 100000 ||
                  c.confidence < 0 ||
                  c.confidence > 1,
              )
            }
            onClick={() => onSave(value)}
          >
            <CheckCheck size={17} /> Valider {value.components.length}{" "}
            référence(s)
          </button>
        </div>
      </section>
    </div>
  );
}
function Viewer({
  items,
  frames,
  project,
  busy,
  onClose,
  onPick,
}: {
  items: Item[];
  frames: Record<string, Source>;
  project?: Project;
  busy: boolean;
  onClose: () => void;
  onPick: (p: Project, picked: string[]) => void;
}) {
  const [active, setActive] = useState(items[0]?.id);
  const selected = items.find((i) => i.id === active) || items[0];
  const [chosen, setChosen] = useState("");
  const sources = [
    ...new Set(selected?.observations.map((o) => o.frameId) || []),
  ];
  const frame = frames[sources.includes(chosen) ? chosen : sources[0]];
  const needs = project?.requirements.filter((r) => r.take > 0) || [];
  return (
    <div className="modal-backdrop">
      <section
        className="modal wide"
        role="dialog"
        aria-modal="true"
        aria-label="Retrouver les composants"
      >
        <div className="section-title">
          <div>
            <div className="eyebrow">DU STOCK À L’ÉTABLI</div>
            <h2>{project ? "Voici quoi prendre." : selected?.name}</h2>
          </div>
          <button aria-label="Fermer" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="review-layout">
          <div>
            {frame ? (
              <>
                <Photo
                  frame={frame}
                  observations={selected.observations}
                  focus
                />
                <div className="source-caption">
                  {frame.mediaName}{" "}
                  {frame.timestamp !== null
                    ? `· ${frame.timestamp.toFixed(1)} s`
                    : ""}
                  <a
                    href={
                      url(frame.id) +
                      "/original" +
                      (frame.timestamp !== null ? "#t=" + frame.timestamp : "")
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ouvrir l’original <ArrowUpRight size={13} />
                  </a>
                </div>
                <div className="frame-tabs">
                  {sources.map((id) => (
                    <button
                      key={id}
                      onClick={() => setChosen(id)}
                      className={id === frame.id ? "selected" : ""}
                    >
                      <img src={url(id)} alt="Autre vue" />
                      <small>
                        {frames[id]?.timestamp == null
                          ? "Photo"
                          : frames[id]?.timestamp?.toFixed(1) + " s"}
                      </small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty">
                <Cpu size={48} />
                <h3>Aucune photo associée</h3>
                <p>
                  Retrouvez ce composant grâce à son emplacement et ses notes.
                </p>
              </div>
            )}
          </div>
          <div>
            <h3>{selected?.name}</h3>
            <p className="location">
              <MapPin size={15} />
              {selected?.location || "Emplacement non renseigné"}
            </p>
            <p>{selected?.notes}</p>
            {project ? (
              <>
                <h3>À récupérer</h3>
                {needs.map((r) => (
                  <div
                    className={
                      "pick-row " + (r.itemId === active ? "selected" : "")
                    }
                    key={r.index}
                  >
                    <input
                      type="checkbox"
                      aria-label={"Récupéré : " + r.name}
                      disabled={busy}
                      checked={project.picked.includes(String(r.index))}
                      onChange={(e) =>
                        onPick(
                          project,
                          e.target.checked
                            ? [...project.picked, String(r.index)]
                            : project.picked.filter(
                                (k) => k !== String(r.index),
                              ),
                        )
                      }
                    />
                    <button
                      onClick={() => {
                        setActive(r.itemId!);
                        setChosen("");
                      }}
                    >
                      <strong>{r.item?.name}</strong>
                      <span>
                        × {r.take} · {r.item?.location || "Emplacement libre"}
                      </span>
                    </button>
                  </div>
                ))}
                <p className="hint">
                  La liste cochée est sauvegardée. Cocher ne retire pas de
                  pièces du stock ; utilisez − lorsque vous les consommez.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function ItemInspection({
  value,
  frames,
  onChange,
}: {
  value: Component & { id?: string };
  frames: Record<string, Source>;
  onChange: (v: Component & { id?: string }) => void;
}) {
  const [selected, setSelected] = useState(0),
    [draw, setDraw] = useState(false);
  const observation =
    value.observations[Math.min(selected, value.observations.length - 1)];
  const frame = observation ? frames[observation.frameId] : undefined;
  return (
    <div className="item-inspection">
      {frame && (
        <>
          <details>
            <summary>Voir ou ajuster le cadre à analyser</summary>
            {value.observations.length > 1 && (
              <select
                aria-label="Cadre à ajuster"
                value={Math.min(selected, value.observations.length - 1)}
                onChange={(e) => setSelected(Number(e.target.value))}
              >
                {value.observations.map((_, i) => (
                  <option key={i} value={i}>
                    Cadre {i + 1}
                  </option>
                ))}
              </select>
            )}
            <Photo
              frame={frame}
              observations={[observation]}
              onDraw={
                draw
                  ? (box) => {
                      const index = Math.min(
                        selected,
                        value.observations.length - 1,
                      );
                      onChange({
                        ...value,
                        observations: value.observations.map((o, i) =>
                          i === index ? { ...o, box } : o,
                        ),
                      });
                      setDraw(false);
                    }
                  : undefined
              }
            />
            <button type="button" onClick={() => setDraw(!draw)}>
              {draw
                ? "Tracez le nouveau cadre sur le module"
                : "Redessiner ce cadre"}
            </button>
          </details>
        </>
      )}
      {!value.filament && (
        <RecheckPanel
          component={value}
          itemId={value.id}
          onApply={(next) => onChange({ ...value, ...next })}
        />
      )}
    </div>
  );
}
