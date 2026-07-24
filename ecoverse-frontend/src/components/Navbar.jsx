import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* User avatar: shows initials derived from name */
function UserAvatar({ name, onClick }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-sm hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-primary/30"
      title={name}
    >
      {initials}
    </button>
  );
}

/* Shared NavLink class helper */
const navCls = ({ isActive }) =>
  isActive
    ? 'text-primary border-b-2 border-primary pb-1 font-body-main text-body-main transition-all duration-300'
    : 'text-on-surface-variant font-medium font-body-main text-body-main hover:text-primary transition-colors duration-200';

function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/');
  };

  return (
    <nav
      className="bg-surface/80 backdrop-blur-md shadow-sm sticky top-0 z-50 w-full h-16 transition-all duration-300"
      id="top-nav"
    >
      <div className="flex justify-between items-center w-full px-margin-desktop max-w-max-width mx-auto h-full">

        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="text-card-h3 font-card-h3 font-bold text-primary cursor-pointer hover:opacity-90 flex items-center gap-2"
        >
          <img 
            src="/jsl-logo.jpg" 
            alt="JSL Works Logo" 
            className="h-8 w-auto rounded-md object-contain border border-outline-variant/20 shadow-sm"
          />
          <span className="material-symbols-outlined text-primary active-icon">eco</span>
          EcoVerse
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <NavLink to="/"         className={navCls}>Home</NavLink>

          {/* Auth-protected nav links */}
          {isAuthenticated && (
            <>
              <NavLink to="/simulate" className={navCls}>Simulate</NavLink>
              <NavLink to="/analytics" className={navCls}>Analytics</NavLink>
              <NavLink to="/map"      className={navCls}>Map</NavLink>
              <NavLink to="/audit"   className={navCls}>Green Audit</NavLink>
              <NavLink to="/reports" className={navCls}>My Reports</NavLink>
            </>
          )}

          <NavLink to="/contact"  className={navCls}>Contact</NavLink>
        </div>

        {/* Right Panel */}
        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            /* ── Authenticated: avatar + dropdown ── */
            <div className="relative" ref={dropdownRef}>
              <UserAvatar
                name={user?.name}
                onClick={() => setDropdownOpen(v => !v)}
              />

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-surface rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-outline-variant overflow-hidden z-50 fade-in-up">
                  {/* User info */}
                  <div className="px-4 py-3 bg-surface-container-low border-b border-outline-variant">
                    <p className="font-semibold text-on-surface text-sm truncate">{user?.name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase tracking-wide">
                      {user?.role?.replace('_', ' ') || 'User'}
                    </span>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/audit'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">assignment</span>
                      New Audit
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/reports'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                      My Reports
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-outline-variant py-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-error-container/30 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Guest: Login / Sign Up buttons ── */
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/login')}
                className="text-primary font-semibold font-body-main text-body-main hover:underline transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="bg-primary text-on-primary px-6 py-2 rounded-xl font-label-caps text-label-caps hover:-translate-y-[2px] transition-transform duration-300 shadow-md cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
