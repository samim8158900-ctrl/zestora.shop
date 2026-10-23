import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  MapPin,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  Tag,
  Plus,
  AlertCircle,
  Truck,
  ArrowRight,
  Lock,
  Sparkles,
  FileText,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import type { CartItem } from '../types/store.ts';
import type {
  AdminOrder,
  CouponCodeRecord,
  CustomerAccount,
  CustomerAddress,
  PaymentGatewaySettings,
  PaymentMethodType,
  UpiAppOption,
} from '../types/admin.ts';
import { formatINR } from '../utils/cartLogic.ts';
import {
  calculateServerOrderTotals,
  DEFAULT_COUPONS,
  DEFAULT_PAYMENT_SETTINGS,
  validateCodEligibility,
} from '../utils/checkoutAndOrderLogic.ts';
import { ProductArtwork } from './ProductIllustration.tsx';

interface CustomerCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customer: CustomerAccount | null;
  onCustomerAuthenticated: (customer: CustomerAccount, token?: string) => void;
  onCustomerUpdated: (customer: CustomerAccount) => void;
  coupons?: CouponCodeRecord[];
  paymentSettings?: PaymentGatewaySettings;
  onOrderCompleted: (order: AdminOrder) => void;
  onOpenTrackingForOrder: (order: AdminOrder) => void;
}

const UPI_APPS: { id: UpiAppOption; label: string; badge: string; accent: string }[] = [
  { id: 'Google Pay', label: 'Google Pay (GPay)', badge: 'Instant UPI Intent', accent: 'border-blue-600 bg-blue-50/70 text-blue-950' },
  { id: 'PhonePe', label: 'PhonePe UPI', badge: 'Fast Auto-Collect', accent: 'border-indigo-600 bg-indigo-50/70 text-indigo-950' },
  { id: 'CRED', label: 'CRED Pay UPI', badge: 'Assured Cashback', accent: 'border-slate-800 bg-slate-100 text-slate-950' },
  { id: 'BHIM', label: 'BHIM / Paytm UPI', badge: 'NPCI Verified', accent: 'border-emerald-600 bg-emerald-50/70 text-emerald-950' },
  { id: 'UPI ID', label: 'Enter Any UPI ID / Scan QR', badge: '@okaxis / @ybl / @icici', accent: 'border-sky-600 bg-sky-50/70 text-sky-950' },
];

