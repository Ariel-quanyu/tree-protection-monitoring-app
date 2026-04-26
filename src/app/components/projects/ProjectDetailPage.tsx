import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Calendar, Bell } from "lucide-react";
import { useProject } from "../../context/ProjectContext";
import { updateProjectInspectionSchedule } from "../../data/projectsApi";
import { type InspectionFrequency } from "../../data/projectsData";

const INSPECTION_FREQUENCIES: InspectionFrequency[] = ["Monthly", "2-monthly", "3-monthly"];

function parseDate(iso: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function daysFromToday(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueLabel(iso: string): string {
  const d = parseDate(iso);
  if (!d) return "Not set";
  const days = daysFromToday(d);
  if (days === 0) return "Due today";
  if (days > 0) return `In ${days}d`;
  return `Overdue by ${Math.abs(days)}d`;
}

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { projects, setSelectedProjectId, updateProject } = useProject();

  const project = useMemo(
    () => projects.find((item) => item.id === id) ?? null,
    [projects, id],
  );

  const [inspectionFrequency, setInspectionFrequency] = useState<InspectionFrequency>("Monthly");
  const [nextInspectionDue, setNextInspectionDue] = useState("");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!project) return;
    setSelectedProjectId(project.id);
    setInspectionFrequency(project.inspectionFrequency);
    setNextInspectionDue(project.nextInspectionDue);
    setReminderEnabled(project.reminderEnabled);
    setReminderEmail(project.reminderEmail);
  }, [project, setSelectedProjectId]);

  if (!project) {
    return (
      <div className="px-4 pt-12">
        <button onClick={() => navigate("/projects")} className="flex items-center gap-1.5 mb-4">
          <ArrowLeft size={14} color="#6B7280" />
          <span style={{ color: "#6B7280", fontSize: "0.8rem" }}>Back to Projects</span>
        </button>
        <div className="rounded-2xl p-4" style={{ background: "white", border: "1.5px solid #F3F4F6" }}>
          <p style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>Project not found.</p>
        </div>
      </div>
    );
  }

  const saveSchedule = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
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
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      <div className="px-4 pt-12 pb-5" style={{ background: "linear-gradient(175deg, #1B4332 0%, #2D6A4F 100%)" }}>
        <button onClick={() => navigate("/projects")} className="flex items-center gap-1.5 mb-4">
          <ArrowLeft size={14} color="rgba(255,255,255,0.75)" />
          <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.75rem" }}>Back to Projects</span>
        </button>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Project Detail
        </p>
        <h1 style={{ color: "white", fontSize: "1.35rem", fontWeight: 800, lineHeight: 1.2 }}>{project.name}</h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem", marginTop: 4 }}>{project.reference}</p>
      </div>

      <div className="rounded-2xl p-4 mx-4 mt-4" style={{ background: "white", border: "1.5px solid #D1FAE5", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <p style={{ color: "#166534", fontSize: "0.85rem", fontWeight: 700 }}>Inspection Schedule</p>
          <p style={{ color: "#6B7280", fontSize: "0.68rem", fontWeight: 600 }}>{formatDueLabel(nextInspectionDue)}</p>
        </div>

        <label style={{ color: "#374151", fontSize: "0.7rem", fontWeight: 600 }}>Inspection frequency</label>
        <select
          value={inspectionFrequency}
          onChange={(e) => setInspectionFrequency(e.target.value as InspectionFrequency)}
          className="w-full rounded-xl px-3 py-2.5 mt-1 mb-3"
          style={{ border: "1px solid #D1D5DB", fontSize: "0.82rem", background: "#F9FAFB" }}
        >
          {INSPECTION_FREQUENCIES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>

        <label style={{ color: "#374151", fontSize: "0.7rem", fontWeight: 600 }}>Next inspection due</label>
        <div className="relative mt-1 mb-3">
          <Calendar size={13} color="#9CA3AF" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="date"
            value={nextInspectionDue}
            onChange={(e) => setNextInspectionDue(e.target.value)}
            className="w-full rounded-xl pl-8 pr-3 py-2.5"
            style={{ border: "1px solid #D1D5DB", fontSize: "0.82rem", background: "#F9FAFB" }}
          />
        </div>

        <label className="flex items-center gap-2 mb-3">
          <input type="checkbox" checked={reminderEnabled} onChange={(e) => setReminderEnabled(e.target.checked)} />
          <Bell size={13} color={reminderEnabled ? "#B45309" : "#9CA3AF"} />
          <span style={{ color: "#374151", fontSize: "0.78rem", fontWeight: 600 }}>Enable reminder email</span>
        </label>

        {reminderEnabled && (
          <>
            <label style={{ color: "#374151", fontSize: "0.7rem", fontWeight: 600 }}>Reminder email</label>
            <input
              type="email"
              value={reminderEmail}
              onChange={(e) => setReminderEmail(e.target.value)}
              placeholder="arborist@example.com"
              className="w-full rounded-xl px-3 py-2.5 mt-1"
              style={{ border: "1px solid #D1D5DB", fontSize: "0.82rem", background: "#F9FAFB" }}
            />
          </>
        )}

        {error && <p style={{ color: "#B91C1C", fontSize: "0.72rem", marginTop: 8 }}>{error}</p>}
        {saved && !error && <p style={{ color: "#166534", fontSize: "0.72rem", marginTop: 8 }}>Schedule saved.</p>}

        <button
          onClick={saveSchedule}
          disabled={saving}
          className="w-full rounded-xl py-2.5 mt-3 active:scale-95 transition-transform"
          style={{ background: saving ? "#86EFAC" : "#166534", color: "white", fontSize: "0.82rem", fontWeight: 700 }}
        >
          {saving ? "Saving…" : "Save Schedule"}
        </button>
      </div>
    </div>
  );
}
