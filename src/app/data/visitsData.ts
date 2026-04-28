/**
 * Mock visit/inspection data.
 * Shape mirrors what a future `visits` Supabase table would contain.
 * projectId matches ProjectData.id (slug); projectUuid matches ProjectData.uuid.
 */

export type VisitType =
  | "Pre-Construction Compliance Assessment"
  | "Routine Visit"
  | "Supervision of Works in the TPZ"
  | "Investigative Works"
  | "Final Compliance Assessment";

export type VisitStatus = "draft" | "completed";

export interface TreeInspection {
  treeId: string;            // matches SupabaseTree.id
  botanicalName: string;
  location: string;
  noChange: boolean;         // true = inherited from previous inspection — no new observations recorded this visit
  tpmCompliance: "compliant" | "not_compliant" | "breach";
  health: "Good" | "Fair" | "Poor" | "Dead" | "";
  damage: "Yes" | "No" | "";
  notes: string;
  photoUrls?: string[];
}

export interface Visit {
  id: string;
  projectId: string;         // slug
  projectName: string;
  date: string;              // ISO date
  type: VisitType;
  inspector: string;
  status: VisitStatus;
  totalTrees: number;
  inspectedTrees: number;
  noChangeTrees: number;     // trees carrying forward their previous inspection record unchanged
  breachCount: number;
  notes: string;
  treeInspections: TreeInspection[];
}

// ── Short labels for UI chips ─────────────────────────────────────────────────

export const VISIT_TYPE_SHORT: Record<VisitType, string> = {
  "Pre-Construction Compliance Assessment": "Pre-Construction",
  "Routine Visit":                          "Routine",
  "Supervision of Works in the TPZ":        "TPZ Supervision",
  "Investigative Works":                    "Investigative",
  "Final Compliance Assessment":            "Final",
};

