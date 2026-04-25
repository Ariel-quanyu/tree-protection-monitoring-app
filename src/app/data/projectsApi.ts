import { supabase } from "../../lib/supabase";
import { PROJECT_UI_META } from "./projectsData";

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
    };
  });
}