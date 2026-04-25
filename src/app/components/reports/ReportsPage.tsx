import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  BarChart3, FileDown, CheckCircle2, AlertCircle,
  Trees, ClipboardCheck, ChevronRight, Archive,
  TrendingUp, Shield, Calendar, FileText,
} from "lucide-react";
import { MOCK_VISITS, VISIT_TYPE_SHORT, VISIT_TYPE_COLORS } from "../../data/visitsData";
import { useProject } from "../../context/ProjectContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

function pctColor(pct: number) {
  if (pct >= 90) return "#15803D";
  if (pct >= 70) return "#B45309";
  return "#DC2626";
}

function pctBg(pct: number) {
  if (pct >= 90) return "#DCFCE7";
  if (pct >= 70) return "#FEF3C7";
  return "#FEE2E2";
}

// ── Compliance bar ────────────────────────────────────────────────────────────

function ComplianceBar({ pct }: { pct: number }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "#F3F4F6" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span style={{ color, fontSize: "0.7rem", fontWeight: 700, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReportsPage() {
  const navigate = useNavigate();
  const { projects, selectedProjectId } = useProject();
  const [selectedProject, setSelectedProject] = useState<string>(selectedProjectId || "all");

  const project = projects.find(p => p.id === selectedProject);

  const projectVisits = useMemo(() =>
    MOCK_VISITS
      .filter(v => selectedProject === "all" || v.projectId === selectedProject)
      .filter(v => v.status === "completed")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [selectedProject]
  );

  const totalVisits    = projectVisits.length;
  const totalBreaches  = projectVisits.reduce((s, v) => s + v.breachCount, 0);
  const totalInspected = projectVisits.reduce((s, v) => s + v.inspectedTrees, 0);
  const avgCompliance  = totalInspected > 0
    ? Math.round(((totalInspected - totalBreaches) / totalInspected) * 100)
    : 100;

  const visitTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    projectVisits.forEach(v => {
      const k = VISIT_TYPE_SHORT[v.type];
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [projectVisits]);

  return (
    <div className="pb-32">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62rem",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
          Compliance
        </p>
        <h1 style={{ color: "white", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 }}>
          Reports
        </h1>

        {/* Project filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <button
            onClick={() => setSelectedProject("all")}
            className="flex-shrink-0 rounded-full px-3 py-1.5 transition-all"
            style={{
              background: selectedProject === "all" ? "white" : "rgba(255,255,255,0.15)",
              color:      selectedProject === "all" ? "#1B4332" : "rgba(255,255,255,0.85)",
              fontSize: "0.7rem", fontWeight: selectedProject === "all" ? 700 : 500,
            }}
          >
            All Projects
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id)}
              className="flex-shrink-0 rounded-full px-3 py-1.5 transition-all"
              style={{
                background: selectedProject === p.id ? "white" : "rgba(255,255,255,0.15)",
                color:      selectedProject === p.id ? "#1B4332" : "rgba(255,255,255,0.85)",
                fontSize: "0.7rem", fontWeight: selectedProject === p.id ? 700 : 500,
                whiteSpace: "nowrap",
              }}
            >
              {p.tabLabel}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">
        {/* Portfolio stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: ClipboardCheck, label: "Total Visits",      value: totalVisits,   color: "#1B4332",  bg: "#F0FDF4" },
            { icon: Shield,         label: "Avg Compliance",    value: `${avgCompliance}%`, color: pctColor(avgCompliance), bg: pctBg(avgCompliance) },
            { icon: AlertCircle,    label: "Total Breaches",    value: totalBreaches, color: totalBreaches > 0 ? "#DC2626" : "#15803D", bg: totalBreaches > 0 ? "#FEF2F2" : "#F0FDF4" },
            { icon: Trees,          label: "Trees Inspected",   value: totalInspected, color: "#1D4ED8", bg: "#EFF6FF" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="rounded-2xl p-4"
              style={{ background: bg, border: `1px solid ${color}22` }}>
              <Icon size={16} color={color} />
              <p style={{ color, fontSize: "1.4rem", fontWeight: 800, lineHeight: 1, marginTop: 6 }}>
                {value}
              </p>
              <p style={{ color: "#6B7280", fontSize: "0.65rem", marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Visit type breakdown */}
        {visitTypeBreakdown.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <p style={{ color: "#9CA3AF", fontSize: "0.62rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Visit Type Breakdown
            </p>
            <div className="flex flex-col gap-3">
              {visitTypeBreakdown.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <span style={{ color: "#374151", fontSize: "0.78rem", flex: 1 }}>{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full overflow-hidden" style={{ width: 60, height: 6, background: "#F3F4F6" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${(count / totalVisits) * 100}%`, background: "#1B4332" }} />
                    </div>
                    <span style={{ color: "#111827", fontSize: "0.75rem", fontWeight: 700, minWidth: 16 }}>
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance history timeline */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #F3F4F6" }}>
            <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700 }}>
              Visit History
            </p>
            <TrendingUp size={14} color="#9CA3AF" />
          </div>

          {projectVisits.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <ClipboardCheck size={28} color="#D1D5DB" className="mx-auto mb-2" />
              <p style={{ color: "#9CA3AF", fontSize: "0.82rem" }}>No completed visits yet</p>
            </div>
          ) : (
            <div>
              {projectVisits.map((v, i) => {
                const pct    = v.inspectedTrees > 0
                  ? Math.round(((v.inspectedTrees - v.breachCount) / v.inspectedTrees) * 100)
                  : 100;
                const cfg    = VISIT_TYPE_COLORS[v.type];
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/visits/${v.id}`)}
                    className="w-full px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
                    style={{ borderBottom: i < projectVisits.length - 1 ? "1px solid #F9FAFB" : "none" }}
                  >
                    <div className="flex items-center gap-3">
                      {/* Date block */}
                      <div className="rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background: "#F0FDF4", width: 38, height: 38 }}>
                        <span style={{ color: "#1B4332", fontSize: "0.85rem", fontWeight: 800, lineHeight: 1 }}>
                          {new Date(v.date).getDate()}
                        </span>
                        <span style={{ color: "#15803D", fontSize: "0.48rem", fontWeight: 600, textTransform: "uppercase" }}>
                          {new Date(v.date).toLocaleDateString("en-AU", { month: "short" })}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="rounded-full px-2 py-0.5"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <span style={{ color: cfg.text, fontSize: "0.58rem", fontWeight: 700 }}>
                              {VISIT_TYPE_SHORT[v.type]}
                            </span>
                          </span>
                          {v.breachCount > 0 && (
                            <span style={{ color: "#DC2626", fontSize: "0.62rem", fontWeight: 700 }}>
                              {v.breachCount} breach{v.breachCount !== 1 ? "es" : ""}
                            </span>
                          )}
                        </div>
                        <p style={{ color: "#6B7280", fontSize: "0.7rem" }}>
                          {v.inspectedTrees}/{v.totalTrees} trees · {v.inspector}
                        </p>
                        <ComplianceBar pct={pct} />
                      </div>

                      <ChevronRight size={13} color="#D1D5DB" style={{ flexShrink: 0 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Export options */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700 }}>Export</p>
            <p style={{ color: "#9CA3AF", fontSize: "0.72rem", marginTop: 1 }}>
              Full compliance history &amp; tree-by-tree records
            </p>
          </div>
          {[
            { icon: FileDown, label: "Export PDF Report",       sub: "Visit-by-visit compliance summary", color: "#DC2626", bg: "#FEF2F2" },
            { icon: FileText, label: "Export CSV — Full Log",   sub: "All visits, all trees, all fields",  color: "#1D4ED8", bg: "#EFF6FF" },
          ].map(({ icon: Icon, label, sub, color, bg }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3.5 px-4 py-4 active:bg-gray-50 text-left transition-colors"
              style={{ borderBottom: "1px solid #F9FAFB" }}
              onClick={() => {/* TODO: implement export */}}
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ width: 38, height: 38, background: bg }}>
                <Icon size={16} color={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 600 }}>{label}</p>
                <p style={{ color: "#9CA3AF", fontSize: "0.68rem", marginTop: 1 }}>{sub}</p>
              </div>
              <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {/* Archive project */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #FEE2E2" }}>
          <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid #FEE2E2" }}>
            <p style={{ color: "#DC2626", fontSize: "0.72rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.05em" }}>Project Actions</p>
          </div>
          <button
            className="w-full flex items-center gap-3.5 px-4 py-4 active:bg-red-50 text-left transition-colors"
            onClick={() => {/* TODO */}}
          >
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 38, height: 38, background: "#FEF2F2" }}>
              <Archive size={16} color="#DC2626" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: "#DC2626", fontSize: "0.82rem", fontWeight: 600 }}>
                Archive Project
              </p>
              <p style={{ color: "#9CA3AF", fontSize: "0.68rem", marginTop: 1 }}>
                Mark as complete and lock all records
              </p>
            </div>
            <ChevronRight size={14} color="#FECACA" style={{ flexShrink: 0 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
