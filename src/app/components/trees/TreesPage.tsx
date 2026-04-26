import { type SupabaseTree, mapSupabaseTree, type TreeStatusValue } from "../../data/treeMapper";
import { TreeStatusBadge, EncroachmentBadge } from "../StatusBadge";
import { type ProjectData } from "../../data/projectsData";
import { AddTreeSheet } from "../dashboard/AddTreeSheet";
import { useProject } from "../../context/ProjectContext";
import { supabase } from "../../../lib/supabase";

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  Search,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Check,
  Trees,
  TreePine,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XOctagon,
  MinusCircle,
  X,
  WifiOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EncFilter = "all" | "None" | "Minor" | "Moderate" | "Major";
// Real location values that exist in the Supabase trees table
type LocFilter = "all" | "Onsite" | "Neighbouring property" | "Nature strip";

// ─── Colour maps ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ProjectData["status"], string> = {
  active:     "#16A34A",
  monitoring: "#CA8A04",
  completed:  "#9CA3AF",
};

const STATUS_STAT_CFG = {
  compliant: { icon: CheckCircle2, color: "#16A34A", label: "Compliant" },
  "at-risk":  { icon: AlertTriangle,  color: "#EA580C", label: "At Risk"   },
  flagged:   { icon: XOctagon,       color: "#DC2626", label: "Flagged"   },
  removed:   { icon: MinusCircle,    color: "#9CA3AF", label: "Removed"   },
} as const;

