import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRatingSummary,
  filterAndSortReviews,
  validateReviewSubmission,
  hasVerifiedPurchaseForProduct,
  toggleHelpfulVoterList,
  estimateDeliveryByPinCode,
  validateStockAlertEmail,
  validateProductAvailabilityForStockAlert,
  upsertStockAlertSubscription,
} from './reviewAndProductLogic.ts';
import { STOCK_ALERTS_TABLE_SCHEMA, STOCK_ALERTS_SQL_SCHEMA } from '../db/schema.ts';
import type { AdminOrder, ProductReviewRecord } from '../types/admin.ts';

const sampleReviews: ProductReviewRecord[] = [
  {
    id: 'rev-1',
    productId: 'demo-1',
    customerId: 'cust-1',
    customerName: 'Diya Kapoor',
    rating: 5,
    title: 'Crystal clear ANC and deep bass',
    comment: 'Used these on a flight from Bengaluru to Delhi and the noise cancellation is top-notch.',
    photos: [{ id: 'p-1', url: '/uploads/reviews/sample-1.png' }],
    verifiedPurchase: true,
    helpfulVoterIds: ['cust-2', 'cust-3'],
    helpfulCount: 2,
    reportCount: 0,
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'rev-2',
    productId: 'demo-1',
    customerId: 'cust-2',
    customerName: 'Rohan Desai',
    rating: 4,
    title: 'Great battery life, slightly warm earcups',
    comment: 'Battery easily lasts a full work week. Comfort is very good overall.',
    photos: [],
    verifiedPurchase: true,
    helpfulVoterIds: ['cust-1'],
    helpfulCount: 1,
    reportCount: 0,
    createdAt: '2026-10-18T12:00:00.000Z',
    updatedAt: '2026-10-18T12:00:00.000Z',
  },
  {
    id: 'rev-3',
    productId: 'demo-1',
    customerId: 'cust-3',
    customerName: 'Meera Joshi',
    rating: 2,
    title: 'Carrying case could be sturdier',
    comment: 'Sound quality is good but I expected a hard shell case at this price point.',
    photos: [],
    verifiedPurchase: false,
    helpfulVoterIds: [],
    helpfulCount: 0,
    reportCount: 0,
    createdAt: '2026-10-19T08:00:00.000Z',
    updatedAt: '2026-10-19T08:00:00.000Z',
  },
];

test('calculateRatingSummary computes accurate average, counts, and 5-to-1 star distribution', () => {
  const emptySummary = calculateRatingSummary([]);
  assert.equal(emptySummary.averageRating, 0);
  assert.equal(emptySummary.totalRatings, 0);

  const summary = calculateRatingSummary(sampleReviews);
  // (5 + 4 + 2) / 3 = 11 / 3 = 3.666... -> 3.7
  assert.equal(summary.averageRating, 3.7);
  assert.equal(summary.totalRatings, 3);
  assert.equal(summary.totalWrittenReviews, 3);
  assert.equal(summary.verifiedPurchaseCount, 2);
  assert.equal(summary.withPhotosCount, 1);
  assert.equal(summary.distribution[5], 1);
  assert.equal(summary.distribution[4], 1);
  assert.equal(summary.distribution[3], 0);
  assert.equal(summary.distribution[2], 1);
  assert.equal(summary.distribution[1], 0);
});

test('filterAndSortReviews filters by stars, photos, verified purchase, and sorts accurately', () => {
  const fiveStar = filterAndSortReviews(sampleReviews, { starFilter: 5 });
  assert.equal(fiveStar.length, 1);
  assert.equal(fiveStar[0].id, 'rev-1');

  const photosOnly = filterAndSortReviews(sampleReviews, { withPhotosOnly: true });
  assert.equal(photosOnly.length, 1);
  assert.equal(photosOnly[0].id, 'rev-1');

  const verifiedOnly = filterAndSortReviews(sampleReviews, { verifiedOnly: true });
  assert.equal(verifiedOnly.length, 2);

  const byRecent = filterAndSortReviews(sampleReviews, { sortBy: 'recent' });
  assert.deepEqual(
    byRecent.map((r) => r.id),
    ['rev-3', 'rev-2', 'rev-1']
  );

  const byLowest = filterAndSortReviews(sampleReviews, { sortBy: 'rating-low' });
  assert.deepEqual(
    byLowest.map((r) => r.id),
    ['rev-3', 'rev-2', 'rev-1']
  );
});

test('validateReviewSubmission validates star range, text length, and max photo count', () => {
  assert.equal(validateReviewSubmission({ rating: 0, title: 'Bad', comment: 'Too short' }).valid, false);
  assert.equal(validateReviewSubmission({ rating: 5, title: 'ab', comment: 'Valid comment length here' }).valid, false);
  const validResult = validateReviewSubmission({
    rating: 5,
    title: 'Excellent value',
    comment: 'Superb build quality and fast delivery by Zestora.',
    photos: [{ id: 'p1', url: '/uploads/reviews/test.png' }],
  });
  assert.equal(validResult.valid, true);
  assert.equal(validResult.sanitized?.rating, 5);
  assert.equal(validResult.sanitized?.photos.length, 1);
});

