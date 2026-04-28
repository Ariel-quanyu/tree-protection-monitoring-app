import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft, ClipboardList, TreePine, Shield,
  Navigation, WifiOff, Info, Ruler,
  Camera, CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useSelectedProject } from "../../context/ProjectContext";
import { EncroachmentBadge } from "../StatusBadge";
import { type SupabaseTree, mapSupabaseTree } from "../../data/treeMapper";
import {
  VISIT_TYPE_SHORT, VISIT_TYPE_COLORS, ALL_VISIT_TYPES, type VisitType,
} from "../../data/visitsData";

// ── Observation types ─────────────────────────────────────────────────────────

type ObsSeverity = "low" | "medium" | "high" | "critical";

interface EmbeddedObs {
  id?: string; type: string; severity: ObsSeverity;
  description: string; date: string; inspector: string; resolved?: boolean;
}

interface TreeVisitRecord {
  id: string;
  visit_id: string;
  project_id: string;
  tree_id: string;
  tpm_status: "compliant" | "not-compliant" | null;
  health: string | null;
  damage: string | null;
  notes: string | null;
  photo_urls: string[] | null;
  created_at: string;
  visits?: {
    id: string;
    visit_type: string | null;
    inspection_date: string | null;
  } | null;
}

interface SelectedPhoto {
  file: File;
  previewUrl: string;
}

function parseObservations(raw: unknown): EmbeddedObs[] {
  if (!raw) return [];
  const arr: unknown[] = Array.isArray(raw) ? raw
    : typeof raw === "string"
    ? (() => { try { return JSON.parse(raw); } catch { return []; } })()
    : [];
  return arr.map((o: unknown) => {
    const obs = o as Record<string, unknown>;
    const sev = String(obs.severity ?? "low");
    return { ...obs, severity: (sev === "moderate" ? "medium" : sev) as ObsSeverity } as EmbeddedObs;
  });
}

// ── Compliance types ──────────────────────────────────────────────────────────

type TPMStatus  = "compliant" | "not-compliant";
type TreeHealth = "Good" | "Fair" | "Poor" | "Dead" | "";
type TreeDamage = "Yes" | "No" | "";

// ── Helpers ───────────────────────────────────────────────────────────────────

type EncroachmentClass = SupabaseTree["encroachmentClass"];

const ENC_COLOR: Record<EncroachmentClass, string> = {
  None: "#15803D", Minor: "#D97706", Moderate: "#EA580C", Major: "#DC2626",
};
const ENC_BG: Record<EncroachmentClass, string> = {
  None: "#F0FDF4", Minor: "#FFFBEB", Moderate: "#FFFBEB", Major: "#FEF2F2",
};

