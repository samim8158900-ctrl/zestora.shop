import type { CartItem, CategoryId, Product, SortOption } from '../types/store.ts';

/**
 * Formats a numeric price in Indian Rupees (INR) using the en-IN locale.
 */
export function formatINR(amount: number): string {
  const safeAmount = Math.max(0, Math.round(amount));
  return `₹${safeAmount.toLocaleString('en-IN')}`;
}

/**
 * Calculates percentage discount between original MRP and selling price.
 */
export function calculateDiscountPercent(price: number, originalPrice?: number): number {
  if (!originalPrice || originalPrice <= price || originalPrice <= 0) {
    return 0;
  }
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

/**
 * Adds a product to the cart or increments its quantity if already present.
 */
export function addItemToCart(cart: CartItem[], product: Product, quantityToAdd = 1): CartItem[] {
  if (quantityToAdd <= 0) return [...cart];
  const existingIndex = cart.findIndex((item) => item.product.id === product.id);
  if (existingIndex === -1) {
    return [...cart, { product, quantity: quantityToAdd }];
  }
  return cart.map((item, idx) =>
    idx === existingIndex ? { ...item, quantity: item.quantity + quantityToAdd } : item
  );
}

/**
 * Updates the quantity of a specific product in the cart. Removes the item if quantity <= 0.
 */
export function updateCartItemQuantity(
  cart: CartItem[],
  productId: string,
  newQuantity: number
): CartItem[] {
  if (newQuantity <= 0) {
    return cart.filter((item) => item.product.id !== productId);
  }
  return cart.map((item) =>
    item.product.id === productId ? { ...item, quantity: newQuantity } : item
  );
}

/**
 * Removes a product from the cart by ID.
 */
export function removeItemFromCart(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter((item) => item.product.id !== productId);
}

/**
 * Computes aggregate cart metrics: total item count, subtotal, total MRP, total savings, and delivery fee.
 */
export function calculateCartSummary(cart: CartItem[]): {
  totalItems: number;
  subtotal: number;
  totalOriginalPrice: number;
  totalSavings: number;
  deliveryFee: number;
  grandTotal: number;
} {
  let totalItems = 0;
  let subtotal = 0;
  let totalOriginalPrice = 0;

  for (const item of cart) {
    totalItems += item.quantity;
    subtotal += item.product.price * item.quantity;
    const mrp = item.product.originalPrice ?? item.product.price;
    totalOriginalPrice += mrp * item.quantity;
  }

  const totalSavings = Math.max(0, totalOriginalPrice - subtotal);
  const deliveryFee = subtotal === 0 || subtotal >= 999 ? 0 : 79;
  const grandTotal = subtotal + deliveryFee;

  return {
    totalItems,
    subtotal,
    totalOriginalPrice,
    totalSavings,
    deliveryFee,
    grandTotal,
  };
}

/**
 * Filters and sorts products based on search query, category filter, and sort option.
 */
export function filterAndSortProducts(
  products: Product[],
  options: {
    searchQuery?: string;
    category?: CategoryId | 'All';
    sortBy?: SortOption;
    onlyFeatured?: boolean;
    onlyTrending?: boolean;
  }
): Product[] {
  const query = (options.searchQuery ?? '').trim().toLowerCase();
  const category = options.category ?? 'All';
  const sortBy = options.sortBy ?? 'featured';

  const filtered = products.filter((product) => {
    if (options.onlyFeatured && !product.featured) return false;
    if (options.onlyTrending && !product.trending) return false;
    if (category !== 'All' && product.category !== category) return false;

    if (query.length > 0) {
      const searchable = [
        product.name,
        product.category,
        product.shortDescription,
        ...product.highlights,
      ]
        .join(' ')
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    return true;
  });

  const sorted = [...filtered];
  if (sortBy === 'price-asc') {
    sorted.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    sorted.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'rating-desc') {
    sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  }

  return sorted;
}

/**
 * Calculates clamped percentage coordinates (0 to 100) for cursor-tracking hover-to-zoom on product images.
 */
export function calculateZoomPosition(
  offsetX: number,
  offsetY: number,
  width: number,
  height: number
): { xPercent: number; yPercent: number } {
  if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) {
    return { xPercent: 50, yPercent: 50 };
  }
  const rawX = (offsetX / width) * 100;
  const rawY = (offsetY / height) * 100;
  const xPercent = Math.round(Math.min(100, Math.max(0, rawX)) * 100) / 100;
  const yPercent = Math.round(Math.min(100, Math.max(0, rawY)) * 100) / 100;
  return { xPercent, yPercent };
}