test('toggleHelpfulVoterList adds once and undoes vote on second click without inflation', () => {
  const first = toggleHelpfulVoterList(['cust-9'], 'cust-1');
  assert.equal(first.voted, true);
  assert.equal(first.helpfulCount, 2);
  assert.deepEqual(first.updatedVoterIds, ['cust-9', 'cust-1']);

  const second = toggleHelpfulVoterList(first.updatedVoterIds, 'cust-1');
  assert.equal(second.voted, false);
  assert.equal(second.helpfulCount, 1);
  assert.deepEqual(second.updatedVoterIds, ['cust-9']);
});

test('hasVerifiedPurchaseForProduct checks non-cancelled order records', () => {
  const mockOrders: AdminOrder[] = [
    {
      id: 'ord-1',
      orderNumber: 'ZST-ORD-1001',
      customerId: 'cust-1',
      customerName: 'Diya Kapoor',
      customerEmail: 'diya.kapoor@example.com',
      customerPhone: '+91 98765 43210',
      shippingAddress: 'Bengaluru',
      items: [
        {
          productId: 'demo-1',
          productName: 'Headphones',
          sku: 'ZST-01',
          quantity: 1,
          unitPrice: 4999,
        },
      ],
      totalAmount: 4999,
      status: 'Delivered',
      paymentStatus: 'Verified Paid',
      paymentMethod: 'UPI',
      trackingNumber: 'TRK-1',
      statusHistory: [],
      createdAt: '2026-10-10T10:00:00.000Z',
    },
  ];

  assert.equal(hasVerifiedPurchaseForProduct(mockOrders, 'cust-1', undefined, 'demo-1'), true);
  assert.equal(hasVerifiedPurchaseForProduct(mockOrders, 'cust-1', undefined, 'demo-2'), false);
  assert.equal(hasVerifiedPurchaseForProduct(mockOrders, 'cust-99', 'other@example.com', 'demo-1'), false);
});

test('estimateDeliveryByPinCode validates 6-digit Indian PIN code and distinguishes metro vs national', () => {
  const invalid = estimateDeliveryByPinCode('01234');
  assert.equal(invalid.valid, false);

  const metro = estimateDeliveryByPinCode('560001');
  assert.equal(metro.valid, true);
  assert.equal(metro.estimatedDays, 2);

  const national = estimateDeliveryByPinCode('302001');
  assert.equal(national.valid, true);
  assert.equal(national.estimatedDays, 4);
});

test('validateStockAlertEmail validates and normalizes guest/customer emails', () => {
  assert.equal(validateStockAlertEmail('').valid, false);
  assert.equal(validateStockAlertEmail('not-an-email').valid, false);

  const valid = validateStockAlertEmail('  Guest.User@Example.COM ');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalizedEmail, 'guest.user@example.com');
});

test('upsertStockAlertSubscription inserts new pending stock alert and deduplicates existing pending subscription', () => {
  const first = upsertStockAlertSubscription([], {
    productId: 'demo-9',
    productName: 'Zestora Out-of-Stock Item',
    email: 'Guest@Example.com',
    variantId: 'var-demo-9-1',
    variantLabel: 'Obsidian Black · Standard',
  });
  assert.equal(first.alreadySubscribed, false);
  assert.equal(first.updatedAlerts.length, 1);
  assert.equal(first.alert.email, 'guest@example.com');
  assert.equal(first.alert.status, 'pending');

  const duplicate = upsertStockAlertSubscription(first.updatedAlerts, {
    productId: 'demo-9',
    productName: 'Zestora Out-of-Stock Item',
    email: '  guest@example.com ',
    variantId: 'var-demo-9-1',
  });
  assert.equal(duplicate.alreadySubscribed, true);
  assert.equal(duplicate.updatedAlerts.length, 1);
  assert.equal(duplicate.alert.id, first.alert.id);
});

test('validateProductAvailabilityForStockAlert rejects in-stock items and accepts out-of-stock products or variants', () => {
  assert.equal(validateProductAvailabilityForStockAlert(null).statusCode, 404);

  const mockProd = {
    id: 'zest-prod-101',
    name: 'Zestora SonicPro Headphones',
    stock: 42,
    status: 'Active' as const,
    variants: [
      {
        id: 'var-1',
        size: 'Standard',
        color: 'Signature Blue',
        model: '2026',
        skuSuffix: 'STD',
        stock: 42,
      },
      {
        id: 'var-2',
        size: 'Collector Edition',
        color: 'Obsidian Gold',
        model: 'Limited',
        skuSuffix: 'LTD',
        stock: 0,
      },
    ],
  };

  // In-stock product or variant cannot register out-of-stock alert
  const inStockCheck = validateProductAvailabilityForStockAlert(mockProd, 'var-1');
  assert.equal(inStockCheck.valid, false);
  assert.equal(inStockCheck.statusCode, 400);

  // Out-of-stock variant is eligible for stock alert
  const outVariantCheck = validateProductAvailabilityForStockAlert(mockProd, 'var-2');
  assert.equal(outVariantCheck.valid, true);
  assert.equal(outVariantCheck.effectiveStock, 0);

  // Schema metadata verification
  assert.equal(STOCK_ALERTS_TABLE_SCHEMA.tableName, 'stock_alerts');
  assert.ok(STOCK_ALERTS_SQL_SCHEMA.includes('CREATE TABLE IF NOT EXISTS stock_alerts'));
});

