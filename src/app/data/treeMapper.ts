/**
 * Canonical mapping of the Supabase `trees` table row to a UI-friendly object.
 * Every page that queries the trees table imports this type and mapper so
 * field names and business logic stay consistent across the whole app.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * BUSINESS INTENT NOTE
 * ─────────────────────────────────────────────────────────────────────────────
 * The `trees` table holds BASELINE INVENTORY DATA imported before site work
 * begins.  It is NOT a live inspection/compliance record.
 *
 * Compliance tracking (tree health observations, TPZ breach events, damage
 * records) will be stored in a separate `observations` table that does not
 * yet exist.  Until that table is built out:
 *
 *   • uiStatus is the ONLY status field — it is derived for rendering only.
 *   • Do NOT interpret uiStatus as a real compliance assessment.
 *   • Do NOT aggregate uiStatus counts into "compliance %".
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REAL Supabase column → UI field mapping
 * ─────────────────────────────────────────────────────────────────────────────
 * tree_id                  → id
 * project_id               → projectId   (slug supplied by caller, not a DB col)
 * botanical_name           → botanicalName
 * common_name              → commonName
 * location                 → location
 * latitude                 → latitude
 * longitude                → longitude
 * nrz_radius_m             → nrzRadius          ← _m suffix is required
 * nrz_encroachment         → nrzEncroachment
 * srz_radius_m             → srzRadius          ← _m suffix is required
 * srz_encroachment         → srzEncroachment
 * encroachment_class       → encroachmentClass
 * encroachment_parts       → encroachmentParts
 * retention_status         → retentionStatus
 * tree_protection_measures → treeProtectionMeasures
 * required_measures        → requiredMeasures
 * health                   → health
 * structure                → structure
 * origin                   → origin
 * dbh_cm                   → dbhCm
 * dab_cm                   → dabCm
 * height_m                 → heightM
 * spread_m                 → spreadM
 * age                      → age
 * ule                      → ule
 * retention_value          → retentionValue
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Fields that DO NOT exist in the current Supabase schema (never use):
 *   • species              (use botanical_name instead)
 *   • nrz_radius           (use nrz_radius_m)
 *   • srz_radius           (use srz_radius_m)
 *   • tree_protection_type (column not present)
 *   • status               (no status column — see uiStatus below)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Public types ──────────────────────────────────────────────────────────────

export type TreeEncroachmentClass = "None" | "Minor" | "Moderate" | "Major";

/**
 * UI rendering status values.
 * For baseline trees these come from deriveUiStatus(), not from the database.
 */
export type TreeStatusValue = "compliant" | "at-risk" | "flagged" | "removed";

export interface SupabaseTree {
  // ── Identity ────────────────────────────────────────────────────────────────
  id: string;                    // tree_id
  projectId: string;             // supplied by caller (project slug, not a DB col)

  // ── Names ───────────────────────────────────────────────────────────────────
  botanicalName: string;         // botanical_name
  commonName: string;            // common_name

  // ── Location ────────────────────────────────────────────────────────────────
  location: string;              // location
  latitude: number;
  longitude: number;

  // ── Protection zones ────────────────────────────────────────────────────────
  nrzRadius: number;             // nrz_radius_m
  nrzEncroachment: string;       // nrz_encroachment
  srzRadius: number | null;      // srz_radius_m
  srzEncroachment: string;       // srz_encroachment
  encroachmentClass: TreeEncroachmentClass;  // encroachment_class
  encroachmentParts: string;     // encroachment_parts  ("" when none)

  // ── Retention ───────────────────────────────────────────────────────────────
  retentionStatus: string;       // retention_status
  currentStatus: string;         // current_status
  treeProtectionMeasures: string; // tree_protection_measures  ("" when none / "None")
  requiredMeasures: string[];    // required_measures text[] baseline protection requirements

  // ── Baseline condition (arborist assessment at time of inventory) ─────────
  health: string;                // health  ("Good" | "Fair" | "Poor" | "Dead" | "")
  structure: string;             // structure

