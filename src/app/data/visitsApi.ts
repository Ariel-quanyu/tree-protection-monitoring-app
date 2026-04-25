import { supabase } from "../../lib/supabase";
import type { Visit, VisitStatus, VisitType } from "./visitsData";

interface SaveVisitInput {
  projectId: string;
  projectName: string;
  date: string;
  type: VisitType;
  inspector: string;
  status: VisitStatus;
  totalTrees: number;
  inspectedTrees: number;
  noChangeTrees: number;
  breachCount: number;
  notes: string;
  treeInspections: Visit["treeInspections"];
}

function asString(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  return String(v);
}

function asNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mapVisitRow(row: Record<string, unknown>): Visit {
  const treeInspections = row.tree_inspections ?? row.treeInspections;
  return {
    id: asString(row.id),
    projectId: asString(row.project_id ?? row.projectId),
    projectName: asString(row.project_name ?? row.projectName),
    date: asString(row.date),
    type: asString(row.visit_type ?? row.type) as VisitType,
    inspector: asString(row.inspector),
    status: asString(row.status, "completed") as VisitStatus,
    totalTrees: asNumber(row.total_trees ?? row.totalTrees),
    inspectedTrees: asNumber(row.inspected_trees ?? row.inspectedTrees),
    noChangeTrees: asNumber(row.no_change_trees ?? row.noChangeTrees),
    breachCount: asNumber(row.breach_count ?? row.breachCount),
    notes: asString(row.notes),
    treeInspections: Array.isArray(treeInspections) ? (treeInspections as Visit["treeInspections"]) : [],
  };
}

export async function fetchVisits(): Promise<Visit[]> {
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .order("date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapVisitRow(row as Record<string, unknown>));
}

export async function createVisit(input: SaveVisitInput): Promise<Visit> {
  const payload = {
    project_id: input.projectId,
    project_name: input.projectName,
    date: input.date,
    visit_type: input.type,
    inspector: input.inspector,
    status: input.status,
    total_trees: input.totalTrees,
    inspected_trees: input.inspectedTrees,
    no_change_trees: input.noChangeTrees,
    breach_count: input.breachCount,
    notes: input.notes,
    tree_inspections: input.treeInspections,
  };

  const { data, error } = await supabase
    .from("visits")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return mapVisitRow((data ?? payload) as Record<string, unknown>);
}
