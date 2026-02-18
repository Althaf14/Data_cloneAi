import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AnalysisPage from './pages/AnalysisPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import IdentityLinkagePage from './pages/IdentityLinkagePage';
import { Loader2 } from 'lucide-react';

// Protected route — redirects to /login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="analysis" element={<AnalysisPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="linkage" element={<IdentityLinkagePage />} />
        <Route path="logs" element={<div className="p-8 text-center text-gray-500">Audit Logs Module — Coming Soon</div>} />
        <Route path="settings" element={<div className="p-8 text-center text-gray-500">System Settings — Coming Soon</div>} />
      </Route>
      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
