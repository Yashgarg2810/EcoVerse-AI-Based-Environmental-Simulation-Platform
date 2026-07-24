import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — wraps routes that require authentication.
 * Redirects to /login if user is not authenticated, preserving the
 * intended destination so the user can be redirected back after login.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show nothing while restoring session from localStorage
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span
            className="material-symbols-outlined text-primary animate-spin text-5xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            progress_activity
          </span>
          <p className="text-on-surface-variant font-body-main text-body-main">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
