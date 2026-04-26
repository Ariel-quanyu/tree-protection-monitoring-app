import { supabase } from "../../lib/supabase";
import { type InspectionFrequency, PROJECT_UI_META } from "./projectsData";

const INSPECTION_FREQUENCIES: InspectionFrequency[] = ["Monthly", "2-monthly", "3-monthly"];

function toInspectionFrequency(value: string | null): InspectionFrequency {
  if (value && INSPECTION_FREQUENCIES.includes(value as InspectionFrequency)) {
    return value as InspectionFrequency;
  }
  return "Monthly";
}

export async function fetchProjectsForUi() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((project) => {
    const meta = PROJECT_UI_META[project.slug];

    return {
      uuid: project.id,
      id: project.slug,
      name: project.name,
      site: project.site_address ?? "",
      client: project.client_name ?? "",
      tabLabel: meta?.tabLabel ?? project.name,
      reference: meta?.reference ?? "",
      startDate: meta?.startDate ?? "",
      endDate: meta?.endDate ?? "",
      inspector: meta?.inspector ?? "",
      inspectorInitials: meta?.inspectorInitials ?? "",
      nextAudit: meta?.nextAudit ?? "",
      status: meta?.status ?? "active",
      unresolvedObs: meta?.unresolvedObs ?? 0,
      criticalObs: meta?.criticalObs ?? 0,
      inspectionFrequency: toInspectionFrequency(project.inspection_frequency),
      nextInspectionDue: project.next_inspection_due ?? "",
      reminderEnabled: Boolean(project.reminder_enabled),
      reminderEmail: project.reminder_email ?? "",
    };
  });
}

export async function updateProjectInspectionSchedule(
  projectId: string,
  payload: {
    inspectionFrequency: InspectionFrequency;
    nextInspectionDue: string;
    reminderEnabled: boolean;
    reminderEmail: string;
  }
) {
  const { data, error } = await supabase
    .from("projects")
    .update({
      inspection_frequency: payload.inspectionFrequency,
      next_inspection_due: payload.nextInspectionDue || null,
      reminder_enabled: payload.reminderEnabled,
      reminder_email: payload.reminderEnabled ? payload.reminderEmail : null,
    })
    .eq("id", projectId)
    .select("inspection_frequency, next_inspection_due, reminder_enabled, reminder_email")
    .single();

  if (error) throw error;

  return {
    inspectionFrequency: toInspectionFrequency(data.inspection_frequency),
    nextInspectionDue: data.next_inspection_due ?? "",
    reminderEnabled: Boolean(data.reminder_enabled),
    reminderEmail: data.reminder_email ?? "",
  };
}
