import React, { useState } from "react";
import { useNavigate } from "react-router";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Database,
} from "lucide-react";
import { PROJECT, COMPLIANCE_ZONES, OBSERVATIONS, TREES } from "../../data/mockData";
import { useSelectedProject } from "../../context/ProjectContext";

function ComplianceBar({ score }: { score: number }) {
  const color =
    score >= 80 ? "#16A34A" : score >= 60 ? "#D97706" : "#DC2626";

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 8, background: "#E5E7EB" }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`,
          }}
        />
      </div>
      <span style={{ color, fontSize: "0.85rem", fontWeight: 700, minWidth: 36 }}>
        {score}%
      </span>
    </div>
  );
}

function RequirementItem({
  label,
  status,
  detail,
}: {
  label: string;
  status: "pass" | "fail" | "warning" | "pending";
  detail?: string;
}) {
  const config = {
    pass: { icon: CheckCircle2, color: "#15803D", bg: "#DCFCE7", label: "Pass" },
    fail: { icon: XCircle, color: "#DC2626", bg: "#FEE2E2", label: "Fail" },
    warning: { icon: AlertTriangle, color: "#D97706", bg: "#FEF3C7", label: "Warning" },
    pending: { icon: Clock, color: "#6B7280", bg: "#F3F4F6", label: "Pending" },
  };
  const { icon: Icon, color, bg, label: statusLabel } = config[status];

  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
      <div className="rounded-lg p-1.5 flex-shrink-0" style={{ background: bg }}>
        <Icon size={14} color={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ color: "#111827", fontSize: "0.85rem", fontWeight: 500 }}>{label}</p>
        {detail && (
          <p style={{ color: "#6B7280", fontSize: "0.75rem", marginTop: 1, lineHeight: 1.4 }}>
            {detail}
          </p>
        )}
      </div>
      <span
        className="flex-shrink-0 px-2 py-0.5 rounded-full"
        style={{ background: bg, color, fontSize: "0.68rem", fontWeight: 700 }}
      >
        {statusLabel}
      </span>
    </div>
  );
}

export function CompliancePage() {
  const navigate = useNavigate();
  const { project: selectedProject } = useSelectedProject();

  // Guard: projects haven't loaded yet
  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="rounded-2xl animate-pulse" style={{ width: 280, height: 180, background: "#E5E7EB" }} />
      </div>
    );
  }

  const isLiveProject = selectedProject.id === "parliament-vic";

  // Use live compliance data for Parliament, projectsData stats for others
  const complianceScore = isLiveProject
    ? PROJECT.overallCompliance
    : selectedProject.overallCompliance;

  const [activeZone, setActiveZone] = useState<string | null>(null);

  const unresolvedObs = OBSERVATIONS.filter((o) => !o.resolved);
  const criticalObs = OBSERVATIONS.filter((o) => o.severity === "critical" && !o.resolved);

  const overallColor =
    complianceScore >= 80
      ? "#15803D"
      : complianceScore >= 60
      ? "#D97706"
      : "#DC2626";

  const requirements = [
    {
      label: "Tree Protection Fencing Installed",
      status: "pass" as const,
      detail: "All 8 trees have physical barriers in place",
    },
    {
      label: "No Active Stop-Work Orders",
      status: criticalObs.length > 0 ? ("fail" as const) : ("pass" as const),
      detail:
        criticalObs.length > 0
          ? `${criticalObs.length} critical observation(s) unresolved – T003 root damage`
          : "No active stop-work orders",
    },
    {
      label: "Monthly Inspection Completed",
      status: "pass" as const,
      detail: "Last full inspection: 28 March 2026",
    },
    {
      label: "Scaffold Clearance from TPZ",
      status: "warning" as const,
      detail: "T002 scaffold within buffer zone. Relocation required.",
    },
    {
      label: "No Unauthorized Soil Compaction",
      status: "warning" as const,
      detail: "Compaction detected in Zone A. Assessment pending.",
    },
    {
      label: "Ground Protection Mats in Place",
      status: "fail" as const,
      detail: "T007 TPZ has no ground protection. Materials stored on bare soil.",
    },
    {
      label: "Contractor Tree Briefing Completed",
      status: "pass" as const,
      detail: "All active contractors signed off — 12 Mar 2026",
    },
    {
      label: "Arboricultural Method Statement",
      status: "pass" as const,
      detail: "AMS approved by Southwark Council — Jan 2026",
    },
    {
      label: "TPZ Root Investigation Report",
      status: "pending" as const,
      detail: "Required following T003 root damage — due 3 Apr 2026",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Compliance
        </p>
        <h1 style={{ color: "white", fontSize: "1.25rem", fontWeight: 700, marginTop: 2, marginBottom: !isLiveProject ? 8 : 14 }}>
          {selectedProject.name}
        </h1>

        {/* Non-live notice */}
        {!isLiveProject && (
          <div
            className="flex items-center gap-2 mb-4 rounded-xl px-3 py-2"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Database size={13} color="rgba(255,255,255,0.6)" />
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.68rem" }}>
              Showing Parliament of Victoria data — full compliance records for this project aren't loaded yet
            </p>
          </div>
        )}

        {/* Score Card */}
        <div className="rounded-2xl p-4 flex items-center gap-5" style={{ background: "rgba(255,255,255,0.13)" }}>
          {/* Donut */}
          <div className="relative flex-shrink-0" style={{ width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="40"
                cy="40"
                r="32"
                fill="none"
                stroke={overallColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(complianceScore / 100) * 201} 201`}
                transform="rotate(-90 40 40)"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span style={{ color: "white", fontSize: "1.1rem", fontWeight: 700 }}>
                {complianceScore}%
              </span>
            </div>
          </div>

          <div>
            <p style={{ color: "white", fontSize: "0.95rem", fontWeight: 600 }}>
              Overall Score
            </p>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.75rem", marginTop: 2 }}>
              {selectedProject.reference}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div
                className="px-2.5 py-1 rounded-full"
                style={{
                  background:
                    complianceScore >= 80
                      ? "#DCFCE7"
                      : complianceScore >= 60
                      ? "#FEF3C7"
                      : "#FEE2E2",
                }}
              >
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: overallColor,
                  }}
                >
                  {complianceScore >= 80
                    ? "On Track"
                    : complianceScore >= 60
                    ? "Needs Attention"
                    : "Non-Compliant"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Banner */}
      {criticalObs.length > 0 && (
        <button
          onClick={() => navigate("/observations")}
          className="mx-4 mt-4 w-[calc(100%-2rem)] rounded-2xl p-4 flex items-center gap-3 text-left"
          style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}
        >
          <div className="rounded-xl p-2" style={{ background: "#FEE2E2" }}>
            <ShieldAlert size={20} color="#DC2626" />
          </div>
          <div className="flex-1">
            <p style={{ color: "#DC2626", fontSize: "0.88rem", fontWeight: 700 }}>
              {criticalObs.length} Critical Issue{criticalObs.length !== 1 ? "s" : ""} Active
            </p>
            <p style={{ color: "#EF4444", fontSize: "0.75rem" }}>
              Immediate action required · Tap to view
            </p>
          </div>
          <ChevronRight size={18} color="#DC2626" />
        </button>
      )}

      {/* Zone Scores */}
      <div className="px-4 mt-4">
        <p style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Zone Breakdown
        </p>

        <div className="flex flex-col gap-3">
          {COMPLIANCE_ZONES.map((zone) => (
            <div key={zone.id}>
              <button
                onClick={() => setActiveZone(activeZone === zone.id ? null : zone.id)}
                className="w-full rounded-2xl p-4 text-left"
                style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 600 }}>
                      {zone.name}
                    </p>
                    <p style={{ color: "#6B7280", fontSize: "0.73rem" }}>
                      {zone.trees} tree{zone.trees !== 1 ? "s" : ""} ·{" "}
                      {zone.issues > 0 ? (
                        <span style={{ color: "#D97706" }}>{zone.issues} issue{zone.issues !== 1 ? "s" : ""}</span>
                      ) : (
                        <span style={{ color: "#15803D" }}>No issues</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    color="#9CA3AF"
                    style={{
                      transform: activeZone === zone.id ? "rotate(90deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </div>
                <ComplianceBar score={zone.score} />
                <p style={{ color: "#9CA3AF", fontSize: "0.68rem", marginTop: 6 }}>
                  Last audit: {zone.lastAudit}
                </p>
              </button>

              {/* Zone trees expanded */}
              {activeZone === zone.id && (
                <div
                  className="mx-2 rounded-b-2xl px-4 pb-3 pt-2"
                  style={{ background: "#F9FAFB", border: "1px solid #F3F4F6", borderTop: "none" }}
                >
                  {TREES.filter((t) => t.zone === zone.name.split("–")[0].trim()).map((tree) => (
                    <button
                      key={tree.id}
                      onClick={() => navigate(`/trees/${tree.id}`)}
                      className="w-full flex items-center gap-3 py-2.5"
                      style={{ borderBottom: "1px solid #F3F4F6" }}
                    >
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: 8,
                          height: 8,
                          background:
                            tree.status === "compliant"
                              ? "#16A34A"
                              : tree.status === "at-risk"
                              ? "#F59E0B"
                              : tree.status === "flagged"
                              ? "#EF4444"
                              : "#9CA3AF",
                        }}
                      />
                      <span style={{ color: "#374151", fontSize: "0.82rem", fontWeight: 500, flex: 1, textAlign: "left" }}>
                        {tree.id} – {tree.commonName}
                      </span>
                      <ChevronRight size={14} color="#9CA3AF" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="px-4 mt-5">
        <p style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Compliance Requirements
        </p>
        <div
          className="rounded-2xl px-4 py-1"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {requirements.map((req, i) => (
            <RequirementItem key={i} {...req} />
          ))}
        </div>
      </div>

      {/* Key Dates */}
      <div className="px-4 mt-5">
        <p style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Key Dates
        </p>
        <div
          className="rounded-2xl px-4 py-2"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          {[
            { label: "Site Start Date", value: selectedProject.startDate, icon: TrendingUp },
            { label: "Next Audit",      value: selectedProject.nextAudit,  icon: Clock,     highlight: true },
            { label: "Planning End Date", value: selectedProject.endDate,  icon: FileText },
          ].map(({ label, value, icon: Icon, highlight }) => (
            <div
              key={label}
              className="flex items-center justify-between py-3"
              style={{ borderBottom: "1px solid #F3F4F6" }}
            >
              <div className="flex items-center gap-2.5">
                <Icon size={15} color={highlight ? "#D97706" : "#6B7280"} />
                <span style={{ color: "#374151", fontSize: "0.83rem" }}>{label}</span>
              </div>
              <span
                style={{
                  color: highlight ? "#D97706" : "#111827",
                  fontSize: "0.83rem",
                  fontWeight: highlight ? 700 : 500,
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Report Button */}
      <div className="px-4 mt-5 pb-4">
        <button
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2.5"
          style={{ background: "#1B4332" }}
        >
          <FileText size={20} color="white" />
          <span style={{ color: "white", fontSize: "0.92rem", fontWeight: 600 }}>
            Generate Compliance Report
          </span>
        </button>
      </div>
    </div>
  );
}