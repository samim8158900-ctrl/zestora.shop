import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  LogIn,
  AlertCircle,
  ShieldCheck,
  LayoutGrid,
  Sliders,
  KeyRound,
} from 'lucide-react';
import { ZestoraLogo } from './ZestoraLogo.tsx';
import { HeroStudioComposition } from './ProductIllustration.tsx';
import {
  validateAdminLoginForm,
  type AdminLoginValidationErrors,
} from '../utils/adminValidation.ts';
import type { AdminStaffUser } from '../types/admin.ts';

interface AdminLoginPageProps {
  onBackToStore: () => void;
  onLoginSuccess: (user: AdminStaffUser, token: string) => void;
  unauthorizedNotice?: string | null;
}

const SEEDED_ROLE_ACCOUNTS = [
  {
    label: 'Super Admin',
    identifier: 'admin@zestora.in',
    username: 'admin',
    password: 'ZestoraAdmin@2026',
    scope: 'Full Platform Access',
  },
  {
    label: 'Product Mgr',
    identifier: 'products@zestora.in',
    username: 'product_mgr',
    password: 'ProductMgr@2026',
    scope: 'Products, Pricing & Categories',
  },
  {
    label: 'Inventory Mgr',
    identifier: 'inventory@zestora.in',
    username: 'inventory_mgr',
    password: 'InventoryMgr@2026',
    scope: 'Stock & Low-Stock Alerts',
  },
  {
    label: 'Order Mgr',
    identifier: 'orders@zestora.in',
    username: 'order_mgr',
    password: 'OrderMgr@2026',
    scope: 'Orders & Customers',
  },
  {
    label: 'Content Mgr',
    identifier: 'content@zestora.in',
    username: 'content_mgr',
    password: 'ContentMgr@2026',
    scope: 'Storefront CMS & Banners',
  },
];

