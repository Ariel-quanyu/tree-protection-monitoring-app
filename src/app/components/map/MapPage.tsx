import React, { useState, useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router";
import {
  Search, X, ChevronRight, TreePine,
  ChevronDown, ChevronUp, SlidersHorizontal,
  Info, AlertCircle, ArrowLeft, ZoomIn, ZoomOut, Crosshair,
  MapPin, WifiOff,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useSelectedProject, useProject } from "../../context/ProjectContext";
import { type SupabaseTree, mapSupabaseTree } from "../../data/treeMapper";

// ── Types ─────────────────────────────────────────────────────────────────────

type MapMode       = "sites" | "trees";
type StatusFilter  = "all" | "compliant" | "not-compliant" | "breach";
type SymbologyMode = "none" | "nrz" | "srz" | "dsh";
type TPMStatus = "compliant" | "not_compliant" | "breach" | "removed";

// ── Colour helpers: binary compliance ────────────────────────────────────────

function complianceColor(status: TPMStatus): string {
  if (status === "compliant") return "#16A34A";
  if (status === "removed") return "#9CA3AF";
  if (status === "not_compliant") return "#EA580C";
  if (status === "breach") return "#991B1B";
  return "#EA580C";
}
function complianceBg(status: TPMStatus): string {
  if (status === "compliant") return "#DCFCE7";
  if (status === "removed") return "#F3F4F6";
  if (status === "breach") return "#FEE2E2";
  return "#FFEDD5";
}
function complianceLabel(status: TPMStatus): string {
  if (status === "compliant") return "Compliant";
  if (status === "removed") return "Removed";
  if (status === "breach") return "Breach";
  return "At Risk";
}

// ── Project status colours ────────────────────────────────────────────────────

const PROJECT_STATUS_COLOR: Record<string, string> = {
  active:     "#2D5A27",
  monitoring: "#D97706",
  completed:  "#6B7280",
};
const PROJECT_STATUS_BG: Record<string, string> = {
  active:     "#DCFCE7",
  monitoring: "#FEF3C7",
  completed:  "#F3F4F6",
};

// ── Geo constants ─────────────────────────────────────────────────────────────

const MELBOURNE_CENTRE: [number, number] = [-37.820, 144.955];
const MELBOURNE_ZOOM = 11;

/**
 * Optional static coordinate overrides per project slug.
 * Leave empty — all projects get their pin from the GPS centroid of their trees.
 * Add an entry here only if you need to manually override a centroid.
 */
const STATIC_CENTRES: Record<string, [number, number]> = {};

// ── Legend items ──────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { label: "Compliant",     color: "#16A34A" },
  { label: "Not Compliant", color: "#EA580C" },
  { label: "Breach",        color: "#991B1B" },
  { label: "Removed",       color: "#9CA3AF" },
];

function deriveBaselineFallbackStatus(tree: SupabaseTree): TPMStatus {
  const containsAny = (value: string, terms: string[]) => {
    const normalized = value.toLowerCase();
    return terms.some((term) => normalized.includes(term));
  };

  if (containsAny(tree.retentionStatus, ["remove"]) || containsAny(tree.currentStatus, ["removed"])) {
    return "removed";
  }

  const encroachmentSignals = [
    tree.encroachmentClass,
    tree.nrzEncroachment,
    tree.srzEncroachment,
  ];
  if (encroachmentSignals.some((value) => containsAny(value, ["major"]))) {
    return "breach";
  }
  if (encroachmentSignals.some((value) => containsAny(value, ["minor", "moderate"]))) {
    return "not_compliant";
  }
  return "compliant";
}

// ── Project abbreviation helpers ─────────────────────────────────────────────

/**
 * Explicit short labels for known projects.
 * Anything not listed falls through to makeProjectAbbrev().
 */
const ABBREV_OVERRIDE: Record<string, string> = {
  "parliament-vic":        "PARL",
  "royal-botanic":         "RBG",
  "queen-vic-market":      "QVM",
  "west-gate-tunnel":      "WGT",
  "fitzroy-gardens":       "FG",
  "4-beaufort-rd-croydon": "BC",
};

/** Words to ignore when auto-generating initials from a project name. */
const ABBREV_SKIP = new Set([
  "rd", "st", "ave", "ln", "dr", "pl", "ct", "hwy", "blvd",
  "the", "a", "an", "and", "of", "at", "nr", "no",
]);

/**
 * Derive a short map label from a project slug + name.
 *
 * Rules (applied in order):
 *  1. Use ABBREV_OVERRIDE if present.
 *  2. Strip any leading pure number  (e.g. "4" in "4 Beaufort Rd …").
 *  3. Discard stop-words (Rd, St, Ave …).
 *  4. Take first letter of the first two meaningful words → e.g. "BC".
 *  5. If only one meaningful word, take first two letters of it.
 *  6. Last resort: first two alpha chars of the name.
 */
function makeProjectAbbrev(id: string, name: string): string {
  if (ABBREV_OVERRIDE[id]) return ABBREV_OVERRIDE[id];

  const words = name.split(/[\s,]+/).filter(Boolean);
  const meaningful = words.filter((w, i) => {
    if (i === 0 && /^\d+$/.test(w)) return false;     // skip leading number
    if (ABBREV_SKIP.has(w.toLowerCase())) return false; // skip stop-words
    return /[a-zA-Z]/.test(w);
  });

  if (meaningful.length === 0) {
    return name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "??";
  }
  if (meaningful.length === 1) return meaningful[0].slice(0, 2).toUpperCase();
  return (meaningful[0][0] + meaningful[1][0]).toUpperCase();
}

// ── Leaflet site-marker HTML ──────────────────────────────────────────────────

