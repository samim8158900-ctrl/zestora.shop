import type {
  AdminOrder,
  CouponCodeRecord,
  OrderStatus,
  PaymentGatewaySettings,
  PaymentMethodType,
} from '../types/admin.ts';

export const DEFAULT_PAYMENT_SETTINGS: PaymentGatewaySettings = {
  upiEnabled: true,
  cardsNetbankingEnabled: true,
  codEnabled: true,
  codFee: 49,
  codMinOrder: 100,
  codMaxOrder: 50000,
  freeDeliveryThreshold: 999,
  standardDeliveryFee: 79,
  returnWindowDays: 7,
};

export const DEFAULT_COUPONS: CouponCodeRecord[] = [
  {
    code: 'ZESTORA10',
    description: '10% Instant Discount up to ₹1,500 on orders above ₹999',
    discountType: 'percentage',
    discountValue: 10,
    minOrderAmount: 999,
    maxDiscountAmount: 1500,
    active: true,
  },
  {
    code: 'WELCOME200',
    description: 'Flat ₹200 OFF on orders above ₹1,499',
    discountType: 'fixed',
    discountValue: 200,
    minOrderAmount: 1499,
    active: true,
  },
  {
    code: 'FESTIVE15',
    description: '15% Super Saver Discount up to ₹2,500 on orders above ₹2,999',
    discountType: 'percentage',
    discountValue: 15,
    minOrderAmount: 2999,
    maxDiscountAmount: 2500,
    active: true,
  },
];

export interface ServerOrderLineInput {
  price: number;
  regularPrice?: number;
  quantity: number;
}

export interface ComputedOrderPricing {
  itemsMrpTotal: number;
  itemsSellingSubtotal: number;
  productDiscountTotal: number;
  couponCode?: string;
  couponDiscount: number;
  couponError?: string;
  deliveryFee: number;
  codFee: number;
  includedGstAmount: number;
  payableTotal: number;
}

/**
 * Pure server-grade pricing and coupon calculation function.
 * Never trusts client-computed totals.
 */
export function calculateServerOrderTotals(
  lines: ServerOrderLineInput[],
  options?: {
    couponCode?: string;
    paymentMethod?: PaymentMethodType;
    coupons?: CouponCodeRecord[];
    settings?: PaymentGatewaySettings;
  }
): ComputedOrderPricing {
  const settings = options?.settings ?? DEFAULT_PAYMENT_SETTINGS;
  const availableCoupons = options?.coupons ?? DEFAULT_COUPONS;
  const paymentMethod = options?.paymentMethod ?? 'UPI';

  let itemsMrpTotal = 0;
  let itemsSellingSubtotal = 0;

  for (const line of lines) {
    const qty = Math.max(0, Math.round(line.quantity));
    const sell = Math.max(0, Math.round(line.price));
    const mrp = Math.max(sell, Math.round(line.regularPrice ?? sell));
    itemsMrpTotal += mrp * qty;
    itemsSellingSubtotal += sell * qty;
  }

  const productDiscountTotal = Math.max(0, itemsMrpTotal - itemsSellingSubtotal);

  let couponDiscount = 0;
  let appliedCode: string | undefined;
  let couponError: string | undefined;

  const rawCode = (options?.couponCode ?? '').trim().toUpperCase();
  if (rawCode) {
    const found = availableCoupons.find((c) => c.code.toUpperCase() === rawCode && c.active);
    if (!found) {
      couponError = `Coupon code "${rawCode}" is invalid or expired.`;
    } else if (itemsSellingSubtotal < found.minOrderAmount) {
      couponError = `Coupon "${found.code}" requires a minimum item subtotal of ₹${found.minOrderAmount.toLocaleString('en-IN')}.`;
    } else {
      appliedCode = found.code;
      if (found.discountType === 'percentage') {
        const rawDisc = Math.round((itemsSellingSubtotal * found.discountValue) / 100);
        couponDiscount = found.maxDiscountAmount
          ? Math.min(rawDisc, found.maxDiscountAmount)
          : rawDisc;
      } else {
        couponDiscount = Math.min(itemsSellingSubtotal, found.discountValue);
      }
    }
  }

  const discountedSubtotal = Math.max(0, itemsSellingSubtotal - couponDiscount);
  const deliveryFee =
    itemsSellingSubtotal === 0
      ? 0
      : discountedSubtotal >= settings.freeDeliveryThreshold
      ? 0
      : settings.standardDeliveryFee;

  const codFee =
    itemsSellingSubtotal > 0 && paymentMethod === 'COD' ? settings.codFee : 0;

  // 12% GST included in the catalog selling price
  const includedGstAmount = Math.round(discountedSubtotal - discountedSubtotal / 1.12);
  const payableTotal = Math.max(0, discountedSubtotal + deliveryFee + codFee);

  return {
    itemsMrpTotal,
    itemsSellingSubtotal,
    productDiscountTotal,
    couponCode: appliedCode,
    couponDiscount,
    couponError,
    deliveryFee,
    codFee,
    includedGstAmount,
    payableTotal,
  };
}

