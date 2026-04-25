import { TREES as _TREES } from './treeData';

// Re-export Tree type and TREES array from real dataset
export type { Tree } from './treeData';
export { TREES } from './treeData';

export type TreeStatus = "compliant" | "at-risk" | "flagged" | "removed";
export type ObservationType =
  | "Routine Inspection"
  | "Damage Report"
  | "Encroachment Alert"
  | "Root Zone Disturbance"
  | "Compaction Check"
  | "Chemical Spill";
export type ObservationSeverity = "low" | "medium" | "high" | "critical";

export interface Observation {
  id: string;
  treeId: string;
  treeName: string;
  type: ObservationType;
  severity: ObservationSeverity;
  description: string;
  inspector: string;
  date: string;
  photos: string[];
  resolved: boolean;
  actionRequired: string;
}

export interface ComplianceZone {
  id: string;
  name: string;
  score: number;
  trees: number;
  issues: number;
  lastAudit: string;
}

export const OBSERVATIONS: Observation[] = [
  {
    id: "OBS001",
    treeId: "T005",
    treeName: "T005 – Eucalyptus camaldulensis",
    type: "Root Zone Disturbance",
    severity: "critical",
    description:
      "Trenching work has cut through major lateral roots within the NRZ. Root system exposed over approx. 4 m. Immediate cessation of work required in this zone.",
    inspector: "J. Morrison",
    date: "2026-03-30",
    photos: [
      "https://images.unsplash.com/photo-1759882611269-d7fb3336cf1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    ],
    resolved: false,
    actionRequired: "Stop work order issued. Arboricultural consultant review required within 24 hrs.",
  },
  {
    id: "OBS002",
    treeId: "T025",
    treeName: "T025 – Araucaria cunninghamii",
    type: "Encroachment Alert",
    severity: "high",
    description:
      "Scaffold structure erected within 2.3 m of NRZ fencing on east side. Soil compaction noted from vehicle access.",
    inspector: "S. Patel",
    date: "2026-03-28",
    photos: [
      "https://images.unsplash.com/photo-1770480597204-badf2766b39e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    ],
    resolved: false,
    actionRequired: "Scaffold to be repositioned minimum 5 m from NRZ. Compaction assessment required.",
  },
  {
    id: "OBS003",
    treeId: "T097",
    treeName: "T097 – Zelkova serrata",
    type: "Encroachment Alert",
    severity: "high",
    description:
      "Building materials (pallets and aggregate bags) stored within NRZ. Ground protection matting not in place.",
    inspector: "J. Morrison",
    date: "2026-03-27",
    photos: [],
    resolved: false,
    actionRequired: "Remove all materials from NRZ. Install ground protection immediately.",
  },
  {
    id: "OBS004",
    treeId: "T047",
    treeName: "T047 – Cinnamomum camphora",
    type: "Routine Inspection",
    severity: "low",
    description:
      "Monthly routine inspection completed. NRZ fencing intact and secure. No encroachment detected. Crown appears healthy.",
    inspector: "A. Chen",
    date: "2026-03-28",
    photos: [
      "https://images.unsplash.com/photo-1762539315382-67641d672770?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
    ],
    resolved: true,
    actionRequired: "None. Continue routine monitoring.",
  },
  {
    id: "OBS005",
    treeId: "T073",
    treeName: "T073 – Ginkgo biloba",
    type: "Compaction Check",
    severity: "low",
    description:
      "Penetrometer readings taken at 4 points around drip line. All readings within acceptable limits. No evidence of machinery access.",
    inspector: "S. Patel",
    date: "2026-03-26",
    photos: [],
    resolved: true,
    actionRequired: "None required.",
  },
  {
    id: "OBS006",
    treeId: "T033",
    treeName: "T033 – Aesculus hippocastanum",
    type: "Routine Inspection",
    severity: "low",
    description:
      "Protective fencing checked and all panels secure. Site hoarding erected to rear of tree is at safe distance.",
    inspector: "A. Chen",
    date: "2026-03-25",
    photos: [],
    resolved: true,
    actionRequired: "None.",
  },
];

const _compliant = _TREES.filter(t => t.status === "compliant").length;
const _atRisk    = _TREES.filter(t => t.status === "at-risk").length;
const _flagged   = _TREES.filter(t => t.status === "flagged").length;
const _removed   = _TREES.filter(t => t.status === "removed").length;

export const COMPLIANCE_ZONES: ComplianceZone[] = [
  { id: "ZA", name: "North Precinct", score: 78, trees: 42, issues: 8, lastAudit: "2026-03-28" },
  { id: "ZB", name: "Central Precinct", score: 61, trees: 89, issues: 14, lastAudit: "2026-03-30" },
  { id: "ZC", name: "South Precinct", score: 90, trees: 56, issues: 3, lastAudit: "2026-03-27" },
];

export const PROJECT = {
  name: "Parliament of Victoria",
  reference: "DPS-2026-047",
  site: "110-160 Spring Street, East Melbourne",
  client: "Department of Parliamentary Services",
  startDate: "2026-01-15",
  endDate: "2027-06-30",
  inspector: "Field Inspector",
  totalTrees: _TREES.length,
  compliantTrees: _compliant,
  atRiskTrees: _atRisk,
  flaggedTrees: _flagged,
  removedTrees: _removed,
  overallCompliance: Math.round((_compliant / _TREES.length) * 100),
  nextAudit: "2026-04-20",
};