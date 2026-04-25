import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft, CheckCircle2, AlertCircle, Trees,
  User, Calendar, FileText, ChevronRight, AlertTriangle, Clock,
} from "lucide-react";
import {
  MOCK_VISITS, VISIT_TYPE_SHORT, VISIT_TYPE_COLORS,
} from "../../data/visitsData";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function compliancePct(inspected: number, breaches: number) {
  if (inspected === 0) return 100;
  return Math.round(((inspected - breaches) / inspected) * 100);
}

const TPM_COLORS = {
  "compliant":     { bg: "#DCFCE7", text: "#15803D", label: "Compliant" },
  "not-compliant": { bg: "#FEE2E2", text: "#DC2626", label: "Not Compliant" },
  "pending":       { bg: "#FEF3C7", text: "#B45309", label: "Pending" },
} as const;

const HEALTH_COLORS: Record<string, { color: string }> = {
  "Good": { color: "#15803D" },
  "Fair": { color: "#B45309" },
  "Poor": { color: "#DC2626" },
  "Dead": { color: "#6B7280" },
};

export function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "trees">("overview");

  const visit = MOCK_VISITS.find(v => v.id === id);

  if (!visit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
        <Calendar size={40} color="#9CA3AF" />
        <p style={{ color: "#374151", fontSize: "0.95rem", fontWeight: 700 }}>Visit not found</p>
        <button
          onClick={() => navigate("/visits")}
          className="px-5 py-2.5 rounded-xl text-white"
          style={{ background: "#1B4332", fontSize: "0.85rem" }}
        >
          Back to Visits
        </button>
      </div>
    );
  }

  const cfg    = VISIT_TYPE_COLORS[visit.type];
  const pct    = compliancePct(visit.inspectedTrees, visit.breachCount);
  const isDraft = visit.status === "draft";

  return (
    <div className="pb-28">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <button
          onClick={() => navigate("/visits")}
          className="flex items-center gap-1.5 mb-4"
          style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}
        >
          <ChevronLeft size={16} /> Visit Log
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="rounded-lg px-2.5 py-1 flex-shrink-0"
                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                <span style={{ color: cfg.text, fontSize: "0.65rem", fontWeight: 700 }}>
                  {VISIT_TYPE_SHORT[visit.type]}
                </span>
              </span>
              {isDraft && (
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                  style={{ background: "rgba(251,191,36,0.25)", border: "1px solid rgba(251,191,36,0.4)" }}>
                  <Clock size={9} color="#FCD34D" />
                  <span style={{ color: "#FCD34D", fontSize: "0.6rem", fontWeight: 700 }}>Draft</span>
                </span>
              )}
            </div>
            <h1 style={{ color: "white", fontSize: "1.05rem", fontWeight: 700, lineHeight: 1.3 }}>
              {visit.type}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem", marginTop: 3 }}>
              {visit.projectName}
            </p>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} color="rgba(255,255,255,0.6)" />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.72rem" }}>
              {new Date(visit.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={12} color="rgba(255,255,255,0.6)" />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.72rem" }}>{visit.inspector}</span>
          </div>
        </div>
      </div>

      {/* Compliance ring card */}
      <div
        className="mx-4 -mt-4 rounded-2xl px-4 py-3 flex items-center gap-4"
        style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
      >
        <div
          className="rounded-2xl flex flex-col items-center justify-center flex-shrink-0"
          style={{
            width: 64, height: 64,
            background: visit.breachCount > 0 ? "#FEF2F2" : "#F0FDF4",
            border: `2px solid ${visit.breachCount > 0 ? "#FECACA" : "#BBF7D0"}`,
          }}
        >
          <span style={{ color: visit.breachCount > 0 ? "#DC2626" : "#15803D",
            fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>
            {pct}%
          </span>
          <span style={{ color: visit.breachCount > 0 ? "#B91C1C" : "#166534",
            fontSize: "0.52rem", fontWeight: 600, textTransform: "uppercase" }}>
            Comply
          </span>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          {[
            { icon: Trees, label: `${visit.inspectedTrees}/${visit.totalTrees} trees inspected`, color: "#374151" },
            visit.noChangeTrees > 0 && { icon: CheckCircle2, label: `${visit.noChangeTrees} inherited from previous`, color: "#15803D" },
            visit.breachCount > 0  && { icon: AlertCircle,  label: `${visit.breachCount} breach${visit.breachCount !== 1 ? "es" : ""} recorded`, color: "#DC2626" },
          ].filter(Boolean).map((item, i) => {
            if (!item) return null;
            const { icon: Icon, label, color } = item as { icon: typeof Trees; label: string; color: string };
            return (
              <div key={i} className="flex items-center gap-1.5">
                <Icon size={12} color={color} />
                <span style={{ color, fontSize: "0.72rem" }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-5 rounded-xl overflow-hidden" style={{ background: "#F3F4F6" }}>
        {(["overview", "trees"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 capitalize transition-all"
            style={{
              background:   activeTab === tab ? "#1B4332" : "transparent",
              color:        activeTab === tab ? "white"   : "#6B7280",
              fontSize:     "0.8rem",
              fontWeight:   activeTab === tab ? 600 : 400,
              borderRadius: "0.75rem",
            }}
          >
            {tab === "trees" ? `Trees (${visit.treeInspections.length})` : "Overview"}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 flex flex-col gap-3">

        {/* Overview tab */}
        {activeTab === "overview" && (
          <>
            {/* Notes */}
            {visit.notes && (
              <div className="rounded-2xl p-4"
                style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={13} color="#6B7280" />
                  <p style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>Visit Notes</p>
                </div>
                <p style={{ color: "#374151", fontSize: "0.82rem", lineHeight: 1.6 }}>{visit.notes}</p>
              </div>
            )}

            {/* Breach alert */}
            {visit.breachCount > 0 && (
              <div className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: "#FEF2F2", border: "1.5px solid #FECACA" }}>
                <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ color: "#DC2626", fontSize: "0.85rem", fontWeight: 700 }}>
                    {visit.breachCount} TPZ Breach{visit.breachCount !== 1 ? "es" : ""} Recorded
                  </p>
                  <p style={{ color: "#B91C1C", fontSize: "0.75rem", marginTop: 3, lineHeight: 1.5 }}>
                    Compliance actions required. See individual tree records below.
                  </p>
                </div>
              </div>
            )}

            {/* Detail rows */}
            <div className="rounded-2xl px-4 py-1"
              style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              {[
                { label: "Visit Date",      value: formatDate(visit.date) },
                { label: "Visit Type",      value: visit.type },
                { label: "Inspector",       value: visit.inspector },
                { label: "Project",         value: visit.projectName },
                { label: "Total Trees",     value: String(visit.totalTrees) },
                { label: "Trees Inspected", value: String(visit.inspectedTrees) },
                { label: "No Change",       value: String(visit.noChangeTrees) },
                { label: "Breaches",        value: String(visit.breachCount) },
                { label: "Status",          value: visit.status === "completed" ? "Completed" : "Draft" },
              ].map(({ label, value }) => (
                <div key={label}
                  className="flex items-start justify-between py-3 gap-4"
                  style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#6B7280", fontSize: "0.82rem", flexShrink: 0 }}>{label}</span>
                  <span style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 500,
                    textAlign: "right", lineHeight: 1.4 }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {/* Export prompt */}
            <button
              onClick={() => {/* TODO */}}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              style={{ background: "white", border: "1.5px solid #1B4332" }}
            >
              <FileText size={16} color="#1B4332" />
              <span style={{ color: "#1B4332", fontSize: "0.85rem", fontWeight: 700 }}>
                Export Visit Report (PDF)
              </span>
            </button>
          </>
        )}

        {/* Trees tab */}
        {activeTab === "trees" && (
          visit.treeInspections.length === 0 ? (
            <div className="rounded-2xl px-4 py-8 text-center"
              style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}>
              <Trees size={28} color="#D1D5DB" className="mx-auto mb-2" />
              <p style={{ color: "#6B7280", fontSize: "0.82rem" }}>
                Detailed tree records not available for this visit
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visit.treeInspections.map(insp => {
                const tpm   = TPM_COLORS[insp.tpmCompliance];
                const hlth  = HEALTH_COLORS[insp.health];
                const isBreach = insp.tpmCompliance === "not-compliant";
                return (
                  <div key={insp.treeId}
                    className="rounded-2xl p-4"
                    style={{
                      background: "white",
                      border: `1.5px solid ${isBreach ? "#FECACA" : "#F3F4F6"}`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                    }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded font-mono"
                            style={{ background: "#1B4332", color: "white",
                              fontSize: "0.65rem", fontWeight: 700, padding: "1px 7px" }}>
                            {insp.treeId}
                          </span>
                          {insp.noChange && (
                            <span style={{ color: "#9CA3AF", fontSize: "0.65rem" }}>Inherited from last visit</span>
                          )}
                        </div>
                        <p style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 500,
                          fontStyle: "italic", marginTop: 4, lineHeight: 1.3 }}>
                          {insp.botanicalName}
                        </p>
                        <p style={{ color: "#9CA3AF", fontSize: "0.68rem", marginTop: 1 }}>
                          {insp.location}
                        </p>
                      </div>
                      <span className="rounded-full px-2 py-0.5 flex-shrink-0"
                        style={{ background: tpm.bg, color: tpm.text,
                          fontSize: "0.62rem", fontWeight: 700 }}>
                        {tpm.label}
                      </span>
                    </div>

                    {!insp.noChange && (insp.health || insp.damage) && (
                      <div className="flex gap-2 flex-wrap">
                        {insp.health && (
                          <span className="rounded-full px-2.5 py-0.5"
                            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                            <span style={{ color: hlth?.color ?? "#374151",
                              fontSize: "0.65rem", fontWeight: 600 }}>
                              Health: {insp.health}
                            </span>
                          </span>
                        )}
                        {insp.damage && (
                          <span className="rounded-full px-2.5 py-0.5"
                            style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                            <span style={{ color: insp.damage === "Yes" ? "#DC2626" : "#374151",
                              fontSize: "0.65rem", fontWeight: 600 }}>
                              Damage: {insp.damage}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {insp.notes && (
                      <p style={{ color: "#4B5563", fontSize: "0.75rem",
                        marginTop: 8, lineHeight: 1.5, borderTop: "1px solid #F9FAFB", paddingTop: 8 }}>
                        {insp.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}