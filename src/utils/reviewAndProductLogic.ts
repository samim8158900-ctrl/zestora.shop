import type {
  AdminOrder,
  AdminProduct,
  ProductRatingSummary,
  ProductReviewRecord,
  ProductVariant,
  StockAlertRecord,
} from '../types/admin.ts';

export type ReviewSortOption = 'helpful' | 'recent' | 'rating-high' | 'rating-low';
export type ReviewStarFilter = 'all' | 5 | 4 | 3 | 2 | 1;

/**
 * Calculates aggregate rating, total ratings, total written reviews, and 5-to-1 star distribution
 * strictly from stored ProductReviewRecord entries. Never invents fake ratings.
 */
export function calculateRatingSummary(reviews: ProductReviewRecord[]): ProductRatingSummary {
  const distribution: { 5: number; 4: number; 3: number; 2: number; 1: number } = {
    5: 0,
    4: 0,
    3: 0,
    2: 0,
    1: 0,
  };

  let sum = 0;
  let validCount = 0;
  let writtenCount = 0;
  let verifiedCount = 0;
  let withPhotosCount = 0;

  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(Number(r.rating)))) as 1 | 2 | 3 | 4 | 5;
    if (!Number.isFinite(star)) continue;
    distribution[star] += 1;
    sum += star;
    validCount += 1;
    if ((r.comment && r.comment.trim().length > 0) || (r.title && r.title.trim().length > 0)) {
      writtenCount += 1;
    }
    if (r.verifiedPurchase) {
      verifiedCount += 1;
    }
    if (Array.isArray(r.photos) && r.photos.length > 0) {
      withPhotosCount += 1;
    }
  }

  const averageRating = validCount > 0 ? Math.round((sum / validCount) * 10) / 10 : 0;

  const pct = (count: number) =>
    validCount > 0 ? Math.round((count / validCount) * 100) : 0;

  return {
    averageRating,
    totalRatings: validCount,
    totalWrittenReviews: writtenCount,
    verifiedPurchaseCount: verifiedCount,
    withPhotosCount,
    distribution,
    distributionPercent: {
      5: pct(distribution[5]),
      4: pct(distribution[4]),
      3: pct(distribution[3]),
      2: pct(distribution[2]),
      1: pct(distribution[1]),
    },
  };
}

/**
 * Filters and sorts product reviews based on star rating, photos-only, verified-only, and sort order.
 */
