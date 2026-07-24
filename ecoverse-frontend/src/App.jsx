import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import Home from './pages/Home';
import Simulate from './pages/Simulate';
import Analytics from './pages/Analytics';
import Map from './pages/Map';
import Login from './pages/Login';
import Register from './pages/Register';
import Contact from './pages/Contact';

// Protected pages
import GreenAuditForm from './pages/GreenAuditForm';
import GreenAuditReport from './pages/GreenAuditReport';
import MyReports from './pages/MyReports';

// Routes that should not show the shared Navbar / Footer
const AUTH_ROUTES = ['/login', '/register'];

function App() {
  const location = useLocation();
  const isMapPage  = location.pathname === '/map';
  const isAuthPage = AUTH_ROUTES.includes(location.pathname);

  return (
    <div className="bg-background min-h-screen flex flex-col justify-between">
      {!isAuthPage && <Navbar />}

      <div className={isAuthPage ? '' : 'flex-1'}>
        <Routes>
          {/* ── Public Routes ── */}
          <Route path="/"         element={<Home />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/contact"  element={<Contact />} />

          {/* ── Protected Routes ── */}
          <Route path="/simulate" element={
            <ProtectedRoute><Simulate /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute><Analytics /></ProtectedRoute>
          } />
          <Route path="/map" element={
            <ProtectedRoute><Map /></ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute><GreenAuditForm /></ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute><MyReports /></ProtectedRoute>
          } />
          <Route path="/reports/:id" element={
            <ProtectedRoute><GreenAuditReport /></ProtectedRoute>
          } />
        </Routes>
      </div>

      {!isAuthPage && !isMapPage && <Footer />}
    </div>
  );
}

export default App;