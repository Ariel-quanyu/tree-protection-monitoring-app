import React from "react";
import { useNavigate } from "react-router";
import { ChevronLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  rightSlot?: React.ReactNode;
  dark?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  backPath,
  rightSlot,
  dark = false,
}: PageHeaderProps) {
  const navigate = useNavigate();

  if (dark) {
    return (
      <div
        className="px-4 pt-12 pb-5 flex items-center justify-between"
        style={{ background: "linear-gradient(160deg, #1B4332 0%, #2D6A4F 100%)" }}
      >
        <div className="flex items-center gap-3">
          {backPath && (
            <button
              onClick={() => navigate(backPath)}
              className="p-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <ChevronLeft size={22} color="white" />
            </button>
          )}
          <div>
            <h1 style={{ color: "white", fontSize: "1.2rem", fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.78rem", lineHeight: 1.4 }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {rightSlot && <div>{rightSlot}</div>}
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-3 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {backPath && (
          <button
            onClick={() => navigate(backPath)}
            className="p-2 rounded-full"
            style={{ background: "#F3F4F6" }}
          >
            <ChevronLeft size={20} color="#374151" />
          </button>
        )}
        <div>
          <h1 style={{ color: "#111827", fontSize: "1.1rem", fontWeight: 700, lineHeight: 1.3 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: "#6B7280", fontSize: "0.75rem" }}>{subtitle}</p>
          )}
        </div>
      </div>
      {rightSlot && <div>{rightSlot}</div>}
    </div>
  );
}
