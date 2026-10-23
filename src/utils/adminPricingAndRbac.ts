import type { AdminRole } from '../types/admin.ts';

export type PermissionDomain =
  | 'products'
  | 'pricing'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'content'
  | 'staff';

/**
 * Checks whether a given AdminRole has write/management permission for a specific domain.
 */
export function hasAdminPermission(role: AdminRole, domain: PermissionDomain): boolean {
  if (role === 'SUPER_ADMIN') return true;

  switch (domain) {
    case 'products':
    case 'pricing':
    case 'categories':
      return role === 'PRODUCT_MANAGER';
    case 'inventory':
      return role === 'INVENTORY_MANAGER' || role === 'PRODUCT_MANAGER';
    case 'orders':
    case 'customers':
      return role === 'ORDER_MANAGER';
    case 'content':
      return role === 'CONTENT_MANAGER';
    case 'staff':
      return false;
    default:
      return false;
  }
}

export interface PriceValidationInput {
  regularPrice: number;
  discountPrice?: number;
  discountType?: 'percentage' | 'fixed' | 'none';
  discountValue?: number;
  costPrice?: number;
}

export interface PriceValidationResult {
  isValid: boolean;
  finalSellingPrice: number;
  discountPercent: number;
  error?: string;
}

/**
 * Validates product pricing rules:
 * - Regular price must be > 0
 * - Cost price (if provided) must be >= 0
 * - Discount selling price cannot exceed regular price or be negative
 */
export function validateAndComputePricing(input: PriceValidationInput): PriceValidationResult {
  const { regularPrice, discountPrice, discountType = 'none', discountValue = 0, costPrice } = input;

  if (!Number.isFinite(regularPrice) || regularPrice <= 0) {
    return {
      isValid: false,
      finalSellingPrice: 0,
      discountPercent: 0,
      error: 'Regular selling price (MRP) must be greater than ₹0.',
    };
  }

  if (costPrice !== undefined && (!Number.isFinite(costPrice) || costPrice < 0)) {
    return {
      isValid: false,
      finalSellingPrice: regularPrice,
      discountPercent: 0,
      error: 'Cost price cannot be negative.',
    };
  }

  let computedSelling = regularPrice;

  if (discountPrice !== undefined && discountPrice > 0 && discountType === 'none') {
    computedSelling = Math.round(discountPrice);
  } else if (discountType === 'percentage' && discountValue > 0) {
    if (discountValue >= 100) {
      return {
        isValid: false,
        finalSellingPrice: regularPrice,
        discountPercent: 0,
        error: 'Percentage discount must be less than 100%.',
      };
    }
    computedSelling = Math.round(regularPrice * (1 - discountValue / 100));
  } else if (discountType === 'fixed' && discountValue > 0) {
    computedSelling = Math.round(regularPrice - discountValue);
  } else if (discountPrice !== undefined) {
    computedSelling = Math.round(discountPrice);
  }

  if (computedSelling <= 0) {
    return {
      isValid: false,
      finalSellingPrice: regularPrice,
      discountPercent: 0,
      error: 'Final selling price after discount must be greater than ₹0.',
    };
  }

  if (computedSelling > regularPrice) {
    return {
      isValid: false,
      finalSellingPrice: regularPrice,
      discountPercent: 0,
      error: 'Discount or sale price cannot exceed the regular selling price (MRP).',
    };
  }

  const discountPercent =
    regularPrice > computedSelling
      ? Math.round(((regularPrice - computedSelling) / regularPrice) * 100)
      : 0;

  return {
    isValid: true,
    finalSellingPrice: computedSelling,
    discountPercent,
  };
}

/**
 * Classifies product inventory stock state.
 */
export function classifyInventoryStock(
  stock: number,
  lowStockThreshold: number
): 'Out of Stock' | 'Low Stock' | 'In Stock' {
  if (stock <= 0) return 'Out of Stock';
  if (stock <= Math.max(1, lowStockThreshold)) return 'Low Stock';
  return 'In Stock';
}

const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates uploaded image MIME type and byte size.
 */
export function validateProductImageFile(
  mimeType: string,
  sizeBytes: number
): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: 'Unsupported file format. Only JPEG, PNG, and WebP images are allowed.',
    };
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Image file size must be between 1 byte and 5 MB.',
    };
  }
  return { valid: true };
}
