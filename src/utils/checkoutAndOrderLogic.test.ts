import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateServerOrderTotals,
  validateCodEligibility,
  canCustomerCancelOrder,
  canCustomerRequestReturn,
  buildTrackingTimelineSteps,
  DEFAULT_COUPONS,
  DEFAULT_PAYMENT_SETTINGS,
} from './checkoutAndOrderLogic.ts';

test('calculateServerOrderTotals computes MRP savings, coupon discount, GST, delivery, and COD fee accurately', () => {
  const items = [
    { price: 2000, regularPrice: 3000, quantity: 1 },
    { price: 999, regularPrice: 1499, quantity: 1 },
  ];

  // With ZESTORA10 coupon (10% off up to 1500) and UPI (no COD fee, free delivery above 999)
  const upiResult = calculateServerOrderTotals(items, {
    couponCode: 'ZESTORA10',
    paymentMethod: 'UPI',
    settings: DEFAULT_PAYMENT_SETTINGS,
    coupons: DEFAULT_COUPONS,
  });
  assert.equal(upiResult.couponCode, 'ZESTORA10');
  assert.equal(upiResult.itemsSellingSubtotal, 2999);
  assert.equal(upiResult.itemsMrpTotal, 4499);
  assert.equal(upiResult.productDiscountTotal, 1500);
  assert.equal(upiResult.couponDiscount, 300); // 10% of 2999 rounded
  assert.equal(upiResult.deliveryFee, 0);
  assert.equal(upiResult.codFee, 0);
  assert.equal(upiResult.payableTotal, 2699);
  assert.ok(upiResult.includedGstAmount > 0);

  // With COD (adds ₹49 COD handling fee)
  const codResult = calculateServerOrderTotals(items, {
    paymentMethod: 'COD',
    settings: DEFAULT_PAYMENT_SETTINGS,
    coupons: DEFAULT_COUPONS,
  });
  assert.equal(codResult.codFee, 49);
  assert.equal(codResult.payableTotal, 2999 + 49);
});

test('validateCodEligibility enforces PIN code, min/max order amount, and COD toggle', () => {
  assert.equal(
    validateCodEligibility(2500, '560001', DEFAULT_PAYMENT_SETTINGS).eligible,
    true
  );
  // Exceeds ₹50,000 max COD limit
  assert.equal(
    validateCodEligibility(65000, '560001', DEFAULT_PAYMENT_SETTINGS).eligible,
    false
  );
  // Invalid PIN code
  assert.equal(
    validateCodEligibility(1500, '01234', DEFAULT_PAYMENT_SETTINGS).eligible,
    false
  );
  // Disabled COD setting
  assert.equal(
    validateCodEligibility(1500, '560001', { ...DEFAULT_PAYMENT_SETTINGS, codEnabled: false })
      .eligible,
    false
  );
});

test('canCustomerCancelOrder allows cancellation before shipment and blocks after shipment', () => {
  assert.equal(canCustomerCancelOrder('Order Placed'), true);
  assert.equal(canCustomerCancelOrder('Confirmed'), true);
  assert.equal(canCustomerCancelOrder('Packed'), true);
  assert.equal(canCustomerCancelOrder('Shipped'), false);
  assert.equal(canCustomerCancelOrder('Delivered'), false);
});

test('canCustomerRequestReturn enforces Delivered status', () => {
  assert.equal(canCustomerRequestReturn('Delivered'), true);
  assert.equal(canCustomerRequestReturn('Shipped'), false);
});

test('buildTrackingTimelineSteps produces 8 ordered lifecycle steps plus exception states', () => {
  const steps = buildTrackingTimelineSteps({
    status: 'Shipped',
    paymentMethod: 'UPI',
    paymentStatus: 'Verified Paid',
    courierName: 'BlueDart Priority Air',
    trackingNumber: 'ZST-TRK-102938',
    createdAt: new Date().toISOString(),
    statusHistory: [
      {
        status: 'Order Placed',
        timestamp: new Date().toISOString(),
        note: 'Order created',
        updatedBy: 'customer',
      },
      {
        status: 'Shipped',
        timestamp: new Date().toISOString(),
        note: 'Dispatched via BlueDart',
        updatedBy: 'admin',
      },
    ],
  });
  assert.equal(steps.length, 8);
  const shippedStep = steps.find((s) => s.key === 'shipped');
  assert.ok(shippedStep);
  assert.equal(shippedStep.current, true);
  assert.equal(shippedStep.completed, true);

  const deliveredStep = steps.find((s) => s.key === 'delivered');
  assert.ok(deliveredStep);
  assert.equal(deliveredStep.completed, false);
});
