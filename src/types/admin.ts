import type { CategoryId, HeroSlide, ProductArtworkKey } from './store.ts';

export type AdminRole =
  | 'SUPER_ADMIN'
  | 'PRODUCT_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'ORDER_MANAGER'
  | 'CONTENT_MANAGER';

export type ProductStatus = 'Draft' | 'Active' | 'Inactive' | 'Archived';

export interface AdminStaffUser {
  id: string;
  email: string;
  username: string;
  name: string;
  role: AdminRole;
  status: 'Active' | 'Suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export interface ProductImageAsset {
  id: string;
  url: string;
  alt: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  model?: string;
  skuSuffix: string;
  priceOverride?: number;
  stock: number;
}

export interface ProductSpecAttribute {
  key: string;
  value: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  sku: string;
  description: string;
  shortDescription: string;
  category: CategoryId | string;
  subcategory: string;
  brand: string;
  price: number; // selling / discount price shown to customers
  regularPrice: number; // original MRP
  discountType: 'percentage' | 'fixed' | 'none';
  discountValue: number;
  saleStartDate?: string;
  saleEndDate?: string;
  costPrice?: number; // strictly visible only to authorized admins
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  tags: string[];
  weight?: string;
  dimensions?: string;
  variants: ProductVariant[];
  specifications: ProductSpecAttribute[];
  highlights: string[];
  warranty?: string;
  images: ProductImageAsset[];
  artwork: ProductArtworkKey;
  rating: number;
  reviewCount: number;
  featured: boolean;
  trending: boolean;
  specialOffer: boolean;
  demoTag: string;
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  previousRegularPrice: number;
  newRegularPrice: number;
  previousSellingPrice: number;
  newSellingPrice: number;
  adminUsername: string;
  timestamp: string;
}

export interface StockHistoryEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  previousStock: number;
  newStock: number;
  adjustment: number;
  reason: string;
  adminUsername: string;
  timestamp: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  parentCategory: string | null;
  description: string;
  imageUrl?: string;
  displayOrder: number;
  status: 'Active' | 'Inactive';
  itemCount?: number;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl?: string;
  status: 'Active' | 'Inactive';
}

export interface PaymentGatewaySettings {
  upiEnabled: boolean;
  cardsNetbankingEnabled: boolean;
  codEnabled: boolean;
  codFee: number;
  codMinOrder: number;
  codMaxOrder: number;
  freeDeliveryThreshold: number;
  standardDeliveryFee: number;
  returnWindowDays: number;
  razorpayConfigured?: boolean;
  razorpayKeyIdPublic?: string;
}

export interface StorefrontConfig {
  brandName: string;
  tagline: string;
  customLogoUrl: string;
  announcementBarText: string;
  announcementBarActive: boolean;
  heroBanners: HeroSlide[];
  featuredSectionTitle: string;
  trendingSectionTitle: string;
  footerTagline: string;
  supportEmail: string;
  supportHours: string;
  paymentSettings?: PaymentGatewaySettings;
  updatedAt: string;
}

export type OrderStatus =
  | 'Order Placed'
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled'
  | 'Return Requested'
  | 'Returned'
  | 'Refunded';

export type PaymentMethodType = 'UPI' | 'CARD_NETBANKING' | 'COD';

export type UpiAppOption = 'Google Pay' | 'PhonePe' | 'CRED' | 'BHIM' | 'UPI ID';

export type PaymentRecordStatus =
  | 'Pending'
  | 'Unpaid (COD)'
  | 'Verified Paid'
  | 'Failed'
  | 'Cancelled'
  | 'Refunded';

export interface AdminOrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  regularPrice?: number;
  artwork?: ProductArtworkKey;
  primaryImageUrl?: string;
  selectedVariant?: string;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  location?: string;
  note: string;
  updatedBy: string;
  timestamp: string;
}

export interface CustomerAddress {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

export interface ReturnRequestRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  type: 'Return & Refund' | 'Replacement';
  reason: string;
  status: 'Requested' | 'Approved' | 'Rejected' | 'Completed';
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerEmail: string;
  amount: number;
  method: PaymentMethodType;
  providerDetail: string; // e.g., "Google Pay (UPI)", "Razorpay Card", "Cash on Delivery"
  status: PaymentRecordStatus;
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignatureVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNotification {
  id: string;
  customerId: string;
  title: string;
  message: string;
  type: 'order' | 'payment' | 'return' | 'account';
  read: boolean;
  createdAt: string;
}

export interface CouponCodeRecord {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  active: boolean;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingAddressStructured?: CustomerAddress;
  items: AdminOrderItem[];
  itemsSubtotal?: number;
  productDiscountTotal?: number;
  couponCode?: string;
  couponDiscount?: number;
  deliveryFee?: number;
  codFee?: number;
  includedGstAmount?: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus:
    | 'Pending Gateway Integration'
    | 'Cash on Delivery (Pending)'
    | 'Unpaid (COD)'
    | 'Verified Paid'
    | 'Payment Failed'
    | 'Payment Cancelled'
    | 'Refunded';
  paymentMethod: PaymentMethodType;
  paymentProviderDetail?: string;
  transactionReference?: string;
  courierName?: string;
  trackingNumber: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: string;
  cancellationReason?: string;
  returnRequest?: ReturnRequestRecord;
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
}

export interface CustomerAccount {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  gender?: string;
  dateOfBirth?: string;
  addresses?: CustomerAddress[];
  wishlistProductIds?: string[];
  recentlyViewedIds?: string[];
  status: 'Active' | 'Suspended';
  createdAt: string;
  orderCount: number;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: AdminRole;
  action: string;
  target: string;
  timestamp: string;
}

export interface AdminDashboardOverview {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalCategories: number;
  totalBrands: number;
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  verifiedRevenue: number;
  lowStockAlerts: AdminProduct[];
  recentOrders: AdminOrder[];
  priceHistory: PriceHistoryEntry[];
  stockHistory: StockHistoryEntry[];
  auditLogs: AuditLogEntry[];
}

export interface ProductReviewPhoto {
  id: string;
  url: string;
  caption?: string;
}

export interface ProductReviewReport {
  id: string;
  reviewId: string;
  productId: string;
  reporterCustomerId: string;
  reason: 'Spam' | 'Abuse' | 'Misleading' | 'Inappropriate';
  comment?: string;
  createdAt: string;
}

export interface ProductReviewRecord {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1 to 5
  title: string;
  comment: string;
  photos: ProductReviewPhoto[];
  verifiedPurchase: boolean;
  selectedVariant?: string;
  helpfulVoterIds: string[];
  helpfulCount: number;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductRatingSummary {
  averageRating: number;
  totalRatings: number;
  totalWrittenReviews: number;
  verifiedPurchaseCount: number;
  withPhotosCount: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  distributionPercent: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ProductAnswerRecord {
  id: string;
  questionId: string;
  productId: string;
  authorId: string;
  authorName: string;
  authorRole: 'Verified Seller' | 'Verified Buyer' | 'Customer';
  answerText: string;
  helpfulVoterIds: string[];
  helpfulCount: number;
  reportedByIds: string[];
  createdAt: string;
}

export interface ProductQuestionRecord {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  questionText: string;
  answers: ProductAnswerRecord[];
  createdAt: string;
}

export interface StockAlertRecord {
  id: string;
  productId: string;
  productName: string;
  variantId?: string;
  variantLabel?: string;
  email: string;
  customerId?: string;
  status: 'pending' | 'notified';
  createdAt: string;
  notifiedAt?: string;
}