  // ── Physical attributes ──────────────────────────────────────────────────────
  origin: string;                // origin  ("Native" | "Exotic" | "")
  dbhCm: number | null;          // dbh_cm
  dabCm: number | null;          // dab_cm
  heightM: number | null;        // height_m
  spreadM: number | null;        // spread_m
  age: string;                   // age
  ule: string;                   // ule  (useful life expectancy)
  retentionValue: string;        // retention_value

  // ── UI-only derived status (NOT a Supabase column) ───────────────────────
  /**
   * Temporary placeholder status for visual rendering of baseline trees.
   *
   * Derivation — see deriveUiStatus():
   *   retention_status contains "Remove"        → "removed"
   *   encroachment_class === "Major"             → "flagged"
   *   encroachment_class is "Minor" | "Moderate" → "at-risk"
   *   otherwise                                  → "compliant"
   *
   * This is NOT a completed site-inspection compliance result.
   * Real compliance status requires a future observations table.
   */
  uiStatus: TreeStatusValue;
}

// ── Derivation logic ──────────────────────────────────────────────────────────

/**
 * Derive a temporary UI rendering status from baseline inventory fields.
 *
 * IMPORTANT: The result is for visual differentiation in the tree list only.
 * It does NOT represent a genuine arborist compliance assessment.
 */
export function deriveUiStatus(row: Record<string, unknown>): TreeStatusValue {
  const retention = String(row.retention_status ?? "").toLowerCase();
  const enc = String(row.encroachment_class ?? "None");

  if (retention.includes("remove")) return "removed";
  if (enc === "Major") return "flagged";
  if (enc === "Minor" || enc === "Moderate") return "at-risk";
  return "compliant";
}

// ── Normalisation helpers ─────────────────────────────────────────────────────

/** Convert DB "None" placeholder strings to an empty string so UI can check truthiness. */
function normalise(raw: unknown, fallback = ""): string {
  const s = String(raw ?? fallback);
  return s === "None" || s === "none" ? "" : s;
}

function maybeNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

function normaliseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

// ── Canonical mapper ──────────────────────────────────────────────────────────

/**
 * Map one raw Supabase row from `trees` to a SupabaseTree.
 *
 * @param row         Raw record returned by supabase.from("trees").select("*")
 * @param projectSlug Human-readable project slug (ProjectData.id)
 */
export function mapSupabaseTree(
  row: Record<string, unknown>,
  projectSlug: string,
): SupabaseTree {
  return {
    // Identity
    id:                     String(row.tree_id          ?? ""),
    projectId:              projectSlug,

    // Names
    botanicalName:          String(row.botanical_name   ?? ""),
    commonName:             String(row.common_name      ?? ""),

    // Location
    location:               String(row.location         ?? ""),
    latitude:               Number(row.latitude         ?? 0),
    longitude:              Number(row.longitude        ?? 0),

    // Protection zones — MUST use _m suffix columns
    nrzRadius:              Number(row.nrz_radius_m     ?? 0),
    nrzEncroachment:        normalise(row.nrz_encroachment, "None") || "None",
    srzRadius:              maybeNumber(row.srz_radius_m),
    srzEncroachment:        normalise(row.srz_encroachment, "None") || "None",
    encroachmentClass:      (row.encroachment_class     ?? "None") as TreeEncroachmentClass,
    encroachmentParts:      normalise(row.encroachment_parts),

    // Retention
    retentionStatus:        String(row.retention_status ?? ""),
    currentStatus:          String(row.current_status ?? ""),
    treeProtectionMeasures: normalise(row.tree_protection_measures),
    requiredMeasures:       normaliseStringArray(row.required_measures),

    // Baseline condition
    health:                 normalise(row.health),
    structure:              normalise(row.structure),

    // Physical
    origin:                 normalise(row.origin),
    dbhCm:                  maybeNumber(row.dbh_cm),
    dabCm:                  maybeNumber(row.dab_cm),
    heightM:                maybeNumber(row.height_m),
    spreadM:                maybeNumber(row.spread_m),
    age:                    normalise(row.age),
    ule:                    normalise(row.ule),
    retentionValue:         normalise(row.retention_value),

    // UI-only derived status
    uiStatus:               deriveUiStatus(row),
  };
}
