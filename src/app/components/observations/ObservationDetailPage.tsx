import React from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft,
  CalendarClock,
  User,
  AlertCircle,
  CheckSquare,
  Camera,
  TreePine,
} from "lucide-react";
import { OBSERVATIONS } from "../../data/mockData";
import { SeverityBadge } from "../StatusBadge";
import { ImageWithFallback } from "../figma/ImageWithFallback";

export function ObservationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const obs = OBSERVATIONS.find((o) => o.id === id);

  if (!obs) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p style={{ color: "#6B7280" }}>Observation not found</p>
        <button
          onClick={() => navigate("/observations")}
          className="px-4 py-2 rounded-xl text-white"
          style={{ background: "#1B4332" }}
        >
          Back
        </button>
      </div>
    );
  }

  const SEVERITY_COLOR: Record<string, string> = {
    critical: "#DC2626",
    high: "#EA580C",
    medium: "#D97706",
    low: "#15803D",
  };

  return (
    <div>
      {/* Header */}
      <div
        className="px-4 pt-12 pb-5"
        style={{
          background: `linear-gradient(160deg, ${obs.resolved ? "#15803D" : SEVERITY_COLOR[obs.severity]} 0%, ${obs.resolved ? "#2D6A4F" : SEVERITY_COLOR[obs.severity] + "CC"} 100%)`,
        }}
      >
        <button
          onClick={() => navigate("/observations")}
          className="flex items-center gap-1.5 mb-4"
          style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.82rem" }}
        >
          <ChevronLeft size={16} />
          Observations
        </button>

        <div className="flex items-start justify-between gap-3">
          <div>
            <span
              className="inline-block rounded-lg px-2.5 py-1 mb-2"
              style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: "0.75rem", fontWeight: 600 }}
            >
              {obs.id}
            </span>
            <h1 style={{ color: "white", fontSize: "1.15rem", fontWeight: 700, lineHeight: 1.2 }}>
              {obs.type}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.8rem", marginTop: 2 }}>
              {obs.treeName}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <SeverityBadge severity={obs.severity} />
            {obs.resolved && (
              <span
                className="px-2.5 py-1 rounded-full"
                style={{ background: "rgba(255,255,255,0.25)", color: "white", fontSize: "0.7rem", fontWeight: 600 }}
              >
                ✓ Resolved
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <CalendarClock size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem" }}>{obs.date}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem" }}>{obs.inspector}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 flex flex-col gap-4">
        {/* Photos */}
        {obs.photos.length > 0 && (
          <div>
            <p style={{ color: "#374151", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Photos
            </p>
            <div className="grid grid-cols-2 gap-2">
              {obs.photos.map((photo, i) => (
                <div key={i} className="rounded-2xl overflow-hidden aspect-square">
                  <ImageWithFallback
                    src={photo}
                    alt={`Observation photo ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div
          className="rounded-2xl p-4"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} color="#6B7280" />
            <p style={{ color: "#374151", fontSize: "0.85rem", fontWeight: 600 }}>Description</p>
          </div>
          <p style={{ color: "#4B5563", fontSize: "0.85rem", lineHeight: 1.65 }}>
            {obs.description}
          </p>
        </div>

        {/* Action Required */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: obs.resolved ? "#F0FDF4" : "#FFF7ED",
            border: `1px solid ${obs.resolved ? "#BBF7D0" : "#FED7AA"}`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare size={16} color={obs.resolved ? "#15803D" : "#D97706"} />
            <p
              style={{
                color: obs.resolved ? "#15803D" : "#D97706",
                fontSize: "0.85rem",
                fontWeight: 600,
              }}
            >
              Action Required
            </p>
          </div>
          <p style={{ color: "#4B5563", fontSize: "0.85rem", lineHeight: 1.65 }}>
            {obs.actionRequired}
          </p>
        </div>

        {/* View Tree CTA */}
        <button
          onClick={() => navigate(`/trees/${obs.treeId}`)}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2"
          style={{ background: "#1B4332" }}
        >
          <TreePine size={20} color="white" />
          <span style={{ color: "white", fontSize: "0.92rem", fontWeight: 600 }}>
            View {obs.treeId} Details
          </span>
        </button>
      </div>
    </div>
  );
}
