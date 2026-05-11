import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketContext";

import Welcome from "./pages/Welcome";
import OTPLogin from "./pages/OTPLogin";
import OwnerRegistration from "./pages/OwnerRegistration";
import AddVehicle from "./pages/AddVehicle";
import AddDriver from "./pages/AddDriver";
import TermsDeposit from "./pages/TermsDeposit";
import OwnerDashboard from "./pages/OwnerDashboard";
import VehicleDetail from "./pages/VehicleDetail";
import Vehicles from "./pages/Vehicles";
import CngFilled from "./pages/CngFilled";
import DriverLink from "./pages/DriverLink";
import Payment from "./pages/Payment";
import Alerts from "./pages/Alerts";
import MediaGallery from "./pages/MediaGallery";
import Settings from "./pages/Settings";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function ProtectedRoute({ children, allowedRole }) {
  const { isLoggedIn, role } = useAuth();
  if (!isLoggedIn) return <Navigate to="/" />;
  if (allowedRole && role !== allowedRole) {
    return <Navigate to={role === "driver" ? "/fill" : "/dashboard"} />;
  }
  return children;
}

function OwnerOnly({ children }) {
  return <ProtectedRoute allowedRole="owner">{children}</ProtectedRoute>;
}

function DriverOnly({ children }) {
  return <ProtectedRoute allowedRole="driver">{children}</ProtectedRoute>;
}

function AdminRoute({ children }) {
  const isAdmin = sessionStorage.getItem("cng_admin") === "true";
  if (!isAdmin) return <Navigate to="/admin-login" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login/:role" element={<OTPLogin />} />

      {/* Owner onboarding */}
      <Route path="/register" element={<OwnerOnly><OwnerRegistration /></OwnerOnly>} />
      <Route path="/add-vehicle" element={<OwnerOnly><AddVehicle /></OwnerOnly>} />
      <Route path="/add-driver" element={<OwnerOnly><AddDriver /></OwnerOnly>} />
      <Route path="/terms" element={<OwnerOnly><TermsDeposit /></OwnerOnly>} />

      {/* Owner dashboard */}
      <Route path="/dashboard" element={<OwnerOnly><OwnerDashboard /></OwnerOnly>} />
      <Route path="/vehicles" element={<OwnerOnly><Vehicles /></OwnerOnly>} />
      <Route path="/vehicle/:id" element={<OwnerOnly><VehicleDetail /></OwnerOnly>} />
      <Route path="/payment" element={<OwnerOnly><Payment /></OwnerOnly>} />
      <Route path="/alerts" element={<OwnerOnly><Alerts /></OwnerOnly>} />
      <Route path="/media" element={<OwnerOnly><MediaGallery /></OwnerOnly>} />
      <Route path="/settings" element={<OwnerOnly><Settings /></OwnerOnly>} />

      {/* Driver only */}
      <Route path="/driver-link" element={<DriverLink />} />
      <Route path="/fill" element={<DriverOnly><CngFilled /></DriverOnly>} />

      {/* Admin */}
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <WebSocketProvider>
        <AuthProvider>
          <LanguageProvider>
            <div className="max-w-lg mx-auto min-h-screen bg-primary relative">
              <AppRoutes />
            </div>
          </LanguageProvider>
        </AuthProvider>
      </WebSocketProvider>
    </BrowserRouter>
  );
}
