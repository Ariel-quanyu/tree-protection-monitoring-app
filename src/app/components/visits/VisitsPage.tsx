import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ClipboardCheck, ChevronRight, AlertCircle, CheckCircle2,
  Clock, User, Trees, X,
} from "lucide-react";
import {
  VISIT_TYPE_SHORT,
  VISIT_TYPE_COLORS,
  type Visit,
  type VisitType,
} from "../../data/visitsData";
import { supabase } from "../../../lib/supabase";

// ── Helpers ───────────────────────────────────────────────────────────────────

function compliancePct(v: Visit) {
  const knownStatusCount = (v as VisitListItem).knownStatusCount ?? v.inspectedTrees;
  const compliantCount = (v as VisitListItem).compliantCount ?? (v.inspectedTrees - v.breachCount);
  if (knownStatusCount === 0) return null;
  return Math.round((compliantCount / knownStatusCount) * 100);
}

interface VisitListItem extends Visit {
  projectUuid: string;
  projectSlug: string;
  createdAt?: string;
  knownStatusCount: number;
  compliantCount: number;
}

type VisitRow = {
  id: string;
  project_id: string | null;
  inspection_date: string | null;
  visit_type: string | null;
  inspector_name: string | null;
  notes: string | null;
  created_at: string | null;
};

type ProjectRow = {
  id: string;
  name: string | null;
  slug: string | null;
};

type TreeVisitRecordRow = {
  visit_id: string | null;
  tpm_status: string | null;
};

type TreeProjectRow = {
  project_id: string | null;
};

function normalizeVisitType(raw: string | null): VisitType {
  if (!raw) return "Routine Visit";
  if (raw in VISIT_TYPE_SHORT) return raw as VisitType;
  return "Routine Visit";
}

function normalizeTpmStatus(status: string | null): "compliant" | "breach" | "not_compliant" | "unknown" {
  if (!status) return "unknown";
  const normalized = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "compliant") return "compliant";
  if (normalized === "breach") return "breach";
  if (normalized === "not_compliant") return "not_compliant";
  return "unknown";
}

// ── Visit type badge ──────────────────────────────────────────────────────────

function VisitTypeBadge({ type, small = false }: { type: VisitType; small?: boolean }) {
  const cfg = VISIT_TYPE_COLORS[type];
  return (
    <span
      className="inline-flex items-center rounded-full"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.text,
        fontSize: small ? "0.6rem" : "0.65rem",
        fontWeight: 700,
        padding: small ? "1px 7px" : "2px 9px",
        whiteSpace: "nowrap",
      }}
    >
      {VISIT_TYPE_SHORT[type]}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "draft" | "completed" }) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
        style={{ background: "#FEF3C7", border: "1px solid #FDE68A" }}>
        <Clock size={9} color="#B45309" />
        <span style={{ color: "#B45309", fontSize: "0.6rem", fontWeight: 700 }}>Draft</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ background: "#DCFCE7", border: "1px solid #BBF7D0" }}>
      <CheckCircle2 size={9} color="#15803D" />
      <span style={{ color: "#15803D", fontSize: "0.6rem", fontWeight: 700 }}>Complete</span>
    </span>
  );
}

// ── Visit Card ────────────────────────────────────────────────────────────────

