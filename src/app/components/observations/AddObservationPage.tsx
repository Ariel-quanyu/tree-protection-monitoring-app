import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ChevronLeft,
  Camera,
  CheckCircle2,
  X,
  AlertTriangle,
  Images,
  ImagePlus,
} from "lucide-react";
import { TREES as MOCK_TREES } from "../../data/mockData";
import type { ObservationType, ObservationSeverity } from "../../data/mockData";
import { TREES } from "../../data/treeData";
import { useProject } from "../../context/ProjectContext";

const OBS_TYPES: ObservationType[] = [
  "Routine Inspection",
  "Damage Report",
  "Encroachment Alert",
  "Root Zone Disturbance",
  "Compaction Check",
  "Chemical Spill",
];

const SEVERITY_OPTIONS: { value: ObservationSeverity; label: string; desc: string; color: string }[] = [
  { value: "low", label: "Low", desc: "Monitoring only", color: "#15803D" },
  { value: "medium", label: "Medium", desc: "Action needed", color: "#D97706" },
  { value: "high", label: "High", desc: "Urgent action", color: "#EA580C" },
  { value: "critical", label: "Critical", desc: "Stop work", color: "#DC2626" },
];

const CONDITIONS = ["Good", "Fair", "Poor", "Unknown"];

interface Photo {
  id: string;
  source: "camera" | "library";
  previewUrl: string;
  fileName: string;
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block mb-1.5" style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>
        {label} {required && <span style={{ color: "#DC2626" }}>*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full rounded-xl px-4 py-3.5 outline-none appearance-none"
        style={{
          background: disabled ? "#F9FAFB" : "white",
          border: `1.5px solid ${disabled ? "#E5E7EB" : "#E5E7EB"}`,
          color: value ? "#111827" : "#9CA3AF",
          fontSize: "0.9rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? "not-allowed" : "auto",
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {disabled && (
        <p style={{ color: "#9CA3AF", fontSize: "0.72rem", marginTop: 5 }}>
          Select a project first to see available trees
        </p>
      )}
    </div>
  );
}

export function AddObservationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTree = searchParams.get("treeId") || "";
  const { projects } = useProject();

  const [projectId, setProjectId] = useState("");
  const [treeId, setTreeId] = useState(preselectedTree);
  const [obsType, setObsType] = useState<string>("");
  const [severity, setSeverity] = useState<ObservationSeverity | "">("");
  const [condition, setCondition] = useState("");
  const [inspector, setInspector] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
  }, []);

  const handleFileChange = (source: "camera" | "library") => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = 6 - photos.length;
    const accepted = files.slice(0, remaining);

    const newPhotos: Photo[] = accepted.map((file) => ({
      id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      source,
      previewUrl: URL.createObjectURL(file),
      fileName: file.name,
    }));

    setPhotos((prev) => [...prev, ...newPhotos]);
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const resetPhotos = () => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
  };

  // Trees filtered to the selected project
  const projectTrees = projectId
    ? TREES.filter((t) => t.projectId === projectId)
    : [];

  // Reset tree when project changes
  const handleProjectChange = (id: string) => {
    setProjectId(id);
    setTreeId("");
  };

  const isValid = projectId && treeId && obsType && severity;

  const handleSubmit = () => {
    if (!isValid) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div
          className="rounded-full p-6 mb-6"
          style={{ background: "#DCFCE7" }}
        >
          <CheckCircle2 size={48} color="#15803D" />
        </div>
        <h2 style={{ color: "#111827", fontSize: "1.3rem", fontWeight: 700 }}>
          Observation Logged
        </h2>
        <p style={{ color: "#6B7280", fontSize: "0.88rem", marginTop: 8, lineHeight: 1.6 }}>
          Your observation for {treeId} has been saved successfully.
          {severity === "critical" && (
            <span style={{ color: "#DC2626", fontWeight: 600 }}> A stop-work alert has been issued.</span>
          )}
        </p>
        <div className="flex flex-col gap-3 w-full mt-8">
          <button
            onClick={() => navigate("/observations")}
            className="w-full py-4 rounded-2xl"
            style={{ background: "#1B4332", color: "white", fontWeight: 600 }}
          >
            View All Observations
          </button>
          <button
            onClick={() => {
              setSubmitted(false);
              setProjectId("");
              setTreeId(preselectedTree);
              setObsType("");
              setSeverity("");
              setCondition("");
              setNotes("");
              resetPhotos();
            }}
            className="w-full py-4 rounded-2xl"
            style={{ background: "#F3F4F6", color: "#374151", fontWeight: 600 }}
          >
            Log Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 mb-4"
          style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}
        >
          <ChevronLeft size={16} />
          Back
        </button>
        <h1 style={{ color: "white", fontSize: "1.25rem", fontWeight: 700 }}>
          New Observation
        </h1>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", marginTop: 2 }}>
          Log a field observation for any protected tree
        </p>
      </div>

      {/* Form */}
      <div className="px-4 py-5 flex flex-col gap-5">

        {/* Project */}
        <SelectField
          label="Project"
          value={projectId}
          onChange={handleProjectChange}
          placeholder="Select a project..."
          required
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />

        {/* Tree Selection */}
        <SelectField
          label="Tree"
          value={treeId}
          onChange={setTreeId}
          placeholder={projectId ? "Select a tree…" : "Select a project first…"}
          required
          disabled={!projectId}
          options={projectTrees.map((t) => ({
            value: t.id,
            label: `${t.id} – ${t.species}`,
          }))}
        />

        {/* Observation Type */}
        <SelectField
          label="Observation Type"
          value={obsType}
          onChange={setObsType}
          placeholder="Select type…"
          required
          options={OBS_TYPES.map((t) => ({ value: t, label: t }))}
        />

        {/* Severity */}
        <div>
          <label className="block mb-2" style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>
            Severity <span style={{ color: "#DC2626" }}>*</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {SEVERITY_OPTIONS.map(({ value, label, desc, color }) => (
              <button
                key={value}
                onClick={() => setSeverity(value)}
                className="rounded-xl py-3 px-3 text-left transition-all"
                style={{
                  border: `2px solid ${severity === value ? color : "#E5E7EB"}`,
                  background: severity === value ? `${color}15` : "white",
                }}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <div
                    className="rounded-full"
                    style={{ width: 8, height: 8, background: color }}
                  />
                  <span style={{ color, fontSize: "0.85rem", fontWeight: 700 }}>{label}</span>
                </div>
                <p style={{ color: "#6B7280", fontSize: "0.72rem" }}>{desc}</p>
              </button>
            ))}
          </div>
          {severity === "critical" && (
            <div
              className="mt-2 rounded-xl p-3 flex items-center gap-2"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
            >
              <AlertTriangle size={16} color="#DC2626" />
              <span style={{ color: "#DC2626", fontSize: "0.78rem", fontWeight: 500 }}>
                Critical severity will trigger a stop-work notification
              </span>
            </div>
          )}
        </div>

        {/* Tree Condition */}
        <div>
          <label className="block mb-2" style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>
            Tree Condition
          </label>
          <div className="flex gap-2 flex-wrap">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className="px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: condition === c ? "#1B4332" : "white",
                  color: condition === c ? "white" : "#374151",
                  border: `1.5px solid ${condition === c ? "#1B4332" : "#E5E7EB"}`,
                  fontSize: "0.85rem",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Inspector */}
        <div>
          <label className="block mb-1.5" style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>
            Recorded by
          </label>
          <input
            type="text"
            value={inspector}
            onChange={(e) => setInspector(e.target.value)}
            placeholder="Enter name"
            className="w-full rounded-xl px-4 py-3.5 outline-none"
            style={{
              background: "white",
              border: "1.5px solid #E5E7EB",
              color: "#111827",
              fontSize: "0.9rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block mb-1.5" style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>
            Field Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you observed…"
            rows={4}
            className="w-full rounded-xl px-4 py-3 outline-none resize-none"
            style={{
              background: "white",
              border: "1.5px solid #E5E7EB",
              color: "#111827",
              fontSize: "0.9rem",
              lineHeight: 1.6,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          />
        </div>

        {/* ── Photos ── */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <label style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>
              Photos
            </label>
            {photos.length > 0 && (
              <span
                className="px-2.5 py-0.5 rounded-full"
                style={{
                  background: "#F0FDF4",
                  color: "#15803D",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  border: "1px solid #BBF7D0",
                }}
              >
                {photos.length} / 6
              </span>
            )}
          </div>

          {/* Hidden file inputs — photos are only added via onChange */}
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange("camera")}
          />
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange("library")}
          />

          {/* Upload cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Take Photo */}
            <button
              onClick={() => cameraRef.current?.click()}
              disabled={photos.length >= 6}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl py-6 transition-all active:scale-95"
              style={{
                background: photos.length >= 6 ? "#F9FAFB" : "#F0FDF4",
                border: `2px dashed ${photos.length >= 6 ? "#D1D5DB" : "#2D6A4F"}`,
                opacity: photos.length >= 6 ? 0.5 : 1,
              }}
            >
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{
                  width: 52,
                  height: 52,
                  background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)",
                  boxShadow: "0 4px 12px rgba(27,67,50,0.3)",
                }}
              >
                <Camera size={26} color="white" strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <p style={{ color: "#1B4332", fontSize: "0.85rem", fontWeight: 700 }}>Take Photo</p>
                <p style={{ color: "#6B7280", fontSize: "0.7rem", marginTop: 1 }}>Use camera</p>
              </div>
            </button>

            {/* Choose from Library */}
            <button
              onClick={() => libraryRef.current?.click()}
              disabled={photos.length >= 6}
              className="flex flex-col items-center justify-center gap-2.5 rounded-2xl py-6 transition-all active:scale-95"
              style={{
                background: photos.length >= 6 ? "#F9FAFB" : "#F8FAFF",
                border: `2px dashed ${photos.length >= 6 ? "#D1D5DB" : "#6366F1"}`,
                opacity: photos.length >= 6 ? 0.5 : 1,
              }}
            >
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{
                  width: 52,
                  height: 52,
                  background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)",
                  boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                }}
              >
                <Images size={26} color="white" strokeWidth={1.8} />
              </div>
              <div className="text-center">
                <p style={{ color: "#4338CA", fontSize: "0.85rem", fontWeight: 700 }}>Library</p>
                <p style={{ color: "#6B7280", fontSize: "0.7rem", marginTop: 1 }}>Choose photos</p>
              </div>
            </button>
          </div>

          {/* Empty-state hint */}
          {photos.length === 0 && (
            <p style={{ color: "#9CA3AF", fontSize: "0.7rem", textAlign: "center", marginTop: 10 }}>
              Up to 6 photos per observation
            </p>
          )}

          {/* Real-image thumbnail grid — only rendered when photos exist */}
          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative rounded-2xl overflow-hidden bg-gray-100"
                  style={{ aspectRatio: "1 / 1" }}
                >
                  {/* Real image preview */}
                  <img
                    src={photo.previewUrl}
                    alt={photo.fileName}
                    className="w-full h-full object-cover"
                  />

                  {/* Source badge */}
                  <div
                    className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(0,0,0,0.5)" }}
                  >
                    <span style={{ color: "white", fontSize: "0.55rem", fontWeight: 600 }}>
                      {photo.source === "camera" ? "CAM" : "LIB"}
                    </span>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{
                      width: 22,
                      height: 22,
                      background: "rgba(0,0,0,0.55)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <X size={11} color="white" strokeWidth={2.5} />
                  </button>
                </div>
              ))}

              {/* Add-more slot */}
              {photos.length < 6 && (
                <button
                  onClick={() => libraryRef.current?.click()}
                  className="rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                  style={{
                    aspectRatio: "1 / 1",
                    background: "#F3F4F6",
                    border: "2px dashed #D1D5DB",
                  }}
                >
                  <ImagePlus size={20} color="#9CA3AF" strokeWidth={1.5} />
                  <span style={{ color: "#9CA3AF", fontSize: "0.62rem" }}>Add more</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full py-4 rounded-2xl mt-2 transition-all"
          style={{
            background: isValid ? "#1B4332" : "#D1D5DB",
            color: isValid ? "white" : "#9CA3AF",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          Submit Observation
        </button>

        {!isValid && (
          <p style={{ color: "#9CA3AF", fontSize: "0.75rem", textAlign: "center", marginTop: -8 }}>
            Select a tree, type, and severity to continue
          </p>
        )}
      </div>
    </div>
  );
}