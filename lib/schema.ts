import { z } from "zod";
export const boxSchema = z
  .object({
    x: z.number().min(0).max(1),
    y: z.number().min(0).max(1),
    w: z.number().positive().max(1),
    h: z.number().positive().max(1),
  })
  .refine(
    (b) => b.x + b.w <= 1.001 && b.y + b.h <= 1.001,
    "Le cadre dépasse l’image",
  );
export const observationSchema = z.object({
  frameId: z.string(),
  box: boxSchema,
});
export const filamentSchema = z.object({
  brand: z.string().trim().max(120),
  product: z.string().trim().max(160),
  polymer: z.string().trim().max(80),
  color: z.string().trim().max(120),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  diameterMm: z.number().min(0.5).max(5).nullable(),
  netWeightG: z.number().min(0).max(100000).nullable(),
  remainingWeightG: z.number().min(0).max(100000).nullable(),
});
export type Filament = z.infer<typeof filamentSchema>;
export const emptyFilament = (): Filament => ({
  brand: "",
  product: "",
  polymer: "",
  color: "",
  colorHex: null,
  diameterMm: null,
  netWeightG: null,
  remainingWeightG: null,
});
export function profileKey(f: Filament) {
  return JSON.stringify(
    [f.brand, f.product, f.polymer, f.color, f.diameterMm].map((v) =>
      typeof v === "string" ? v.trim().toLowerCase() : v,
    ),
  );
}
export function canResearchFilament(f: Filament) {
  return Boolean(
    f.brand.trim() && f.product.trim() && f.polymer.trim() && f.diameterMm,
  );
}
export const printProfileSchema = z
  .object({
    match: z.enum(["exact", "uncertain", "not_found"]),
    productName: z.string().max(250),
    summary: z.string().max(2000),
    settings: z
      .array(
        z.object({
          parameter: z.string().max(100),
          value: z.string().max(500),
          conditions: z.string().max(1000),
          sourceUrl: z
            .string()
            .url()
            .regex(/^https?:\/\//),
        }),
      )
      .max(15),
    sources: z
      .array(
        z.object({
          title: z.string().max(250),
          url: z
            .string()
            .url()
            .regex(/^https?:\/\//),
        }),
      )
      .max(10),
    warnings: z.array(z.string().max(1000)).max(12),
  })
  .superRefine((p, ctx) => {
    if (p.match !== "exact" && p.settings.length)
      ctx.addIssue({
        code: "custom",
        message: "Référence incertaine : pas de réglages applicables.",
      });
    for (const s of p.settings)
      if (!p.sources.some((source) => source.url === s.sourceUrl))
        ctx.addIssue({
          code: "custom",
          message: "Source manquante pour un paramètre.",
        });
    if (p.match === "exact" && !p.sources.length)
      ctx.addIssue({ code: "custom", message: "Source fabricant requise." });
  });
export type PrintProfile = {
  id: string;
  status: "queued" | "processing" | "ready" | "error";
  message: string;
  createdAt: string;
  filament: Filament;
  result: z.infer<typeof printProfileSchema> | null;
};
export const componentSchema = z.object({
  name: z.string().trim().min(1).max(200),
  reference: z.string().max(200),
  category: z.string().min(1).max(100),
  quantity: z.number().int().min(0).max(100000),
  confidence: z.number().min(0).max(1),
  location: z.string().max(200),
  notes: z.string().max(4000),
  observations: z.array(observationSchema).max(100),
  filament: filamentSchema.nullable().optional(),
});
export const analysisSchema = z.object({
  summary: z.string(),
  warnings: z.array(z.string()),
  components: z.array(componentSchema).max(200),
});
// Structured vision output requires an explicit null for electronics; old records remain valid.
export const visionAnalysisSchema = analysisSchema.extend({
  components: z
    .array(
      componentSchema.extend({
        filament: filamentSchema
          .extend({
            colorHex: z
              .string()
              .regex(/^#[0-9a-fA-F]{6}$/)
              .nullable(),
          })
          .nullable(),
      }),
    )
    .max(200),
});
export type Component = z.infer<typeof componentSchema>;
export type Analysis = z.infer<typeof analysisSchema>;
export type Frame = {
  id: string;
  mediaId: string;
  path: string;
  timestamp: number | null;
  width: number;
  height: number;
};
export type Media = {
  id: string;
  name: string;
  path: string;
  kind: "image" | "video";
  frames: Frame[];
  duration?: number;
  sampled?: number;
};
export type Item = Component & { id: string; createdAt: string };
export const projectSchema = z.object({
  title: z.string(),
  summary: z.string(),
  warnings: z.array(z.string()),
  requirements: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().int().positive(),
        itemId: z.string().nullable(),
        reason: z.string(),
      }),
    )
    .max(100),
});
export type Plan = z.infer<typeof projectSchema>;
export function jsonSchema(schema: z.ZodType) {
  return z.toJSONSchema(schema, { unrepresentable: "any" });
}
export function validateAnalysis(value: unknown, frames: Frame[]) {
  const result = analysisSchema.parse(value);
  const ids = new Set(frames.map((f) => f.id));
  for (const c of result.components)
    for (const o of c.observations)
      if (!ids.has(o.frameId)) throw Error("Référence à une image inconnue");
  for (const c of result.components) {
    if (c.filament) c.category = "Filaments 3D";
  }
  return result;
}

export const identificationSchema = z.object({
  name: z.string().min(1).max(200),
  reference: z.string().max(200),
  category: z.string().min(1).max(100),
  confidence: z.number().min(0).max(1),
  certainty: z.enum(["confirmed", "probable", "uncertain"]),
  visibleText: z.array(z.string().max(500)).max(20),
  evidence: z.array(z.string().max(1000)).max(12),
  alternatives: z
    .array(
      z.object({ name: z.string().max(200), reason: z.string().max(1000) }),
    )
    .max(4),
  limitations: z.string().max(2000),
  nextPhoto: z.string().max(1000),
});
export type Identification = z.infer<typeof identificationSchema>;
export const recheckRequestSchema = z
  .object({
    batchId: z.string().optional(),
    itemId: z.string().optional(),
    component: componentSchema,
    hint: z.string().max(1000).default(""),
    observationIndex: z.number().int().min(0).max(99).default(0),
  })
  .refine(
    (v) => Boolean(v.batchId) !== Boolean(v.itemId),
    "Une seule source est nécessaire",
  );
export type RecheckRequest = z.infer<typeof recheckRequestSchema>;
export type Recheck = {
  id: string;
  status: "queued" | "processing" | "ready" | "error";
  message: string;
  createdAt: string;
  request: RecheckRequest;
  model: string;
  result: Identification | null;
  crops: Frame[];
};
export function applyIdentification(
  component: Component,
  result: Identification,
): Component {
  return {
    ...component,
    name: result.name,
    reference: result.reference,
    category: result.category,
    confidence: result.confidence,
    notes: [
      component.notes,
      `Revérification (${result.certainty === "confirmed" ? "confirmé visuellement" : result.certainty === "probable" ? "probable" : "incertain"}) : ${result.evidence.join(" ")} ${result.limitations}`,
      result.nextPhoto ? `Pour confirmer : ${result.nextPhoto}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000),
  };
}