function VisitCard({ visit }: { visit: Visit }) {
  const navigate = useNavigate();
  const pct = compliancePct(visit);
  const hasBreach = visit.breachCount > 0;

  return (
    <button
      onClick={() => navigate(`/visits/${visit.id}`)}
      className="w-full rounded-2xl text-left active:scale-[0.985] transition-transform overflow-hidden"
      style={{
        background: "white",
        boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
        border: hasBreach ? "1.5px solid #FECACA" : "1.5px solid #F3F4F6",
      }}
    >
      {hasBreach && (
        <div style={{ height: 3, background: "#DC2626" }} />
      )}

      <div className="p-4">
        {/* Row 1: date + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className="rounded-xl flex flex-col items-center justify-center flex-shrink-0"
              style={{ background: "#F0FDF4", width: 44, height: 44 }}
            >
              <span style={{ color: "#1B4332", fontSize: "1rem", fontWeight: 800, lineHeight: 1 }}>
                {new Date(visit.date).getDate()}
              </span>
              <span style={{ color: "#15803D", fontSize: "0.55rem", fontWeight: 600, textTransform: "uppercase" }}>
                {new Date(visit.date).toLocaleDateString("en-AU", { month: "short" })}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <VisitTypeBadge type={visit.type} />
              <p style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, marginTop: 4, lineHeight: 1.3 }}>
                {visit.projectName}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge status={visit.status} />
            <ChevronRight size={14} color="#D1D5DB" />
          </div>
        </div>

        {/* Row 2: stats */}
        <div
          className="flex items-center gap-3 pt-3 mt-1"
          style={{ borderTop: "1px solid #F3F4F6" }}
        >
          <div className="flex items-center gap-1">
            <Trees size={11} color="#9CA3AF" />
            <span style={{ color: "#6B7280", fontSize: "0.7rem" }}>
              {visit.inspectedTrees}/{visit.totalTrees} trees
            </span>
          </div>
          {hasBreach ? (
            <div className="flex items-center gap-1">
              <AlertCircle size={11} color="#DC2626" />
              <span style={{ color: "#DC2626", fontSize: "0.7rem", fontWeight: 700 }}>
                {visit.breachCount} breach{visit.breachCount !== 1 ? "es" : ""}
              </span>
            </div>
          ) : pct !== null ? (
            <div className="flex items-center gap-1">
              <CheckCircle2 size={11} color="#15803D" />
              <span style={{ color: "#15803D", fontSize: "0.7rem", fontWeight: 600 }}>
                {pct}% compliant
              </span>
            </div>
          ) : null}
          <div className="flex items-center gap-1 ml-auto">
            <User size={11} color="#9CA3AF" />
            <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>{visit.inspector}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "draft" | "completed";

export function VisitsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [visits, setVisits] = useState<VisitListItem[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const refreshVisitsAt = (location.state as { refreshVisitsAt?: number } | null)?.refreshVisitsAt;


  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, name, slug")
          .order("name", { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        setProjects((data ?? []) as ProjectRow[]);
      } catch (error) {
        console.error("Failed to fetch projects for visit filters:", error);
        if (!mounted) return;
        setProjects([]);
      }
    };

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadVisits = async () => {
      setLoadingVisits(true);
      try {
        const { data: visitsData, error: visitsError } = await supabase
          .from("visits")
          .select("id, project_id, inspection_date, visit_type, inspector_name, notes, created_at")
          .order("inspection_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (visitsError) throw visitsError;

        const typedVisits = (visitsData ?? []) as VisitRow[];
        const visitIds = typedVisits.map((visit) => visit.id);
        const projectIds = Array.from(
          new Set(typedVisits.map((visit) => visit.project_id).filter((projectId): projectId is string => Boolean(projectId))),
        );

        const [{ data: projectsData, error: projectsError }, { data: recordsData, error: recordsError }, { data: treesData, error: treesError }] = await Promise.all([
          projectIds.length > 0
            ? supabase.from("projects").select("id, name, slug").in("id", projectIds)
            : Promise.resolve({ data: [], error: null }),
          visitIds.length > 0
            ? supabase.from("tree_visit_records").select("visit_id, tpm_status").in("visit_id", visitIds)
            : Promise.resolve({ data: [], error: null }),
          projectIds.length > 0
            ? supabase.from("trees").select("project_id").in("project_id", projectIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (projectsError) throw projectsError;
        if (recordsError) throw recordsError;
        if (treesError) throw treesError;

        const projectMap = new Map<string, ProjectRow>(
          ((projectsData ?? []) as ProjectRow[]).map((project) => [project.id, project]),
        );

        const recordSummaryByVisitId = new Map<
          string,
          { inspectedTrees: number; breachCount: number; compliantCount: number; knownStatusCount: number }
        >();
        ((recordsData ?? []) as TreeVisitRecordRow[]).forEach((record) => {
          if (!record.visit_id) return;
          const current = recordSummaryByVisitId.get(record.visit_id) ?? {
            inspectedTrees: 0,
            breachCount: 0,
            compliantCount: 0,
            knownStatusCount: 0,
          };
          current.inspectedTrees += 1;
          const normalizedStatus = normalizeTpmStatus(record.tpm_status);
          if (normalizedStatus === "breach") {
            current.breachCount += 1;
            current.knownStatusCount += 1;
          } else if (normalizedStatus === "compliant") {
            current.compliantCount += 1;
            current.knownStatusCount += 1;
          } else if (normalizedStatus === "not_compliant") {
            current.knownStatusCount += 1;
          }
          recordSummaryByVisitId.set(record.visit_id, current);
        });

        const treeCountByProjectId = new Map<string, number>();
        ((treesData ?? []) as TreeProjectRow[]).forEach((tree) => {
          if (!tree.project_id) return;
          treeCountByProjectId.set(tree.project_id, (treeCountByProjectId.get(tree.project_id) ?? 0) + 1);
        });

        const mappedRealVisits: VisitListItem[] = typedVisits.map((row) => {
          const project = row.project_id ? projectMap.get(row.project_id) : null;
          const summary = recordSummaryByVisitId.get(row.id) ?? {
            inspectedTrees: 0,
            breachCount: 0,
            compliantCount: 0,
            knownStatusCount: 0,
          };
          const projectSlug = project?.slug ?? row.project_id ?? "";
          const projectName = project?.name ?? "Unknown Project";
          const totalTrees = row.project_id ? (treeCountByProjectId.get(row.project_id) ?? 0) : 0;
          const inspectedTrees = summary.inspectedTrees;
          const noChangeTrees = Math.max(totalTrees - inspectedTrees, 0);

          return {
            id: row.id,
            projectId: projectSlug,
            projectName,
            date: row.inspection_date ?? row.created_at ?? new Date().toISOString(),
            type: normalizeVisitType(row.visit_type),
            inspector: row.inspector_name ?? "Unknown Inspector",
            status: "completed",
            totalTrees,
            inspectedTrees,
            noChangeTrees,
            breachCount: summary.breachCount,
            notes: row.notes ?? "",
            treeInspections: [],
            projectUuid: row.project_id ?? "",
            projectSlug,
            createdAt: row.created_at ?? undefined,
            knownStatusCount: summary.knownStatusCount,
            compliantCount: summary.compliantCount,
          };
        });

        if (!mounted) return;
        setVisits(mappedRealVisits);
      } catch (error) {
        console.error("Failed to fetch visits from Supabase:", error);
      } finally {
        if (mounted) setLoadingVisits(false);
      }
    };

    void loadVisits();

    return () => {
      mounted = false;
    };
  }, [refreshVisitsAt, location.key]);

  const projectFilteredVisits = useMemo(() => {
    if (projectFilter === "all") return visits;
    return visits.filter((visit) => visit.projectUuid === projectFilter);
  }, [visits, projectFilter]);

  const filtered = useMemo(() => {
    return projectFilteredVisits
      .filter((visit) => {
        if (statusFilter !== "all" && visit.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const dateDelta = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDelta !== 0) return dateDelta;
        return new Date(b.createdAt ?? b.date).getTime() - new Date(a.createdAt ?? a.date).getTime();
      });
  }, [projectFilteredVisits, statusFilter]);

  const totalBreaches = projectFilteredVisits.reduce((s, v) => s + v.breachCount, 0);
  const totalCompleted = projectFilteredVisits.filter(v => v.status === "completed").length;
  const totalDraft     = projectFilteredVisits.filter(v => v.status === "draft").length;

  return (
    <div className="pb-32">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62rem",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
          Site Inspections
        </p>
        <h1 style={{ color: "white", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 }}>
          Visit Log
        </h1>

        {/* Summary pills */}
        <div className="flex gap-2 mt-3">
          {[
            { label: "Visits", value: projectFilteredVisits.length, bg: "rgba(255,255,255,0.15)", text: "white" },
            { label: "Complete", value: totalCompleted,  bg: "rgba(74,222,128,0.2)",  text: "#4ADE80" },
            { label: "Draft",    value: totalDraft,      bg: "rgba(251,191,36,0.2)",  text: "#FCD34D" },
            { label: "Breaches", value: totalBreaches,   bg: "rgba(248,113,113,0.2)", text: "#FCA5A5" },
          ].map(({ label, value, bg, text }) => (
            <div key={label} className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
              style={{ background: bg }}>
              <span style={{ color: text, fontSize: "0.82rem", fontWeight: 800, lineHeight: 1 }}>{value}</span>
              <span style={{ color: text, fontSize: "0.62rem", opacity: 0.85 }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white" style={{ borderBottom: "1px solid #F3F4F6" }}>
        {/* Status chips */}
        <div className="flex gap-2 px-4 pt-3 pb-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {([
            { v: "all",       label: "All Visits" },
            { v: "completed", label: "Completed" },
            { v: "draft",     label: "Draft" },
          ] as { v: StatusFilter; label: string }[]).map(({ v, label }) => (
            <button
              key={v}
              onClick={() => setStatusFilter(v)}
              className="flex-shrink-0 rounded-full px-3.5 py-1.5 transition-all active:scale-95"
              style={{
                background: statusFilter === v ? "#1B4332" : "white",
                color:      statusFilter === v ? "white" : "#374151",
                border:     `1.5px solid ${statusFilter === v ? "#1B4332" : "#E5E7EB"}`,
                fontSize: "0.73rem", fontWeight: statusFilter === v ? 700 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Project filter */}
        <div className="px-4 pb-3">
          <label htmlFor="visits-project-filter" className="sr-only">Project filter</label>
          <div
            className="rounded-full px-3 py-2"
            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
          >
            <select
              id="visits-project-filter"
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              className="w-full bg-transparent outline-none"
              style={{ color: "#1B4332", fontSize: "0.78rem", fontWeight: 600 }}
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name ?? "Unnamed Project"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results header */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        <p style={{ color: "#6B7280", fontSize: "0.73rem" }}>
          {filtered.length} visit{filtered.length !== 1 ? "s" : ""}
          {projectFilter !== "all" || statusFilter !== "all" ? " (filtered)" : ""}
        </p>
        {(statusFilter !== "all" || projectFilter !== "all") && (
          <button
            onClick={() => { setStatusFilter("all"); setProjectFilter("all"); }}
            className="flex items-center gap-1"
          >
            <X size={11} color="#9CA3AF" />
            <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>Clear</span>
          </button>
        )}
      </div>

      {/* Visit list */}
      <div className="px-4 flex flex-col gap-2.5">
        {loadingVisits ? (
          <div className="rounded-2xl px-4 py-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}>
            <p style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: 500 }}>
              Loading visits…
            </p>
          </div>
        ) : visits.length === 0 ? (
          <div className="rounded-2xl px-4 py-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}>
            <ClipboardCheck size={32} color="#D1D5DB" />
            <p style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: 500 }}>
              No visits recorded yet. Start a new visit to begin monitoring compliance.
            </p>
            <button
              onClick={() => navigate("/visits/new")}
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5 active:scale-95 transition-transform"
              style={{ background: "#1B4332" }}
            >
              <ClipboardCheck size={14} color="white" />
              <span style={{ color: "white", fontSize: "0.8rem", fontWeight: 700 }}>Start First Visit</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl px-4 py-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}>
            <ClipboardCheck size={32} color="#D1D5DB" />
            <p style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: 500 }}>
              No visits match your filters
            </p>
            <button
              onClick={() => navigate("/visits/new")}
              className="flex items-center gap-2 rounded-2xl px-4 py-2.5 active:scale-95 transition-transform"
              style={{ background: "#1B4332" }}
            >
              <ClipboardCheck size={14} color="white" />
              <span style={{ color: "white", fontSize: "0.8rem", fontWeight: 700 }}>Start First Visit</span>
            </button>
          </div>
        ) : (
          filtered.map(v => <VisitCard key={v.id} visit={v} />)
        )}
      </div>
    </div>
  );
}
