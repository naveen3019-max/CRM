import { lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { RoleLayout } from "../layouts/RoleLayout.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const LoginPage = lazy(() => import("../pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("../pages/RegisterPage.jsx"));
const AdminDashboardPage = lazy(() => import("../pages/AdminDashboardPage.jsx"));
const AdminChatPage = lazy(() => import("../pages/AdminChatPage.jsx"));
const SalesDashboardPage = lazy(() => import("../pages/SalesDashboardPage.jsx"));
const CustomerDashboardPage = lazy(() => import("../pages/CustomerDashboardPage.jsx"));
const VendorDashboardPage = lazy(() => import("../pages/VendorDashboardPage.jsx"));
const ElectricianDashboardPage = lazy(() => import("../pages/ElectricianDashboardPage.jsx"));
const FieldWorkDashboardPage = lazy(() => import("../pages/FieldWorkDashboardPage.jsx"));
const RoleChatPage = lazy(() => import("../pages/RoleChatPage.jsx"));
const ProfilePage = lazy(() => import("../pages/ProfilePage.jsx"));
const UnauthorizedPage = lazy(() => import("../pages/UnauthorizedPage.jsx"));

function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function RootRoute() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.role) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return <LoginPage />;
}

function RegisterRoute() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.role) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return <RegisterPage />;
}

function RedirectToOwnChat() {
  const { user } = useAuth();
  return <Navigate to={`/${user.role}/chat`} replace />;
}

function CatchAllRoute() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated && user?.role) {
    return <Navigate to={`/${user.role}`} replace />;
  }
  return <Navigate to="/" replace />;
}

function RoleRoute({ role, element }) {
  const { user } = useAuth();
  if (user?.role !== role) {
    return <Navigate to="/unauthorized" replace />;
  }
  return element;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/register" element={<RegisterRoute />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<RoleLayout />}>
          <Route path="/admin" element={<RoleRoute role="admin" element={<AdminDashboardPage />} />} />
          <Route path="/admin/chat" element={<RoleRoute role="admin" element={<AdminChatPage />} />} />
          <Route path="/admin/profile" element={<RoleRoute role="admin" element={<ProfilePage />} />} />
          <Route path="/sales" element={<RoleRoute role="sales" element={<SalesDashboardPage />} />} />
          <Route path="/sales/chat" element={<RoleRoute role="sales" element={<RoleChatPage role="sales" />} />} />
          <Route path="/sales/profile" element={<RoleRoute role="sales" element={<ProfilePage />} />} />
          <Route path="/customer" element={<RoleRoute role="customer" element={<CustomerDashboardPage />} />} />
          <Route
            path="/customer/chat"
            element={<RoleRoute role="customer" element={<RoleChatPage role="customer" />} />}
          />
          <Route path="/customer/profile" element={<RoleRoute role="customer" element={<ProfilePage />} />} />
          <Route path="/vendor" element={<RoleRoute role="vendor" element={<VendorDashboardPage />} />} />
          <Route path="/vendor/chat" element={<RoleRoute role="vendor" element={<RoleChatPage role="vendor" />} />} />
          <Route path="/vendor/profile" element={<RoleRoute role="vendor" element={<ProfilePage />} />} />
          <Route
            path="/electrician"
            element={<RoleRoute role="electrician" element={<ElectricianDashboardPage />} />}
          />
          <Route
            path="/electrician/chat"
            element={<RoleRoute role="electrician" element={<RoleChatPage role="electrician" />} />}
          />
          <Route
            path="/electrician/profile"
            element={<RoleRoute role="electrician" element={<ProfilePage />} />}
          />
          <Route
            path="/field_work"
            element={<RoleRoute role="field_work" element={<FieldWorkDashboardPage />} />}
          />
          <Route
            path="/field_work/chat"
            element={<RoleRoute role="field_work" element={<RoleChatPage role="field_work" />} />}
          />
          <Route
            path="/field_work/profile"
            element={<RoleRoute role="field_work" element={<ProfilePage />} />}
          />
          <Route path="/:role/chat" element={<RedirectToOwnChat />} />
        </Route>
      </Route>

      <Route path="*" element={<CatchAllRoute />} />
    </Routes>
  );
}
