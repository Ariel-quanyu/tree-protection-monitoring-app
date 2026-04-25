export type ProjectStatus = 'active' | 'monitoring' | 'completed';

export interface ProjectUiMeta {
  tabLabel: string;
  reference: string;
  startDate: string;
  endDate: string;
  inspector: string;
  inspectorInitials: string;
  nextAudit: string;
  status: ProjectStatus;
  unresolvedObs: number;
  criticalObs: number;
}

/** Full project shape used throughout the app.
 *  API fields come from fetchProjectsForUi(); tree-stat fields are computed
 *  in ProjectContext by matching against the local TREES dataset. */
export interface ProjectData {
  uuid: string;
  id: string;
  name: string;
  site: string;
  client: string;
  tabLabel: string;
  reference: string;
  startDate: string;
  endDate: string;
  inspector: string;
  inspectorInitials: string;
  nextAudit: string;
  status: ProjectStatus;
  unresolvedObs: number;
  criticalObs: number;
  // Computed from local tree data
  totalTrees: number;
  compliantTrees: number;
  atRiskTrees: number;
  flaggedTrees: number;
  overallCompliance: number;
}

export const PROJECT_UI_META: Record<string, ProjectUiMeta> = {
  "parliament-vic": {
    tabLabel: "Parliament",
    reference: "DPS-2026-047",
    startDate: "2026-01-15",
    endDate: "2027-06-30",
    inspector: "Sarah Chen AArb",
    inspectorInitials: "SC",
    nextAudit: "2026-04-20",
    status: "active",
    unresolvedObs: 3,
    criticalObs: 1,
  },
  "4-beaufort-rd-croydon": {
    tabLabel: "4 Beaufort",
    reference: "ODO-2026-001",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    inspector: "Site Arborist",
    inspectorInitials: "SA",
    nextAudit: "2026-05-01",
    status: "active",
    unresolvedObs: 0,
    criticalObs: 0,
  },
};