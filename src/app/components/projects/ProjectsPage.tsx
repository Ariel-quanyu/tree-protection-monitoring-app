import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  MapPin, Trees, AlertCircle, Calendar, ChevronRight,
  FolderOpen, Bell, BellOff, Clock, AlertTriangle,
} from "lucide-react";
import { type ProjectData } from "../../data/projectsData";
import { useProject } from "../../context/ProjectContext";
import { supabase } from "../../../lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:     { bg: "#DCFCE7", text: "#15803D", dot: "#16A34A", label: "Active"     },
  monitoring: { bg: "#FEF9C3", text: "#854D0E", dot: "#CA8A04", label: "Monitoring" },
  completed:  { bg: "#F3F4F6", text: "#6B7280", dot: "#9CA3AF", label: "Completed"  },
} as const;

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

/** Returns a label + color describing the urgency of a due date */
function dueDateMeta(iso: string): {
  label: string; color: string; bg: string; icon: "overdue" | "soon" | "ok" | "none";
} {
  const d = parseDate(iso);
  if (!d) return { label: "Not set", color: "#6B7280", bg: "#F9FAFB", icon: "none" };
  const days = daysFromToday(d);
  if (days < 0) return { label: `Overdue by ${Math.abs(days)}d`, color: "#DC2626", bg: "#FEF2F2", icon: "overdue" };
  if (days === 0) return { label: "Due today", color: "#B45309", bg: "#FFFBEB", icon: "soon" };
  return { label: `In ${days}d`, color: "#166534", bg: "#F0FDF4", icon: "ok" };
}

