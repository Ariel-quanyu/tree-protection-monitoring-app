import { Navigate, useNavigate, useLocation, Outlet } from "react-router";
import {
  FolderOpen,
  ClipboardCheck,
  Trees,
  Map,
  BarChart3,
  LogOut,
  Plus,
} from "lucide-react";
import { ProjectProvider } from "../context/ProjectContext";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { path: "/projects", label: "Projects",  icon: FolderOpen     },
  { path: "/visits",   label: "Visits",    icon: ClipboardCheck },
  { path: "/trees",    label: "Trees",     icon: Trees          },
  { path: "/map",      label: "Map",       icon: Map            },
  { path: "/reports",  label: "Reports",   icon: BarChart3      },
];

// Pages where the "Start Visit" FAB should be hidden
const FAB_HIDDEN_PATHS = [
  "/visits/new",
];

export function Layout() {
  return <LayoutContent />;
}

function LayoutContent() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, session, loading, signOut } = useAuth();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const showFab = !FAB_HIDDEN_PATHS.some(p => location.pathname.startsWith(p));

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-gray-500">Loading…</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <ProjectProvider>
      <div className="flex flex-col min-h-screen bg-[#F2F5F2] max-w-md mx-auto relative">
        <div className="px-4 pt-2 text-[11px] text-gray-600 bg-white border-b flex items-center justify-between">
          <span>{user?.email}</span>
          <button onClick={() => void signOut()} className="text-[#1B4332] py-1 flex items-center gap-1">
            <LogOut size={12} />
            Logout
          </button>
        </div>
        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto pb-24">
          <Outlet />
        </div>

        {/* FAB — Start Visit */}
        {showFab && (
          <button
            onClick={() => navigate("/visits/new")}
            className="fixed z-50 flex items-center gap-2 rounded-full shadow-xl text-white active:scale-95 transition-transform"
            style={{
              bottom: 76,
              right: 16,
              background: "#2D5A27",
              paddingLeft: 18,
              paddingRight: 20,
              paddingTop: 13,
              paddingBottom: 13,
              boxShadow: "0 4px 20px rgba(45,90,39,0.45)",
            }}
            aria-label="Start Visit"
          >
            <Plus size={18} strokeWidth={2.6} />
            <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.01em" }}>
              Start Visit
            </span>
          </button>
        )}

        {/* Bottom Navigation */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white"
          style={{
            borderTop: "1px solid #E5E7EB",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div className="flex items-stretch">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-colors"
                  style={{ minWidth: 0 }}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                >
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full"
                      style={{ width: 24, height: 2.5, background: "#1B4332" }}
                    />
                  )}
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 1.7}
                    color={active ? "#1B4332" : "#9CA3AF"}
                  />
                  <span
                    style={{
                      fontSize: "0.58rem",
                      fontWeight: active ? 700 : 400,
                      color: active ? "#1B4332" : "#9CA3AF",
                      letterSpacing: "0.01em",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </ProjectProvider>
  );
}
