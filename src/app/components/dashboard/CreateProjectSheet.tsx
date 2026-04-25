import React, { useState, useRef, useEffect } from "react";
import { X, CheckCircle2, Loader2, FolderPlus } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  site: string;
  client: string;
  reference: string;
  startDate: string;
  endDate: string;
  status: "active" | "monitoring" | "completed";
}

type Errors = Partial<Record<keyof FormData, string>>;

// ─── Field components ────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p style={{ color: "#374151", fontSize: "0.78rem", fontWeight: 600, marginBottom: 6 }}>
      {children}
      {required && <span style={{ color: "#DC2626", marginLeft: 3 }}>*</span>}
    </p>
  );
}

function TextInput({
  value, onChange, placeholder, error, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; error?: string; type?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full"
        style={{
          border: `1.5px solid ${error ? "#FCA5A5" : focused ? "#2D5A27" : "#E5E7EB"}`,
          borderRadius: 12,
          padding: "12px 14px",
          fontSize: "0.9rem",
          color: "#111827",
          background: error ? "#FFF5F5" : "#FAFAFA",
          outline: "none",
          appearance: type === "date" ? "none" : undefined,
          WebkitAppearance: type === "date" ? "none" : undefined,
          transition: "border-color 0.15s",
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

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (project: FormData) => void;
}

export function CreateProjectSheet({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormData>({
    name: "",
    site: "",
    client: "",
    reference: "",
    startDate: "",
    endDate: "",
    status: "active",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [phase, setPhase] = useState<"form" | "saving" | "success">("form");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setForm({ name: "", site: "", client: "", reference: "", startDate: "", endDate: "", status: "active" });
      setErrors({});
      setPhase("form");
    }
  }, [open]);

  const set = <K extends keyof FormData>(key: K) => (val: FormData[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.name.trim())      e.name      = "Project name is required";
    if (!form.site.trim())      e.site      = "Site address is required";
    if (!form.client.trim())    e.client    = "Client / organisation is required";
    if (!form.reference.trim()) e.reference = "Reference ID is required";
    if (!form.startDate)        e.startDate = "Start date is required";
    if (!form.endDate)          e.endDate   = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date";
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
      setTimeout(onClose, 1600);
    }, 900);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl flex flex-col"
        style={{ background: "white", maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-0 flex-shrink-0">
          <div className="rounded-full" style={{ width: 36, height: 4, background: "#E5E7EB" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #F3F4F6" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: "#DCFCE7" }}>
              <FolderPlus size={18} color="#2D5A27" />
            </div>
            <div>
              <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 700 }}>New Project</p>
              <p style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>Melbourne Tree Care</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full flex items-center justify-center"
            style={{ width: 32, height: 32, background: "#F3F4F6" }}
          >
            <X size={16} color="#6B7280" />
          </button>
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
              <p style={{ color: "#111827", fontSize: "1.05rem", fontWeight: 700 }}>Project Created</p>
              <p style={{ color: "#6B7280", fontSize: "0.82rem", marginTop: 4 }}>
                "{form.name}" has been added to your projects
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Scrollable form */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">

              <div>
                <Label required>Project Name</Label>
                <TextInput
                  value={form.name}
                  onChange={set("name")}
                  placeholder="e.g. Melbourne Central Tower"
                  error={errors.name}
                />
              </div>

              <div>
                <Label required>Site Address</Label>
                <TextInput
                  value={form.site}
                  onChange={set("site")}
                  placeholder="e.g. 211 La Trobe Street, Melbourne"
                  error={errors.site}
                />
              </div>

              <div>
                <Label required>Client / Organisation</Label>
                <TextInput
                  value={form.client}
                  onChange={set("client")}
                  placeholder="e.g. City of Melbourne"
                  error={errors.client}
                />
              </div>

              <div>
                <Label required>Reference ID</Label>
                <TextInput
                  value={form.reference}
                  onChange={set("reference")}
                  placeholder="e.g. COM-2026-021"
                  error={errors.reference}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <Label required>Start Date</Label>
                  <TextInput
                    type="date"
                    value={form.startDate}
                    onChange={set("startDate")}
                    error={errors.startDate}
                  />
                </div>
                <div className="flex-1">
                  <Label required>End Date</Label>
                  <TextInput
                    type="date"
                    value={form.endDate}
                    onChange={set("endDate")}
                    error={errors.endDate}
                  />
                </div>
              </div>

              <div>
                <Label>Status</Label>
                <SelectInput
                  value={form.status}
                  onChange={v => set("status")(v as FormData["status"])}
                  options={[
                    { value: "active",     label: "Active" },
                    { value: "monitoring", label: "Monitoring" },
                    { value: "completed",  label: "Completed" },
                  ]}
                />
              </div>

              {/* Bottom padding for button */}
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
                    <span style={{ color: "white", fontSize: "0.95rem", fontWeight: 700 }}>Creating project…</span>
                  </>
                ) : (
                  <>
                    <FolderPlus size={18} color="white" />
                    <span style={{ color: "white", fontSize: "0.95rem", fontWeight: 700 }}>Create Project</span>
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
