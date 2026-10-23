import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  IndianRupee,
  Boxes,
  FolderTree,
  Sliders,
  ShoppingCart,
  ShieldCheck,
  Search,
  Plus,
  Edit3,
  Copy,
  Trash2,
  LogOut,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react';
import type {
  AdminBrand,
  AdminCategory,
  AdminDashboardOverview,
  AdminOrder,
  AdminProduct,
  AdminRole,
  AdminStaffUser,
  CustomerAccount,
  OrderStatus,
  ProductStatus,
  StorefrontConfig,
} from '../types/admin.ts';
import {
  classifyInventoryStock,
  hasAdminPermission,
  type PermissionDomain,
} from '../utils/adminPricingAndRbac.ts';
import { formatINR } from '../utils/cartLogic.ts';
import { ZestoraLogo } from './ZestoraLogo.tsx';
import { ProductArtwork } from './ProductIllustration.tsx';
import { AdminProductFormModal } from './AdminProductFormModal.tsx';

export type AdminTabId =
  | 'overview'
  | 'products'
  | 'pricing'
  | 'inventory'
  | 'categories'
  | 'content'
  | 'orders'
  | 'staff';

interface AdminDashboardProps {
  currentUser: AdminStaffUser;
  adminToken: string;
  onLogout: () => void;
  onBackToStore: () => void;
  onCatalogMutated: () => void;
}

const NAV_ITEMS: {
  id: AdminTabId;
  label: string;
  domain?: PermissionDomain;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products Catalog', domain: 'products', icon: Package },
  { id: 'pricing', label: 'Pricing & Discounts', domain: 'pricing', icon: IndianRupee },
  { id: 'inventory', label: 'Inventory & Stock', domain: 'inventory', icon: Boxes },
  { id: 'categories', label: 'Categories & Brands', domain: 'categories', icon: FolderTree },
  { id: 'content', label: 'Storefront CMS', domain: 'content', icon: Sliders },
  { id: 'orders', label: 'Orders & Customers', domain: 'orders', icon: ShoppingCart },
  { id: 'staff', label: 'Staff & RBAC Security', domain: 'staff', icon: ShieldCheck },
];

