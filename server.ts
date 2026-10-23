import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { CATEGORIES, DEMO_PRODUCTS, HERO_SLIDES } from './src/data/mockCatalog.ts';
import {
  hasAdminPermission,
  validateAndComputePricing,
  validateProductImageFile,
  type PermissionDomain,
} from './src/utils/adminPricingAndRbac.ts';
import {
  calculateServerOrderTotals,
  canCustomerCancelOrder,
  canCustomerRequestReturn,
  DEFAULT_COUPONS,
  DEFAULT_PAYMENT_SETTINGS,
  validateCodEligibility,
} from './src/utils/checkoutAndOrderLogic.ts';
import {
  calculateRatingSummary,
  filterAndSortReviews,
  hasVerifiedPurchaseForProduct,
  toggleHelpfulVoterList,
  validateReviewSubmission,
  validateStockAlertEmail,
  validateProductAvailabilityForStockAlert,
  upsertStockAlertSubscription,
  type ReviewSortOption,
  type ReviewStarFilter,
} from './src/utils/reviewAndProductLogic.ts';
import {
  STOCK_ALERTS_TABLE_NAME,
  STOCK_ALERTS_TABLE_SCHEMA,
  STOCK_ALERTS_SQL_SCHEMA,
} from './src/db/schema.ts';
import type {
  AdminBrand,
  AdminCategory,
  AdminOrder,
  AdminProduct,
  AdminRole,
  AdminStaffUser,
  AuditLogEntry,
  CouponCodeRecord,
  CustomerAccount,
  CustomerAddress,
  CustomerNotification,
  OrderStatus,
  PaymentGatewaySettings,
  PaymentMethodType,
  PaymentTransactionRecord,
  PriceHistoryEntry,
  ProductAnswerRecord,
  ProductQuestionRecord,
  ProductReviewRecord,
  ProductReviewReport,
  ReturnRequestRecord,
  StockAlertRecord,
  StockHistoryEntry,
  StorefrontConfig,
} from './src/types/admin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'zestora-db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'products');
const UPLOADS_REVIEWS_DIR = path.join(__dirname, 'uploads', 'reviews');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_REVIEWS_DIR, { recursive: true });

interface StoredStaffUser extends AdminStaffUser {
  passwordHash: string;
  passwordSalt: string;
}

interface StoredCustomer extends CustomerAccount {
  passwordHash: string;
  passwordSalt: string;
}

interface AdminSessionRecord {
  token: string;
  userId: string;
  expiresAt: number;
}

interface CustomerSessionRecord {
  token: string;
  customerId: string;
  expiresAt: number;
}

interface PasswordResetOtpRecord {
  identifier: string;
  customerId: string;
  otp: string;
  expiresAt: number;
}

interface DatabaseSchema {
  staff: StoredStaffUser[];
  products: AdminProduct[];
  categories: AdminCategory[];
  brands: AdminBrand[];
  orders: AdminOrder[];
  customers: StoredCustomer[];
  storefront: StorefrontConfig;
  coupons: CouponCodeRecord[];
  paymentTransactions: PaymentTransactionRecord[];
  returnRequests: ReturnRequestRecord[];
  notifications: CustomerNotification[];
  priceHistory: PriceHistoryEntry[];
  stockHistory: StockHistoryEntry[];
  auditLogs: AuditLogEntry[];
  reviews: ProductReviewRecord[];
  reviewReports: ProductReviewReport[];
  questions: ProductQuestionRecord[];
  stock_alerts: StockAlertRecord[];
  sessions: AdminSessionRecord[];
  customerSessions: CustomerSessionRecord[];
  passwordResetOtps: PasswordResetOtpRecord[];
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt ?? crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash: derived, salt: actualSalt };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey && rest.length > 0) {
      out[rawKey] = decodeURIComponent(rest.join('='));
    }
  }
  return out;
}

function createInitialSeedDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  const initialEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@zestora.in').trim().toLowerCase();
  const initialUsername = (process.env.ADMIN_INITIAL_USERNAME || 'admin').trim();
  const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || 'ZestoraAdmin@2026';

  const superAdminCreds = hashPassword(initialPassword);
  const pmCreds = hashPassword('ProductMgr@2026');
  const invCreds = hashPassword('InventoryMgr@2026');
  const ordCreds = hashPassword('OrderMgr@2026');
  const cntCreds = hashPassword('ContentMgr@2026');

  const staff: StoredStaffUser[] = [
    {
      id: 'staff-super-1',
      email: initialEmail,
      username: initialUsername,
      name: 'Aarav Mehta (Super Admin)',
      role: 'SUPER_ADMIN',
      status: 'Active',
      createdAt: now,
      passwordHash: superAdminCreds.hash,
      passwordSalt: superAdminCreds.salt,
    },
    {
      id: 'staff-pm-2',
      email: 'products@zestora.in',
      username: 'product_mgr',
      name: 'Priya Nair (Product Manager)',
      role: 'PRODUCT_MANAGER',
      status: 'Active',
      createdAt: now,
      passwordHash: pmCreds.hash,
      passwordSalt: pmCreds.salt,
    },
    {
      id: 'staff-inv-3',
      email: 'inventory@zestora.in',
      username: 'inventory_mgr',
      name: 'Rohan Kulkarni (Inventory Manager)',
      role: 'INVENTORY_MANAGER',
      status: 'Active',
      createdAt: now,
      passwordHash: invCreds.hash,
      passwordSalt: invCreds.salt,
    },
    {
      id: 'staff-ord-4',
      email: 'orders@zestora.in',
      username: 'order_mgr',
      name: 'Ananya Sharma (Order Manager)',
      role: 'ORDER_MANAGER',
      status: 'Active',
      createdAt: now,
      passwordHash: ordCreds.hash,
      passwordSalt: ordCreds.salt,
    },
    {
      id: 'staff-cnt-5',
      email: 'content@zestora.in',
      username: 'content_mgr',
      name: 'Kabir Verma (Content Manager)',
      role: 'CONTENT_MANAGER',
      status: 'Active',
      createdAt: now,
      passwordHash: cntCreds.hash,
      passwordSalt: cntCreds.salt,
    },
  ];

  const baseCategories: AdminCategory[] = CATEGORIES.map((cat, idx) => ({
    id: `cat-${idx + 1}`,
    name: cat.name,
    slug: cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    parentCategory: null,
    description: cat.description,
    displayOrder: idx + 1,
    status: 'Active',
  }));

  const extraSubcategories: AdminCategory[] = [
    {
      id: 'cat-sub-clothing',
      name: 'Clothing',
      slug: 'clothing',
      parentCategory: 'Fashion',
      description: 'Everyday shirts, hoodies, knitwear, and seasonal outerwear',
      displayOrder: 9,
      status: 'Active',
    },
    {
      id: 'cat-sub-mens',
      name: "Men's Fashion",
      slug: 'mens-fashion',
      parentCategory: 'Fashion',
      description: 'Tailored menswear, casual hoodies, overshirts, and activewear',
      displayOrder: 10,
      status: 'Active',
    },
    {
      id: 'cat-sub-womens',
      name: "Women's Fashion",
      slug: 'womens-fashion',
      parentCategory: 'Fashion',
      description: 'Contemporary womenswear, relaxed layers, and curated essentials',
      displayOrder: 11,
      status: 'Active',
    },
  ];

  const brands: AdminBrand[] = [
    {
      id: 'brand-1',
      name: 'Zestora Originals',
      slug: 'zestora-originals',
      description: 'Flagship in-house consumer tech and lifestyle essentials',
      status: 'Active',
    },
    {
      id: 'brand-2',
      name: 'SonicPro Audio',
      slug: 'sonicpro-audio',
      description: 'High-fidelity wireless headphones and studio acoustic gear',
      status: 'Active',
    },
    {
      id: 'brand-3',
      name: 'AeroStride',
      slug: 'aerostride',
      description: 'Performance running footwear and engineered athletic sneakers',
      status: 'Active',
    },
    {
      id: 'brand-4',
      name: 'BaristaCraft',
      slug: 'baristacraft',
      description: 'Precision espresso machines and modern kitchen appliances',
      status: 'Active',
    },
    {
      id: 'brand-5',
      name: 'Nordic Loom',
      slug: 'nordic-loom',
      description: 'GOTS-certified organic cotton streetwear and knitwear',
      status: 'Active',
    },
    {
      id: 'brand-6',
      name: 'LuminaBotanical',
      slug: 'luminabotanical',
      description: 'Dermatologist-tested clean skincare and active serums',
      status: 'Active',
    },
  ];

  const brandByCategory: Record<string, { brand: string; sub: string }> = {
    Electronics: { brand: 'SonicPro Audio', sub: 'Wireless Audio & Tech' },
    Fashion: { brand: 'Nordic Loom', sub: "Men's Fashion" },
    Footwear: { brand: 'AeroStride', sub: 'Running Shoes' },
    'Home and Kitchen': { brand: 'BaristaCraft', sub: 'Kitchen Appliances' },
    Beauty: { brand: 'LuminaBotanical', sub: 'Skincare Serums' },
    Sports: { brand: 'Zestora Originals', sub: 'Home Gym Equipment' },
    Accessories: { brand: 'Zestora Originals', sub: 'Travel & Eyewear' },
    Toys: { brand: 'Zestora Originals', sub: 'STEM & Educational' },
  };

  const stockSeeds = [42, 28, 19, 4, 35, 14, 3, 22, 0, 18, 11, 27];

  const products: AdminProduct[] = DEMO_PRODUCTS.map((p, index) => {
    const regularPrice = p.originalPrice ?? p.price;
    const discountPercent =
      regularPrice > p.price ? Math.round(((regularPrice - p.price) / regularPrice) * 100) : 0;
    const meta = brandByCategory[p.category] ?? { brand: 'Zestora Originals', sub: 'General' };
    const seededStock = stockSeeds[index % stockSeeds.length];

    return {
      id: p.id,
      name: p.name,
      sku: `ZST-${p.category.slice(0, 3).toUpperCase()}-${1001 + index}`,
      description: `${p.shortDescription} Crafted for durability and everyday performance with Zestora quality assurance.`,
      shortDescription: p.shortDescription,
      category: p.category,
      subcategory: meta.sub,
      brand: meta.brand,
      price: p.price,
      regularPrice,
      discountType: discountPercent > 0 ? 'percentage' : 'none',
      discountValue: discountPercent,
      costPrice: Math.round(p.price * 0.62),
      stock: seededStock,
      lowStockThreshold: 5,
      status: 'Active',
      tags: [p.category.toLowerCase(), meta.brand.toLowerCase(), 'zestora'],
      weight: '480 g',
      dimensions: '22 × 16 × 9 cm',
      variants: [
        {
          id: `var-${p.id}-1`,
          size: 'Standard',
          color: 'Signature Blue / Matte Slate',
          model: '2026 Edition',
          skuSuffix: 'STD',
          stock: seededStock,
        },
        {
          id: `var-${p.id}-2`,
          size: 'Collector Edition',
          color: 'Obsidian Matte / Gold Trim',
          model: 'Limited Drop',
          skuSuffix: 'LTD',
          stock: 0,
        },
      ],
      specifications: p.highlights.map((h, i) => ({
        key: `Specification ${i + 1}`,
        value: h,
      })),
      highlights: p.highlights,
      warranty: '1 Year Zestora Manufacturer Warranty',
      images: [],
      artwork: p.artwork,
      rating: p.rating,
      reviewCount: p.reviewCount,
      featured: p.featured,
      trending: p.trending,
      specialOffer: Boolean(p.specialOffer),
      demoTag: p.demoTag,
      createdAt: now,
      updatedAt: now,
    };
  });

  // Seed a demo customer account so evaluators can test one-click login or register new accounts
  const demoCustomerCreds = hashPassword('Customer@2026');
  const defaultAddress: CustomerAddress = {
    id: 'addr-demo-1',
    label: 'Home',
    recipientName: 'Diya Kapoor',
    phone: '+91 98201 44550',
    line1: 'Flat 402, Skyview Residency, Indiranagar 100 Feet Road',
    line2: 'Near Metro Station',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560038',
    isDefault: true,
  };

  const workAddress: CustomerAddress = {
    id: 'addr-demo-2',
    label: 'Work',
    recipientName: 'Diya Kapoor',
    phone: '+91 98201 44550',
    line1: 'Tower B, 7th Floor, Prestige Tech Park, Outer Ring Road',
    line2: 'Marathahalli',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560103',
    isDefault: false,
  };

  const seededCustomers: StoredCustomer[] = [
    {
      id: 'cust-demo-1',
      fullName: 'Diya Kapoor',
      email: 'diya.kapoor@example.com',
      mobile: '+91 98201 44550',
      gender: 'Female',
      dateOfBirth: '1996-08-14',
      addresses: [defaultAddress, workAddress],
      wishlistProductIds: ['zest-1', 'zest-3'],
      recentlyViewedIds: ['zest-1', 'zest-4', 'zest-6'],
      status: 'Active',
      createdAt: now,
      orderCount: 1,
      passwordHash: demoCustomerCreds.hash,
      passwordSalt: demoCustomerCreds.salt,
    },
  ];

  const estDelivery = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const seededOrders: AdminOrder[] = [
    {
      id: 'order-seed-1001',
      orderNumber: 'ZST-ORD-1001',
      customerId: 'cust-demo-1',
      customerName: 'Diya Kapoor',
      customerEmail: 'diya.kapoor@example.com',
      customerPhone: '+91 98201 44550',
      shippingAddress:
        'Flat 402, Skyview Residency, Indiranagar 100 Feet Road, Near Metro Station, Bengaluru, Karnataka - 560038',
      shippingAddressStructured: defaultAddress,
      items: [
        {
          productId: 'zest-1',
          productName: 'Zestora SonicPro ANC Wireless Headphones',
          sku: 'ZST-ELE-1001',
          quantity: 1,
          unitPrice: 4999,
          regularPrice: 7999,
          artwork: 'anc-headphones',
          selectedVariant: 'Signature Blue / Matte Slate',
        },
      ],
      itemsSubtotal: 4999,
      productDiscountTotal: 3000,
      couponCode: 'ZESTORA10',
      couponDiscount: 500,
      deliveryFee: 0,
      codFee: 0,
      includedGstAmount: 482,
      totalAmount: 4499,
      status: 'Shipped',
      paymentStatus: 'Verified Paid',
      paymentMethod: 'UPI',
      paymentProviderDetail: 'Google Pay (UPI)',
      transactionReference: 'ZST-PAY-8841209',
      courierName: 'BlueDart Priority Air',
      trackingNumber: 'ZST-TRK-740912',
      trackingUrl: 'https://www.bluedart.com/tracking?awb=ZST-TRK-740912',
      estimatedDeliveryDate: estDelivery,
      statusHistory: [
        {
          status: 'Shipped',
          location: 'Bengaluru Regional Sort Facility',
          note: 'Dispatched via BlueDart Priority Air (AWB: ZST-TRK-740912)',
          updatedBy: 'order_mgr',
          timestamp: now,
        },
        {
          status: 'Packed',
          location: 'Zestora Fulfillment Hub — Bhiwandi',
          note: 'Quality verified, invoice attached, and parcel sealed',
          updatedBy: 'inventory_mgr',
          timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
        },
        {
          status: 'Processing',
          location: 'Zestora Fulfillment Hub — Bhiwandi',
          note: 'Items picked from warehouse bin A-14',
          updatedBy: 'order_mgr',
          timestamp: new Date(Date.now() - 3600 * 1000 * 9).toISOString(),
        },
        {
          status: 'Confirmed',
          location: 'Zestora Operations',
          note: 'Payment verified via Google Pay UPI & order confirmed',
          updatedBy: 'system',
          timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        },
        {
          status: 'Order Placed',
          location: 'Zestora Storefront',
          note: 'Order placed by Diya Kapoor',
          updatedBy: 'diya.kapoor@example.com',
          timestamp: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        },
      ],
      createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    },
  ];

  const storefront: StorefrontConfig = {
    brandName: 'Zestora',
    tagline: 'Shop More · Live Better',
    customLogoUrl: '',
    announcementBarText:
      'Free Express Delivery on orders above ₹999 · Use code ZESTORA10 for 10% Instant Discount',
    announcementBarActive: true,
    heroBanners: HERO_SLIDES,
    featuredSectionTitle: 'Featured Products & Best Deals',
    trendingSectionTitle: 'Trending Products on Zestora',
    footerTagline:
      'Zestora is a modern e-commerce shopping platform designed for effortless discovery across electronics, fashion, footwear, home essentials, beauty, sports, accessories, and toys.',
    supportEmail: 'support@zestora-demo.in',
    supportHours: 'Mon–Sat, 9:00 AM – 8:00 PM IST',
    paymentSettings: {
      ...DEFAULT_PAYMENT_SETTINGS,
      razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      razorpayKeyIdPublic: process.env.RAZORPAY_KEY_ID || '',
    },
    updatedAt: now,
  };

  return {
    staff,
    products,
    categories: [...baseCategories, ...extraSubcategories],
    brands,
    orders: seededOrders,
    customers: seededCustomers,
    storefront,
    coupons: DEFAULT_COUPONS,
    paymentTransactions: [
      {
        id: 'pay-seed-1',
        orderId: 'order-seed-1001',
        orderNumber: 'ZST-ORD-1001',
        customerId: 'cust-demo-1',
        customerEmail: 'diya.kapoor@example.com',
        amount: 4499,
        method: 'UPI',
        providerDetail: 'Google Pay (UPI)',
        status: 'Verified Paid',
        gatewayOrderId: 'order_zst_seed_1001',
        gatewayPaymentId: 'ZST-PAY-8841209',
        gatewaySignatureVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    returnRequests: [],
    notifications: [
      {
        id: 'notif-seed-1',
        customerId: 'cust-demo-1',
        title: 'Order ZST-ORD-1001 Shipped!',
        message:
          'Your Zestora SonicPro ANC Wireless Headphones have been shipped via BlueDart Priority Air (Tracking: ZST-TRK-740912).',
        type: 'order',
        read: false,
        createdAt: now,
      },
    ],
    priceHistory: [],
    stockHistory: [],
    auditLogs: [
      {
        id: 'audit-init-1',
        actor: initialUsername,
        role: 'SUPER_ADMIN',
        action: 'System Initialized',
        target: 'Seeded initial admin roles, 11 categories, 6 brands, and 12 catalog products',
        timestamp: now,
      },
    ],
    reviews: [
      {
        id: 'rev-seed-1',
        productId: DEMO_PRODUCTS[0]?.id || 'zest-prod-101',
        customerId: 'cust-demo-1',
        customerName: 'Diya Kapoor',
        rating: 5,
        title: 'Studio-grade ANC and super comfortable memory-foam earcups',
        comment:
          'Ordered via Zestora Express (Order ZST-ORD-1001). The hybrid active noise cancellation blocks out office and metro noise effortlessly, and the 45-hour battery life easily lasts an entire week of calls and music.',
        photos: [],
        verifiedPurchase: true,
        selectedVariant: 'Obsidian Black · Standard Edition',
        helpfulVoterIds: [],
        helpfulCount: 0,
        reportCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    ],
    reviewReports: [],
    questions: [
      {
        id: 'qa-seed-1',
        productId: DEMO_PRODUCTS[0]?.id || 'zest-prod-101',
        customerId: 'cust-demo-1',
        customerName: 'Diya Kapoor',
        questionText: 'Does this support multipoint Bluetooth connection with both laptop and phone simultaneously?',
        answers: [
          {
            id: 'ans-seed-1',
            questionId: 'qa-seed-1',
            productId: DEMO_PRODUCTS[0]?.id || 'zest-prod-101',
            authorId: 'staff-super-1',
            authorName: 'Zestora Official Store',
            authorRole: 'Verified Seller',
            answerText:
              'Yes! It features Bluetooth 5.3 dual-device multipoint pairing so you can stay connected to your laptop and smartphone at the same time.',
            helpfulVoterIds: [],
            helpfulCount: 0,
            reportedByIds: [],
            createdAt: now,
          },
        ],
        createdAt: now,
      },
    ],
    stock_alerts: [],
    sessions: [],
    customerSessions: [],
    passwordResetOtps: [],
  };
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
      if (parsed && Array.isArray(parsed.staff) && Array.isArray(parsed.products)) {
        const seed = createInitialSeedDatabase();
        const mergedStorefront: StorefrontConfig = {
          ...seed.storefront,
          ...(parsed.storefront ?? {}),
          paymentSettings: {
            ...DEFAULT_PAYMENT_SETTINGS,
            ...(parsed.storefront?.paymentSettings ?? {}),
            razorpayConfigured: Boolean(
              process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
            ),
            razorpayKeyIdPublic: process.env.RAZORPAY_KEY_ID || '',
          },
        };
        const existingCustomers = Array.isArray(parsed.customers) ? parsed.customers : [];
        const hasDemoCust = existingCustomers.some((c) => c.email === 'diya.kapoor@example.com');
        const existingReviews = Array.isArray(parsed.reviews)
          ? parsed.reviews.filter((r) => r.productId !== 'demo-1')
          : [];
        const hasSeedReview = existingReviews.some((r) => r.id === 'rev-seed-1');
        const existingQuestions = Array.isArray(parsed.questions)
          ? parsed.questions.filter((q) => q.productId !== 'demo-1')
          : [];
        const hasSeedQa = existingQuestions.some((q) => q.id === 'qa-seed-1');

        const normalizedProducts = parsed.products.map((prod) => {
          const existingVariants = Array.isArray(prod.variants) ? prod.variants : [];
          const hasOutVariant = existingVariants.some((v) => v.stock === 0);
          if (!hasOutVariant && existingVariants.length === 1) {
            return {
              ...prod,
              variants: [
                ...existingVariants,
                {
                  id: `var-${prod.id}-2`,
                  size: 'Collector Edition',
                  color: 'Obsidian Matte / Gold Trim',
                  model: 'Limited Drop',
                  skuSuffix: 'LTD',
                  stock: 0,
                },
              ],
            };
          }
          return prod;
        });

        return {
          staff: parsed.staff,
          products: normalizedProducts,
          categories: Array.isArray(parsed.categories) ? parsed.categories : seed.categories,
          brands: Array.isArray(parsed.brands) ? parsed.brands : seed.brands,
          orders:
            Array.isArray(parsed.orders) && parsed.orders.length > 0
              ? parsed.orders
              : seed.orders,
          customers: hasDemoCust ? existingCustomers : [...seed.customers, ...existingCustomers],
          storefront: mergedStorefront,
          coupons: Array.isArray(parsed.coupons) && parsed.coupons.length > 0 ? parsed.coupons : DEFAULT_COUPONS,
          paymentTransactions: Array.isArray(parsed.paymentTransactions)
            ? parsed.paymentTransactions
            : seed.paymentTransactions,
          returnRequests: Array.isArray(parsed.returnRequests) ? parsed.returnRequests : [],
          notifications: Array.isArray(parsed.notifications)
            ? parsed.notifications
            : seed.notifications,
          priceHistory: Array.isArray(parsed.priceHistory) ? parsed.priceHistory : [],
          stockHistory: Array.isArray(parsed.stockHistory) ? parsed.stockHistory : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : seed.auditLogs,
          reviews: hasSeedReview ? existingReviews : [...seed.reviews, ...existingReviews],
          reviewReports: Array.isArray(parsed.reviewReports) ? parsed.reviewReports : [],
          questions: hasSeedQa ? existingQuestions : [...seed.questions, ...existingQuestions],
          stock_alerts: Array.isArray(parsed.stock_alerts) ? parsed.stock_alerts : [],
          sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
          customerSessions: Array.isArray(parsed.customerSessions) ? parsed.customerSessions : [],
          passwordResetOtps: Array.isArray(parsed.passwordResetOtps) ? parsed.passwordResetOtps : [],
        };
      }
    }
  } catch (err) {
    console.error('Error reading zestora-db.json, initializing fresh seed:', err);
  }
  const initial = createInitialSeedDatabase();
  saveDatabase(initial);
  return initial;
}

function saveDatabase(db: DatabaseSchema): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

let db: DatabaseSchema = loadDatabase();

function sanitizeStaffUser(user: StoredStaffUser): AdminStaffUser {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = user;
  return safe;
}

function sanitizeCustomer(customer: StoredCustomer): CustomerAccount {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = customer;
  return {
    ...safe,
    addresses: Array.isArray(safe.addresses) ? safe.addresses : [],
    wishlistProductIds: Array.isArray(safe.wishlistProductIds) ? safe.wishlistProductIds : [],
    recentlyViewedIds: Array.isArray(safe.recentlyViewedIds) ? safe.recentlyViewedIds : [],
  };
}

function addCustomerNotification(
  customerId: string | undefined,
  title: string,
  message: string,
  type: CustomerNotification['type'] = 'order'
) {
  if (!customerId) return;
  db.notifications.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    customerId,
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  });
  db.notifications = db.notifications.slice(0, 200);
}

function recordAudit(actor: AdminStaffUser, action: string, target: string) {
  db.auditLogs.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor: actor.username,
    role: actor.role,
    action,
    target,
    timestamp: new Date().toISOString(),
  });
  db.auditLogs = db.auditLogs.slice(0, 100);
}

interface AuthenticatedRequest extends Request {
  adminUser?: AdminStaffUser;
  adminToken?: string;
}

interface CustomerAuthenticatedRequest extends Request {
  customer?: StoredCustomer;
  customerToken?: string;
}

function extractAdminSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.zestora_admin_session) {
    return cookies.zestora_admin_session;
  }
  return null;
}

function extractCustomerSessionToken(req: Request): string | null {
  const customHeader = req.headers['x-customer-token'];
  if (typeof customHeader === 'string' && customHeader.trim()) {
    return customHeader.trim();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.zestora_customer_session) {
    return cookies.zestora_customer_session;
  }
  return null;
}

function resolveAuthenticatedCustomer(req: Request): StoredCustomer | null {
  const token = extractCustomerSessionToken(req);
  if (!token) return null;
  const now = Date.now();
  db.customerSessions = db.customerSessions.filter((s) => s.expiresAt > now);
  const session = db.customerSessions.find((s) => s.token === token);
  if (!session) return null;
  const customer = db.customers.find(
    (c) => c.id === session.customerId && c.status === 'Active'
  );
  return customer ?? null;
}

function requireCustomerAuth(
  req: CustomerAuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = extractCustomerSessionToken(req);
  const customer = resolveAuthenticatedCustomer(req);
  if (!customer || !token) {
    res.status(401).json({ error: 'Please sign in to your Zestora customer account to continue.' });
    return;
  }
  req.customer = customer;
  req.customerToken = token;
  next();
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractAdminSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Please sign in as an administrator.' });
    return;
  }

  const now = Date.now();
  db.sessions = db.sessions.filter((s) => s.expiresAt > now);
  const session = db.sessions.find((s) => s.token === token);
  if (!session) {
    res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    return;
  }

  const staffUser = db.staff.find((u) => u.id === session.userId && u.status === 'Active');
  if (!staffUser) {
    res.status(403).json({ error: 'Administrator account is inactive or unauthorized.' });
    return;
  }

  req.adminUser = sanitizeStaffUser(staffUser);
  req.adminToken = token;
  next();
}