export const CustomerCheckoutModal: React.FC<CustomerCheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  customer,
  onCustomerAuthenticated,
  onCustomerUpdated,
  coupons = DEFAULT_COUPONS,
  paymentSettings = DEFAULT_PAYMENT_SETTINGS,
  onOrderCompleted,
  onOpenTrackingForOrder,
}) => {
  // Inline Auth state if guest enters checkout
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  // Address selection & form state
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [addrRecipient, setAddrRecipient] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrCity, setAddrCity] = useState('Bengaluru');
  const [addrState, setAddrState] = useState('Karnataka');
  const [addrPin, setAddrPin] = useState('560038');
  const [addrDefault, setAddrDefault] = useState(true);
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  // Coupon & Payment state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('UPI');
  const [selectedUpiApp, setSelectedUpiApp] = useState<UpiAppOption>('Google Pay');
  const [customUpiId, setCustomUpiId] = useState('diya.kapoor@okicici');
  const [selectedCardChannel, setSelectedCardChannel] = useState<'Credit / Debit Card' | 'NetBanking' | 'Wallet'>('Credit / Debit Card');
  const [codConfirmed, setCodConfirmed] = useState(true);

  // Gateway & Order submission state
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingGatewaySession, setPendingGatewaySession] = useState<{
    order: AdminOrder;
    gatewayOrderId: string;
    amount: number;
    method: PaymentMethodType;
    providerDetail: string;
  } | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<AdminOrder | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Sync default address when customer changes
  useEffect(() => {
    if (customer) {
      const addrs = customer.addresses ?? [];
      if (addrs.length > 0) {
        const def = addrs.find((a) => a.isDefault) ?? addrs[0];
        setSelectedAddressId(def.id);
        setShowAddressForm(false);
      } else {
        setShowAddressForm(true);
        setAddrRecipient(customer.fullName);
        setAddrPhone(customer.mobile);
      }
    }
  }, [customer]);

  // Reset transient states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckoutError(null);
      setPendingGatewaySession(null);
      setCompletedOrder(null);
      setShowInvoiceModal(false);
    }
  }, [isOpen]);

  const selectedAddress: CustomerAddress | undefined = useMemo(() => {
    if (!customer?.addresses) return undefined;
    return customer.addresses.find((a) => a.id === selectedAddressId) ?? customer.addresses[0];
  }, [customer, selectedAddressId]);

  const pricing = useMemo(() => {
    return calculateServerOrderTotals(
      items.map((item) => ({
        price: item.product.price,
        regularPrice: item.product.originalPrice ?? item.product.price,
        quantity: item.quantity,
      })),
      {
        couponCode: appliedCouponCode || undefined,
        paymentMethod,
        coupons,
        settings: paymentSettings,
      }
    );
  }, [items, appliedCouponCode, paymentMethod, coupons, paymentSettings]);

  const codEligibility = useMemo(() => {
    const pin = selectedAddress?.postalCode ?? addrPin;
    return validateCodEligibility(
      pricing.itemsSellingSubtotal - pricing.couponDiscount,
      pin,
      paymentSettings
    );
  }, [pricing, selectedAddress, addrPin, paymentSettings]);

  if (!isOpen) return null;

  const handleQuickDemoCustomerLogin = async () => {
    setAuthError(null);
    setAuthBusy(true);
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
        setAuthError(data.error || 'Demo sign-in failed.');
      } else if (data.customer) {
        onCustomerAuthenticated(data.customer, data.token);
      }
    } catch {
      setAuthError('Network error while signing in.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await fetch('/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Invalid credentials.');
      } else if (data.customer) {
        onCustomerAuthenticated(data.customer, data.token);
      }
    } catch {
      setAuthError('Unable to reach authentication server.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleInlineRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthBusy(true);
    try {
      const res = await fetch('/api/customers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regName,
          email: regEmail,
          mobile: regMobile,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Registration failed.');
      } else if (data.customer) {
        onCustomerAuthenticated(data.customer, data.token);
      }
    } catch {
      setAuthError('Unable to reach registration server.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError(null);
    if (!/^[1-9][0-9]{5}$/.test(addrPin.trim())) {
      setAddrError('Please enter a valid 6-digit Indian PIN code (e.g., 560038).');
      return;
    }
    if (!addrRecipient.trim() || !addrPhone.trim() || !addrLine1.trim() || !addrCity.trim() || !addrState.trim()) {
      setAddrError('Please fill in all required address fields.');
      return;
    }

    setAddrBusy(true);
    try {
      const token = localStorage.getItem('zestora_customer_token') || '';
      const res = await fetch('/api/customers/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-customer-token': token } : {}),
        },
        body: JSON.stringify({
          label: addrLabel,
          recipientName: addrRecipient.trim(),
          phone: addrPhone.trim(),
          line1: addrLine1.trim(),
          line2: addrLine2.trim() || undefined,
          city: addrCity.trim(),
          state: addrState.trim(),
          postalCode: addrPin.trim(),
          isDefault: addrDefault,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddrError(data.error || 'Failed to save delivery address.');
      } else if (data.customer) {
        onCustomerUpdated(data.customer);
        const newest = data.customer.addresses?.[0];
        if (newest) {
          setSelectedAddressId(newest.id);
        }
        setShowAddressForm(false);
      }
    } catch {
      setAddrError('Network error while saving address.');
    } finally {
      setAddrBusy(false);
    }
  };

  const handleApplyCoupon = (codeToApply?: string) => {
    const target = (codeToApply ?? couponInput).trim().toUpperCase();
    setCouponInput(target);
    setAppliedCouponCode(target);
  };

  const handleInitiateOrder = async () => {
    setCheckoutError(null);
    if (!customer) {
      setCheckoutError('Please sign in or create a customer account in Step 1 to place your order.');
      return;
    }

    const activeAddr = selectedAddress;
    if (!activeAddr) {
      setCheckoutError('Please add or select a delivery address in Step 2.');
      return;
    }

    if (paymentMethod === 'COD') {
      if (!codEligibility.eligible) {
        setCheckoutError(codEligibility.reason || 'Cash on Delivery is not available for this order.');
        return;
      }
      if (!codConfirmed) {
        setCheckoutError('Please confirm the Cash on Delivery doorstep payment agreement.');
        return;
      }
    }

    if (paymentMethod === 'UPI' && selectedUpiApp === 'UPI ID' && !customUpiId.includes('@')) {
      setCheckoutError('Please enter a valid UPI ID containing "@" (e.g., name@okicici).');
      return;
    }

    const formattedShippingAddress = [
      activeAddr.line1,
      activeAddr.line2,
      `${activeAddr.city}, ${activeAddr.state} - ${activeAddr.postalCode}`,
    ]
      .filter(Boolean)
      .join(', ');

    const providerDetail =
      paymentMethod === 'COD'
        ? 'Cash on Delivery (Pay at Doorstep)'
        : paymentMethod === 'UPI'
        ? selectedUpiApp === 'UPI ID'
          ? `UPI ID (${customUpiId.trim()})`
          : `${selectedUpiApp} (UPI)`
        : `Online Gateway (${selectedCardChannel})`;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('zestora_customer_token') || '';
      const res = await fetch('/api/customers/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-customer-token': token } : {}),
        },
        body: JSON.stringify({
          customerName: activeAddr.recipientName || customer.fullName,
          customerEmail: customer.email,
          customerPhone: activeAddr.phone || customer.mobile,
          shippingAddress: formattedShippingAddress,
          shippingAddressStructured: activeAddr,
          couponCode: pricing.couponCode,
          paymentMethod,
          paymentProviderDetail: providerDetail,
          items: items.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            selectedVariant: item.selectedVariant,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || 'Could not create order. Please check item availability.');
        return;
      }

      const createdOrder: AdminOrder = data.order;

      if (paymentMethod === 'COD') {
        setCompletedOrder(createdOrder);
        onOrderCompleted(createdOrder);
      } else {
        setPendingGatewaySession({
          order: createdOrder,
          gatewayOrderId: data.paymentSession?.gatewayOrderId || `gw_${Date.now()}`,
          amount: createdOrder.totalAmount,
          method: paymentMethod,
          providerDetail,
        });
      }
    } catch {
      setCheckoutError('Network error while creating your order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteGatewayVerification = async (
    outcome: 'success' | 'failed' | 'cancelled'
  ) => {
    if (!pendingGatewaySession) return;
    setVerifyingPayment(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: pendingGatewaySession.order.id,
          gatewayOrderId: pendingGatewaySession.gatewayOrderId,
          outcome,
          upiId:
            pendingGatewaySession.method === 'UPI' && selectedUpiApp === 'UPI ID'
              ? customUpiId.trim()
              : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCheckoutError(data.error || 'Payment verification failed.');
        return;
      }
      setPendingGatewaySession(null);
      setCompletedOrder(data.order);
      onOrderCompleted(data.order);
    } catch {
      setCheckoutError('Network error while verifying payment status.');
    } finally {
      setVerifyingPayment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zestora-checkout-title"
    >
      <div className="relative w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Checkout Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg shadow-xs">
              Z
            </div>
            <div>
              <h2 id="zestora-checkout-title" className="text-base sm:text-lg font-extrabold tracking-tight">
                {completedOrder
                  ? `Order Summary & Confirmation — ${completedOrder.orderNumber}`
                  : 'Zestora Secure Checkout'}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                256-Bit Encrypted · Server-Verified Pricing · Instant UPI, Cards & Cash on Delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50">
          {/* STATE A: ORDER CONFIRMATION VIEW */}
          {completedOrder ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <div
                className={`p-6 rounded-2xl border ${
                  completedOrder.paymentStatus === 'Payment Failed' ||
                  completedOrder.paymentStatus === 'Payment Cancelled'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50/90 border-emerald-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    {completedOrder.paymentStatus === 'Payment Failed' ||
                    completedOrder.paymentStatus === 'Payment Cancelled' ? (
                      <AlertCircle className="w-9 h-9 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-9 h-9 text-emerald-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                        {completedOrder.paymentStatus === 'Payment Failed' ||
                        completedOrder.paymentStatus === 'Payment Cancelled'
                          ? 'Order Saved — Payment Retry Available'
                          : 'Order Confirmed & Inventory Reserved'}
                      </span>
                      <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                        Order ID: {completedOrder.orderNumber}
                      </h3>
                      <p className="text-xs text-slate-600 mt-1">
                        Placed on {new Date(completedOrder.createdAt).toLocaleString('en-IN')} ·
                        Estimated Delivery:{' '}
                        <strong className="text-slate-900">
                          {completedOrder.estimatedDeliveryDate || 'Within 3–4 Business Days'}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenTrackingForOrder(completedOrder)}
                      className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Truck className="w-4 h-4" />
                      Track Order Live
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInvoiceModal(true)}
                      className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      GST Tax Invoice
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Delivery Address & Recipient
                  </p>
                  <p className="text-sm font-bold text-slate-900">{completedOrder.customerName}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {completedOrder.shippingAddress}
                  </p>
                  <p className="text-xs font-medium text-slate-700">
                    Phone: {completedOrder.customerPhone} · Email: {completedOrder.customerEmail}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Payment & Shipment Summary
                  </p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Payment Method:</span>
                    <span className="font-bold text-slate-900">
                      {completedOrder.paymentProviderDetail || completedOrder.paymentMethod}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Payment Status:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md ${
                        completedOrder.paymentStatus === 'Verified Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : completedOrder.paymentStatus.includes('Failed') ||
                            completedOrder.paymentStatus.includes('Cancelled')
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {completedOrder.paymentStatus}
                    </span>
                  </div>
                  {completedOrder.transactionReference && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Transaction Ref:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {completedOrder.transactionReference}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tracking ID:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {completedOrder.trackingNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ordered Items & Price Breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Items Ordered ({completedOrder.items.length})
                  </h4>
                  <span className="text-xs font-bold text-slate-900 tabular-nums">
                    Total Payable: {formatINR(completedOrder.totalAmount)}
                  </span>
                </div>
                <div className="divide-y divide-slate-100">
                  {completedOrder.items.map((item, idx) => (
                    <div key={`${item.productId}-${idx}`} className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.productName}</p>
                        <p className="text-xs text-slate-500">
                          SKU: {item.sku} · Qty: {item.quantity} × {formatINR(item.unitPrice)}
                          {item.selectedVariant ? ` · Variant: ${item.selectedVariant}` : ''}
                        </p>
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                        {formatINR(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Printable GST Tax Invoice Modal */}
              {showInvoiceModal && (
                <div className="bg-white p-6 rounded-2xl border-2 border-slate-800 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
                        Zestora Retail Pvt. Ltd. — Official Tax Invoice
                      </p>
                      <h4 className="text-base font-extrabold text-slate-900">
                        Invoice #{completedOrder.orderNumber.replace('ORD', 'INV')}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                    >
                      Print / Save PDF
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
                    <div>
                      <p className="font-bold text-slate-900">Billed & Shipped To:</p>
                      <p>{completedOrder.customerName}</p>
                      <p>{completedOrder.shippingAddress}</p>
                      <p>Phone: {completedOrder.customerPhone}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">GSTIN: 29AAACZ2026K1Z5</p>
                      <p>Order Ref: {completedOrder.orderNumber}</p>
                      <p>Date: {new Date(completedOrder.createdAt).toLocaleDateString('en-IN')}</p>
                      <p>Payment: {completedOrder.paymentStatus}</p>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span>Items Selling Subtotal:</span>
                      <span className="font-bold tabular-nums">
                        {formatINR(completedOrder.itemsSubtotal ?? completedOrder.totalAmount)}
                      </span>
                    </div>
                    {(completedOrder.couponDiscount ?? 0) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Coupon Discount ({completedOrder.couponCode}):</span>
                        <span className="font-bold tabular-nums">
                          -{formatINR(completedOrder.couponDiscount ?? 0)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Delivery & Handling Charges:</span>
                      <span className="font-bold tabular-nums">
                        {formatINR((completedOrder.deliveryFee ?? 0) + (completedOrder.codFee ?? 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Included IGST / CGST+SGST (12%):</span>
                      <span className="tabular-nums">
                        {formatINR(completedOrder.includedGstAmount ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                      <span>Grand Total:</span>
                      <span className="tabular-nums">{formatINR(completedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                >
                  Continue Shopping on Zestora
                </button>
              </div>
            </div>
          ) : pendingGatewaySession ? (
            /* STATE B: ONLINE / UPI PAYMENT GATEWAY AUTHORIZATION WINDOW */
            <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-lg p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
                    Zestora Verified Payment Gateway
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Authorize {pendingGatewaySession.providerDetail}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order Ref: <strong>{pendingGatewaySession.order.orderNumber}</strong> · Session:{' '}
                    <span className="font-mono">{pendingGatewaySession.gatewayOrderId}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Payable Amount</p>
                  <p className="text-xl font-extrabold text-slate-900 tabular-nums">
                    {formatINR(pendingGatewaySession.amount)}
                  </p>
                </div>
              </div>

              {pendingGatewaySession.method === 'UPI' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                  {/* Scannable SVG QR Code */}
                  <div className="w-28 h-28 bg-white p-2 rounded-xl border border-slate-300 shrink-0 flex flex-col items-center justify-center">
                    <QrCode className="w-20 h-20 text-slate-900" />
                    <span className="text-[9px] font-bold text-slate-500 mt-0.5">SCAN WITH ANY UPI</span>
                  </div>
                  <div className="space-y-1.5 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-900">
                      Pay via {pendingGatewaySession.providerDetail}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Merchant VPA: <strong className="font-mono text-slate-900">zestora.retail@icici</strong>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Approve the collect request in your UPI app or select an authorization outcome below to verify server callback handling.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={verifyingPayment}
                  onClick={() => handleCompleteGatewayVerification('success')}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {verifyingPayment
                    ? 'Verifying Payment Signature...'
                    : `Authorize Payment of ${formatINR(pendingGatewaySession.amount)} (Verified Paid)`}
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={verifyingPayment}
                    onClick={() => handleCompleteGatewayVerification('failed')}
                    className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
                  >
                    Simulate Payment Failure
                  </button>
                  <button
                    type="button"
                    disabled={verifyingPayment}
                    onClick={() => handleCompleteGatewayVerification('cancelled')}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold text-xs transition-colors"
                  >
                    Cancel Payment Window
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STATE C: MAIN 4-STEP CHECKOUT FLOW */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Columns: Steps 1, 2, 4 */}
              <div className="lg:col-span-7 space-y-5">
                {/* STEP 1: CUSTOMER ACCOUNT */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                        1
                      </span>
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                        Customer Account
                      </h3>
                    </div>
                    {customer && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Signed In
                      </span>
                    )}
                  </div>

                  {customer ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{customer.fullName}</p>
                        <p className="text-slate-600">
                          {customer.email} · {customer.mobile}
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Order updates & GST invoice will be sent to your account
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs text-blue-950 font-medium">
                          Sign in to your Zestora Customer Account or use our 1-click Demo Customer profile:
                        </p>
                        <button
                          type="button"
                          disabled={authBusy}
                          onClick={handleQuickDemoCustomerLogin}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 transition-colors"
                        >
                          1-Click Demo Customer Login
                        </button>
                      </div>

                      <div className="flex gap-2 border-b border-slate-200 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('login');
                            setAuthError(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            authMode === 'login'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Existing Customer Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('register');
                            setAuthError(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                            authMode === 'register'
                              ? 'bg-slate-900 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          New Customer Registration
                        </button>
                      </div>

                      {authError && (
                        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                          {authError}
                        </div>
                      )}

                      {authMode === 'login' ? (
                        <form onSubmit={handleInlineLogin} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            required
                            placeholder="Email or Mobile"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                          <input
                            type="password"
                            required
                            placeholder="Password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={authBusy}
                            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                          >
                            {authBusy ? 'Signing In...' : 'Sign In & Continue'}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleInlineRegister} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <input
                            type="text"
                            required
                            placeholder="Full Name"
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                          <input
                            type="email"
                            required
                            placeholder="Email Address"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                          <input
                            type="tel"
                            required
                            placeholder="Mobile (+91 98765 43210)"
                            value={regMobile}
                            onChange={(e) => setRegMobile(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                          <input
                            type="password"
                            required
                            placeholder="Password (min 6 chars)"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                          />
                          <button
                            type="submit"
                            disabled={authBusy}
                            className="sm:col-span-2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                          >
                            {authBusy ? 'Creating Account...' : 'Create Customer Account & Continue'}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </section>

                {/* STEP 2: DELIVERY ADDRESS */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                        2
                      </span>
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                        Delivery Address
                      </h3>
                    </div>
                    {customer && !showAddressForm && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddrRecipient(customer.fullName);
                          setAddrPhone(customer.mobile);
                          setAddrLine1('');
                          setAddrLine2('');
                          setShowAddressForm(true);
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add New Address
                      </button>
                    )}
                  </div>

                  {customer && (customer.addresses?.length ?? 0) > 0 && !showAddressForm && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {customer.addresses!.map((addr) => {
                        const isSelected = addr.id === (selectedAddress?.id ?? '');
                        return (
                          <label
                            key={addr.id}
                            className={`cursor-pointer p-3.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name="deliveryAddress"
                              checked={isSelected}
                              onChange={() => setSelectedAddressId(addr.id)}
                              className="mt-1"
                            />
                            <div className="text-xs space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">{addr.recipientName}</span>
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                                  {addr.label}
                                </span>
                              </div>
                              <p className="text-slate-600 leading-snug">
                                {addr.line1}
                                {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}, {addr.state} -{' '}
                                <strong>{addr.postalCode}</strong>
                              </p>
                              <p className="text-slate-500 font-medium">Phone: {addr.phone}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {(showAddressForm || (customer && (customer.addresses?.length ?? 0) === 0)) && (
                    <form onSubmit={handleSaveAddress} className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          New Delivery Address
                        </h4>
                        {(customer?.addresses?.length ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAddressForm(false)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      {addrError && (
                        <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                          {addrError}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <input
                          type="text"
                          required
                          placeholder="Recipient Full Name"
                          value={addrRecipient}
                          onChange={(e) => setAddrRecipient(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <input
                          type="tel"
                          required
                          placeholder="10-Digit Mobile Number"
                          value={addrPhone}
                          onChange={(e) => setAddrPhone(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <input
                          type="text"
                          required
                          placeholder="Flat / House No., Building, Street"
                          value={addrLine1}
                          onChange={(e) => setAddrLine1(e.target.value)}
                          className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <input
                          type="text"
                          placeholder="Area, Colony, Landmark (Optional)"
                          value={addrLine2}
                          onChange={(e) => setAddrLine2(e.target.value)}
                          className="sm:col-span-2 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <input
                          type="text"
                          required
                          placeholder="City / District"
                          value={addrCity}
                          onChange={(e) => setAddrCity(e.target.value)}
                          className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="State"
                            value={addrState}
                            onChange={(e) => setAddrState(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs"
                          />
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="PIN Code (6 digits)"
                            value={addrPin}
                            onChange={(e) => setAddrPin(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setAddrLabel(lbl)}
                              className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                                addrLabel === lbl
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-700 border-slate-300'
                              }`}
                            >
                              {lbl}
                            </button>
                          ))}
                        </div>
                        <button
                          type="submit"
                          disabled={addrBusy}
                          className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                        >
                          {addrBusy ? 'Saving...' : 'Save & Deliver Here'}
                        </button>
                      </div>
                    </form>
                  )}
                </section>

                {/* STEP 4: PAYMENT METHOD (UPI APPS, ONLINE GATEWAY, CASH ON DELIVERY) */}
                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-extrabold flex items-center justify-center">
                      3
                    </span>
                    <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900">
                      Select Payment Method
                    </h3>
                  </div>

                  {/* Method Tabs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        paymentMethod === 'UPI'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Smartphone className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">UPI Apps & QR</p>
                        <p className="text-[10px] text-slate-500">GPay, PhonePe, CRED, BHIM</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CARD_NETBANKING')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        paymentMethod === 'CARD_NETBANKING'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Cards & Banking</p>
                        <p className="text-[10px] text-slate-500">Visa, MasterCard, NetBanking</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        paymentMethod === 'COD'
                          ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Banknote className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-extrabold text-slate-900">Cash on Delivery</p>
                        <p className="text-[10px] text-slate-500">Pay at Doorstep (+₹{paymentSettings.codFee})</p>
                      </div>
                    </button>
                  </div>

                  {/* Method Detail Area */}
                  {paymentMethod === 'UPI' && (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs font-semibold text-slate-600">
                        Choose your preferred UPI App or enter a UPI ID:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {UPI_APPS.map((app) => {
                          const active = selectedUpiApp === app.id;
                          return (
                            <button
                              key={app.id}
                              type="button"
                              onClick={() => setSelectedUpiApp(app.id)}
                              className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                active
                                  ? `${app.accent} ring-1 ring-blue-600`
                                  : 'border-slate-200 hover:border-slate-300 bg-white'
                              }`}
                            >
                              <div>
                                <p className="text-xs font-bold text-slate-900">{app.label}</p>
                                <p className="text-[10px] text-slate-500">{app.badge}</p>
                              </div>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  active ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                }`}
                              >
                                {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {selectedUpiApp === 'UPI ID' && (
                        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                          <label className="block text-xs font-bold text-slate-700">
                            Enter Your Virtual Payment Address (UPI ID)
                          </label>
                          <input
                            type="text"
                            value={customUpiId}
                            onChange={(e) => setCustomUpiId(e.target.value)}
                            placeholder="yourname@okicici or 9876543210@ybl"
                            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {paymentMethod === 'CARD_NETBANKING' && (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-3 gap-2">
                        {(['Credit / Debit Card', 'NetBanking', 'Wallet'] as const).map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setSelectedCardChannel(ch)}
                            className={`py-2.5 px-3 rounded-xl border text-xs font-bold ${
                              selectedCardChannel === ch
                                ? 'border-indigo-600 bg-indigo-50 text-indigo-950'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        You will be directed to the Zestora Payment Verification Gateway to authorize{' '}
                        <strong>{formatINR(pricing.payableTotal)}</strong> via {selectedCardChannel}.
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'COD' && (
                    <div className="space-y-3 pt-1">
                      {!codEligibility.eligible ? (
                        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {codEligibility.reason}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950">
                              Cash on Delivery Available for PIN {selectedAddress?.postalCode || addrPin}
                            </span>
                            <span className="text-xs font-extrabold text-emerald-800">
                              +₹{paymentSettings.codFee} Handling Fee
                            </span>
                          </div>
                          <p className="text-xs text-emerald-900">
                            Pay <strong>{formatINR(pricing.payableTotal)}</strong> in Cash or via doorstep UPI QR when our courier partner delivers your parcel.
                          </p>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer pt-1">
                            <input
                              type="checkbox"
                              checked={codConfirmed}
                              onChange={(e) => setCodConfirmed(e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            I confirm this order and agree to pay {formatINR(pricing.payableTotal)} upon delivery.
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </section>
              </div>

              {/* Right 5 Columns: Order Summary, Coupon & Price Breakdown */}
              <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
                <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
                    Order Summary ({items.reduce((acc, i) => acc + i.quantity, 0)} Items)
                  </h3>

                  {/* Compact Item List */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 pr-1">
                    {items.map((item) => (
                      <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {item.product.primaryImageUrl ? (
                              <img
                                src={item.product.primaryImageUrl}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <ProductArtwork artwork={item.product.artwork} className="w-8 h-8" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.product.name}</p>
                            <p className="text-[11px] text-slate-500">
                              Qty: {item.quantity} × {formatINR(item.product.price)}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-extrabold text-slate-900 tabular-nums shrink-0">
                          {formatINR(item.product.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Box */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      Promo / Coupon Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter e.g. ZESTORA10"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono uppercase"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCoupon()}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0"
                      >
                        Apply
                      </button>
                    </div>

                    {/* Available Coupons Quick-Select */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {coupons.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleApplyCoupon(c.code)}
                          className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold border transition-colors ${
                            pricing.couponCode === c.code
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {c.code}
                        </button>
                      ))}
                    </div>

                    {pricing.couponError && (
                      <p className="text-[11px] text-rose-600 font-medium">{pricing.couponError}</p>
                    )}
                    {pricing.couponCode && (
                      <p className="text-[11px] text-emerald-700 font-bold">
                        Coupon {pricing.couponCode} applied! You saved {formatINR(pricing.couponDiscount)}.
                      </p>
                    )}
                  </div>

                  {/* Server-Grade Price Details */}
                  <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total MRP:</span>
                      <span className="tabular-nums">{formatINR(pricing.itemsMrpTotal)}</span>
                    </div>
                    {pricing.productDiscountTotal > 0 && (
                      <div className="flex justify-between text-emerald-700 font-medium">
                        <span>Product Discount on MRP:</span>
                        <span className="tabular-nums">-{formatINR(pricing.productDiscountTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700 font-semibold">
                      <span>Selling Price Subtotal:</span>
                      <span className="tabular-nums">{formatINR(pricing.itemsSellingSubtotal)}</span>
                    </div>
                    {pricing.couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Coupon Discount ({pricing.couponCode}):</span>
                        <span className="tabular-nums">-{formatINR(pricing.couponDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Delivery Charges:</span>
                      <span className="tabular-nums font-semibold">
                        {pricing.deliveryFee === 0 ? (
                          <span className="text-emerald-700 font-bold">FREE</span>
                        ) : (
                          formatINR(pricing.deliveryFee)
                        )}
                      </span>
                    </div>
                    {pricing.codFee > 0 && (
                      <div className="flex justify-between text-amber-800 font-medium">
                        <span>Cash on Delivery Handling Fee:</span>
                        <span className="tabular-nums">+{formatINR(pricing.codFee)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Included GST (12%):</span>
                      <span className="tabular-nums">{formatINR(pricing.includedGstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-200 pt-2.5">
                      <span>Total Payable:</span>
                      <span className="tabular-nums text-blue-700">{formatINR(pricing.payableTotal)}</span>
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={submitting || items.length === 0}
                    onClick={handleInitiateOrder}
                    className="w-full py-3.5 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing Order...
                      </>
                    ) : paymentMethod === 'COD' ? (
                      <>
                        Place Cash on Delivery Order ({formatINR(pricing.payableTotal)})
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Proceed to Pay {formatINR(pricing.payableTotal)} via{' '}
                        {paymentMethod === 'UPI' ? selectedUpiApp : selectedCardChannel}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
