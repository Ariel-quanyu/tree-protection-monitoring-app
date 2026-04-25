import React from "react";
import { CheckCircle2, AlertTriangle, XOctagon, Minus } from "lucide-react";
import type { TreeStatusValue } from "../data/treeMapper";

// ObservationSeverity is defined here so StatusBadge has no dependency on mockData.
// When the real observations table is built, import this type from the observations module.
type ObservationSeverity = "low" | "medium" | "high" | "critical";

const STATUS_CONFIG: Record<
  TreeStatusValue,
  { label: string; bg: string; text: string; icon: React.FC<{ size?: number }> }
> = {
  compliant: {
    label: "Compliant",
    bg: "#DCFCE7",
    text: "#15803D",
    icon: ({ size = 14 }) => <CheckCircle2 size={size} />,
  },
  "at-risk": {
    label: "At Risk",
    bg: "#FEF3C7",
    text: "#D97706",
    icon: ({ size = 14 }) => <AlertTriangle size={size} />,
  },
  flagged: {
    label: "Flagged",
    bg: "#FEE2E2",
    text: "#DC2626",
    icon: ({ size = 14 }) => <XOctagon size={size} />,
  },
  removed: {
    label: "Removed",
    bg: "#F3F4F6",
    text: "#6B7280",
    icon: ({ size = 14 }) => <Minus size={size} />,
  },
};

const SEVERITY_CONFIG: Record<
  ObservationSeverity,
  { label: string; bg: string; text: string }
> = {
  low:      { label: "Low",      bg: "#DCFCE7", text: "#15803D" },
  medium:   { label: "Medium",   bg: "#FEF3C7", text: "#D97706" },
  high:     { label: "High",     bg: "#FFEDD5", text: "#EA580C" },
  critical: { label: "Critical", bg: "#FEE2E2", text: "#DC2626" },
};

export function TreeStatusBadge({
  status,
  size = "sm",
  baseline = false,
}: {
  status: TreeStatusValue;
  size?: "sm" | "md";
  /** When true, adds a subtle "(est.)" suffix to signal this is a derived baseline status. */
  baseline?: boolean;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const iconSize  = size === "sm" ? 12 : 14;
  const padding   = size === "sm" ? "2px 8px" : "4px 12px";
  const fontSize  = size === "sm" ? "0.7rem" : "0.8rem";

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full"
      style={{ background: config.bg, color: config.text, padding, fontSize, fontWeight: 600 }}
    >
      <Icon size={iconSize} />
      {config.label}
      {baseline && (
        <span style={{ opacity: 0.7, fontSize: "0.6rem", fontWeight: 400, marginLeft: 1 }}>
          est.
        </span>
      )}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: ObservationSeverity }) {
  const config = SEVERITY_CONFIG[severity];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{ background: config.bg, color: config.text, fontSize: "0.7rem", fontWeight: 600 }}
    >
      {config.label}
    </span>
  );
}

export function RetentionBadge({ category }: { category: "A" | "B" | "C" }) {
  const map = {
    A: { bg: "#DCFCE7", text: "#15803D", label: "Cat A" },
    B: { bg: "#FEF3C7", text: "#D97706", label: "Cat B" },
    C: { bg: "#F3F4F6", text: "#6B7280", label: "Cat C" },
  };
  const cfg = map[category];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5"
      style={{ background: cfg.bg, color: cfg.text, fontSize: "0.7rem", fontWeight: 600 }}
    >
      {cfg.label}
    </span>
  );
}

export function EncroachmentBadge({
  encroachmentClass,
  compact = false,
}: {
  encroachmentClass: "None" | "Minor" | "Moderate" | "Major";
  compact?: boolean;
}) {
  const map: Record<string, { bg: string; text: string; label: string; dot: string }> = {
    None:     { bg: "#DCFCE7", text: "#15803D", label: compact ? "None"     : "No Encroachment", dot: "#15803D" },
    Minor:    { bg: "#FEF3C7", text: "#D97706", label: "Minor",    dot: "#D97706" },
    Moderate: { bg: "#FFEDD5", text: "#EA580C", label: "Moderate", dot: "#EA580C" },
    Major:    { bg: "#FEE2E2", text: "#DC2626", label: "Major",    dot: "#DC2626" },
  };
  const cfg = map[encroachmentClass];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ background: cfg.bg, color: cfg.text, fontSize: "0.7rem", fontWeight: 600 }}
    >
      <span className="rounded-full flex-shrink-0"
        style={{ width: 5, height: 5, background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}
