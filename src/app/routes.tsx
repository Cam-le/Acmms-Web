import { createBrowserRouter, Navigate, redirect } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { WorkersPage } from "./pages/WorkersPage";
import { TasksPage } from "./pages/TasksPage";
import { CropsPage } from "./pages/CropsPage";
import { FarmPage } from "./pages/FarmPage";
import { AdvisoryPage } from "./pages/AdvisoryPage";
import { BillingPage } from "./pages/BillingPage";
import { SoilsPage } from "./pages/SoilsPage";
import { SeasonsPage } from "./pages/SeasonsPage";
import { PlotsPage } from "./pages/PlotsPage";
import { AppLayout } from "./components/Layout";

// Specialist pages
import { SpecialistDashboardPage } from "./pages/specialist/SpecialistDashboardPage";
import { SpecialistConsultationPage } from "./pages/specialist/SpecialistConsultationPage";
import { SpecialistConsultationDetailPage } from "./pages/specialist/SpecialistConsultationDetailPage";
import { SpecialistHistoryPage } from "./pages/specialist/SpecialistHistoryPage";

function protectedLoader() {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  if (!isAuthenticated) {
    return redirect("/login");
  }
  return null;
}

function roleBasedIndex() {
  const role = localStorage.getItem("userRole");
  if (role === "Specialist") {
    return <Navigate to="/specialist/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/register",
    Component: RegisterPage,
  },
  {
    path: "/",
    Component: AppLayout,
    loader: protectedLoader,
    children: [
      {
        index: true,
        element: roleBasedIndex(),
      },

      // ── Owner routes ──────────────────────────────────────────────────────
      {
        path: "dashboard",
        Component: DashboardPage,
      },
      {
        path: "farm",
        Component: FarmPage,
      },
      {
        path: "seasons",
        Component: SeasonsPage,
      },
      {
        path: "lands",
        Component: PlotsPage,
      },
      {
        path: "workers",
        Component: WorkersPage,
      },
      {
        path: "tasks",
        Component: TasksPage,
      },
      {
        path: "crops",
        Component: CropsPage,
      },
      {
        path: "soils",
        Component: SoilsPage,
      },
      {
        path: "advisory",
        Component: AdvisoryPage,
      },
      {
        path: "billing",
        Component: BillingPage,
      },

      // ── Specialist routes ─────────────────────────────────────────────────
      {
        path: "specialist/dashboard",
        Component: SpecialistDashboardPage,
      },
      {
        path: "specialist/consultations",
        Component: SpecialistConsultationPage,
      },
      {
        path: "specialist/consultations/:id",
        Component: SpecialistConsultationDetailPage,
      },
      {
        path: "specialist/history",
        Component: SpecialistHistoryPage,
      },

      {
        path: "*",
        element: roleBasedIndex(),
      },
    ],
  },
]);