function makeSiteIconHtml(
  abbrev: string,
  statusColor: string,
  isSelected: boolean,
  flagged: number,
  hasData: boolean,
): string {
  const ring = isSelected
    ? `box-shadow:0 0 0 3px ${statusColor},0 4px 16px rgba(0,0,0,0.38);border:4px solid white;`
    : `box-shadow:0 3px 12px rgba(0,0,0,0.30);border:3px solid white;`;

  const badge = flagged > 0
    ? `<div style="position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;padding:0 3px;
        background:#EF4444;border-radius:10px;border:2px solid white;display:flex;
        align-items:center;justify-content:center;box-sizing:border-box;">
         <span style="color:white;font-size:9px;font-weight:800;line-height:1;">${flagged}</span>
       </div>`
    : "";

  const dot = hasData
    ? `<div style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);
        width:8px;height:8px;background:#4ADE80;border-radius:50%;border:2px solid white;"></div>`
    : "";

  return `
    <div style="position:relative;width:52px;height:52px;">
      <div style="width:52px;height:52px;background:${statusColor};${ring}
        border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <span style="color:white;font-size:9px;font-weight:800;
          letter-spacing:0.06em;line-height:1;font-family:Inter,sans-serif;">${abbrev}</span>
      </div>
      ${badge}
      ${dot}
    </div>`;
}

// ── ChipSelect ────────────────────────────────────────────────────────────────

