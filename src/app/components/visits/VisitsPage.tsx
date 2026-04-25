import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  ClipboardCheck, ChevronRight, AlertCircle, CheckCircle2,
  Clock, Calendar, User, Trees, X, Filter,
} from "lucide-react";
import {
  MOCK_VISITS,
  VISIT_TYPE_SHORT,
  VISIT_TYPE_COLORS,
  type Visit,
  type VisitType,
} from "../../data/visitsData";
import { useProject } from "../../context/ProjectContext";
import { fetchVisits } from "../../data/visitsApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function compliancePct(v: Visit) {
  if (v.inspectedTrees === 0) return null;
  const compliant = v.inspectedTrees - v.breachCount;
  return Math.round((compliant / v.inspectedTrees) * 100);
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
  const { projects } = useProject();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [visits, setVisits] = useState<Visit[]>(MOCK_VISITS);
  const [loadingVisits, setLoadingVisits] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingVisits(true);
    fetchVisits()
      .then((data) => {
        if (!mounted) return;
        const hydrated = data.map((visit) => {
          const projectMatch = projects.find((p) => p.uuid === visit.projectId);
          if (!projectMatch) return visit;
          return {
            ...visit,
            projectId: projectMatch.id,
            projectName: projectMatch.name,
          };
        });
        setVisits(hydrated);
      })
      .catch((error) => {
        console.error("Failed to fetch visits from Supabase:", error);
      })
      .finally(() => {
        if (mounted) setLoadingVisits(false);
      });

    return () => {
      mounted = false;
    };
  }, [location.state, projects]);

  const filtered = useMemo(() => {
    return visits
      .filter(v => {
        if (statusFilter !== "all" && v.status !== statusFilter) return false;
        if (projectFilter !== "all" && v.projectId !== projectFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [visits, statusFilter, projectFilter]);

  const totalBreaches = visits.reduce((s, v) => s + v.breachCount, 0);
  const totalCompleted = visits.filter(v => v.status === "completed").length;
  const totalDraft     = visits.filter(v => v.status === "draft").length;

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
            { label: "Visits", value: visits.length, bg: "rgba(255,255,255,0.15)", text: "white" },
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
        {projects.length > 1 && (
          <div className="flex gap-2 px-4 pb-2.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setProjectFilter("all")}
              className="flex-shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1 transition-all"
              style={{
                background: projectFilter === "all" ? "#1B4332" : "white",
                color:      projectFilter === "all" ? "white" : "#6B7280",
                border: `1px solid ${projectFilter === "all" ? "#1B4332" : "#E5E7EB"}`,
                fontSize: "0.68rem",
              }}
            >
              <Filter size={9} />
              All Projects
            </button>
            {projects.map(p => (
              <button
                key={p.id}
                onClick={() => setProjectFilter(p.id)}
                className="flex-shrink-0 rounded-full px-3 py-1 transition-all"
                style={{
                  background: projectFilter === p.id ? "#1B4332" : "white",
                  color:      projectFilter === p.id ? "white" : "#6B7280",
                  border: `1px solid ${projectFilter === p.id ? "#1B4332" : "#E5E7EB"}`,
                  fontSize: "0.68rem", whiteSpace: "nowrap",
                }}
              >
                {p.tabLabel}
              </button>
            ))}
          </div>
        )}
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
