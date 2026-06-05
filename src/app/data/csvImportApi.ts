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

const TREE_FIELD_ALIASES: Record<string, string> = {
  tree_id: "tree_id",
  botanical_name: "botanical_name",
  common_name: "common_name",
  location: "location",
  retention_status: "retention_status",
  tree_protection_measures: "tree_protection_measures",
  required_measures: "required_measures",
  health: "health",
  structure: "structure",
  srz: "srz_radius_m",
  srz_radius_m: "srz_radius_m",
  tpz: "nrz_radius_m",
  nrz_radius_m: "nrz_radius_m",
};

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
  if (value == null) return [];
  return String(value)
    .split(/[;|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanText(value: CsvValue) {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

function cleanNumber(value: CsvValue) {
  if (value == null || String(value).trim() === "") return undefined;
  const numeric = Number(String(value).replace(/m$/i, "").trim());
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toTreeInsertRow(row: CsvTreeInputRow, projectId: string) {
  const insertRow: Record<string, unknown> = { project_id: projectId };

  Object.entries(row).forEach(([rawKey, rawValue]) => {
    const normalizedKey = rawKey.trim().toLowerCase().replace(/\s+/g, "_");
    const dbField = TREE_FIELD_ALIASES[normalizedKey];
    if (!dbField) return;

    if (dbField === "required_measures") {
      const measures = splitRequiredMeasures(rawValue);
      if (measures.length > 0) insertRow.required_measures = measures;
      return;
    }

    if (dbField === "nrz_radius_m" || dbField === "srz_radius_m") {
      const numeric = cleanNumber(rawValue);
      if (numeric !== undefined) insertRow[dbField] = numeric;
      return;
    }

    const text = cleanText(rawValue);
    if (text !== undefined) insertRow[dbField] = text;
  });

  return insertRow;
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
