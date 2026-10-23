import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatINR,
  calculateDiscountPercent,
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  calculateCartSummary,
  filterAndSortProducts,
  calculateZoomPosition,
} from './cartLogic.ts';
import type { Product } from '../types/store.ts';

const sampleProducts: Product[] = [
  {
    id: 'demo-1',
    name: 'Zestora SonicPro ANC Wireless Headphones',
    category: 'Electronics',
    price: 4999,
    originalPrice: 7999,
    discountLabel: '38% OFF',
    rating: 4.8,
    reviewCount: 342,
    featured: true,
    trending: true,
    shortDescription: 'Active noise cancellation with 45-hour battery life.',
    highlights: ['Bluetooth 5.3', '45h Playtime', 'USB-C Fast Charge'],
    artwork: 'anc-headphones',
    inStock: true,
    demoTag: 'Demo Product',
  },
  {
    id: 'demo-2',
    name: 'AeroCloud Knit Running Sneakers',
    category: 'Footwear',
    price: 2799,
    originalPrice: 3999,
    discountLabel: '30% OFF',
    rating: 4.6,
    reviewCount: 215,
    featured: true,
    trending: false,
    shortDescription: 'Lightweight responsive cushioning for daily road runs.',
    highlights: ['Breathable Engineered Mesh', 'Dual-Density Foam'],
    artwork: 'cloud-sneaker',
    inStock: true,
    demoTag: 'Demo Product',
  },
  {
    id: 'demo-3',
    name: 'Nordic Cobalt Heavyweight Hoodie',
    category: 'Fashion',
    price: 1899,
    originalPrice: 2499,
    discountLabel: '24% OFF',
    rating: 4.9,
    reviewCount: 198,
    featured: false,
    trending: true,
    shortDescription: '420 GSM organic brushed fleece hoodie.',
    highlights: ['100% Organic Cotton', 'Pre-shrunk Fit'],
    artwork: 'cobalt-hoodie',
    inStock: true,
    demoTag: 'Demo Product',
  },
];

test('formatINR formats Indian Rupee numbers with en-IN grouping', () => {
  assert.equal(formatINR(4999), '₹4,999');
  assert.equal(formatINR(125000), '₹1,25,000');
  assert.equal(formatINR(0), '₹0');
});

test('calculateDiscountPercent returns accurate rounded discount percentage', () => {
  assert.equal(calculateDiscountPercent(4999, 7999), 38);
  assert.equal(calculateDiscountPercent(2000, 2000), 0);
  assert.equal(calculateDiscountPercent(2000, undefined), 0);
});

test('addItemToCart adds new item and increments existing item quantity', () => {
  let cart = addItemToCart([], sampleProducts[0], 1);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 1);

  cart = addItemToCart(cart, sampleProducts[0], 2);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 3);

  cart = addItemToCart(cart, sampleProducts[1], 1);
  assert.equal(cart.length, 2);
});

test('updateCartItemQuantity updates quantity and removes when zero', () => {
  let cart = addItemToCart([], sampleProducts[0], 2);
  cart = updateCartItemQuantity(cart, 'demo-1', 5);
  assert.equal(cart[0].quantity, 5);

  cart = updateCartItemQuantity(cart, 'demo-1', 0);
  assert.equal(cart.length, 0);
});

test('removeItemFromCart removes matching item cleanly', () => {
  let cart = addItemToCart([], sampleProducts[0], 1);
  cart = addItemToCart(cart, sampleProducts[1], 1);
  cart = removeItemFromCart(cart, 'demo-1');
  assert.equal(cart.length, 1);
  assert.equal(cart[0].product.id, 'demo-2');
});

test('calculateCartSummary computes subtotal, savings, and free delivery threshold', () => {
  let cart = addItemToCart([], sampleProducts[0], 2); // 2 * 4999 = 9998, mrp = 2 * 7999 = 15998
  const summary = calculateCartSummary(cart);
  assert.equal(summary.totalItems, 2);
  assert.equal(summary.subtotal, 9998);
  assert.equal(summary.totalOriginalPrice, 15998);
  assert.equal(summary.totalSavings, 6000);
  assert.equal(summary.deliveryFee, 0);
  assert.equal(summary.grandTotal, 9998);
});

test('filterAndSortProducts filters by search query, category, and sorts by price', () => {
  const bySearch = filterAndSortProducts(sampleProducts, { searchQuery: 'headphone' });
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'demo-1');

  const byCategory = filterAndSortProducts(sampleProducts, { category: 'Footwear' });
  assert.equal(byCategory.length, 1);
  assert.equal(byCategory[0].id, 'demo-2');

  const sortedPriceAsc = filterAndSortProducts(sampleProducts, { sortBy: 'price-asc' });
  assert.deepEqual(
    sortedPriceAsc.map((p) => p.id),
    ['demo-3', 'demo-2', 'demo-1']
  );
});

test('calculateZoomPosition computes clamped cursor-relative percentage coordinates', () => {
  assert.deepEqual(calculateZoomPosition(150, 90, 300, 180), { xPercent: 50, yPercent: 50 });
  assert.deepEqual(calculateZoomPosition(75, 135, 300, 180), { xPercent: 25, yPercent: 75 });
  assert.deepEqual(calculateZoomPosition(-20, 250, 300, 180), { xPercent: 0, yPercent: 100 });
  assert.deepEqual(calculateZoomPosition(100, 100, 0, 0), { xPercent: 50, yPercent: 50 });
});

