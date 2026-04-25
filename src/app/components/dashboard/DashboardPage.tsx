import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  Trees,
  AlertTriangle,
  XOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Bell,
  ShieldCheck,
  MapPin,
  Check,
  AlertCircle,
  Calendar,
  FolderPlus,
  TreePine,
} from "lucide-react";
import { OBSERVATIONS } from "../../data/mockData";
import { type ProjectData } from "../../data/projectsData";
import { CreateProjectSheet } from "./CreateProjectSheet";
import { AddTreeSheet } from "./AddTreeSheet";
import { useProject } from "../../context/ProjectContext";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseTreeName(treeName: string): { id: string; species: string } {
  const parts = treeName.split(" – ");
  return { id: parts[0] ?? treeName, species: parts[1] ?? "" };
}

// ─── Severity config ────────────────────────────────────────────────────────

const SEVERITY = {
  critical: { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", label: "Critical", dot: "#DC2626" },
  high:     { bg: "#FFF7ED", border: "#FDBA74", text: "#EA580C", label: "High",     dot: "#EA580C" },
  medium:   { bg: "#FEFCE8", border: "#FDE047", text: "#CA8A04", label: "Medium",   dot: "#CA8A04" },
  low:      { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A", label: "Low",      dot: "#16A34A" },
} as const;

// ─── Sub-components ─────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: keyof typeof SEVERITY }) {
  const s = SEVERITY[severity];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 flex-shrink-0"
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      <span className="rounded-full" style={{ width: 5, height: 5, background: s.dot, display: "inline-block", flexShrink: 0 }} />
      <span style={{ color: s.text, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.02em" }}>{s.label}</span>
    </span>
  );
}

function StatCard({
  icon, label, value, bg, color, onClick,
}: {
  icon: React.ReactNode; label: string; value: number; bg: string; color: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 min-w-0 rounded-2xl flex flex-col items-center py-4 px-2 gap-1.5 active:scale-95 transition-transform"
      style={{ background: bg }}
    >
      <div style={{ color }}>{icon}</div>
      <span style={{ fontSize: "1.55rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "0.62rem", color, opacity: 0.75, letterSpacing: "0.02em", textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </button>
  );
}

// ─── Project Dropdown ────────────────────────────────────────────────────────

function ProjectDropdown({
  projects,
  selectedId,
  onSelect,
}: {
  projects: ProjectData[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find(p => p.id === selectedId) ?? projects[0];

  const statusColors: Record<ProjectData["status"], string> = {
    active:     "#16A34A",
    monitoring: "#CA8A04",
    completed:  "#9CA3AF",
  };

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger row */}
      <div className="px-4 pt-12 pb-3" style={{ background: "#1B4332" }}>
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Current Project
        </p>
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 active:opacity-80 transition-opacity"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="rounded-full flex-shrink-0"
              style={{ width: 7, height: 7, background: statusColors[selected.status] }}
            />
            <span style={{ color: "white", fontSize: "0.92rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selected.name}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.65rem" }}>{projects.length} projects</span>
            <ChevronDown size={14} color="rgba(255,255,255,0.6)" />
          </div>
        </button>
      </div>

      {/* Overlay */}
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
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="rounded-full" style={{ width: 36, height: 4, background: "#E5E7EB" }} />
            </div>

            {/* Header */}
            <div className="px-5 py-3 border-b" style={{ borderColor: "#F3F4F6" }}>
              <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 700 }}>Switch Project</p>
              <p style={{ color: "#6B7280", fontSize: "0.75rem", marginTop: 2 }}>Melbourne Tree Care active sites</p>
            </div>

            {/* Project list */}
            <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {projects.map((p) => {
                const isActive = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className="w-full flex items-center gap-3.5 px-5 py-4 text-left active:bg-gray-50 transition-colors"
                    style={{ borderBottom: "1px solid #F9FAFB" }}
                  >
                    {/* Status dot */}
                    <span
                      className="rounded-full flex-shrink-0"
                      style={{ width: 8, height: 8, background: statusColors[p.status] }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: isActive ? 700 : 500 }}>
                        {p.name}
                      </p>
                      <p style={{ color: "#9CA3AF", fontSize: "0.72rem", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.site}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span style={{ color: "#6B7280", fontSize: "0.68rem" }}>{p.totalTrees} trees</span>
                        <span style={{ color: "#E5E7EB" }}>·</span>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            color: statusColors[p.status],
                            textTransform: "capitalize",
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>

                    {/* Check */}
                    {isActive && (
                      <div
                        className="rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ width: 24, height: 24, background: "#1B4332" }}
                      >
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export function DashboardPage() {
  const navigate = useNavigate();
  const { selectedProjectId: selectedId, setSelectedProjectId: setSelectedId, projects, loadingProjects } = useProject();
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showAddTree, setShowAddTree] = useState(false);

  // Loading guard — projects are fetched async from Supabase
  if (loadingProjects || projects.length === 0) {
    return (
      <div className="pb-28">
        <div className="px-4 pt-12 pb-3" style={{ background: "#1B4332" }}>
          <div className="w-full rounded-xl px-3.5 py-2.5 animate-pulse" style={{ height: 44, background: "rgba(255,255,255,0.1)" }} />
        </div>
        <div className="px-4 mt-4 flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 100, background: "#E5E7EB" }} />
          ))}
        </div>
      </div>
    );
  }

  const project = projects.find((p) => p.id === selectedId) ?? projects[0];
  const isLiveProject = project.id === "parliament-vic";

  const unresolvedObs = isLiveProject
    ? OBSERVATIONS.filter(o => !o.resolved)
    : [];
  const criticalCount = isLiveProject
    ? OBSERVATIONS.filter(o => o.severity === "critical" && !o.resolved).length
    : project.criticalObs;
  const unresolvedCount = isLiveProject ? unresolvedObs.length : project.unresolvedObs;

  // Sort: critical first, then high, then others
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedAlerts = [...unresolvedObs].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  const complianceColor =
    project.overallCompliance >= 80 ? "#16A34A"
    : project.overallCompliance >= 60 ? "#D97706"
    : "#DC2626";

  const complianceLabel =
    project.overallCompliance >= 80 ? "Good"
    : project.overallCompliance >= 60 ? "Moderate"
    : "Poor";

  return (
    <div className="pb-28 relative">

      {/* ── Project selector ── */}
      <ProjectDropdown
        projects={projects}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {/* ── Project header ── */}
      <div
        className="px-4 pb-5"
        style={{ background: "linear-gradient(175deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 style={{ color: "white", fontSize: "1.3rem", fontWeight: 800, lineHeight: 1.2 }}>
              {project.name}
            </h1>
            <div className="flex items-start gap-1 mt-1.5">
              <MapPin size={11} color="rgba(255,255,255,0.5)" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.73rem", lineHeight: 1.4 }}>
                {project.site}
              </p>
            </div>
            <p style={{ color: "rgba(255,255,255,0.42)", fontSize: "0.67rem", marginTop: 3 }}>
              {project.client} · {project.reference}
            </p>
          </div>

          {/* Critical badge */}
          {criticalCount > 0 && (
            <div
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 flex-shrink-0"
              style={{ background: "#DC2626" }}
            >
              <Bell size={11} color="white" />
              <span style={{ color: "white", fontSize: "0.68rem", fontWeight: 700 }}>
                {criticalCount} Critical
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Content cards ── */}
      <div className="px-4 -mt-1 flex flex-col gap-4">

        {/* ── Compliance card ── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "white", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
        >
          <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Site Compliance
          </p>
          <div className="flex items-center gap-5">
            {/* Ring */}
            <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: 80, height: 80 }}>
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="33" fill="none" stroke="#F3F4F6" strokeWidth="7" />
                <circle
                  cx="40" cy="40" r="33"
                  fill="none"
                  stroke={complianceColor}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${(project.overallCompliance / 100) * 207.3} 207.3`}
                  transform="rotate(-90 40 40)"
                  style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
              </svg>
              <div className="absolute text-center">
                <div style={{ color: "#111827", fontSize: "1.1rem", fontWeight: 800, lineHeight: 1 }}>
                  {project.overallCompliance}%
                </div>
                <div style={{ color: complianceColor, fontSize: "0.55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {complianceLabel}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <AlertCircle size={13} color={unresolvedCount > 0 ? "#EA580C" : "#9CA3AF"} />
                  <span style={{ color: "#374151", fontSize: "0.78rem" }}>Unresolved issues</span>
                </div>
                <span style={{ color: unresolvedCount > 0 ? "#EA580C" : "#16A34A", fontSize: "0.82rem", fontWeight: 700 }}>
                  {unresolvedCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} color="#9CA3AF" />
                  <span style={{ color: "#374151", fontSize: "0.78rem" }}>Next audit</span>
                </div>
                <span style={{ color: "#111827", fontSize: "0.8rem", fontWeight: 600 }}>
                  {new Date(project.nextAudit).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} color="#9CA3AF" />
                  <span style={{ color: "#374151", fontSize: "0.78rem" }}>Status</span>
                </div>
                <span
                  className="rounded-full px-2 py-0.5"
                  style={{
                    background: project.status === "active" ? "#DCFCE7" : project.status === "monitoring" ? "#FEF3C7" : "#F3F4F6",
                    color: project.status === "active" ? "#15803D" : project.status === "monitoring" ? "#D97706" : "#6B7280",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textTransform: "capitalize",
                  }}
                >
                  {project.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tree summary ── */}
        <div>
          <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Tree Summary
          </p>
          <div className="flex gap-2.5">
            <StatCard
              icon={<CheckCircle2 size={18} />}
              label="Compliant"
              value={project.compliantTrees}
              bg="#DCFCE7"
              color="#15803D"
              onClick={() => navigate("/trees?status=compliant")}
            />
            <StatCard
              icon={<AlertTriangle size={18} />}
              label="At Risk"
              value={project.atRiskTrees}
              bg="#FFF7ED"
              color="#EA580C"
              onClick={() => navigate("/trees?status=at-risk")}
            />
            <StatCard
              icon={<XOctagon size={18} />}
              label="Flagged"
              value={project.flaggedTrees}
              bg="#FEF2F2"
              color="#DC2626"
              onClick={() => navigate("/trees?status=flagged")}
            />
            <StatCard
              icon={<Trees size={18} />}
              label="Total"
              value={project.totalTrees}
              bg="#F0FDF4"
              color="#166534"
              onClick={() => navigate("/trees")}
            />
          </div>
        </div>

        {/* ── Active Alerts ── */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Active Alerts
            </p>
            {(isLiveProject ? unresolvedObs.length : unresolvedCount) > 0 && (
              <button
                onClick={() => navigate("/observations")}
                className="flex items-center gap-0.5"
                style={{ color: "#2D5A27", fontSize: "0.75rem", fontWeight: 500 }}
              >
                See all <ChevronRight size={13} />
              </button>
            )}
          </div>

          {isLiveProject && sortedAlerts.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {sortedAlerts.slice(0, 4).map((obs) => {
                const { id: treeId, species } = parseTreeName(obs.treeName);
                const sev = obs.severity as keyof typeof SEVERITY;
                const s = SEVERITY[sev];
                return (
                  <button
                    key={obs.id}
                    onClick={() => navigate(`/observations/${obs.id}`)}
                    className="w-full text-left rounded-2xl overflow-hidden active:scale-98 transition-transform"
                    style={{
                      background: "white",
                      boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
                      border: `1px solid ${s.border}`,
                    }}
                  >
                    {/* Severity stripe */}
                    <div style={{ height: 3, background: s.dot }} />

                    <div className="p-3.5">
                      {/* Top row: Tree ID + species + badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="rounded-lg px-2 py-0.5 font-mono"
                              style={{ background: "#F3F4F6", color: "#374151", fontSize: "0.72rem", fontWeight: 700 }}
                            >
                              {treeId}
                            </span>
                            <span style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 600, fontStyle: "italic" }}>
                              {species}
                            </span>
                          </div>
                          <p style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 2 }}>
                            {obs.type}
                          </p>
                        </div>
                        <SeverityBadge severity={sev} />
                      </div>

                      {/* Description */}
                      <p
                        className="line-clamp-2"
                        style={{ color: "#4B5563", fontSize: "0.78rem", lineHeight: 1.5 }}
                      >
                        {obs.description}
                      </p>

                      {/* Footer: date */}
                      <div className="flex items-center gap-1 mt-2.5">
                        <Calendar size={11} color="#9CA3AF" />
                        <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>
                          {new Date(obs.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : !isLiveProject && unresolvedCount > 0 ? (
            /* Placeholder for non-live projects */
            <div
              className="rounded-2xl px-4 py-4 flex items-center gap-3"
              style={{
                background: criticalCount > 0 ? "#FEF2F2" : "#FFF7ED",
                border: `1px solid ${criticalCount > 0 ? "#FECACA" : "#FDBA74"}`,
              }}
            >
              <AlertCircle size={18} color={criticalCount > 0 ? "#DC2626" : "#EA580C"} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ color: criticalCount > 0 ? "#DC2626" : "#EA580C", fontSize: "0.83rem", fontWeight: 600 }}>
                  {unresolvedCount} unresolved issue{unresolvedCount !== 1 ? "s" : ""}
                  {criticalCount > 0 ? ` · ${criticalCount} critical` : ""}
                </p>
                <p style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 2 }}>
                  Detailed alerts available when this project is fully loaded
                </p>
              </div>
            </div>
          ) : (
            <div
              className="rounded-2xl px-4 py-5 flex flex-col items-center gap-2"
              style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <CheckCircle2 size={22} color="#16A34A" />
              <p style={{ color: "#15803D", fontSize: "0.82rem", fontWeight: 600 }}>No active alerts</p>
              <p style={{ color: "#4ADE80", fontSize: "0.72rem" }}>All issues resolved</p>
            </div>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
            Quick Actions
          </p>

          <div className="flex gap-3">
            {/* ── Create New Project ── */}
            <button
              onClick={() => setShowCreateProject(true)}
              className="flex-1 rounded-2xl p-4 text-left active:scale-95 transition-transform flex flex-col gap-3"
              style={{
                background: "linear-gradient(145deg, #1B4332 0%, #2D6A4F 100%)",
                boxShadow: "0 4px 16px rgba(27,67,50,0.3)",
              }}
            >
              <div
                className="rounded-xl flex items-center justify-center"
                style={{ width: 44, height: 44, background: "rgba(255,255,255,0.15)" }}
              >
                <FolderPlus size={22} color="white" />
              </div>
              <div>
                <p style={{ color: "white", fontSize: "0.88rem", fontWeight: 700, lineHeight: 1.2 }}>
                  Create New Project
                </p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.7rem", marginTop: 3, lineHeight: 1.4 }}>
                  Set up a new monitoring site
                </p>
              </div>
              <div
                className="mt-auto self-start rounded-full px-2.5 py-1 flex items-center gap-1"
                style={{ background: "rgba(255,255,255,0.15)" }}
              >
                <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.65rem", fontWeight: 600 }}>Open form</span>
                <ChevronRight size={11} color="rgba(255,255,255,0.7)" />
              </div>
            </button>

            {/* ── Add Tree to Project ── */}
            <button
              onClick={() => setShowAddTree(true)}
              className="flex-1 rounded-2xl p-4 text-left active:scale-95 transition-transform flex flex-col gap-3"
              style={{
                background: "white",
                boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
                border: "1.5px solid #E5E7EB",
              }}
            >
              <div
                className="rounded-xl flex items-center justify-center"
                style={{ width: 44, height: 44, background: "#F0FDF4" }}
              >
                <TreePine size={22} color="#2D5A27" />
              </div>
              <div>
                <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700, lineHeight: 1.2 }}>
                  Add Tree
                </p>
                <p style={{ color: "#9CA3AF", fontSize: "0.7rem", marginTop: 3, lineHeight: 1.4 }}>
                  Log to current project
                </p>
              </div>
              <div
                className="mt-auto self-start rounded-full px-2.5 py-1 flex items-center gap-1"
                style={{ background: "#F0FDF4" }}
              >
                <span
                  style={{ color: "#2D5A27", fontSize: "0.65rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 90 }}
                >
                  {project.name}
                </span>
                <ChevronRight size={11} color="#2D5A27" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Sheets ── */}
      <CreateProjectSheet
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />
      <AddTreeSheet
        open={showAddTree}
        onClose={() => setShowAddTree(false)}
        project={project}
        suggestedTreeId={`T${project.totalTrees + 1}`}
      />
    </div>
  );
}