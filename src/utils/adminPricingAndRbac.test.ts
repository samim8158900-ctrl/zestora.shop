import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasAdminPermission,
  validateAndComputePricing,
  classifyInventoryStock,
  validateProductImageFile,
} from './adminPricingAndRbac.ts';

test('hasAdminPermission enforces role-based access matrix accurately', () => {
  assert.equal(hasAdminPermission('SUPER_ADMIN', 'staff'), true);
  assert.equal(hasAdminPermission('SUPER_ADMIN', 'products'), true);

  assert.equal(hasAdminPermission('PRODUCT_MANAGER', 'products'), true);
  assert.equal(hasAdminPermission('PRODUCT_MANAGER', 'pricing'), true);
  assert.equal(hasAdminPermission('PRODUCT_MANAGER', 'staff'), false);
  assert.equal(hasAdminPermission('PRODUCT_MANAGER', 'orders'), false);

  assert.equal(hasAdminPermission('INVENTORY_MANAGER', 'inventory'), true);
  assert.equal(hasAdminPermission('INVENTORY_MANAGER', 'pricing'), false);

  assert.equal(hasAdminPermission('ORDER_MANAGER', 'orders'), true);
  assert.equal(hasAdminPermission('ORDER_MANAGER', 'products'), false);

  assert.equal(hasAdminPermission('CONTENT_MANAGER', 'content'), true);
  assert.equal(hasAdminPermission('CONTENT_MANAGER', 'inventory'), false);
});

test('validateAndComputePricing validates regular and discount prices', () => {
  const validDirect = validateAndComputePricing({
    regularPrice: 7999,
    discountPrice: 4999,
    costPrice: 3200,
  });
  assert.equal(validDirect.isValid, true);
  assert.equal(validDirect.finalSellingPrice, 4999);
  assert.equal(validDirect.discountPercent, 38);

  const validPercentage = validateAndComputePricing({
    regularPrice: 2000,
    discountType: 'percentage',
    discountValue: 25,
  });
  assert.equal(validPercentage.isValid, true);
  assert.equal(validPercentage.finalSellingPrice, 1500);
  assert.equal(validPercentage.discountPercent, 25);

  const invalidExceeds = validateAndComputePricing({
    regularPrice: 2000,
    discountPrice: 2500,
  });
  assert.equal(invalidExceeds.isValid, false);
  assert.match(invalidExceeds.error ?? '', /cannot exceed/i);

  const invalidNegative = validateAndComputePricing({
    regularPrice: -100,
  });
  assert.equal(invalidNegative.isValid, false);
});

test('classifyInventoryStock identifies Out of Stock, Low Stock, and In Stock', () => {
  assert.equal(classifyInventoryStock(0, 5), 'Out of Stock');
  assert.equal(classifyInventoryStock(4, 5), 'Low Stock');
  assert.equal(classifyInventoryStock(25, 5), 'In Stock');
});

test('validateProductImageFile allows JPEG, PNG, WebP up to 5MB and rejects others', () => {
  assert.equal(validateProductImageFile('image/jpeg', 500_000).valid, true);
  assert.equal(validateProductImageFile('image/webp', 1_200_000).valid, true);
  assert.equal(validateProductImageFile('image/gif', 100_000).valid, false);
  assert.equal(validateProductImageFile('image/png', 6 * 1024 * 1024).valid, false);
});