/**
 * Validates Cash on Delivery (COD) eligibility based on admin settings, order total, and 6-digit Indian PIN code.
 */
export function validateCodEligibility(
  orderSubtotal: number,
  postalCode: string,
  settings: PaymentGatewaySettings = DEFAULT_PAYMENT_SETTINGS
): { eligible: boolean; reason?: string } {
  if (!settings.codEnabled) {
    return {
      eligible: false,
      reason: 'Cash on Delivery is currently disabled by store administration.',
    };
  }
  const cleanPin = postalCode.trim();
  if (cleanPin && !/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      eligible: false,
      reason: 'Enter a valid 6-digit Indian PIN code to verify COD serviceability.',
    };
  }
  if (orderSubtotal < settings.codMinOrder) {
    return {
      eligible: false,
      reason: `Cash on Delivery requires a minimum order value of ₹${settings.codMinOrder}.`,
    };
  }
  if (orderSubtotal > settings.codMaxOrder) {
    return {
      eligible: false,
      reason: `Cash on Delivery is available only for orders up to ₹${settings.codMaxOrder.toLocaleString('en-IN')}. Please use UPI or Online Payment.`,
    };
  }
  return { eligible: true };
}

/**
 * Checks whether a customer is permitted to cancel an order at its current status.
 */
export function canCustomerCancelOrder(status: OrderStatus): boolean {
  return (
    status === 'Order Placed' ||
    status === 'Pending' ||
    status === 'Confirmed' ||
    status === 'Processing' ||
    status === 'Packed'
  );
}

/**
 * Checks whether a customer is permitted to request a return or replacement.
 */
export function canCustomerRequestReturn(status: OrderStatus): boolean {
  return status === 'Delivered';
}

export interface TrackingTimelineStep {
  stepNumber: number;
  key: string;
  title: string;
  subtitle: string;
  completed: boolean;
  current: boolean;
  isException?: boolean;
  timestamp?: string;
}

const CANONICAL_STAGE_INDEX: Record<string, number> = {
  'Order Placed': 1,
  Pending: 2,
  Confirmed: 3,
  Processing: 4,
  Packed: 5,
  Shipped: 6,
  'Out for Delivery': 7,
  Delivered: 8,
};

/**
 * Builds the 8-stage visual progress timeline for Live Order Tracking:
 * 1. Order Placed
 * 2. Payment Confirmed or COD Selected
 * 3. Order Confirmed
 * 4. Processing
 * 5. Packed
 * 6. Shipped
 * 7. Out for Delivery
 * 8. Delivered
 * Plus exception/return states (Cancelled, Payment Failed, Return Requested, Returned, Refunded).
 */