export function filterAndSortReviews(
  reviews: ProductReviewRecord[],
  options: {
    starFilter?: ReviewStarFilter;
    withPhotosOnly?: boolean;
    verifiedOnly?: boolean;
    sortBy?: ReviewSortOption;
  }
): ProductReviewRecord[] {
  const starFilter = options.starFilter ?? 'all';
  const withPhotosOnly = Boolean(options.withPhotosOnly);
  const verifiedOnly = Boolean(options.verifiedOnly);
  const sortBy = options.sortBy ?? 'helpful';

  const filtered = reviews.filter((r) => {
    const roundedStar = Math.round(Number(r.rating));
    if (starFilter !== 'all' && roundedStar !== starFilter) {
      return false;
    }
    if (withPhotosOnly && (!Array.isArray(r.photos) || r.photos.length === 0)) {
      return false;
    }
    if (verifiedOnly && !r.verifiedPurchase) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered];
  if (sortBy === 'helpful') {
    sorted.sort(
      (a, b) =>
        b.helpfulCount - a.helpfulCount ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (sortBy === 'recent') {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortBy === 'rating-high') {
    sorted.sort(
      (a, b) =>
        b.rating - a.rating ||
        b.helpfulCount - a.helpfulCount ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (sortBy === 'rating-low') {
    sorted.sort(
      (a, b) =>
        a.rating - b.rating ||
        b.helpfulCount - a.helpfulCount ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return sorted;
}

/**
 * Validates customer review submission payload.
 */
export function validateReviewSubmission(input: {
  rating?: unknown;
  title?: unknown;
  comment?: unknown;
  photos?: unknown;
}): {
  valid: boolean;
  error?: string;
  sanitized?: {
    rating: number;
    title: string;
    comment: string;
    photos: { id: string; url: string; caption?: string }[];
  };
} {
  const numRating = Number(input.rating);
  if (!Number.isFinite(numRating) || numRating < 1 || numRating > 5) {
    return { valid: false, error: 'Please select a star rating between 1 and 5 stars.' };
  }
  const roundedRating = Math.round(numRating);
  const cleanTitle = String(input.title ?? '').trim();
  const cleanComment = String(input.comment ?? '').trim();

  if (cleanTitle.length > 0 && cleanTitle.length < 3) {
    return { valid: false, error: 'Review title must be at least 3 characters long.' };
  }
  if (cleanTitle.length > 120) {
    return { valid: false, error: 'Review title cannot exceed 120 characters.' };
  }
  if (cleanComment.length > 0 && cleanComment.length < 10) {
    return { valid: false, error: 'Written review must be at least 10 characters long.' };
  }
  if (cleanComment.length > 2500) {
    return { valid: false, error: 'Written review cannot exceed 2500 characters.' };
  }

  const rawPhotos = Array.isArray(input.photos) ? input.photos : [];
  if (rawPhotos.length > 5) {
    return { valid: false, error: 'You can attach a maximum of 5 photos per review.' };
  }

  const cleanPhotos: { id: string; url: string; caption?: string }[] = [];
  for (let i = 0; i < rawPhotos.length; i++) {
    const item = rawPhotos[i];
    const url = typeof item === 'string' ? item.trim() : String(item?.url ?? '').trim();
    if (!url) continue;
    if (url.startsWith('data:image/') && url.length > 100000) {
      return {
        valid: false,
        error: 'Large base64 images are not allowed. Please upload photos via the binary upload service.',
      };
    }
    cleanPhotos.push({
      id: typeof item?.id === 'string' && item.id ? item.id : `rev-photo-${Date.now()}-${i}`,
      url,
      caption: typeof item?.caption === 'string' ? item.caption.trim() : undefined,
    });
  }

  return {
    valid: true,
    sanitized: {
      rating: roundedRating,
      title: cleanTitle || `${roundedRating}-Star Rating`,
      comment: cleanComment,
      photos: cleanPhotos,
    },
  };
}

/**
 * Checks whether a customer has a verified purchase of a specific product from actual order records.
 */
export function hasVerifiedPurchaseForProduct(
  orders: AdminOrder[],
  customerId: string | undefined,
  customerEmail: string | undefined,
  productId: string
): boolean {
  if (!customerId && !customerEmail) return false;
  const cleanEmail = (customerEmail ?? '').trim().toLowerCase();

  return orders.some((order) => {
    if (order.status === 'Cancelled') return false;
    const matchesCustomer =
      (customerId && order.customerId === customerId) ||
      (cleanEmail && order.customerEmail.toLowerCase() === cleanEmail);
    if (!matchesCustomer) return false;
    return order.items.some((item) => item.productId === productId);
  });
}

/**
 * Toggles a customer's helpful vote on a review or answer (prevents duplicate inflation and allows undo).
 */
export function toggleHelpfulVoterList(
  voterIds: string[],
  customerId: string
): { updatedVoterIds: string[]; helpfulCount: number; voted: boolean } {
  const cleanId = customerId.trim();
  const unique = Array.from(new Set(voterIds));
  const exists = unique.includes(cleanId);
  const updatedVoterIds = exists
    ? unique.filter((id) => id !== cleanId)
    : [...unique, cleanId];

  return {
    updatedVoterIds,
    helpfulCount: updatedVoterIds.length,
    voted: !exists,
  };
}

/**
 * Computes estimated delivery date and zone details for a 6-digit Indian PIN code.
 */
export function estimateDeliveryByPinCode(
  pinCode: string,
  referenceDate: Date = new Date()
): {
  valid: boolean;
  error?: string;
  zoneLabel?: string;
  estimatedDays?: number;
  estimatedDateFormatted?: string;
  codEligible?: boolean;
} {
  const cleanPin = String(pinCode ?? '').trim();
  if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
    return {
      valid: false,
      error: 'Please enter a valid 6-digit Indian PIN code (e.g., 560001, 400001, 110001).',
    };
  }

  const prefix2 = cleanPin.slice(0, 2);
  const metroPrefixes = ['11', '40', '56', '60', '50', '70', '41', '38'];
  const isMetro = metroPrefixes.includes(prefix2);
  const estimatedDays = isMetro ? 2 : 4;
  const zoneLabel = isMetro
    ? 'Express Metro Hub (2-Day Air/Surface)'
    : 'Standard National Surface (4-Day)';

  const targetDate = new Date(referenceDate.getTime() + estimatedDays * 24 * 3600 * 1000);
  const estimatedDateFormatted = targetDate.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return {
    valid: true,
    zoneLabel,
    estimatedDays,
    estimatedDateFormatted,
    codEligible: true,
  };
}

/**
 * Validates and normalizes an email address for out-of-stock 'Notify Me' alerts.
 */
export function validateStockAlertEmail(rawEmail: unknown): {
  valid: boolean;
  normalizedEmail: string;
  error?: string;
} {
  const normalizedEmail = String(rawEmail ?? '').trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      valid: false,
      normalizedEmail: '',
      error: 'Please enter your email address to receive a back-in-stock alert.',
    };
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 160) {
    return {
      valid: false,
      normalizedEmail,
      error: 'Please enter a valid email address (e.g., name@example.com).',
    };
  }
  return {
    valid: true,
    normalizedEmail,
  };
}

/**
 * Validates that a product (or specific variant) exists and is currently out of stock
 * before allowing a back-in-stock alert subscription.
 */
export function validateProductAvailabilityForStockAlert(
  product: Pick<AdminProduct, 'id' | 'name' | 'stock' | 'status' | 'variants'> | undefined | null,
  variantId?: string
): {
  valid: boolean;
  statusCode: 200 | 400 | 404;
  effectiveStock: number;
  resolvedVariant?: ProductVariant;
  error?: string;
} {
  if (!product || product.status === 'Archived') {
    return {
      valid: false,
      statusCode: 404,
      effectiveStock: 0,
      error: 'Product not found.',
    };
  }

  const cleanVariantId = variantId?.trim();
  const resolvedVariant = cleanVariantId
    ? product.variants?.find(
        (v) =>
          v.id.toLowerCase() === cleanVariantId.toLowerCase() ||
          v.skuSuffix.toLowerCase() === cleanVariantId.toLowerCase()
      )
    : undefined;

  const effectiveStock = resolvedVariant ? resolvedVariant.stock : product.stock;

  if (effectiveStock > 0) {
    return {
      valid: false,
      statusCode: 400,
      effectiveStock,
      resolvedVariant,
      error: resolvedVariant
        ? `This product variant is currently in stock (${effectiveStock} available) and ready for immediate purchase.`
        : `This product is currently in stock (${effectiveStock} available) and ready for immediate purchase.`,
    };
  }

  return {
    valid: true,
    statusCode: 200,
    effectiveStock: 0,
    resolvedVariant,
  };
}

/**
 * Upserts a 'Notify Me' stock alert subscription into the stock_alerts table without duplicates.
 * Ensures users cannot subscribe multiple times for the same item.
 */
export function upsertStockAlertSubscription(
  existingAlerts: StockAlertRecord[],
  payload: {
    productId: string;
    productName: string;
    email: string;
    variantId?: string;
    variantLabel?: string;
    customerId?: string;
    nowIso?: string;
  }
): {
  updatedAlerts: StockAlertRecord[];
  alert: StockAlertRecord;
  alreadySubscribed: boolean;
} {
  const cleanEmail = payload.email.trim().toLowerCase();
  const cleanVariantId = payload.variantId?.trim() || undefined;

  const existing = existingAlerts.find((item) => {
    if (item.status !== 'pending') return false;
    if (item.productId !== payload.productId) return false;
    if (item.email.toLowerCase() !== cleanEmail) return false;
    // Match either identical variantId or same product when variantId is not differentiating
    return (item.variantId || undefined) === cleanVariantId;
  });

  if (existing) {
    return {
      updatedAlerts: existingAlerts,
      alert: existing,
      alreadySubscribed: true,
    };
  }

  const now = payload.nowIso ?? new Date().toISOString();
  const newAlert: StockAlertRecord = {
    id: `stk-alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    productId: payload.productId,
    productName: payload.productName,
    variantId: cleanVariantId,
    variantLabel: payload.variantLabel?.trim() || undefined,
    email: cleanEmail,
    customerId: payload.customerId,
    status: 'pending',
    createdAt: now,
  };

  return {
    updatedAlerts: [...existingAlerts, newAlert],
    alert: newAlert,
    alreadySubscribed: false,
  };
}