export const VISIT_TYPE_COLORS: Record<VisitType, { bg: string; text: string; border: string }> = {
  "Pre-Construction Compliance Assessment": { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
  "Routine Visit":                          { bg: "#F0FDF4", text: "#15803D", border: "#BBF7D0" },
  "Supervision of Works in the TPZ":        { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  "Investigative Works":                    { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" },
  "Final Compliance Assessment":            { bg: "#F5F3FF", text: "#6D28D9", border: "#DDD6FE" },
};

export const ALL_VISIT_TYPES: VisitType[] = [
  "Pre-Construction Compliance Assessment",
  "Routine Visit",
  "Supervision of Works in the TPZ",
  "Investigative Works",
  "Final Compliance Assessment",
];

// ── Mock data ─────────────────────────────────────────────────────────────────

export const MOCK_VISITS: Visit[] = [
  {
    id: "v001",
    projectId: "4-beaufort-rd-croydon",
    projectName: "4 Beaufort Rd, Croydon",
    date: "2026-04-18",
    type: "Routine Visit",
    inspector: "Site Arborist",
    status: "completed",
    totalTrees: 12,
    inspectedTrees: 12,
    noChangeTrees: 9,
    breachCount: 1,
    notes: "Minor fencing displacement noted at T004. Contractor notified on site.",
    treeInspections: [
      { treeId: "T001", botanicalName: "Eucalyptus obliqua", location: "Onsite", noChange: true,  tpmCompliance: "compliant",     health: "Good", damage: "No",  notes: "" },
      { treeId: "T002", botanicalName: "Acacia melanoxylon", location: "Onsite", noChange: true,  tpmCompliance: "compliant",     health: "Good", damage: "No",  notes: "" },
      { treeId: "T003", botanicalName: "Eucalyptus viminalis", location: "Neighbouring property", noChange: true,  tpmCompliance: "compliant", health: "Fair", damage: "No", notes: "" },
      { treeId: "T004", botanicalName: "Lophostemon confertus", location: "Onsite", noChange: false, tpmCompliance: "breach", health: "Good", damage: "No",  notes: "Fencing displaced approx 0.5m on eastern side. Reinstated during visit." },
      { treeId: "T005", botanicalName: "Eucalyptus obliqua", location: "Nature strip", noChange: true, tpmCompliance: "compliant", health: "Good", damage: "No", notes: "" },
      { treeId: "T006", botanicalName: "Acacia dealbata", location: "Onsite", noChange: true, tpmCompliance: "compliant", health: "Fair", damage: "No", notes: "" },
    ],
  },
  {
    id: "v002",
    projectId: "4-beaufort-rd-croydon",
    projectName: "4 Beaufort Rd, Croydon",
    date: "2026-03-21",
    type: "Pre-Construction Compliance Assessment",
    inspector: "Site Arborist",
    status: "completed",
    totalTrees: 12,
    inspectedTrees: 12,
    noChangeTrees: 0,
    breachCount: 0,
    notes: "Initial pre-construction assessment. All TPZ fencing installed per specification. Site ready to proceed.",
    treeInspections: [
      { treeId: "T001", botanicalName: "Eucalyptus obliqua", location: "Onsite", noChange: false, tpmCompliance: "compliant", health: "Good", damage: "No", notes: "" },
      { treeId: "T002", botanicalName: "Acacia melanoxylon", location: "Onsite", noChange: false, tpmCompliance: "compliant", health: "Good", damage: "No", notes: "" },
      { treeId: "T003", botanicalName: "Eucalyptus viminalis", location: "Neighbouring property", noChange: false, tpmCompliance: "compliant", health: "Fair", damage: "No", notes: "" },
      { treeId: "T004", botanicalName: "Lophostemon confertus", location: "Onsite", noChange: false, tpmCompliance: "compliant", health: "Good", damage: "No", notes: "" },
      { treeId: "T005", botanicalName: "Eucalyptus obliqua", location: "Nature strip", noChange: false, tpmCompliance: "compliant", health: "Good", damage: "No", notes: "" },
      { treeId: "T006", botanicalName: "Acacia dealbata", location: "Onsite", noChange: false, tpmCompliance: "compliant", health: "Fair", damage: "No", notes: "" },
    ],
  },
  {
    id: "v003",
    projectId: "4-beaufort-rd-croydon",
    projectName: "4 Beaufort Rd, Croydon",
    date: "2026-04-05",
    type: "Supervision of Works in the TPZ",
    inspector: "Site Arborist",
    status: "completed",
    totalTrees: 4,
    inspectedTrees: 4,
    noChangeTrees: 3,
    breachCount: 0,
    notes: "Supervised hand excavation within TPZ of T003. Root bridging implemented.",
    treeInspections: [],
  },
  {
    id: "v004",
    projectId: "parliament-vic",
    projectName: "Parliament House Vic",
    date: "2026-04-15",
    type: "Routine Visit",
    inspector: "Sarah Chen AArb",
    status: "completed",
    totalTrees: 32,
    inspectedTrees: 32,
    noChangeTrees: 28,
    breachCount: 3,
    notes: "Three TPZ fence breaches identified — contractors reminded of obligations. Photo evidence captured.",
    treeInspections: [],
  },
  {
    id: "v005",
    projectId: "parliament-vic",
    projectName: "Parliament House Vic",
    date: "2026-03-28",
    type: "Investigative Works",
    inspector: "Sarah Chen AArb",
    status: "completed",
    totalTrees: 5,
    inspectedTrees: 5,
    noChangeTrees: 0,
    breachCount: 0,
    notes: "Root investigation trenches opened for trees T022–T026. Results documented separately.",
    treeInspections: [],
  },
  {
    id: "v006",
    projectId: "parliament-vic",
    projectName: "Parliament House Vic",
    date: "2026-04-22",
    type: "Routine Visit",
    inspector: "Sarah Chen AArb",
    status: "draft",
    totalTrees: 32,
    inspectedTrees: 14,
    noChangeTrees: 11,
    breachCount: 0,
    notes: "",
    treeInspections: [],
  },
];
