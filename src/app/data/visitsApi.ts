import { supabase } from "../../lib/supabase";
import type { Visit, VisitType } from "./visitsData";

interface SaveVisitInput {
  projectUuid: string;
  inspectionDate: string;
  visitType: VisitType;
  inspectorName: string;
  notes: string;
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
  return {
    id: asString(row.id),
    projectId: asString(row.project_id ?? row.projectId),
    projectName: asString(row.project_name ?? row.projectName ?? row.project_id ?? "Unknown Project"),
    date: asString(row.inspection_date ?? row.date),
    type: asString(row.visit_type ?? row.type) as VisitType,
    inspector: asString(row.inspector_name ?? row.inspector),
    status: "completed",
    totalTrees: asNumber(row.total_trees ?? row.totalTrees),
    inspectedTrees: asNumber(row.inspected_trees ?? row.inspectedTrees),
    noChangeTrees: asNumber(row.no_change_trees ?? row.noChangeTrees),
    breachCount: asNumber(row.breach_count ?? row.breachCount),
    notes: asString(row.notes),
    treeInspections: [],
  };
}

export async function fetchVisits(): Promise<Visit[]> {
  const { data, error } = await supabase
    .from("visits")
    .select("*")
    .order("inspection_date", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => mapVisitRow(row as Record<string, unknown>));
}

export async function createVisit(input: SaveVisitInput): Promise<Visit> {
  const payload = {
    project_id: input.projectUuid,
    tree_id: null,
    visit_type: input.visitType,
    inspection_date: input.inspectionDate,
    inspector_name: input.inspectorName,
    notes: input.notes,
  };

  const { data, error } = await supabase
    .from("visits")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return mapVisitRow((data ?? payload) as Record<string, unknown>);
}
