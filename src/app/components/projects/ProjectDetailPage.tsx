import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { CheckCircle2, ChevronLeft, MapPin, Trees } from "lucide-react";
import { useProject } from "../../context/ProjectContext";
import { type InspectionFrequency } from "../../data/projectsData";
import { updateProjectInspectionSchedule } from "../../data/projectsApi";
import { supabase } from "../../../lib/supabase";

const INSPECTION_FREQUENCIES: InspectionFrequency[] = ["Monthly", "2-monthly", "3-monthly"];

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  monitoring: "Monitoring",
  completed: "Completed",
};

type ImportedTreePreview = {
  id: string;
  tree_id: string | null;
  botanical_name: string | null;
  common_name: string | null;
  location: string | null;
  retention_status: string | null;
};

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { projects, loadingProjects, updateProject } = useProject();

  const project = useMemo(
    () => projects.find((item) => item.id === id) ?? null,
    [projects, id]
  );

  const [treeCount, setTreeCount] = useState<number | null>(null);
  const [treePreview, setTreePreview] = useState<ImportedTreePreview[]>([]);
  const [inspectionFrequency, setInspectionFrequency] = useState<InspectionFrequency>("Monthly");
  const [nextInspectionDue, setNextInspectionDue] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setInspectionFrequency(project.inspectionFrequency);
    setNextInspectionDue(project.nextInspectionDue);
    setReminderEnabled(project.reminderEnabled);
    setReminderEmail(project.reminderEmail);
  }, [project]);

  useEffect(() => {
    if (!project?.uuid) return;
    let cancelled = false;
    setTreeCount(null);
    setTreePreview([]);

    supabase
      .from("trees")
      .select("id, tree_id, botanical_name, common_name, location, retention_status", { count: "exact" })
      .eq("project_id", project.uuid)
      .order("tree_id", { ascending: true })
      .limit(10)
      .then(({ data, count, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("ProjectDetailPage tree load error:", error);
          setTreeCount(0);
          setTreePreview([]);
          return;
        }
        setTreeCount(count ?? data?.length ?? 0);
        setTreePreview((data ?? []) as ImportedTreePreview[]);
      });

    return () => {
      cancelled = true;
    };
  }, [project?.uuid]);

  const importSuccess = (location.state as { importSuccess?: string } | null)?.importSuccess;

  const handleSaveSchedule = async () => {
    if (!project) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      if (reminderEnabled && reminderEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reminderEmail.trim())) {
        throw new Error("Please enter a valid reminder email.");
      }

      const updated = await updateProjectInspectionSchedule(project.uuid, {
        inspectionFrequency,
        nextInspectionDue,
        reminderEnabled,
        reminderEmail: reminderEmail.trim(),
      });

      updateProject(project.id, updated);
      setSaveSuccess("Inspection schedule saved.");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingProjects) {
    return <div className="px-4 pt-12">Loading project…</div>;
  }

  if (!project) {
    return (
      <div className="px-4 pt-12">
        <p style={{ color: "#111827", fontSize: "1rem", fontWeight: 700 }}>Project not found</p>
        <button
          className="mt-4 rounded-xl px-4 py-2"
          style={{ background: "#1B4332", color: "white" }}
          onClick={() => navigate("/projects")}
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="px-4 pt-12 pb-5" style={{ background: "linear-gradient(175deg, #1B4332 0%, #2D6A4F 100%)" }}>
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-1.5 mb-3"
          style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", fontWeight: 600 }}
        >
          <ChevronLeft size={15} /> Back to projects
        </button>
        <h1 style={{ color: "white", fontSize: "1.35rem", fontWeight: 800 }}>{project.name}</h1>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-3">
        {importSuccess && (
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <CheckCircle2 size={16} color="#16A34A" />
            <p style={{ color: "#166534", fontSize: "0.78rem", fontWeight: 700 }}>{importSuccess}</p>
          </div>
        )}

        <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid #E5E7EB" }}>
          <p style={{ color: "#9CA3AF", fontSize: "0.65rem", textTransform: "uppercase", fontWeight: 700 }}>Site address</p>
          <div className="flex items-start gap-2 mt-2">
            <MapPin size={14} color="#6B7280" />
            <p style={{ color: "#111827", fontSize: "0.85rem", fontWeight: 500 }}>{project.site || "Not set"}</p>
          </div>

          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <Trees size={14} color="#166534" />
              <span style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 600 }}>
                {treeCount === null ? "Loading…" : `${treeCount} trees`}
              </span>
            </div>
            <span className="rounded-full px-2 py-0.5" style={{ background: "#F3F4F6", color: "#4B5563", fontSize: "0.72rem", fontWeight: 700 }}>
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #E5E7EB" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <p style={{ color: "#111827", fontSize: "0.9rem", fontWeight: 800 }}>Imported trees</p>
            <p style={{ color: "#6B7280", fontSize: "0.7rem", marginTop: 2 }}>
              {treeCount === null ? "Loading tree records…" : `Showing ${treePreview.length} of ${treeCount} tree records for this project.`}
            </p>
          </div>
          {treePreview.length === 0 ? (
            <div className="px-4 py-5 text-center" style={{ color: "#9CA3AF", fontSize: "0.78rem" }}>No trees imported yet.</div>
          ) : (
            <div className="divide-y" style={{ borderColor: "#F3F4F6" }}>
              {treePreview.map((tree) => (
                <div key={tree.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 800 }}>Tree {tree.tree_id || "Not recorded"}</p>
                    <p style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {tree.botanical_name || tree.common_name || "Species not recorded"}
                    </p>
                    {tree.location && <p style={{ color: "#9CA3AF", fontSize: "0.68rem", marginTop: 1 }}>{tree.location}</p>}
                  </div>
                  {tree.retention_status && (
                    <span className="rounded-full px-2 py-0.5 flex-shrink-0" style={{ background: "#F3F4F6", color: "#4B5563", fontSize: "0.66rem", fontWeight: 700 }}>
                      {tree.retention_status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          {treePreview.length > 0 && (
            <button
              onClick={() => navigate("/trees")}
              className="w-full py-3 active:bg-gray-50"
              style={{ color: "#166534", fontSize: "0.78rem", fontWeight: 800, borderTop: "1px solid #F3F4F6" }}
            >
              Open full tree register
            </button>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: "white", border: "1px solid #D1FAE5" }}>
          <p style={{ color: "#166534", fontSize: "0.85rem", fontWeight: 700, marginBottom: 10 }}>Inspection Schedule</p>

          <label style={{ color: "#374151", fontSize: "0.75rem", fontWeight: 600 }}>Inspection frequency</label>
          <select
            value={inspectionFrequency}
            onChange={(event) => setInspectionFrequency(event.target.value as InspectionFrequency)}
            className="w-full rounded-xl px-3 py-2.5 mt-1 mb-3"
            style={{ border: "1px solid #D1D5DB", fontSize: "0.82rem", background: "#F9FAFB" }}
          >
            {INSPECTION_FREQUENCIES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <label style={{ color: "#374151", fontSize: "0.75rem", fontWeight: 600 }}>Next inspection due date</label>
          <input
            type="date"
            value={nextInspectionDue}
            onChange={(event) => setNextInspectionDue(event.target.value)}
            className="w-full rounded-xl px-3 py-2.5 mt-1 mb-3"
            style={{ border: "1px solid #D1D5DB", fontSize: "0.82rem", background: "#F9FAFB" }}
          />

          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={reminderEnabled}
              onChange={(event) => setReminderEnabled(event.target.checked)}
            />
            <span style={{ color: "#374151", fontSize: "0.78rem", fontWeight: 600 }}>Enable reminder email</span>
          </label>

          <label style={{ color: "#374151", fontSize: "0.75rem", fontWeight: 600 }}>Reminder email</label>
          <input
            type="email"
            value={reminderEmail}
            onChange={(event) => setReminderEmail(event.target.value)}
            disabled={!reminderEnabled}
            placeholder="arborist@example.com"
            className="w-full rounded-xl px-3 py-2.5 mt-1"
            style={{
              border: "1px solid #D1D5DB",
              fontSize: "0.82rem",
              background: reminderEnabled ? "#F9FAFB" : "#F3F4F6",
              opacity: reminderEnabled ? 1 : 0.7,
            }}
          />

          {saveError && <p style={{ color: "#B91C1C", fontSize: "0.72rem", marginTop: 8 }}>{saveError}</p>}
          {saveSuccess && !saveError && <p style={{ color: "#166534", fontSize: "0.72rem", marginTop: 8 }}>{saveSuccess}</p>}
          {saving && <p style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 8 }}>Saving…</p>}

          <button
            onClick={handleSaveSchedule}
            disabled={saving}
            className="w-full rounded-xl py-2.5 mt-3 active:scale-95 transition-transform"
            style={{ background: saving ? "#86EFAC" : "#166534", color: "white", fontSize: "0.82rem", fontWeight: 700 }}
          >
            {saving ? "Saving…" : "Save Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
