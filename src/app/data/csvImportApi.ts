import { supabase } from "../../lib/supabase";
import { PROJECT_UI_META, type ProjectData } from "./projectsData";

type CsvValue = string | number | boolean | null | undefined;
export type CsvTreeInputRow = Record<string, CsvValue>;

export interface CreateProjectImportInput {
  name: string;
  siteAddress: string;
  rows: CsvTreeInputRow[];
}

export interface CreateProjectImportResult {
  project: ProjectData;
  importedCount: number;
}

const INSPECTION_FREQUENCY = "Monthly";

const TEXT_TREE_FIELDS = [
  "tree_id",
  "location",
  "botanical_name",
  "common_name",
  "health",
  "structure",
  "observations",
  "retention_status",
  "nrz_encroachment",
  "srz_encroachment",
  "encroachment_class",
  "encroachment_parts",
  "current_status",
  "origin",
  "age",
  "ule",
  "retention_value",
  "tree_protection_measures",
] as const;

const NUMERIC_TREE_FIELDS = [
  "latitude",
  "longitude",
  "nrz_radius_m",
  "srz_radius_m",
  "dbh_cm",
  "dab_cm",
  "height_m",
  "spread_m",
] as const;

const ARRAY_TREE_FIELDS = ["required_measures"] as const;

type TextTreeField = typeof TEXT_TREE_FIELDS[number];
type NumericTreeField = typeof NUMERIC_TREE_FIELDS[number];
type ArrayTreeField = typeof ARRAY_TREE_FIELDS[number];
type ImportableTreeField = TextTreeField | NumericTreeField | ArrayTreeField;

const IMPORTABLE_TREE_FIELDS = new Set<string>([
  ...TEXT_TREE_FIELDS,
  ...NUMERIC_TREE_FIELDS,
  ...ARRAY_TREE_FIELDS,
]);

const NUMERIC_TREE_FIELD_SET = new Set<string>(NUMERIC_TREE_FIELDS);

const TREE_FIELD_ALIASES = Object.fromEntries(
  [...IMPORTABLE_TREE_FIELDS].map((field) => [field, field])
) as Record<string, ImportableTreeField>;

export function normalizeCsvHeader(value: string) {
  return value.trim().toLowerCase().replace(/^\uFEFF/, "").replace(/\s+/g, "_");
}

export function isImportableTreeCsvColumn(value: string) {
  return IMPORTABLE_TREE_FIELDS.has(normalizeCsvHeader(value));
}

export function isNumericTreeCsvColumn(value: string) {
  return NUMERIC_TREE_FIELD_SET.has(normalizeCsvHeader(value));
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "project";
}

async function makeUniqueSlug(projectName: string) {
  const base = slugify(projectName);
  const { data, error } = await supabase
    .from("projects")
    .select("slug")
    .ilike("slug", `${base}%`);

  if (error) throw error;

  const existing = new Set((data ?? []).map((row) => String(row.slug ?? "")));
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function splitRequiredMeasures(value: CsvValue) {
  if (value == null) return null;
  const measures = String(value)
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return measures.length > 0 ? measures : null;
}

function cleanText(value: CsvValue) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function cleanNumber(value: CsvValue) {
  if (value == null || String(value).trim() === "") return null;
  const numeric = Number(String(value).trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function toTreeInsertRow(row: CsvTreeInputRow, projectId: string) {
  const insertRow: Record<string, unknown> = { project_id: projectId };

  Object.entries(row).forEach(([rawKey, rawValue]) => {
    const normalizedKey = normalizeCsvHeader(rawKey);
    const dbField = TREE_FIELD_ALIASES[normalizedKey];
    if (!dbField) return;

    if (dbField === "required_measures") {
      insertRow.required_measures = splitRequiredMeasures(rawValue);
      return;
    }

    if (NUMERIC_TREE_FIELD_SET.has(dbField)) {
      insertRow[dbField] = cleanNumber(rawValue);
      return;
    }

    insertRow[dbField] = cleanText(rawValue);
  });

  return insertRow;
}

function validateImportRows(rows: CsvTreeInputRow[]) {
  if (rows.length === 0) throw new Error("At least one tree row is required.");

  const seenTreeIds = new Set<string>();
  rows.forEach((row) => {
    const treeId = cleanText(row.tree_id);
    if (!treeId) throw new Error("Every imported tree row requires a tree_id.");

    const normalizedTreeId = treeId.toLowerCase();
    if (seenTreeIds.has(normalizedTreeId)) throw new Error("Duplicate tree_id values found in CSV.");
    seenTreeIds.add(normalizedTreeId);

    NUMERIC_TREE_FIELDS.forEach((field) => {
      const rawValue = row[field];
      if (rawValue == null || String(rawValue).trim() === "") return;
      if (!Number.isFinite(Number(String(rawValue).trim()))) {
        throw new Error(`Invalid numeric value for ${field}.`);
      }
    });
  });
}

function mapProjectForUi(project: Record<string, unknown>): ProjectData {
  const slug = String(project.slug ?? "");
  const meta = PROJECT_UI_META[slug];

  return {
    uuid: String(project.id ?? ""),
    id: slug,
    name: String(project.name ?? ""),
    site: String(project.site_address ?? ""),
    client: String(project.client_name ?? ""),
    tabLabel: meta?.tabLabel ?? String(project.name ?? ""),
    reference: meta?.reference ?? "",
    startDate: meta?.startDate ?? "",
    endDate: meta?.endDate ?? "",
    inspector: meta?.inspector ?? "",
    inspectorInitials: meta?.inspectorInitials ?? "",
    nextAudit: meta?.nextAudit ?? "",
    status: meta?.status ?? "active",
    unresolvedObs: meta?.unresolvedObs ?? 0,
    criticalObs: meta?.criticalObs ?? 0,
    inspectionFrequency: "Monthly",
    nextInspectionDue: String(project.next_inspection_due ?? ""),
    reminderEnabled: Boolean(project.reminder_enabled),
    reminderEmail: String(project.reminder_email ?? ""),
    totalTrees: 0,
    compliantTrees: 0,
    atRiskTrees: 0,
    flaggedTrees: 0,
    overallCompliance: 0,
  };
}

export async function createProjectAndImportTrees(input: CreateProjectImportInput): Promise<CreateProjectImportResult> {
  validateImportRows(input.rows);

  const slug = await makeUniqueSlug(input.name);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      name: input.name.trim(),
      site_address: input.siteAddress.trim(),
      slug,
      inspection_frequency: INSPECTION_FREQUENCY,
      reminder_enabled: false,
    })
    .select("*")
    .single();

  if (projectError) throw projectError;

  const treeRows = input.rows.map((row) => toTreeInsertRow(row, project.id));

  const { error: treesError } = await supabase
    .from("trees")
    .insert(treeRows);

  if (treesError) {
    await supabase.from("projects").delete().eq("id", project.id);
    throw treesError;
  }

  return {
    project: mapProjectForUi(project),
    importedCount: treeRows.length,
  };
}