function ChipSelect<T extends string>({
  label, options, value, onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p style={{ color: "#9CA3AF", fontSize: "0.6rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 7 }}>
        {label}
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(o => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              onClick={() => onChange(o.value)}
              className="rounded-full px-3 py-1.5 transition-all active:scale-95"
              style={{
                background: active ? "#1B4332" : "#F3F4F6",
                color:      active ? "white"   : "#4B5563",
                fontSize:   "0.72rem",
                fontWeight: active ? 700 : 500,
                border:     `1.5px solid ${active ? "#1B4332" : "#E5E7EB"}`,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── MapPage ───────────────────────────────────────────────────────────────────

export function MapPage() {
  const navigate = useNavigate();
  const { project, setSelectedProjectId } = useSelectedProject();
  const { projects } = useProject();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [mapMode,      setMapMode]      = useState<MapMode>("sites");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [symbology,    setSymbology]    = useState<SymbologyMode>("none");
  const [search,       setSearch]       = useState("");
  const [selectedTree, setSelectedTree] = useState<SupabaseTree | null>(null);
  const [showLegend,   setShowLegend]   = useState(false);
  const [showControls, setShowControls] = useState(true);

  // ── Tree data (selected project — full rows for tree-mode markers) ─────────
  const [allTrees,     setAllTrees]     = useState<SupabaseTree[]>([]);
  const [treeStatusById, setTreeStatusById] = useState<Map<string, TPMStatus>>(new Map());
  const [loadingTrees, setLoadingTrees] = useState(false);
  const [treeError,    setTreeError]    = useState<string | null>(null);

  /**
   * Set of project slugs that have confirmed GPS tree data.
   * Populated by both the lightweight centroid fetch AND the full tree fetch.
   */
  const [projectsWithData, setProjectsWithData] = useState<Set<string>>(new Set());

  /**
   * Per-project GPS centroid (average lat/lng of all trees).
   * Keyed by project slug.  Used as the site-marker position on the portfolio map.
   */
  const [projectCentroids,  setProjectCentroids]  = useState<Map<string, [number, number]>>(new Map());

  /**
   * Per-project tree count from Supabase.
   * Keyed by project slug.  Replaces the always-0 proj.totalTrees in the list.
   */
  const [projectTreeCounts, setProjectTreeCounts] = useState<Map<string, number>>(new Map());

  // ── Leaflet refs ──────────────────────────────────────────────────────────
  const mapContainerRef   = useRef<HTMLDivElement>(null);
  const mapInstanceRef    = useRef<L.Map | null>(null);
  const siteMarkersRef    = useRef<L.Marker[]>([]);
  const treeMarkersRef    = useRef<Map<string, L.CircleMarker>>(new Map());
  const overlayCirclesRef = useRef<L.Circle[]>([]);

  // ── Effect A: Lightweight centroid + count fetch (runs once per project load)
  // Fetches only project_id + lat/lng — very small payload.
  // Populates projectCentroids, projectTreeCounts, projectsWithData.
  useEffect(() => {
    if (projects.length === 0) return;
    let cancelled = false;

    supabase
      .from("trees")
      .select("project_id, latitude, longitude")
      .then(({ data }) => {
        if (cancelled || !data || data.length === 0) return;

        type Acc = { lats: number[]; lngs: number[] };
        const byUuid: Record<string, Acc> = {};

        for (const row of data) {
          const uid = String(row.project_id ?? "");
          const lat = Number(row.latitude);
          const lng = Number(row.longitude);
          if (!uid || isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) continue;
          if (!byUuid[uid]) byUuid[uid] = { lats: [], lngs: [] };
          byUuid[uid].lats.push(lat);
          byUuid[uid].lngs.push(lng);
        }

        const centroids  = new Map<string, [number, number]>();
        const counts     = new Map<string, number>();
        const hasGps     = new Set<string>();

        for (const proj of projects) {
          const g = byUuid[proj.uuid];
          if (!g || g.lats.length === 0) continue;
          const n   = g.lats.length;
          const lat = g.lats.reduce((a, b) => a + b, 0) / n;
          const lng = g.lngs.reduce((a, b) => a + b, 0) / n;
          centroids.set(proj.id, [lat, lng]);
          counts.set(proj.id, n);
          hasGps.add(proj.id);
        }

        setProjectCentroids(centroids);
        setProjectTreeCounts(counts);
        setProjectsWithData(prev => new Set([...prev, ...hasGps]));
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects.length]);

  // ── Effect B: Full tree fetch for the selected project (tree map mode) ────
  useEffect(() => {
    const uuid = project?.uuid;
    const slug = project?.id;
    if (!uuid || !slug) return;

    let cancelled = false;
    setLoadingTrees(true);
    setTreeError(null);
    setAllTrees([]);

    supabase
      .from("trees")
      .select("*")
      .eq("project_id", uuid)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { setTreeError(error.message); setLoadingTrees(false); return; }
        const mapped = (data ?? []).map(row => mapSupabaseTree(row as Record<string, unknown>, slug));
        setAllTrees(mapped);
        if (mapped.length > 0) setProjectsWithData(prev => new Set([...prev, slug]));
        setLoadingTrees(false);
      });

    return () => { cancelled = true; };
  }, [project?.uuid, project?.id]);

  useEffect(() => {
    const uuid = project?.uuid;
    if (!uuid || allTrees.length === 0) {
      setTreeStatusById(new Map());
      return;
    }
    let cancelled = false;
    const treeIds = allTrees.map((tree) => tree.id);
    supabase
      .from("tree_visit_records")
      .select("tree_id, tpm_status, created_at")
      .eq("project_id", uuid)
      .in("tree_id", treeIds)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled || error) return;
        const next = new Map<string, TPMStatus>();
        for (const row of (data ?? []) as { tree_id: string | null; tpm_status: string | null }[]) {
          const treeId = String(row.tree_id ?? "").trim();
          if (!treeId || next.has(treeId)) continue;
          if (row.tpm_status === "compliant" || row.tpm_status === "not_compliant" || row.tpm_status === "breach" || row.tpm_status === "not-compliant") {
            next.set(treeId, row.tpm_status === "not-compliant" ? "not_compliant" : row.tpm_status);
          }
        }
        setTreeStatusById(next);
      });
    return () => { cancelled = true; };
  }, [project?.uuid, allTrees]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const treeComplianceStatus = (tree: SupabaseTree): TPMStatus => {
    return treeStatusById.get(tree.id) ?? deriveBaselineFallbackStatus(tree);
  };

  const { filteredTrees, focusTree } = useMemo(() => {
    const base =
      statusFilter === "all"           ? allTrees :
      statusFilter === "compliant"     ? allTrees.filter(t => treeComplianceStatus(t) === "compliant") :
      statusFilter === "breach"        ? allTrees.filter(t => treeComplianceStatus(t) === "breach") :
                                         allTrees.filter(t => {
                                           const status = treeComplianceStatus(t);
                                           return status === "not_compliant" || status === "breach";
                                         });
    if (!search.trim()) return { filteredTrees: base, focusTree: null };
    const q = search.toLowerCase();
    const m = base.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.botanicalName.toLowerCase().includes(q) ||
      t.commonName.toLowerCase().includes(q)
    );
    return { filteredTrees: m, focusTree: m[0] ?? null };
  }, [allTrees, statusFilter, search, treeStatusById]);

  const searchActive = search.trim() !== "";
  const matchSet     = useMemo(() => new Set(filteredTrees.map(t => t.id)), [filteredTrees]);

  const stats = useMemo(() => ({
    total:        allTrees.length,
    compliant:    allTrees.filter(t => treeComplianceStatus(t) === "compliant").length,
    breaches:     allTrees.filter(t => treeComplianceStatus(t) === "breach").length,
    notCompliant: allTrees.filter(t => {
      const status = treeComplianceStatus(t);
      return status === "not_compliant" || status === "breach";
    }).length,
  }), [allTrees, treeStatusById]);

  const hasTreeData = !loadingTrees && allTrees.length > 0;
  const modified    = statusFilter !== "all" || symbology !== "none";

  const portfolio = useMemo(() => ({
    total:        projects.length,
    active:       projects.filter(p => p.status === "active").length,
    monitoring:   projects.filter(p => p.status === "monitoring").length,
    // Use live Supabase counts (summed from centroid fetch); fall back to context value
    totalTrees:   projects.reduce((s, p) => s + (projectTreeCounts.get(p.id) ?? p.totalTrees), 0),
    totalFlagged: projects.reduce((s, p) => s + p.flaggedTrees, 0),
  }), [projects, projectTreeCounts]);

  // ── Coordinate label for tree-mode footer ────────────────────────────────
  const coordLabel = useMemo(() => {
    if (!project) return "";
    const c = STATIC_CENTRES[project.id] ?? projectCentroids.get(project.id);
    if (!c) return "";
    return `${c[0].toFixed(4)}, ${c[1].toFixed(4)}`;
  }, [project, projectCentroids]);

  // ── Effect 1: Init Leaflet once ───────────────────────────────────────────
  useEffect(() => {
    if (mapInstanceRef.current || !mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: MELBOURNE_CENTRE, zoom: MELBOURNE_ZOOM,
      zoomControl: false, attributionControl: true,
    });
    map.attributionControl.setPrefix("");
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 20,
    }).addTo(map);
    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
      siteMarkersRef.current = [];
      treeMarkersRef.current.clear();
      overlayCirclesRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Effect 2: Fit view when mode / trees change ───────────────────────────
  useEffect(() => {
    if (!project) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mapMode === "sites") {
      // Fit to all project markers that have GPS data
      const pts: [number, number][] = [];
      for (const proj of projects) {
        const c = STATIC_CENTRES[proj.id] ?? projectCentroids.get(proj.id);
        if (c) pts.push(c);
      }
      if (pts.length > 1) {
        map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 14, animate: true });
      } else if (pts.length === 1) {
        map.flyTo(pts[0], 14, { animate: true });
      } else {
        map.flyTo(MELBOURNE_CENTRE, MELBOURNE_ZOOM, { animate: true, duration: 0.75 });
      }
    } else if (allTrees.length > 0) {
      map.fitBounds(
        L.latLngBounds(allTrees.map(t => [t.latitude, t.longitude] as [number, number])),
        { padding: [32, 32], maxZoom: 18, animate: true }
      );
    } else if (!loadingTrees) {
      // No trees yet — zoom to centroid if available
      const fallback = STATIC_CENTRES[project.id] ?? projectCentroids.get(project.id) ?? MELBOURNE_CENTRE;
      map.flyTo(fallback, 16, { animate: true, duration: 0.75 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapMode, allTrees, loadingTrees, project?.id, projectCentroids]);

  // ── Effect 3: Rebuild all map markers ────────────────────────────────────
  useEffect(() => {
    if (!project) return;
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing layers
    siteMarkersRef.current.forEach(m => m.remove());  siteMarkersRef.current = [];
    treeMarkersRef.current.forEach(m => m.remove());  treeMarkersRef.current.clear();
    overlayCirclesRef.current.forEach(c => c.remove()); overlayCirclesRef.current = [];

    if (mapMode === "sites") {
      // ── Portfolio site markers ──────────────────────────────────────────
      for (const proj of projects) {
        // Resolve centre: static override → GPS centroid → skip
        const centre = STATIC_CENTRES[proj.id] ?? projectCentroids.get(proj.id);
        if (!centre) continue; // no GPS data for this project yet — skip silently

        const projectHasBreach = proj.id === project.id && allTrees.some((tree) => treeComplianceStatus(tree) === "breach");
        const statusColor = projectHasBreach ? "#991B1B" : (PROJECT_STATUS_COLOR[proj.status] ?? "#6B7280");
        const isSelected  = proj.id === project.id;
        const abbrev      = makeProjectAbbrev(proj.id, proj.name);
        const hasData     = projectsWithData.has(proj.id);

        const icon = L.divIcon({
          html:       makeSiteIconHtml(abbrev, statusColor, isSelected, proj.flaggedTrees, hasData),
          className:  "",
          iconSize:   [52, 52],
          iconAnchor: [26, 26],
        });

        const marker = L.marker(centre, { icon }).addTo(map);
        marker.on("click", () => {
          setSelectedProjectId(proj.id);
          setMapMode("trees");
        });
        siteMarkersRef.current.push(marker);
      }

    } else {
      // ── Tree compliance markers ─────────────────────────────────────────
      if (loadingTrees || allTrees.length === 0) return;

      for (const tree of allTrees) {
        const tpmStatus = treeComplianceStatus(tree);
        if (statusFilter === "compliant" && tpmStatus !== "compliant") continue;
        if (statusFilter === "breach" && tpmStatus !== "breach") continue;
        if (statusFilter === "not-compliant" && !(tpmStatus === "not_compliant" || tpmStatus === "breach")) continue;

        const color      = complianceColor(tpmStatus);
        const inSearch   = !searchActive || matchSet.has(tree.id);
        const isSelected = selectedTree?.id === tree.id;
        const radius     = symbology === "dsh"
          ? Math.max(4, Math.min(14, tree.nrzRadius * 0.85))
          : isSelected ? 10 : 7;

        const cm = L.circleMarker([tree.latitude, tree.longitude], {
          radius,
          fillColor:   color,
          color:       isSelected ? "#FFFFFF" : "rgba(0,0,0,0.4)",
          weight:      isSelected ? 2.5 : 1,
          fillOpacity: inSearch ? 0.88 : 0.1,
          opacity:     inSearch ? 1    : 0.18,
        }).addTo(map);

        cm.on("click", () => {
          setSelectedTree(tree);
          mapInstanceRef.current?.panTo([tree.latitude, tree.longitude], { animate: true });
        });
        treeMarkersRef.current.set(tree.id, cm);

        if (symbology === "nrz" && inSearch) {
          const c = L.circle([tree.latitude, tree.longitude], {
            radius: tree.nrzRadius, color, weight: 1.5,
            fillColor: color, fillOpacity: 0.07, dashArray: "6 4",
          }).addTo(map);
          overlayCirclesRef.current.push(c);
        }
        if (symbology === "srz" && inSearch && tree.srzRadius) {
          const c = L.circle([tree.latitude, tree.longitude], {
            radius: tree.srzRadius, color, weight: 1.5,
            fillColor: color, fillOpacity: 0.12, dashArray: "4 3",
          }).addTo(map);
          overlayCirclesRef.current.push(c);
        }
      }
    }
  }, [
    mapMode, allTrees, loadingTrees, statusFilter, symbology,
    searchActive, matchSet, selectedTree,
    project?.id, projects, projectsWithData, projectCentroids, treeStatusById,
  ]);

  // ── Effect 4: Pan to search focus ─────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusTree) return;
    map.panTo([focusTree.latitude, focusTree.longitude], { animate: true });
  }, [focusTree]);

  // ── Effect 5: Clear UI state on mode change ───────────────────────────────
  useEffect(() => { setSelectedTree(null); setSearch(""); }, [mapMode]);

  // ── Loading guard (no project selected yet) ───────────────────────────────
  if (!project) {
    return (
      <div className="pb-28">
        <div className="px-4 pt-12 pb-3"
          style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D5A27 100%)" }}>
          <div className="rounded-xl animate-pulse"
            style={{ height: 60, background: "rgba(255,255,255,0.1)" }} />
        </div>
        <div className="animate-pulse" style={{ height: 280, background: "#E5E7EB" }} />
      </div>
    );
  }

  // ── Map control handlers ──────────────────────────────────────────────────
  const handleZoomIn    = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut   = () => mapInstanceRef.current?.zoomOut();
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (mapMode === "sites") {
      map.flyTo(MELBOURNE_CENTRE, MELBOURNE_ZOOM, { animate: true });
    } else if (allTrees.length > 0) {
      map.fitBounds(
        L.latLngBounds(allTrees.map(t => [t.latitude, t.longitude] as [number, number])),
        { padding: [32, 32], maxZoom: 18 }
      );
    } else {
      const fallback = STATIC_CENTRES[project.id] ?? projectCentroids.get(project.id) ?? MELBOURNE_CENTRE;
      map.flyTo(fallback, 16, { animate: true });
    }
  };

  const handleTreeSelect = (tree: SupabaseTree) => {
    setSelectedTree(prev => prev?.id === tree.id ? null : tree);
    mapInstanceRef.current?.panTo([tree.latitude, tree.longitude], { animate: true });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col pb-28" style={{ minHeight: "100%" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-12 pb-3"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D5A27 100%)" }}>
        {mapMode === "sites" ? (
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.6rem",
                letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 2 }}>Map</p>
              <h1 style={{ color: "white", fontSize: "1.18rem", fontWeight: 800, lineHeight: 1.2 }}>
                Melbourne Portfolio
              </h1>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.72rem", marginTop: 3 }}>
                {portfolio.active} active · {portfolio.monitoring} monitoring
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {portfolio.totalFlagged > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: "#EF4444" }}>
                  <AlertCircle size={10} color="white" />
                  <span style={{ color: "white", fontSize: "0.63rem", fontWeight: 700 }}>
                    {portfolio.totalFlagged} Flagged
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.63rem" }}>
                  {portfolio.totalTrees.toLocaleString()} trees
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setMapMode("sites")}
              className="flex items-center gap-1.5 mb-2.5 active:opacity-70 transition-opacity">
              <ArrowLeft size={13} color="rgba(255,255,255,0.7)" />
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.68rem", fontWeight: 600 }}>
                All Projects
              </span>
            </button>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.6rem",
                  letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 2 }}>Tree Map</p>
                <h1 style={{ color: "white", fontSize: "1.18rem", fontWeight: 800, lineHeight: 1.2 }}>
                  {project.name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.67rem", fontFamily: "monospace" }}>
                    {project.reference}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full" style={{
                    background: project.status === "active" ? "#16A34A"
                      : project.status === "monitoring" ? "#D97706" : "#6B7280",
                    color: "white", fontSize: "0.58rem", fontWeight: 700,
                  }}>
                    {project.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                {!loadingTrees && stats.notCompliant > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                    style={{ background: "#DC2626" }}>
                    <AlertCircle size={10} color="white" />
                    <span style={{ color: "white", fontSize: "0.63rem", fontWeight: 700 }}>
                      {stats.notCompliant} Non-Compliant
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1 px-2 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
                  <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.63rem" }}>
                    {loadingTrees ? "Loading…" : hasTreeData ? `${stats.total} trees` : "No data"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Leaflet map container ────────────────────────────────────────────── */}
      <div className="relative" style={{ flexShrink: 0 }}>
        <div ref={mapContainerRef} style={{
          height:    mapMode === "sites" ? "62vw" : "58vw",
          maxHeight: mapMode === "sites" ? 380 : 340,
          minHeight: 245,
          width: "100%",
          background: "#e8ede0",
          transition: "height 0.3s ease",
        }} />

        {/* Loading overlay — tree mode only */}
        {mapMode === "trees" && loadingTrees && (
          <div className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ zIndex: 900, background: "rgba(255,255,255,0.72)", backdropFilter: "blur(3px)" }}>
            <div className="rounded-2xl px-5 py-4 flex flex-col items-center gap-2"
              style={{ background: "white", boxShadow: "0 4px 20px rgba(0,0,0,0.12)" }}>
              <div className="rounded-full animate-spin"
                style={{ width: 28, height: 28, border: "3px solid #E5E7EB", borderTopColor: "#2D5A27" }} />
              <p style={{ color: "#374151", fontSize: "0.78rem", fontWeight: 600 }}>Loading trees…</p>
              <p style={{ color: "#9CA3AF", fontSize: "0.67rem" }}>Fetching from Supabase</p>
            </div>
          </div>
        )}

        {/* No-data overlay */}
        {mapMode === "trees" && !loadingTrees && !hasTreeData && !treeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ zIndex: 900 }}>
            <div className="rounded-2xl px-5 py-4 flex flex-col items-center gap-1.5 text-center"
              style={{ background: "rgba(255,255,255,0.93)", backdropFilter: "blur(6px)", maxWidth: 230 }}>
              <TreePine size={20} color="#9CA3AF" />
              <p style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 700 }}>No GPS data loaded</p>
              <p style={{ color: "#6B7280", fontSize: "0.67rem", lineHeight: 1.4 }}>
                Tree survey data for this project has not yet been imported.
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {mapMode === "trees" && treeError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
            style={{ zIndex: 900 }}>
            <div className="rounded-2xl px-5 py-4 flex flex-col items-center gap-2 text-center"
              style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(6px)", maxWidth: 250 }}>
              <WifiOff size={20} color="#EF4444" />
              <p style={{ color: "#DC2626", fontSize: "0.8rem", fontWeight: 700 }}>Failed to load trees</p>
              <p style={{ color: "#6B7280", fontSize: "0.65rem", lineHeight: 1.4 }}>{treeError}</p>
            </div>
          </div>
        )}

        {/* Sites hint pill */}
        {mapMode === "sites" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{ zIndex: 900 }}>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(27,67,50,0.82)", backdropFilter: "blur(4px)" }}>
              <MapPin size={10} color="rgba(255,255,255,0.7)" />
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.6rem", fontWeight: 600 }}>
                Tap a project to view trees
              </span>
            </div>
          </div>
        )}

        {/* Zoom controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5" style={{ zIndex: 900 }}>
          <button onClick={handleZoomIn} className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.95)" }}>
            <ZoomIn size={16} color="#1B4332" />
          </button>
          <button onClick={handleZoomOut} className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.95)" }}>
            <ZoomOut size={16} color="#1B4332" />
          </button>
          <button onClick={handleResetView} className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: "rgba(255,255,255,0.95)" }} title="Reset view">
            <Crosshair size={15} color="#1B4332" />
          </button>
        </div>

        {/* Map mode tag */}
        <div className="absolute top-0 left-0 px-2 py-1"
          style={{ background: "rgba(27,67,50,0.78)", backdropFilter: "blur(3px)", zIndex: 900 }}>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.52rem",
            letterSpacing: "0.09em", textTransform: "uppercase" }}>
            {mapMode === "sites" ? "OSM · Portfolio View" : "OSM · Tree Inventory"}
          </span>
        </div>

        {/* Coordinate label — tree mode */}
        {mapMode === "trees" && coordLabel && (
          <div className="absolute bottom-2.5 right-3" style={{ zIndex: 900 }}>
            <div className="rounded px-1.5 py-0.5"
              style={{ background: "rgba(0,0,0,0.48)", backdropFilter: "blur(3px)" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.52rem", fontFamily: "monospace" }}>
                {coordLabel} · MGA94 Z55
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SITES MODE — Portfolio overview
      ══════════════════════════════════════════════════════════════════════ */}
      {mapMode === "sites" && (
        <>
          {/* Portfolio stats bar */}
          <div className="flex items-stretch"
            style={{ background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
            {[
              { label: "Projects",   count: portfolio.total,        color: "#1B4332" },
              { label: "Active",     count: portfolio.active,       color: "#16A34A" },
              { label: "Monitoring", count: portfolio.monitoring,   color: "#D97706" },
              { label: "Flagged",    count: portfolio.totalFlagged, color: "#EF4444" },
            ].map((s, i) => (
              <div key={s.label} className="flex-1 flex flex-col items-center py-2.5"
                style={{ borderLeft: i > 0 ? "1px solid #F3F4F6" : "none" }}>
                <span style={{ color: s.color, fontSize: "0.92rem", fontWeight: 800, lineHeight: 1 }}>
                  {s.count}
                </span>
                <span style={{ color: "#9CA3AF", fontSize: "0.52rem", marginTop: 2, textAlign: "center" }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Project cards */}
          <div className="px-4 pt-3 pb-1">
            <p style={{ color: "#9CA3AF", fontSize: "0.6rem", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              Projects — tap to view trees
            </p>
            <div className="flex flex-col gap-2">
              {projects.map(proj => {
                const statusColor  = PROJECT_STATUS_COLOR[proj.status] ?? "#6B7280";
                const statusBg     = PROJECT_STATUS_BG[proj.status]    ?? "#F3F4F6";
                const isActive     = proj.id === project.id;
                const abbrev       = makeProjectAbbrev(proj.id, proj.name);
                const liveCount    = projectTreeCounts.get(proj.id) ?? proj.totalTrees;
                const hasGps       = projectsWithData.has(proj.id);
                return (
                  <button
                    key={proj.id}
                    onClick={() => { setSelectedProjectId(proj.id); setMapMode("trees"); }}
                    className="w-full rounded-2xl text-left flex items-center gap-3 px-3.5 py-3 transition-all active:scale-[0.98]"
                    style={{
                      background: isActive ? "#F0FDF4" : "white",
                      border:     `1.5px solid ${isActive ? "#2D6A4F" : "#F3F4F6"}`,
                      boxShadow:  "0 1px 4px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* Coloured circle with project initials */}
                    <div className="rounded-full flex-shrink-0 flex items-center justify-center"
                      style={{ width: 36, height: 36, background: statusColor,
                        border: "2.5px solid white", boxShadow: "0 2px 6px rgba(0,0,0,0.18)" }}>
                      <span style={{ color: "white", fontSize: "8px", fontWeight: 800,
                        letterSpacing: "0.04em" }}>
                        {abbrev}
                      </span>
                    </div>

                    {/* Text block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span style={{ color: "#111827", fontSize: "0.82rem", fontWeight: 700 }}
                          className="truncate">
                          {proj.name}
                        </span>
                        {proj.flaggedTrees > 0 && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full"
                            style={{ background: "#FEE2E2", color: "#EF4444",
                              fontSize: "0.58rem", fontWeight: 700 }}>
                            {proj.flaggedTrees} ⚠
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#9CA3AF", fontSize: "0.65rem" }}>
                          {liveCount > 0 ? `${liveCount.toLocaleString()} trees` : "No trees imported"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full"
                          style={{ background: statusBg, color: statusColor,
                            fontSize: "0.56rem", fontWeight: 700 }}>
                          {proj.status}
                        </span>
                        {hasGps ? (
                          <span className="flex items-center gap-0.5">
                            <span style={{ width: 6, height: 6, borderRadius: "50%",
                              background: "#4ADE80", display: "inline-block" }} />
                            <span style={{ color: "#15803D", fontSize: "0.58rem", fontWeight: 600 }}>
                              GPS data
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: "#D1D5DB", fontSize: "0.58rem" }}>No GPS yet</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight size={15} color="#9CA3AF" className="flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hint note */}
          <div className="mx-4 mt-3 mb-1 rounded-2xl px-4 py-3 flex items-start gap-2.5"
            style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
            <Info size={13} color="#15803D" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ color: "#15803D", fontSize: "0.68rem", lineHeight: 1.45 }}>
              {projectsWithData.size > 0
                ? <><span style={{ fontWeight: 700 }}>{projectsWithData.size} of {portfolio.total}
                    {portfolio.total !== 1 ? " projects" : " project"}</span> have GPS tree data.
                    Green dots = confirmed survey data.</>
                : <>Tap a project to load GPS tree data. Projects with data show
                    a <span style={{ fontWeight: 700, color: "#16A34A" }}>green dot</span>.</>
              }
            </p>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TREES MODE — Project tree inventory
      ══════════════════════════════════════════════════════════════════════ */}
      {mapMode === "trees" && (
        <>
          {/* Search bar */}
          <div className="px-4 pt-3 pb-2.5"
            style={{ background: "white", borderBottom: "1px solid #F3F4F6" }}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="#9CA3AF" />
              <input
                type="text"
                placeholder="Search by Tree ID or species…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                disabled={loadingTrees}
                className="w-full pl-9 pr-9 py-2.5 rounded-xl outline-none"
                style={{ background: "#F9FAFB", border: "1.5px solid #E5E7EB",
                  color: "#111827", fontSize: "0.8rem", opacity: loadingTrees ? 0.5 : 1 }}
              />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full"
                  style={{ background: "#E5E7EB" }}>
                  <X size={12} color="#6B7280" />
                </button>
              )}
            </div>
            {searchActive && (
              <p style={{ color: "#6B7280", fontSize: "0.68rem", marginTop: 5 }}>
                <span style={{ color: "#1B4332", fontWeight: 700 }}>{filteredTrees.length}</span>{" "}
                match{filteredTrees.length !== 1 ? "es" : ""} — non-matching markers dimmed
              </p>
            )}
          </div>

          {/* Controls panel */}
          <div style={{ background: "white", borderBottom: "1px solid #F3F4F6" }}>
            <button onClick={() => setShowControls(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} color="#374151" />
                <span style={{ color: "#374151", fontSize: "0.78rem", fontWeight: 700 }}>
                  Tree Controls
                </span>
                {modified && (
                  <span className="px-1.5 py-0.5 rounded-full"
                    style={{ background: "#DCFCE7", color: "#15803D", fontSize: "0.58rem", fontWeight: 700 }}>
                    Modified
                  </span>
                )}
              </div>
              {showControls
                ? <ChevronUp size={15} color="#9CA3AF" />
                : <ChevronDown size={15} color="#9CA3AF" />}
            </button>
            {showControls && (
              <div className="px-4 pb-4 flex flex-col gap-4"
                style={{ borderTop: "1px solid #F9FAFB" }}>
                <ChipSelect
                  label="Compliance Filter"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "all",           label: "All" },
                    { value: "compliant",     label: "Compliant" },
                    { value: "not-compliant", label: "Not Compliant" },
                    { value: "breach",        label: "Breach" },
                  ]}
                />
                <ChipSelect
                  label="Symbology"
                  value={symbology}
                  onChange={setSymbology}
                  options={[
                    { value: "none", label: "None" },
                    { value: "nrz",  label: "NRZ" },
                    { value: "srz",  label: "SRZ" },
                    { value: "dsh",  label: "DSH" },
                  ]}
                />
                {symbology !== "none" && (
                  <div className="rounded-xl px-3 py-2 flex items-start gap-2"
                    style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                    <Info size={13} color="#15803D" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ color: "#15803D", fontSize: "0.68rem", lineHeight: 1.4 }}>
                      {symbology === "nrz" && "NRZ — Notional Root Zone ring at real scale (metres)"}
                      {symbology === "srz" && "SRZ — Structural Root Zone ring at real scale (metres)"}
                      {symbology === "dsh" && "DSH — marker size scales proportionally to stem diameter"}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="flex items-stretch"
            style={{ background: "#F9FAFB", borderBottom: "1px solid #F3F4F6" }}>
            {loadingTrees ? (
              <div className="flex-1 flex items-center justify-center py-3">
                <span style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>Loading…</span>
              </div>
            ) : (
              [
                { label: "Compliant",     count: stats.compliant,    color: "#16A34A" },
                { label: "Not Compliant", count: stats.notCompliant, color: "#DC2626" },
                { label: "Breach",        count: stats.breaches,     color: "#991B1B" },
                { label: "Total",         count: stats.total,        color: "#374151" },
              ].map((s, i) => (
                <div key={s.label} className="flex-1 flex flex-col items-center py-2.5"
                  style={{ borderLeft: i > 0 ? "1px solid #F3F4F6" : "none" }}>
                  <span style={{ color: s.color, fontSize: "0.92rem", fontWeight: 800, lineHeight: 1 }}>
                    {s.count}
                  </span>
                  <span style={{ color: "#9CA3AF", fontSize: "0.56rem", marginTop: 2, textAlign: "center" }}>
                    {s.label}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Error */}
          {treeError && (
            <div className="mx-4 mt-3 rounded-2xl px-4 py-4 flex items-start gap-3"
              style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
              <WifiOff size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: "#991B1B", fontSize: "0.78rem", fontWeight: 700, marginBottom: 2 }}>
                  Failed to load trees
                </p>
                <p style={{ color: "#B91C1C", fontSize: "0.7rem", lineHeight: 1.4 }}>{treeError}</p>
              </div>
            </div>
          )}

          {/* No GPS notice */}
          {!loadingTrees && !treeError && !hasTreeData && (
            <div className="mx-4 mt-3 rounded-2xl px-4 py-5 flex items-start gap-3"
              style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
              <Info size={15} color="#D97706" style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ color: "#92400E", fontSize: "0.78rem", fontWeight: 700, marginBottom: 2 }}>
                  No tree data for this project
                </p>
                <p style={{ color: "#B45309", fontSize: "0.7rem", lineHeight: 1.4 }}>
                  GPS survey data for <strong>{project.name}</strong> has not yet been imported.
                </p>
              </div>
            </div>
          )}

          {/* Selected tree detail card */}
          {selectedTree && (
            <div className="mx-4 mt-3 rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 4px 18px rgba(0,0,0,0.10)", border: "1.5px solid #F3F4F6" }}>
              {/* Compliance colour bar */}
              <div style={{ height: 4, background: complianceColor(treeComplianceStatus(selectedTree)) }} />
              <div className="p-4" style={{ background: "white" }}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="px-2 py-0.5 rounded-lg flex-shrink-0"
                        style={{ background: "#1B4332", color: "white",
                          fontSize: "0.7rem", fontWeight: 800 }}>
                        {selectedTree.id}
                      </span>
                      <span className="px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: complianceBg(treeComplianceStatus(selectedTree)),
                          color: complianceColor(treeComplianceStatus(selectedTree)),
                          fontSize: "0.66rem", fontWeight: 700,
                        }}>
                        {complianceLabel(treeComplianceStatus(selectedTree))}
                      </span>
                    </div>
                    <p style={{ color: "#111827", fontSize: "0.88rem", fontWeight: 700,
                      fontStyle: "italic", lineHeight: 1.25 }}>
                      {selectedTree.botanicalName}
                    </p>
                  </div>
                  <button onClick={() => setSelectedTree(null)}
                    className="p-2 rounded-full flex-shrink-0" style={{ background: "#F3F4F6" }}>
                    <X size={13} color="#6B7280" />
                  </button>
                </div>

                {/* NRZ / SRZ / Location */}
                <div className="flex rounded-xl overflow-hidden mb-3"
                  style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
                  {[
                    { label: "NRZ",      value: `${selectedTree.nrzRadius} m` },
                    { label: "SRZ",      value: selectedTree.srzRadius ? `${selectedTree.srzRadius} m` : "N/A" },
                    { label: "Location", value: selectedTree.location },
                  ].map((item, i) => (
                    <div key={item.label} className="flex-1 flex flex-col items-center py-2.5"
                      style={{ borderLeft: i > 0 ? "1px solid #F3F4F6" : "none" }}>
                      <span style={{ color: "#9CA3AF", fontSize: "0.58rem",
                        textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.label}</span>
                      <span style={{ color: "#111827", fontSize: "0.72rem", fontWeight: 700,
                        marginTop: 2, textAlign: "center" }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* TPM measures */}
                {selectedTree.treeProtectionMeasures && (
                  <div className="flex items-start gap-2 rounded-xl px-3 py-2 mb-3"
                    style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
                    <TreePine size={12} color="#15803D" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={{ color: "#374151", fontSize: "0.7rem", lineHeight: 1.5 }}>
                      <strong style={{ color: "#15803D" }}>Measures: </strong>
                      {selectedTree.treeProtectionMeasures}
                    </span>
                  </div>
                )}

                {/* Coords */}
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 mb-3"
                  style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
                  <span style={{ color: "#9CA3AF", fontSize: "0.67rem", fontFamily: "monospace" }}>
                    {selectedTree.latitude.toFixed(6)}, {selectedTree.longitude.toFixed(6)}
                  </span>
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate(`/trees/${selectedTree.id}`)}
                  className="w-full py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  style={{ background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)" }}
                >
                  <span style={{ color: "white", fontSize: "0.85rem", fontWeight: 700 }}>
                    Open Tree Detail
                  </span>
                  <ChevronRight size={15} color="white" />
                </button>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="mx-4 mt-3 rounded-2xl overflow-hidden"
            style={{ border: "1.5px solid #F3F4F6", background: "white" }}>
            <button onClick={() => setShowLegend(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3">
              <span style={{ color: "#374151", fontSize: "0.75rem", fontWeight: 600 }}>
                Legend — Compliance{symbology !== "none" && ` + ${symbology.toUpperCase()}`}
              </span>
              {showLegend
                ? <ChevronUp size={14} color="#9CA3AF" />
                : <ChevronDown size={14} color="#9CA3AF" />}
            </button>
            {showLegend && (
              <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid #F9FAFB" }}>
                <div className="flex flex-col gap-2.5 mb-3">
                  {LEGEND_ITEMS.map(item => (
                    <div key={item.label} className="flex items-center gap-2.5">
                      <div className="rounded-full flex-shrink-0"
                        style={{ width: 9, height: 9, background: item.color }} />
                      <span style={{ color: "#374151", fontSize: "0.73rem" }}>{item.label}</span>
                    </div>
                  ))}
                </div>
                {symbology !== "none" && (
                  <>
                    <div style={{ height: 1, background: "#F3F4F6", margin: "4px 0 10px" }} />
                    <div className="flex items-center gap-2.5">
                      <div className="rounded-full flex-shrink-0"
                        style={{ width: 13, height: 13,
                          border: "1.5px dashed #6B7280", background: "rgba(107,114,128,0.12)" }} />
                      <span style={{ color: "#374151", fontSize: "0.72rem" }}>
                        {symbology === "nrz" ? "NRZ — real scale"
                          : symbology === "srz" ? "SRZ — real scale"
                          : "DSH — dot size = stem diameter"}
                      </span>
                    </div>
                  </>
                )}
                <div style={{ height: 1, background: "#F9FAFB", margin: "10px 0 8px" }} />
                <span style={{ color: "#9CA3AF", fontSize: "0.65rem" }}>
                  {hasTreeData
                    ? `${stats.total} trees · compliance based on encroachment class`
                    : "No tree data for this project"}
                </span>
              </div>
            )}
          </div>

          {/* Search results list */}
          {searchActive && filteredTrees.length > 0 && (
            <div className="px-4 mt-3">
              <p style={{ color: "#6B7280", fontSize: "0.62rem", fontWeight: 700,
                letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 6 }}>
                {filteredTrees.length} result{filteredTrees.length !== 1 ? "s" : ""}
              </p>
              <div className="flex flex-col gap-1.5">
                {filteredTrees.slice(0, 8).map(tree => {
                  const color      = complianceColor(treeComplianceStatus(tree));
                  const isSelected = selectedTree?.id === tree.id;
                  return (
                    <button
                      key={tree.id}
                      onClick={() => handleTreeSelect(tree)}
                      className="w-full rounded-xl text-left flex items-center gap-3 px-3 py-2.5 transition-all active:scale-[0.98]"
                      style={{
                        background: isSelected ? "#F0FDF4" : "white",
                        border:     `1.5px solid ${isSelected ? "#2D6A4F" : "#F3F4F6"}`,
                        boxShadow:  "0 1px 3px rgba(0,0,0,0.05)",
                      }}
                    >
                      <div className="rounded-full flex-shrink-0"
                        style={{ width: 9, height: 9, background: color }} />
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded-md"
                        style={{ background: "#1B4332", color: "white",
                          fontSize: "0.6rem", fontWeight: 800 }}>
                        {tree.id}
                      </span>
                      <span className="flex-1 truncate"
                        style={{ color: "#374151", fontSize: "0.78rem", fontStyle: "italic" }}>
                        {tree.botanicalName}
                      </span>
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full"
                        style={{ background: complianceBg(treeComplianceStatus(tree)),
                          color, fontSize: "0.6rem", fontWeight: 700 }}>
                        {complianceLabel(treeComplianceStatus(tree))}
                      </span>
                    </button>
                  );
                })}
                {filteredTrees.length > 8 && (
                  <p style={{ color: "#9CA3AF", fontSize: "0.68rem",
                    textAlign: "center", paddingTop: 4 }}>
                    + {filteredTrees.length - 8} more — refine your search
                  </p>
                )}
              </div>
            </div>
          )}

          {searchActive && filteredTrees.length === 0 && !loadingTrees && (
            <div className="mx-4 mt-3 rounded-2xl px-4 py-6 flex flex-col items-center gap-2 text-center"
              style={{ background: "#F9FAFB", border: "1px solid #F3F4F6" }}>
              <Search size={22} color="#D1D5DB" />
              <p style={{ color: "#6B7280", fontSize: "0.82rem" }}>No trees match "{search}"</p>
              <p style={{ color: "#9CA3AF", fontSize: "0.72rem" }}>
                Try a Tree ID (e.g. T001) or species name
              </p>
            </div>
          )}
        </>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
