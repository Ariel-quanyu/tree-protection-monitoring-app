const TPM_EMPTY_VALUES = new Set(["", "none", "n/a", "na", "null"]);

export function cleanMeasureLabel(value: string): string | null {
  const label = value.trim();
  if (!label) return null;
  if (TPM_EMPTY_VALUES.has(label.toLowerCase())) return null;
  return label;
}

export function parseTreeProtectionMeasures(raw: string): string[] {
  const parts = raw
    .split(/[,;\/\n]+/g)
    .map((item) => cleanMeasureLabel(item))
    .filter((item): item is string => item !== null);
  return Array.from(new Set(parts));
}

export function getDisplayMeasures(
  requiredMeasures: string[],
  treeProtectionMeasures: string,
): string[] {
  const required = requiredMeasures
    .map((item) => cleanMeasureLabel(item))
    .filter((item): item is string => item !== null);

  if (required.length > 0) return Array.from(new Set(required));

  return parseTreeProtectionMeasures(treeProtectionMeasures);
}
