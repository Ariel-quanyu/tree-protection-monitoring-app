import React, { useState } from "react";
import { useNavigate } from "react-router";
import { CalendarClock, CheckCircle2, AlertCircle, Camera } from "lucide-react";
import { OBSERVATIONS } from "../../data/mockData";
import type { ObservationSeverity } from "../../data/mockData";
import { SeverityBadge } from "../StatusBadge";
import { ImageWithFallback } from "../figma/ImageWithFallback";

const FILTER_OPTIONS: { value: "all" | "unresolved" | "resolved"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unresolved", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

const SEVERITY_DOT: Record<ObservationSeverity, string> = {
  critical: "#DC2626",
  high: "#EA580C",
  medium: "#D97706",
  low: "#15803D",
};

export function ObservationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unresolved" | "resolved">("all");

  const filtered = OBSERVATIONS.filter((o) => {
    if (filter === "unresolved") return !o.resolved;
    if (filter === "resolved") return o.resolved;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-4"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Field Log
        </p>
        <h1 style={{ color: "white", fontSize: "1.25rem", fontWeight: 700, marginTop: 2, marginBottom: 12 }}>
          Observations
        </h1>

        {/* Summary chips */}
        <div className="flex gap-2">
          {[
            { label: "Open", count: OBSERVATIONS.filter((o) => !o.resolved).length, color: "#FEE2E2", text: "#DC2626" },
            { label: "Resolved", count: OBSERVATIONS.filter((o) => o.resolved).length, color: "#DCFCE7", text: "#15803D" },
            { label: "Total", count: OBSERVATIONS.length, color: "rgba(255,255,255,0.2)", text: "white" },
          ].map(({ label, count, color, text }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: color }}
            >
              <span style={{ color: text, fontSize: "0.75rem", fontWeight: 700 }}>{count}</span>
              <span style={{ color: text, fontSize: "0.72rem" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="px-5 py-2 rounded-full transition-all"
              style={{
                background: filter === value ? "#1B4332" : "#F3F4F6",
                color: filter === value ? "white" : "#374151",
                fontSize: "0.82rem",
                fontWeight: filter === value ? 600 : 400,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 pt-4 pb-4">
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-4 top-3 bottom-3 w-0.5"
            style={{ background: "linear-gradient(to bottom, #D1D5DB, transparent)" }}
          />

          <div className="flex flex-col gap-4">
            {filtered.map((obs, idx) => (
              <button
                key={obs.id}
                onClick={() => navigate(`/observations/${obs.id}`)}
                className="flex gap-4 text-left w-full active:scale-98 transition-transform"
              >
                {/* Timeline dot */}
                <div className="relative z-10 flex-shrink-0" style={{ width: 9, marginTop: 14 }}>
                  <div
                    className="rounded-full"
                    style={{
                      width: 9,
                      height: 9,
                      background: obs.resolved ? "#15803D" : SEVERITY_DOT[obs.severity],
                      boxShadow: obs.resolved ? "none" : `0 0 0 3px ${SEVERITY_DOT[obs.severity]}33`,
                    }}
                  />
                </div>

                {/* Card */}
                <div
                  className="flex-1 rounded-2xl overflow-hidden"
                  style={{
                    background: "white",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                    borderLeft: `3px solid ${obs.resolved ? "#15803D" : SEVERITY_DOT[obs.severity]}`,
                  }}
                >
                  {/* Photo thumbnail if exists */}
                  {obs.photos.length > 0 && (
                    <div className="relative" style={{ height: 100 }}>
                      <ImageWithFallback
                        src={obs.photos[0]}
                        alt="Observation photo"
                        className="w-full h-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))" }}
                      />
                      <div className="absolute bottom-2 left-3 flex items-center gap-1">
                        <Camera size={12} color="white" />
                        <span style={{ color: "white", fontSize: "0.65rem" }}>
                          {obs.photos.length} photo{obs.photos.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p style={{ color: "#111827", fontSize: "0.85rem", fontWeight: 600 }}>
                          {obs.treeName}
                        </p>
                        <p style={{ color: "#6B7280", fontSize: "0.75rem" }}>{obs.type}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <SeverityBadge severity={obs.severity} />
                        {obs.resolved && (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={12} color="#15803D" />
                            <span style={{ color: "#15803D", fontSize: "0.65rem", fontWeight: 600 }}>
                              Resolved
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p
                      style={{ color: "#4B5563", fontSize: "0.77rem", lineHeight: 1.5 }}
                      className="line-clamp-2"
                    >
                      {obs.description}
                    </p>

                    <div className="flex items-center gap-2 mt-2.5">
                      <CalendarClock size={12} color="#9CA3AF" />
                      <span style={{ color: "#9CA3AF", fontSize: "0.68rem" }}>
                        {obs.date} · {obs.inspector}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 size={40} color="#D1D5DB" className="mx-auto mb-3" />
            <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>No observations in this category</p>
          </div>
        )}
      </div>
    </div>
  );
}