const LOCATION_CFG = {
  Onsite:                  { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "Neighbouring property": { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "Nature strip":          { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" },
} as const;

const RETENTION_CFG: Record<string, { color: string }> = {
  "Retain":                               { color: "#15803D" },
  "Retain - Prune":                       { color: "#0369A1" },
  "Retain - MDRI & Arborist Supervision": { color: "#7C3AED" },
  "Remove":                               { color: "#DC2626" },
};

const TPM_EMPTY_VALUES = new Set(["", "none", "n/a", "na", "null"]);

function cleanMeasureLabel(value: string): string | null {
  const label = value.trim();
  if (!label) return null;
  if (TPM_EMPTY_VALUES.has(label.toLowerCase())) return null;
  return label;
}

function parseTreeProtectionMeasures(raw: string): string[] {
  const parts = raw
    .split(/[,;\/\n]+/g)
    .map((item) => cleanMeasureLabel(item))
    .filter((item): item is string => item !== null);
  return Array.from(new Set(parts));
}

function getDisplayMeasures(tree: SupabaseTree): string[] {
  const required = tree.requiredMeasures
    .map((item) => cleanMeasureLabel(item))
    .filter((item): item is string => item !== null);
  if (required.length > 0) return Array.from(new Set(required));
  return parseTreeProtectionMeasures(tree.treeProtectionMeasures);
}

// ─── Project Dropdown ─────────────────────────────────────────────────────────

function ProjectDropdown({
  projects, selectedId, onSelect,
}: {
  projects: ProjectData[]; selectedId: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find(p => p.id === selectedId) ?? projects[0];

  return (
    <>
      <div className="px-4 pt-12 pb-0" style={{ background: "#1B4332" }}>
        <p style={{
          color: "rgba(255,255,255,0.45)", fontSize: "0.6rem",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6,
        }}>
          Current Project
        </p>
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 active:opacity-80 transition-opacity"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="rounded-full flex-shrink-0"
              style={{ width: 7, height: 7, background: STATUS_COLORS[selected.status] }} />
            <span style={{ color: "white", fontSize: "0.92rem", fontWeight: 700,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.name}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem" }}>
              {projects.length} projects
            </span>
            <ChevronDown size={14} color="rgba(255,255,255,0.6)" />
          </div>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="rounded-t-3xl overflow-hidden"
            style={{ background: "white", maxHeight: "75vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="rounded-full" style={{ width: 36, height: 4, background: "#E5E7EB" }} />
            </div>
            <div className="px-5 py-3 border-b" style={{ borderColor: "#F3F4F6" }}>
              <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 700 }}>Switch Project</p>
              <p style={{ color: "#6B7280", fontSize: "0.75rem", marginTop: 2 }}>Select a project to view its trees</p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {projects.map(p => {
                const active = p.id === selectedId;
                return (
                  <button key={p.id}
                    onClick={() => { onSelect(p.id); setOpen(false); }}
                    className="w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-gray-50 transition-colors"
                    style={{ borderBottom: "1px solid #F9FAFB" }}
                  >
                    <span className="rounded-full flex-shrink-0"
                      style={{ width: 8, height: 8, background: STATUS_COLORS[p.status] }} />
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: active ? 700 : 500 }}>
                        {p.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span style={{ color: "#9CA3AF", fontSize: "0.7rem" }}>{p.totalTrees} trees</span>
                        <span style={{ color: "#E5E7EB" }}>·</span>
                        <span style={{ color: STATUS_COLORS[p.status], fontSize: "0.68rem",
                          fontWeight: 600, textTransform: "capitalize" }}>{p.status}</span>
                      </div>
                    </div>
                    {active && (
                      <div className="rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ width: 24, height: 24, background: "#1B4332" }}>
                        <Check size={13} color="white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function Chip({
  label, active, onClick, count,
}: { label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-all active:scale-95"
      style={{
        background: active ? "#1B4332" : "white",
        color: active ? "white" : "#374151",
        fontSize: "0.73rem",
        fontWeight: active ? 700 : 400,
        border: `1.5px solid ${active ? "#1B4332" : "#E5E7EB"}`,
      }}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className="rounded-full px-1.5"
          style={{
            background: active ? "rgba(255,255,255,0.25)" : "#F3F4F6",
            color: active ? "white" : "#6B7280",
            fontSize: "0.62rem",
            fontWeight: 700,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Location badge ──────────────────────────────────────────────────────────

function LocationBadge({ location }: { location: string }) {
  const cfg = LOCATION_CFG[location as keyof typeof LOCATION_CFG];
  if (!cfg) return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>
      <MapPin size={9} color="#6B7280" />
      <span style={{ color: "#6B7280", fontSize: "0.63rem", fontWeight: 600 }}>{location}</span>
    </span>
  );
  return (
    <span className="flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <MapPin size={9} color={cfg.text} />
      <span style={{ color: cfg.text, fontSize: "0.63rem", fontWeight: 700 }}>{location}</span>
    </span>
  );
}

// ─── Retention pill ───────────────────────────────────────────────────────────

function RetentionPill({ status }: { status: string }) {
  const cfg = RETENTION_CFG[status];
  const color = cfg?.color ?? "#374151";
  const short = status
    .replace("Retain - MDRI & Arborist Supervision", "Retain - Supervised")
    .replace("Retain - Prune", "Retain – Prune");
  return (
    <span
      className="rounded-full px-2.5 py-0.5"
      style={{ background: `${color}14`, color, fontSize: "0.65rem", fontWeight: 700 }}
    >
      {short}
    </span>
  );
}

// ─── Tree Card ────────────────────────────────────────────────────────────────

function TreeCard({ tree }: { tree: SupabaseTree }) {
  const navigate = useNavigate();
  const displayMeasures = getDisplayMeasures(tree);
  return (
    <button
      onClick={() => navigate(`/trees/${tree.id}`)}
      className="w-full rounded-2xl text-left active:scale-98 transition-transform overflow-hidden"
      style={{
        background: "white",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        border: tree.uiStatus === "flagged" ? "1.5px solid #FECACA"
              : tree.uiStatus === "at-risk" ? "1.5px solid #FED7AA"
              : "1.5px solid #F3F4F6",
      }}
    >
      {(tree.uiStatus === "flagged" || tree.uiStatus === "at-risk") && (
        <div style={{
          height: 3,
          background: tree.uiStatus === "flagged" ? "#DC2626" : "#EA580C",
        }} />
      )}

      <div className="p-4">
        {/* Row 1: ID + badges + status + chevron */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="rounded-lg px-2 py-0.5 font-mono flex-shrink-0"
              style={{ background: "#1B4332", color: "white", fontSize: "0.7rem", fontWeight: 700 }}
            >
              {tree.id}
            </span>
            <LocationBadge location={tree.location} />
            <EncroachmentBadge encroachmentClass={tree.encroachmentClass} compact />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <TreeStatusBadge status={tree.uiStatus} baseline />
            <ChevronRight size={14} color="#D1D5DB" />
          </div>
        </div>

        {/* Row 2: Botanical name */}
        <p style={{ color: "#111827", fontSize: "0.93rem", fontWeight: 600,
          fontStyle: "italic", marginTop: 8, lineHeight: 1.3 }}>
          {tree.botanicalName}
          {tree.commonName ? (
            <span style={{ fontStyle: "normal", fontWeight: 400, color: "#6B7280", fontSize: "0.78rem" }}>
              {" "}({tree.commonName})
            </span>
          ) : null}
        </p>

        <div className="mt-2">
          <p style={{ color: "#9CA3AF", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
            Required TPM
          </p>
          {displayMeasures.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {displayMeasures.map((measure) => (
                <span
                  key={`${tree.id}-${measure}`}
                  className="rounded-full px-2 py-0.5"
                  style={{
                    background: "#F0FDF4",
                    border: "1px solid #BBF7D0",
                    color: "#166534",
                    fontSize: "0.62rem",
                    fontWeight: 600,
                  }}
                >
                  {measure}
                </span>
              ))}
            </div>
          ) : (
            <span
              className="inline-flex rounded-full px-2 py-0.5"
              style={{
                background: "#F3F4F6",
                border: "1px solid #E5E7EB",
                color: "#6B7280",
                fontSize: "0.62rem",
                fontWeight: 600,
              }}
            >
              No TPM specified
            </span>
          )}
        </div>

        {/* Row 3: Retention pill */}
        <div className="mt-1.5">
          <RetentionPill status={tree.retentionStatus} />
        </div>

        {/* Row 4: Protection zone stats */}
        <div
          className="flex items-center gap-0 mt-3 pt-3 flex-wrap gap-y-1"
          style={{ borderTop: "1px solid #F9FAFB" }}
        >
          <div className="flex items-center gap-1.5 mr-4">
            <span style={{ color: "#9CA3AF", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.04em" }}>NRZ</span>
            <span style={{ color: "#374151", fontSize: "0.72rem", fontWeight: 700 }}>{tree.nrzRadius}m</span>
            {tree.nrzEncroachment !== "None" && (
              <span style={{ color: "#DC2626", fontSize: "0.62rem", fontWeight: 600 }}>
                {tree.nrzEncroachment} enc.
              </span>
            )}
          </div>

          {tree.srzRadius && (
            <div className="flex items-center gap-1.5 mr-4">
              <span style={{ color: "#9CA3AF", fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.04em" }}>SRZ</span>
              <span style={{ color: "#374151", fontSize: "0.72rem", fontWeight: 700 }}>{tree.srzRadius}m</span>
              {tree.srzEncroachment !== "None" && (
                <span style={{ color: "#DC2626", fontSize: "0.62rem", fontWeight: 600 }}>
                  {tree.srzEncroachment} enc.
                </span>
              )}
            </div>
          )}

          {/* encroachmentParts is normalised to "" by the mapper; "" is falsy so this hides correctly */}
          {!!tree.encroachmentParts && (
            <div className="flex items-center gap-1 ml-auto">
              <SlidersHorizontal size={10} color="#9CA3AF" />
              <span style={{ color: "#6B7280", fontSize: "0.65rem" }}>{tree.encroachmentParts}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Summary stat row ─────────────────────────────────────────────────────────

function StatusStatRow({ trees }: { trees: SupabaseTree[] }) {
  const counts = {
    compliant: trees.filter(t => t.uiStatus === "compliant").length,
    "at-risk":  trees.filter(t => t.uiStatus === "at-risk").length,
    flagged:   trees.filter(t => t.uiStatus === "flagged").length,
    removed:   trees.filter(t => t.uiStatus === "removed").length,
  };
  return (
    <div className="flex items-center gap-0 px-4 py-3">
      {(Object.entries(counts) as [keyof typeof STATUS_STAT_CFG, number][]).map(([key, count], i) => {
        const cfg = STATUS_STAT_CFG[key];
        const Icon = cfg.icon;
        return (
          <React.Fragment key={key}>
            {i > 0 && <div style={{ width: 1, height: 22, background: "#F3F4F6", margin: "0 8px" }} />}
            <div className="flex items-center gap-1.5">
              <Icon size={13} color={cfg.color} />
              <span style={{ color: "#374151", fontSize: "0.75rem", fontWeight: 700 }}>{count}</span>
              <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>{cfg.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── No-data state ───────────────────────────────────────────────────────────

function NoDataState({
  project, loading, error, onAddTree,
}: {
  project: ProjectData;
  loading: boolean;
  error: string | null;
  onAddTree: () => void;
}) {
  return (
    <div className="px-4 pt-4 flex flex-col gap-4">
      {/* Project summary card — shows basic meta only; tree stats are fetched separately */}
      <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1.5px solid #F3F4F6" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700 }}>{project.name}</p>
            <p style={{ color: "#9CA3AF", fontSize: "0.7rem", marginTop: 1 }}>{project.reference}</p>
          </div>
          <span className="rounded-xl px-2.5 py-1" style={{ background: "#F3F4F6" }}>
            <span style={{ color: "#6B7280", fontSize: "0.7rem", fontWeight: 600, textTransform: "capitalize" }}>
              {project.status}
            </span>
          </span>
        </div>
        <p style={{ color: "#9CA3AF", fontSize: "0.72rem", marginTop: 8, lineHeight: 1.5 }}>
          Tree inventory data will appear below once loaded from Supabase.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-2xl px-5 py-8 flex flex-col items-center gap-3 text-center"
          style={{ background: "#F9FAFB", border: "1.5px solid #F3F4F6" }}>
          <div
            className="rounded-full animate-spin"
            style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "#2D5A27" }}
          />
          <p style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>Loading tree records…</p>
          <p style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>Fetching from Supabase</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="rounded-2xl px-5 py-5 flex items-start gap-3"
          style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>
          <WifiOff size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ color: "#991B1B", fontSize: "0.82rem", fontWeight: 700, marginBottom: 2 }}>
              Failed to load trees
            </p>
            <p style={{ color: "#B91C1C", fontSize: "0.72rem", lineHeight: 1.4 }}>{error}</p>
          </div>
        </div>
      )}

      {/* No records notice */}
      {!loading && !error && (
        <div className="rounded-2xl px-5 py-6 flex flex-col items-center gap-3 text-center"
          style={{ background: "#F9FAFB", border: "1.5px dashed #E5E7EB" }}>
          <div className="rounded-2xl p-3" style={{ background: "#F3F4F6" }}>
            <Trees size={28} color="#D1D5DB" />
          </div>
          <div>
            <p style={{ color: "#374151", fontSize: "0.88rem", fontWeight: 600 }}>
              No tree records in Supabase
            </p>
            <p style={{ color: "#9CA3AF", fontSize: "0.75rem", marginTop: 4, lineHeight: 1.5 }}>
              Tree inventory data hasn't been imported for this project yet. You can add records below.
            </p>
          </div>
          <button
            onClick={onAddTree}
            className="flex items-center gap-2 rounded-2xl px-5 py-3 active:scale-95 transition-transform"
            style={{ background: "#1B4332" }}
          >
            <TreePine size={16} color="white" />
            <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 700 }}>
              Add First Tree Record
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function TreesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") as TreeStatusValue | null) ?? "all";

  const { selectedProjectId: selectedId, setSelectedProjectId, projects } = useProject();

  // ── UI state ─────────────────────────────────────────────────────────────
  // ALL hooks must be declared before any conditional return (Rules of Hooks)
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<TreeStatusValue | "all">(initialStatus);
  const [encFilter,    setEncFilter]    = useState<EncFilter>("all");
  const [locFilter,    setLocFilter]    = useState<LocFilter>("all");
  const [showFilters,  setShowFilters]  = useState(false);
  const [showAddTree,  setShowAddTree]  = useState(false);

  // ── Tree data state (fetched from Supabase) ───────────────────────────────
  const [trees,        setTrees]        = useState<SupabaseTree[]>([]);
  const [loadingTrees, setLoadingTrees] = useState(false);
  const [treeError,    setTreeError]    = useState<string | null>(null);

  // Resolve selected project early so the fetch effect can read its uuid.
  // May be undefined while projects are still loading.
  const project = projects.find(p => p.id === selectedId) ?? projects[0];

  // ── Fetch trees from Supabase using the project UUID (not the slug) ───────
  useEffect(() => {
    const uuid = project?.uuid;
    if (!uuid) return;

    let cancelled = false;
    setLoadingTrees(true);
    setTreeError(null);
    setTrees([]);

    supabase
      .from("trees")
      .select("*, tree_protection_measures, required_measures")
      .eq("project_id", uuid)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("TreesPage fetch error:", error);
          setTreeError(error.message);
          setLoadingTrees(false);
          return;
        }
        setTrees((data ?? []).map(row => mapSupabaseTree(row as Record<string, unknown>, project?.id ?? "")));
        setLoadingTrees(false);
      });

    return () => { cancelled = true; };
  }, [project?.uuid]); // re-run only when the UUID changes (i.e. user switches project)

  // ── Derived counts — always computed so hooks are called unconditionally ──
  const statusCounts = useMemo(() => ({
    compliant: trees.filter(t => t.uiStatus === "compliant").length,
    "at-risk":  trees.filter(t => t.uiStatus === "at-risk").length,
    flagged:   trees.filter(t => t.uiStatus === "flagged").length,
    removed:   trees.filter(t => t.uiStatus === "removed").length,
  }), [trees]);

  const locCounts = useMemo(() => ({
    Onsite:                  trees.filter(t => t.location === "Onsite").length,
    "Neighbouring property": trees.filter(t => t.location === "Neighbouring property").length,
    "Nature strip":          trees.filter(t => t.location === "Nature strip").length,
  }), [trees]);

  const filtered = useMemo(() => {
    return trees.filter(t => {
      const q = search.toLowerCase();
      const matchSearch = q === "" ||
        t.id.toLowerCase().includes(q) ||
        t.botanicalName.toLowerCase().includes(q) ||
        t.commonName.toLowerCase().includes(q) ||
        t.retentionStatus.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || t.uiStatus === statusFilter;
      const matchEnc    = encFilter    === "all" || t.encroachmentClass === encFilter;
      const matchLoc    = locFilter    === "all" || t.location === locFilter;
      return matchSearch && matchStatus && matchEnc && matchLoc;
    });
  }, [trees, search, statusFilter, encFilter, locFilter]);

  const hasActiveFilters =
    statusFilter !== "all" || encFilter !== "all" || locFilter !== "all" || search !== "";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setEncFilter("all");
    setLocFilter("all");
  };

  // ── Loading guard — projects not yet loaded (comes AFTER all hooks) ───────
  if (projects.length === 0) {
    return (
      <div className="pb-28">
        <div className="px-4 pt-12 pb-3" style={{ background: "#1B4332" }}>
          <div
            className="w-full rounded-xl animate-pulse"
            style={{ height: 44, background: "rgba(255,255,255,0.1)" }}
          />
        </div>
        <div className="px-4 mt-4 flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 110, background: "#E5E7EB" }} />
          ))}
        </div>
      </div>
    );
  }

  // project is now guaranteed non-null (projects.length > 0)
  const hasTreeData = !loadingTrees && trees.length > 0;

  return (
    <div className="pb-28">
      {/* ── Project dropdown ── */}
      <ProjectDropdown
        projects={projects}
        selectedId={selectedId}
        onSelect={id => {
          setSelectedProjectId(id);
          setSearch("");
          setStatusFilter("all");
          setEncFilter("all");
          setLocFilter("all");
        }}
      />

      {/* ── Header ── */}
      <div
        className="px-4 pt-4 pb-5"
        style={{ background: "linear-gradient(175deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.65rem",
              letterSpacing: "0.09em", textTransform: "uppercase" }}>
              Tree Inventory
            </p>
            <h1 style={{ color: "white", fontSize: "1.3rem", fontWeight: 800, lineHeight: 1.15, marginTop: 2 }}>
              {loadingTrees
                ? "Loading…"
                : `${trees.length.toLocaleString()} Tree${trees.length !== 1 ? "s" : ""}`}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.72rem", marginTop: 2 }}>
              {project.name}
            </p>
          </div>

          <button
            onClick={() => setShowAddTree(true)}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 flex-shrink-0 active:scale-95 transition-transform"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            <TreePine size={15} color="white" />
            <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 700 }}>Add Tree</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search by ID, species, or zone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            disabled={loadingTrees}
            className="w-full pl-10 pr-4 py-3 rounded-xl outline-none"
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "#111827",
              fontSize: "0.88rem",
              border: "none",
              opacity: loadingTrees ? 0.6 : 1,
            }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} color="#9CA3AF" />
            </button>
          )}
        </div>
      </div>

      {/* ── Show no-data / loading / error state when there are no trees ── */}
      {!hasTreeData ? (
        <NoDataState
          project={project}
          loading={loadingTrees}
          error={treeError}
          onAddTree={() => setShowAddTree(true)}
        />
      ) : (
        <>
          {/* Status stat row */}
          <div className="bg-white" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <StatusStatRow trees={trees} />
          </div>

          {/* Filters bar */}
          <div className="bg-white" style={{ borderBottom: "1px solid #F3F4F6" }}>
            {/* Status chips */}
            <div className="flex gap-2 px-4 pt-3 pb-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              <Chip label="All" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
              <Chip label="Compliant" active={statusFilter === "compliant"}
                onClick={() => setStatusFilter("compliant")} count={statusCounts.compliant} />
              <Chip label="At Risk" active={statusFilter === "at-risk"}
                onClick={() => setStatusFilter("at-risk")} count={statusCounts["at-risk"]} />
              <Chip label="Flagged" active={statusFilter === "flagged"}
                onClick={() => setStatusFilter("flagged")} count={statusCounts.flagged} />
              <Chip label="Removed" active={statusFilter === "removed"}
                onClick={() => setStatusFilter("removed")} count={statusCounts.removed} />
            </div>

            {/* Sub-filters toggle */}
            <div className="px-4 pb-2.5 flex items-center justify-between">
              <button
                onClick={() => setShowFilters(f => !f)}
                className="flex items-center gap-1.5"
              >
                <SlidersHorizontal size={13} color={showFilters ? "#1B4332" : "#6B7280"} />
                <span style={{
                  color: showFilters ? "#1B4332" : "#6B7280",
                  fontSize: "0.72rem",
                  fontWeight: showFilters ? 700 : 400,
                }}>
                  More filters
                </span>
                {(encFilter !== "all" || locFilter !== "all") && (
                  <span className="rounded-full px-1.5"
                    style={{ background: "#1B4332", color: "white", fontSize: "0.58rem", fontWeight: 700 }}>
                    {(encFilter !== "all" ? 1 : 0) + (locFilter !== "all" ? 1 : 0)}
                  </span>
                )}
              </button>

              {hasActiveFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1">
                  <X size={11} color="#DC2626" />
                  <span style={{ color: "#DC2626", fontSize: "0.68rem", fontWeight: 600 }}>Clear all</span>
                </button>
              )}
            </div>

            {/* Expandable sub-filters */}
            {showFilters && (
              <div className="px-4 pb-3 flex flex-col gap-2.5" style={{ borderTop: "1px solid #F9FAFB" }}>
                {/* Encroachment */}
                <div className="pt-2.5">
                  <p style={{ color: "#9CA3AF", fontSize: "0.65rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Encroachment
                  </p>
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    {(["all", "None", "Minor", "Moderate", "Major"] as EncFilter[]).map(v => (
                      <Chip key={v} label={v === "all" ? "Any" : v}
                        active={encFilter === v} onClick={() => setEncFilter(v)} />
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <p style={{ color: "#9CA3AF", fontSize: "0.65rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                    Location Type
                  </p>
                  <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                    <Chip label="All" active={locFilter === "all"} onClick={() => setLocFilter("all")} />
                    <Chip label="Onsite" active={locFilter === "Onsite"}
                      onClick={() => setLocFilter("Onsite")} count={locCounts["Onsite"]} />
                    <Chip label="Neighbouring" active={locFilter === "Neighbouring property"}
                      onClick={() => setLocFilter("Neighbouring property")} count={locCounts["Neighbouring property"]} />
                    <Chip label="Nature Strip" active={locFilter === "Nature strip"}
                      onClick={() => setLocFilter("Nature strip")} count={locCounts["Nature strip"]} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results header */}
          <div className="px-4 py-2.5 flex items-center justify-between">
            <p style={{ color: "#6B7280", fontSize: "0.73rem" }}>
              {filtered.length === trees.length
                ? `${filtered.length} trees in inventory`
                : `${filtered.length} of ${trees.length} trees`}
            </p>
            {filtered.length !== trees.length && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 active:opacity-70">
                <X size={11} color="#9CA3AF" />
                <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>Clear filters</span>
              </button>
            )}
          </div>

          {/* Tree list */}
          <div className="px-4 flex flex-col gap-2.5">
            {filtered.length === 0 ? (
              <div className="rounded-2xl px-4 py-8 flex flex-col items-center gap-2 text-center"
                style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
                <Search size={26} color="#D1D5DB" />
                <p style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: 500 }}>
                  No trees match your filters
                </p>
                <button onClick={clearFilters}
                  className="rounded-full px-4 py-1.5 mt-1"
                  style={{ background: "#1B4332" }}>
                  <span style={{ color: "white", fontSize: "0.75rem", fontWeight: 600 }}>Clear filters</span>
                </button>
              </div>
            ) : (
              filtered.map(tree => <TreeCard key={tree.id} tree={tree} />)
            )}
          </div>
        </>
      )}

      {/* Add Tree Sheet */}
      <AddTreeSheet
        open={showAddTree}
        onClose={() => setShowAddTree(false)}
        project={project}
      />
    </div>
  );
}
