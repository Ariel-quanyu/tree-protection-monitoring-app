import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, CheckCircle2, ChevronLeft, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react";
import {
  createProjectAndImportTrees,
  isImportableTreeCsvColumn,
  isNumericTreeCsvColumn,
  normalizeCsvHeader,
  type CsvTreeInputRow,
} from "../../data/csvImportApi";
import { useProject } from "../../context/ProjectContext";

type ParseStatus = "idle" | "ready" | "error";

interface ParsedCsv {
  headers: string[];
  rows: CsvTreeInputRow[];
}

const PREVIEW_ROW_COUNT = 10;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map(normalizeCsvHeader);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<CsvTreeInputRow>((row, header, index) => {
      row[header] = values[index] ?? "";
      return row;
    }, {});
  }).filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));

  return { headers, rows };
}

function validateCsv(parsed: ParsedCsv) {
  const errors: string[] = [];
  const treeIdHeader = parsed.headers.find((header) => header === "tree_id");

  if (parsed.headers.length === 0 || parsed.rows.length === 0) {
    errors.push("CSV must contain a header row and at least one tree row.");
    return errors;
  }

  if (!treeIdHeader) {
    errors.push("Tree ID column is required.");
    return errors;
  }

  const duplicateHeaders = parsed.headers.filter((header, index) => parsed.headers.indexOf(header) !== index);
  if (duplicateHeaders.length > 0) errors.push(`Duplicate CSV columns found: ${[...new Set(duplicateHeaders)].join(", ")}.`);

  const missingTreeIds = parsed.rows.some((row) => !String(row[treeIdHeader] ?? "").trim());
  if (missingTreeIds) errors.push("Some rows are missing Tree ID.");

  const seen = new Set<string>();
  const duplicate = parsed.rows.some((row) => {
    const treeId = String(row[treeIdHeader] ?? "").trim().toLowerCase();
    if (!treeId) return false;
    if (seen.has(treeId)) return true;
    seen.add(treeId);
    return false;
  });
  if (duplicate) errors.push("Duplicate Tree IDs found in CSV.");

  const invalidNumericColumns = parsed.headers.filter((header) => {
    if (!isNumericTreeCsvColumn(header)) return false;
    return parsed.rows.some((row) => {
      const value = String(row[header] ?? "").trim();
      return value !== "" && !Number.isFinite(Number(value));
    });
  });
  if (invalidNumericColumns.length > 0) errors.push(`Numeric columns contain invalid values: ${invalidNumericColumns.join(", ")}.`);

  return errors;
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label style={{ color: "#374151", fontSize: "0.76rem", fontWeight: 700 }}>
      {children}{required && <span style={{ color: "#DC2626", marginLeft: 3 }}>*</span>}
    </label>
  );
}

