import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchProjectsForUi } from "../data/projectsApi";
import { type ProjectData } from "../data/projectsData";

// ─── Context shape ────────────────────────────────────────────────────────────

interface ProjectContextValue {
  projects: ProjectData[];
  loadingProjects: boolean;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextValue>({
  projects: [],
  loadingProjects: true,
  selectedProjectId: "",
  setSelectedProjectId: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  useEffect(() => {
    fetchProjectsForUi()
      .then((uiProjects) => {
        const mapped: ProjectData[] = uiProjects.map((p) => ({
          ...p,
          // Tree stats are not available from the API at load time.
          // Pages that need live counts fetch them directly from Supabase.
          // overallCompliance is set to 0 (not 100) to avoid displaying
          // misleading compliance results before any inspections have been done.
          totalTrees: 0,
          compliantTrees: 0,
          atRiskTrees: 0,
          flaggedTrees: 0,
          overallCompliance: 0,
        }));
        setProjects(mapped);
        // Only set a default if nothing has been selected yet
        setSelectedProjectId((prev) => prev || (mapped[0]?.id ?? ""));
      })
      .catch((err) => console.error("Failed to load projects from Supabase:", err))
      .finally(() => setLoadingProjects(false));
  }, []);

  return (
    <ProjectContext.Provider
      value={{ projects, loadingProjects, selectedProjectId, setSelectedProjectId }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** Base hook — use when you only need id / setter or the full projects list. */
export function useProject() {
  return useContext(ProjectContext);
}

/** Convenience hook that resolves the full ProjectData object for the selected project. */
export function useSelectedProject() {
  const { projects, selectedProjectId, setSelectedProjectId } = useProject();
  const project =
    projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;
  return { project, selectedProjectId, setSelectedProjectId };
}