export function AdminDashboard({
  currentUser,
  adminToken,
  onLogout,
  onBackToStore,
  onCatalogMutated,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<CustomerAccount[]>([]);
  const [staffList, setStaffList] = useState<AdminStaffUser[]>([]);
  const [storefrontConfig, setStorefrontConfig] = useState<StorefrontConfig | null>(null);

  const [loading, setLoading] = useState(true);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Product Management Filters & Modals
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('All');
  const [productStockFilter, setProductStockFilter] = useState<
    'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'
  >('All');
  const [productStatusFilter, setProductStatusFilter] = useState<'All' | ProductStatus>('All');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ProductStatus>('Active');
  const [bulkDiscount, setBulkDiscount] = useState<string>('');

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<AdminProduct | null>(null);

  // Pricing inline edit state
  const [pricingDrafts, setPricingDrafts] = useState<
    Record<string, { regularPrice: string; price: string; costPrice: string }>
  >({});

  // Inventory inline adjustment state
  const [inventoryFilter, setInventoryFilter] = useState<
    'All' | 'Low Stock' | 'Out of Stock' | 'In Stock'
  >('All');
  const [stockDrafts, setStockDrafts] = useState<
    Record<string, { stock: string; threshold: string; reason: string }>
  >({});

  // Categories & Brands creation state
  const [newCatName, setNewCatName] = useState('');
  const [newCatParent, setNewCatParent] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandDesc, setNewBrandDesc] = useState('');

  // Orders & Customers filter state
  const [orderStatusFilter, setOrderStatusFilter] = useState<'All' | OrderStatus>('All');
  const [customerSearch, setCustomerSearch] = useState('');

  // Staff creation state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffUsername, setNewStaffUsername] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<AdminRole>('PRODUCT_MANAGER');
  const [newStaffPassword, setNewStaffPassword] = useState('');

  const authHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    }),
    [adminToken]
  );

  const notify = (type: 'success' | 'error', text: string) => {
    setBannerMessage({ type, text });
    window.setTimeout(() => {
      setBannerMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const fetchAllAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const [ovRes, prodRes, catRes, brdRes, sfRes, ordRes, custRes, stfRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/products', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/categories', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/brands', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/storefront', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/orders', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/customers', { headers: authHeaders, credentials: 'include' }),
        fetch('/api/admin/staff', { headers: authHeaders, credentials: 'include' }),
      ]);

      if (ovRes.status === 401) {
        onLogout();
        return;
      }

      const [ovData, prodData, catData, brdData, sfData, ordData, custData, stfData] =
        await Promise.all([
          ovRes.json(),
          prodRes.json(),
          catRes.json(),
          brdRes.json(),
          sfRes.json(),
          ordRes.json(),
          custRes.json(),
          stfRes.json(),
        ]);

      setOverview(ovData);
      setProducts(prodData.products ?? []);
      setCategories(catData.categories ?? []);
      setBrands(brdData.brands ?? []);
      setStorefrontConfig(sfData.storefront ?? null);
      setOrders(ordData.orders ?? []);
      setCustomers(custData.customers ?? []);
      setStaffList(stfData.staff ?? []);
    } catch {
      notify('error', 'Failed to load admin control panel data.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, onLogout]);

  useEffect(() => {
    fetchAllAdminData();
  }, [fetchAllAdminData]);

  // Filtered Products for Product Management
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (productCatFilter !== 'All' && p.category !== productCatFilter) return false;
      if (productStatusFilter !== 'All' && p.status !== productStatusFilter) return false;
      const stockClass = classifyInventoryStock(p.stock, p.lowStockThreshold);
      if (productStockFilter !== 'All' && stockClass !== productStockFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, productCatFilter, productStatusFilter, productStockFilter]);

  // Filtered Products for Inventory Tab
  const filteredInventoryProducts = useMemo(() => {
    return products.filter((p) => {
      if (inventoryFilter === 'All') return true;
      return classifyInventoryStock(p.stock, p.lowStockThreshold) === inventoryFilter;
    });
  }, [products, inventoryFilter]);

  // Handlers: Duplicate Product
  const handleDuplicateProduct = async (product: AdminProduct) => {
    try {
      const res = await fetch(`/api/admin/products/${product.id}/duplicate`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Could not duplicate product.');
        return;
      }
      notify('success', `Duplicated "${product.name}" as Draft SKU ${data.product.sku}.`);
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Network error while duplicating product.');
    }
  };

  // Handlers: Delete or Archive Product
  const handleConfirmDeleteProduct = async () => {
    if (!deleteConfirmProduct) return;
    try {
      const res = await fetch(`/api/admin/products/${deleteConfirmProduct.id}`, {
        method: 'DELETE',
        headers: authHeaders,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to delete product.');
        return;
      }
      if (data.archived) {
        notify(
          'success',
          `"${deleteConfirmProduct.name}" is linked to customer orders and was safely Archived.`
        );
      } else {
        notify('success', `Deleted product "${deleteConfirmProduct.name}".`);
      }
      setDeleteConfirmProduct(null);
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Network error while deleting product.');
    }
  };

  // Handlers: Bulk Product Update
  const handleBulkUpdateProducts = async () => {
    if (selectedProductIds.length === 0) return;
    try {
      const payload: {
        productIds: string[];
        status: ProductStatus;
        discountPercentage?: number;
      } = {
        productIds: selectedProductIds,
        status: bulkStatus,
      };
      if (bulkDiscount.trim() !== '') {
        payload.discountPercentage = Number(bulkDiscount);
      }
      const res = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Bulk update failed.');
        return;
      }
      notify('success', `Updated ${data.updatedCount} selected products.`);
      setSelectedProductIds([]);
      setBulkDiscount('');
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Network error during bulk update.');
    }
  };

  // Handlers: Quick Price Update
  const handleSaveQuickPrice = async (product: AdminProduct) => {
    const draft = pricingDrafts[product.id];
    const regularPrice = draft ? Number(draft.regularPrice) : product.regularPrice;
    const price = draft ? Number(draft.price) : product.price;
    const costPrice = draft ? Number(draft.costPrice) : (product.costPrice ?? 0);

    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          regularPrice,
          price,
          discountType: 'none',
          costPrice,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Price update rejected.');
        return;
      }
      notify('success', `Updated pricing for ${product.name} (${formatINR(data.product.price)}).`);
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Network error while updating price.');
    }
  };

  // Handlers: Inventory Stock Adjustment
  const handleAdjustStock = async (product: AdminProduct) => {
    const draft = stockDrafts[product.id];
    const newStock = draft?.stock !== undefined ? Number(draft.stock) : product.stock;
    const lowStockThreshold =
      draft?.threshold !== undefined ? Number(draft.threshold) : product.lowStockThreshold;
    const reason = draft?.reason || 'Manual Restock / Inventory Count';

    try {
      const res = await fetch(`/api/admin/inventory/${product.id}`, {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          stock: newStock,
          lowStockThreshold,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Inventory update failed.');
        return;
      }
      notify('success', `Stock updated for ${product.sku}: ${data.product.stock} units.`);
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Network error while updating inventory.');
    }
  };

  // Handlers: Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          name: newCatName.trim(),
          parentCategory: newCatParent || null,
          description: newCatDesc.trim() || `${newCatName.trim()} department`,
          status: 'Active',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Could not create category.');
        return;
      }
      setNewCatName('');
      setNewCatParent('');
      setNewCatDesc('');
      notify('success', `Created category "${data.category.name}".`);
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Network error creating category.');
    }
  };

  const handleToggleCategoryStatus = async (cat: AdminCategory) => {
    const nextStatus = cat.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        notify('success', `Category "${cat.name}" set to ${nextStatus}.`);
        await fetchAllAdminData();
        onCatalogMutated();
      }
    } catch {
      notify('error', 'Error updating category.');
    }
  };

  const handleDeleteCategory = async (cat: AdminCategory) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: 'DELETE',
        headers: authHeaders,
        credentials: 'include',
      });
      if (res.ok) {
        notify('success', `Deleted category "${cat.name}".`);
        await fetchAllAdminData();
        onCatalogMutated();
      }
    } catch {
      notify('error', 'Error deleting category.');
    }
  };

  // Handlers: Create Brand
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandName.trim()) return;
    try {
      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          name: newBrandName.trim(),
          description: newBrandDesc.trim() || 'Official Zestora Partner Brand',
          status: 'Active',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Could not create brand.');
        return;
      }
      setNewBrandName('');
      setNewBrandDesc('');
      notify('success', `Added brand "${data.brand.name}".`);
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Error creating brand.');
    }
  };

  // Handlers: Save Storefront Config
  const handleSaveStorefront = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storefrontConfig) return;
    try {
      const res = await fetch('/api/admin/storefront', {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify(storefrontConfig),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to publish storefront settings.');
        return;
      }
      setStorefrontConfig(data.storefront);
      notify('success', 'Published storefront customization to live website.');
      await fetchAllAdminData();
      onCatalogMutated();
    } catch {
      notify('error', 'Network error publishing storefront settings.');
    }
  };

  // Handlers: Update Order Status, Courier, Tracking & Payment Status
  const handleUpdateOrderStatus = async (
    order: AdminOrder,
    status: OrderStatus,
    trackingNumber: string,
    extra?: { courierName?: string; paymentStatus?: AdminOrder['paymentStatus'] }
  ) => {
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          status,
          trackingNumber,
          courierName: extra?.courierName ?? order.courierName,
          paymentStatus: extra?.paymentStatus ?? order.paymentStatus,
          note: `Order updated (${status}) by ${currentUser.username}`,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        notify('error', d.error || 'Failed to update order status.');
        return;
      }
      notify('success', `Order ${order.orderNumber} updated (${status}).`);
      await fetchAllAdminData();
    } catch {
      notify('error', 'Network error updating order.');
    }
  };

  // Handlers: Update Customer Status
  const handleToggleCustomerStatus = async (cust: CustomerAccount) => {
    const nextStatus = cust.status === 'Active' ? 'Suspended' : 'Active';
    try {
      const res = await fetch(`/api/admin/customers/${cust.id}/status`, {
        method: 'PUT',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        notify('success', `Customer ${cust.email} status set to ${nextStatus}.`);
        await fetchAllAdminData();
      }
    } catch {
      notify('error', 'Error updating customer account.');
    }
  };

  // Handlers: Create Staff Member
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: authHeaders,
        credentials: 'include',
        body: JSON.stringify({
          name: newStaffName.trim(),
          email: newStaffEmail.trim(),
          username: newStaffUsername.trim(),
          role: newStaffRole,
          password: newStaffPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Could not create staff account.');
        return;
      }
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffUsername('');
      setNewStaffPassword('');
      notify('success', `Created staff account "${data.staffMember.username}" (${data.staffMember.role}).`);
      await fetchAllAdminData();
    } catch {
      notify('error', 'Network error creating staff account.');
    }
  };

  const activeNavMeta = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];
  const canWriteProducts = hasAdminPermission(currentUser.role, 'products');
  const canWritePricing = hasAdminPermission(currentUser.role, 'pricing');
  const canWriteInventory = hasAdminPermission(currentUser.role, 'inventory');
  const canWriteCategories = hasAdminPermission(currentUser.role, 'categories');
  const canWriteContent = hasAdminPermission(currentUser.role, 'content');
  const canWriteOrders = hasAdminPermission(currentUser.role, 'orders');
  const canWriteStaff = hasAdminPermission(currentUser.role, 'staff');

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0A192F]">
      {/* Desktop Sidebar Navigation (260px) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-[#0A192F] text-white border-r border-slate-800 z-30">
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/80">
          <ZestoraLogo variant="dark" size="sm" showTagline={false} />
          <span className="text-[11px] font-mono text-sky-400">ADMIN</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Admin sidebar navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#0066FF] text-white shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active Admin User Profile Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 space-y-2">
          <div className="text-xs">
            <p className="font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[11px] text-sky-400 font-mono truncate">{currentUser.role}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-rose-600 text-xs font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Slide-Over */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-64 max-w-[80vw] bg-[#0A192F] text-white h-full flex flex-col justify-between">
            <div>
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
                <ZestoraLogo variant="dark" size="sm" showTagline={false} />
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  aria-label="Close admin navigation drawer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                        active ? 'bg-[#0066FF] text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <div className="p-4 border-t border-slate-800">
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-2 px-3 rounded-lg bg-rose-600 text-white text-xs font-bold flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Workspace */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header Bar (3_saas_dashboard.md Contract: Breadcrumb left, 1-2 primary actions right) */}
        <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open admin navigation menu"
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-500 min-w-0">
              <span className="hidden sm:inline font-bold text-[#0A192F] whitespace-nowrap">
                Zestora Admin
              </span>
              <span aria-hidden="true" className="hidden sm:inline">
                /
              </span>
              <span className="font-bold sm:font-semibold text-[#0066FF] truncate">
                {activeNavMeta.label}
              </span>
              <span aria-hidden="true" className="hidden md:inline">
                ·
              </span>
              <span className="hidden md:inline font-mono text-xs text-slate-500 whitespace-nowrap">
                Role: {currentUser.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={fetchAllAdminData}
              aria-label="Refresh dashboard data"
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onBackToStore}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl border border-slate-200 hover:border-[#0066FF] text-xs font-bold text-[#0A192F] hover:text-[#0066FF] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">View Live Storefront</span>
              <span className="sm:hidden">Store</span>
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-600 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Feedback Banner */}
        {bannerMessage && (
          <div className="px-4 sm:px-6 lg:px-8 pt-4">
            <div
              role="status"
              className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
                bannerMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {bannerMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{bannerMessage.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setBannerMessage(null)}
                aria-label="Dismiss notification"
                className="text-xs underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {loading && !overview ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2">
              <p className="text-sm font-bold text-[#0A192F]">Loading Zestora Admin Control Center...</p>
              <p className="text-xs text-slate-500">Verifying session and synchronizing catalog metrics.</p>
            </div>
          ) : (
            <>
              {/* ================================================================
                  TAB 1: DASHBOARD OVERVIEW
                 ================================================================ */}
              {activeTab === 'overview' && overview && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] tracking-tight">
                        Executive Storefront Overview
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Live catalog, inventory health, customer registrations, and verified order metrics.
                      </p>
                    </div>
                    {canWriteProducts && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setProductModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product</span>
                      </button>
                    )}
                  </div>

                  {/* 8 Real KPI Metric Cards (Single-Elevation, Tabular Numerals) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 tabular-nums">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Total Products</p>
                      <p
                        data-testid="metric-total-products"
                        className="text-2xl font-extrabold text-[#0A192F] mt-1"
                      >
                        {overview.totalProducts}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {overview.draftProducts} Drafts · {overview.totalBrands} Brands
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Active Store Products</p>
                      <p
                        data-testid="metric-active-products"
                        className="text-2xl font-extrabold text-emerald-700 mt-1"
                      >
                        {overview.activeProducts}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Published on live storefront
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Out-of-Stock Products</p>
                      <p
                        data-testid="metric-out-of-stock"
                        className="text-2xl font-extrabold text-rose-600 mt-1"
                      >
                        {overview.outOfStockProducts}
                      </p>
                      <p className="text-[11px] text-amber-700 font-semibold mt-1">
                        {overview.lowStockProducts} Low-Stock Alerts
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Total Categories</p>
                      <p
                        data-testid="metric-total-categories"
                        className="text-2xl font-extrabold text-[#0A192F] mt-1"
                      >
                        {overview.totalCategories}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Includes subcategories
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Registered Customers</p>
                      <p
                        data-testid="metric-total-customers"
                        className="text-2xl font-extrabold text-[#0A192F] mt-1"
                      >
                        {overview.totalCustomers}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Separate customer accounts
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Total Orders</p>
                      <p
                        data-testid="metric-total-orders"
                        className="text-2xl font-extrabold text-[#0A192F] mt-1"
                      >
                        {overview.totalOrders}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Real storefront orders
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Pending Orders</p>
                      <p
                        data-testid="metric-pending-orders"
                        className="text-2xl font-extrabold text-amber-600 mt-1"
                      >
                        {overview.pendingOrders}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Awaiting fulfillment
                      </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                      <p className="text-xs font-semibold text-slate-500">Verified Revenue (Delivered)</p>
                      <p
                        data-testid="metric-verified-revenue"
                        className="text-2xl font-extrabold text-[#0066FF] mt-1"
                      >
                        {formatINR(overview.verifiedRevenue)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Calculated only from real orders
                      </p>
                    </div>
                  </div>

                  {/* Two-Column Split: Low-Stock Product Alerts & Recent Orders */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Low-Stock Alerts */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          <h2 className="text-sm font-extrabold text-[#0A192F]">
                            Low-Stock & Out-of-Stock Alerts ({overview.lowStockAlerts.length})
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveTab('inventory')}
                          className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                        >
                          Manage Inventory
                        </button>
                      </div>

                      {overview.lowStockAlerts.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500">
                          All active products are stocked above their minimum threshold.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {overview.lowStockAlerts.map((item) => {
                            const state = classifyInventoryStock(
                              item.stock,
                              item.lowStockThreshold
                            );
                            return (
                              <div
                                key={item.id}
                                className="px-5 py-3 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-bold text-[#0A192F] truncate">{item.name}</p>
                                  <p className="text-slate-500 font-mono">
                                    {item.sku} · Threshold: {item.lowStockThreshold}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                                  <span
                                    className={`font-bold ${
                                      state === 'Out of Stock' ? 'text-rose-600' : 'text-amber-600'
                                    }`}
                                  >
                                    {item.stock} units ({state})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTab('inventory')}
                                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold text-[#0A192F] cursor-pointer"
                                  >
                                    Restock
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Recent Orders */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-sm font-extrabold text-[#0A192F]">
                          Recent Customer Orders ({overview.recentOrders.length})
                        </h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('orders')}
                          className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                        >
                          View All Orders
                        </button>
                      </div>

                      {overview.recentOrders.length === 0 ? (
                        <div className="p-8 text-center space-y-1.5">
                          <p className="text-xs font-bold text-[#0A192F]">
                            No customer orders placed yet
                          </p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Revenue and order counters show real data only. Place a Cash-on-Delivery order from the storefront cart to see live order tracking here.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {overview.recentOrders.map((ord) => (
                            <div
                              key={ord.id}
                              className="px-5 py-3 flex items-center justify-between gap-3 text-xs tabular-nums"
                            >
                              <div>
                                <p className="font-bold text-[#0A192F] font-mono">
                                  {ord.orderNumber} — {ord.customerName}
                                </p>
                                <p className="text-slate-500">
                                  {ord.items.length} item(s) · {ord.paymentMethod}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-extrabold text-[#0A192F]">
                                  {formatINR(ord.totalAmount)}
                                </p>
                                <p className="text-[11px] font-bold text-[#0066FF]">{ord.status}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Administrative Audit Log */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                      <h2 className="text-sm font-extrabold text-[#0A192F]">
                        Recent Security & Catalog Audit Log
                      </h2>
                      <span className="text-xs text-slate-500">Tracked automatically</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                      {overview.auditLogs.slice(0, 8).map((log) => (
                        <div
                          key={log.id}
                          className="px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#0A192F]">{log.action}</span>
                            <span className="mx-1.5 text-slate-400">·</span>
                            <span className="text-slate-600">{log.target}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 tabular-nums shrink-0">
                            {log.actor} ({log.role}) · {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================
                  TAB 2: COMPLETE PRODUCT MANAGEMENT
                 ================================================================ */}
              {activeTab === 'products' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A192F]">
                        Complete Product Management ({filteredProducts.length})
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Add, edit, duplicate, archive, or bulk-manage Zestora catalog products.
                      </p>
                    </div>
                    {canWriteProducts ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setProductModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Product</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-amber-700">
                        Read-Only ({currentUser.role})
                      </span>
                    )}
                  </div>

                  {/* Search & Multi-Facet Filter Bar */}
                  <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="lg:col-span-2 relative flex items-center">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search by product name, SKU, brand, or category..."
                        aria-label="Search catalog products"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm focus:outline-none focus:border-[#0066FF]"
                      />
                    </div>

                    <div>
                      <select
                        value={productCatFilter}
                        onChange={(e) => setProductCatFilter(e.target.value)}
                        aria-label="Filter products by category"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white"
                      >
                        <option value="All">All Categories</option>
                        {categories
                          .filter((c) => !c.parentCategory)
                          .map((c) => (
                            <option key={c.id} value={c.name}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <select
                        value={productStockFilter}
                        onChange={(e) =>
                          setProductStockFilter(
                            e.target.value as 'All' | 'In Stock' | 'Low Stock' | 'Out of Stock'
                          )
                        }
                        aria-label="Filter products by stock status"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white"
                      >
                        <option value="All">All Stock Levels</option>
                        <option value="In Stock">In Stock</option>
                        <option value="Low Stock">Low Stock Alert</option>
                        <option value="Out of Stock">Out of Stock</option>
                      </select>
                    </div>

                    <div>
                      <select
                        value={productStatusFilter}
                        onChange={(e) =>
                          setProductStatusFilter(e.target.value as 'All' | ProductStatus)
                        }
                        aria-label="Filter products by status"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm bg-white"
                      >
                        <option value="All">All Product Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Draft">Draft</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {/* Bulk Update Toolbar */}
                  {canWriteProducts && selectedProductIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-extrabold text-[#0A192F]">
                        {selectedProductIds.length} product(s) selected for bulk action
                      </span>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <select
                          value={bulkStatus}
                          onChange={(e) => setBulkStatus(e.target.value as ProductStatus)}
                          aria-label="Bulk status selection"
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                        >
                          <option value="Active">Set Status: Active</option>
                          <option value="Draft">Set Status: Draft</option>
                          <option value="Inactive">Set Status: Inactive</option>
                          <option value="Archived">Set Status: Archived</option>
                        </select>

                        <input
                          type="number"
                          min={0}
                          max={90}
                          value={bulkDiscount}
                          onChange={(e) => setBulkDiscount(e.target.value)}
                          placeholder="Optional Bulk % Off"
                          aria-label="Bulk discount percentage"
                          className="w-36 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-mono"
                        />

                        <button
                          type="button"
                          onClick={handleBulkUpdateProducts}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
                        >
                          Apply Bulk Update
                        </button>
                      </div>
                    </div>
                  )}

                  {/* High-Density Products Table */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-3 w-8">
                            <input
                              type="checkbox"
                              aria-label="Select all products"
                              checked={
                                filteredProducts.length > 0 &&
                                selectedProductIds.length === filteredProducts.length
                              }
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedProductIds(filteredProducts.map((p) => p.id));
                                } else {
                                  setSelectedProductIds([]);
                                }
                              }}
                            />
                          </th>
                          <th className="py-3 px-3">Product</th>
                          <th className="py-3 px-3">SKU</th>
                          <th className="py-3 px-3">Category / Brand</th>
                          <th className="py-3 px-3 text-right">Selling / MRP</th>
                          <th className="py-3 px-3 text-right">Cost (Admin)</th>
                          <th className="py-3 px-3 text-right">Inventory</th>
                          <th className="py-3 px-3">Status</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                        {filteredProducts.map((prod) => {
                          const stockState = classifyInventoryStock(
                            prod.stock,
                            prod.lowStockThreshold
                          );
                          const primaryImg =
                            prod.images.find((i) => i.isPrimary)?.url ?? prod.images[0]?.url;
                          return (
                            <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${prod.name}`}
                                  checked={selectedProductIds.includes(prod.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedProductIds((prev) => [...prev, prod.id]);
                                    } else {
                                      setSelectedProductIds((prev) =>
                                        prev.filter((id) => id !== prod.id)
                                      );
                                    }
                                  }}
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-11 h-9 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                                    {primaryImg ? (
                                      <img
                                        src={primaryImg}
                                        alt={prod.name}
                                        referrerPolicy="no-referrer"
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <ProductArtwork artwork={prod.artwork} />
                                    )}
                                  </div>
                                  <div className="min-w-0 max-w-[220px]">
                                    <p className="font-bold text-[#0A192F] truncate">{prod.name}</p>
                                    <p className="text-[11px] text-slate-500 truncate">
                                      {prod.featured ? 'Featured · ' : ''}
                                      {prod.trending ? 'Trending · ' : ''}
                                      {prod.variants.length} variant(s)
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                                {prod.sku}
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-semibold text-[#0A192F]">{prod.category}</p>
                                <p className="text-[11px] text-slate-500">
                                  {prod.subcategory} · {prod.brand}
                                </p>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <p className="font-extrabold text-[#0A192F]">
                                  {formatINR(prod.price)}
                                </p>
                                <p className="text-[11px] text-slate-400 line-through">
                                  {formatINR(prod.regularPrice)}
                                </p>
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                                {prod.costPrice !== undefined ? formatINR(prod.costPrice) : '—'}
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <p className="font-bold text-[#0A192F]">{prod.stock} units</p>
                                <p
                                  className={`text-[11px] font-bold ${
                                    stockState === 'Out of Stock'
                                      ? 'text-rose-600'
                                      : stockState === 'Low Stock'
                                      ? 'text-amber-600'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {stockState}
                                </p>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span
                                  className={`font-bold ${
                                    prod.status === 'Active'
                                      ? 'text-emerald-700'
                                      : prod.status === 'Draft'
                                      ? 'text-amber-700'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {prod.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                {canWriteProducts ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingProduct(prod);
                                        setProductModalOpen(true);
                                      }}
                                      aria-label={`Edit ${prod.name}`}
                                      className="p-1.5 rounded-lg hover:bg-blue-50 text-[#0066FF] cursor-pointer"
                                      title="Edit Product"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDuplicateProduct(prod)}
                                      aria-label={`Duplicate ${prod.name}`}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
                                      title="Duplicate Product"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmProduct(prod)}
                                      aria-label={`Delete ${prod.name}`}
                                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                                      title="Delete or Archive Product"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">View Only</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ================================================================
                  TAB 3: PRICING & DISCOUNTS MANAGEMENT
                 ================================================================ */}
              {activeTab === 'pricing' && (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A192F]">
                      Product Pricing, Discounts & Margin Control
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600">
                      Manage MRP, customer selling price, confidential cost price (hidden from public storefront), and inspect price change history.
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4">Product & SKU</th>
                          <th className="py-3 px-4 text-right">Regular MRP (₹)</th>
                          <th className="py-3 px-4 text-right">Selling Price (₹)</th>
                          <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                          <th className="py-3 px-4 text-right">Discount / Margin</th>
                          <th className="py-3 px-4 text-right">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                        {products.map((prod) => {
                          const draft = pricingDrafts[prod.id] ?? {
                            regularPrice: String(prod.regularPrice),
                            price: String(prod.price),
                            costPrice: String(prod.costPrice ?? 0),
                          };
                          const mrpNum = Number(draft.regularPrice) || prod.regularPrice;
                          const sellNum = Number(draft.price) || prod.price;
                          const costNum = Number(draft.costPrice) || 0;
                          const discPct =
                            mrpNum > sellNum ? Math.round(((mrpNum - sellNum) / mrpNum) * 100) : 0;
                          const marginPct =
                            sellNum > 0 ? Math.round(((sellNum - costNum) / sellNum) * 100) : 0;

                          return (
                            <tr key={prod.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-4">
                                <p className="font-bold text-[#0A192F]">{prod.name}</p>
                                <p className="font-mono text-[11px] text-slate-500">{prod.sku}</p>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <input
                                  type="number"
                                  disabled={!canWritePricing}
                                  value={draft.regularPrice}
                                  aria-label={`Regular price for ${prod.name}`}
                                  onChange={(e) =>
                                    setPricingDrafts((prev) => ({
                                      ...prev,
                                      [prod.id]: { ...draft, regularPrice: e.target.value },
                                    }))
                                  }
                                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-right font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <input
                                  type="number"
                                  disabled={!canWritePricing}
                                  value={draft.price}
                                  aria-label={`Selling price for ${prod.name}`}
                                  onChange={(e) =>
                                    setPricingDrafts((prev) => ({
                                      ...prev,
                                      [prod.id]: { ...draft, price: e.target.value },
                                    }))
                                  }
                                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 text-right font-mono font-bold text-[#0066FF]"
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <input
                                  type="number"
                                  disabled={!canWritePricing}
                                  value={draft.costPrice}
                                  aria-label={`Cost price for ${prod.name}`}
                                  onChange={(e) =>
                                    setPricingDrafts((prev) => ({
                                      ...prev,
                                      [prod.id]: { ...draft, costPrice: e.target.value },
                                    }))
                                  }
                                  className="w-24 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-amber-50/40 text-right font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span className="font-bold text-emerald-700">{discPct}% OFF</span>
                                <span className="mx-1 text-slate-300">·</span>
                                <span className="text-slate-600">Margin {marginPct}%</span>
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                {canWritePricing ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSaveQuickPrice(prod)}
                                    className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold cursor-pointer whitespace-nowrap shrink-0"
                                  >
                                    Save Price
                                  </button>
                                ) : (
                                  <span className="text-slate-400">Locked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Price Change History */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200">
                      <h2 className="text-sm font-extrabold text-[#0A192F]">
                        Price Change Audit History ({overview?.priceHistory.length ?? 0})
                      </h2>
                    </div>
                    {!overview || overview.priceHistory.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No price changes recorded yet in this session. Update any product price above to log an entry.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs tabular-nums">
                        {overview.priceHistory.map((ph) => (
                          <div
                            key={ph.id}
                            className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-[#0A192F]">{ph.productName}</span>
                              <span className="ml-2 font-mono text-slate-500">({ph.sku})</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">
                                Selling: {formatINR(ph.previousSellingPrice)} →{' '}
                                <strong className="text-[#0066FF]">
                                  {formatINR(ph.newSellingPrice)}
                                </strong>
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                by {ph.adminUsername} · {new Date(ph.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================
                  TAB 4: INVENTORY & STOCK MANAGEMENT
                 ================================================================ */}
              {activeTab === 'inventory' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A192F]">
                        Inventory & Stock Control Center
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Monitor real-time stock quantities, configure low-stock alert thresholds, and record stock adjustments.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
                      {(['All', 'Low Stock', 'Out of Stock', 'In Stock'] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setInventoryFilter(tab)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                            inventoryFilter === tab
                              ? 'bg-white text-[#0066FF] shadow-2xs'
                              : 'text-slate-600 hover:text-[#0A192F]'
                          }`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4">Product & SKU</th>
                          <th className="py-3 px-4">Current Status</th>
                          <th className="py-3 px-4 text-right">Stock Qty</th>
                          <th className="py-3 px-4 text-right">Low-Stock Alert</th>
                          <th className="py-3 px-4">Adjustment Reason</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                        {filteredInventoryProducts.map((prod) => {
                          const state = classifyInventoryStock(
                            prod.stock,
                            prod.lowStockThreshold
                          );
                          const draft = stockDrafts[prod.id] ?? {
                            stock: String(prod.stock),
                            threshold: String(prod.lowStockThreshold),
                            reason: 'Warehouse Restock Shipment',
                          };

                          return (
                            <tr key={prod.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-4">
                                <p className="font-bold text-[#0A192F]">{prod.name}</p>
                                <p className="font-mono text-[11px] text-slate-500">{prod.sku}</p>
                              </td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`font-bold ${
                                    state === 'Out of Stock'
                                      ? 'text-rose-600'
                                      : state === 'Low Stock'
                                      ? 'text-amber-600'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  {state} ({prod.stock} units)
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  disabled={!canWriteInventory}
                                  value={draft.stock}
                                  aria-label={`New stock for ${prod.name}`}
                                  onChange={(e) =>
                                    setStockDrafts((prev) => ({
                                      ...prev,
                                      [prod.id]: { ...draft, stock: e.target.value },
                                    }))
                                  }
                                  className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-200 text-right font-mono font-bold"
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <input
                                  type="number"
                                  min={1}
                                  disabled={!canWriteInventory}
                                  value={draft.threshold}
                                  aria-label={`Low stock threshold for ${prod.name}`}
                                  onChange={(e) =>
                                    setStockDrafts((prev) => ({
                                      ...prev,
                                      [prod.id]: { ...draft, threshold: e.target.value },
                                    }))
                                  }
                                  className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-200 text-right font-mono"
                                />
                              </td>
                              <td className="py-2.5 px-4">
                                <input
                                  type="text"
                                  disabled={!canWriteInventory}
                                  value={draft.reason}
                                  aria-label={`Adjustment reason for ${prod.name}`}
                                  onChange={(e) =>
                                    setStockDrafts((prev) => ({
                                      ...prev,
                                      [prod.id]: { ...draft, reason: e.target.value },
                                    }))
                                  }
                                  className="w-full max-w-[210px] px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                {canWriteInventory ? (
                                  <button
                                    type="button"
                                    onClick={() => handleAdjustStock(prod)}
                                    className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white font-bold cursor-pointer whitespace-nowrap shrink-0"
                                  >
                                    Update Stock
                                  </button>
                                ) : (
                                  <span className="text-slate-400">Locked</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Stock Adjustment History Log */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-slate-200">
                      <h2 className="text-sm font-extrabold text-[#0A192F]">
                        Stock Adjustment History ({overview?.stockHistory.length ?? 0})
                      </h2>
                    </div>
                    {!overview || overview.stockHistory.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500">
                        No stock adjustments recorded yet. Update any product stock quantity above to log an entry.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 text-xs tabular-nums">
                        {overview.stockHistory.map((sh) => (
                          <div
                            key={sh.id}
                            className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div>
                              <span className="font-bold text-[#0A192F]">{sh.productName}</span>
                              <span className="ml-2 font-mono text-slate-500">({sh.sku})</span>
                              <span className="ml-2 text-slate-500">· {sh.reason}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold">
                                {sh.previousStock} → {sh.newStock} (
                                <span
                                  className={
                                    sh.adjustment >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                  }
                                >
                                  {sh.adjustment >= 0 ? `+${sh.adjustment}` : sh.adjustment}
                                </span>
                                )
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">
                                by {sh.adminUsername}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================
                  TAB 5: CATEGORIES, SUBCATEGORIES & BRANDS
                 ================================================================ */}
              {activeTab === 'categories' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Categories & Subcategories List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h1 className="text-xl font-extrabold text-[#0A192F]">
                      Categories & Subcategories ({categories.length})
                    </h1>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                            <th className="py-3 px-4">Category / Subcategory</th>
                            <th className="py-3 px-4">Parent</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {categories.map((cat) => (
                            <tr key={cat.id} className="hover:bg-slate-50/70">
                              <td className="py-2.5 px-4">
                                <p className="font-bold text-[#0A192F]">{cat.name}</p>
                                <p className="text-[11px] text-slate-500">{cat.description}</p>
                              </td>
                              <td className="py-2.5 px-4 text-slate-600">
                                {cat.parentCategory ? `↳ ${cat.parentCategory}` : 'Top-Level Department'}
                              </td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`font-bold ${
                                    cat.status === 'Active' ? 'text-emerald-700' : 'text-slate-400'
                                  }`}
                                >
                                  {cat.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                {canWriteCategories && (
                                  <div className="inline-flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleCategoryStatus(cat)}
                                      className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                                    >
                                      {cat.status === 'Active' ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCategory(cat)}
                                      aria-label={`Delete category ${cat.name}`}
                                      className="text-rose-600 hover:underline font-bold cursor-pointer"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Create Category & Manage Brands Column */}
                  <div className="space-y-6">
                    {canWriteCategories && (
                      <form
                        onSubmit={handleCreateCategory}
                        className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5"
                      >
                        <h2 className="text-sm font-extrabold text-[#0A192F]">
                          Add Category or Subcategory
                        </h2>
                        <div>
                          <label htmlFor="new-cat-name" className="block text-xs font-bold text-slate-700 mb-1">
                            Category Name *
                          </label>
                          <input
                            id="new-cat-name"
                            type="text"
                            required
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            placeholder="e.g. Smart Home Devices"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label htmlFor="new-cat-parent" className="block text-xs font-bold text-slate-700 mb-1">
                            Parent Category (Optional for Subcategory)
                          </label>
                          <select
                            id="new-cat-parent"
                            value={newCatParent}
                            onChange={(e) => setNewCatParent(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
                          >
                            <option value="">None (Top-Level Category)</option>
                            {categories
                              .filter((c) => !c.parentCategory)
                              .map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="new-cat-desc" className="block text-xs font-bold text-slate-700 mb-1">
                            Description
                          </label>
                          <input
                            id="new-cat-desc"
                            type="text"
                            value={newCatDesc}
                            onChange={(e) => setNewCatDesc(e.target.value)}
                            placeholder="Short department description"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
                        >
                          Create Category
                        </button>
                      </form>
                    )}

                    {/* Brands Directory */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                      <h2 className="text-sm font-extrabold text-[#0A192F]">
                        Official Brands ({brands.length})
                      </h2>
                      <div className="divide-y divide-slate-100 text-xs">
                        {brands.map((b) => (
                          <div key={b.id} className="py-2 flex items-center justify-between gap-2">
                            <div>
                              <p className="font-bold text-[#0A192F]">{b.name}</p>
                              <p className="text-[11px] text-slate-500">{b.description}</p>
                            </div>
                            <span className="text-emerald-700 font-bold">{b.status}</span>
                          </div>
                        ))}
                      </div>

                      {canWriteCategories && (
                        <form onSubmit={handleCreateBrand} className="pt-3 border-t border-slate-100 space-y-2.5">
                          <input
                            type="text"
                            required
                            value={newBrandName}
                            onChange={(e) => setNewBrandName(e.target.value)}
                            placeholder="New Brand Name"
                            aria-label="New Brand Name"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                          />
                          <input
                            type="text"
                            value={newBrandDesc}
                            onChange={(e) => setNewBrandDesc(e.target.value)}
                            placeholder="Brand description"
                            aria-label="New Brand Description"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                          />
                          <button
                            type="submit"
                            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-[#0066FF] text-white text-xs font-bold cursor-pointer"
                          >
                            Add Brand
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================================================================
                  TAB 6: STOREFRONT & HOMEPAGE CUSTOMIZATION (CMS)
                 ================================================================ */}
              {activeTab === 'content' && storefrontConfig && (
                <form onSubmit={handleSaveStorefront} className="space-y-6 max-w-4xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-extrabold text-[#0A192F]">
                        Homepage & Storefront Customization
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Customize the live Zestora announcement bar, section headings, hero campaign slides, and support contact info.
                      </p>
                    </div>
                    {canWriteContent && (
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Publish Changes to Storefront
                      </button>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <h2 className="text-sm font-extrabold text-[#0A192F]">
                      1. Brand Identity & Top Announcement Bar
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cms-brand-name" className="block text-xs font-bold text-slate-700 mb-1">
                          Storefront Brand Name
                        </label>
                        <input
                          id="cms-brand-name"
                          type="text"
                          disabled={!canWriteContent}
                          value={storefrontConfig.brandName}
                          onChange={(e) =>
                            setStorefrontConfig({ ...storefrontConfig, brandName: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="cms-tagline" className="block text-xs font-bold text-slate-700 mb-1">
                          Brand Tagline
                        </label>
                        <input
                          id="cms-tagline"
                          type="text"
                          disabled={!canWriteContent}
                          value={storefrontConfig.tagline}
                          onChange={(e) =>
                            setStorefrontConfig({ ...storefrontConfig, tagline: e.target.value })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="cms-announcement" className="block text-xs font-bold text-slate-700 mb-1">
                        Top Promotional Announcement Bar Text
                      </label>
                      <input
                        id="cms-announcement"
                        type="text"
                        disabled={!canWriteContent}
                        value={storefrontConfig.announcementBarText}
                        onChange={(e) =>
                          setStorefrontConfig({
                            ...storefrontConfig,
                            announcementBarText: e.target.value,
                          })
                        }
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cms-feat-title" className="block text-xs font-bold text-slate-700 mb-1">
                          Featured Products Section Title
                        </label>
                        <input
                          id="cms-feat-title"
                          type="text"
                          disabled={!canWriteContent}
                          value={storefrontConfig.featuredSectionTitle}
                          onChange={(e) =>
                            setStorefrontConfig({
                              ...storefrontConfig,
                              featuredSectionTitle: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="cms-trend-title" className="block text-xs font-bold text-slate-700 mb-1">
                          Trending Products Section Title
                        </label>
                        <input
                          id="cms-trend-title"
                          type="text"
                          disabled={!canWriteContent}
                          value={storefrontConfig.trendingSectionTitle}
                          onChange={(e) =>
                            setStorefrontConfig({
                              ...storefrontConfig,
                              trendingSectionTitle: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cms-support-email" className="block text-xs font-bold text-slate-700 mb-1">
                          Customer Support Email
                        </label>
                        <input
                          id="cms-support-email"
                          type="email"
                          disabled={!canWriteContent}
                          value={storefrontConfig.supportEmail}
                          onChange={(e) =>
                            setStorefrontConfig({
                              ...storefrontConfig,
                              supportEmail: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>

                      <div>
                        <label htmlFor="cms-support-hours" className="block text-xs font-bold text-slate-700 mb-1">
                          Customer Support Hours
                        </label>
                        <input
                          id="cms-support-hours"
                          type="text"
                          disabled={!canWriteContent}
                          value={storefrontConfig.supportHours}
                          onChange={(e) =>
                            setStorefrontConfig({
                              ...storefrontConfig,
                              supportHours: e.target.value,
                            })
                          }
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hero Banner Slides Customization */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <h2 className="text-sm font-extrabold text-[#0A192F]">
                      2. Promotional Hero Banner Slides ({storefrontConfig.heroBanners.length})
                    </h2>

                    <div className="space-y-4">
                      {storefrontConfig.heroBanners.map((slide, idx) => (
                        <div
                          key={slide.id}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                        >
                          <p className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF]">
                            Slide #{idx + 1} ({slide.id})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              disabled={!canWriteContent}
                              value={slide.kicker}
                              onChange={(e) => {
                                const next = [...storefrontConfig.heroBanners];
                                next[idx] = { ...slide, kicker: e.target.value };
                                setStorefrontConfig({ ...storefrontConfig, heroBanners: next });
                              }}
                              aria-label={`Slide ${idx + 1} Kicker`}
                              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                            />
                            <input
                              type="text"
                              disabled={!canWriteContent}
                              value={slide.titleLine1}
                              onChange={(e) => {
                                const next = [...storefrontConfig.heroBanners];
                                next[idx] = { ...slide, titleLine1: e.target.value };
                                setStorefrontConfig({ ...storefrontConfig, heroBanners: next });
                              }}
                              aria-label={`Slide ${idx + 1} Title Line 1`}
                              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                            />
                            <input
                              type="text"
                              disabled={!canWriteContent}
                              value={slide.titleLine2}
                              onChange={(e) => {
                                const next = [...storefrontConfig.heroBanners];
                                next[idx] = { ...slide, titleLine2: e.target.value };
                                setStorefrontConfig({ ...storefrontConfig, heroBanners: next });
                              }}
                              aria-label={`Slide ${idx + 1} Title Line 2`}
                              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0066FF]"
                            />
                          </div>
                          <input
                            type="text"
                            disabled={!canWriteContent}
                            value={slide.subtitle}
                            onChange={(e) => {
                              const next = [...storefrontConfig.heroBanners];
                              next[idx] = { ...slide, subtitle: e.target.value };
                              setStorefrontConfig({ ...storefrontConfig, heroBanners: next });
                            }}
                            aria-label={`Slide ${idx + 1} Subtitle`}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Gateway, UPI & Cash on Delivery Settings */}
                  {storefrontConfig.paymentSettings && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                      <h2 className="text-sm font-extrabold text-[#0A192F]">
                        3. Payment Gateway, UPI & Cash on Delivery (COD) Settings
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!canWriteContent}
                            checked={storefrontConfig.paymentSettings.upiEnabled}
                            onChange={(e) =>
                              setStorefrontConfig({
                                ...storefrontConfig,
                                paymentSettings: {
                                  ...storefrontConfig.paymentSettings!,
                                  upiEnabled: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 accent-[#0066FF]"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-[#0A192F] block">
                              Enable UPI Payments
                            </span>
                            <span className="text-[11px] text-slate-500">
                              GPay, PhonePe, Paytm, BHIM & QR
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!canWriteContent}
                            checked={storefrontConfig.paymentSettings.cardsNetbankingEnabled}
                            onChange={(e) =>
                              setStorefrontConfig({
                                ...storefrontConfig,
                                paymentSettings: {
                                  ...storefrontConfig.paymentSettings!,
                                  cardsNetbankingEnabled: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 accent-[#0066FF]"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-[#0A192F] block">
                              Enable Cards & Net Banking
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Debit/Credit Card, NetBanking & EMI
                            </span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!canWriteContent}
                            checked={storefrontConfig.paymentSettings.codEnabled}
                            onChange={(e) =>
                              setStorefrontConfig({
                                ...storefrontConfig,
                                paymentSettings: {
                                  ...storefrontConfig.paymentSettings!,
                                  codEnabled: e.target.checked,
                                },
                              })
                            }
                            className="w-4 h-4 accent-[#0066FF]"
                          />
                          <div>
                            <span className="text-xs font-extrabold text-[#0A192F] block">
                              Enable Cash on Delivery
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Pay by Cash/UPI at doorstep
                            </span>
                          </div>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Free Delivery Threshold (₹)
                          </label>
                          <input
                            type="number"
                            disabled={!canWriteContent}
                            value={storefrontConfig.paymentSettings.freeDeliveryThreshold}
                            onChange={(e) =>
                              setStorefrontConfig({
                                ...storefrontConfig,
                                paymentSettings: {
                                  ...storefrontConfig.paymentSettings!,
                                  freeDeliveryThreshold: Number(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            COD Handling Fee (₹)
                          </label>
                          <input
                            type="number"
                            disabled={!canWriteContent}
                            value={storefrontConfig.paymentSettings.codFee}
                            onChange={(e) =>
                              setStorefrontConfig({
                                ...storefrontConfig,
                                paymentSettings: {
                                  ...storefrontConfig.paymentSettings!,
                                  codFee: Number(e.target.value) || 0,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Return Window (Days)
                          </label>
                          <input
                            type="number"
                            disabled={!canWriteContent}
                            value={storefrontConfig.paymentSettings.returnWindowDays}
                            onChange={(e) =>
                              setStorefrontConfig({
                                ...storefrontConfig,
                                paymentSettings: {
                                  ...storefrontConfig.paymentSettings!,
                                  returnWindowDays: Number(e.target.value) || 7,
                                },
                              })
                            }
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              )}

              {/* ================================================================
                  TAB 7: ORDERS & REGISTERED CUSTOMERS MANAGEMENT
                 ================================================================ */}
              {activeTab === 'orders' && (
                <div className="space-y-6">
                  {/* Customer Orders */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h1 className="text-xl font-extrabold text-[#0A192F]">
                          Customer Order Management ({orders.length})
                        </h1>
                        <p className="text-xs text-slate-600">
                          Track customer orders, update fulfillment statuses, payment states, courier names, and shipment tracking numbers.
                        </p>
                      </div>

                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value as 'All' | OrderStatus)}
                        aria-label="Filter orders by status"
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold"
                      >
                        <option value="All">All Order Statuses</option>
                        <option value="Order Placed">Order Placed</option>
                        <option value="Pending">Pending</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Processing">Processing</option>
                        <option value="Packed">Packed</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                        <option value="Return Requested">Return Requested</option>
                        <option value="Returned">Returned</option>
                        <option value="Refunded">Refunded</option>
                      </select>
                    </div>

                    {orders.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
                        <p className="text-sm font-bold text-[#0A192F]">No Customer Orders Yet</p>
                        <p className="text-xs text-slate-500 max-w-md mx-auto">
                          Orders placed via the storefront shopping cart appear here automatically with itemized SKUs, shipping addresses, and status controls.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                              <th className="py-3 px-4">Order #</th>
                              <th className="py-3 px-4">Customer & Address</th>
                              <th className="py-3 px-4">Items</th>
                              <th className="py-3 px-4">Payment & Verification</th>
                              <th className="py-3 px-4 text-right">Total</th>
                              <th className="py-3 px-4">Courier & Tracking #</th>
                              <th className="py-3 px-4">Lifecycle Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs tabular-nums">
                            {orders
                              .filter(
                                (o) => orderStatusFilter === 'All' || o.status === orderStatusFilter
                              )
                              .map((ord) => (
                                <tr key={ord.id}>
                                  <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                                    {ord.orderNumber}
                                    <span className="block text-[10px] font-sans font-normal text-slate-400">
                                      {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                                    </span>
                                    {ord.returnRequest && (
                                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-sans text-[10px] font-bold">
                                        {ord.returnRequest.type}: {ord.returnRequest.reason}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4">
                                    <p className="font-bold text-[#0A192F]">{ord.customerName}</p>
                                    <p className="text-[11px] text-slate-500">
                                      {ord.customerEmail} · {ord.shippingAddress}
                                    </p>
                                  </td>
                                  <td className="py-3 px-4">
                                    {ord.items.map((it) => (
                                      <p key={it.productId} className="text-xs">
                                        {it.quantity}× {it.productName}
                                      </p>
                                    ))}
                                  </td>
                                  <td className="py-3 px-4 space-y-1">
                                    <span className="font-bold text-slate-800 block">
                                      {ord.paymentProviderDetail || ord.paymentMethod}
                                    </span>
                                    <select
                                      disabled={!canWriteOrders}
                                      value={ord.paymentStatus}
                                      aria-label={`Payment status for order ${ord.orderNumber}`}
                                      onChange={(e) =>
                                        handleUpdateOrderStatus(
                                          ord,
                                          ord.status,
                                          ord.trackingNumber,
                                          {
                                            paymentStatus: e.target
                                              .value as AdminOrder['paymentStatus'],
                                          }
                                        )
                                      }
                                      className={`px-2 py-1 rounded border text-[11px] font-bold ${
                                        ord.paymentStatus === 'Verified Paid'
                                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                          : ord.paymentStatus.includes('Failed') ||
                                            ord.paymentStatus.includes('Cancelled')
                                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-200'
                                      }`}
                                    >
                                      <option value="Pending Verification">Pending Verification</option>
                                      <option value="Verified Paid">Verified Paid</option>
                                      <option value="Unpaid (COD)">Unpaid (COD)</option>
                                      <option value="Payment Failed">Payment Failed</option>
                                      <option value="Payment Cancelled">Payment Cancelled</option>
                                      <option value="Refund Initiated">Refund Initiated</option>
                                      <option value="Refunded">Refunded</option>
                                    </select>
                                  </td>
                                  <td className="py-3 px-4 text-right font-extrabold text-[#0A192F]">
                                    {formatINR(ord.totalAmount)}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-600 space-y-1">
                                    <select
                                      disabled={!canWriteOrders}
                                      value={ord.courierName || 'Zestora Express Logistics'}
                                      aria-label={`Courier for order ${ord.orderNumber}`}
                                      onChange={(e) =>
                                        handleUpdateOrderStatus(
                                          ord,
                                          ord.status,
                                          ord.trackingNumber,
                                          { courierName: e.target.value }
                                        )
                                      }
                                      className="block w-full px-2 py-1 rounded border border-slate-200 bg-white font-sans text-[11px] font-semibold text-slate-800"
                                    >
                                      <option value="Zestora Express Logistics">
                                        Zestora Express Logistics
                                      </option>
                                      <option value="BlueDart Priority Air">
                                        BlueDart Priority Air
                                      </option>
                                      <option value="Delhivery Surface Express">
                                        Delhivery Surface Express
                                      </option>
                                      <option value="Ecom Express">Ecom Express</option>
                                    </select>
                                    <span className="block text-[11px] px-1">
                                      {ord.trackingNumber}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      disabled={!canWriteOrders}
                                      value={ord.status}
                                      aria-label={`Status for order ${ord.orderNumber}`}
                                      onChange={(e) =>
                                        handleUpdateOrderStatus(
                                          ord,
                                          e.target.value as OrderStatus,
                                          ord.trackingNumber
                                        )
                                      }
                                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-[#0066FF]"
                                    >
                                      <option value="Order Placed">Order Placed</option>
                                      <option value="Pending">Pending</option>
                                      <option value="Confirmed">Confirmed</option>
                                      <option value="Processing">Processing</option>
                                      <option value="Packed">Packed</option>
                                      <option value="Shipped">Shipped</option>
                                      <option value="Out for Delivery">Out for Delivery</option>
                                      <option value="Delivered">Delivered</option>
                                      <option value="Cancelled">Cancelled</option>
                                      <option value="Return Requested">Return Requested</option>
                                      <option value="Returned">Returned</option>
                                      <option value="Refunded">Refunded</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Registered Customer Accounts */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <h2 className="text-lg font-extrabold text-[#0A192F]">
                        Registered Customer Accounts ({customers.length})
                      </h2>
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search customer by name or email..."
                        aria-label="Search customers"
                        className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs"
                      />
                    </div>

                    {customers.length === 0 ? (
                      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
                        No registered customer accounts yet. Customers who register via the storefront Account dialog appear here.
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                              <th className="py-3 px-4">Full Name</th>
                              <th className="py-3 px-4">Email & Mobile</th>
                              <th className="py-3 px-4">Orders</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {customers
                              .filter(
                                (c) =>
                                  !customerSearch.trim() ||
                                  c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                  c.email.toLowerCase().includes(customerSearch.toLowerCase())
                              )
                              .map((cust) => (
                                <tr key={cust.id}>
                                  <td className="py-2.5 px-4 font-bold text-[#0A192F]">
                                    {cust.fullName}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-600">
                                    {cust.email} · {cust.mobile}
                                  </td>
                                  <td className="py-2.5 px-4 font-mono">{cust.orderCount}</td>
                                  <td className="py-2.5 px-4">
                                    <span
                                      className={`font-bold ${
                                        cust.status === 'Active'
                                          ? 'text-emerald-700'
                                          : 'text-rose-600'
                                      }`}
                                    >
                                      {cust.status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    {canWriteOrders && (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleCustomerStatus(cust)}
                                        className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                                      >
                                        {cust.status === 'Active' ? 'Suspend' : 'Activate'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================
                  TAB 8: STAFF & ROLE-BASED ACCESS CONTROL (RBAC)
                 ================================================================ */}
              {activeTab === 'staff' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <h1 className="text-xl font-extrabold text-[#0A192F]">
                      Administrative Staff & Role-Based Permissions ({staffList.length})
                    </h1>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                            <th className="py-3 px-4">Staff Member</th>
                            <th className="py-3 px-4">Username / Email</th>
                            <th className="py-3 px-4">Assigned Role</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {staffList.map((stf) => (
                            <tr key={stf.id}>
                              <td className="py-3 px-4 font-bold text-[#0A192F]">{stf.name}</td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {stf.username} · {stf.email}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-[#0066FF]">
                                {stf.role}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`font-bold ${
                                    stf.status === 'Active' ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {stf.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Create Staff Account (Super Admin Only) */}
                  <div>
                    {canWriteStaff ? (
                      <form
                        onSubmit={handleCreateStaff}
                        className="bg-white rounded-xl border border-slate-200 p-5 space-y-3.5"
                      >
                        <h2 className="text-sm font-extrabold text-[#0A192F]">
                          Provision New Staff Account
                        </h2>
                        <input
                          type="text"
                          required
                          value={newStaffName}
                          onChange={(e) => setNewStaffName(e.target.value)}
                          placeholder="Full Name"
                          aria-label="New Staff Full Name"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                        />
                        <input
                          type="email"
                          required
                          value={newStaffEmail}
                          onChange={(e) => setNewStaffEmail(e.target.value)}
                          placeholder="Staff Email (@zestora.in)"
                          aria-label="New Staff Email"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                        />
                        <input
                          type="text"
                          required
                          value={newStaffUsername}
                          onChange={(e) => setNewStaffUsername(e.target.value)}
                          placeholder="Username"
                          aria-label="New Staff Username"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono"
                        />
                        <select
                          value={newStaffRole}
                          onChange={(e) => setNewStaffRole(e.target.value as AdminRole)}
                          aria-label="New Staff Role"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-bold"
                        >
                          <option value="PRODUCT_MANAGER">PRODUCT_MANAGER</option>
                          <option value="INVENTORY_MANAGER">INVENTORY_MANAGER</option>
                          <option value="ORDER_MANAGER">ORDER_MANAGER</option>
                          <option value="CONTENT_MANAGER">CONTENT_MANAGER</option>
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                        <input
                          type="password"
                          required
                          value={newStaffPassword}
                          onChange={(e) => setNewStaffPassword(e.target.value)}
                          placeholder="Initial Password (min 6 chars)"
                          aria-label="New Staff Password"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                        />
                        <button
                          type="submit"
                          className="w-full py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold cursor-pointer"
                        >
                          Create Staff Account
                        </button>
                      </form>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-600 space-y-2">
                        <p className="font-bold text-[#0A192F]">Super Admin Permission Required</p>
                        <p>
                          Your current role (<code>{currentUser.role}</code>) can inspect staff roles, but only <code>SUPER_ADMIN</code> can create or modify staff accounts.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Add / Edit Product Modal */}
      <AdminProductFormModal
        key={editingProduct?.id ?? 'new-product'}
        isOpen={productModalOpen}
        initialProduct={editingProduct}
        categories={categories}
        brands={brands}
        adminToken={adminToken}
        onClose={() => {
          setProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={async (savedProd) => {
          setProductModalOpen(false);
          setEditingProduct(null);
          notify('success', `Saved product "${savedProd.name}" (${savedProd.sku}).`);
          await fetchAllAdminData();
          onCatalogMutated();
        }}
      />

      {/* Delete / Archive Confirmation Modal */}
      {deleteConfirmProduct && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 id="delete-confirm-title" className="text-base font-extrabold text-[#0A192F]">
              Delete or Archive Product?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>{deleteConfirmProduct.name}</strong> (
              <code>{deleteConfirmProduct.sku}</code>)? If this product is referenced by existing customer orders, it will be safely <strong>Archived</strong> instead of permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Delete / Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
