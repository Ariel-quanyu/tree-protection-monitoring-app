import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  FileDown, AlertCircle,
  Trees, ClipboardCheck, ChevronRight, Archive,
  TrendingUp, Shield, FileText,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";

function pctColor(pct: number) {
  if (pct >= 90) return "#15803D";
  if (pct >= 70) return "#B45309";
  return "#DC2626";
}

function pctBg(pct: number) {
  if (pct >= 90) return "#DCFCE7";
  if (pct >= 70) return "#FEF3C7";
  return "#FEE2E2";
}

function ComplianceBar({ pct }: { pct: number }) {
  const color = pctColor(pct);
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "#F3F4F6" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span style={{ color, fontSize: "0.7rem", fontWeight: 700, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

type NormalizedStatus = "compliant" | "not_compliant" | "breach" | null;

type VisitRow = {
  id: string;
  project_id: string | null;
  inspection_date: string | null;
  visit_date?: string | null;
  visit_type: string | null;
  inspector_name: string | null;
  inspector?: string | null;
  status?: string | null;
  created_at: string | null;
};

type TreeVisitRecordRow = {
  id?: string;
  project_id?: string | null;
  visit_id: string | null;
  tree_id: string | null;
  tpm_status: string | null;
  health?: string | null;
  structure?: string | null;
  damage?: string | null;
  notes?: string | null;
  follow_up_actions?: string | null;
  photo_urls?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ProjectTabRow = {
  id: string;
  name: string;
  slug: string | null;
  site_address?: string | null;
  client_name?: string | null;
  address?: string | null;
};

type TreeRow = {
  id: string;
  project_id: string | null;
  tree_id: string | null;
  botanical_name: string | null;
  common_name: string | null;
  location: string | null;
  retention_status: string | null;
  tree_protection_measures?: string | null;
  required_measures?: string[] | null;
  health?: string | null;
  structure?: string | null;
  nrz_radius_m?: number | null;
  srz_radius_m?: number | null;
  nrz_encroachment?: string | null;
  encroachment_class?: string | null;
};

type CsvRow = Record<string, string | number | null | undefined>;

const CSV_COLUMNS = [
  "project_name", "project_address", "visit_date", "visit_type", "inspector_name", "visit_status",
  "tree_id", "botanical_name", "common_name", "location", "retention_status", "required_protection_measures",
  "initial_health", "initial_structure", "current_health", "current_structure", "compliance_status", "tree_damage",
  "notes", "follow_up_actions", "photo_urls", "nrz_radius_m", "srz_radius_m", "encroachment", "created_at", "updated_at",
] as const;

function toSemicolon(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.filter(Boolean).map((item) => String(item)).join("; ");
}

function toCsvCell(value: unknown): string {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function normalizeStatus(raw: string | null): NormalizedStatus {
  if (!raw) return null;
  const value = raw.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (value === "compliant") return "compliant";
  if (value === "breach") return "breach";
  if (value === "not_compliant") return "not_compliant";
  return null;
}

export function ReportsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectTabRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [records, setRecords] = useState<TreeVisitRecordRow[]>([]);
  const [trees, setTrees] = useState<TreeRow[]>([]);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("id, slug, name, site_address, client_name")
          .order("name", { ascending: true });

        if (error) {
          console.error("[ReportsPage] projectsError:", error);
          throw error;
        }
        if (!mounted) return;

        const typedProjects = (data ?? []) as ProjectTabRow[];
        setProjects(typedProjects);
        console.log(
          "[ReportsPage] loaded projects:",
          typedProjects.map((project) => ({ id: project.id, name: project.name, slug: project.slug })),
        );
      } catch (error) {
        console.error("Failed to load projects for reports:", error);
        if (!mounted) return;
        setProjects([]);
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    };

    void loadProjects();

    return () => {
      mounted = false;
    };
  }, []);


  useEffect(() => {
    let mounted = true;

    const loadReportData = async () => {
      setLoadingData(true);
      setErrorMessage(null);
      try {
        let visitsQuery = supabase
          .from("visits")
          .select("id, project_id, inspection_date, visit_type, inspector_name, created_at")
          .order("inspection_date", { ascending: false })
          .order("created_at", { ascending: false });

        if (selectedProjectId) {
          visitsQuery = visitsQuery.eq("project_id", selectedProjectId);
        }

        const { data: visitsData, error: visitsError } = await visitsQuery;
        if (visitsError) {
          console.error("[ReportsPage] visitsError:", visitsError);
          throw visitsError;
        }

        let recordsQuery = supabase
          .from("tree_visit_records")
          .select("id, project_id, visit_id, tree_id, tpm_status, health, structure, damage, notes, follow_up_actions, photo_urls, created_at, updated_at");

        if (selectedProjectId) {
          recordsQuery = recordsQuery.eq("project_id", selectedProjectId);
        }

        const { data: recordsData, error: recordsError } = await recordsQuery;
        if (recordsError) {
          console.error("[ReportsPage] treeVisitRecordsError:", recordsError);
          throw recordsError;
        }

        let treesQuery = supabase
          .from("trees")
          .select("id, project_id, tree_id, botanical_name, common_name, location, retention_status, tree_protection_measures, required_measures, health, structure, nrz_radius_m, srz_radius_m, nrz_encroachment, encroachment_class");

        if (selectedProjectId) {
          treesQuery = treesQuery.eq("project_id", selectedProjectId);
        }

        const { data: treesData, error: treesError } = await treesQuery;
        if (treesError) {
          console.error("[ReportsPage] treesError:", treesError);
          throw treesError;
        }

        if (!mounted) return;
        const typedVisits = (visitsData ?? []) as VisitRow[];
        const typedRecords = (recordsData ?? []) as TreeVisitRecordRow[];
        const typedTrees = (treesData ?? []) as TreeRow[];
        setVisits(typedVisits);
        setRecords(typedRecords);
        setTrees(typedTrees);
        console.log(
          "[ReportsPage] loaded data:",
          { selectedProjectId, visits: typedVisits.length, treeVisitRecords: typedRecords.length },
        );
      } catch (error) {
        console.error("Failed to fetch reports data:", error);
        if (!mounted) return;
        setErrorMessage("Failed to load report data. Please try again.");
        setVisits([]);
        setRecords([]);
        setTrees([]);
      } finally {
        if (mounted) setLoadingData(false);
      }
    };

    if (loadingProjects) return;
    void loadReportData();

    return () => {
      mounted = false;
    };
  }, [selectedProjectId, loadingProjects]);

  const recordsByVisitId = useMemo(() => {
    const map = new Map<string, TreeVisitRecordRow[]>();
    records.forEach((record) => {
      if (!record.visit_id) return;
      const current = map.get(record.visit_id) ?? [];
      current.push(record);
      map.set(record.visit_id, current);
    });
    return map;
  }, [records]);

  const totalVisits = visits.length;
  const totalBreaches = records.reduce((sum, record) => (
    normalizeStatus(record.tpm_status) === "breach" ? sum + 1 : sum
  ), 0);

  const treesInspected = useMemo(() => {
    const distinctTreeIds = new Set<string>();
    records.forEach((record) => {
      if (record.tree_id) distinctTreeIds.add(record.tree_id);
    });
    return distinctTreeIds.size;
  }, [records]);

  const complianceTotals = useMemo(() => {
    let compliant = 0;
    let known = 0;
    records.forEach((record) => {
      const status = normalizeStatus(record.tpm_status);
      if (!status) return;
      known += 1;
      if (status === "compliant") compliant += 1;
    });
    return { compliant, known };
  }, [records]);

  const avgCompliance = complianceTotals.known > 0
    ? Math.round((complianceTotals.compliant / complianceTotals.known) * 100)
    : 0;

  const visitTypeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    visits.forEach((visit) => {
      const visitType = visit.visit_type?.trim();
      if (!visitType) return;
      counts[visitType] = (counts[visitType] ?? 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [visits]);

  const handleExportCsv = async () => {
    setExportErrorMessage(null);
    setExportingCsv(true);
    try {
      let projectsQuery = supabase.from("projects").select("id, name, slug, site_address, address");
      let visitsQuery = supabase
        .from("visits")
        .select("id, project_id, visit_date, inspection_date, visit_type, inspector_name, inspector, status, created_at")
        .order("inspection_date", { ascending: false })
        .order("created_at", { ascending: false });
      let treesQuery = supabase
        .from("trees")
        .select("id, project_id, tree_id, botanical_name, common_name, location, retention_status, tree_protection_measures, required_measures, health, structure, nrz_radius_m, srz_radius_m, nrz_encroachment, encroachment_class");
      let recordsQuery = supabase
        .from("tree_visit_records")
        .select("id, project_id, visit_id, tree_id, tpm_status, health, structure, damage, notes, follow_up_actions, photo_urls, created_at, updated_at");

      if (selectedProjectId) {
        projectsQuery = projectsQuery.eq("id", selectedProjectId);
        visitsQuery = visitsQuery.eq("project_id", selectedProjectId);
        treesQuery = treesQuery.eq("project_id", selectedProjectId);
        recordsQuery = recordsQuery.eq("project_id", selectedProjectId);
      }

      const [projectsRes, visitsRes, treesRes, recordsRes] = await Promise.all([
        projectsQuery,
        visitsQuery,
        treesQuery,
        recordsQuery,
      ]);
      if (projectsRes.error) throw projectsRes.error;
      if (visitsRes.error) throw visitsRes.error;
      if (treesRes.error) throw treesRes.error;
      if (recordsRes.error) throw recordsRes.error;

      const exportProjects = (projectsRes.data ?? []) as ProjectTabRow[];
      const exportVisits = (visitsRes.data ?? []) as VisitRow[];
      const exportTrees = (treesRes.data ?? []) as TreeRow[];
      const exportRecords = (recordsRes.data ?? []) as TreeVisitRecordRow[];

      const projectById = new Map(exportProjects.map((project) => [project.id, project]));
      const visitById = new Map(exportVisits.map((visit) => [visit.id, visit]));
      const treeById = new Map<string, TreeRow>();
      exportTrees.forEach((tree) => {
        treeById.set(tree.id, tree);
        if (tree.tree_id) treeById.set(tree.tree_id, tree);
      });

      const rows: CsvRow[] = exportRecords.map((record) => {
        const visit = record.visit_id ? visitById.get(record.visit_id) : undefined;
        const projectId = visit?.project_id ?? record.project_id ?? null;
        const project = projectId ? projectById.get(projectId) : undefined;
        const tree = record.tree_id ? treeById.get(record.tree_id) : undefined;
        return {
          project_name: project?.name ?? "",
          project_address: project?.site_address ?? project?.address ?? "",
          visit_date: visit?.visit_date ?? visit?.inspection_date ?? "",
          visit_type: visit?.visit_type ?? "",
          inspector_name: visit?.inspector_name ?? visit?.inspector ?? "",
          visit_status: visit?.status ?? "",
          tree_id: tree?.tree_id ?? record.tree_id ?? "",
          botanical_name: tree?.botanical_name ?? "",
          common_name: tree?.common_name ?? "",
          location: tree?.location ?? "",
          retention_status: tree?.retention_status ?? "",
          required_protection_measures: toSemicolon(tree?.required_measures) || tree?.tree_protection_measures || "",
          initial_health: tree?.health ?? "",
          initial_structure: tree?.structure ?? "",
          current_health: record.health ?? "",
          current_structure: record.structure ?? "",
          compliance_status: record.tpm_status ?? "",
          tree_damage: record.damage ?? "",
          notes: record.notes ?? "",
          follow_up_actions: record.follow_up_actions ?? "",
          photo_urls: toSemicolon(record.photo_urls),
          nrz_radius_m: tree?.nrz_radius_m ?? "",
          srz_radius_m: tree?.srz_radius_m ?? "",
          encroachment: tree?.nrz_encroachment ?? tree?.encroachment_class ?? "",
          created_at: record.created_at ?? "",
          updated_at: record.updated_at ?? "",
        };
      });

      const header = CSV_COLUMNS.join(",");
      const body = rows.map((row) => CSV_COLUMNS.map((column) => toCsvCell(row[column])).join(",")).join("\n");
      const csv = `${header}\n${body}`;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const selectedProject = selectedProjectId ? exportProjects.find((project) => project.id === selectedProjectId) : null;
      const link = document.createElement("a");
      link.href = url;
      link.download = selectedProject?.slug ? `${selectedProject.slug}_compliance_log.csv` : "all_projects_compliance_log.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export CSV:", error);
      setExportErrorMessage("Failed to export CSV. Please try again.");
    } finally {
      setExportingCsv(false);
    }
  };

  return (
    <div className="pb-32">
      <div
        className="px-4 pt-12 pb-5"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62rem",
          letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>
          Compliance
        </p>
        <h1 style={{ color: "white", fontSize: "1.4rem", fontWeight: 800, lineHeight: 1.1 }}>
          Reports
        </h1>

        <div className="mt-3">
          <label htmlFor="reports-project-filter" className="sr-only">Project filter</label>
          <div
            className="rounded-full px-3 py-2"
            style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.28)" }}
          >
            <select
              id="reports-project-filter"
              value={selectedProjectId ?? "all"}
              onChange={(event) => {
                const value = event.target.value;
                const nextSelectedProjectId = value === "all" ? null : value;
                setSelectedProjectId(nextSelectedProjectId);
                console.log("[ReportsPage] selectedProjectId:", nextSelectedProjectId);
              }}
              className="w-full bg-transparent outline-none"
              style={{ color: "white", fontSize: "0.78rem", fontWeight: 600 }}
            >
              <option value="all" style={{ color: "#1B4332" }}>All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id} style={{ color: "#1B4332" }}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: ClipboardCheck, label: "Total Visits",      value: totalVisits,   color: "#1B4332",  bg: "#F0FDF4" },
            { icon: Shield,         label: "Avg Compliance",    value: `${avgCompliance}%`, color: pctColor(avgCompliance), bg: pctBg(avgCompliance) },
            { icon: AlertCircle,    label: "Total Breaches",    value: totalBreaches, color: totalBreaches > 0 ? "#DC2626" : "#15803D", bg: totalBreaches > 0 ? "#FEF2F2" : "#F0FDF4" },
            { icon: Trees,          label: "Trees Inspected",   value: treesInspected, color: "#1D4ED8", bg: "#EFF6FF" },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="rounded-2xl p-4"
              style={{ background: bg, border: `1px solid ${color}22` }}>
              <Icon size={16} color={color} />
              <p style={{ color, fontSize: "1.4rem", fontWeight: 800, lineHeight: 1, marginTop: 6 }}>
                {value}
              </p>
              <p style={{ color: "#6B7280", fontSize: "0.65rem", marginTop: 2 }}>{label}</p>
            </div>
          ))}
        </div>

        {visitTypeBreakdown.length > 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <p style={{ color: "#9CA3AF", fontSize: "0.62rem", fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Visit Type Breakdown
            </p>
            <div className="flex flex-col gap-3">
              {visitTypeBreakdown.map(([label, count]) => (
                <div key={label} className="flex items-center gap-3">
                  <span style={{ color: "#374151", fontSize: "0.78rem", flex: 1 }}>{label}</span>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full overflow-hidden" style={{ width: 60, height: 6, background: "#F3F4F6" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${totalVisits > 0 ? (count / totalVisits) * 100 : 0}%`, background: "#1B4332" }} />
                    </div>
                    <span style={{ color: "#111827", fontSize: "0.75rem", fontWeight: 700, minWidth: 16 }}>
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid #F3F4F6" }}>
            <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700 }}>
              Visit History
            </p>
            <TrendingUp size={14} color="#9CA3AF" />
          </div>

          {loadingData ? (
            <div className="px-4 py-8 text-center">
              <p style={{ color: "#9CA3AF", fontSize: "0.82rem" }}>Loading reports…</p>
            </div>
          ) : errorMessage ? (
            <div className="px-4 py-8 text-center">
              <AlertCircle size={28} color="#FCA5A5" className="mx-auto mb-2" />
              <p style={{ color: "#DC2626", fontSize: "0.82rem" }}>{errorMessage}</p>
            </div>
          ) : visits.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <ClipboardCheck size={28} color="#D1D5DB" className="mx-auto mb-2" />
              <p style={{ color: "#9CA3AF", fontSize: "0.82rem" }}>No visits recorded yet.</p>
            </div>
          ) : (
            <div>
              {visits.map((visit, i) => {
                const visitRecords = recordsByVisitId.get(visit.id) ?? [];
                const inspectedTreeCount = visitRecords.length;
                const breachCount = visitRecords.reduce((sum, record) => (
                  normalizeStatus(record.tpm_status) === "breach" ? sum + 1 : sum
                ), 0);
                const knownCount = visitRecords.reduce((sum, record) => (
                  normalizeStatus(record.tpm_status) ? sum + 1 : sum
                ), 0);
                const compliantCount = visitRecords.reduce((sum, record) => (
                  normalizeStatus(record.tpm_status) === "compliant" ? sum + 1 : sum
                ), 0);
                const pct = knownCount > 0 ? Math.round((compliantCount / knownCount) * 100) : 0;
                const displayDate = visit.inspection_date ?? visit.created_at ?? new Date().toISOString();
                const visitType = visit.visit_type?.trim() || "Unknown type";
                const inspector = visit.inspector_name?.trim() || "Unknown inspector";

                return (
                  <button
                    key={visit.id}
                    onClick={() => navigate(`/visits/${visit.id}`)}
                    className="w-full px-4 py-3.5 text-left active:bg-gray-50 transition-colors"
                    style={{ borderBottom: i < visits.length - 1 ? "1px solid #F9FAFB" : "none" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ background: "#F0FDF4", width: 38, height: 38 }}>
                        <span style={{ color: "#1B4332", fontSize: "0.85rem", fontWeight: 800, lineHeight: 1 }}>
                          {new Date(displayDate).getDate()}
                        </span>
                        <span style={{ color: "#15803D", fontSize: "0.48rem", fontWeight: 600, textTransform: "uppercase" }}>
                          {new Date(displayDate).toLocaleDateString("en-AU", { month: "short" })}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="rounded-full px-2 py-0.5"
                            style={{ background: "#ECFDF3", border: "1px solid #BBF7D0" }}>
                            <span style={{ color: "#15803D", fontSize: "0.58rem", fontWeight: 700 }}>
                              {visitType}
                            </span>
                          </span>
                          {breachCount > 0 && (
                            <span style={{ color: "#DC2626", fontSize: "0.62rem", fontWeight: 700 }}>
                              {breachCount} breach{breachCount !== 1 ? "es" : ""}
                            </span>
                          )}
                        </div>
                        <p style={{ color: "#6B7280", fontSize: "0.7rem" }}>
                          {inspectedTreeCount} trees · {inspector}
                        </p>
                        <ComplianceBar pct={pct} />
                      </div>

                      <ChevronRight size={13} color="#D1D5DB" style={{ flexShrink: 0 }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!loadingData && !errorMessage && records.length === 0 && (
          <div className="rounded-2xl p-4"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
            <p style={{ color: "#92400E", fontSize: "0.78rem", fontWeight: 600 }}>
              No inspection records yet. Start a visit to generate compliance reports.
            </p>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700 }}>Export</p>
            <p style={{ color: "#9CA3AF", fontSize: "0.72rem", marginTop: 1 }}>
              Full compliance history &amp; tree-by-tree records
            </p>
          </div>
          {[
            { icon: FileDown, label: "Export PDF Report",       sub: "Visit-by-visit compliance summary", color: "#DC2626", bg: "#FEF2F2" },
            { icon: FileText, label: "Export CSV — Full Log",   sub: selectedProjectId ? "Selected project compliance log" : "All visits, all trees, all fields", color: "#1D4ED8", bg: "#EFF6FF" },
          ].map(({ icon: Icon, label, sub, color, bg }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3.5 px-4 py-4 text-left transition-colors"
              style={{ borderBottom: "1px solid #F9FAFB" }}
              onClick={label === "Export CSV — Full Log" ? () => { void handleExportCsv(); } : undefined}
              disabled={label !== "Export CSV — Full Log" || exportingCsv}
              title={label === "Export CSV — Full Log" ? "Export CSV" : "Coming soon"}
            >
              <div className="rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ width: 38, height: 38, background: bg }}>
                <Icon size={16} color={color} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 600 }}>{label}</p>
                <p style={{ color: "#9CA3AF", fontSize: "0.68rem", marginTop: 1 }}>{label === "Export CSV — Full Log" ? (exportingCsv ? "Exporting CSV..." : sub) : `${sub} · Coming soon`}</p>
              </div>
              <ChevronRight size={14} color="#D1D5DB" style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {exportErrorMessage && (
          <div className="rounded-2xl p-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
            <p style={{ color: "#B91C1C", fontSize: "0.78rem", fontWeight: 600 }}>{exportErrorMessage}</p>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #FEE2E2" }}>
          <div className="px-4 pt-3 pb-2" style={{ borderBottom: "1px solid #FEE2E2" }}>
            <p style={{ color: "#DC2626", fontSize: "0.72rem", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.05em" }}>Project Actions</p>
          </div>
          <button
            className="w-full flex items-center gap-3.5 px-4 py-4 active:bg-red-50 text-left transition-colors"
            onClick={() => {/* TODO */}}
          >
            <div className="rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ width: 38, height: 38, background: "#FEF2F2" }}>
              <Archive size={16} color="#DC2626" />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: "#DC2626", fontSize: "0.82rem", fontWeight: 600 }}>
                Archive Project
              </p>
              <p style={{ color: "#9CA3AF", fontSize: "0.68rem", marginTop: 1 }}>
                Mark as complete and lock all records
              </p>
            </div>
            <ChevronRight size={14} color="#FECACA" style={{ flexShrink: 0 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
