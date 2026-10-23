import React, { useState } from 'react';
import {
  X,
  Lock,
  UserCheck,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Truck,
  MapPin,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { ZestoraLogo } from './ZestoraLogo.tsx';
import type { CustomerAccount } from '../types/admin.ts';

interface AccountPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminLogin?: () => void;
  onOpenOrdersTracking?: () => void;
  customer?: CustomerAccount | null;
  onCustomerLogin?: (customer: CustomerAccount, token?: string) => void;
  onCustomerLogout?: () => void;
}

export function AccountPreviewModal({
  isOpen,
  onClose,
  onOpenAdminLogin,
  onOpenOrdersTracking,
  customer,
  onCustomerLogin,
  onCustomerLogout,
}: AccountPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Forgot password states
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');

  // Profile edit states when logged in
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleDemoQuickSignIn = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'diya.kapoor@example.com',
          password: 'Customer@2026',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Demo sign-in failed.');
      } else if (data.customer && onCustomerLogin) {
        onCustomerLogin(data.customer, data.token);
        setSuccessMsg('Signed in as Diya Kapoor (Demo Customer Account).');
      }
    } catch {
      setErrorMsg('Unable to reach authentication server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Customer sign-in failed.');
      } else if (data.customer && onCustomerLogin) {
        onCustomerLogin(data.customer, data.token);
        setSuccessMsg('Welcome back to Zestora!');
      }
    } catch {
      setErrorMsg('Unable to connect to authentication server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          mobile,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Registration failed.');
      } else if (data.customer && onCustomerLogin) {
        onCustomerLogin(data.customer, data.token);
        setSuccessMsg('Your Zestora customer account is ready!');
      }
    } catch {
      setErrorMsg('Unable to connect to registration server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: forgotIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not generate verification OTP.');
      } else {
        setGeneratedOtp(data.demoResetOtp);
        setEnteredOtp(data.demoResetOtp || '');
        setSuccessMsg(`Verification OTP generated: ${data.demoResetOtp}`);
      }
    } catch {
      setErrorMsg('Network error while requesting password reset OTP.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/customers/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier,
          otp: enteredOtp,
          newPassword: newResetPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Password reset failed.');
      } else {
        setSuccessMsg(data.message || 'Password updated! Please sign in.');
        setGeneratedOtp(null);
        setActiveTab('login');
        setIdentifier(forgotIdentifier);
      }
    } catch {
      setErrorMsg('Network error while resetting password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('zestora_customer_token') || '';
      const res = await fetch('/api/customers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-customer-token': token } : {}),
        },
        body: JSON.stringify({
          fullName: editName,
          mobile: editMobile,
        }),
      });
      const data = await res.json();
      if (res.ok && data.customer && onCustomerLogin) {
        onCustomerLogin(data.customer);
        setEditingProfile(false);
        setSuccessMsg('Profile updated successfully.');
      } else {
        setErrorMsg(data.error || 'Could not update profile.');
      }
    } catch {
      setErrorMsg('Network error while updating profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <ZestoraLogo variant="icon-only" size="md" />
            <div>
              <h2 id="account-modal-title" className="text-base font-extrabold text-[#0A192F]">
                {customer ? 'My Zestora Account' : 'Customer Sign In & Registration'}
              </h2>
              <p className="text-xs text-slate-500">
                {customer
                  ? 'Manage profile, addresses & track live orders'
                  : 'Shop, save addresses & track parcels on Zestora'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account modal"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {customer ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-950 font-bold text-sm">
                    <UserCheck className="w-4 h-4 text-blue-600" />
                    <span>{customer.fullName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(customer.fullName);
                      setEditMobile(customer.mobile);
                      setEditingProfile((v) => !v);
                    }}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {editingProfile ? 'Cancel Edit' : 'Edit Profile'}
                  </button>
                </div>
                <p className="text-xs text-slate-600">Email: {customer.email}</p>
                <p className="text-xs text-slate-600">Mobile: {customer.mobile}</p>
                <p className="text-xs text-slate-600">
                  Saved Addresses: <strong>{customer.addresses?.length ?? 0}</strong> · Account Status:{' '}
                  <strong className="text-emerald-700">{customer.status}</strong>
                </p>
              </div>

              {editingProfile && (
                <form onSubmit={handleUpdateProfile} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <p className="text-xs font-bold text-slate-800">Update Customer Profile</p>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <input
                    type="tel"
                    required
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    placeholder="Mobile Number"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2 rounded-lg bg-blue-600 text-white font-bold text-xs"
                  >
                    Save Profile Changes
                  </button>
                </form>
              )}

              {/* Saved Addresses Preview */}
              {(customer.addresses?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    Saved Delivery Addresses
                  </p>
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {customer.addresses!.map((addr) => (
                      <div key={addr.id} className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{addr.recipientName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            {addr.label}
                          </span>
                        </div>
                        <p className="text-slate-600 truncate">
                          {addr.line1}, {addr.city} - {addr.postalCode}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {onOpenOrdersTracking && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrdersTracking();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Truck className="w-4 h-4" />
                  View My Orders & Live Parcel Tracking
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (onCustomerLogout) onCustomerLogout();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of Customer Account
              </button>
            </div>
          ) : (
            <>
              {/* 1-Click Demo Customer Login Banner */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-2">
                <div className="text-xs text-blue-950">
                  <p className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Instant Demo Customer Profile
                  </p>
                  <p className="text-[11px] text-blue-800">Diya Kapoor (Saved addresses + live order)</p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleDemoQuickSignIn}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 transition-colors"
                >
                  1-Click Sign In
                </button>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    activeTab === 'login' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    activeTab === 'register' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('forgot');
                    setErrorMsg(null);
                  }}
                  className={`py-2 text-xs font-bold rounded-lg transition-colors ${
                    activeTab === 'forgot' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Reset Password
                </button>
              </div>

              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email or Mobile Number
                    </label>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="diya.kapoor@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white font-bold text-xs transition-colors"
                  >
                    {submitting ? 'Signing In...' : 'Sign In to Zestora'}
                  </button>
                </form>
              ) : activeTab === 'register' ? (
                <form onSubmit={handleRegister} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Aarav Sharma"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="customer@example.com"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password (min 6 chars)
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white font-bold text-xs transition-colors"
                  >
                    {submitting ? 'Creating Account...' : 'Create Customer Account'}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  {!generatedOtp ? (
                    <form onSubmit={handleRequestOtp} className="space-y-3">
                      <p className="text-xs text-slate-600">
                        Enter your registered email or mobile number to receive a 6-digit password reset OTP.
                      </p>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="diya.kapoor@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                      >
                        <KeyRound className="w-4 h-4" />
                        Generate 6-Digit Reset OTP
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleConfirmResetPassword} className="space-y-3">
                      <input
                        type="text"
                        required
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        placeholder="6-Digit OTP"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-mono"
                      />
                      <input
                        type="password"
                        required
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        placeholder="New Password (min 6 chars)"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                      >
                        Verify OTP & Set New Password
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}

          {/* Dedicated Administrator Portal Entry */}
          {onOpenAdminLogin && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#0A192F]">Store Staff or Administrator?</p>
                <p className="text-[11px] text-slate-500">
                  Access the role-based Zestora Admin Dashboard
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdminLogin();
                }}
                className="px-3.5 py-2 rounded-lg bg-white hover:bg-blue-50 text-[#0066FF] border border-blue-200 font-bold text-xs transition-colors shrink-0 inline-flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Portal</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
