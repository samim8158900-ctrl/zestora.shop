import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Truck,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  RotateCcw,
  Ban,
  FileText,
  RefreshCw,
  MapPin,
  CreditCard,
  Bell,
} from 'lucide-react';
import type { AdminOrder, CustomerAccount, CustomerNotification } from '../types/admin.ts';
import { formatINR } from '../utils/cartLogic.ts';
import {
  buildTrackingTimelineSteps,
  canCustomerCancelOrder,
  canCustomerRequestReturn,
} from '../utils/checkoutAndOrderLogic.ts';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerAccount | null;
  initialSelectedOrder?: AdminOrder | null;
  notifications?: CustomerNotification[];
  onOrderUpdated?: () => void;
}

export const CustomerOrdersModal: React.FC<CustomerOrdersModalProps> = ({
  isOpen,
  onClose,
  customer,
  initialSelectedOrder = null,
  notifications = [],
  onOrderUpdated,
}) => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(initialSelectedOrder);
  const [lookupInput, setLookupInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'tracking' | 'notifications'>('tracking');

  // Cancel & Return form states
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('Ordered by mistake / Found better price');
  const [showReturnPrompt, setShowReturnPrompt] = useState(false);
  const [returnType, setReturnType] = useState<'Return & Refund' | 'Replacement'>('Return & Refund');
  const [returnReason, setReturnReason] = useState('Received defective or damaged item');
  const [showInvoiceView, setShowInvoiceView] = useState(false);

  const fetchCustomerOrders = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = localStorage.getItem('zestora_customer_token') || '';
      const emailParam = customer?.email ? `?email=${encodeURIComponent(customer.email)}` : '';
      const res = await fetch(`/api/customers/orders${emailParam}`, {
        headers: token ? { 'x-customer-token': token } : {},
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.orders)) {
        setOrders(data.orders);
        if (initialSelectedOrder) {
          const fresh = data.orders.find((o: AdminOrder) => o.id === initialSelectedOrder.id);
          setSelectedOrder(fresh || initialSelectedOrder);
        } else if (data.orders.length > 0 && !selectedOrder) {
          setSelectedOrder(data.orders[0]);
        }
      }
    } catch {
      setErrorMsg('Unable to load order history right now.');
    } finally {
      setLoading(false);
    }
  }, [customer, initialSelectedOrder, selectedOrder]);

  useEffect(() => {
    if (isOpen) {
      if (initialSelectedOrder) {
        setSelectedOrder(initialSelectedOrder);
      }
      fetchCustomerOrders();
    }
  }, [isOpen, initialSelectedOrder, fetchCustomerOrders]);

  if (!isOpen) return null;

  const handleLookupOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupInput.trim();
    if (!clean) return;
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/customers/orders/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || `No order found with ID "${clean}". Try ZST-ORD-1001.`);
      } else if (data.order) {
        setSelectedOrder(data.order);
        if (!orders.some((o) => o.id === data.order.id)) {
          setOrders((prev) => [data.order, ...prev]);
        }
      }
    } catch {
      setErrorMsg('Network error while looking up order.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/customers/orders/${selectedOrder.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not cancel order.');
      } else if (data.order) {
        setSelectedOrder(data.order);
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
        setShowCancelPrompt(false);
        setSuccessMsg(`Order ${data.order.orderNumber} has been cancelled and reserved stock restored.`);
        onOrderUpdated?.();
      }
    } catch {
      setErrorMsg('Network error while cancelling order.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRequestReturn = async () => {
    if (!selectedOrder) return;
    setActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/customers/orders/${selectedOrder.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: returnType, reason: returnReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not submit return request.');
      } else if (data.order) {
        setSelectedOrder(data.order);
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
        setShowReturnPrompt(false);
        setSuccessMsg(`${returnType} request registered for ${data.order.orderNumber}.`);
        onOrderUpdated?.();
      }
    } catch {
      setErrorMsg('Network error while requesting return.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRetryPayment = async () => {
    if (!selectedOrder) return;
    setActionBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          outcome: 'success',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Payment retry failed.');
      } else if (data.order) {
        setSelectedOrder(data.order);
        setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
        setSuccessMsg(
          `Payment verified (Ref: ${data.transactionReference})! Order ${data.order.orderNumber} is now Confirmed.`
        );
        onOrderUpdated?.();
      }
    } catch {
      setErrorMsg('Network error while retrying payment.');
    } finally {
      setActionBusy(false);
    }
  };

  const timelineSteps = selectedOrder ? buildTrackingTimelineSteps(selectedOrder) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="zestora-orders-tracking-title"
    >
      <div className="relative w-full max-w-6xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="zestora-orders-tracking-title" className="text-base sm:text-lg font-extrabold tracking-tight">
                My Orders & Live Parcel Tracking
              </h2>
              <p className="text-xs text-slate-300">
                Real-Time 8-Stage Shipment Timeline · Tax Invoices · Self-Service Cancellation & Returns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('tracking')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSubTab === 'tracking'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Orders & Tracking ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('notifications')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeSubTab === 'notifications'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Alerts ({notifications.length})
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close orders and tracking modal"
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50">
          {activeSubTab === 'notifications' ? (
            <div className="max-w-3xl mx-auto space-y-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
                Order, Payment & Shipment Notifications
              </h3>
              {notifications.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                  No notifications yet. Place an order or sign in to view real-time updates.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="bg-white rounded-xl border border-slate-200 p-4 flex items-start justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                        {n.type}
                      </span>
                      <p className="text-sm font-bold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-600">{n.message}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {new Date(n.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 4 Columns: Order Lookup + Customer Order List */}
              <div className="lg:col-span-4 space-y-4">
                <form
                  onSubmit={handleLookupOrder}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                >
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                    Track Any Order by Order ID
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={lookupInput}
                        onChange={(e) => setLookupInput(e.target.value)}
                        placeholder="e.g. ZST-ORD-1001"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-300 text-xs font-mono uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0"
                    >
                      Track
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Demo Order: ZST-ORD-1001</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLookupInput('ZST-ORD-1001');
                        fetch('/api/customers/orders/ZST-ORD-1001')
                          .then((r) => r.json())
                          .then((d) => {
                            if (d.order) {
                              setSelectedOrder(d.order);
                              if (!orders.some((o) => o.id === d.order.id)) {
                                setOrders((prev) => [d.order, ...prev]);
                              }
                            }
                          });
                      }}
                      className="text-blue-600 hover:underline font-bold"
                    >
                      Load ZST-ORD-1001
                    </button>
                  </div>
                </form>

                <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                      Your Orders ({orders.length})
                    </h3>
                    <button
                      type="button"
                      onClick={fetchCustomerOrders}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Refresh
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <Package className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No orders loaded yet</p>
                      <p className="text-[11px] text-slate-500">
                        Sign in to view your order history or enter an Order ID above (such as ZST-ORD-1001).
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                      {orders.map((ord) => {
                        const isSelected = selectedOrder?.id === ord.id;
                        return (
                          <button
                            key={ord.id}
                            type="button"
                            onClick={() => {
                              setSelectedOrder(ord);
                              setErrorMsg(null);
                              setSuccessMsg(null);
                              setShowCancelPrompt(false);
                              setShowReturnPrompt(false);
                            }}
                            className={`w-full p-4 text-left transition-colors ${
                              isSelected ? 'bg-blue-50/80 border-l-4 border-l-blue-600' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-extrabold text-slate-900">
                                {ord.orderNumber}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                  ord.status === 'Delivered'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : ord.status === 'Cancelled'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {ord.status}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-700 mt-1 truncate">
                              {ord.items.map((i) => i.productName).join(', ')}
                            </p>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                              <span>{new Date(ord.createdAt).toLocaleDateString('en-IN')}</span>
                              <span className="font-bold text-slate-900 tabular-nums">
                                {formatINR(ord.totalAmount)} · {ord.paymentMethod}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right 8 Columns: Selected Order Live Tracking & Self-Service Controls */}
              <div className="lg:col-span-8 space-y-5">
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {!selectedOrder ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
                    <Truck className="w-10 h-10 text-blue-600 mx-auto" />
                    <h3 className="text-base font-extrabold text-slate-900">
                      Select an Order to View Live 8-Stage Shipment Tracking
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click any order on the left or look up <strong>ZST-ORD-1001</strong> to inspect real-time courier status, GST invoice, and self-service cancellation or return options.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Top Order Summary Banner */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-extrabold text-slate-900 font-mono">
                              {selectedOrder.orderNumber}
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              {selectedOrder.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')} ·
                            Estimated Delivery:{' '}
                            <strong className="text-slate-900">
                              {selectedOrder.estimatedDeliveryDate || 'Within 3–4 Business Days'}
                            </strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowInvoiceView((v) => !v)}
                            className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs flex items-center gap-1.5"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            {showInvoiceView ? 'Hide Tax Invoice' : 'Tax Invoice'}
                          </button>

                          {(selectedOrder.paymentStatus === 'Payment Failed' ||
                            selectedOrder.paymentStatus === 'Payment Cancelled' ||
                            selectedOrder.paymentStatus === 'Pending Gateway Integration') &&
                            selectedOrder.status !== 'Cancelled' && (
                              <button
                                type="button"
                                disabled={actionBusy}
                                onClick={handleRetryPayment}
                                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Retry Online Payment
                              </button>
                            )}

                          {canCustomerCancelOrder(selectedOrder.status) && (
                            <button
                              type="button"
                              onClick={() => setShowCancelPrompt((v) => !v)}
                              className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1.5"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Cancel Order
                            </button>
                          )}

                          {canCustomerRequestReturn(selectedOrder.status) && (
                            <button
                              type="button"
                              onClick={() => setShowReturnPrompt((v) => !v)}
                              className="px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Return / Replace
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Cancel Order Prompt */}
                      {showCancelPrompt && (
                        <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 space-y-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900">
                            Confirm Order Cancellation — {selectedOrder.orderNumber}
                          </h4>
                          <p className="text-xs text-rose-800">
                            Cancelling this order will immediately release reserved inventory back to stock.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <select
                              value={cancelReason}
                              onChange={(e) => setCancelReason(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-lg border border-rose-300 bg-white text-xs font-medium"
                            >
                              <option value="Ordered by mistake / Found better price">
                                Ordered by mistake / Found better price
                              </option>
                              <option value="Need to change delivery address or phone">
                                Need to change delivery address or phone
                              </option>
                              <option value="Expected delivery time is too long">
                                Expected delivery time is too long
                              </option>
                              <option value="Changed payment preference">
                                Changed payment preference
                              </option>
                            </select>
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={handleCancelOrder}
                              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0"
                            >
                              {actionBusy ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Return / Replacement Prompt */}
                      {showReturnPrompt && (
                        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-950">
                            7-Day Easy Return or Replacement Request
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <select
                              value={returnType}
                              onChange={(e) =>
                                setReturnType(e.target.value as 'Return & Refund' | 'Replacement')
                              }
                              className="px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs font-bold"
                            >
                              <option value="Return & Refund">Return for Full Refund</option>
                              <option value="Replacement">Free Item Replacement</option>
                            </select>
                            <input
                              type="text"
                              value={returnReason}
                              onChange={(e) => setReturnReason(e.target.value)}
                              placeholder="Reason for return/replacement"
                              className="px-3 py-2 rounded-lg border border-amber-300 bg-white text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={handleRequestReturn}
                            className="px-4 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs"
                          >
                            {actionBusy ? 'Submitting...' : `Submit ${returnType} Request`}
                          </button>
                        </div>
                      )}

                      {/* Courier & Payment Metadata Bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Courier Partner & Tracking ID
                          </span>
                          <p className="font-bold text-slate-900 mt-0.5">
                            {selectedOrder.courierName || 'Zestora Express Logistics'}
                          </p>
                          <p className="font-mono text-blue-700 font-bold">
                            {selectedOrder.trackingNumber}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Payment Method & Status
                          </span>
                          <p className="font-bold text-slate-900 mt-0.5">
                            {selectedOrder.paymentProviderDetail || selectedOrder.paymentMethod}
                          </p>
                          <p className="text-emerald-700 font-semibold">
                            {selectedOrder.paymentStatus}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Delivery Destination
                          </span>
                          <p className="font-bold text-slate-900 mt-0.5">
                            {selectedOrder.customerName}
                          </p>
                          <p className="text-slate-600 truncate" title={selectedOrder.shippingAddress}>
                            {selectedOrder.shippingAddress}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Printable Tax Invoice Collapsible */}
                    {showInvoiceView && (
                      <div className="bg-white rounded-xl border-2 border-slate-800 p-5 space-y-3 shadow-md">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                              Zestora Official GST Tax Invoice
                            </p>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              Invoice #{selectedOrder.orderNumber.replace('ORD', 'INV')}
                            </h4>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold"
                          >
                            Print / Save PDF
                          </button>
                        </div>
                        <div className="space-y-1 text-xs">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between py-1 border-b border-slate-100">
                              <span>
                                {item.productName} ({item.sku}) × {item.quantity}
                              </span>
                              <span className="font-bold tabular-nums">
                                {formatINR(item.unitPrice * item.quantity)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between pt-2 font-extrabold text-sm text-slate-900">
                            <span>Total Invoice Value (Incl. 12% GST):</span>
                            <span className="tabular-nums">{formatINR(selectedOrder.totalAmount)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 8-STAGE LIVE TRACKING PROGRESS TIMELINE */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                          Live 8-Stage Order & Parcel Tracking Timeline
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Synced with Zestora Warehouse & Courier Operations
                        </span>
                      </div>

                      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                        {timelineSteps.map((step) => (
                          <div key={step.key} className="relative flex items-start justify-between gap-4">
                            <div
                              className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                                step.isException
                                  ? 'bg-rose-600 text-white'
                                  : step.completed
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {step.completed ? '✓' : step.stepNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p
                                  className={`text-xs font-extrabold ${
                                    step.isException
                                      ? 'text-rose-700'
                                      : step.current
                                      ? 'text-blue-700'
                                      : step.completed
                                      ? 'text-slate-900'
                                      : 'text-slate-400'
                                  }`}
                                >
                                  {step.title}
                                </p>
                                {step.current && (
                                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                                    Current Stage
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{step.subtitle}</p>
                            </div>
                            {step.timestamp && (
                              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                                {new Date(step.timestamp).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Detailed Checkpoint Log */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Detailed Logistics Checkpoints & Audit History
                      </h4>
                      <div className="divide-y divide-slate-100">
                        {selectedOrder.statusHistory.map((h, i) => (
                          <div key={i} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{h.status}</span>
                                {h.location && (
                                  <span className="text-slate-500 flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-blue-600" />
                                    {h.location}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600">{h.note}</p>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">
                              {new Date(h.timestamp).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