export function buildTrackingTimelineSteps(
  order: Pick<
    AdminOrder,
    'status' | 'paymentMethod' | 'paymentStatus' | 'statusHistory' | 'createdAt' | 'courierName' | 'trackingNumber'
  >
): TrackingTimelineStep[] {
  const activeIndex = CANONICAL_STAGE_INDEX[order.status] ?? 1;
  const isCancelled = order.status === 'Cancelled';
  const isPaymentFailed = order.paymentStatus === 'Payment Failed';
  const isReturnState =
    order.status === 'Return Requested' ||
    order.status === 'Returned' ||
    order.status === 'Refunded';

  const effectiveIndex = isReturnState ? 8 : isCancelled || isPaymentFailed ? 1 : activeIndex;

  const findTimestampFor = (statuses: OrderStatus[]): string | undefined => {
    const match = order.statusHistory.find((h) => statuses.includes(h.status));
    return match?.timestamp;
  };

  const step2Title =
    order.paymentMethod === 'COD'
      ? 'COD Selected (Pay on Delivery)'
      : order.paymentStatus === 'Verified Paid'
      ? 'Payment Confirmed'
      : 'Payment Verification';

  const step2Subtitle =
    order.paymentMethod === 'COD'
      ? 'Cash / UPI payable at doorstep upon parcel delivery'
      : order.paymentStatus === 'Verified Paid'
      ? 'Online transaction verified by Zestora payment server'
      : `Current payment state: ${order.paymentStatus}`;

  const baseSteps: TrackingTimelineStep[] = [
    {
      stepNumber: 1,
      key: 'order-placed',
      title: 'Order Placed',
      subtitle: 'Order received and inventory stock reserved at Zestora fulfillment center',
      completed: effectiveIndex >= 1,
      current: effectiveIndex === 1 && !isCancelled && !isPaymentFailed,
      timestamp: findTimestampFor(['Order Placed', 'Pending']) ?? order.createdAt,
    },
    {
      stepNumber: 2,
      key: 'payment-status',
      title: step2Title,
      subtitle: step2Subtitle,
      completed:
        !isPaymentFailed &&
        (order.paymentMethod === 'COD' ||
          order.paymentStatus === 'Verified Paid' ||
          effectiveIndex >= 2),
      current: effectiveIndex === 2 && !isCancelled && !isPaymentFailed,
      timestamp: findTimestampFor(['Pending', 'Order Placed']) ?? order.createdAt,
    },
    {
      stepNumber: 3,
      key: 'order-confirmed',
      title: 'Order Confirmed',
      subtitle: 'Verified by Zestora merchant operations',
      completed: effectiveIndex >= 3 && !isCancelled,
      current: effectiveIndex === 3 && !isCancelled,
      timestamp: findTimestampFor(['Confirmed']),
    },
    {
      stepNumber: 4,
      key: 'processing',
      title: 'Processing',
      subtitle: 'Order being processed at supplier warehouse',
      completed: effectiveIndex >= 4 && !isCancelled,
      current: effectiveIndex === 4 && !isCancelled,
      timestamp: findTimestampFor(['Processing']),
    },
    {
      stepNumber: 5,
      key: 'packed',
      title: 'Parcel Being Packed',
      subtitle: 'Quality-checked, barcoded, and sealed with tamper-evident packaging',
      completed: effectiveIndex >= 5 && !isCancelled,
      current: effectiveIndex === 5 && !isCancelled,
      timestamp: findTimestampFor(['Packed']),
    },
    {
      stepNumber: 6,
      key: 'shipped',
      title: 'Despatched & Shipped',
      subtitle: order.courierName
        ? `Handed over to ${order.courierName} (Tracking: ${order.trackingNumber})`
        : `Dispatched with tracking ref ${order.trackingNumber}`,
      completed: effectiveIndex >= 6 && !isCancelled,
      current: effectiveIndex === 6 && !isCancelled,
      timestamp: findTimestampFor(['Shipped']),
    },
    {
      stepNumber: 7,
      key: 'out-for-delivery',
      title: 'Out for Delivery',
      subtitle: 'Loaded onto local delivery van en route to your address',
      completed: effectiveIndex >= 7 && !isCancelled,
      current: effectiveIndex === 7 && !isCancelled,
      timestamp: findTimestampFor(['Out for Delivery']),
    },
    {
      stepNumber: 8,
      key: 'delivered',
      title: 'Parcel Delivered',
      subtitle: 'Delivered to recipient address',
      completed: effectiveIndex >= 8 && !isCancelled,
      current: effectiveIndex === 8 && !isReturnState,
      timestamp: findTimestampFor(['Delivered']),
    },
  ];

  if (isCancelled || isPaymentFailed) {
    baseSteps.push({
      stepNumber: 9,
      key: 'exception-cancelled',
      title: isPaymentFailed ? 'Payment Failed' : 'Order Cancelled',
      subtitle:
        order.statusHistory[0]?.note ||
        'Order was cancelled and any reserved inventory stock was restored.',
      completed: true,
      current: true,
      isException: true,
      timestamp: findTimestampFor(['Cancelled']) ?? order.createdAt,
    });
  } else if (isReturnState) {
    baseSteps.push({
      stepNumber: 9,
      key: 'return-state',
      title: order.status,
      subtitle:
        order.statusHistory[0]?.note ||
        'Customer return / replacement request logged with Zestora support.',
      completed: true,
      current: true,
      isException: true,
      timestamp: findTimestampFor(['Return Requested', 'Returned', 'Refunded']),
    });
  }

  return baseSteps;
}