export function NewProjectCsvPage() {
  const navigate = useNavigate();
  const { setSelectedProjectId, reloadProjects } = useProject();
  const [projectName, setProjectName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [fileName, setFileName] = useState("");
  const [parsedCsv, setParsedCsv] = useState<ParsedCsv>({ headers: [], rows: [] });
  const [csvStatus, setCsvStatus] = useState<ParseStatus>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const csvErrors = useMemo(() => validateCsv(parsedCsv), [parsedCsv]);
  const importableHeaders = useMemo(() => parsedCsv.headers.filter(isImportableTreeCsvColumn), [parsedCsv.headers]);
  const ignoredHeaders = useMemo(() => parsedCsv.headers.filter((header) => !isImportableTreeCsvColumn(header)), [parsedCsv.headers]);
  const previewRows = parsedCsv.rows.slice(0, PREVIEW_ROW_COUNT);
  const previewHeaders = parsedCsv.headers.slice(0, 8);
  const canSubmit = Boolean(projectName.trim() && siteAddress.trim() && csvStatus === "ready" && parsedCsv.rows.length > 0 && csvErrors.length === 0 && !saving);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFormError(null);
    setSuccessMessage(null);
    setFileName(file?.name ?? "");

    if (!file) {
      setCsvStatus("idle");
      setParsedCsv({ headers: [], rows: [] });
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      setParsedCsv(parsed);
      setCsvStatus("ready");
    } catch (error) {
      console.error("CSV parse failed:", error);
      setParsedCsv({ headers: [], rows: [] });
      setCsvStatus("error");
      setFormError("CSV import failed.");
    }
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSuccessMessage(null);

    if (!projectName.trim()) {
      setFormError("Project name is required.");
      return;
    }
    if (!siteAddress.trim()) {
      setFormError("Site address is required.");
      return;
    }
    if (csvStatus !== "ready" || parsedCsv.rows.length === 0) {
      setFormError("Please upload a CSV file with tree records.");
      return;
    }
    if (csvErrors.length > 0) {
      setFormError(csvErrors[0]);
      return;
    }

    setSaving(true);
    try {
      const result = await createProjectAndImportTrees({
        name: projectName,
        siteAddress,
        rows: parsedCsv.rows,
      });
      await reloadProjects();
      setSelectedProjectId(result.project.id);
      const message = `Project created successfully and ${result.importedCount} trees imported.`;
      setSuccessMessage(message);
      navigate(`/projects/${result.project.id}`, { state: { importSuccess: message } });
    } catch (error) {
      console.error("CSV import failed:", error);
      setFormError(error instanceof Error ? error.message : "CSV import failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      <div className="px-4 pt-12 pb-5" style={{ background: "linear-gradient(175deg, #1B4332 0%, #2D6A4F 100%)" }}>
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-1.5 mb-3"
          style={{ color: "rgba(255,255,255,0.85)", fontSize: "0.75rem", fontWeight: 600 }}
        >
          <ChevronLeft size={15} /> Back to projects
        </button>
        <div className="flex items-center gap-2 mb-1">
          <FileSpreadsheet size={16} color="rgba(255,255,255,0.7)" />
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
            CSV Import
          </span>
        </div>
        <h1 style={{ color: "white", fontSize: "1.35rem", fontWeight: 800 }}>Create Project from CSV</h1>
        <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "0.74rem", marginTop: 5, lineHeight: 1.45 }}>
          Create the project first, then import all CSV tree records under that project.
        </p>
      </div>

      <div className="px-4 mt-4 flex flex-col gap-3">
        <section className="rounded-2xl p-4" style={{ background: "white", border: "1px solid #E5E7EB" }}>
          <p style={{ color: "#111827", fontSize: "0.95rem", fontWeight: 800, marginBottom: 12 }}>Project details</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Project name</FieldLabel>
              <input
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                placeholder="e.g. 25 Oak Street Development"
                className="w-full rounded-xl px-3 py-2.5"
                style={{ border: "1px solid #D1D5DB", fontSize: "0.85rem", background: "#F9FAFB", color: "#111827" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Site address</FieldLabel>
              <input
                value={siteAddress}
                onChange={(event) => setSiteAddress(event.target.value)}
                placeholder="Street address or site location"
                className="w-full rounded-xl px-3 py-2.5"
                style={{ border: "1px solid #D1D5DB", fontSize: "0.85rem", background: "#F9FAFB", color: "#111827" }}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl p-4" style={{ background: "white", border: "1px solid #D1FAE5" }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p style={{ color: "#111827", fontSize: "0.95rem", fontWeight: 800 }}>Upload tree CSV</p>
              <p style={{ color: "#6B7280", fontSize: "0.72rem", marginTop: 2 }}>
                Required column: tree_id. Optional columns are imported only when matching existing tree fields.
              </p>
            </div>
            <Upload size={18} color="#166534" />
          </div>

          <label
            className="block rounded-2xl px-4 py-5 text-center active:scale-[0.99] transition-transform cursor-pointer"
            style={{ background: "#F0FDF4", border: "1.5px dashed #86EFAC" }}
          >
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
            <FileSpreadsheet size={26} color="#166534" className="mx-auto mb-2" />
            <p style={{ color: "#166534", fontSize: "0.84rem", fontWeight: 800 }}>
              {fileName || "Choose CSV file"}
            </p>
            <p style={{ color: "#4B5563", fontSize: "0.7rem", marginTop: 3 }}>
              Preview and validation appear before import.
            </p>
          </label>

          {csvStatus === "ready" && (
            <div className="mt-3 flex items-center gap-2">
              {csvErrors.length === 0 ? <CheckCircle2 size={15} color="#16A34A" /> : <XCircle size={15} color="#DC2626" />}
              <span style={{ color: csvErrors.length === 0 ? "#166534" : "#B91C1C", fontSize: "0.74rem", fontWeight: 700 }}>
                {csvErrors.length === 0 ? `${parsedCsv.rows.length} rows ready to import (${importableHeaders.length} matching columns).` : csvErrors[0]}
              </span>
            </div>
          )}

          {csvStatus === "ready" && ignoredHeaders.length > 0 && csvErrors.length === 0 && (
            <div className="mt-2 flex items-center gap-2">
              <AlertCircle size={14} color="#D97706" />
              <span style={{ color: "#92400E", fontSize: "0.72rem", fontWeight: 600 }}>
                Unknown columns will be skipped: {ignoredHeaders.join(", ")}.
              </span>
            </div>
          )}

          {csvErrors.slice(1).map((error) => (
            <div key={error} className="mt-2 flex items-center gap-2">
              <AlertCircle size={14} color="#DC2626" />
              <span style={{ color: "#B91C1C", fontSize: "0.72rem", fontWeight: 600 }}>{error}</span>
            </div>
          ))}
        </section>

        {previewRows.length > 0 && (
          <section className="rounded-2xl overflow-hidden" style={{ background: "white", border: "1px solid #E5E7EB" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #F3F4F6" }}>
              <p style={{ color: "#111827", fontSize: "0.9rem", fontWeight: 800 }}>CSV preview</p>
              <p style={{ color: "#6B7280", fontSize: "0.7rem", marginTop: 2 }}>Showing first {previewRows.length} rows.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 680, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#F9FAFB" }}>
                    {previewHeaders.map((header) => (
                      <th key={header} className="px-3 py-2 text-left" style={{ color: "#6B7280", fontSize: "0.66rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} style={{ borderTop: "1px solid #F3F4F6" }}>
                      {previewHeaders.map((header) => (
                        <td key={header} className="px-3 py-2" style={{ color: "#111827", fontSize: "0.72rem", maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {String(row[header] ?? "") || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {(formError || successMessage) && (
          <div className="rounded-2xl px-4 py-3 flex items-start gap-2" style={{ background: formError ? "#FEF2F2" : "#F0FDF4", border: `1px solid ${formError ? "#FECACA" : "#BBF7D0"}` }}>
            {formError ? <AlertCircle size={16} color="#DC2626" /> : <CheckCircle2 size={16} color="#16A34A" />}
            <p style={{ color: formError ? "#B91C1C" : "#166534", fontSize: "0.78rem", fontWeight: 700 }}>{formError ?? successMessage}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-xl py-3 active:scale-95 transition-transform flex items-center justify-center gap-2"
          style={{ background: canSubmit ? "#166534" : "#D1D5DB", color: "white", fontSize: "0.86rem", fontWeight: 800 }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? "Importing…" : "Create Project and Import Trees"}
        </button>
      </div>
    </div>
  );
}
