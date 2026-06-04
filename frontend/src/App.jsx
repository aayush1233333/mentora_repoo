import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CameraProvider } from "./context/CameraContext";
import { SessionProvider } from "./context/SessionContext";
import AppLayout from "./components/ui/AppLayout";
import LoadingScreen from "./components/ui/LoadingScreen";
import ErrorBoundary from "./components/ui/ErrorBoundary";

const Login          = lazy(() => import("./pages/Login"));
const Register       = lazy(() => import("./pages/Register"));
const Dashboard      = lazy(() => import("./pages/Dashboard"));
const Monitoring     = lazy(() => import("./pages/Monitoring"));
const Reports        = lazy(() => import("./pages/Reports"));
const Chatbot        = lazy(() => import("./pages/ChatbotPage"));
const Settings       = lazy(() => import("./pages/Settings"));
const SessionHistory = lazy(() => import("./pages/SessionHistory"));
const NotFound       = lazy(() => import("./pages/NotFound"));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <CameraProvider>
              <SessionProvider>
                <Suspense fallback={<LoadingScreen />}>
                  <Routes>
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={
                      <ProtectedRoute><AppLayout /></ProtectedRoute>
                    }>
                      <Route index                element={<Navigate to="/dashboard" replace />} />
                      <Route path="dashboard"     element={<Dashboard />} />
                      <Route path="monitoring"    element={<Monitoring />} />
                      <Route path="reports"       element={<Reports />} />
                      <Route path="chatbot"       element={<Chatbot />} />
                      <Route path="settings"      element={<Settings />} />
                      <Route path="history"       element={<SessionHistory />} />
                    </Route>
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </SessionProvider>
            </CameraProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
