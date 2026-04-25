import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { ProjectsPage } from "./components/projects/ProjectsPage";
import { TreesPage } from "./components/trees/TreesPage";
import { TreeDetailPage } from "./components/trees/TreeDetailPage";
import { MapPage } from "./components/map/MapPage";
import { VisitsPage } from "./components/visits/VisitsPage";
import { NewVisitPage } from "./components/visits/NewVisitPage";
import { VisitDetailPage } from "./components/visits/VisitDetailPage";
import { ReportsPage } from "./components/reports/ReportsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      // Root → redirect to projects
      { index: true, element: <Navigate to="/projects" replace /> },

      // ── Module 1: Projects ─────────────────────────────────────────────────
      { path: "projects", Component: ProjectsPage },

      // ── Module 2: Visits / Inspections ────────────────────────────────────
      { path: "visits",        Component: VisitsPage },
      { path: "visits/new",    Component: NewVisitPage },
      { path: "visits/:id",    Component: VisitDetailPage },

      // ── Module 3: Tree List + Detail ──────────────────────────────────────
      { path: "trees",         Component: TreesPage },
      { path: "trees/:id",     Component: TreeDetailPage },

      // ── Module 4: Map ─────────────────────────────────────────────────────
      { path: "map",           Component: MapPage },

      // ── Module 5: Reports ─────────────────────────────────────────────────
      { path: "reports",       Component: ReportsPage },

      // Legacy redirects (keep old links working)
      { path: "observations",        element: <Navigate to="/visits" replace /> },
      { path: "observations/add",    element: <Navigate to="/visits/new" replace /> },
      { path: "observations/:id",    element: <Navigate to="/visits" replace /> },
      { path: "compliance",          element: <Navigate to="/reports" replace /> },
    ],
  },
]);
