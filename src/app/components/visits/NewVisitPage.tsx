import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft, ChevronDown, CheckCircle2, Clock,
  Trees, User, FileText, ChevronRight, AlertTriangle,
  Check, Minus, AlertCircle, ClipboardList,
} from "lucide-react";
import {
  ALL_VISIT_TYPES, VISIT_TYPE_SHORT, VISIT_TYPE_COLORS, type VisitType,
} from "../../data/visitsData";
import { useProject } from "../../context/ProjectContext";
import { supabase } from "../../../lib/supabase";
import { mapSupabaseTree, type SupabaseTree } from "../../data/treeMapper";

// ── Types ─────────────────────────────────────────────────────────────────────

type TPMStatus = "compliant" | "not-compliant" | "pending";
type TreeHealth = "Good" | "Fair" | "Poor" | "Dead" | "";
type TreeDamage = "Yes" | "No" | "";

interface TreeRecord {
  tree: SupabaseTree;
  noChange: boolean;
  tpmStatus: TPMStatus;
  health: TreeHealth;
  damage: TreeDamage;
  notes: string;
  expanded: boolean;
}

type Step = 1 | 2 | 3;

function isTreeRecordUpdated(record: TreeRecord): boolean {
  if (!record.noChange) return true;
  return (
    record.tpmStatus !== "pending" ||
    record.health !== "" ||
    record.damage !== "" ||
    record.notes.trim() !== ""
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: "Details" },
    { n: 2, label: "Trees" },
    { n: 3, label: "Review" },
  ];
  return (
    <div className="flex items-center gap-0 px-6 py-3">
      {steps.map(({ n, label }, i) => {
        const done   = current > n;
        const active = current === n;
        return (
          <React.Fragment key={n}>
            {i > 0 && (
              <div className="flex-1 h-0.5 mx-1"
                style={{ background: done ? "#1B4332" : "#E5E7EB" }} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: 28, height: 28,
                  background: done ? "#1B4332" : active ? "#2D5A27" : "#F3F4F6",
                  border: active ? "2px solid #1B4332" : "none",
                }}
              >
                {done
                  ? <Check size={13} color="white" strokeWidth={2.5} />
                  : <span style={{ color: active ? "white" : "#9CA3AF", fontSize: "0.72rem", fontWeight: 700 }}>{n}</span>
                }
              </div>
              <span style={{
                fontSize: "0.55rem", fontWeight: active ? 700 : 400,
                color: active ? "#1B4332" : done ? "#374151" : "#9CA3AF",
              }}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Visit type selector ───────────────────────────────────────────────────────

function VisitTypeSelector({
  value, onChange,
}: { value: VisitType | ""; onChange: (v: VisitType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between rounded-xl px-4 py-3.5 active:opacity-80 transition-opacity"
        style={{
          background: "white",
          border: `1.5px solid ${value ? "#1B4332" : "#E5E7EB"}`,
        }}
      >
        {value ? (
          <div className="flex flex-col items-start gap-0.5 min-w-0">
            <span style={{ color: "#9CA3AF", fontSize: "0.6rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em" }}>Visit Type</span>
            <span style={{ color: "#111827", fontSize: "0.85rem", fontWeight: 600,
              textAlign: "left", lineHeight: 1.3 }}>
              {value}
            </span>
          </div>
        ) : (
          <span style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>Select visit type…</span>
        )}
        <ChevronDown size={16} color={value ? "#1B4332" : "#9CA3AF"} style={{ flexShrink: 0, marginLeft: 8 }} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="rounded-t-3xl overflow-hidden"
            style={{ background: "white", maxHeight: "70vh" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="rounded-full" style={{ width: 36, height: 4, background: "#E5E7EB" }} />
            </div>
            <div className="px-5 pb-3 border-b" style={{ borderColor: "#F3F4F6" }}>
              <p style={{ color: "#111827", fontSize: "0.95rem", fontWeight: 700 }}>Visit Type</p>
              <p style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 2 }}>
                Select the purpose of this site visit
              </p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "55vh" }}>
              {ALL_VISIT_TYPES.map(vt => {
                const cfg = VISIT_TYPE_COLORS[vt];
                const isSelected = value === vt;
                return (
                  <button
                    key={vt}
                    onClick={() => { onChange(vt); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-gray-50"
                    style={{ borderBottom: "1px solid #F9FAFB" }}
                  >
                    <div className="rounded-xl px-2.5 py-1 flex-shrink-0"
                      style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                      <span style={{ color: cfg.text, fontSize: "0.62rem", fontWeight: 700 }}>
                        {VISIT_TYPE_SHORT[vt]}
                      </span>
                    </div>
                    <span style={{ color: "#111827", fontSize: "0.82rem", flex: 1, lineHeight: 1.4 }}>
                      {vt}
                    </span>
                    {isSelected && (
                      <div className="rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ width: 22, height: 22, background: "#1B4332" }}>
                        <Check size={12} color="white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── TPM Compliance toggle ─────────────────────────────────────────────────────

function TpmToggle({ value, onChange }: { value: TPMStatus; onChange: (v: TPMStatus) => void }) {
  const opts: { v: TPMStatus; label: string; activeColor: string; activeBg: string }[] = [
    { v: "compliant",     label: "Compliant",     activeColor: "#15803D", activeBg: "#DCFCE7" },
    { v: "not-compliant", label: "Not Compliant",  activeColor: "#DC2626", activeBg: "#FEE2E2" },
    { v: "pending",       label: "Pending",        activeColor: "#B45309", activeBg: "#FEF3C7" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map(({ v, label, activeColor, activeBg }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="flex-1 rounded-xl py-2.5 transition-all active:scale-95"
          style={{
            background: value === v ? activeBg : "#F9FAFB",
            border: `1.5px solid ${value === v ? activeColor : "#E5E7EB"}`,
            color: value === v ? activeColor : "#9CA3AF",
            fontSize: "0.65rem",
            fontWeight: value === v ? 700 : 500,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Health selector ───────────────────────────────────────────────────────────

function HealthSelector({ value, onChange }: { value: TreeHealth; onChange: (v: TreeHealth) => void }) {
  const opts: { v: TreeHealth; color: string; bg: string; border: string }[] = [
    { v: "Good", color: "#15803D", bg: "#DCFCE7", border: "#BBF7D0" },
    { v: "Fair", color: "#B45309", bg: "#FFFBEB", border: "#FDE68A" },
    { v: "Poor", color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
    { v: "Dead", color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" },
  ];
  return (
    <div className="flex gap-2">
      {opts.map(({ v, color, bg, border }) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="flex-1 rounded-xl py-2.5 transition-all active:scale-95"
          style={{
            background: value === v ? bg : "#F9FAFB",
            border: `1.5px solid ${value === v ? border : "#E5E7EB"}`,
            color: value === v ? color : "#9CA3AF",
            fontSize: "0.72rem",
            fontWeight: value === v ? 700 : 400,
          }}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

// ── Damage toggle ─────────────────────────────────────────────────────────────

function DamageToggle({ value, onChange }: { value: TreeDamage; onChange: (v: TreeDamage) => void }) {
  return (
    <div className="flex gap-2">
      {(["No", "Yes"] as const).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className="flex-1 rounded-xl py-3 transition-all active:scale-95"
          style={{
            background: value === v ? (v === "Yes" ? "#FEF2F2" : "#DCFCE7") : "#F9FAFB",
            border: `1.5px solid ${value === v ? (v === "Yes" ? "#FECACA" : "#BBF7D0") : "#E5E7EB"}`,
            color: value === v ? (v === "Yes" ? "#DC2626" : "#15803D") : "#9CA3AF",
            fontSize: "0.8rem",
            fontWeight: value === v ? 700 : 400,
          }}
        >
          {v === "Yes" ? "⚠ Damage Present" : "✓ No Damage"}
        </button>
      ))}
    </div>
  );
}

// ── Tree record row ───────────────────────────────────────────────────────────

function TreeRecordRow({
  record,
  onUpdate,
}: {
  record: TreeRecord;
  onUpdate: (partial: Partial<TreeRecord>) => void;
}) {
  const { tree, noChange, tpmStatus, health, damage, notes, expanded } = record;

  const statusColor = tpmStatus === "compliant" ? "#15803D"
    : tpmStatus === "not-compliant" ? "#DC2626" : "#B45309";
  const statusBg = tpmStatus === "compliant" ? "#DCFCE7"
    : tpmStatus === "not-compliant" ? "#FEE2E2" : "#FEF3C7";

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "white",
        border: noChange ? "1.5px solid #E5E7EB"
          : tpmStatus === "not-compliant" ? "1.5px solid #FECACA"
          : "1.5px solid #BBF7D0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      {/* Summary row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => onUpdate({ expanded: !expanded })}
      >
        {/* No-change checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onUpdate({ noChange: !noChange, expanded: noChange ? false : expanded }); }}
          className="rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{
            width: 26, height: 26,
            background: noChange ? "#1B4332" : "white",
            border: `2px solid ${noChange ? "#1B4332" : "#D1D5DB"}`,
          }}
        >
          {noChange && <Check size={13} color="white" strokeWidth={2.5} />}
        </button>

        {/* Tree info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded font-mono flex-shrink-0"
              style={{ background: "#1B4332", color: "white", fontSize: "0.62rem",
                fontWeight: 700, padding: "1px 6px" }}>
              {tree.id}
            </span>
            <span style={{ color: "#9CA3AF", fontSize: "0.65rem" }}>{tree.location}</span>
          </div>
          <p style={{ color: "#374151", fontSize: "0.78rem", fontWeight: 500,
            fontStyle: "italic", marginTop: 2, lineHeight: 1.3 }}
            className="truncate">
            {tree.botanicalName}
          </p>
        </div>

        {/* Status / indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {noChange ? (
            <span style={{ color: "#6B7280", fontSize: "0.62rem" }}>Inherited</span>
          ) : !expanded ? (
            <span className="rounded-full px-2 py-0.5"
              style={{ background: statusBg, color: statusColor, fontSize: "0.62rem", fontWeight: 700 }}>
              {tpmStatus === "compliant" ? "✓" : tpmStatus === "not-compliant" ? "✗" : "…"}
            </span>
          ) : null}
          <ChevronRight
            size={14} color="#D1D5DB"
            style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}
          />
        </div>
      </button>

      {/* Expanded form */}
      {expanded && !noChange && (
        <div className="px-4 pb-4 flex flex-col gap-4"
          style={{ borderTop: "1px solid #F3F4F6" }}>

          {/* TPM Compliance */}
          <div className="pt-3">
            {tree.treeProtectionMeasures && (
              <p style={{ color: "#374151", fontSize: "0.72rem", lineHeight: 1.5, marginBottom: 8 }}>
                <strong style={{ color: "#111827" }}>Required:</strong> {tree.treeProtectionMeasures}
              </p>
            )}
            <p style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              TPM Compliance
            </p>
            <TpmToggle value={tpmStatus} onChange={v => onUpdate({ tpmStatus: v })} />
          </div>

          {/* Tree Health */}
          <div>
            <p style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Tree Health
            </p>
            <HealthSelector value={health} onChange={v => onUpdate({ health: v })} />
          </div>

          {/* Tree Damage */}
          <div>
            <p style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Tree Damage
            </p>
            <DamageToggle value={damage} onChange={v => onUpdate({ damage: v })} />
          </div>

          {/* Notes */}
          <div>
            <p style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
              Notes (optional)
            </p>
            <textarea
              value={notes}
              onChange={e => onUpdate({ notes: e.target.value })}
              placeholder="Site observations, actions taken…"
              rows={2}
              className="w-full rounded-xl px-3.5 py-2.5 outline-none resize-none"
              style={{
                background: "#F9FAFB",
                border: "1.5px solid #E5E7EB",
                color: "#374151",
                fontSize: "0.78rem",
                lineHeight: 1.5,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Review step ───────────────────────────────────────────────────────────────

function ReviewStep({
  visitType, inspector, date, notes, records,
  projectName,
}: {
  visitType: VisitType;
  inspector: string;
  date: string;
  notes: string;
  records: TreeRecord[];
  projectName: string;
}) {
  const cfg    = VISIT_TYPE_COLORS[visitType];
  const inspected   = records.filter(r => !r.noChange).length;
  const noChange    = records.filter(r => r.noChange).length;
  const breaches    = records.filter(r => !r.noChange && r.tpmStatus === "not-compliant").length;
  const compPct     = inspected > 0 ? Math.round(((inspected - breaches) / inspected) * 100) : 100;

  return (
    <div className="flex flex-col gap-4">
      {/* Visit summary card */}
      <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <p style={{ color: "#9CA3AF", fontSize: "0.62rem", fontWeight: 600,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Visit Summary
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span className="rounded-lg px-2.5 py-1"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <span style={{ color: cfg.text, fontSize: "0.65rem", fontWeight: 700 }}>
              {VISIT_TYPE_SHORT[visitType]}
            </span>
          </span>
        </div>
        <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700, lineHeight: 1.3 }}>
          {visitType}
        </p>
        <p style={{ color: "#6B7280", fontSize: "0.75rem", marginTop: 4 }}>{projectName}</p>

        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { label: "Date",       value: new Date(date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) },
            { label: "Inspector",  value: inspector },
            { label: "Trees",      value: `${records.length} total` },
            { label: "Inspected",  value: `${inspected} updated` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-2.5" style={{ background: "#F9FAFB" }}>
              <p style={{ color: "#9CA3AF", fontSize: "0.6rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
              <p style={{ color: "#111827", fontSize: "0.8rem", fontWeight: 600, marginTop: 2 }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance summary */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: breaches > 0 ? "#FEF2F2" : "#F0FDF4",
          border: `1.5px solid ${breaches > 0 ? "#FECACA" : "#BBF7D0"}`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p style={{ color: breaches > 0 ? "#DC2626" : "#15803D", fontSize: "1.5rem", fontWeight: 800, lineHeight: 1 }}>
              {compPct}%
            </p>
            <p style={{ color: breaches > 0 ? "#B91C1C" : "#166534", fontSize: "0.72rem", marginTop: 2 }}>
              {breaches > 0
                ? `${breaches} breach${breaches !== 1 ? "es" : ""} recorded`
                : "All trees compliant"}
            </p>
          </div>
          <div className="text-right">
            <p style={{ color: "#374151", fontSize: "0.78rem" }}>
              <strong>{noChange}</strong> inherited
            </p>
            <p style={{ color: "#374151", fontSize: "0.78rem", marginTop: 2 }}>
              <strong>{inspected}</strong> updated
            </p>
          </div>
        </div>
      </div>

      {notes && (
        <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <p style={{ color: "#9CA3AF", fontSize: "0.62rem", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Visit Notes
          </p>
          <p style={{ color: "#374151", fontSize: "0.8rem", lineHeight: 1.6 }}>{notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function NewVisitPage() {
  const navigate = useNavigate();
  const { projects, selectedProjectId } = useProject();
  const project = projects.find(p => p.id === selectedProjectId) ?? projects[0];

  const [step,        setStep]        = useState<Step>(1);
  const [visitType,   setVisitType]   = useState<VisitType | "">("Routine Visit");
  const [inspector,   setInspector]   = useState(project?.inspector ?? "");
  const [date,        setDate]        = useState(new Date().toISOString().split("T")[0]);
  const [visitNotes,  setVisitNotes]  = useState("");
  const [records,     setRecords]     = useState<TreeRecord[]>([]);
  const [loadingTrees, setLoadingTrees] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch trees when project/step changes
  useEffect(() => {
    if (step !== 2 || !project?.uuid) return;
    if (records.length > 0) return; // already loaded

    setLoadingTrees(true);
    supabase
      .from("trees")
      .select("*")
      .eq("project_id", project.uuid)
      .limit(60)
      .then(({ data }) => {
        if (!data) return;
        const mapped = data.map(row =>
          mapSupabaseTree(row as Record<string, unknown>, project.id)
        );
        setRecords(mapped.map(t => ({
          tree: t,
          noChange: false,
          tpmStatus: "pending",
          health: "",
          damage: "",
          notes: "",
          expanded: false,
        })));
      })
      .finally(() => setLoadingTrees(false));
  }, [step, project?.uuid]);

  const updateRecord = (treeId: string, partial: Partial<TreeRecord>) => {
    setRecords(prev => prev.map(r => r.tree.id === treeId ? { ...r, ...partial } : r));
  };

  const markAllInherited = () => {
    setRecords(prev => prev.map(r => ({ ...r, noChange: true, expanded: false })));
  };

  const inspectedCount  = records.filter(r => !r.noChange).length;
  const breachCount     = records.filter(r => !r.noChange && r.tpmStatus === "not-compliant").length;
  const canNext1 = visitType !== "" && inspector.trim() !== "" && date !== "";

  const handleComplete = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    if (!project) {
      const message = "No project selected. Please choose a project before saving.";
      setSubmitError(message);
      console.error("Failed to save visit:", message);
      return;
    }

    console.info("Submitting visit payload", {
      projectId: project.id,
      date,
      visitType,
      records: records.length,
    });

    setIsSaving(true);
    try {
      console.log("selected project for visit", project);

      const projectUuid = project.uuid
        ? project.uuid
        : await supabase
            .from("projects")
            .select("id")
            .eq("slug", project.id)
            .single()
            .then(({ data, error }) => {
              if (error) throw error;
              if (!data?.id) {
                throw new Error("Unable to resolve project UUID for visit save.");
              }
              return data.id;
            });

      const payload = {
        project_id: projectUuid,
        tree_id: null,
        visit_type: visitType,
        inspection_date: date,
        inspector_name: inspector.trim(),
        notes: visitNotes.trim(),
      };
      console.log("site visit insert payload", payload);

      const { data: insertedVisit, error: visitInsertError } = await supabase
        .from("visits")
        .insert(payload)
        .select("id")
        .single();

      if (visitInsertError) throw visitInsertError;
      if (!insertedVisit?.id) {
        throw new Error("Visit was created but no visit id was returned.");
      }

      const visitId = insertedVisit.id;
      console.log("created visit id", visitId);

      const updatedTreeRecordsPayload = records
        .filter(isTreeRecordUpdated)
        .map((record) => ({
          visit_id: visitId,
          project_id: projectUuid,
          tree_id: record.tree.id,
          tpm_status: record.tpmStatus === "pending" ? null : record.tpmStatus,
          health: record.health || null,
          damage: record.damage || null,
          notes: record.notes.trim() || null,
        }));

      console.log("updated tree records payload", updatedTreeRecordsPayload);

      if (updatedTreeRecordsPayload.length > 0) {
        const { error: treeRecordsInsertError } = await supabase
          .from("tree_visit_records")
          .insert(updatedTreeRecordsPayload);

        if (treeRecordsInsertError) throw treeRecordsInsertError;
      }

      navigate("/visits", { replace: true, state: { refreshVisitsAt: Date.now() } });
    } catch (error) {
      const message = (error && typeof error === "object" && "message" in error && typeof error.message === "string")
        ? error.message
        : "Failed to save visit and tree history records.";
      console.error("Supabase visit save failed:", error);
      setSubmitError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-28">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-0"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <button
          onClick={() => step > 1 ? setStep(s => (s - 1) as Step) : navigate("/visits")}
          className="flex items-center gap-1.5 mb-3"
          style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}
        >
          <ChevronLeft size={16} />
          {step > 1 ? "Back" : "Visit Log"}
        </button>
        <h1 style={{ color: "white", fontSize: "1.2rem", fontWeight: 800, lineHeight: 1.15 }}>
          New Site Visit
        </h1>
        {project && (
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem", marginTop: 3, marginBottom: 0 }}>
            {project.name}
          </p>
        )}
        <StepBar current={step} />
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">

        {/* ── STEP 1: Visit Details ── */}
        {step === 1 && (
          <>
            <div className="rounded-2xl p-4" style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
              <p style={{ color: "#9CA3AF", fontSize: "0.62rem", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                Visit Details
              </p>

              <div className="flex flex-col gap-3">
                {/* Visit type */}
                <VisitTypeSelector
                  value={visitType}
                  onChange={setVisitType}
                />

                {/* Date */}
                <div>
                  <label style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 outline-none"
                    style={{
                      background: "white",
                      border: "1.5px solid #E5E7EB",
                      color: "#111827",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                {/* Inspector */}
                <div>
                  <label style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    Inspector
                  </label>
                  <input
                    type="text"
                    value={inspector}
                    onChange={e => setInspector(e.target.value)}
                    placeholder="Inspector name / credentials"
                    className="w-full rounded-xl px-4 py-3 outline-none"
                    style={{
                      background: "white",
                      border: "1.5px solid #E5E7EB",
                      color: "#111827",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ color: "#6B7280", fontSize: "0.65rem", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
                    Site Notes (optional)
                  </label>
                  <textarea
                    value={visitNotes}
                    onChange={e => setVisitNotes(e.target.value)}
                    placeholder="General site observations, weather, access…"
                    rows={3}
                    className="w-full rounded-xl px-4 py-3 outline-none resize-none"
                    style={{
                      background: "white",
                      border: "1.5px solid #E5E7EB",
                      color: "#374151",
                      fontSize: "0.82rem",
                      lineHeight: 1.6,
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => canNext1 && setStep(2)}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: canNext1 ? "#1B4332" : "#E5E7EB",
              }}
            >
              <span style={{ color: canNext1 ? "white" : "#9CA3AF", fontSize: "0.92rem", fontWeight: 700 }}>
                Continue to Trees
              </span>
              <ChevronRight size={16} color={canNext1 ? "white" : "#9CA3AF"} />
            </button>
          </>
        )}

        {/* ── STEP 2: Tree Inspections ── */}
        {step === 2 && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: "#374151", fontSize: "0.88rem", fontWeight: 700 }}>
                  {records.length} Trees
                </p>
                <p style={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
                  Only record trees with changes — the rest carry forward from the previous visit
                </p>
              </div>
              <button
                onClick={markAllInherited}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 active:scale-95 transition-transform"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
              >
                <Check size={12} color="#15803D" />
                <span style={{ color: "#15803D", fontSize: "0.72rem", fontWeight: 700 }}>
                  Carry Forward All
                </span>
              </button>
            </div>

            {/* Breach / progress summary */}
            {records.length > 0 && (
              <div className="rounded-xl px-4 py-3 flex items-center gap-4"
                style={{ background: "white", border: "1px solid #F3F4F6" }}>
                <div className="text-center flex-1">
                  <p style={{ color: "#1B4332", fontSize: "1.1rem", fontWeight: 800, lineHeight: 1 }}>
                    {records.filter(r => r.noChange).length}
                  </p>
                  <p style={{ color: "#9CA3AF", fontSize: "0.6rem", marginTop: 1 }}>Carry forward</p>
                </div>
                <div style={{ width: 1, height: 28, background: "#F3F4F6" }} />
                <div className="text-center flex-1">
                  <p style={{ color: "#1B4332", fontSize: "1.1rem", fontWeight: 800, lineHeight: 1 }}>
                    {inspectedCount}
                  </p>
                  <p style={{ color: "#9CA3AF", fontSize: "0.6rem", marginTop: 1 }}>Updated</p>
                </div>
                <div style={{ width: 1, height: 28, background: "#F3F4F6" }} />
                <div className="text-center flex-1">
                  <p style={{ color: breachCount > 0 ? "#DC2626" : "#1B4332",
                    fontSize: "1.1rem", fontWeight: 800, lineHeight: 1 }}>
                    {breachCount}
                  </p>
                  <p style={{ color: "#9CA3AF", fontSize: "0.6rem", marginTop: 1 }}>Breaches</p>
                </div>
              </div>
            )}

            {loadingTrees ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <div className="rounded-full animate-spin"
                  style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "#2D5A27" }} />
                <p style={{ color: "#9CA3AF", fontSize: "0.8rem" }}>Loading trees…</p>
              </div>
            ) : records.length === 0 ? (
              <div className="rounded-2xl px-4 py-8 text-center"
                style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}>
                <Trees size={28} color="#D1D5DB" className="mx-auto mb-2" />
                <p style={{ color: "#6B7280", fontSize: "0.82rem" }}>
                  No trees found for this project in Supabase
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {records.map(r => (
                  <TreeRecordRow
                    key={r.tree.id}
                    record={r}
                    onUpdate={partial => updateRecord(r.tree.id, partial)}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => setStep(3)}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              style={{ background: "#1B4332" }}
            >
              <span style={{ color: "white", fontSize: "0.92rem", fontWeight: 700 }}>
                Review & Complete
              </span>
              <ChevronRight size={16} color="white" />
            </button>
          </>
        )}

        {/* ── STEP 3: Review ── */}
        {step === 3 && (
          <form onSubmit={handleComplete} className="flex flex-col gap-4">
            <ReviewStep
              visitType={visitType as VisitType}
              inspector={inspector}
              date={date}
              notes={visitNotes}
              records={records}
              projectName={project?.name ?? ""}
            />

            {submitError && (
              <div
                role="alert"
                className="rounded-xl px-4 py-3"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: "0.78rem" }}
              >
                Failed to save visit: {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              style={{ background: isSaving ? "#6B7280" : "#1B4332" }}
            >
              <CheckCircle2 size={18} color="white" />
              <span style={{ color: "white", fontSize: "0.92rem", fontWeight: 700 }}>
                {isSaving ? "Saving…" : "Complete Visit"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/visits")}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center active:opacity-70 transition-opacity"
              style={{ background: "white", border: "1.5px solid #E5E7EB" }}
            >
              <span style={{ color: "#6B7280", fontSize: "0.85rem" }}>Save as Draft</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