function getLocalDateYYYYMMDD(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value, color, mono = false }: {
  label: string; value: string; color?: string; mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between py-3 gap-4"
      style={{ borderBottom: "1px solid #F3F4F6" }}>
      <span style={{ color: "#6B7280", fontSize: "0.82rem", flexShrink: 0 }}>{label}</span>
      <span style={{ color: color ?? "#111827", fontSize: "0.82rem", fontWeight: 500,
        textAlign: "right", lineHeight: 1.4, fontFamily: mono ? "monospace" : undefined }}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p style={{ color: "#9CA3AF", fontSize: "0.62rem", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
      {label}
    </p>
  );
}

// ── Compliance card ───────────────────────────────────────────────────────────

function TPMStatusCard({
  value, onChange,
}: {
  value: TPMStatus;
  onChange: (v: TPMStatus) => void;
}) {
  return (
    <div className="rounded-2xl p-4 mb-4"
      style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>

      {/* ── Compliance status ── */}
      <SectionLabel label="TPM Compliance Status" />
      <div className="flex gap-2">
        {([
          { v: "compliant"     as TPMStatus, label: "Compliant",     icon: <CheckCircle2 size={18} />, activeBg: "#DCFCE7", activeText: "#15803D", activeBorder: "#86EFAC" },
          { v: "not-compliant" as TPMStatus, label: "Not Compliant", icon: <XCircle size={18} />,      activeBg: "#FEE2E2", activeText: "#DC2626", activeBorder: "#FCA5A5" },
        ]).map(({ v, label, icon, activeBg, activeText, activeBorder }) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="flex-1 rounded-2xl py-4 flex flex-col items-center gap-1.5 transition-all active:scale-95"
              style={{
                background:  active ? activeBg  : "#F9FAFB",
                border:     `2px solid ${active ? activeBorder : "#E5E7EB"}`,
                color:       active ? activeText : "#9CA3AF",
              }}
            >
              {React.cloneElement(icon as React.ReactElement<{color?: string}>, { color: active ? activeText : "#D1D5DB" })}
              <span style={{ fontSize: "0.7rem", fontWeight: active ? 700 : 500, lineHeight: 1.2, textAlign: "center" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RequiredMeasuresCard({ measures }: { measures: string[] }) {
  const hasMeasures = measures.length > 0;
  return (
    <div className="rounded-2xl p-4 mb-4"
      style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
      <SectionLabel label="Required Tree Protection Measures" />
      {hasMeasures ? (
        <div className="flex flex-wrap gap-2">
          {measures.map((measure) => (
            <span
              key={measure}
              className="rounded-full px-2.5 py-1"
              style={{
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                color: "#166534",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              {measure}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>
          No required protection measures recorded.
        </p>
      )}
    </div>
  );
}

// ── Health card ───────────────────────────────────────────────────────────────

function HealthCard({ value, onChange }: { value: TreeHealth; onChange: (v: TreeHealth) => void }) {
  const opts: { v: TreeHealth; dot: string; activeBg: string; activeText: string; activeBorder: string }[] = [
    { v: "Good", dot: "#15803D", activeBg: "#DCFCE7", activeText: "#15803D", activeBorder: "#86EFAC" },
    { v: "Fair", dot: "#B45309", activeBg: "#FEF3C7", activeText: "#B45309", activeBorder: "#FCD34D" },
    { v: "Poor", dot: "#DC2626", activeBg: "#FEE2E2", activeText: "#DC2626", activeBorder: "#FCA5A5" },
    { v: "Dead", dot: "#6B7280", activeBg: "#F3F4F6", activeText: "#374151", activeBorder: "#D1D5DB" },
  ];
  return (
    <div className="rounded-2xl p-4 mb-4"
      style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
      <SectionLabel label="Tree Health" />
      <div className="grid grid-cols-4 gap-2">
        {opts.map(({ v, dot, activeBg, activeText, activeBorder }) => {
          const active = value === v;
          return (
            <button
              key={v}
              onClick={() => onChange(v)}
              className="rounded-2xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95"
              style={{
                background:  active ? activeBg  : "#F9FAFB",
                border:     `2px solid ${active ? activeBorder : "#E5E7EB"}`,
                color:       active ? activeText : "#9CA3AF",
              }}
            >
              <span className="rounded-full"
                style={{ width: 10, height: 10, background: active ? dot : "#E5E7EB" }} />
              <span style={{ fontSize: "0.72rem", fontWeight: active ? 700 : 400 }}>{v}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Damage card ───────────────────────────────────────────────────────────────

function DamageCard({ value, onChange }: { value: TreeDamage; onChange: (v: TreeDamage) => void }) {
  return (
    <div className="rounded-2xl p-4 mb-4"
      style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
      <SectionLabel label="Tree Damage" />
      <div className="flex gap-3">
        <button
          onClick={() => onChange("No")}
          className="flex-1 rounded-2xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          style={{
            background:  value === "No" ? "#DCFCE7" : "#F9FAFB",
            border:     `2px solid ${value === "No" ? "#86EFAC" : "#E5E7EB"}`,
            color:       value === "No" ? "#15803D" : "#9CA3AF",
          }}
        >
          <CheckCircle2 size={22} color={value === "No" ? "#15803D" : "#D1D5DB"} />
          <span style={{ fontSize: "0.75rem", fontWeight: value === "No" ? 700 : 400 }}>
            No Damage
          </span>
        </button>
        <button
          onClick={() => onChange("Yes")}
          className="flex-1 rounded-2xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95"
          style={{
            background:  value === "Yes" ? "#FEE2E2" : "#F9FAFB",
            border:     `2px solid ${value === "Yes" ? "#FCA5A5" : "#E5E7EB"}`,
            color:       value === "Yes" ? "#DC2626" : "#9CA3AF",
          }}
        >
          <XCircle size={22} color={value === "Yes" ? "#DC2626" : "#D1D5DB"} />
          <span style={{ fontSize: "0.75rem", fontWeight: value === "Yes" ? 700 : 400 }}>
            Damage Present
          </span>
        </button>
      </div>
    </div>
  );
}

// ── Photo placeholder card ────────────────────────────────────────────────────

function PhotoCard({
  selectedPhotos,
  onCardClick,
  fileSelectionError,
}: {
  selectedPhotos: SelectedPhoto[];
  onCardClick: () => void;
  fileSelectionError: string | null;
}) {
  return (
    <div className="rounded-2xl p-4 mb-4"
      style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
      <SectionLabel label="Photos" />
      <button
        type="button"
        onClick={onCardClick}
        className="w-full rounded-xl py-5 flex flex-col items-center gap-2 active:opacity-70 transition-opacity"
        style={{ background: "#F9FAFB", border: "1.5px dashed #D1D5DB" }}
      >
        {selectedPhotos.length === 0 ? (
          <>
            <Camera size={22} color="#9CA3AF" />
            <span style={{ color: "#6B7280", fontSize: "0.78rem" }}>Tap to add photos</span>
            <span style={{ color: "#9CA3AF", fontSize: "0.65rem" }}>
              Camera roll · JPG / PNG
            </span>
          </>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-3 gap-2">
              {selectedPhotos.map((photo, index) => (
                <img
                  key={`${photo.file.name}-${index}`}
                  src={photo.previewUrl}
                  alt={`Selected upload ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg"
                />
              ))}
            </div>
            <span style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 10, display: "block" }}>
              Tap to add or replace photos
            </span>
          </div>
        )}
      </button>
      {fileSelectionError && (
        <p style={{ color: "#B91C1C", fontSize: "0.75rem", marginTop: 8, lineHeight: 1.5 }}>
          {fileSelectionError}
        </p>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="pb-28">
      <div className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}>
        <div className="rounded animate-pulse mb-4" style={{ height: 18, width: 100, background: "rgba(255,255,255,0.15)" }} />
        <div className="rounded-xl animate-pulse mb-2" style={{ height: 28, width: "60%", background: "rgba(255,255,255,0.15)" }} />
        <div className="rounded animate-pulse" style={{ height: 16, width: "40%", background: "rgba(255,255,255,0.1)" }} />
      </div>
      <div className="mx-4 -mt-4 rounded-2xl animate-pulse"
        style={{ background: "white", height: 64, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }} />
      <div className="px-4 mt-6 flex flex-col gap-3">
        {[80, 60, 70, 55, 65].map((w, i) => (
          <div key={i} className="rounded animate-pulse"
            style={{ height: 16, width: `${w}%`, background: "#E5E7EB" }} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function TreeDetailPage() {
  const { id: routeTreeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Compliance state (local UI state — not yet persisted to Supabase)
  const [activeTab,  setActiveTab]  = useState<"compliance" | "info" | "history">("compliance");
  const [tree,       setTree]       = useState<SupabaseTree | null>(null);
  const [treeObs,    setTreeObs]    = useState<EmbeddedObs[]>([]);
  const [historyRecords, setHistoryRecords] = useState<TreeVisitRecord[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tpmStatus,  setTpmStatus]  = useState<TPMStatus>("compliant");
  const [health,     setHealth]     = useState<TreeHealth>("");
  const [damage,     setDamage]     = useState<TreeDamage>("");
  const [quickInspectionDate, setQuickInspectionDate] = useState<string>(getLocalDateYYYYMMDD());
  const [quickVisitType, setQuickVisitType] = useState<VisitType>("Routine Visit");
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [quickSaveError, setQuickSaveError] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>([]);
  const [fileSelectionError, setFileSelectionError] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { project } = useSelectedProject();

  useEffect(() => {
    const uuid = project?.uuid;
    if (!uuid || !routeTreeId) return;
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    setTree(null);

    supabase
      .from("trees")
      .select("*, required_measures")
      .eq("project_id", uuid).eq("tree_id", routeTreeId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setFetchError(error.message);
        } else if (data) {
          const raw = data as Record<string, unknown>;
          const mapped = mapSupabaseTree(raw, project.id);
          setTree(mapped);
          setTreeObs(parseObservations(raw.observations));
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [project?.uuid, routeTreeId]);

  useEffect(() => {
    const projectUuid = project?.uuid;
    if (!projectUuid || !routeTreeId) return;
    let cancelled = false;

    setHistoryError(null);

    supabase
      .from("tree_visit_records")
      .select("id, visit_id, project_id, tree_id, tpm_status, health, damage, notes, photo_urls, created_at, visits(id, visit_type, inspection_date)")
      .eq("project_id", projectUuid)
      .eq("tree_id", routeTreeId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setHistoryError(error.message);
          setHistoryRecords([]);
          return;
        }
        setHistoryRecords((data ?? []) as TreeVisitRecord[]);
      });

    return () => { cancelled = true; };
  }, [project?.uuid, routeTreeId]);

  useEffect(() => {
    return () => {
      selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, [selectedPhotos]);

  const acceptedMimeTypes = useMemo(() => new Set(["image/png", "image/jpeg", "image/jpg"]), []);

  const handlePhotoCardClick = () => {
    setFileSelectionError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = Array.from(event.target.files ?? []);
      selectedPhotos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));

      if (files.length === 0) {
        setSelectedPhotos([]);
        return;
      }

      const invalidFile = files.find((file) => !acceptedMimeTypes.has(file.type));
      if (invalidFile) {
        setSelectedPhotos([]);
        setFileSelectionError("Please select JPG or PNG image files only.");
        event.target.value = "";
        return;
      }

      const nextPhotos = files.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));
      setSelectedPhotos(nextPhotos);
      setFileSelectionError(null);
    } catch (error) {
      setSelectedPhotos([]);
      setFileSelectionError("Failed to select photos.");
      console.error("Photo selection failed:", error);
    } finally {
      event.target.value = "";
    }
  };

  if (!project || loading) return <LoadingSkeleton />;

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
        <WifiOff size={40} color="#EF4444" />
        <p style={{ color: "#DC2626", fontSize: "0.95rem", fontWeight: 700 }}>Failed to load tree</p>
        <p style={{ color: "#6B7280", fontSize: "0.8rem", lineHeight: 1.5 }}>{fetchError}</p>
        <button onClick={() => navigate("/trees")} className="px-5 py-2.5 rounded-xl text-white mt-2"
          style={{ background: "#1B4332", fontSize: "0.85rem" }}>
          Back to Trees
        </button>
      </div>
    );
  }

  if (!tree) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-8 text-center">
        <TreePine size={48} color="#9CA3AF" />
        <p style={{ color: "#374151", fontSize: "0.95rem", fontWeight: 700 }}>Tree not found</p>
        <button onClick={() => navigate("/trees")} className="px-5 py-2.5 rounded-xl text-white mt-2"
          style={{ background: "#1B4332", fontSize: "0.85rem" }}>
          Back to Trees
        </button>
      </div>
    );
  }

  const encColor  = ENC_COLOR[tree.encroachmentClass];
  const encBg     = ENC_BG[tree.encroachmentClass];
  const hasEnc    = tree.encroachmentClass !== "None" ||
    (tree.nrzEncroachment !== "None" && tree.nrzEncroachment !== "");

  // TPM status display
  const tpmDisplay = {
    compliant:       { bg: "#DCFCE7", text: "#15803D", label: "Compliant",     icon: <CheckCircle2 size={14} /> },
    "not-compliant": { bg: "#FEE2E2", text: "#DC2626", label: "Not Compliant", icon: <XCircle size={14} /> },
  }[tpmStatus];

  const handleQuickInspectionSave = async () => {
    if (!tree || !project?.uuid) return;

    setQuickSaveError(null);
    setIsQuickSaving(true);

    try {
      const normalizedTreeId = String(tree.id).trim();
      const projectId = tree.project_id ?? project?.uuid;
      let photoUrls: string[] = [];

      if (selectedPhotos.length > 0) {
        const uploadResults = await Promise.all(
          selectedPhotos.map(async ({ file }) => {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const filePath = `${projectId}/${normalizedTreeId}/${Date.now()}-${safeName}`;
            const { error: uploadError } = await supabase
              .storage
              .from("tree-photos")
              .upload(filePath, file, { upsert: false });

            if (uploadError) {
              console.error("Supabase storage upload error:", uploadError);
              throw new Error("Failed to upload photos.");
            }

            const { data: publicData } = supabase
              .storage
              .from("tree-photos")
              .getPublicUrl(filePath);

            return publicData.publicUrl;
          }),
        );

        photoUrls = uploadResults;
      }

      const { data: existingVisit, error: existingVisitError } = await supabase
        .from("visits")
        .select("id")
        .eq("project_id", projectId)
        .eq("inspection_date", quickInspectionDate)
        .eq("visit_type", quickVisitType)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingVisitError) throw existingVisitError;

      let visitId = existingVisit?.id ?? null;

      if (!visitId) {
        const { data: createdVisit, error: createdVisitError } = await supabase
          .from("visits")
          .insert({
            project_id: projectId,
            tree_id: normalizedTreeId,
            visit_type: quickVisitType,
            inspection_date: quickInspectionDate,
            inspector_name: project.inspector?.trim() || "Site Arborist",
            notes: "",
          })
          .select("id")
          .single();

        if (createdVisitError) throw createdVisitError;
        if (!createdVisit?.id) throw new Error("Visit was created but no id was returned.");
        visitId = createdVisit.id;
      }

      const { error: upsertTreeVisitRecordError } = await supabase
        .from("tree_visit_records")
        .upsert({
          visit_id: visitId,
          project_id: projectId,
          tree_id: normalizedTreeId,
          tpm_status: tpmStatus,
          health: health || null,
          damage: damage || null,
          photo_urls: photoUrls,
          notes: "",
        }, { onConflict: "visit_id,tree_id" });

      if (upsertTreeVisitRecordError) {
        console.error("Quick tree inspection upsert failed:", upsertTreeVisitRecordError);
        throw upsertTreeVisitRecordError;
      }

      navigate(`/visits/${visitId}`);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Failed to save quick tree inspection.";
      setQuickSaveError(message);
      console.error("Quick tree inspection save failed:", error);
    } finally {
      setIsQuickSaving(false);
    }
  };

  return (
    <div className="pb-28">
      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}>
        <button onClick={() => navigate("/trees")}
          className="flex items-center gap-1.5 mb-4"
          style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}>
          <ChevronLeft size={16} /> Tree Inventory
        </button>

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="rounded-lg px-2.5 py-1"
                style={{ background: "rgba(255,255,255,0.2)", color: "white",
                  fontSize: "0.8rem", fontWeight: 700 }}>
                {tree.id}
              </span>
              <EncroachmentBadge encroachmentClass={tree.encroachmentClass} compact />
            </div>
            <h1 style={{ color: "white", fontSize: "1.15rem", fontWeight: 700,
              lineHeight: 1.3, fontStyle: "italic" }}>
              {tree.botanicalName}
            </h1>
            {tree.commonName && (
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem", marginTop: 3 }}>
                {tree.commonName}
              </p>
            )}
          </div>
          {/* Live compliance status chip */}
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 flex-shrink-0"
            style={{ background: tpmDisplay.bg }}>
            <span style={{ color: tpmDisplay.text }}>{tpmDisplay.icon}</span>
            <span style={{ color: tpmDisplay.text, fontSize: "0.68rem", fontWeight: 700 }}>
              {tpmDisplay.label}
            </span>
          </span>
        </div>

        {(tree.latitude !== 0 || tree.longitude !== 0) && (
          <div className="flex items-center gap-2 mt-3">
            <Navigation size={13} color="rgba(255,255,255,0.65)" />
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem", fontFamily: "monospace" }}>
              {tree.latitude.toFixed(6)}, {tree.longitude.toFixed(6)}
            </span>
          </div>
        )}
      </div>

      {/* ── Quick Stats ── */}
      <div
        className="mx-4 -mt-4 rounded-2xl px-3 py-3 flex items-center justify-around"
        style={{ background: "white", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
      >
        {[
          { label: "NRZ",      value: `${tree.nrzRadius} m` },
          { label: "SRZ",      value: tree.srzRadius != null ? `${tree.srzRadius} m` : "—" },
          { label: "Class",    value: tree.encroachmentClass, color: encColor },
          { label: "Visits",   value: String(historyRecords.length) },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-0.5 px-1">
            <span style={{ color: color ?? "#1B4332", fontSize: "0.88rem", fontWeight: 700, textAlign: "center" }}>
              {value}
            </span>
            <span style={{ color: "#9CA3AF", fontSize: "0.62rem" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex mx-4 mt-5 rounded-xl overflow-hidden" style={{ background: "#F3F4F6" }}>
        {(["compliance", "info", "history"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-2.5 capitalize transition-all"
            style={{
              background:   activeTab === tab ? "#1B4332" : "transparent",
              color:        activeTab === tab ? "white"   : "#6B7280",
              fontSize:     "0.78rem",
              fontWeight:   activeTab === tab ? 600 : 400,
              borderRadius: "0.75rem",
            }}
          >
            {tab === "history" ? `History (${historyRecords.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="px-4 mt-4">

        {/* ── Compliance tab ── */}
        {activeTab === "compliance" && (
          <div>
            {/* Encroachment context panel */}
            <div className="rounded-2xl p-4 mb-4 flex items-start gap-3" style={{ background: encBg }}>
              <Shield size={18} color={encColor} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 600, color: encColor }}>
                  {hasEnc ? `${tree.encroachmentClass === "None" ? "NRZ" : tree.encroachmentClass} Encroachment Recorded`
                    : "No Encroachment on Record"}
                </p>
                <p style={{ color: "#4B5563", fontSize: "0.75rem", marginTop: 3, lineHeight: 1.55 }}>
                  Retention recommendation: <strong>{tree.retentionStatus}</strong>
                  {tree.encroachmentParts ? ` · Affected: ${tree.encroachmentParts}` : ""}
                </p>
              </div>
            </div>

            <RequiredMeasuresCard measures={tree.requiredMeasures} />

            {/* TPM compliance */}
            <TPMStatusCard
              value={tpmStatus}
              onChange={setTpmStatus}
            />

            {/* Tree health */}
            <HealthCard value={health} onChange={setHealth} />

            {/* Tree damage */}
            <DamageCard value={damage} onChange={setDamage} />

            {/* Photos */}
            <PhotoCard
              selectedPhotos={selectedPhotos}
              onCardClick={handlePhotoCardClick}
              fileSelectionError={fileSelectionError}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              onChange={handleFileSelection}
              style={{ display: "none" }}
            />

            <div
              className="rounded-2xl p-4 mb-4"
              style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
            >
              <SectionLabel label="Inspection Date" />
              <input
                type="date"
                value={quickInspectionDate}
                onChange={(event) => setQuickInspectionDate(event.target.value)}
                className="w-full rounded-xl px-3 py-2.5 mb-3"
                style={{
                  border: "1px solid #D1D5DB",
                  background: "#F9FAFB",
                  color: "#111827",
                  fontSize: "0.82rem",
                }}
              />
              <SectionLabel label="Visit Type" />
              <select
                value={quickVisitType}
                onChange={(event) => setQuickVisitType(event.target.value as VisitType)}
                className="w-full rounded-xl px-3 py-2.5"
                style={{
                  border: "1px solid #D1D5DB",
                  background: "#F9FAFB",
                  color: "#111827",
                  fontSize: "0.82rem",
                }}
              >
                {ALL_VISIT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <button
                onClick={handleQuickInspectionSave}
                disabled={isQuickSaving}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 mt-3 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: "#1B4332" }}
              >
                <CheckCircle2 size={18} color="white" />
                <span style={{ color: "white", fontSize: "0.9rem", fontWeight: 700 }}>
                  {isQuickSaving ? "Saving..." : "Save Tree Inspection"}
                </span>
              </button>
              {quickSaveError && (
                <p style={{ color: "#B91C1C", fontSize: "0.75rem", marginTop: 8, lineHeight: 1.5 }}>
                  {quickSaveError}
                </p>
              )}
            </div>

            {/* Baseline disclaimer */}
            <div className="rounded-xl p-3 flex items-start gap-2"
              style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}>
              <Info size={12} color="#0284C7" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: "#0369A1", fontSize: "0.68rem", lineHeight: 1.55 }}>
                Use <strong>Save Tree Inspection</strong> for a quick single-tree record, or <strong>Start Visit</strong>
                to capture a full multi-tree site visit.
              </p>
            </div>
          </div>
        )}

        {/* ── Info tab ── */}
        {activeTab === "info" && (
          <div className="flex flex-col gap-4 pb-4">
            {/* Core info */}
            <div className="rounded-2xl px-4 py-1"
              style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
              <InfoRow label="Botanical Name"           value={tree.botanicalName} />
              {tree.commonName   && <InfoRow label="Common Name"         value={tree.commonName} />}
              {tree.origin       && <InfoRow label="Origin"              value={tree.origin} />}
              <InfoRow label="Location"                 value={tree.location} />
              <InfoRow label="NRZ Radius"               value={`${tree.nrzRadius} m`} />
              <InfoRow label="NRZ Encroachment"
                value={tree.nrzEncroachment === "None" || !tree.nrzEncroachment ? "None" : tree.nrzEncroachment}
                color={(tree.nrzEncroachment === "None" || !tree.nrzEncroachment) ? "#15803D" : "#DC2626"} />
              {tree.srzRadius != null && <InfoRow label="SRZ Radius"     value={`${tree.srzRadius} m`} />}
              {tree.srzEncroachment && tree.srzEncroachment !== "None" && (
                <InfoRow label="SRZ Encroachment" value={tree.srzEncroachment} color="#DC2626" />
              )}
              <InfoRow label="Encroachment Class"       value={tree.encroachmentClass} color={encColor} />
              {tree.encroachmentParts && <InfoRow label="Affected Parts"  value={tree.encroachmentParts} />}
              <InfoRow label="Retention Recommendation" value={tree.retentionStatus} />
            </div>

            {/* Physical */}
            {(tree.dbhCm != null || tree.heightM != null || tree.spreadM != null ||
              tree.age || tree.health || tree.structure) && (
              <div className="rounded-2xl px-4 py-1"
                style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="pt-3 pb-1 flex items-center gap-1.5">
                  <Ruler size={11} color="#9CA3AF" />
                  <span style={{ color: "#9CA3AF", fontSize: "0.6rem", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Physical Attributes
                  </span>
                </div>
                {tree.dbhCm   != null && <InfoRow label="DBH"      value={`${tree.dbhCm} cm`} />}
                {tree.heightM != null && <InfoRow label="Height"    value={`${tree.heightM} m`} />}
                {tree.spreadM != null && <InfoRow label="Spread"    value={`${tree.spreadM} m`} />}
                {tree.age     && <InfoRow label="Age"               value={tree.age} />}
                {tree.ule     && <InfoRow label="ULE"               value={tree.ule} />}
                {tree.health  && <InfoRow label="Baseline Health"   value={tree.health} />}
                {tree.structure && <InfoRow label="Structure"       value={tree.structure} />}
              </div>
            )}

            {/* GPS */}
            {(tree.latitude !== 0 || tree.longitude !== 0) && (
              <div className="rounded-2xl px-4 py-1"
                style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <InfoRow label="GPS"
                  value={`${tree.latitude.toFixed(6)}, ${tree.longitude.toFixed(6)}`} mono />
              </div>
            )}
          </div>
        )}

        {/* ── History tab ── */}
        {activeTab === "history" && (
          <div className="flex flex-col gap-3 pb-4">
            {historyError ? (
              <div className="rounded-2xl px-4 py-6 flex flex-col gap-2 text-center"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
                <p style={{ color: "#B91C1C", fontSize: "0.85rem", fontWeight: 700 }}>
                  Failed to load tree visit history
                </p>
                <p style={{ color: "#991B1B", fontSize: "0.75rem", lineHeight: 1.5 }}>
                  {historyError}
                </p>
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="rounded-2xl px-4 py-10 flex flex-col items-center gap-3 text-center"
                style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}>
                <ClipboardList size={30} color="#D1D5DB" />
                <p style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: 500 }}>
                  No inspections recorded yet
                </p>
                <p style={{ color: "#9CA3AF", fontSize: "0.72rem", lineHeight: 1.5 }}>
                  This tree will appear in visit history after it's included in a site inspection.
                </p>
                <button
                  onClick={() => navigate("/visits/new")}
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5 active:scale-95 transition-transform"
                  style={{ background: "#1B4332" }}
                >
                  <ClipboardList size={13} color="white" />
                  <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 700 }}>
                    Start a Visit
                  </span>
                </button>
              </div>
            ) : (
              historyRecords.map((record) => {
                const visitTypeRaw = record.visits?.visit_type ?? "Routine Visit";
                const visitType = (visitTypeRaw in VISIT_TYPE_SHORT
                  ? visitTypeRaw
                  : "Routine Visit") as VisitType;
                const cfg = VISIT_TYPE_COLORS[visitType];
                const isBreach = record.tpm_status === "not-compliant";
                const eventDate = record.visits?.inspection_date ?? record.created_at;
                const photoUrls = Array.isArray(record.photo_urls) ? record.photo_urls.filter(Boolean) : [];
                const hasPhotos = photoUrls.length > 0;
                return (
                  <div
                    key={record.id}
                    className="w-full rounded-2xl p-4 text-left"
                    style={{
                      background: "white",
                      border: `1.5px solid ${isBreach ? "#FECACA" : "#F3F4F6"}`,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="rounded-lg px-2 py-0.5"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                            <span style={{ color: cfg.text, fontSize: "0.6rem", fontWeight: 700 }}>
                              {VISIT_TYPE_SHORT[visitType]}
                            </span>
                          </span>
                          <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>
                            {new Date(eventDate).toLocaleDateString("en-AU",
                              { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {record.tpm_status && (
                            <span className="rounded-full px-2 py-0.5"
                              style={{
                                background: isBreach ? "#FEE2E2" : "#DCFCE7",
                                color: isBreach ? "#DC2626" : "#15803D",
                                fontSize: "0.65rem", fontWeight: 700,
                              }}>
                              {isBreach ? "Not Compliant" : "Compliant"}
                            </span>
                          )}
                          {record.health && (
                            <span className="rounded-full px-2 py-0.5"
                              style={{ background: "#F3F4F6", color: "#374151",
                                fontSize: "0.65rem" }}>
                              Health: {record.health}
                            </span>
                          )}
                          {record.damage === "Yes" && (
                            <span className="rounded-full px-2 py-0.5"
                              style={{ background: "#FEE2E2", color: "#DC2626",
                                fontSize: "0.65rem", fontWeight: 600 }}>
                              Damage
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <p style={{
                            color: "#9CA3AF",
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 6,
                          }}>
                            Required Tree Protection Measures
                          </p>
                          {tree.requiredMeasures.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {tree.requiredMeasures.map((measure) => (
                                <span
                                  key={`${record.id}-${measure}`}
                                  className="rounded-full px-2 py-0.5"
                                  style={{
                                    background: "#F0FDF4",
                                    border: "1px solid #BBF7D0",
                                    color: "#166534",
                                    fontSize: "0.65rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  {measure}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
                              No required measures recorded
                            </p>
                          )}
                        </div>
                        {record.notes && (
                          <p style={{ color: "#4B5563", fontSize: "0.73rem",
                            marginTop: 6, lineHeight: 1.5 }}>
                            {record.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {hasPhotos && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(photoUrls[0])}
                            className="relative h-14 w-14 rounded-lg overflow-hidden border"
                            style={{ borderColor: "#E5E7EB", flexShrink: 0 }}
                          >
                            <img
                              src={photoUrls[0]}
                              alt="Visit photo"
                              className="h-full w-full object-cover"
                            />
                            {photoUrls.length > 1 && (
                              <span
                                className="absolute bottom-1 right-1 rounded-full px-1.5 py-0.5"
                                style={{
                                  background: "rgba(17,24,39,0.8)",
                                  color: "white",
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                }}
                              >
                                +{photoUrls.length - 1}
                              </span>
                            )}
                          </button>
                        )}
                        <ChevronRight size={13} color="#D1D5DB" style={{ flexShrink: 0, opacity: 0.5 }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="max-w-md w-full rounded-xl overflow-hidden"
            style={{ background: "#111827" }}
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={previewImageUrl}
              alt="Preview"
              className="w-full max-h-[70vh] object-contain"
            />
            <button
              type="button"
              className="w-full py-2.5"
              style={{ color: "white", fontSize: "0.82rem", borderTop: "1px solid rgba(255,255,255,0.2)" }}
              onClick={() => setPreviewImageUrl(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
