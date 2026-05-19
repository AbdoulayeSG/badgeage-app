// src/App.jsx
// Main application router. Wraps everything in AuthProvider and react-hot-toast.
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Pages
import Login      from './pages/Login';
import Register   from './pages/Register';
import Dashboard  from './pages/Dashboard';
import Groups     from './pages/Groups';
import People     from './pages/People';
import Scanner    from './pages/Scanner';
import Calendar   from './pages/Calendar';
import Statistics from './pages/Statistics';
import Attendances from './pages/Attendances';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid #334155',
              borderRadius: '10px',
            },
          }}
        />

        <Routes>
          {/* Public routes */}
          <Route path="/login"    element={<Login />}    />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — wrapped in Layout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout><Dashboard /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/groups" element={
            <ProtectedRoute>
              <Layout><Groups /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/people" element={
            <ProtectedRoute>
              <Layout><People /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/scanner" element={
            <ProtectedRoute>
              <Layout><Scanner /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <Layout><Calendar /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/statistics" element={
            <ProtectedRoute>
              <Layout><Statistics /></Layout>
            </ProtectedRoute>
          } />
          <Route path="/attendances" element={
            <ProtectedRoute>
              <Layout><Attendances /></Layout>
            </ProtectedRoute>
          } />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
