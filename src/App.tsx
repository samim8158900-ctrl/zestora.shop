import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Sparkles,
  SlidersHorizontal,
  RotateCcw,
  Megaphone,
  Heart,
  History,
  Truck,
} from 'lucide-react';
import type { CartItem, CategoryId, CategoryItem, HeroSlide, Product, SortOption } from './types/store.ts';
import type { AdminOrder, AdminStaffUser, CustomerAccount, StorefrontConfig } from './types/admin.ts';
import {
  CATEGORIES,
  DEMO_PRODUCTS,
  HERO_SLIDES,
  SPECIAL_OFFERS,
} from './data/mockCatalog.ts';
import {
  addItemToCart,
  updateCartItemQuantity,
  removeItemFromCart,
  calculateCartSummary,
  filterAndSortProducts,
  formatINR,
} from './utils/cartLogic.ts';
import { Header } from './components/Header.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { CategorySection } from './components/CategorySection.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { SpecialOffersSection } from './components/SpecialOffersSection.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ProductQuickViewModal } from './components/ProductQuickViewModal.tsx';
import { AccountPreviewModal } from './components/AccountPreviewModal.tsx';
import { CustomerCheckoutModal } from './components/CustomerCheckoutModal.tsx';
import { CustomerOrdersModal } from './components/CustomerOrdersModal.tsx';
import { Footer } from './components/Footer.tsx';
import { AdminLoginPage } from './components/AdminLoginPage.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { ProductDetailsPage } from './components/ProductDetailsPage.tsx';
import { Zestora3DStudio } from './components/Zestora3DStudio.tsx';

const CART_STORAGE_KEY = 'zestora_demo_cart_v1';
const SAVED_FOR_LATER_KEY = 'zestora_saved_for_later_v1';
const WISHLIST_STORAGE_KEY = 'zestora_wishlist_ids_v1';
const RECENTLY_VIEWED_KEY = 'zestora_recently_viewed_v1';

type AppRoute = 'store' | 'product-details' | '3d-studio' | 'admin-login' | 'admin-dashboard';

function resolveProductIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname.replace(/\/+$/, '');
  const prodMatch = pathname.match(/^\/(?:product|3d-studio)\/([^/?#]+)$/i);
  if (prodMatch && prodMatch[1]) {
    return decodeURIComponent(prodMatch[1]);
  }
  const hash = window.location.hash;
  const hashMatch = hash.match(/^#\/(?:product|3d-studio)\/([^/?#]+)$/i);
  if (hashMatch && hashMatch[1]) {
    return decodeURIComponent(hashMatch[1]);
  }
  const searchParams = new URLSearchParams(window.location.search);
  const queryProduct = searchParams.get('product');
  if (queryProduct) {
    return queryProduct;
  }
  return null;
}

function resolveCurrentRoute(): AppRoute {
  if (typeof window === 'undefined') return 'store';
  const pathname = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const hash = window.location.hash.toLowerCase();
  const searchParams = new URLSearchParams(window.location.search);

  if (
    pathname === '/admin/dashboard' ||
    pathname === '/admin' ||
    hash === '#/admin/dashboard' ||
    hash === '#/admin' ||
    searchParams.get('view') === 'admin-dashboard'
  ) {
    return 'admin-dashboard';
  }

  if (
    pathname === '/admin/login' ||
    hash === '#/admin/login' ||
    searchParams.get('view') === 'admin-login'
  ) {
    return 'admin-login';
  }

  if (
    pathname === '/3d-studio' ||
    pathname.startsWith('/3d-studio/') ||
    hash === '#/3d-studio' ||
    hash.startsWith('#/3d-studio/') ||
    searchParams.get('view') === '3d-studio'
  ) {
    return '3d-studio';
  }

  if (resolveProductIdFromUrl()) {
    return 'product-details';
  }

  return 'store';
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => resolveCurrentRoute());
  const [activeProductId, setActiveProductId] = useState<string | null>(() =>
    resolveProductIdFromUrl()
  );
  const [adminUser, setAdminUser] = useState<AdminStaffUser | null>(null);
  const [adminToken, setAdminToken] = useState<string>('');
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [unauthorizedNotice, setUnauthorizedNotice] = useState<string | null>(null);

  // Separate Customer Account State (never grants admin privileges)
  const [customerAccount, setCustomerAccount] = useState<CustomerAccount | null>(null);
  const [customerToken, setCustomerToken] = useState<string>('');

  // Live Storefront Catalog & CMS State synced from backend
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [storeCategories, setStoreCategories] = useState<CategoryItem[]>(CATEGORIES);
  const [storefrontCms, setStorefrontCms] = useState<StorefrontConfig | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(100000);
  const [inStockOnlyFilter, setInStockOnlyFilter] = useState<boolean>(false);
  const [trendingTab, setTrendingTab] = useState<'All' | 'Electronics' | 'Fashion' | 'Lifestyle'>('All');

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = window.localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as CartItem[];
      }
    } catch {
      // Ignore storage access errors
    }
    return [];
  });

  const [savedForLater, setSavedForLater] = useState<Product[]>(() => {
    try {
      const saved = window.localStorage.getItem(SAVED_FOR_LATER_KEY);
      if (saved) {
        return JSON.parse(saved) as Product[];
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as string[];
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (saved) {
        return JSON.parse(saved) as string[];
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [buyNowCheckoutItems, setBuyNowCheckoutItems] = useState<CartItem[] | null>(null);
  const [ordersTrackingModalOpen, setOrdersTrackingModalOpen] = useState(false);
  const [initialSelectedOrder, setInitialSelectedOrder] = useState<AdminOrder | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Load live catalog and storefront CMS config from backend
  const loadLiveStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront/catalog');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.products) && data.products.length > 0) {
        setCatalogProducts(data.products as Product[]);
      }
      if (data.storefront) {
        setStorefrontCms(data.storefront as StorefrontConfig);
      }
      if (Array.isArray(data.categories)) {
        setStoreCategories(
          CATEGORIES.map((baseCat) => {
            const match = data.categories.find(
              (c: { name: string; itemCount?: number }) => c.name === baseCat.name
            );
            return match && typeof match.itemCount === 'number'
              ? { ...baseCat, itemCount: match.itemCount }
              : baseCat;
          })
        );
      }
    } catch {
      // Keep default catalog fallback if offline
    }
  }, []);

  useEffect(() => {
    loadLiveStorefront();
  }, [loadLiveStorefront]);

  // Verify backend HttpOnly cookie sessions on initial load (Admin & Customer)
  useEffect(() => {
    let cancelled = false;
    async function verifySessions() {
      try {
        const [adminRes, custRes] = await Promise.all([
          fetch('/api/admin/auth/me', { credentials: 'include' }).catch(() => null),
          fetch('/api/customers/auth/me', { credentials: 'include' }).catch(() => null),
        ]);
        if (!cancelled && adminRes && adminRes.ok) {
          const data = await adminRes.json();
          if (data.user) {
            setAdminUser(data.user as AdminStaffUser);
          }
        }
        if (!cancelled && custRes && custRes.ok) {
          const data = await custRes.json();
          if (data.customer) {
            setCustomerAccount(data.customer as CustomerAccount);
          }
        }
      } catch {
        // Not signed in
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    }
    verifySessions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      setCurrentRoute(resolveCurrentRoute());
      setActiveProductId(resolveProductIdFromUrl());
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  // Protect /admin and /admin/dashboard from unauthenticated direct URL visits
  useEffect(() => {
    if (!authChecking && currentRoute === 'admin-dashboard' && !adminUser) {
      setUnauthorizedNotice(
        'Protected Route: Please sign in with an authorized administrator account to access the Zestora Admin Dashboard.'
      );
      try {
        window.history.replaceState({}, '', '/admin/login');
      } catch {
        window.location.hash = '#/admin/login';
      }
      setCurrentRoute('admin-login');
    }
  }, [authChecking, currentRoute, adminUser]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Ignore storage errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_FOR_LATER_KEY, JSON.stringify(savedForLater));
    } catch {
      // Ignore
    }
  }, [savedForLater]);

  useEffect(() => {
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // Ignore
    }
  }, [wishlistIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewedIds));
    } catch {
      // Ignore
    }
  }, [recentlyViewedIds]);

  const navigateToAdminLogin = () => {
    if (adminUser) {
      try {
        window.history.pushState({}, '', '/admin/dashboard');
      } catch {
        window.location.hash = '#/admin/dashboard';
      }
      setCurrentRoute('admin-dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setUnauthorizedNotice(null);
    try {
      window.history.pushState({}, '', '/admin/login');
    } catch {
      window.location.hash = '#/admin/login';
    }
    setCurrentRoute('admin-login');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToStore = () => {
    try {
      window.history.pushState({}, '', '/');
    } catch {
      window.location.hash = '';
    }
    setActiveProductId(null);
    setCurrentRoute('store');
    loadLiveStorefront();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToProductDetails = (productOrId: Product | string) => {
    const productId = typeof productOrId === 'string' ? productOrId : productOrId.id;
    recordRecentlyViewed(productId);
    try {
      window.history.pushState({}, '', `/product/${encodeURIComponent(productId)}`);
    } catch {
      window.location.hash = `#/product/${encodeURIComponent(productId)}`;
    }
    setActiveProductId(productId);
    setCurrentRoute('product-details');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateTo3DStudio = (productId?: string) => {
    const targetId = productId || activeProductId || catalogProducts[0]?.id || 'demo-1';
    recordRecentlyViewed(targetId);
    try {
      window.history.pushState({}, '', `/3d-studio/${encodeURIComponent(targetId)}`);
    } catch {
      window.location.hash = `#/3d-studio/${encodeURIComponent(targetId)}`;
    }
    setActiveProductId(targetId);
    setCurrentRoute('3d-studio');
  };

  const handleAdminLoginSuccess = (user: AdminStaffUser, token: string) => {
    setAdminUser(user);
    setAdminToken(token);
    setUnauthorizedNotice(null);
    try {
      window.history.pushState({}, '', '/admin/dashboard');
    } catch {
      window.location.hash = '#/admin/dashboard';
    }
    setCurrentRoute('admin-dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : undefined,
        credentials: 'include',
      });
    } catch {
      // Ignore logout network error
    }
    setAdminUser(null);
    setAdminToken('');
    setUnauthorizedNotice(null);
    try {
      window.history.pushState({}, '', '/admin/login');
    } catch {
      window.location.hash = '#/admin/login';
    }
    setCurrentRoute('admin-login');
  };

  const handleCustomerAuthenticated = (cust: CustomerAccount, token?: string) => {
    setCustomerAccount(cust);
    if (token) {
      setCustomerToken(token);
      try {
        window.localStorage.setItem('zestora_customer_token', token);
      } catch {
        // Ignore
      }
    }
    if (currentRoute === 'product-details') {
      setAccountModalOpen(false);
    }
  };

  const handleCustomerLogout = async () => {
    try {
      await fetch('/api/customers/auth/logout', {
        method: 'POST',
        headers: customerToken ? { 'x-customer-token': customerToken } : undefined,
        credentials: 'include',
      });
    } catch {
      // Ignore
    }
    setCustomerAccount(null);
    setCustomerToken('');
    try {
      window.localStorage.removeItem('zestora_customer_token');
    } catch {
      // Ignore
    }
  };

  const cartSummary = useMemo(() => calculateCartSummary(cart), [cart]);

  // Filtered Featured / Catalog Products
  const displayedFeaturedProducts = useMemo(() => {
    const isFiltering =
      searchQuery.trim().length > 0 ||
      selectedCategory !== 'All' ||
      maxPriceFilter < 100000 ||
      inStockOnlyFilter;
    const baseFiltered = filterAndSortProducts(catalogProducts, {
      searchQuery,
      category: selectedCategory,
      sortBy,
      onlyFeatured: !isFiltering,
    });
    return baseFiltered.filter((p) => {
      if (p.price > maxPriceFilter) return false;
      if (inStockOnlyFilter && (!p.inStock || (typeof p.stock === 'number' && p.stock <= 0))) {
        return false;
      }
      return true;
    });
  }, [catalogProducts, searchQuery, selectedCategory, sortBy, maxPriceFilter, inStockOnlyFilter]);

  // Trending Products Section
  const displayedTrendingProducts = useMemo(() => {
    const trendingBase = catalogProducts.filter((p) => p.trending);
    if (trendingTab === 'All') return trendingBase;
    if (trendingTab === 'Electronics') {
      return trendingBase.filter((p) => p.category === 'Electronics');
    }
    if (trendingTab === 'Fashion') {
      return trendingBase.filter(
        (p) => p.category === 'Fashion' || p.category === 'Footwear' || p.category === 'Accessories'
      );
    }
    return trendingBase.filter(
      (p) =>
        p.category === 'Home and Kitchen' ||
        p.category === 'Beauty' ||
        p.category === 'Sports' ||
        p.category === 'Toys'
    );
  }, [catalogProducts, trendingTab]);

  // Wishlist & Recently Viewed Resolved Products
  const wishlistedProducts = useMemo(
    () => catalogProducts.filter((p) => wishlistIds.includes(p.id)),
    [catalogProducts, wishlistIds]
  );

  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => catalogProducts.find((p) => p.id === id))
        .filter((p): p is Product => Boolean(p))
        .slice(0, 4),
    [catalogProducts, recentlyViewedIds]
  );

  const recordRecentlyViewed = (productId: string) => {
    setRecentlyViewedIds((prev) => [productId, ...prev.filter((id) => id !== productId)].slice(0, 8));
  };

  const handleQuickView = (product: Product) => {
    navigateToProductDetails(product);
  };

  const handleAddToCart = (product: Product, quantityToAdd = 1, selectedVariant?: string) => {
    recordRecentlyViewed(product.id);
    setCart((prev) => {
      const updated = addItemToCart(prev, product, quantityToAdd);
      if (!selectedVariant) return updated;
      return updated.map((item) =>
        item.product.id === product.id ? { ...item, selectedVariant } : item
      );
    });
  };

  const handleBuyNow = (product: Product, quantityToBuy = 1, selectedVariant?: string) => {
    recordRecentlyViewed(product.id);
    setCart((prev) => addItemToCart(prev, product, quantityToBuy));
    setBuyNowCheckoutItems([{ product, quantity: quantityToBuy, selectedVariant }]);
    setQuickViewProduct(null);
    setCartDrawerOpen(false);
    setCheckoutModalOpen(true);
  };

  const handleProceedToCheckoutFromCart = () => {
    setBuyNowCheckoutItems(null);
    setCartDrawerOpen(false);
    setCheckoutModalOpen(true);
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === productId);
      if (!existing) return prev;
      return updateCartItemQuantity(prev, productId, existing.quantity + delta);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => removeItemFromCart(prev, productId));
  };

  const handleSaveForLater = (product: Product) => {
    setCart((prev) => removeItemFromCart(prev, product.id));
    setSavedForLater((prev) => {
      if (prev.some((s) => s.id === product.id)) return prev;
      return [...prev, product];
    });
  };

  const handleMoveToCart = (product: Product) => {
    setSavedForLater((prev) => prev.filter((s) => s.id !== product.id));
    setCart((prev) => addItemToCart(prev, product, 1));
  };

  const handleRemoveSaved = (productId: string) => {
    setSavedForLater((prev) => prev.filter((s) => s.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleOrderCompleted = (order: AdminOrder) => {
    if (buyNowCheckoutItems) {
      setBuyNowCheckoutItems(null);
    } else {
      setCart([]);
    }
    loadLiveStorefront();
    setInitialSelectedOrder(order);
  };

  const handleToggleWishlist = (productId: string) => {
    setWishlistIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const scrollToSection = (sectionId: string) => {
    if (currentRoute !== 'store') {
      try {
        window.history.pushState({}, '', '/');
      } catch {
        window.location.hash = '';
      }
      setActiveProductId(null);
      setCurrentRoute('store');
      window.setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 60);
      return;
    }
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    scrollToSection('featured-products');
  };

  const handleHeroShopNow = (targetCategory?: CategoryId | 'All') => {
    if (targetCategory) {
      setSelectedCategory(targetCategory);
    }
    scrollToSection('featured-products');
  };

  const handleSelectCategoryAndScroll = (category: CategoryId | 'All') => {
    setSelectedCategory(category);
    if (currentRoute !== 'store') {
      try {
        window.history.pushState({}, '', '/');
      } catch {
        window.location.hash = '';
      }
      setActiveProductId(null);
      setCurrentRoute('store');
    }
  };

  // Protected Admin Dashboard Route (/admin or /admin/dashboard)
  if (currentRoute === 'admin-dashboard') {
    if (authChecking) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-[#0A192F]">
          <p className="text-sm font-bold">Verifying Administrator Session...</p>
        </div>
      );
    }
    if (!adminUser) {
      return (
        <AdminLoginPage
          onBackToStore={navigateToStore}
          onLoginSuccess={handleAdminLoginSuccess}
          unauthorizedNotice="Protected Route: Please sign in with an authorized administrator account to access the Zestora Admin Dashboard."
        />
      );
    }
    return (
      <AdminDashboard
        currentUser={adminUser}
        adminToken={adminToken}
        onLogout={handleAdminLogout}
        onBackToStore={navigateToStore}
        onCatalogMutated={loadLiveStorefront}
      />
    );
  }

  // Separate Administrator Login Page Route (/admin/login)
  if (currentRoute === 'admin-login') {
    return (
      <AdminLoginPage
        onBackToStore={navigateToStore}
        onLoginSuccess={handleAdminLoginSuccess}
        unauthorizedNotice={unauthorizedNotice}
      />
    );
  }

  // Full-Bleed 100vw x 100vh Interactive 3D Product Studio (/3d-studio or /3d-studio/:id)
  if (currentRoute === '3d-studio') {
    return (
      <Zestora3DStudio
        products={catalogProducts}
        activeProductId={activeProductId}
        onSelectProductId={(id) => navigateTo3DStudio(id)}
        onAddToCart={(prod) => handleAddToCart(prod, 1)}
        onOpenProductDetails={(prod) => navigateToProductDetails(prod)}
        onCloseStudio={navigateToStore}
      />
    );
  }

  const isFilteringActive =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'All' ||
    maxPriceFilter < 100000 ||
    inStockOnlyFilter;
  const activeHeroSlides: HeroSlide[] =
    storefrontCms?.heroBanners && storefrontCms.heroBanners.length > 0
      ? storefrontCms.heroBanners
      : HERO_SLIDES;

  const activeCheckoutItems = buyNowCheckoutItems ?? cart;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0A192F]">
      {/* Optional Live Storefront Announcement Bar (Managed from Admin CMS) */}
      {storefrontCms?.announcementBarActive && storefrontCms.announcementBarText && (
        <div className="bg-[#0A192F] text-white text-xs py-2 px-4 text-center">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <Megaphone className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
            <span className="font-medium truncate">{storefrontCms.announcementBarText}</span>
          </div>
        </div>
      )}

      {/* 1–6. Header, Logo Area, Search Bar, Account, Orders/Tracking, Cart & Main Navigation */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategoryAndScroll}
        categories={storeCategories}
        cartCount={cartSummary.totalItems}
        wishlistCount={wishlistIds.length}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenAccount={() => setAccountModalOpen(true)}
        onOpenOrdersTracking={() => {
          setInitialSelectedOrder(null);
          setOrdersTrackingModalOpen(true);
        }}
        onOpen3DStudio={() => navigateTo3DStudio()}
        customer={customerAccount}
        onNavigateSection={scrollToSection}
      />

      <main className="flex-1">
        {currentRoute === 'product-details' && activeProductId ? (
          <ProductDetailsPage
            productIdOrSlug={activeProductId}
            catalogProducts={catalogProducts}
            customerAccount={customerAccount}
            customerToken={customerToken}
            wishlistIds={wishlistIds}
            recentlyViewedProducts={recentlyViewedProducts}
            onBackToStore={navigateToStore}
            onSelectCategory={(cat) => {
              handleSelectCategoryAndScroll(cat);
              window.setTimeout(() => scrollToSection('featured-products'), 50);
            }}
            onSelectProduct={(prod) => navigateToProductDetails(prod)}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            onToggleWishlist={handleToggleWishlist}
            onRequireCustomerAuth={() => setAccountModalOpen(true)}
            onCatalogRefresh={loadLiveStorefront}
            onOpen3DStudio={(prodId) => navigateTo3DStudio(prodId)}
          />
        ) : (
          <>
            {/* 7. Promotional Hero Banner */}
            <HeroBanner slides={activeHeroSlides} onShopNow={handleHeroShopNow} />

        {/* 8. Product Categories (All 8 Required Categories) */}
        <CategorySection
          categories={storeCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategoryAndScroll}
        />

        {/* 9. Featured Products / Best Deals Section (Also serves active Search, Category & Price Filter) */}
        <section
          id="featured-products"
          aria-labelledby="featured-products-heading"
          className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0066FF] mb-1">
                <Flame className="w-4 h-4 text-orange-500 fill-orange-500" aria-hidden="true" />
                <span>
                  {isFilteringActive ? 'Filtered Store Catalog' : 'Curated Collection'}
                </span>
              </div>
              <h2
                id="featured-products-heading"
                className="text-2xl sm:text-3xl font-extrabold text-[#0A192F] tracking-tight"
              >
                {selectedCategory !== 'All'
                  ? `${selectedCategory} Showcase`
                  : searchQuery.trim()
                  ? `Search Results for “${searchQuery.trim()}”`
                  : storefrontCms?.featuredSectionTitle || 'Featured Products & Best Deals'}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 mt-1">
                Live Zestora catalog with Indian Rupee (₹) pricing, instant Buy Now, and real-time stock synchronization.
              </p>
            </div>

            {/* Price Filter, In-Stock Toggle, Sort & Reset Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
              {isFilteringActive && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                    setMaxPriceFilter(100000);
                    setInStockOnlyFilter(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200/80 hover:bg-slate-300/80 text-[#0A192F] text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Reset Filters</span>
                </button>
              )}

              {/* Price Ceiling Filter */}
              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <label htmlFor="price-filter-select" className="text-xs font-semibold text-slate-600">
                  Max Price:
                </label>
                <select
                  id="price-filter-select"
                  value={maxPriceFilter}
                  onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                  className="text-xs font-bold text-[#0A192F] bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value={100000}>Any Price</option>
                  <option value={2000}>Under ₹2,000</option>
                  <option value={5000}>Under ₹5,000</option>
                  <option value={15000}>Under ₹15,000</option>
                  <option value={30000}>Under ₹30,000</option>
                </select>
              </div>

              {/* In-Stock Filter */}
              <label className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs text-xs font-bold text-[#0A192F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnlyFilter}
                  onChange={(e) => setInStockOnlyFilter(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#0066FF]"
                />
                <span>In Stock Only</span>
              </label>

              <div className="inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <label htmlFor="sort-products-select" className="text-xs font-semibold text-slate-600">
                  Sort by:
                </label>
                <select
                  id="sort-products-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="text-xs sm:text-sm font-bold text-[#0A192F] bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating-desc">Customer Rating</option>
                </select>
              </div>
            </div>
          </div>

          {displayedFeaturedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <h3 className="text-lg font-bold text-[#0A192F]">
                No matching products found
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                We couldn&apos;t find any items matching your current search, category, or price filter. Try clearing your filter to view all products.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setMaxPriceFilter(100000);
                  setInStockOnlyFilter(false);
                }}
                className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-bold transition-colors cursor-pointer"
              >
                Show All Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedFeaturedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  onQuickView={handleQuickView}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          )}
        </section>

        {/* Saved Wishlist & Recently Viewed Bar (Appears when customer has wishlisted or viewed items) */}
        {(wishlistedProducts.length > 0 || recentlyViewedProducts.length > 0) && (
          <section className="py-10 bg-slate-100/70 border-t border-slate-200/80">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              {wishlistedProducts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <h3 className="text-lg font-extrabold text-[#0A192F]">
                        Your Saved Wishlist ({wishlistedProducts.length})
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {wishlistedProducts.map((product) => (
                      <ProductCard
                        key={`wish-${product.id}`}
                        product={product}
                        onAddToCart={handleAddToCart}
                        onBuyNow={handleBuyNow}
                        onQuickView={handleQuickView}
                        isWishlisted={true}
                        onToggleWishlist={handleToggleWishlist}
                      />
                    ))}
                  </div>
                </div>
              )}

              {recentlyViewedProducts.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-[#0066FF]" />
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-600">
                        Recently Viewed Products
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {recentlyViewedProducts.map((item) => (
                      <button
                        key={`recent-${item.id}`}
                        type="button"
                        onClick={() => handleQuickView(item)}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-200/90 hover:border-[#0066FF] text-left transition-all cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#0A192F] truncate">{item.name}</p>
                          <p className="text-xs font-extrabold text-[#0066FF] mt-0.5">
                            {formatINR(item.price)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 10. Trending Products Section */}
        <section
          id="trending-products"
          aria-labelledby="trending-products-heading"
          className="py-12 sm:py-16 bg-white border-t border-slate-200/80"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0066FF] mb-1">
                  <Sparkles className="w-4 h-4 text-[#0066FF]" aria-hidden="true" />
                  <span>Most Popular This Week</span>
                </div>
                <h2
                  id="trending-products-heading"
                  className="text-2xl sm:text-3xl font-extrabold text-[#0A192F] tracking-tight"
                >
                  {storefrontCms?.trendingSectionTitle || 'Trending Products on Zestora'}
                </h2>
                <p className="text-sm sm:text-base text-slate-600 mt-1">
                  Top-rated selections across tech, apparel, and everyday living.
                </p>
              </div>

              {/* Interactive Filter Tabs */}
              <div
                className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start md:self-auto"
                role="tablist"
                aria-label="Filter trending products"
              >
                {(['All', 'Electronics', 'Fashion', 'Lifestyle'] as const).map((tab) => {
                  const active = trendingTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTrendingTab(tab)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-[#0066FF] shadow-xs'
                          : 'text-slate-600 hover:text-[#0A192F]'
                      }`}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedTrendingProducts.slice(0, 8).map((product) => (
                <ProductCard
                  key={`trending-${product.id}`}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onBuyNow={handleBuyNow}
                  onQuickView={handleQuickView}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 11. Special Offers Section */}
        <SpecialOffersSection
          offers={SPECIAL_OFFERS}
          products={catalogProducts}
          onAddToCart={handleAddToCart}
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            scrollToSection('featured-products');
          }}
        />

        {/* Live Order Tracking Banner */}
        <section className="bg-[#0A192F] text-white py-8 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#0066FF]/20 border border-[#0066FF]/40 flex items-center justify-center text-sky-400 shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold">
                  Real-Time Zestora Order & Shipment Tracking
                </h2>
                <p className="text-xs text-slate-300">
                  Track live parcel milestones, download GST tax invoices, or manage returns & cancellations anytime.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setInitialSelectedOrder(null);
                setOrdersTrackingModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-extrabold transition-colors cursor-pointer shrink-0"
            >
              Track Orders & Returns
            </button>
          </div>
        </section>
          </>
        )}
      </main>

      {/* 12. Footer */}
      <Footer
        categories={storeCategories}
        onSelectCategory={handleSelectCategoryAndScroll}
        onNavigateSection={scrollToSection}
        onOpenAdminLogin={navigateToAdminLogin}
      />

      {/* Interactive Slide-Over Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        items={cart}
        savedForLater={savedForLater}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onSaveForLater={handleSaveForLater}
        onMoveSavedToCart={handleMoveToCart}
        onRemoveSaved={handleRemoveSaved}
        onClearCart={handleClearCart}
        onProceedToCheckout={handleProceedToCheckoutFromCart}
      />

      {/* Multi-Step Flipkart/Amazon-Style Customer Checkout Modal */}
      <CustomerCheckoutModal
        isOpen={checkoutModalOpen}
        onClose={() => {
          setCheckoutModalOpen(false);
          setBuyNowCheckoutItems(null);
        }}
        items={activeCheckoutItems}
        customer={customerAccount}
        paymentSettings={storefrontCms?.paymentSettings}
        onCustomerAuthenticated={handleCustomerAuthenticated}
        onCustomerUpdated={setCustomerAccount}
        onOrderCompleted={handleOrderCompleted}
        onOpenTrackingForOrder={(order) => {
          setCheckoutModalOpen(false);
          setBuyNowCheckoutItems(null);
          setInitialSelectedOrder(order);
          setOrdersTrackingModalOpen(true);
        }}
      />

      {/* My Orders, Live 8-Stage Shipment Tracking, Cancellations & Returns Modal */}
      <CustomerOrdersModal
        isOpen={ordersTrackingModalOpen}
        onClose={() => setOrdersTrackingModalOpen(false)}
        customer={customerAccount}
        initialSelectedOrder={initialSelectedOrder}
        onOrderUpdated={loadLiveStorefront}
      />

      {/* Product Quick View Modal */}
      <ProductQuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* Customer Account Modal with Separate Admin Login Link */}
      <AccountPreviewModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onOpenAdminLogin={navigateToAdminLogin}
        onOpenOrdersTracking={() => {
          setAccountModalOpen(false);
          setInitialSelectedOrder(null);
          setOrdersTrackingModalOpen(true);
        }}
        customer={customerAccount}
        onCustomerLogin={handleCustomerAuthenticated}
        onCustomerLogout={handleCustomerLogout}
      />
    </div>
  );
}
