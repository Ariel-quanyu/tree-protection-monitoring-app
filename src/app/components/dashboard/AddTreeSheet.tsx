import React, { useState, useEffect, useRef } from "react";
import { X, CheckCircle2, Loader2, TreePine } from "lucide-react";
import type { ProjectData } from "../../data/projectsData";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  treeId: string;
  botanicalName: string;
  commonName: string;
  location: string;
  health: "Good" | "Fair" | "Poor" | "Dead";
  retentionStatus: "Retain" | "Retain - Prune" | "Remove" | "Monitor";
}

type Errors = Partial<Record<keyof FormData, string>>;

// ─── Field components ─────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p style={{ color: "#374151", fontSize: "0.78rem", fontWeight: 600, marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: "#DC2626", marginLeft: 3 }}>*</span>}
    </p>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "#9CA3AF", fontSize: "0.67rem", marginTop: 4, marginLeft: 2 }}>{children}</p>
  );
}

function TextInput({
  value, onChange, placeholder, error, type = "text", readOnly,
}: {
  value: string; onChange?: (v: string) => void; placeholder?: string;
  error?: string; type?: string; readOnly?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <input
        type={type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full"
        style={{
          border: `1.5px solid ${error ? "#FCA5A5" : focused ? "#2D5A27" : "#E5E7EB"}`,
          borderRadius: 12,
          padding: "12px 14px",
          fontSize: "0.9rem",
          color: readOnly ? "#6B7280" : "#111827",
          background: readOnly ? "#F9FAFB" : error ? "#FFF5F5" : "#FAFAFA",
          outline: "none",
          transition: "border-color 0.15s",
          cursor: readOnly ? "default" : "text",
        }}
      />
      {error && (
        <p style={{ color: "#DC2626", fontSize: "0.68rem", marginTop: 4, marginLeft: 2 }}>{error}</p>
      )}
    </div>
  );
}

function SelectInput({
  value, onChange, options, error,
}: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; error?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full"
        style={{
          border: `1.5px solid ${error ? "#FCA5A5" : focused ? "#2D5A27" : "#E5E7EB"}`,
          borderRadius: 12,
          padding: "12px 14px",
          fontSize: "0.9rem",
          color: "#111827",
          background: "#FAFAFA",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: 38,
          transition: "border-color 0.15s",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && (
        <p style={{ color: "#DC2626", fontSize: "0.68rem", marginTop: 4, marginLeft: 2 }}>{error}</p>
      )}
    </div>
  );
}

// ─── Health badge preview ─────────────────────────────────────────────────────

const HEALTH_CFG = {
  Good: { bg: "#DCFCE7", text: "#15803D" },
  Fair: { bg: "#FEF9C3", text: "#854D0E" },
  Poor: { bg: "#FFF7ED", text: "#C2410C" },
  Dead: { bg: "#F3F4F6", text: "#6B7280" },
} as const;

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  project: ProjectData;
  suggestedTreeId: string;
  onCreated?: (tree: FormData) => void;
}