export function AdminLoginPage({
  onBackToStore,
  onLoginSuccess,
  unauthorizedNotice,
}: AdminLoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<AdminLoginValidationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    if (errors.identifier) {
      setErrors((prev) => ({ ...prev, identifier: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const handleQuickFill = (acc: (typeof SEEDED_ROLE_ACCOUNTS)[number]) => {
    setIdentifier(acc.identifier);
    setPassword(acc.password);
    setErrors({});
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const validation = validateAdminLoginForm({ identifier, password });
    setErrors(validation.errors);

    if (!validation.isValid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setServerError(
          data.error || 'Authentication failed. Please check your credentials and try again.'
        );
        return;
      }

      onLoginSuccess(data.user as AdminStaffUser, String(data.token));
    } catch {
      setServerError('Unable to reach the Zestora authentication server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#DDF0FF] via-[#EFF6FF] to-[#F8FAFC] text-[#0A192F] relative overflow-hidden">
      {/* Subtle Architectural Wave Curves */}
      <svg
        viewBox="0 0 1440 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-75"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-120 580C260 410 580 680 980 480C1220 360 1360 220 1560 170V800H-120V580Z"
          fill="#FFFFFF"
          fillOpacity="0.55"
        />
        <path
          d="M840 -60C1020 140 1160 320 1520 400V-60H840Z"
          fill="#BAE6FD"
          fillOpacity="0.35"
        />
      </svg>

      {/* Minimal Top Bar */}
      <header className="relative z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackToStore();
            }}
            className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] rounded-lg"
            aria-label="Zestora Home — Return to Storefront"
          >
            <ZestoraLogo variant="light" size="md" showTagline={true} />
          </a>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBackToStore();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-sm font-bold text-[#0A192F] hover:text-[#0066FF] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to Store</span>
          </a>
        </div>
      </header>

      {/* Main Split Dashboard Login Layout */}
      <main className="relative z-10 flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Branded Administration Portal Context */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0066FF] bg-[#0066FF]/10 px-4 py-1.5 rounded-full">
              <span>Zestora Management Portal</span>
            </div>

            <div className="space-y-2">
              <p className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-[1.12] text-[#0A192F]">
                Enterprise Catalog &
                <span className="block text-[#0066FF] mt-1">
                  Role-Based Admin Control
                </span>
              </p>
              <p className="text-sm sm:text-base text-slate-600 max-w-lg leading-relaxed pt-1">
                Sign in with your authorized Zestora staff account to manage products, pricing, inventory stock, categories, customer orders, and live storefront content.
              </p>
            </div>

            {/* 3 Clean Feature Highlights */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-white text-[#0066FF] shadow-xs border border-blue-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0A192F]">
                    Cryptographic Scrypt Hashing & HttpOnly Sessions
                  </h2>
                  <p className="text-xs text-slate-600">
                    Protected backend routes with zero plain-text password storage
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-white text-[#0066FF] shadow-xs border border-blue-100 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0A192F]">
                    5 Granular Administrative Roles
                  </h2>
                  <p className="text-xs text-slate-600">
                    Super Admin, Product, Inventory, Order, and Content Managers
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-white text-[#0066FF] shadow-xs border border-blue-100 flex items-center justify-center shrink-0">
                  <Sliders className="w-5 h-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#0A192F]">
                    Real-Time Storefront Synchronization
                  </h2>
                  <p className="text-xs text-slate-600">
                    Product edits, price updates, and stock changes reflect live on the store
                  </p>
                </div>
              </div>
            </div>

            {/* Studio Podium Visual on Desktop */}
            <div className="hidden lg:block pt-2 max-w-[460px]">
              <HeroStudioComposition slideIndex={0} />
            </div>
          </div>

          {/* Right Column: Administrator Login Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto lg:max-w-none">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 sm:p-9 space-y-5">
              {/* Card Brand Header */}
              <div className="flex flex-col items-center text-center space-y-2.5">
                <ZestoraLogo variant="light" size="lg" showTagline={true} />
                <div className="pt-1 space-y-1">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192F] tracking-tight">
                    Administrator Login
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Enter your administrator email or username to access the control panel.
                  </p>
                </div>
              </div>

              {/* Unauthorized Route Redirect Notice */}
              {unauthorizedNotice && !serverError && (
                <div
                  role="alert"
                  data-testid="admin-unauthorized-redirect-alert"
                  className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{unauthorizedNotice}</span>
                </div>
              )}

              {/* Validation Error Summary (if any) */}
              {(errors.identifier || errors.password) && (
                <div
                  role="alert"
                  data-testid="admin-validation-alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="font-bold">Please correct the highlighted fields:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-xs">
                      {errors.identifier && <li>{errors.identifier}</li>}
                      {errors.password && <li>{errors.password}</li>}
                    </ul>
                  </div>
                </div>
              )}

              {/* Backend Authentication Error */}
              {serverError && (
                <div
                  role="alert"
                  data-testid="admin-server-error-alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Field 1: Email or Administrator ID */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-identifier"
                    className="block text-xs sm:text-sm font-bold text-[#0A192F]"
                  >
                    Email or Administrator Username
                  </label>
                  <div className="relative flex items-center">
                    <Mail
                      className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => handleIdentifierChange(e.target.value)}
                      placeholder="admin@zestora.in or admin"
                      aria-invalid={Boolean(errors.identifier)}
                      aria-describedby={errors.identifier ? 'admin-identifier-error' : undefined}
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm text-[#0A192F] placeholder:text-slate-400 bg-slate-50/60 focus:bg-white transition-all focus:outline-none focus:ring-2 ${
                        errors.identifier
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-[#0066FF] focus:ring-[#0066FF]/20'
                      }`}
                    />
                  </div>
                  {errors.identifier && (
                    <p
                      id="admin-identifier-error"
                      className="text-xs font-semibold text-rose-600 pt-0.5"
                    >
                      {errors.identifier}
                    </p>
                  )}
                </div>

                {/* Field 2: Password with Visibility Toggle */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-password"
                    className="block text-xs sm:text-sm font-bold text-[#0A192F]"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock
                      className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="Enter your password"
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={errors.password ? 'admin-password-error' : undefined}
                      className={`w-full pl-11 pr-12 py-3 rounded-xl border text-sm text-[#0A192F] placeholder:text-slate-400 bg-slate-50/60 focus:bg-white transition-all focus:outline-none focus:ring-2 ${
                        errors.password
                          ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                          : 'border-slate-200 focus:border-[#0066FF] focus:ring-[#0066FF]/20'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword}
                      className="absolute right-2.5 p-1.5 rounded-lg text-slate-500 hover:text-[#0A192F] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#0066FF] transition-colors cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <Eye className="w-4 h-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p
                      id="admin-password-error"
                      className="text-xs font-semibold text-rose-600 pt-0.5"
                    >
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Sign In Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] active:bg-blue-800 disabled:opacity-60 text-white text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF]"
                >
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                </button>
              </form>

              {/* Seeded Role Accounts Quick-Fill Panel for Testing RBAC */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0A192F]">
                    <KeyRound className="w-3.5 h-3.5 text-[#0066FF]" aria-hidden="true" />
                    <span>Seeded RBAC Accounts (Click to Fill)</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">scrypt verified</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Initial Super Admin is seeded via <code>ADMIN_INITIAL_EMAIL</code> (<code>admin@zestora.in</code> / <code>admin</code>) &amp; <code>ADMIN_INITIAL_PASSWORD</code> (<code>ZestoraAdmin@2026</code>).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SEEDED_ROLE_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.username}
                      type="button"
                      onClick={() => handleQuickFill(acc)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-[#0066FF] text-[11px] font-bold text-[#0A192F] hover:text-[#0066FF] transition-colors cursor-pointer"
                      title={`${acc.identifier} — ${acc.scope}`}
                    >
                      Fill {acc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Footer Note */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Looking for the customer shopping storefront?{' '}
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      onBackToStore();
                    }}
                    className="font-bold text-[#0066FF] hover:underline focus-visible:outline-2 focus-visible:outline-[#0066FF] rounded"
                  >
                    Back to Store
                  </a>
                </p>
              </div>
            </div>

            {/* Bottom Back to Store Link */}
            <div className="mt-4 flex items-center justify-between px-1">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onBackToStore();
                }}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0066FF] hover:text-[#0052CC] transition-colors focus-visible:outline-2 focus-visible:outline-[#0066FF] rounded"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span>Back to Store</span>
              </a>
              <span className="text-xs text-slate-500">Zestora Admin Portal · Phase 4</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