// ─── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  treeCount,
  isSelected,
}: {
  project: ProjectData;
  treeCount: number | null;
  isSelected: boolean;
}) {
  const navigate  = useNavigate();
  const { setSelectedProjectId } = useProject();
  const st        = STATUS_CFG[project.status];
  const dueDate = dueDateMeta(project.nextInspectionDue);
  const hasCritical = project.criticalObs > 0;

  const handleOpen = () => {
    setSelectedProjectId(project.id);
    navigate("/trees");
  };

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "white",
        boxShadow: isSelected
          ? "0 4px 20px rgba(27,67,50,0.14)"
          : "0 1px 8px rgba(0,0,0,0.06)",
        border: hasCritical
          ? "1.5px solid #FECACA"
          : isSelected
          ? "1.5px solid #6EE7B7"
          : "1.5px solid #F3F4F6",
      }}
    >
      {/* Critical alert strip */}
      {hasCritical && (
        <div
          className="flex items-center gap-1.5 px-4 py-2"
          style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}
        >
          <AlertCircle size={11} color="#DC2626" />
          <span style={{ color: "#DC2626", fontSize: "0.65rem", fontWeight: 700 }}>
            {project.criticalObs} critical alert{project.criticalObs !== 1 ? "s" : ""} — action required
          </span>
        </div>
      )}

      {/* ── Card body ── */}
      <button
        className="w-full text-left p-4 active:bg-gray-50 transition-colors"
        onClick={handleOpen}
      >
        {/* Row 1: Name + status + chevron */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p style={{ color: "#111827", fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.25 }}>
              {project.name}
            </p>
            {project.reference && (
              <p style={{ color: "#9CA3AF", fontSize: "0.65rem", fontFamily: "monospace", marginTop: 2 }}>
                {project.reference}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
              style={{ background: st.bg }}
            >
              <span className="rounded-full" style={{ width: 5, height: 5, background: st.dot, display: "inline-block" }} />
              <span style={{ color: st.text, fontSize: "0.63rem", fontWeight: 700 }}>{st.label}</span>
            </span>
            <ChevronRight size={15} color="#D1D5DB" />
          </div>
        </div>

        {/* Row 2: Site address */}
        {project.site && (
          <div className="flex items-start gap-1 mt-2">
            <MapPin size={11} color="#9CA3AF" style={{ marginTop: 2, flexShrink: 0 }} />
            <p style={{ color: "#6B7280", fontSize: "0.73rem", lineHeight: 1.45 }}>
              {project.site}
            </p>
          </div>
        )}
      </button>

      {/* ── Monitoring section ── */}
      <div
        className="px-4 pb-4 flex flex-col gap-0"
        style={{ borderTop: "1px solid #F3F4F6" }}
      >
        {/* Trees imported */}
        <div
          className="flex items-center justify-between py-2.5"
          style={{ borderBottom: "1px solid #F3F4F6" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ width: 26, height: 26, background: "#F0FDF4" }}
            >
              <Trees size={13} color="#15803D" />
            </div>
            <span style={{ color: "#374151", fontSize: "0.78rem" }}>
              {treeCount === null ? (
                <span className="inline-block rounded animate-pulse" style={{ width: 60, height: 12, background: "#E5E7EB" }} />
              ) : (
                <><strong style={{ color: "#111827" }}>{treeCount.toLocaleString()}</strong> trees imported</>
              )}
            </span>
          </div>
          <span
            className="rounded-full px-2 py-0.5"
            style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
          >
            <span style={{ color: "#0369A1", fontSize: "0.58rem", fontWeight: 600 }}>Baseline inventory</span>
          </span>
        </div>

        {/* ── Monitoring schedule ── */}
        <div className="pt-3 pb-0.5">
          <p style={{
            color: "#9CA3AF", fontSize: "0.58rem", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 8,
          }}>
            Monitoring Schedule
          </p>

          <div className="grid grid-cols-3 gap-2">

            {/* — Frequency — */}
            <div
              className="rounded-xl p-2.5 flex flex-col gap-1.5"
              style={{ background: "#F5F3FF" }}
            >
              <Calendar size={15} color="#7C3AED" />
              <p style={{ color: "#1E1B4B", fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.15 }}>
                {project.inspectionFrequency}
              </p>
              <p style={{ color: "#7C3AED", fontSize: "0.57rem", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Frequency
              </p>
            </div>

            {/* — Next due — */}
            <div className="rounded-xl p-2.5 flex flex-col gap-1.5" style={{ background: dueDate.bg }}>
              {dueDate.icon === "overdue" ? (
                <AlertTriangle size={15} color="#DC2626" />
              ) : dueDate.icon === "soon" ? (
                <Clock size={15} color="#B45309" />
              ) : dueDate.icon === "ok" ? (
                <Clock size={15} color="#166534" />
              ) : (
                <Calendar size={15} color="#9CA3AF" />
              )}
              <p style={{ color: dueDate.color, fontSize: "0.75rem", fontWeight: 700, lineHeight: 1.2 }}>
                {dueDate.label}
              </p>
              <p style={{ color: dueDate.icon === "overdue" ? "#FCA5A5"
                : dueDate.icon === "soon" ? "#FCD34D"
                : dueDate.icon === "ok" ? "#16A34A"
                : "#9CA3AF",
                fontSize: "0.57rem", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Next Due
              </p>
            </div>

            {/* — Reminder — */}
            <div
              className="rounded-xl p-2.5 flex flex-col gap-1.5 text-left"
              style={{ background: project.reminderEnabled ? "#FFFBEB" : "#F9FAFB" }}
              aria-label="Reminder status"
            >
              {project.reminderEnabled
                ? <Bell size={15} color="#B45309" />
                : <BellOff size={15} color="#9CA3AF" />}
              <p style={{
                color: project.reminderEnabled ? "#92400E" : "#6B7280",
                fontSize: "0.8rem", fontWeight: 700, lineHeight: 1.15,
              }}>
                {project.reminderEnabled ? "Enabled" : "Disabled"}
              </p>
              <p style={{ color: project.reminderEnabled ? "#B45309" : "#9CA3AF",
                fontSize: "0.57rem", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Reminder
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Summary stat tile ────────────────────────────────────────────────────────

function StatTile({ label, value, color = "white", sub }: {
  label: string; value: number | string; color?: string; sub?: string;
}) {
  return (
    <div className="flex-1 text-center">
      <p style={{ color, fontSize: "1.25rem", fontWeight: 800, lineHeight: 1 }}>{value}</p>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.58rem", marginTop: 3, lineHeight: 1.3 }}>
        {label}
      </p>
      {sub && (
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.55rem", marginTop: 1 }}>{sub}</p>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

type Filter = "all" | "active" | "monitoring" | "completed";

export function ProjectsPage() {
  const { projects, loadingProjects } = useProject();
  const [filter,      setFilter]      = useState<Filter>("all");
  const [treeCounts,  setTreeCounts]  = useState<Record<string, number>>({});

  // Fetch total tree count per project (lightweight — project_id only)
  useEffect(() => {
    if (projects.length === 0) return;
    supabase
      .from("trees")
      .select("project_id")
      .then(({ data }) => {
        if (!data) return;
        const counts: Record<string, number> = {};
        data.forEach(row => {
          const pid = String(row.project_id ?? "");
          if (pid) counts[pid] = (counts[pid] ?? 0) + 1;
        });
        setTreeCounts(counts);
      });
  }, [projects.length]);

  // ── Derived summary stats (project-level only) ──────────────────────────────
  const totalProjects  = projects.length;
  const activeProjects = projects.filter(p => p.status === "active").length;
  const criticalCount  = projects.filter(p => p.criticalObs > 0).length;
  const dueSoonCount   = projects.filter(p => {
    const d = parseDate(p.nextInspectionDue);
    if (!d) return false;
    return daysFromToday(d) <= 14; // overdue OR within 14 days
  }).length;

  const filtered = filter === "all"
    ? projects
    : projects.filter(p => p.status === filter);

  const filterCounts: Record<Filter, number> = {
    all:        projects.length,
    active:     projects.filter(p => p.status === "active").length,
    monitoring: projects.filter(p => p.status === "monitoring").length,
    completed:  projects.filter(p => p.status === "completed").length,
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loadingProjects) {
    return (
      <div className="pb-28">
        <div
          className="px-4 pt-12 pb-5"
          style={{ background: "linear-gradient(175deg, #1B4332 0%, #2D6A4F 100%)" }}
        >
          <h1 style={{ color: "white", fontSize: "1.45rem", fontWeight: 800 }}>Projects</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", marginTop: 3 }}>Loading…</p>
        </div>
        <div className="px-4 pt-4 flex flex-col gap-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ height: 220, background: "#E5E7EB" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div
        className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(175deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen size={15} color="rgba(255,255,255,0.65)" />
              <span style={{
                color: "rgba(255,255,255,0.5)", fontSize: "0.62rem",
                letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600,
              }}>
                Tree Protection
              </span>
            </div>
            <h1 style={{ color: "white", fontSize: "1.45rem", fontWeight: 800, lineHeight: 1.1 }}>
              Projects
            </h1>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.72rem", marginTop: 3 }}>
              Select a project to open its trees and visits
            </p>
          </div>


        </div>

        {/* ── Project-level summary stats ── */}
        <div
          className="rounded-2xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <div className="flex items-center">
            <StatTile label="Projects"   value={totalProjects} />
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
            <StatTile label="Active"     value={activeProjects} />
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
            <StatTile
              label="Due Soon"
              value={dueSoonCount}
              color={dueSoonCount > 0 ? "#FCD34D" : "white"}
            />
            <div style={{ width: 1, height: 32, background: "rgba(255,255,255,0.15)", flexShrink: 0 }} />
            <StatTile
              label="Critical"
              value={criticalCount}
              color={criticalCount > 0 ? "#FCA5A5" : "white"}
            />
          </div>
        </div>
      </div>

      {/* ── Status filter chips ─────────────────────────────────────────────── */}
      <div
        className="flex gap-2 px-4 py-3 overflow-x-auto bg-white"
        style={{ scrollbarWidth: "none", borderBottom: "1px solid #F3F4F6" }}
      >
        {(["all", "active", "monitoring", "completed"] as Filter[]).map(f => {
          const label = f === "all" ? "All" : STATUS_CFG[f as Exclude<Filter, "all">].label;
          const count = filterCounts[f];
          const active = filter === f;
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="flex-shrink-0 rounded-full px-3.5 py-1.5 transition-all active:scale-95"
              style={{
                background: active ? "#1B4332" : "white",
                color:      active ? "white"   : "#6B7280",
                border:    `1.5px solid ${active ? "#1B4332" : "#E5E7EB"}`,
                fontSize:  "0.73rem",
                fontWeight: active ? 700 : 400,
              }}
            >
              {label}{count > 0 && f !== "all" ? ` (${count})` : f === "all" ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* ── Project list ─────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div
            className="rounded-2xl px-4 py-10 flex flex-col items-center gap-3 text-center"
            style={{ background: "#F9FAFB", border: "1px dashed #E5E7EB" }}
          >
            <FolderOpen size={30} color="#D1D5DB" />
            <p style={{ color: "#6B7280", fontSize: "0.85rem", fontWeight: 500 }}>
              No {filter === "all" ? "" : filter + " "}projects found
            </p>
          </div>
        ) : (
          filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              treeCount={treeCounts[p.uuid] ?? null}
              isSelected={false}
            />
          ))
        )}
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <p style={{ color: "#D1D5DB", fontSize: "0.65rem", textAlign: "center", marginTop: 20, paddingBottom: 4 }}>
          Tap any project card to open its tree inventory and visits
        </p>
      )}
    </div>
  );
}