export function AddTreeSheet({ open, onClose, project, suggestedTreeId, onCreated }: Props) {
  const [form, setForm] = useState<FormData>({
    treeId: suggestedTreeId,
    botanicalName: "",
    commonName: "",
    location: "",
    health: "Good",
    retentionStatus: "Retain",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<"form" | "saving" | "success">("form");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setForm({
        treeId: suggestedTreeId,
        botanicalName: "",
        commonName: "",
        location: "",
        health: "Good",
        retentionStatus: "Retain",
      });
      setErrors({});
      setPhase("form");
    }
  }, [open, suggestedTreeId]);

  const set = <K extends keyof FormData>(key: K) => (val: FormData[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.treeId.trim())        e.treeId       = "Tree ID is required";
    if (!form.botanicalName.trim()) e.botanicalName = "Botanical name is required";
    if (!form.location.trim())      e.location      = "Location / zone is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setPhase("saving");
    setTimeout(() => {
      setPhase("success");
      onCreated?.(form);
      setTimeout(onClose, 1800);
    }, 900);
  };

  if (!open) return null;

  const healthCfg = HEALTH_CFG[form.health];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl flex flex-col"
        style={{ background: "white", maxHeight: "93vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="rounded-full" style={{ width: 36, height: 4, background: "#E5E7EB" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: "#F0FDF4" }}>
              <TreePine size={18} color="#2D5A27" />
            </div>
            <div>
              <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 700 }}>Add Tree</p>
              <p
                style={{ color: "#9CA3AF", fontSize: "0.7rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}
              >
                {project.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, background: "#F3F4F6" }}
          >
            <X size={16} color="#6B7280" />
          </button>
        </div>

        {/* Project context banner */}
        <div
          className="mx-5 my-3 flex-shrink-0 rounded-xl px-3.5 py-2.5 flex items-center gap-2"
          style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
        >
          <div className="rounded-full flex-shrink-0" style={{ width: 6, height: 6, background: "#16A34A" }} />
          <div className="min-w-0">
            <p style={{ color: "#15803D", fontSize: "0.72rem", fontWeight: 600 }}>
              Adding to: {project.name}
            </p>
            <p style={{ color: "#4ADE80", fontSize: "0.65rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {project.reference} · {project.site}
            </p>
          </div>
        </div>

        {/* Success state */}
        {phase === "success" ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-12">
            <div
              className="rounded-full flex items-center justify-center"
              style={{ width: 72, height: 72, background: "#DCFCE7" }}
            >
              <CheckCircle2 size={36} color="#16A34A" />
            </div>
            <div className="text-center">
              <p style={{ color: "#111827", fontSize: "1.05rem", fontWeight: 700 }}>Tree Record Added</p>
              <p style={{ color: "#6B7280", fontSize: "0.82rem", marginTop: 4 }}>
                {form.treeId} has been added to {project.name}
              </p>
              <div
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mt-3"
                style={{ background: healthCfg.bg }}
              >
                <span style={{ color: healthCfg.text, fontSize: "0.75rem", fontWeight: 600 }}>
                  Health: {form.health}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Scrollable form */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-2 flex flex-col gap-5">

              {/* Tree identification */}
              <div>
                <div
                  className="rounded-xl px-3 py-2 mb-4"
                  style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}
                >
                  <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Tree Identification
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <Label required>Tree ID</Label>
                    <TextInput
                      value={form.treeId}
                      onChange={set("treeId")}
                      placeholder="e.g. T188"
                      error={errors.treeId}
                    />
                    <FieldHint>Auto-suggested based on existing inventory. You may edit this.</FieldHint>
                  </div>

                  <div>
                    <Label required>Botanical Name</Label>
                    <TextInput
                      value={form.botanicalName}
                      onChange={set("botanicalName")}
                      placeholder="e.g. Eucalyptus camaldulensis"
                      error={errors.botanicalName}
                    />
                  </div>

                  <div>
                    <Label>Common Name</Label>
                    <TextInput
                      value={form.commonName}
                      onChange={set("commonName")}
                      placeholder="e.g. River Red Gum"
                    />
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <div
                  className="rounded-xl px-3 py-2 mb-4"
                  style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}
                >
                  <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Site Location
                  </p>
                </div>
                <Label required>Location / Zone</Label>
                <TextInput
                  value={form.location}
                  onChange={set("location")}
                  placeholder="e.g. North Precinct – Zone A"
                  error={errors.location}
                />
              </div>

              {/* Condition */}
              <div>
                <div
                  className="rounded-xl px-3 py-2 mb-4"
                  style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}
                >
                  <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Condition & Retention
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Tree Health</Label>
                      <span
                        className="rounded-full px-2.5 py-0.5"
                        style={{ background: healthCfg.bg, color: healthCfg.text, fontSize: "0.68rem", fontWeight: 700 }}
                      >
                        {form.health}
                      </span>
                    </div>
                    <SelectInput
                      value={form.health}
                      onChange={v => set("health")(v as FormData["health"])}
                      options={[
                        { value: "Good", label: "Good — No visible defects" },
                        { value: "Fair", label: "Fair — Minor defects present" },
                        { value: "Poor", label: "Poor — Significant defects" },
                        { value: "Dead", label: "Dead — No signs of life" },
                      ]}
                    />
                  </div>

                  <div>
                    <Label>Retention Status</Label>
                    <SelectInput
                      value={form.retentionStatus}
                      onChange={v => set("retentionStatus")(v as FormData["retentionStatus"])}
                      options={[
                        { value: "Retain",         label: "Retain" },
                        { value: "Retain - Prune", label: "Retain – Prune" },
                        { value: "Monitor",        label: "Monitor" },
                        { value: "Remove",         label: "Remove" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div style={{ height: 4 }} />
            </div>

            {/* Submit */}
            <div className="px-5 pb-8 pt-3 flex-shrink-0" style={{ borderTop: "1px solid #F3F4F6" }}>
              <button
                onClick={handleSubmit}
                disabled={phase === "saving"}
                className="w-full rounded-2xl py-4 flex items-center justify-center gap-2.5 active:scale-98 transition-transform"
                style={{
                  background: phase === "saving" ? "#6B7280" : "#1B4332",
                  opacity: phase === "saving" ? 0.85 : 1,
                }}
              >
                {phase === "saving" ? (
                  <>
                    <Loader2 size={18} color="white" className="animate-spin" />
                    <span style={{ color: "white", fontSize: "0.95rem", fontWeight: 700 }}>Adding tree…</span>
                  </>
                ) : (
                  <>
                    <TreePine size={18} color="white" />
                    <span style={{ color: "white", fontSize: "0.95rem", fontWeight: 700 }}>Add Tree to Project</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
