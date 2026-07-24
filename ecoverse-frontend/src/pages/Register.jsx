import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'administrator',        label: 'Administrator' },
  { value: 'sustainability_officer', label: 'Sustainability Officer' },
  { value: 'researcher',           label: 'Researcher' },
  { value: 'policymaker',         label: 'Policy Maker' },
];

export default function Register() {
  const navigate  = useNavigate();
  const { register } = useAuth();

  const [step, setStep] = useState(1); // Step 1: Account, Step 2: Campus Configuration

  const [formData, setFormData] = useState({
    // Step 1: Account details
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
    terms: false,

    // Step 2: Campus details
    collegeName: '',
    address: '',
    latitude: '29.8918',  // default Roorkee center for guidance
    longitude: '77.9601', // default Roorkee center
    totalArea: '',
    numBuildings: '',
    numStudents: ''
  });

  const [showPass, setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]          = useState('');
  const [loading, setLoading]      = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (error) setError('');
  };

  const handleNextStep = (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim() || !formData.email.trim() || !formData.role) {
      setError('Please fill in your name, email, and select your role.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!formData.terms) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Step 2 validations
    if (!formData.collegeName.trim() || !formData.address.trim() || !formData.totalArea || !formData.numBuildings) {
      setError('Please fill in all campus details (Name, Address, Area, Buildings).');
      return;
    }

    const latVal = parseFloat(formData.latitude);
    const lngVal = parseFloat(formData.longitude);
    if (isNaN(latVal) || isNaN(lngVal)) {
      setError('Please enter valid decimal values for Latitude and Longitude.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        collegeName: formData.collegeName,
        address: formData.address,
        latitude: latVal,
        longitude: lngVal,
        totalArea: parseFloat(formData.totalArea),
        numBuildings: parseInt(formData.numBuildings),
        numStudents: formData.numStudents ? parseInt(formData.numStudents) : null
      });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-surface font-body-main min-h-screen flex flex-col">
      {/* Background accents */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[30%] h-[30%] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 py-6 flex justify-center bg-background/30 backdrop-blur-sm border-b border-outline-variant/10">
        <Link to="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-3xl active-icon">eco</span>
          <span className="font-card-h3 text-card-h3 text-primary tracking-tight font-bold">EcoVerse</span>
        </Link>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center pt-28 pb-12 px-4 md:px-gutter relative z-10">
        <div className="w-full max-w-[520px] space-y-6">

          {/* Stepper Indicator */}
          <div className="flex items-center justify-center gap-8 text-xs font-bold uppercase tracking-wider text-outline mb-2">
            <div className={`flex items-center gap-2 ${step === 1 ? 'text-primary' : 'text-on-surface-variant'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-primary text-on-primary' : 'bg-surface-container-high'}`}>1</span>
              <span>Account Setup</span>
            </div>
            <div className="w-12 h-px bg-outline-variant/40" />
            <div className={`flex items-center gap-2 ${step === 2 ? 'text-primary' : 'text-on-surface-variant'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-primary text-on-primary' : 'bg-surface-container-high'}`}>2</span>
              <span>Campus Setup</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-surface rounded-xl shadow-soft p-8 md:p-10 border border-outline-variant/10">
            <div className="text-center mb-8">
              <h1 className="font-section-h2 text-section-h2 text-on-surface mb-2 font-bold">
                {step === 1 ? 'Create Account' : 'Campus Profile Setup'}
              </h1>
              <p className="text-on-surface-variant text-sm">
                {step === 1 
                  ? 'Join the global network of environmental precision.' 
                  : 'Configure your campus boundary, total area, and assets.'
                }
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-center gap-3 p-4 mb-6 bg-error-container text-on-error-container rounded-xl text-xs font-semibold fade-in-up">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            {step === 1 ? (
              /* ─── STEP 1 FORM ─── */
              <form onSubmit={handleNextStep} className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-name">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    Full Name
                  </label>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-email">
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    Institutional Email
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    placeholder="name@organization.edu"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-role">
                    <span className="material-symbols-outlined text-[16px]">work</span>
                    Your Role
                  </label>
                  <div className="relative">
                    <select
                      id="reg-role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm appearance-none focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all cursor-pointer font-semibold text-on-surface"
                    >
                      <option value="">Select your position</option>
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
                  </div>
                </div>

                {/* Password fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-password">
                      <span className="material-symbols-outlined text-[16px]">lock</span>
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        name="password"
                        type={showPass ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 pr-10 text-sm placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                      />
                      <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">{showPass ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-confirm">
                      <span className="material-symbols-outlined text-[16px]">verified_user</span>
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        id="reg-confirm"
                        name="confirmPassword"
                        type={showConfirm ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 pr-10 text-sm placeholder:text-outline focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                      />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[18px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3 pt-1">
                  <input
                    id="reg-terms"
                    name="terms"
                    type="checkbox"
                    required
                    checked={formData.terms}
                    onChange={handleChange}
                    className="w-4 h-4 mt-0.5 text-primary bg-surface-container-low border-outline-variant rounded focus:ring-primary/20 cursor-pointer"
                  />
                  <label htmlFor="reg-terms" className="text-xs text-on-surface-variant leading-tight cursor-pointer font-semibold">
                    I agree to the{' '}
                    <span className="text-primary hover:underline">Terms of Service</span>
                    {' '}and{' '}
                    <span className="text-primary hover:underline">Privacy Policy</span>.
                  </label>
                </div>

                {/* CTA */}
                <button
                  type="submit"
                  className="w-full bg-primary text-on-primary py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 group cursor-pointer hover:bg-primary/95 transition-all shadow-sm"
                >
                  Configure Campus Details
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </form>
            ) : (
              /* ─── STEP 2 FORM ─── */
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* College Name */}
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-college">
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                    College / University Name
                  </label>
                  <input
                    id="reg-college"
                    name="collegeName"
                    type="text"
                    required
                    placeholder="e.g. Roorkee Institute of Technology"
                    value={formData.collegeName}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-address">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    Campus Address
                  </label>
                  <input
                    id="reg-address"
                    name="address"
                    type="text"
                    required
                    placeholder="e.g. Roorkee, Uttarakhand, India"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Map Coordinates splits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-lat">
                      Latitude
                    </label>
                    <input
                      id="reg-lat"
                      name="latitude"
                      type="text"
                      required
                      placeholder="e.g. 29.8918"
                      value={formData.latitude}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-lng">
                      Longitude
                    </label>
                    <input
                      id="reg-lng"
                      name="longitude"
                      type="text"
                      required
                      placeholder="e.g. 77.9601"
                      value={formData.longitude}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all font-mono"
                    />
                  </div>
                </div>

                {/* Area and Buildings */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-area">
                      Total Area (Acres)
                    </label>
                    <input
                      id="reg-area"
                      name="totalArea"
                      type="number"
                      required
                      placeholder="e.g. 120"
                      value={formData.totalArea}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-buildings">
                      Buildings Count
                    </label>
                    <input
                      id="reg-buildings"
                      name="numBuildings"
                      type="number"
                      required
                      placeholder="e.g. 15"
                      value={formData.numBuildings}
                      onChange={handleChange}
                      className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Students (Optional) */}
                <div className="space-y-1.5">
                  <label className="font-label-caps text-[10px] text-on-surface-variant uppercase flex items-center gap-2 font-bold" htmlFor="reg-students">
                    Number of Students (Optional)
                  </label>
                  <input
                    id="reg-students"
                    name="numStudents"
                    type="number"
                    placeholder="e.g. 3500"
                    value={formData.numStudents}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Back and Submit */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-6 py-3.5 bg-surface-container text-on-surface rounded-xl font-bold text-xs hover:bg-surface-container-high transition cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary text-on-primary py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/95 transition-all shadow-md disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        Deploying Nodes...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm font-bold">verified</span>
                        Complete Registration
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-on-surface-variant text-body-main">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline ml-1">
                  Log in
                </Link>
              </p>
            </div>
          </div>

          {/* Security badge */}
          <div className="flex justify-between items-center px-4 opacity-40">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-mono-data text-[10px] uppercase tracking-widest text-on-surface-variant">System Status</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-impact-positive rounded-full" />
                  <span className="font-mono-data text-[11px] text-on-surface">ECV-SECURED-NODE</span>
                </div>
              </div>
            </div>
            <div className="h-[1px] flex-grow mx-6 bg-gradient-to-r from-transparent via-outline-variant to-transparent" />
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">encrypted</span>
              <span className="font-mono-data text-[11px] text-on-surface-variant uppercase">End-to-End Encryption</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 mt-auto border-t border-surface-container relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center px-gutter max-w-[1280px] mx-auto gap-3">
          <p className="text-[13px] text-on-surface-variant">© 2024 EcoVerse. Empowering environmental stewardship through precision.</p>
          <div className="flex gap-6">
            <span className="text-[13px] text-on-surface-variant hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
