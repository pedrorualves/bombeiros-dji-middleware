import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth-context";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrgsPage } from "./pages/OrgsPage";
import { DronesPage } from "./pages/DronesPage";
import { ArcGISConfigPage } from "./pages/ArcGISConfigPage";
import { SyncLogsPage } from "./pages/SyncLogsPage";
import { Layout } from "./components/Layout";

function ProtectedRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/orgs" element={<OrgsPage />} />
            <Route path="/drones" element={<DronesPage />} />
            <Route path="/arcgis" element={<ArcGISConfigPage />} />
            <Route path="/sync-logs" element={<SyncLogsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