function requireDomainPermission(domain: PermissionDomain) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.adminUser;
    if (!user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!hasAdminPermission(user.role, domain)) {
      res.status(403).json({
        error: `Access denied: Your role (${user.role}) does not have permission to modify ${domain}.`,
      });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // ============================================================================
  // PUBLIC STOREFRONT & CATALOG ROUTES
  // ============================================================================

  function formatPublicStorefrontProduct(p: AdminProduct) {
    const { costPrice: _cost, ...publicFields } = p;
    const productReviews = db.reviews.filter((r) => r.productId === p.id);
    const liveSummary =
      productReviews.length > 0 ? calculateRatingSummary(productReviews) : null;

    return {
      ...publicFields,
      rating: liveSummary ? liveSummary.averageRating : p.rating,
      reviewCount: liveSummary ? liveSummary.totalRatings : p.reviewCount,
      originalPrice: p.regularPrice,
      discountLabel:
        p.regularPrice > p.price
          ? `${Math.round(((p.regularPrice - p.price) / p.regularPrice) * 100)}% OFF`
          : undefined,
      inStock: p.stock > 0,
      primaryImageUrl:
        p.images.find((img) => img.isPrimary)?.url ?? p.images[0]?.url ?? undefined,
    };
  }

  function syncProductAggregateRating(productId: string) {
    const prod = db.products.find((p) => p.id === productId);
    if (!prod) return;
    const productReviews = db.reviews.filter((r) => r.productId === productId);
    const summary = calculateRatingSummary(productReviews);
    prod.rating = summary.averageRating;
    prod.reviewCount = summary.totalRatings;
    prod.updatedAt = new Date().toISOString();
  }

  app.get('/api/storefront/catalog', (_req: Request, res: Response) => {
    // Strip costPrice from public storefront products and only return Active products
    const publicProducts = db.products
      .filter((p) => p.status === 'Active')
      .map(formatPublicStorefrontProduct);

    const activeCategories = db.categories
      .filter((c) => c.status === 'Active')
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((cat) => ({
        ...cat,
        itemCount: publicProducts.filter(
          (p) => p.category === cat.name || p.subcategory === cat.name
        ).length,
      }));

    const activeBrands = db.brands.filter((b) => b.status === 'Active');
    const activeCoupons = db.coupons.filter((c) => c.active);

    res.json({
      products: publicProducts,
      categories: activeCategories,
      brands: activeBrands,
      coupons: activeCoupons,
      storefront: db.storefront,
    });
  });

  // ============================================================================
  // PRODUCT DETAILS PAGE, REVIEWS, HELPFUL VOTES, PHOTO UPLOADS & Q&A ROUTES
  // ============================================================================

  app.get('/api/storefront/products/:idOrSlug', (req: Request, res: Response) => {
    const rawParam = String(req.params.idOrSlug ?? '').trim().toLowerCase();
    const product = db.products.find(
      (p) =>
        p.status === 'Active' &&
        (p.id.toLowerCase() === rawParam ||
          p.sku.toLowerCase() === rawParam ||
          p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === rawParam)
    );

    if (!product) {
      res.status(404).json({ error: 'Product not found in active catalog.' });
      return;
    }

    const publicProduct = formatPublicStorefrontProduct(product);
    const productReviews = db.reviews.filter((r) => r.productId === product.id);
    const ratingSummary = calculateRatingSummary(productReviews);

    // Optional filtering and sorting query params
    const starQuery = req.query.star ? Number(req.query.star) : undefined;
    const starFilter: ReviewStarFilter =
      starQuery && [1, 2, 3, 4, 5].includes(starQuery)
        ? (starQuery as 1 | 2 | 3 | 4 | 5)
        : 'all';
    const withPhotosOnly = req.query.withPhotos === 'true';
    const verifiedOnly = req.query.verified === 'true';
    const rawSort = String(req.query.sortBy ?? 'helpful');
    const sortBy: ReviewSortOption = ['helpful', 'recent', 'rating-high', 'rating-low'].includes(
      rawSort
    )
      ? (rawSort as ReviewSortOption)
      : 'helpful';

    const filteredReviews = filterAndSortReviews(productReviews, {
      starFilter,
      withPhotosOnly,
      verifiedOnly,
      sortBy,
    });

    const productQuestions = db.questions
      .filter((q) => q.productId === product.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Related products from same category
    const relatedProducts = db.products
      .filter((p) => p.status === 'Active' && p.id !== product.id && p.category === product.category)
      .slice(0, 6)
      .map(formatPublicStorefrontProduct);

    // Frequently bought together based on actual order co-occurrences
    const coPurchasedCounts = new Map<string, number>();
    for (const ord of db.orders) {
      if (ord.status === 'Cancelled') continue;
      const hasThisProduct = ord.items.some((item) => item.productId === product.id);
      if (hasThisProduct) {
        for (const item of ord.items) {
          if (item.productId !== product.id) {
            coPurchasedCounts.set(
              item.productId,
              (coPurchasedCounts.get(item.productId) ?? 0) + item.quantity
            );
          }
        }
      }
    }

    const frequentlyBoughtTogether = Array.from(coPurchasedCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([coProdId]) => db.products.find((p) => p.id === coProdId && p.status === 'Active'))
      .filter((p): p is AdminProduct => Boolean(p))
      .slice(0, 3)
      .map(formatPublicStorefrontProduct);

    const authCustomer = resolveAuthenticatedCustomer(req);
    const isVerifiedBuyer = authCustomer
      ? hasVerifiedPurchaseForProduct(db.orders, authCustomer.id, authCustomer.email, product.id)
      : false;
    const customerExistingReview = authCustomer
      ? productReviews.find((r) => r.customerId === authCustomer.id) ?? null
      : null;

    const productStockAlerts = db.stock_alerts.filter(
      (a) => a.productId === product.id && a.status === 'pending'
    );
    const customerStockAlert = authCustomer
      ? productStockAlerts.find(
          (a) =>
            a.customerId === authCustomer.id ||
            a.email.toLowerCase() === authCustomer.email.toLowerCase()
        ) ?? null
      : null;

    res.json({
      product: publicProduct,
      ratingSummary,
      reviews: filteredReviews,
      allReviewsCount: productReviews.length,
      questions: productQuestions,
      relatedProducts,
      frequentlyBoughtTogether,
      stockAlertsCount: productStockAlerts.length,
      customerStockAlert,
      customerContext: {
        authenticated: Boolean(authCustomer),
        isVerifiedBuyer,
        existingReview: customerExistingReview,
      },
    });
  });

  // Upload Review Photo (Authenticated Customer Binary Storage in /uploads/reviews)
  app.post(
    '/api/customers/reviews/upload-photo',
    requireCustomerAuth,
    express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
      const rawFileName = String(req.headers['x-file-name'] ?? 'review-photo.png');
      const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

      const validation = validateProductImageFile(contentType, bodyBuffer.length);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const ext =
        contentType === 'image/jpeg'
          ? '.jpg'
          : contentType === 'image/webp'
          ? '.webp'
          : '.png';
      const baseSafe =
        path
          .basename(rawFileName, path.extname(rawFileName))
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .slice(0, 35) || 'review';
      const finalFileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${baseSafe}${ext}`;
      const filePath = path.join(UPLOADS_REVIEWS_DIR, finalFileName);

      fs.writeFileSync(filePath, bodyBuffer);

      const publicUrl = `/uploads/reviews/${finalFileName}`;
      res.status(201).json({
        id: `rev-img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: publicUrl,
        size: bodyBuffer.length,
        mimeType: contentType,
      });
    }
  );

  // Create or Update Customer Review & Rating for a Product
  app.post(
    '/api/storefront/products/:productId/reviews',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const productId = String(req.params.productId ?? '').trim();
      const product = db.products.find((p) => p.id === productId && p.status === 'Active');

      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const validation = validateReviewSubmission(req.body ?? {});
      if (!validation.valid || !validation.sanitized) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const verifiedPurchase = hasVerifiedPurchaseForProduct(
        db.orders,
        customer.id,
        customer.email,
        product.id
      );

      const now = new Date().toISOString();
      const existingIdx = db.reviews.findIndex(
        (r) => r.productId === product.id && r.customerId === customer.id
      );

      let savedReview: ProductReviewRecord;
      let isUpdate = false;

      if (existingIdx !== -1) {
        isUpdate = true;
        const existing = db.reviews[existingIdx];
        savedReview = {
          ...existing,
          rating: validation.sanitized.rating,
          title: validation.sanitized.title,
          comment: validation.sanitized.comment,
          photos: validation.sanitized.photos,
          verifiedPurchase,
          selectedVariant: req.body?.selectedVariant
            ? String(req.body.selectedVariant).trim()
            : existing.selectedVariant,
          updatedAt: now,
        };
        db.reviews[existingIdx] = savedReview;
      } else {
        savedReview = {
          id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productId: product.id,
          customerId: customer.id,
          customerName: customer.fullName,
          rating: validation.sanitized.rating,
          title: validation.sanitized.title,
          comment: validation.sanitized.comment,
          photos: validation.sanitized.photos,
          verifiedPurchase,
          selectedVariant: req.body?.selectedVariant
            ? String(req.body.selectedVariant).trim()
            : undefined,
          helpfulVoterIds: [],
          helpfulCount: 0,
          reportCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        db.reviews.unshift(savedReview);
      }

      syncProductAggregateRating(product.id);
      saveDatabase(db);

      const productReviews = db.reviews.filter((r) => r.productId === product.id);
      const ratingSummary = calculateRatingSummary(productReviews);

      res.status(isUpdate ? 200 : 201).json({
        review: savedReview,
        updated: isUpdate,
        ratingSummary,
        reviews: productReviews,
      });
    }
  );

  // Edit Own Review (or Admin Edit)
  app.put('/api/storefront/reviews/:reviewId', (req: Request, res: Response) => {
    const customer = resolveAuthenticatedCustomer(req);
    const adminToken = extractAdminSessionToken(req);
    const isAdmin = Boolean(
      adminToken && db.sessions.some((s) => s.token === adminToken && s.expiresAt > Date.now())
    );

    if (!customer && !isAdmin) {
      res.status(401).json({ error: 'Please sign in to edit your review.' });
      return;
    }

    const idx = db.reviews.findIndex((r) => r.id === req.params.reviewId);
    if (idx === -1) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }

    const existing = db.reviews[idx];
    if (!isAdmin && existing.customerId !== customer?.id) {
      res.status(403).json({ error: 'You can only edit your own reviews.' });
      return;
    }

    const validation = validateReviewSubmission(req.body ?? {});
    if (!validation.valid || !validation.sanitized) {
      res.status(400).json({ error: validation.error });
      return;
    }

    db.reviews[idx] = {
      ...existing,
      rating: validation.sanitized.rating,
      title: validation.sanitized.title,
      comment: validation.sanitized.comment,
      photos: validation.sanitized.photos,
      updatedAt: new Date().toISOString(),
    };

    syncProductAggregateRating(existing.productId);
    saveDatabase(db);

    const productReviews = db.reviews.filter((r) => r.productId === existing.productId);
    res.json({
      review: db.reviews[idx],
      ratingSummary: calculateRatingSummary(productReviews),
      reviews: productReviews,
    });
  });

  // Delete Own Review (or Admin Delete)
  app.delete('/api/storefront/reviews/:reviewId', (req: Request, res: Response) => {
    const customer = resolveAuthenticatedCustomer(req);
    const adminToken = extractAdminSessionToken(req);
    const isAdmin = Boolean(
      adminToken && db.sessions.some((s) => s.token === adminToken && s.expiresAt > Date.now())
    );

    if (!customer && !isAdmin) {
      res.status(401).json({ error: 'Please sign in to delete your review.' });
      return;
    }

    const idx = db.reviews.findIndex((r) => r.id === req.params.reviewId);
    if (idx === -1) {
      res.status(404).json({ error: 'Review not found.' });
      return;
    }

    const existing = db.reviews[idx];
    if (!isAdmin && existing.customerId !== customer?.id) {
      res.status(403).json({ error: 'You can only delete your own reviews.' });
      return;
    }

    db.reviews.splice(idx, 1);
    syncProductAggregateRating(existing.productId);
    saveDatabase(db);

    const productReviews = db.reviews.filter((r) => r.productId === existing.productId);
    res.json({
      deleted: true,
      ratingSummary: calculateRatingSummary(productReviews),
      reviews: productReviews,
    });
  });

  // Toggle Helpful Vote on a Review (Authenticated Customer, 1 vote per user, supports undo)
  app.post(
    '/api/storefront/reviews/:reviewId/helpful',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const review = db.reviews.find((r) => r.id === req.params.reviewId);
      if (!review) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }

      const toggled = toggleHelpfulVoterList(review.helpfulVoterIds ?? [], customer.id);
      review.helpfulVoterIds = toggled.updatedVoterIds;
      review.helpfulCount = toggled.helpfulCount;
      saveDatabase(db);

      res.json({
        reviewId: review.id,
        helpfulCount: review.helpfulCount,
        voted: toggled.voted,
        review,
      });
    }
  );

  // Report a Review for Spam, Abuse, Misleading, or Inappropriate Content
  app.post(
    '/api/storefront/reviews/:reviewId/report',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const review = db.reviews.find((r) => r.id === req.params.reviewId);
      if (!review) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }

      const alreadyReported = db.reviewReports.some(
        (rep) => rep.reviewId === review.id && rep.reporterCustomerId === customer.id
      );
      if (alreadyReported) {
        res.status(409).json({ error: 'You have already reported this review for moderation.' });
        return;
      }

      const rawReason = String(req.body?.reason ?? 'Spam');
      const validReason: ProductReviewReport['reason'] = [
        'Spam',
        'Abuse',
        'Misleading',
        'Inappropriate',
      ].includes(rawReason)
        ? (rawReason as ProductReviewReport['reason'])
        : 'Spam';

      const report: ProductReviewReport = {
        id: `rep-${Date.now()}`,
        reviewId: review.id,
        productId: review.productId,
        reporterCustomerId: customer.id,
        reason: validReason,
        comment: req.body?.comment ? String(req.body.comment).trim().slice(0, 300) : undefined,
        createdAt: new Date().toISOString(),
      };

      db.reviewReports.unshift(report);
      review.reportCount = (review.reportCount ?? 0) + 1;
      saveDatabase(db);

      res.status(201).json({
        message: 'Thank you. This review has been flagged for Zestora Trust & Safety moderation.',
        reportCount: review.reportCount,
      });
    }
  );

  // Post a Product Question (Authenticated Customer)
  app.post(
    '/api/storefront/products/:productId/questions',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const productId = String(req.params.productId ?? '').trim();
      const product = db.products.find((p) => p.id === productId && p.status === 'Active');
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const questionText = String(req.body?.questionText ?? '').trim();
      if (questionText.length < 8 || questionText.length > 500) {
        res.status(400).json({
          error: 'Please enter a clear question between 8 and 500 characters.',
        });
        return;
      }

      const duplicate = db.questions.some(
        (q) =>
          q.productId === product.id &&
          q.questionText.toLowerCase() === questionText.toLowerCase()
      );
      if (duplicate) {
        res.status(409).json({
          error: 'This question has already been asked for this product.',
        });
        return;
      }

      const newQuestion: ProductQuestionRecord = {
        id: `qa-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: product.id,
        customerId: customer.id,
        customerName: customer.fullName,
        questionText,
        answers: [],
        createdAt: new Date().toISOString(),
      };

      db.questions.unshift(newQuestion);
      saveDatabase(db);

      res.status(201).json({
        question: newQuestion,
        questions: db.questions.filter((q) => q.productId === product.id),
      });
    }
  );

  // Post an Answer to a Product Question (Authenticated Customer or Admin/Seller)
  app.post('/api/storefront/questions/:questionId/answers', (req: Request, res: Response) => {
    const customer = resolveAuthenticatedCustomer(req);
    const adminToken = extractAdminSessionToken(req);
    const activeAdminSession = adminToken
      ? db.sessions.find((s) => s.token === adminToken && s.expiresAt > Date.now())
      : undefined;
    const adminStaff = activeAdminSession
      ? db.staff.find((u) => u.id === activeAdminSession.userId && u.status === 'Active')
      : undefined;

    if (!customer && !adminStaff) {
      res.status(401).json({ error: 'Please sign in to answer this question.' });
      return;
    }

    const question = db.questions.find((q) => q.id === req.params.questionId);
    if (!question) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }

    const answerText = String(req.body?.answerText ?? '').trim();
    if (answerText.length < 4 || answerText.length > 1000) {
      res.status(400).json({
        error: 'Answer must be between 4 and 1000 characters.',
      });
      return;
    }

    let authorRole: ProductAnswerRecord['authorRole'] = 'Customer';
    let authorId = customer?.id ?? 'guest';
    let authorName = customer?.fullName ?? 'Customer';

    if (adminStaff) {
      authorRole = 'Verified Seller';
      authorId = adminStaff.id;
      authorName = `${adminStaff.name} (Zestora Official)`;
    } else if (
      customer &&
      hasVerifiedPurchaseForProduct(db.orders, customer.id, customer.email, question.productId)
    ) {
      authorRole = 'Verified Buyer';
    }

    const newAnswer: ProductAnswerRecord = {
      id: `ans-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      questionId: question.id,
      productId: question.productId,
      authorId,
      authorName,
      authorRole,
      answerText,
      helpfulVoterIds: [],
      helpfulCount: 0,
      reportedByIds: [],
      createdAt: new Date().toISOString(),
    };

    question.answers.push(newAnswer);
    saveDatabase(db);

    res.status(201).json({
      answer: newAnswer,
      question,
      questions: db.questions.filter((q) => q.productId === question.productId),
    });
  });

  // Toggle Helpful Vote on an Answer
  app.post(
    '/api/storefront/questions/:questionId/answers/:answerId/helpful',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const question = db.questions.find((q) => q.id === req.params.questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found.' });
        return;
      }
      const answer = question.answers.find((a) => a.id === req.params.answerId);
      if (!answer) {
        res.status(404).json({ error: 'Answer not found.' });
        return;
      }

      const toggled = toggleHelpfulVoterList(answer.helpfulVoterIds ?? [], customer.id);
      answer.helpfulVoterIds = toggled.updatedVoterIds;
      answer.helpfulCount = toggled.helpfulCount;
      saveDatabase(db);

      res.json({
        answerId: answer.id,
        helpfulCount: answer.helpfulCount,
        voted: toggled.voted,
        question,
      });
    }
  );

  // Report an Answer
  app.post(
    '/api/storefront/questions/:questionId/answers/:answerId/report',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const question = db.questions.find((q) => q.id === req.params.questionId);
      if (!question) {
        res.status(404).json({ error: 'Question not found.' });
        return;
      }
      const answer = question.answers.find((a) => a.id === req.params.answerId);
      if (!answer) {
        res.status(404).json({ error: 'Answer not found.' });
        return;
      }

      if (!Array.isArray(answer.reportedByIds)) {
        answer.reportedByIds = [];
      }
      if (answer.reportedByIds.includes(customer.id)) {
        res.status(409).json({ error: 'You have already reported this answer.' });
        return;
      }

      answer.reportedByIds.push(customer.id);
      saveDatabase(db);

      res.json({
        message: 'Answer reported for moderation.',
        reportedCount: answer.reportedByIds.length,
      });
    }
  );

  // ============================================================================
  // OUT-OF-STOCK 'NOTIFY ME' ALERTS (stock_alerts TABLE & /api/products/stock-alert)
  // ============================================================================

  const handleCreateStockAlert = (req: Request, res: Response) => {
    const authCustomer = resolveAuthenticatedCustomer(req);
    const rawEmail = req.body?.email ?? authCustomer?.email ?? '';
    const emailValidation = validateStockAlertEmail(rawEmail);
    if (!emailValidation.valid) {
      res.status(400).json({ error: emailValidation.error });
      return;
    }

    const productIdParam = String(req.params.productId || req.body?.productId || '').trim();
    if (!productIdParam) {
      res.status(400).json({ error: 'Product ID is required to subscribe to a stock alert.' });
      return;
    }

    const product = db.products.find(
      (p) =>
        p.id.toLowerCase() === productIdParam.toLowerCase() ||
        p.sku.toLowerCase() === productIdParam.toLowerCase() ||
        p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === productIdParam.toLowerCase()
    );

    const variantId = req.body?.variantId ? String(req.body.variantId).trim() : undefined;
    const availability = validateProductAvailabilityForStockAlert(product, variantId);
    if (!availability.valid || !product) {
      res.status(availability.statusCode).json({
        error: availability.error || 'Product not found.',
        effectiveStock: availability.effectiveStock,
      });
      return;
    }

    const resolvedVariantId = availability.resolvedVariant?.id ?? variantId;
    const variantLabel = req.body?.variantLabel
      ? String(req.body.variantLabel).trim()
      : availability.resolvedVariant
      ? [
          availability.resolvedVariant.color,
          availability.resolvedVariant.size,
          availability.resolvedVariant.model,
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;

    const result = upsertStockAlertSubscription(db.stock_alerts, {
      productId: product.id,
      productName: product.name,
      email: emailValidation.normalizedEmail,
      variantId: resolvedVariantId,
      variantLabel,
      customerId: authCustomer?.id,
    });

    if (result.alreadySubscribed) {
      const totalAlertsForProduct = db.stock_alerts.filter(
        (a) => a.productId === product.id && a.status === 'pending'
      ).length;
      res.status(409).json({
        error: `You are already subscribed! We'll email ${result.alert.email} as soon as ${product.name} is back in stock.`,
        message: `You're already on the notify list! We'll email ${result.alert.email} as soon as ${product.name} is back in stock.`,
        alreadySubscribed: true,
        alert: result.alert,
        totalAlertsForProduct,
        table: STOCK_ALERTS_TABLE_NAME,
      });
      return;
    }

    db.stock_alerts = result.updatedAlerts;
    saveDatabase(db);

    const totalAlertsForProduct = db.stock_alerts.filter(
      (a) => a.productId === product.id && a.status === 'pending'
    ).length;

    res.status(201).json({
      alert: result.alert,
      alreadySubscribed: false,
      totalAlertsForProduct,
      table: STOCK_ALERTS_TABLE_NAME,
      message: `Alert registered! We'll notify ${result.alert.email} as soon as ${product.name} is back in stock.`,
    });
  };

  const handleGetStockAlerts = (req: Request, res: Response) => {
    const productIdParam = String(req.params.productId || req.query.productId || '').trim();
    const authCustomer = resolveAuthenticatedCustomer(req);
    const queryEmail = String(req.query.email ?? authCustomer?.email ?? '')
      .trim()
      .toLowerCase();
    const variantId = req.query.variantId ? String(req.query.variantId).trim() : undefined;

    const pendingForProduct = productIdParam
      ? db.stock_alerts.filter(
          (a) =>
            a.productId.toLowerCase() === productIdParam.toLowerCase() &&
            a.status === 'pending'
        )
      : db.stock_alerts.filter((a) => a.status === 'pending');

    const matchedAlert = queryEmail
      ? pendingForProduct.find(
          (a) =>
            a.email.toLowerCase() === queryEmail &&
            (!variantId || (a.variantId || undefined) === variantId)
        ) ?? null
      : null;

    res.json({
      table: STOCK_ALERTS_TABLE_NAME,
      schema: STOCK_ALERTS_TABLE_SCHEMA,
      sqlSchema: STOCK_ALERTS_SQL_SCHEMA,
      alertsCount: pendingForProduct.length,
      subscribed: Boolean(matchedAlert),
      alert: matchedAlert,
      alerts: pendingForProduct,
    });
  };

  app.post('/api/products/stock-alert', handleCreateStockAlert);
  app.get('/api/products/stock-alert', handleGetStockAlerts);
  app.post('/api/storefront/products/:productId/stock-alerts', handleCreateStockAlert);
  app.post('/api/storefront/stock-alerts', handleCreateStockAlert);
  app.get('/api/storefront/products/:productId/stock-alerts', handleGetStockAlerts);

  // ============================================================================
  // CUSTOMER AUTHENTICATION, PROFILE & ADDRESS MANAGEMENT
  // ============================================================================

  app.post('/api/customers/register', (req: Request, res: Response) => {
    const { fullName, email, mobile, password, gender, dateOfBirth } = req.body ?? {};
    const cleanEmail = String(email ?? '').trim().toLowerCase();
    const cleanName = String(fullName ?? '').trim();
    const cleanMobile = String(mobile ?? '').trim() || '+91 98765 43210';

    if (!cleanName || !cleanEmail || !cleanEmail.includes('@') || !password || String(password).length < 6) {
      res.status(400).json({
        error: 'Please provide your full name, a valid email address, and a password of at least 6 characters.',
      });
      return;
    }

    if (db.customers.some((c) => c.email === cleanEmail)) {
      res.status(409).json({ error: 'A customer account with this email already exists.' });
      return;
    }

    const { hash, salt } = hashPassword(String(password));
    const now = new Date().toISOString();
    const newCustomer: StoredCustomer = {
      id: `cust-${Date.now()}`,
      fullName: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      gender: gender ? String(gender) : undefined,
      dateOfBirth: dateOfBirth ? String(dateOfBirth) : undefined,
      addresses: [],
      wishlistProductIds: [],
      recentlyViewedIds: [],
      status: 'Active',
      createdAt: now,
      orderCount: 0,
      passwordHash: hash,
      passwordSalt: salt,
    };

    db.customers.unshift(newCustomer);

    const token = crypto.randomBytes(32).toString('hex');
    db.customerSessions.push({
      token,
      customerId: newCustomer.id,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    });

    addCustomerNotification(
      newCustomer.id,
      'Welcome to Zestora!',
      `Hi ${cleanName}, your customer account is active. Enjoy fast checkout, UPI/COD options, and live parcel tracking.`,
      'account'
    );

    saveDatabase(db);

    res.setHeader(
      'Set-Cookie',
      `zestora_customer_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`
    );

    res.status(201).json({
      customer: sanitizeCustomer(newCustomer),
      token,
      message: 'Customer account created successfully.',
    });
  });

  app.post('/api/customers/login', (req: Request, res: Response) => {
    const { identifier, password } = req.body ?? {};
    const cleanId = String(identifier ?? '').trim().toLowerCase();

    const customer = db.customers.find(
      (c) =>
        c.email === cleanId ||
        c.mobile.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, ''))
    );

    if (!customer || !verifyPassword(String(password ?? ''), customer.passwordHash, customer.passwordSalt)) {
      res.status(401).json({ error: 'Invalid customer email/mobile or password.' });
      return;
    }

    if (customer.status !== 'Active') {
      res.status(403).json({ error: 'This customer account has been suspended.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    db.customerSessions.push({
      token,
      customerId: customer.id,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    });
    saveDatabase(db);

    res.setHeader(
      'Set-Cookie',
      `zestora_customer_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax`
    );

    res.json({
      customer: sanitizeCustomer(customer),
      token,
    });
  });

  app.get('/api/customers/me', (req: Request, res: Response) => {
    const customer = resolveAuthenticatedCustomer(req);
    if (!customer) {
      res.json({ authenticated: false, customer: null, notifications: [] });
      return;
    }
    const custNotifications = db.notifications
      .filter((n) => n.customerId === customer.id)
      .slice(0, 30);
    res.json({
      authenticated: true,
      customer: sanitizeCustomer(customer),
      notifications: custNotifications,
    });
  });

  app.post('/api/customers/logout', (req: Request, res: Response) => {
    const token = extractCustomerSessionToken(req);
    if (token) {
      db.customerSessions = db.customerSessions.filter((s) => s.token !== token);
      saveDatabase(db);
    }
    res.setHeader(
      'Set-Cookie',
      'zestora_customer_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
    );
    res.json({ success: true });
  });

  // Forgot Password — Generates a 6-digit verification OTP
  app.post('/api/customers/forgot-password', (req: Request, res: Response) => {
    const cleanId = String(req.body?.identifier ?? '').trim().toLowerCase();
    if (!cleanId) {
      res.status(400).json({ error: 'Please enter your registered email address or mobile number.' });
      return;
    }
    const customer = db.customers.find(
      (c) =>
        c.email === cleanId ||
        (cleanId.replace(/[^0-9]/g, '').length >= 10 &&
          c.mobile.replace(/[^0-9]/g, '').endsWith(cleanId.replace(/[^0-9]/g, '')))
    );
    if (!customer) {
      res.status(404).json({ error: 'No customer account found with that email or mobile number.' });
      return;
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    db.passwordResetOtps = db.passwordResetOtps.filter((r) => r.customerId !== customer.id);
    db.passwordResetOtps.push({
      identifier: cleanId,
      customerId: customer.id,
      otp,
      expiresAt: Date.now() + 15 * 60 * 1000,
    });
    saveDatabase(db);

    res.json({
      message: `Verification OTP generated for ${customer.email}.`,
      demoResetOtp: otp,
    });
  });

  app.post('/api/customers/reset-password', (req: Request, res: Response) => {
    const { identifier, otp, newPassword } = req.body ?? {};
    const cleanId = String(identifier ?? '').trim().toLowerCase();
    const cleanOtp = String(otp ?? '').trim();

    if (!cleanId || !cleanOtp || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({
        error: 'Please provide your email/mobile, the 6-digit OTP, and a new password (min 6 characters).',
      });
      return;
    }

    const record = db.passwordResetOtps.find(
      (r) => r.identifier === cleanId && r.otp === cleanOtp && r.expiresAt > Date.now()
    );
    if (!record) {
      res.status(400).json({ error: 'Invalid or expired verification OTP.' });
      return;
    }

    const customer = db.customers.find((c) => c.id === record.customerId);
    if (!customer) {
      res.status(404).json({ error: 'Customer account not found.' });
      return;
    }

    const { hash, salt } = hashPassword(String(newPassword));
    customer.passwordHash = hash;
    customer.passwordSalt = salt;
    db.passwordResetOtps = db.passwordResetOtps.filter((r) => r.customerId !== customer.id);
    saveDatabase(db);

    res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  });

  // Update Customer Profile & Saved Addresses
  app.put(
    '/api/customers/profile',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const { fullName, mobile, gender, dateOfBirth, addresses, wishlistProductIds, recentlyViewedIds } =
        req.body ?? {};

      if (fullName !== undefined && String(fullName).trim()) {
        customer.fullName = String(fullName).trim();
      }
      if (mobile !== undefined && String(mobile).trim()) {
        customer.mobile = String(mobile).trim();
      }
      if (gender !== undefined) {
        customer.gender = String(gender);
      }
      if (dateOfBirth !== undefined) {
        customer.dateOfBirth = String(dateOfBirth);
      }
      if (Array.isArray(addresses)) {
        customer.addresses = addresses;
      }
      if (Array.isArray(wishlistProductIds)) {
        customer.wishlistProductIds = wishlistProductIds.map(String);
      }
      if (Array.isArray(recentlyViewedIds)) {
        customer.recentlyViewedIds = recentlyViewedIds.map(String);
      }

      saveDatabase(db);
      res.json({ customer: sanitizeCustomer(customer) });
    }
  );

  // Add or Update Customer Address
  app.post(
    '/api/customers/addresses',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      const { id, label, recipientName, phone, line1, line2, city, state, postalCode, isDefault } =
        req.body ?? {};

      const cleanRecipient = String(recipientName ?? customer.fullName).trim();
      const cleanPhone = String(phone ?? customer.mobile).trim();
      const cleanLine1 = String(line1 ?? '').trim();
      const cleanCity = String(city ?? '').trim();
      const cleanState = String(state ?? '').trim();
      const cleanPin = String(postalCode ?? '').trim();

      if (!cleanRecipient || !cleanPhone || !cleanLine1 || !cleanCity || !cleanState || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
        res.status(400).json({
          error:
            'Please provide recipient name, mobile number, street address, city, state, and a valid 6-digit Indian PIN code.',
        });
        return;
      }

      if (!Array.isArray(customer.addresses)) {
        customer.addresses = [];
      }

      const validLabel: CustomerAddress['label'] =
        label === 'Work' || label === 'Other' ? label : 'Home';

      const shouldBeDefault = Boolean(isDefault) || customer.addresses.length === 0;
      if (shouldBeDefault) {
        customer.addresses = customer.addresses.map((a) => ({ ...a, isDefault: false }));
      }

      if (id && customer.addresses.some((a) => a.id === id)) {
        customer.addresses = customer.addresses.map((a) =>
          a.id === id
            ? {
                id: String(id),
                label: validLabel,
                recipientName: cleanRecipient,
                phone: cleanPhone,
                line1: cleanLine1,
                line2: line2 ? String(line2).trim() : undefined,
                city: cleanCity,
                state: cleanState,
                postalCode: cleanPin,
                isDefault: shouldBeDefault,
              }
            : a
        );
      } else {
        const newAddr: CustomerAddress = {
          id: `addr-${Date.now()}`,
          label: validLabel,
          recipientName: cleanRecipient,
          phone: cleanPhone,
          line1: cleanLine1,
          line2: line2 ? String(line2).trim() : undefined,
          city: cleanCity,
          state: cleanState,
          postalCode: cleanPin,
          isDefault: shouldBeDefault,
        };
        customer.addresses.unshift(newAddr);
      }

      saveDatabase(db);
      res.json({ customer: sanitizeCustomer(customer) });
    }
  );

  app.delete(
    '/api/customers/addresses/:addressId',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      customer.addresses = (customer.addresses ?? []).filter((a) => a.id !== req.params.addressId);
      if (customer.addresses.length > 0 && !customer.addresses.some((a) => a.isDefault)) {
        customer.addresses[0].isDefault = true;
      }
      saveDatabase(db);
      res.json({ customer: sanitizeCustomer(customer) });
    }
  );

  // ============================================================================
  // SERVER-SIDE CHECKOUT QUOTE, ORDER PLACEMENT & PAYMENT GATEWAY VERIFICATION
  // ============================================================================

  app.post('/api/checkout/calculate', (req: Request, res: Response) => {
    const { items, couponCode, paymentMethod, postalCode } = req.body ?? {};
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Items array is required.' });
      return;
    }

    const serverLines = [];
    for (const raw of items) {
      const prod = db.products.find((p) => p.id === raw.productId && p.status === 'Active');
      if (prod) {
        serverLines.push({
          price: prod.price,
          regularPrice: prod.regularPrice,
          quantity: Math.max(1, Math.round(Number(raw.quantity ?? 1))),
        });
      }
    }

    const settings = db.storefront.paymentSettings ?? DEFAULT_PAYMENT_SETTINGS;
    const pricing = calculateServerOrderTotals(serverLines, {
      couponCode,
      paymentMethod,
      coupons: db.coupons,
      settings,
    });

    const codCheck = validateCodEligibility(
      pricing.itemsSellingSubtotal - pricing.couponDiscount,
      String(postalCode ?? ''),
      settings
    );

    res.json({
      pricing,
      codEligibility: codCheck,
      paymentSettings: settings,
    });
  });

  // Create Order & Reserve Stock (Supports COD, UPI Apps, and Online Payment Gateway)
  app.post('/api/customers/orders', (req: Request, res: Response) => {
    const authCustomer = resolveAuthenticatedCustomer(req);
    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      shippingAddressStructured,
      items,
      couponCode,
      paymentMethod,
      paymentProviderDetail,
    } = req.body ?? {};

    const cleanName = String(customerName ?? authCustomer?.fullName ?? '').trim();
    const cleanEmail = String(customerEmail ?? authCustomer?.email ?? '')
      .trim()
      .toLowerCase();
    const cleanPhone = String(customerPhone ?? authCustomer?.mobile ?? '+91 98765 43210').trim();
    const cleanAddress = String(shippingAddress ?? '').trim();

    if (!cleanName || !cleanEmail || !cleanAddress || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        error: 'Please provide your name, email, delivery address, and at least one cart item.',
      });
      return;
    }

    const chosenMethod: PaymentMethodType =
      paymentMethod === 'UPI' || paymentMethod === 'CARD_NETBANKING' || paymentMethod === 'COD'
        ? paymentMethod
        : 'COD';

    const settings: PaymentGatewaySettings =
      db.storefront.paymentSettings ?? DEFAULT_PAYMENT_SETTINGS;

    // Validate stock and build server lines
    const serverLines = [];
    for (const rawItem of items) {
      const prod = db.products.find((p) => p.id === rawItem.productId && p.status === 'Active');
      const qty = Math.max(1, Math.round(Number(rawItem.quantity ?? 1)));
      if (!prod) {
        res.status(400).json({ error: 'One or more items in your cart are no longer available.' });
        return;
      }
      if (prod.stock < qty) {
        res.status(400).json({
          error: `Insufficient stock for "${prod.name}". Only ${prod.stock} unit(s) available.`,
        });
        return;
      }
      serverLines.push({
        product: prod,
        quantity: qty,
        selectedVariant: rawItem.selectedVariant ? String(rawItem.selectedVariant) : undefined,
      });
    }

    const pricing = calculateServerOrderTotals(
      serverLines.map((l) => ({
        price: l.product.price,
        regularPrice: l.product.regularPrice,
        quantity: l.quantity,
      })),
      {
        couponCode,
        paymentMethod: chosenMethod,
        coupons: db.coupons,
        settings,
      }
    );

    if (chosenMethod === 'COD') {
      const pinCode = shippingAddressStructured?.postalCode ?? '';
      const codCheck = validateCodEligibility(
        pricing.itemsSellingSubtotal - pricing.couponDiscount,
        pinCode,
        settings
      );
      if (!codCheck.eligible) {
        res.status(400).json({ error: codCheck.reason || 'Order is not eligible for Cash on Delivery.' });
        return;
      }
    }

    const now = new Date().toISOString();
    const orderItems: AdminOrder['items'] = [];

    // Deduct stock and record stock history
    for (const line of serverLines) {
      const prod = line.product;
      const prevStock = prod.stock;
      prod.stock = Math.max(0, prod.stock - line.quantity);
      prod.updatedAt = now;
      db.stockHistory.unshift({
        id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        previousStock: prevStock,
        newStock: prod.stock,
        adjustment: -line.quantity,
        reason: 'Customer Order Reserved',
        adminUsername: 'storefront-checkout',
        timestamp: now,
      });

      orderItems.push({
        productId: prod.id,
        productName: prod.name,
        sku: prod.sku,
        quantity: line.quantity,
        unitPrice: prod.price,
        regularPrice: prod.regularPrice,
        artwork: prod.artwork,
        primaryImageUrl:
          prod.images.find((img) => img.isPrimary)?.url ?? prod.images[0]?.url ?? undefined,
        selectedVariant: line.selectedVariant,
      });
    }

    const orderNumber = `ZST-ORD-${1001 + db.orders.length}`;
    const estDelivery = new Date(Date.now() + 4 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const isCod = chosenMethod === 'COD';

    const newOrder: AdminOrder = {
      id: `order-${Date.now()}`,
      orderNumber,
      customerId: authCustomer?.id,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      shippingAddress: cleanAddress,
      shippingAddressStructured: shippingAddressStructured ?? undefined,
      items: orderItems,
      itemsSubtotal: pricing.itemsSellingSubtotal,
      productDiscountTotal: pricing.productDiscountTotal,
      couponCode: pricing.couponCode,
      couponDiscount: pricing.couponDiscount,
      deliveryFee: pricing.deliveryFee,
      codFee: pricing.codFee,
      includedGstAmount: pricing.includedGstAmount,
      totalAmount: pricing.payableTotal,
      status: isCod ? 'Order Placed' : 'Pending',
      paymentStatus: isCod ? 'Unpaid (COD)' : 'Pending Gateway Integration',
      paymentMethod: chosenMethod,
      paymentProviderDetail:
        paymentProviderDetail ||
        (isCod ? 'Cash on Delivery (Pay at Doorstep)' : chosenMethod === 'UPI' ? 'UPI App' : 'Online Gateway'),
      courierName: 'Zestora Express Logistics',
      trackingNumber: `ZST-TRK-${Math.floor(100000 + Math.random() * 900000)}`,
      estimatedDeliveryDate: estDelivery,
      statusHistory: [
        {
          status: isCod ? 'Order Placed' : 'Pending',
          location: 'Zestora Storefront',
          note: isCod
            ? 'Order placed via Cash on Delivery (Payable upon delivery)'
            : `Order created; awaiting ${paymentProviderDetail || chosenMethod} payment confirmation`,
          updatedBy: cleanEmail,
          timestamp: now,
        },
      ],
      createdAt: now,
    };

    db.orders.unshift(newOrder);

    const gatewayOrderId = `gw_ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const paymentRecord: PaymentTransactionRecord = {
      id: `pay-${Date.now()}`,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      customerId: authCustomer?.id ?? 'guest',
      customerEmail: cleanEmail,
      amount: newOrder.totalAmount,
      method: chosenMethod,
      providerDetail: newOrder.paymentProviderDetail || chosenMethod,
      status: isCod ? 'Unpaid (COD)' : 'Pending',
      gatewayOrderId,
      gatewaySignatureVerified: false,
      createdAt: now,
      updatedAt: now,
    };
    db.paymentTransactions.unshift(paymentRecord);

    const cust = db.customers.find((c) => c.email === cleanEmail || c.id === authCustomer?.id);
    if (cust) {
      cust.orderCount += 1;
      if (!newOrder.customerId) {
        newOrder.customerId = cust.id;
      }
      if (isCod) {
        addCustomerNotification(
          cust.id,
          `Order ${newOrder.orderNumber} Placed (COD)`,
          `Your Cash on Delivery order of ₹${newOrder.totalAmount.toLocaleString('en-IN')} has been confirmed and is being prepared for dispatch.`,
          'order'
        );
      }
    }

    saveDatabase(db);
    res.status(201).json({
      order: newOrder,
      paymentSession: {
        paymentId: paymentRecord.id,
        gatewayOrderId,
        amount: newOrder.totalAmount,
        currency: 'INR',
        method: chosenMethod,
        providerDetail: newOrder.paymentProviderDetail,
        razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
      },
    });
  });

  // Verify Online / UPI Payment Outcome (Supports Razorpay HMAC Signature OR Sandbox Outcome Verification)
  app.post('/api/payments/verify', (req: Request, res: Response) => {
    const {
      orderId,
      gatewayOrderId,
      outcome,
      upiId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body ?? {};

    const order = db.orders.find((o) => o.id === orderId);
    if (!order) {
      res.status(404).json({ error: 'Order not found for payment verification.' });
      return;
    }

    const tx = db.paymentTransactions.find(
      (t) => t.orderId === order.id || (gatewayOrderId && t.gatewayOrderId === gatewayOrderId)
    );

    const now = new Date().toISOString();

    // If real Razorpay signature parameters are sent, verify HMAC SHA-256 signature with RAZORPAY_KEY_SECRET
    if (razorpay_order_id && razorpay_payment_id && razorpay_signature && process.env.RAZORPAY_KEY_SECRET) {
      const expectedSig = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (expectedSig !== razorpay_signature) {
        order.paymentStatus = 'Payment Failed';
        if (tx) {
          tx.status = 'Failed';
          tx.updatedAt = now;
        }
        saveDatabase(db);
        res.status(400).json({ error: 'Payment signature verification failed.' });
        return;
      }
    }

    if (outcome === 'failed' || outcome === 'cancelled') {
      const isCancelled = outcome === 'cancelled';
      order.paymentStatus = isCancelled ? 'Payment Cancelled' : 'Payment Failed';
      order.statusHistory.unshift({
        status: order.status,
        location: 'Zestora Payment Gateway',
        note: isCancelled
          ? 'Customer cancelled payment authorization window. Order saved for payment retry.'
          : 'Online payment authorization declined by bank/UPI provider. You may retry payment.',
        updatedBy: order.customerEmail,
        timestamp: now,
      });
      if (tx) {
        tx.status = isCancelled ? 'Cancelled' : 'Failed';
        tx.updatedAt = now;
      }
      addCustomerNotification(
        order.customerId,
        `Payment ${isCancelled ? 'Cancelled' : 'Failed'} for ${order.orderNumber}`,
        `Your payment of ₹${order.totalAmount.toLocaleString('en-IN')} was not completed. You can retry payment anytime from My Orders.`,
        'payment'
      );
      saveDatabase(db);
      res.json({ order, paymentStatus: order.paymentStatus });
      return;
    }

    // Verified Paid outcome
    const paymentRef =
      razorpay_payment_id || `ZST-PAY-${Math.floor(1000000 + Math.random() * 9000000)}`;
    order.paymentStatus = 'Verified Paid';
    order.status = 'Confirmed';
    order.transactionReference = paymentRef;
    if (upiId) {
      order.paymentProviderDetail = `${order.paymentProviderDetail || 'UPI'} (${String(upiId).trim()})`;
    }

    order.statusHistory.unshift(
      {
        status: 'Confirmed',
        location: 'Zestora Merchant Operations',
        note: `Payment verified (Ref: ${paymentRef}) via ${order.paymentProviderDetail}. Order confirmed for warehouse fulfillment.`,
        updatedBy: 'payment-gateway',
        timestamp: now,
      },
      {
        status: 'Order Placed',
        location: 'Zestora Storefront',
        note: 'Order placed and inventory reserved.',
        updatedBy: order.customerEmail,
        timestamp: now,
      }
    );

    if (tx) {
      tx.status = 'Verified Paid';
      tx.gatewayPaymentId = paymentRef;
      tx.gatewaySignatureVerified = true;
      tx.updatedAt = now;
    }

    addCustomerNotification(
      order.customerId,
      `Payment Confirmed — ${order.orderNumber}`,
      `We received ₹${order.totalAmount.toLocaleString('en-IN')} via ${order.paymentProviderDetail} (Ref: ${paymentRef}). Your order is now Confirmed!`,
      'payment'
    );

    saveDatabase(db);
    res.json({ order, paymentStatus: 'Verified Paid', transactionReference: paymentRef });
  });

  // ============================================================================
  // CUSTOMER ORDER HISTORY, LIVE TRACKING, CANCELLATION & RETURNS
  // ============================================================================

  app.get('/api/customers/orders', (req: Request, res: Response) => {
    const customer = resolveAuthenticatedCustomer(req);
    const emailQuery = String(req.query.email ?? '').trim().toLowerCase();

    const targetEmail = customer?.email ?? emailQuery;
    if (!targetEmail && !customer) {
      res.json({ orders: [] });
      return;
    }

    const matched = db.orders.filter(
      (o) =>
        (customer && o.customerId === customer.id) ||
        (targetEmail && o.customerEmail.toLowerCase() === targetEmail)
    );

    res.json({ orders: matched });
  });

  // Track a single order by Order Number or ID
  app.get('/api/customers/orders/:orderIdOrNumber', (req: Request, res: Response) => {
    const key = String(req.params.orderIdOrNumber ?? '').trim().toUpperCase();
    const order = db.orders.find(
      (o) => o.id.toUpperCase() === key || o.orderNumber.toUpperCase() === key
    );
    if (!order) {
      res.status(404).json({ error: 'No order found matching that Order ID.' });
      return;
    }
    res.json({ order });
  });

  // Customer Order Cancellation (Allowed before Shipped)
  app.post('/api/customers/orders/:id/cancel', (req: Request, res: Response) => {
    const order = db.orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (!canCustomerCancelOrder(order.status)) {
      res.status(400).json({
        error: `Order cannot be cancelled because it is already in "${order.status}" status.`,
      });
      return;
    }

    const reason = String(req.body?.reason ?? 'Cancelled by customer').trim();
    const now = new Date().toISOString();

    // Restore reserved product stock
    for (const item of order.items) {
      const prod = db.products.find((p) => p.id === item.productId);
      if (prod) {
        const prev = prod.stock;
        prod.stock += item.quantity;
        prod.updatedAt = now;
        db.stockHistory.unshift({
          id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          previousStock: prev,
          newStock: prod.stock,
          adjustment: item.quantity,
          reason: `Order Cancelled (${order.orderNumber})`,
          adminUsername: order.customerEmail,
          timestamp: now,
        });
      }
    }

    order.status = 'Cancelled';
    order.cancellationReason = reason;
    if (order.paymentStatus === 'Verified Paid') {
      order.paymentStatus = 'Refunded';
    } else if (order.paymentMethod !== 'COD') {
      order.paymentStatus = 'Payment Cancelled';
    }

    order.statusHistory.unshift({
      status: 'Cancelled',
      location: 'Customer Self-Service',
      note: `Order cancelled by customer. Reason: ${reason}. Reserved inventory restored.`,
      updatedBy: order.customerEmail,
      timestamp: now,
    });

    addCustomerNotification(
      order.customerId,
      `Order ${order.orderNumber} Cancelled`,
      `Your order has been cancelled (${reason}). ${
        order.paymentStatus === 'Refunded'
          ? 'Your online payment refund has been initiated.'
          : 'No payment will be collected.'
      }`,
      'order'
    );

    saveDatabase(db);
    res.json({ order });
  });

  // Customer Return or Replacement Request (Allowed when Delivered)
  app.post('/api/customers/orders/:id/return', (req: Request, res: Response) => {
    const order = db.orders.find((o) => o.id === req.params.id || o.orderNumber === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Order not found.' });
      return;
    }

    if (!canCustomerRequestReturn(order.status)) {
      res.status(400).json({
        error: 'Return or replacement can only be requested after the order is marked Delivered.',
      });
      return;
    }

    const type: ReturnRequestRecord['type'] =
      req.body?.type === 'Replacement' ? 'Replacement' : 'Return & Refund';
    const reason = String(req.body?.reason ?? 'Defective or incorrect item received').trim();
    const now = new Date().toISOString();

    const returnReq: ReturnRequestRecord = {
      id: `ret-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId ?? 'guest',
      customerEmail: order.customerEmail,
      type,
      reason,
      status: 'Requested',
      createdAt: now,
      updatedAt: now,
    };

    order.status = 'Return Requested';
    order.returnRequest = returnReq;
    order.statusHistory.unshift({
      status: 'Return Requested',
      location: 'Customer Self-Service',
      note: `${type} requested by customer: "${reason}"`,
      updatedBy: order.customerEmail,
      timestamp: now,
    });

    db.returnRequests.unshift(returnReq);

    addCustomerNotification(
      order.customerId,
      `${type} Requested — ${order.orderNumber}`,
      `We have logged your ${type.toLowerCase()} request for ${order.orderNumber}. Reverse pickup will be scheduled shortly.`,
      'return'
    );

    saveDatabase(db);
    res.json({ order, returnRequest: returnReq });
  });

  // Mark Customer Notifications Read
  app.post(
    '/api/customers/notifications/read',
    requireCustomerAuth,
    (req: CustomerAuthenticatedRequest, res: Response) => {
      const customer = req.customer!;
      db.notifications = db.notifications.map((n) =>
        n.customerId === customer.id ? { ...n, read: true } : n
      );
      saveDatabase(db);
      res.json({
        notifications: db.notifications.filter((n) => n.customerId === customer.id).slice(0, 30),
      });
    }
  );

  // ============================================================================
  // ADMIN AUTHENTICATION & SESSION ROUTES
  // ============================================================================

  app.post('/api/admin/auth/login', (req: Request, res: Response) => {
    const { identifier, password } = req.body ?? {};
    const cleanIdentifier = String(identifier ?? '').trim().toLowerCase();
    const rawPassword = String(password ?? '');

    if (!cleanIdentifier || !rawPassword) {
      res.status(400).json({ error: 'Please enter both your administrator email/username and password.' });
      return;
    }

    const staffUser = db.staff.find(
      (u) => u.email.toLowerCase() === cleanIdentifier || u.username.toLowerCase() === cleanIdentifier
    );

    if (!staffUser || !verifyPassword(rawPassword, staffUser.passwordHash, staffUser.passwordSalt)) {
      res.status(401).json({
        error: 'Invalid administrator credentials. Please verify your email/username and password.',
      });
      return;
    }

    if (staffUser.status !== 'Active') {
      res.status(403).json({ error: 'This administrator account is currently suspended.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 hours

    staffUser.lastLoginAt = new Date().toISOString();
    db.sessions.push({
      token,
      userId: staffUser.id,
      expiresAt,
    });

    recordAudit(
      sanitizeStaffUser(staffUser),
      'Admin Login',
      `Signed in as ${staffUser.username} (${staffUser.role})`
    );
    saveDatabase(db);

    res.setHeader(
      'Set-Cookie',
      `zestora_admin_session=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${12 * 3600}; SameSite=Lax`
    );

    res.json({
      user: sanitizeStaffUser(staffUser),
      token,
    });
  });

  app.post('/api/admin/auth/logout', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    if (req.adminToken) {
      db.sessions = db.sessions.filter((s) => s.token !== req.adminToken);
      saveDatabase(db);
    }
    res.setHeader(
      'Set-Cookie',
      'zestora_admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax'
    );
    res.json({ success: true });
  });

  app.get('/api/admin/auth/me', (req: Request, res: Response) => {
    const token = extractAdminSessionToken(req);
    if (!token) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const now = Date.now();
    db.sessions = db.sessions.filter((s) => s.expiresAt > now);
    const session = db.sessions.find((s) => s.token === token);
    if (!session) {
      res.json({ authenticated: false, user: null });
      return;
    }
    const staffUser = db.staff.find((u) => u.id === session.userId && u.status === 'Active');
    if (!staffUser) {
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json({ authenticated: true, user: sanitizeStaffUser(staffUser) });
  });

  // ============================================================================
  // ADMIN DASHBOARD OVERVIEW
  // ============================================================================

  app.get('/api/admin/overview', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    const activeProducts = db.products.filter((p) => p.status === 'Active').length;
    const draftProducts = db.products.filter((p) => p.status === 'Draft').length;
    const outOfStockProducts = db.products.filter((p) => p.stock <= 0).length;
    const lowStockAlerts = db.products.filter(
      (p) => p.stock <= Math.max(1, p.lowStockThreshold) && p.status !== 'Archived'
    );
    const pendingOrders = db.orders.filter(
      (o) =>
        o.status === 'Order Placed' ||
        o.status === 'Pending' ||
        o.status === 'Confirmed' ||
        o.status === 'Processing' ||
        o.status === 'Packed'
    ).length;

    // Revenue calculated from Delivered or Verified Paid active orders
    const verifiedRevenue = db.orders
      .filter((o) => o.status === 'Delivered' || o.paymentStatus === 'Verified Paid')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    res.json({
      totalProducts: db.products.length,
      activeProducts,
      draftProducts,
      outOfStockProducts,
      lowStockProducts: lowStockAlerts.length,
      totalCategories: db.categories.length,
      totalBrands: db.brands.length,
      totalCustomers: db.customers.length,
      totalOrders: db.orders.length,
      pendingOrders,
      verifiedRevenue,
      lowStockAlerts,
      recentOrders: db.orders.slice(0, 10),
      priceHistory: db.priceHistory.slice(0, 25),
      stockHistory: db.stockHistory.slice(0, 25),
      auditLogs: db.auditLogs.slice(0, 30),
    });
  });

  // ============================================================================
  // PRODUCT IMAGE UPLOAD (BINARY STORAGE IN /uploads/products)
  // ============================================================================

  app.post(
    '/api/admin/upload',
    requireAdminAuth,
    requireDomainPermission('products'),
    express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }),
    (req: AuthenticatedRequest, res: Response) => {
      const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
      const rawFileName = String(req.headers['x-file-name'] ?? 'product-image.png');
      const bodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

      const validation = validateProductImageFile(contentType, bodyBuffer.length);
      if (!validation.valid) {
        res.status(400).json({ error: validation.error });
        return;
      }

      const ext =
        contentType === 'image/jpeg'
          ? '.jpg'
          : contentType === 'image/webp'
          ? '.webp'
          : '.png';
      const baseSafe =
        path
          .basename(rawFileName, path.extname(rawFileName))
          .replace(/[^a-zA-Z0-9_-]/g, '-')
          .slice(0, 40) || 'product';
      const finalFileName = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${baseSafe}${ext}`;
      const filePath = path.join(UPLOADS_DIR, finalFileName);

      fs.writeFileSync(filePath, bodyBuffer);

      const publicUrl = `/uploads/products/${finalFileName}`;
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Uploaded Product Image', publicUrl);
        saveDatabase(db);
      }

      res.status(201).json({
        id: `img-${Date.now()}`,
        url: publicUrl,
        size: bodyBuffer.length,
        mimeType: contentType,
      });
    }
  );

  // ============================================================================
  // COMPLETE PRODUCT MANAGEMENT
  // ============================================================================

  app.get('/api/admin/products', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ products: db.products });
  });

  app.post(
    '/api/admin/products',
    requireAdminAuth,
    requireDomainPermission('products'),
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body ?? {};
      const name = String(body.name ?? '').trim();
      const sku = String(body.sku ?? '').trim().toUpperCase();

      if (!name || !sku) {
        res.status(400).json({ error: 'Product name and unique SKU are required.' });
        return;
      }

      if (db.products.some((p) => p.sku.toUpperCase() === sku)) {
        res.status(409).json({ error: `A product with SKU "${sku}" already exists.` });
        return;
      }

      const regularPrice = Number(body.regularPrice ?? body.price ?? 0);
      const discountPrice = Number(body.price ?? regularPrice);
      const costPrice =
        body.costPrice !== undefined ? Number(body.costPrice) : Math.round(discountPrice * 0.65);

      const priceCheck = validateAndComputePricing({
        regularPrice,
        discountPrice,
        discountType: body.discountType ?? 'none',
        discountValue: Number(body.discountValue ?? 0),
        costPrice,
      });

      if (!priceCheck.isValid) {
        res.status(400).json({ error: priceCheck.error });
        return;
      }

      const now = new Date().toISOString();
      const newProduct: AdminProduct = {
        id: `zest-prod-${Date.now()}`,
        name,
        sku,
        description: String(body.description ?? body.shortDescription ?? '').trim(),
        shortDescription: String(body.shortDescription ?? name).trim(),
        category: String(body.category || 'Electronics'),
        subcategory: String(body.subcategory || 'General'),
        brand: String(body.brand || 'Zestora Originals'),
        price: priceCheck.finalSellingPrice,
        regularPrice,
        discountType: body.discountType ?? 'none',
        discountValue: Number(body.discountValue ?? priceCheck.discountPercent),
        saleStartDate: body.saleStartDate || undefined,
        saleEndDate: body.saleEndDate || undefined,
        costPrice,
        stock: Math.max(0, Math.round(Number(body.stock ?? 0))),
        lowStockThreshold: Math.max(1, Math.round(Number(body.lowStockThreshold ?? 5))),
        status: (['Draft', 'Active', 'Inactive', 'Archived'].includes(body.status)
          ? body.status
          : 'Active') as AdminProduct['status'],
        tags: Array.isArray(body.tags)
          ? body.tags.map(String)
          : String(body.tags ?? '')
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean),
        weight: String(body.weight ?? '500 g'),
        dimensions: String(body.dimensions ?? '20 × 15 × 8 cm'),
        variants: Array.isArray(body.variants) ? body.variants : [],
        specifications: Array.isArray(body.specifications) ? body.specifications : [],
        highlights: Array.isArray(body.highlights)
          ? body.highlights.map(String).filter(Boolean)
          : ['Zestora Quality Verified'],
        warranty: String(body.warranty ?? '1 Year Zestora Warranty'),
        images: Array.isArray(body.images) ? body.images : [],
        artwork: body.artwork || 'anc-headphones',
        rating: Number(body.rating ?? 4.8),
        reviewCount: Number(body.reviewCount ?? 1),
        featured: Boolean(body.featured ?? true),
        trending: Boolean(body.trending ?? false),
        specialOffer: Boolean(body.specialOffer ?? false),
        demoTag: 'Store Catalog',
        createdAt: now,
        updatedAt: now,
      };

      db.products.unshift(newProduct);
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Created Product', `${newProduct.name} (${newProduct.sku})`);
      }
      saveDatabase(db);

      res.status(201).json({ product: newProduct });
    }
  );

  app.put(
    '/api/admin/products/:id',
    requireAdminAuth,
    requireDomainPermission('products'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.products.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const existing = db.products[idx];
      const body = req.body ?? {};
      const sku = String(body.sku ?? existing.sku).trim().toUpperCase();

      if (
        sku !== existing.sku.toUpperCase() &&
        db.products.some((p, i) => i !== idx && p.sku.toUpperCase() === sku)
      ) {
        res.status(409).json({ error: `Another product already uses SKU "${sku}".` });
        return;
      }

      const regularPrice = Number(body.regularPrice ?? existing.regularPrice);
      const discountPrice = Number(body.price ?? existing.price);
      const costPrice = body.costPrice !== undefined ? Number(body.costPrice) : existing.costPrice;

      const priceCheck = validateAndComputePricing({
        regularPrice,
        discountPrice,
        discountType: body.discountType ?? existing.discountType,
        discountValue: Number(body.discountValue ?? existing.discountValue),
        costPrice,
      });

      if (!priceCheck.isValid) {
        res.status(400).json({ error: priceCheck.error });
        return;
      }

      const now = new Date().toISOString();

      if (
        regularPrice !== existing.regularPrice ||
        priceCheck.finalSellingPrice !== existing.price
      ) {
        db.priceHistory.unshift({
          id: `ph-${Date.now()}`,
          productId: existing.id,
          productName: String(body.name ?? existing.name),
          sku,
          previousRegularPrice: existing.regularPrice,
          newRegularPrice: regularPrice,
          previousSellingPrice: existing.price,
          newSellingPrice: priceCheck.finalSellingPrice,
          adminUsername: req.adminUser?.username ?? 'admin',
          timestamp: now,
        });
      }

      const newStock =
        body.stock !== undefined ? Math.max(0, Math.round(Number(body.stock))) : existing.stock;
      if (newStock !== existing.stock) {
        db.stockHistory.unshift({
          id: `sh-${Date.now()}`,
          productId: existing.id,
          productName: String(body.name ?? existing.name),
          sku,
          previousStock: existing.stock,
          newStock,
          adjustment: newStock - existing.stock,
          reason: 'Product Edit Update',
          adminUsername: req.adminUser?.username ?? 'admin',
          timestamp: now,
        });
      }

      const updated: AdminProduct = {
        ...existing,
        ...body,
        id: existing.id,
        name: String(body.name ?? existing.name).trim(),
        sku,
        regularPrice,
        price: priceCheck.finalSellingPrice,
        costPrice,
        stock: newStock,
        updatedAt: now,
      };

      db.products[idx] = updated;
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Updated Product', `${updated.name} (${updated.sku})`);
      }
      saveDatabase(db);

      res.json({ product: updated });
    }
  );

  // Duplicate Product
  app.post(
    '/api/admin/products/:id/duplicate',
    requireAdminAuth,
    requireDomainPermission('products'),
    (req: AuthenticatedRequest, res: Response) => {
      const source = db.products.find((p) => p.id === req.params.id);
      if (!source) {
        res.status(404).json({ error: 'Source product not found.' });
        return;
      }

      const now = new Date().toISOString();
      const copySku = `${source.sku}-COPY-${Math.floor(100 + Math.random() * 900)}`;
      const duplicated: AdminProduct = {
        ...source,
        id: `zest-prod-${Date.now()}`,
        name: `${source.name} (Copy)`,
        sku: copySku,
        status: 'Draft',
        createdAt: now,
        updatedAt: now,
      };

      db.products.unshift(duplicated);
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Duplicated Product', `${duplicated.name} (${duplicated.sku})`);
      }
      saveDatabase(db);

      res.status(201).json({ product: duplicated });
    }
  );

  // Delete or Archive Product
  app.delete(
    '/api/admin/products/:id',
    requireAdminAuth,
    requireDomainPermission('products'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.products.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const target = db.products[idx];
      const linkedToOrders = db.orders.some((o) =>
        o.items.some((item) => item.productId === target.id)
      );

      if (linkedToOrders) {
        db.products[idx] = {
          ...target,
          status: 'Archived',
          updatedAt: new Date().toISOString(),
        };
        if (req.adminUser) {
          recordAudit(
            req.adminUser,
            'Archived Product (Linked to Orders)',
            `${target.name} (${target.sku})`
          );
        }
        saveDatabase(db);
        res.json({ archived: true, product: db.products[idx] });
        return;
      }

      db.products.splice(idx, 1);
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Deleted Product', `${target.name} (${target.sku})`);
      }
      saveDatabase(db);

      res.json({ deleted: true, id: target.id });
    }
  );

  // Bulk Product Status / Price Update
  app.post(
    '/api/admin/products/bulk',
    requireAdminAuth,
    requireDomainPermission('products'),
    (req: AuthenticatedRequest, res: Response) => {
      const { productIds, status, discountPercentage } = req.body ?? {};
      if (!Array.isArray(productIds) || productIds.length === 0) {
        res.status(400).json({ error: 'Select at least one product for bulk update.' });
        return;
      }

      const now = new Date().toISOString();
      let updatedCount = 0;

      db.products = db.products.map((prod) => {
        if (!productIds.includes(prod.id)) return prod;
        updatedCount++;
        let newPrice = prod.price;
        if (
          discountPercentage !== undefined &&
          Number(discountPercentage) >= 0 &&
          Number(discountPercentage) < 100
        ) {
          newPrice = Math.round(prod.regularPrice * (1 - Number(discountPercentage) / 100));
          if (newPrice !== prod.price) {
            db.priceHistory.unshift({
              id: `ph-${Date.now()}-${updatedCount}`,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              previousRegularPrice: prod.regularPrice,
              newRegularPrice: prod.regularPrice,
              previousSellingPrice: prod.price,
              newSellingPrice: newPrice,
              adminUsername: req.adminUser?.username ?? 'admin',
              timestamp: now,
            });
          }
        }
        return {
          ...prod,
          status: status ?? prod.status,
          price: newPrice,
          updatedAt: now,
        };
      });

      if (req.adminUser) {
        recordAudit(req.adminUser, 'Bulk Updated Products', `${updatedCount} products updated`);
      }
      saveDatabase(db);

      res.json({ updatedCount, products: db.products });
    }
  );

  // ============================================================================
  // DEDICATED INVENTORY & STOCK ADJUSTMENT
  // ============================================================================

  app.post(
    '/api/admin/inventory/:id',
    requireAdminAuth,
    requireDomainPermission('inventory'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.products.findIndex((p) => p.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const product = db.products[idx];
      const newStock = Number(req.body?.stock);
      const lowStockThreshold =
        req.body?.lowStockThreshold !== undefined
          ? Math.max(1, Math.round(Number(req.body.lowStockThreshold)))
          : product.lowStockThreshold;
      const reason = String(req.body?.reason ?? 'Manual Inventory Adjustment').trim();

      if (!Number.isFinite(newStock) || newStock < 0) {
        res.status(400).json({ error: 'Stock quantity must be a non-negative integer.' });
        return;
      }

      const roundedStock = Math.round(newStock);
      const now = new Date().toISOString();

      db.stockHistory.unshift({
        id: `sh-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        previousStock: product.stock,
        newStock: roundedStock,
        adjustment: roundedStock - product.stock,
        reason,
        adminUsername: req.adminUser?.username ?? 'admin',
        timestamp: now,
      });

      db.products[idx] = {
        ...product,
        stock: roundedStock,
        lowStockThreshold,
        updatedAt: now,
      };

      if (req.adminUser) {
        recordAudit(
          req.adminUser,
          'Inventory Stock Adjusted',
          `${product.sku}: ${product.stock} → ${roundedStock} (${reason})`
        );
      }
      saveDatabase(db);

      res.json({
        product: db.products[idx],
        stockHistory: db.stockHistory.slice(0, 25),
      });
    }
  );

  // ============================================================================
  // CATEGORIES & BRANDS MANAGEMENT
  // ============================================================================

  app.get('/api/admin/categories', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ categories: db.categories });
  });

  app.post(
    '/api/admin/categories',
    requireAdminAuth,
    requireDomainPermission('categories'),
    (req: AuthenticatedRequest, res: Response) => {
      const { name, parentCategory, description, displayOrder, status, imageUrl } = req.body ?? {};
      const cleanName = String(name ?? '').trim();
      if (!cleanName) {
        res.status(400).json({ error: 'Category name is required.' });
        return;
      }

      const newCat: AdminCategory = {
        id: `cat-${Date.now()}`,
        name: cleanName,
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        parentCategory: parentCategory ? String(parentCategory) : null,
        description: String(description ?? '').trim(),
        imageUrl: imageUrl ? String(imageUrl) : undefined,
        displayOrder: Number(displayOrder ?? db.categories.length + 1),
        status: status === 'Inactive' ? 'Inactive' : 'Active',
      };

      db.categories.push(newCat);
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Created Category', newCat.name);
      }
      saveDatabase(db);

      res.status(201).json({ category: newCat });
    }
  );

  app.put(
    '/api/admin/categories/:id',
    requireAdminAuth,
    requireDomainPermission('categories'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.categories.findIndex((c) => c.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }

      const existing = db.categories[idx];
      const updated: AdminCategory = {
        ...existing,
        ...req.body,
        id: existing.id,
        name: String(req.body?.name ?? existing.name).trim(),
      };

      db.categories[idx] = updated;
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Updated Category', updated.name);
      }
      saveDatabase(db);

      res.json({ category: updated });
    }
  );

  app.delete(
    '/api/admin/categories/:id',
    requireAdminAuth,
    requireDomainPermission('categories'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.categories.findIndex((c) => c.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Category not found.' });
        return;
      }
      const removed = db.categories.splice(idx, 1)[0];
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Deleted Category', removed.name);
      }
      saveDatabase(db);
      res.json({ deleted: true });
    }
  );

  app.get('/api/admin/brands', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ brands: db.brands });
  });

  app.post(
    '/api/admin/brands',
    requireAdminAuth,
    requireDomainPermission('categories'),
    (req: AuthenticatedRequest, res: Response) => {
      const { name, description, status } = req.body ?? {};
      const cleanName = String(name ?? '').trim();
      if (!cleanName) {
        res.status(400).json({ error: 'Brand name is required.' });
        return;
      }
      const newBrand: AdminBrand = {
        id: `brand-${Date.now()}`,
        name: cleanName,
        slug: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description: String(description ?? '').trim(),
        status: status === 'Inactive' ? 'Inactive' : 'Active',
      };
      db.brands.push(newBrand);
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Created Brand', newBrand.name);
      }
      saveDatabase(db);
      res.status(201).json({ brand: newBrand });
    }
  );

  app.delete(
    '/api/admin/brands/:id',
    requireAdminAuth,
    requireDomainPermission('categories'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.brands.findIndex((b) => b.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Brand not found.' });
        return;
      }
      const removed = db.brands.splice(idx, 1)[0];
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Deleted Brand', removed.name);
      }
      saveDatabase(db);
      res.json({ deleted: true });
    }
  );

  // ============================================================================
  // HOMEPAGE, STOREFRONT & PAYMENT GATEWAY SETTINGS
  // ============================================================================

  app.get('/api/admin/storefront', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ storefront: db.storefront, coupons: db.coupons });
  });

  app.put(
    '/api/admin/storefront',
    requireAdminAuth,
    requireDomainPermission('content'),
    (req: AuthenticatedRequest, res: Response) => {
      const body = req.body ?? {};
      db.storefront = {
        ...db.storefront,
        brandName: String(body.brandName ?? db.storefront.brandName).trim() || 'Zestora',
        tagline: String(body.tagline ?? db.storefront.tagline).trim(),
        customLogoUrl: String(body.customLogoUrl ?? db.storefront.customLogoUrl).trim(),
        announcementBarText: String(
          body.announcementBarText ?? db.storefront.announcementBarText
        ).trim(),
        announcementBarActive: Boolean(
          body.announcementBarActive ?? db.storefront.announcementBarActive
        ),
        heroBanners: Array.isArray(body.heroBanners)
          ? body.heroBanners
          : db.storefront.heroBanners,
        featuredSectionTitle: String(
          body.featuredSectionTitle ?? db.storefront.featuredSectionTitle
        ).trim(),
        trendingSectionTitle: String(
          body.trendingSectionTitle ?? db.storefront.trendingSectionTitle
        ).trim(),
        footerTagline: String(body.footerTagline ?? db.storefront.footerTagline).trim(),
        supportEmail: String(body.supportEmail ?? db.storefront.supportEmail).trim(),
        supportHours: String(body.supportHours ?? db.storefront.supportHours).trim(),
        paymentSettings: body.paymentSettings
          ? {
              ...(db.storefront.paymentSettings ?? DEFAULT_PAYMENT_SETTINGS),
              ...body.paymentSettings,
            }
          : db.storefront.paymentSettings,
        updatedAt: new Date().toISOString(),
      };

      if (req.adminUser) {
        recordAudit(req.adminUser, 'Published Storefront Customization', 'Updated homepage & payment config');
      }
      saveDatabase(db);

      res.json({ storefront: db.storefront });
    }
  );

  // ============================================================================
  // ORDER, SHIPMENT TRACKING, PAYMENT & RETURN MANAGEMENT
  // ============================================================================

  app.get('/api/admin/orders', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({
      orders: db.orders,
      returnRequests: db.returnRequests,
      paymentTransactions: db.paymentTransactions,
    });
  });

  app.put(
    '/api/admin/orders/:id/status',
    requireAdminAuth,
    requireDomainPermission('orders'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.orders.findIndex((o) => o.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Order not found.' });
        return;
      }

      const order = db.orders[idx];
      const newStatus = (req.body?.status ?? order.status) as OrderStatus;
      const trackingNumber = String(req.body?.trackingNumber ?? order.trackingNumber).trim();
      const courierName =
        req.body?.courierName !== undefined
          ? String(req.body.courierName).trim()
          : order.courierName;
      const estimatedDeliveryDate =
        req.body?.estimatedDeliveryDate !== undefined
          ? String(req.body.estimatedDeliveryDate).trim()
          : order.estimatedDeliveryDate;
      const location =
        req.body?.location !== undefined
          ? String(req.body.location).trim()
          : 'Zestora Fulfillment Hub';
      const paymentStatus = req.body?.paymentStatus ?? order.paymentStatus;
      const note = String(req.body?.note ?? `Status updated to ${newStatus}`).trim();
      const now = new Date().toISOString();

      // If Admin cancels an order that wasn't previously cancelled, restore stock
      if (newStatus === 'Cancelled' && order.status !== 'Cancelled') {
        for (const item of order.items) {
          const prod = db.products.find((p) => p.id === item.productId);
          if (prod) {
            const prev = prod.stock;
            prod.stock += item.quantity;
            prod.updatedAt = now;
            db.stockHistory.unshift({
              id: `sh-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              previousStock: prev,
              newStock: prod.stock,
              adjustment: item.quantity,
              reason: `Admin Cancelled Order (${order.orderNumber})`,
              adminUsername: req.adminUser?.username ?? 'admin',
              timestamp: now,
            });
          }
        }
      }

      // If COD order is marked Delivered, automatically mark paymentStatus as Verified Paid unless specified
      let finalPaymentStatus = paymentStatus;
      if (newStatus === 'Delivered' && order.paymentMethod === 'COD' && paymentStatus === 'Unpaid (COD)') {
        finalPaymentStatus = 'Verified Paid';
      }

      order.status = newStatus;
      order.trackingNumber = trackingNumber;
      order.courierName = courierName;
      order.estimatedDeliveryDate = estimatedDeliveryDate;
      order.paymentStatus = finalPaymentStatus;

      if (order.returnRequest && (newStatus === 'Returned' || newStatus === 'Refunded')) {
        order.returnRequest.status = 'Completed';
        order.returnRequest.updatedAt = now;
      }

      order.statusHistory.unshift({
        status: newStatus,
        location,
        note,
        updatedBy: req.adminUser?.username ?? 'admin',
        timestamp: now,
      });

      addCustomerNotification(
        order.customerId,
        `Order ${order.orderNumber} Update: ${newStatus}`,
        `${note} ${courierName ? `(${courierName} · Tracking: ${trackingNumber})` : ''}`.trim(),
        'order'
      );

      if (req.adminUser) {
        recordAudit(
          req.adminUser,
          'Updated Order Status',
          `${order.orderNumber} → ${newStatus} (Tracking: ${trackingNumber})`
        );
      }
      saveDatabase(db);

      res.json({ order });
    }
  );

  app.get('/api/admin/customers', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ customers: db.customers.map(sanitizeCustomer) });
  });

  app.put(
    '/api/admin/customers/:id/status',
    requireAdminAuth,
    requireDomainPermission('customers'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.customers.findIndex((c) => c.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Customer not found.' });
        return;
      }
      const newStatus = req.body?.status === 'Suspended' ? 'Suspended' : 'Active';
      db.customers[idx].status = newStatus;
      if (req.adminUser) {
        recordAudit(
          req.adminUser,
          'Updated Customer Account Status',
          `${db.customers[idx].email} → ${newStatus}`
        );
      }
      saveDatabase(db);
      res.json({ customer: sanitizeCustomer(db.customers[idx]) });
    }
  );

  // ============================================================================
  // ADMIN STAFF & ROLE-BASED PERMISSIONS (SUPER_ADMIN ONLY FOR MUTATIONS)
  // ============================================================================

  app.get('/api/admin/staff', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    res.json({ staff: db.staff.map(sanitizeStaffUser) });
  });

  app.post(
    '/api/admin/staff',
    requireAdminAuth,
    requireDomainPermission('staff'),
    (req: AuthenticatedRequest, res: Response) => {
      const { name, email, username, role, password } = req.body ?? {};
      const cleanEmail = String(email ?? '').trim().toLowerCase();
      const cleanUsername = String(username ?? '').trim().toLowerCase();

      if (!name || !cleanEmail || !cleanUsername || !password || String(password).length < 6) {
        res.status(400).json({
          error: 'Name, email, username, role, and a password of at least 6 characters are required.',
        });
        return;
      }

      if (
        db.staff.some(
          (s) => s.email.toLowerCase() === cleanEmail || s.username.toLowerCase() === cleanUsername
        )
      ) {
        res.status(409).json({ error: 'A staff member with that email or username already exists.' });
        return;
      }

      const validRoles: AdminRole[] = [
        'SUPER_ADMIN',
        'PRODUCT_MANAGER',
        'INVENTORY_MANAGER',
        'ORDER_MANAGER',
        'CONTENT_MANAGER',
      ];
      const assignedRole: AdminRole = validRoles.includes(role) ? role : 'PRODUCT_MANAGER';

      const { hash, salt } = hashPassword(String(password));
      const newStaff: StoredStaffUser = {
        id: `staff-${Date.now()}`,
        name: String(name).trim(),
        email: cleanEmail,
        username: cleanUsername,
        role: assignedRole,
        status: 'Active',
        createdAt: new Date().toISOString(),
        passwordHash: hash,
        passwordSalt: salt,
      };

      db.staff.push(newStaff);
      if (req.adminUser) {
        recordAudit(req.adminUser, 'Created Staff Account', `${newStaff.username} (${newStaff.role})`);
      }
      saveDatabase(db);

      res.status(201).json({ staffMember: sanitizeStaffUser(newStaff) });
    }
  );

  app.put(
    '/api/admin/staff/:id',
    requireAdminAuth,
    requireDomainPermission('staff'),
    (req: AuthenticatedRequest, res: Response) => {
      const idx = db.staff.findIndex((s) => s.id === req.params.id);
      if (idx === -1) {
        res.status(404).json({ error: 'Staff account not found.' });
        return;
      }

      const target = db.staff[idx];
      const newRole = req.body?.role ?? target.role;
      const newStatus = req.body?.status === 'Suspended' ? 'Suspended' : 'Active';

      db.staff[idx] = {
        ...target,
        role: newRole,
        status: newStatus,
      };

      if (req.adminUser) {
        recordAudit(
          req.adminUser,
          'Updated Staff Permissions',
          `${target.username} → Role: ${newRole}, Status: ${newStatus}`
        );
      }
      saveDatabase(db);

      res.json({ staffMember: sanitizeStaffUser(db.staff[idx]) });
    }
  );

  // ============================================================================
  // VITE DEV MIDDLEWARE / STATIC ASSETS
  // ============================================================================

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Zestora Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
