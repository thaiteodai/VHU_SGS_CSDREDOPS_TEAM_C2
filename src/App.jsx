import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import Layout from "./components/Layout.jsx";
import HomePage from "./pages/Home.jsx";
import LoginPage from "./pages/Login.jsx";
import RegisterPage from "./pages/Register.jsx";
import ForgotPasswordPage from "./pages/ForgotPassword.jsx";
import ResetPasswordPage from "./pages/ResetPassword.jsx";
import VerifyEmailPage from "./pages/VerifyEmail.jsx";
import TargetPage from "./pages/Target.jsx";
import ShamePage from "./pages/Shame.jsx";
import AuditPage from "./pages/Audit.jsx";
import SettingsPage from "./pages/Settings.jsx";
import AdminPage from "./pages/Admin.jsx";
import HelpPage from "./pages/Help.jsx";
import PrivacyPage from "./pages/Privacy.jsx";
import TermsPage from "./pages/Terms.jsx";
import FeedbackPage from "./pages/Feedback.jsx";
import CallbackPage from "./pages/Callback.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="page-loading">Warming up the panic room…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />
        <Route path="/target/:id" element={<Protected><TargetPage /></Protected>} />
        <Route path="/shame" element={<ShamePage />} />
        <Route path="/log" element={<AuditPage />} />
        <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
        <Route path="/admin" element={<AdminOnly><AdminPage /></AdminOnly>} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
