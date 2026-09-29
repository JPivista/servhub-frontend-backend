import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "../layouts/AppShell";
import { GuestRoute, ProtectedRoute } from "../layouts/ProtectedRoute";
import LoginPage from "../pages/auth/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import DeleteRequestsPage from "../pages/delete-requests/DeleteRequestsPage";
import DepartmentsPage from "../pages/departments/DepartmentsPage";
import PrivilegesPage from "../pages/privileges/PrivilegesPage";
import ReportsPage from "../pages/reports/ReportsPage";
import RolesPage from "../pages/roles/RolesPage";
import AttendancePage from "../pages/attendance/AttendancePage";
import AuditsPage from "../pages/audits/AuditsPage";
import SettingsPage from "../pages/settings/SettingsPage";
import SuppliersPage from "../pages/suppliers/SuppliersPage";
import UserFormPage from "../pages/users/UserFormPage";
import UsersPage from "../pages/users/UsersPage";
import MaterialFlowPage from "../pages/workflow/MaterialFlowPage";
import MaterialRequestDetailPage from "../pages/workflow/MaterialRequestDetailPage";
import MaterialRequestFormPage from "../pages/workflow/MaterialRequestFormPage";
import MaterialsListPage from "../pages/materials/MaterialsListPage";
import MaterialsPage from "../pages/materials/MaterialsPage";
import { homePathForRole } from "../constants/nav";
import { useSelector } from "react-redux";

function HomeRedirect() {
  const roleKey = useSelector((state) => state.auth.role?.key);
  if (roleKey === "user" || roleKey === "requestor" || roleKey === "requester") {
    return <Navigate to="/material-requests" replace />;
  }
  if (roleKey === "back_office") return <Navigate to="/materials" replace />;
  return <DashboardPage />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route
            path="/material-requests"
            element={
              <MaterialFlowPage
                moduleKey="material_requests"
                title="Material requests"
                kicker="Request"
                allowCreate
              />
            }
          />
          <Route path="/material-requests/new" element={<MaterialRequestFormPage />} />
          <Route path="/material-requests/:id/edit" element={<MaterialRequestFormPage />} />
          <Route path="/material-requests/:id" element={<MaterialRequestDetailPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route
            path="/approvals"
            element={
              <MaterialFlowPage moduleKey="approvals" title="Approvals" kicker="Business approval" />
            }
          />
          <Route
            path="/procurement"
            element={
              <MaterialFlowPage moduleKey="procurement" title="Procurement" kicker="Sourcing" />
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <MaterialFlowPage
                moduleKey="purchase_orders"
                title="Purchase orders"
                kicker="Ordering"
              />
            }
          />
          <Route
            path="/deliveries"
            element={
              <MaterialFlowPage moduleKey="deliveries" title="Deliveries" kicker="Receipt" />
            }
          />
          <Route
            path="/payments"
            element={
              <MaterialFlowPage
                moduleKey="payments"
                title="Payments"
                kicker="Delivery & payment"
                showPayment
              />
            }
          />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/users/new" element={<UserFormPage />} />
          <Route path="/users/:id/edit" element={<UserFormPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/materials/new" element={<MaterialsPage />} />
          <Route path="/materials/:id/edit" element={<MaterialsPage />} />
          <Route path="/materials" element={<MaterialsListPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/privileges" element={<PrivilegesPage />} />
          <Route path="/delete-requests" element={<DeleteRequestsPage />} />
          <Route path="/audits" element={<AuditsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<HomeCatchAll />} />
    </Routes>
  );
}

function HomeCatchAll() {
  const roleKey = useSelector((state) => state.auth.role?.key);
  return <Navigate to={homePathForRole(roleKey)} replace />;
}
