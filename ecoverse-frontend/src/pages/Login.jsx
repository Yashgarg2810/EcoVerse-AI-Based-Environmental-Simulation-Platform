import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ email: formData.email, password: formData.password, rememberMe: formData.rememberMe });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-body-main text-body-main p-4 md:p-0">
      {/* Ambient Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Card */}
      <main className="w-full max-w-[1200px] min-h-[600px] md:h-[800px] bg-surface rounded-xl overflow-hidden flex flex-col md:flex-row shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-outline-variant/10">

        {/* Left: Illustration */}
        <section className="hidden md:flex relative md:w-1/2 bg-surface-container-low overflow-hidden items-center justify-center p-gutter">
          <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-primary/10 to-secondary/10" />
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-8 text-center">
              {/* Eco illustration SVG */}
              <div className="w-full flex items-center justify-center">
                <div className="relative w-72 h-72">
                  {/* Circular backdrop */}
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" style={{ animationDuration: '3s' }} />
                  <div className="absolute inset-4 rounded-full bg-primary/8" />
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-7xl active-icon">eco</span>
                    </div>
                  </div>
                  {/* Orbiting elements */}
                  {[
                    { icon: 'solar_power', angle: 0,   color: 'bg-secondary/10 text-secondary' },
                    { icon: 'park',        angle: 90,  color: 'bg-impact-positive/10 text-impact-positive' },
                    { icon: 'water_drop',  angle: 180, color: 'bg-data-teal/10 text-data-teal' },
                    { icon: 'recycling',   angle: 270, color: 'bg-impact-warning/10 text-impact-warning' },
                  ].map(({ icon, angle, color }) => {
                    const rad = (angle * Math.PI) / 180;
                    const r = 110;
                    const x = 50 + r * Math.cos(rad - Math.PI / 2);
                    const y = 50 + r * Math.sin(rad - Math.PI / 2);
                    return (
                      <div
                        key={icon}
                        className={`absolute w-12 h-12 rounded-full flex items-center justify-center shadow-soft ${color}`}
                        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
                      >
                        <span className="material-symbols-outlined text-xl">{icon}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <h2 className="font-section-h2 text-section-h2 text-primary tracking-tight">EcoVerse</h2>
                <p className="text-on-surface-variant max-w-sm mx-auto text-sm leading-relaxed">
                  Empowering environmental stewardship through precision digital twin simulations and advanced sustainability analytics.
                </p>
              </div>
              {/* Floating tags */}
              <div className="flex justify-center gap-2">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-label-caps font-label-caps">BIO-TECHNICAL</span>
                <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-label-caps font-label-caps">MINIMALIST</span>
              </div>
            </div>
          </div>
          {/* Status dot */}
          <div className="absolute bottom-8 left-8 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-impact-positive animate-pulse" />
            <span className="text-[11px] font-mono-data text-on-surface-variant uppercase tracking-tighter">System Operational</span>
          </div>
        </section>

        {/* Right: Login Form */}
        <section className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 md:p-16 lg:p-24 bg-surface">
          <div className="w-full max-w-md space-y-8">

            {/* Mobile brand */}
            <div className="md:hidden flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg active-icon">eco</span>
              </div>
              <span className="font-card-h3 text-card-h3 text-primary">EcoVerse</span>
            </div>

            {/* Header */}
            <div className="space-y-2">
              <h1 className="font-hero-h1-mobile text-hero-h1-mobile text-on-background">Welcome back</h1>
              <p className="text-on-surface-variant">Enter your credentials to access your sustainability dashboard.</p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-error-container rounded-xl text-on-error-container text-sm fade-in-up">
                <span className="material-symbols-outlined text-base active-icon">error</span>
                {error}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-[1px] flex-grow bg-outline-variant/30" />
              <span className="text-label-caps font-label-caps uppercase tracking-widest text-outline-variant">Sign in with email</span>
              <div className="h-[1px] flex-grow bg-outline-variant/30" />
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-label-caps font-label-caps text-on-surface-variant" htmlFor="login-email">
                  EMAIL ADDRESS
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 text-body-main focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-label-caps font-label-caps text-on-surface-variant" htmlFor="login-password">
                    PASSWORD
                  </label>
                  <button type="button" className="text-label-caps font-label-caps text-primary hover:text-primary-container transition-colors">
                    FORGOT PASSWORD?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3.5 pr-12 text-body-main focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20"
                />
                <label htmlFor="remember-me" className="text-body-main text-on-surface-variant select-none">
                  Remember me for 30 days
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary py-4 rounded-xl font-semibold shadow-lg hover:bg-primary-container hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </>
                )}
              </button>
            </form>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-on-surface-variant">
                Don't have an account?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline underline-offset-4 decoration-primary/30 transition-all">
                  Sign up
                </Link>
              </p>
            </div>

            {/* System status */}
            <div className="flex items-center gap-2 text-outline-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-impact-positive animate-pulse" />
              <span className="text-[11px] font-mono-data uppercase tracking-tighter">System Status: Operational v4.2.0</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
