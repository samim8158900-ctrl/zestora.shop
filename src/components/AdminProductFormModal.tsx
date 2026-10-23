import React, { useState } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  Star,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type {
  AdminBrand,
  AdminCategory,
  AdminProduct,
  ProductImageAsset,
  ProductSpecAttribute,
  ProductStatus,
  ProductVariant,
} from '../types/admin.ts';
import type { ProductArtworkKey } from '../types/store.ts';
import { validateAndComputePricing, validateProductImageFile } from '../utils/adminPricingAndRbac.ts';
import { formatINR } from '../utils/cartLogic.ts';
import { ProductArtwork } from './ProductIllustration.tsx';

interface AdminProductFormModalProps {
  isOpen: boolean;
  initialProduct: AdminProduct | null;
  categories: AdminCategory[];
  brands: AdminBrand[];
  adminToken: string;
  onClose: () => void;
  onSaved: (product: AdminProduct) => void;
}

const ARTWORK_OPTIONS: { value: ProductArtworkKey; label: string }[] = [
  { value: 'anc-headphones', label: 'ANC Wireless Headphones' },
  { value: 'ultrabook-pro', label: 'Ultrabook Laptop Pro' },
  { value: 'smartwatch-series', label: 'AMOLED Smartwatch' },
  { value: 'cobalt-hoodie', label: 'Cobalt Streetwear Hoodie' },
  { value: 'linen-overshirt', label: 'Tailored Linen Overshirt' },
  { value: 'cloud-sneaker', label: 'AeroStride Cloud Sneaker' },
  { value: 'trail-runner', label: 'All-Terrain Trail Runner' },
  { value: 'espresso-maker', label: 'Barista Espresso Maker' },
  { value: 'air-purifier', label: 'HEPA Smart Air Purifier' },
  { value: 'vitamin-serum', label: 'Vitamin C Botanical Serum' },
  { value: 'hydration-kit', label: 'Hydration Skincare Kit' },
  { value: 'adjustable-dumbbell', label: 'SelectPro Dumbbell' },
  { value: 'yoga-mat-pro', label: 'Alignment Yoga Mat' },
  { value: 'leather-weekender', label: 'Weekender Duffle Bag' },
  { value: 'polarized-wayfarer', label: 'Polarized Sunglasses' },
  { value: 'wooden-stem-kit', label: 'Robotics STEM Kit' },
  { value: 'plush-teddy', label: 'Organic Cotton Plush Bear' },
];

export function AdminProductFormModal({
  isOpen,
  initialProduct,
  categories,
  brands,
  adminToken,
  onClose,
  onSaved,
}: AdminProductFormModalProps) {
  const isEditing = Boolean(initialProduct);

  const [name, setName] = useState(initialProduct?.name ?? '');
  const [sku, setSku] = useState(
    initialProduct?.sku ?? `ZST-NEW-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [category, setCategory] = useState<string>(initialProduct?.category ?? 'Electronics');
  const [subcategory, setSubcategory] = useState(initialProduct?.subcategory ?? 'General');
  const [brand, setBrand] = useState(initialProduct?.brand ?? 'Zestora Originals');
  const [shortDescription, setShortDescription] = useState(initialProduct?.shortDescription ?? '');
  const [description, setDescription] = useState(initialProduct?.description ?? '');

  const [regularPrice, setRegularPrice] = useState<string>(
    String(initialProduct?.regularPrice ?? 2999)
  );
  const [discountType, setDiscountType] = useState<'none' | 'percentage' | 'fixed'>(
    initialProduct?.discountType ?? 'none'
  );
  const [discountValue, setDiscountValue] = useState<string>(
    String(initialProduct?.discountValue ?? 0)
  );
  const [directSellingPrice, setDirectSellingPrice] = useState<string>(
    String(initialProduct?.price ?? 2499)
  );
  const [costPrice, setCostPrice] = useState<string>(String(initialProduct?.costPrice ?? 1500));
  const [saleStartDate, setSaleStartDate] = useState(initialProduct?.saleStartDate ?? '');
  const [saleEndDate, setSaleEndDate] = useState(initialProduct?.saleEndDate ?? '');

  const [stock, setStock] = useState<string>(String(initialProduct?.stock ?? 25));
  const [lowStockThreshold, setLowStockThreshold] = useState<string>(
    String(initialProduct?.lowStockThreshold ?? 5)
  );
  const [status, setStatus] = useState<ProductStatus>(initialProduct?.status ?? 'Active');

  const [weight, setWeight] = useState(initialProduct?.weight ?? '450 g');
  const [dimensions, setDimensions] = useState(initialProduct?.dimensions ?? '20 × 15 × 8 cm');
  const [warranty, setWarranty] = useState(
    initialProduct?.warranty ?? '1 Year Zestora Manufacturer Warranty'
  );
  const [tagsText, setTagsText] = useState((initialProduct?.tags ?? ['zestora']).join(', '));
  const [highlightsText, setHighlightsText] = useState(
    (initialProduct?.highlights ?? ['Zestora Quality Verified', 'Fast Express Dispatch']).join('\n')
  );

  const [featured, setFeatured] = useState<boolean>(initialProduct?.featured ?? true);
  const [trending, setTrending] = useState<boolean>(initialProduct?.trending ?? false);
  const [specialOffer, setSpecialOffer] = useState<boolean>(initialProduct?.specialOffer ?? false);
  const [artwork, setArtwork] = useState<ProductArtworkKey>(
    initialProduct?.artwork ?? 'anc-headphones'
  );

  const [images, setImages] = useState<ProductImageAsset[]>(initialProduct?.images ?? []);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const [variants, setVariants] = useState<ProductVariant[]>(
    initialProduct?.variants ?? [
      {
        id: `var-${Date.now()}`,
        size: 'Standard',
        color: 'Signature Blue',
        model: '2026 Edition',
        skuSuffix: 'STD',
        stock: Number(initialProduct?.stock ?? 25),
      },
    ]
  );

  const [specifications, setSpecifications] = useState<ProductSpecAttribute[]>(
    initialProduct?.specifications ?? [
      { key: 'Build Material', value: 'Premium Grade' },
      { key: 'Origin', value: 'India' },
    ]
  );

  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const parsedRegular = Number(regularPrice) || 0;
  const parsedDiscountVal = Number(discountValue) || 0;
  const parsedDirectSelling = Number(directSellingPrice) || parsedRegular;
  const parsedCost = Number(costPrice) || 0;

  const livePricing = validateAndComputePricing({
    regularPrice: parsedRegular,
    discountPrice: discountType === 'none' ? parsedDirectSelling : undefined,
    discountType,
    discountValue: parsedDiscountVal,
    costPrice: parsedCost,
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setUploadSuccess(null);

    const file = files[0];
    const check = validateProductImageFile(file.type, file.size);
    if (!check.valid) {
      setError(check.error ?? 'Invalid image file.');
      return;
    }

    setUploadingImage(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': encodeURIComponent(file.name),
          Authorization: `Bearer ${adminToken}`,
        },
        credentials: 'include',
        body: arrayBuffer,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Image upload failed.');
        return;
      }

      const newAsset: ProductImageAsset = {
        id: data.id || `img-${Date.now()}`,
        url: data.url,
        alt: name || file.name,
        isPrimary: images.length === 0,
        order: images.length + 1,
      };

      setImages((prev) => [...prev, newAsset]);
      setUploadSuccess(`Uploaded ${file.name} (${Math.round(file.size / 1024)} KB)`);
    } catch {
      setError('Network error while uploading product image.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageByUrl = () => {
    const cleanUrl = imageUrlInput.trim();
    if (!cleanUrl) return;
    const newAsset: ProductImageAsset = {
      id: `img-url-${Date.now()}`,
      url: cleanUrl,
      alt: name || 'Product image',
      isPrimary: images.length === 0,
      order: images.length + 1,
    };
    setImages((prev) => [...prev, newAsset]);
    setImageUrlInput('');
  };

  const handleSetPrimaryImage = (id: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        isPrimary: img.id === id,
      }))
    );
  };

  const handleMoveImage = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    setImages(next.map((img, i) => ({ ...img, order: i + 1 })));
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered.map((img, i) => ({ ...img, order: i + 1 }));
    });
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `var-${Date.now()}-${prev.length}`,
        size: 'Medium',
        color: 'Default',
        model: 'Standard',
        skuSuffix: `V${prev.length + 1}`,
        stock: 10,
      },
    ]);
  };

  const handleAddSpecification = () => {
    setSpecifications((prev) => [...prev, { key: '', value: '' }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !sku.trim()) {
      setError('Product Name and unique SKU are required.');
      return;
    }

    if (!livePricing.isValid) {
      setError(livePricing.error || 'Invalid product pricing configuration.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category,
        subcategory: subcategory.trim() || 'General',
        brand: brand.trim() || 'Zestora Originals',
        shortDescription: shortDescription.trim() || name.trim(),
        description: description.trim() || shortDescription.trim() || name.trim(),
        regularPrice: parsedRegular,
        price: livePricing.finalSellingPrice,
        discountType,
        discountValue: discountType === 'none' ? livePricing.discountPercent : parsedDiscountVal,
        costPrice: parsedCost,
        saleStartDate: saleStartDate || undefined,
        saleEndDate: saleEndDate || undefined,
        stock: Math.max(0, Math.round(Number(stock) || 0)),
        lowStockThreshold: Math.max(1, Math.round(Number(lowStockThreshold) || 5)),
        status,
        weight: weight.trim(),
        dimensions: dimensions.trim(),
        warranty: warranty.trim(),
        tags: tagsText
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        highlights: highlightsText
          .split('\n')
          .map((h) => h.trim())
          .filter(Boolean),
        featured,
        trending,
        specialOffer,
        artwork,
        images,
        variants,
        specifications: specifications.filter((s) => s.key.trim() && s.value.trim()),
      };

      const url = isEditing
        ? `/api/admin/products/${initialProduct!.id}`
        : '/api/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save product.');
        return;
      }

      onSaved(data.product as AdminProduct);
    } catch {
      setError('Network error while saving product.');
    } finally {
      setSaving(false);
    }
  };

  const parentCategories = categories.filter((c) => !c.parentCategory);
  const subCategories = categories.filter((c) => c.parentCategory);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-product-modal-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative z-10 w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 id="admin-product-modal-title" className="text-lg font-extrabold text-[#0A192F]">
              {isEditing ? `Edit Product — ${initialProduct?.name}` : 'Create New Catalog Product'}
            </h2>
            <p className="text-xs text-slate-500">
              Complete product details, pricing, stock thresholds, variants, and gallery images.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product form modal"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {/* Section 1: Core Identity & Classification */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF] border-b border-slate-100 pb-1.5">
              1. Basic Information & Classification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="prod-name-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  id="prod-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Zestora SonicPro Max Wireless Headphones"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                />
              </div>

              <div>
                <label htmlFor="prod-sku-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Unique SKU / Product Code *
                </label>
                <input
                  id="prod-sku-input"
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="ZST-ELE-1020"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="prod-cat-select" className="block text-xs font-bold text-slate-700 mb-1">
                  Primary Category
                </label>
                <select
                  id="prod-cat-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-[#0066FF]"
                >
                  {parentCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="prod-subcat-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Subcategory
                </label>
                <input
                  id="prod-subcat-input"
                  list="zestora-subcategories-list"
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="e.g. Men's Fashion"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                />
                <datalist id="zestora-subcategories-list">
                  {subCategories.map((sub) => (
                    <option key={sub.id} value={sub.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="prod-brand-select" className="block text-xs font-bold text-slate-700 mb-1">
                  Brand / Manufacturer
                </label>
                <input
                  id="prod-brand-select"
                  list="zestora-brands-list"
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                />
                <datalist id="zestora-brands-list">
                  {brands.map((b) => (
                    <option key={b.id} value={b.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="prod-status-select" className="block text-xs font-bold text-slate-700 mb-1">
                  Product Status
                </label>
                <select
                  id="prod-status-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white font-bold focus:outline-none focus:border-[#0066FF]"
                >
                  <option value="Active">Active (Live on Store)</option>
                  <option value="Draft">Draft (Hidden)</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prod-short-desc" className="block text-xs font-bold text-slate-700 mb-1">
                  Short Summary Description
                </label>
                <textarea
                  id="prod-short-desc"
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Concise 1-2 sentence product summary shown on product cards"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                />
              </div>
              <div>
                <label htmlFor="prod-full-desc" className="block text-xs font-bold text-slate-700 mb-1">
                  Full Detailed Description
                </label>
                <textarea
                  id="prod-full-desc"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Complete product description, materials, and usage notes"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#0066FF]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Pricing, Discounts & Cost Price */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF] border-b border-slate-100 pb-1.5">
              2. Pricing, Discounts & Confidential Cost Price (INR ₹)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 items-end">
              <div>
                <label htmlFor="prod-mrp-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Regular Price (MRP ₹) *
                </label>
                <input
                  id="prod-mrp-input"
                  type="number"
                  min={1}
                  value={regularPrice}
                  onChange={(e) => setRegularPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                />
              </div>

              <div>
                <label htmlFor="prod-disc-type" className="block text-xs font-bold text-slate-700 mb-1">
                  Discount Mode
                </label>
                <select
                  id="prod-disc-type"
                  value={discountType}
                  onChange={(e) =>
                    setDiscountType(e.target.value as 'none' | 'percentage' | 'fixed')
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="none">Direct Selling Price</option>
                  <option value="percentage">Percentage (% Off)</option>
                  <option value="fixed">Fixed Flat ₹ Off</option>
                </select>
              </div>

              {discountType === 'none' ? (
                <div>
                  <label htmlFor="prod-selling-input" className="block text-xs font-bold text-slate-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    id="prod-selling-input"
                    type="number"
                    min={1}
                    value={directSellingPrice}
                    onChange={(e) => setDirectSellingPrice(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="prod-disc-val" className="block text-xs font-bold text-slate-700 mb-1">
                    {discountType === 'percentage' ? 'Discount %' : 'Flat Discount (₹)'}
                  </label>
                  <input
                    id="prod-disc-val"
                    type="number"
                    min={0}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                  />
                </div>
              )}

              <div>
                <label htmlFor="prod-cost-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Cost Price (Admin Only ₹)
                </label>
                <input
                  id="prod-cost-input"
                  type="number"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums bg-amber-50/40"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs tabular-nums">
                <span className="block text-[10px] uppercase font-bold text-slate-500">
                  Computed Customer Price
                </span>
                <span className="text-sm font-extrabold text-[#0A192F]">
                  {formatINR(livePricing.finalSellingPrice)}
                </span>
                {livePricing.discountPercent > 0 && (
                  <span className="ml-1.5 text-emerald-700 font-bold">
                    ({livePricing.discountPercent}% OFF)
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prod-sale-start" className="block text-xs font-bold text-slate-700 mb-1">
                  Promotional Sale Start Date (Optional)
                </label>
                <input
                  id="prod-sale-start"
                  type="date"
                  value={saleStartDate}
                  onChange={(e) => setSaleStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label htmlFor="prod-sale-end" className="block text-xs font-bold text-slate-700 mb-1">
                  Promotional Sale End Date (Optional)
                </label>
                <input
                  id="prod-sale-end"
                  type="date"
                  value={saleEndDate}
                  onChange={(e) => setSaleEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Inventory, Physical Specs & Storefront Badges */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF] border-b border-slate-100 pb-1.5">
              3. Inventory Stock, Physical Attributes & Placement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
              <div>
                <label htmlFor="prod-stock-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Stock Quantity *
                </label>
                <input
                  id="prod-stock-input"
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="prod-threshold-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Low-Stock Alert Threshold
                </label>
                <input
                  id="prod-threshold-input"
                  type="number"
                  min={1}
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono tabular-nums"
                />
              </div>
              <div>
                <label htmlFor="prod-weight-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Weight
                </label>
                <input
                  id="prod-weight-input"
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label htmlFor="prod-dim-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Dimensions
                </label>
                <input
                  id="prod-dim-input"
                  type="text"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label htmlFor="prod-warranty-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Warranty Info
                </label>
                <input
                  id="prod-warranty-input"
                  type="text"
                  value={warranty}
                  onChange={(e) => setWarranty(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prod-tags-input" className="block text-xs font-bold text-slate-700 mb-1">
                  Search Tags / Keywords (Comma-Separated)
                </label>
                <input
                  id="prod-tags-input"
                  type="text"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="wireless, bluetooth, audio, zestora"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-5">
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="rounded border-slate-300 text-[#0066FF]"
                  />
                  <span>Featured Product</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trending}
                    onChange={(e) => setTrending(e.target.checked)}
                    className="rounded border-slate-300 text-[#0066FF]"
                  />
                  <span>Trending Product</span>
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={specialOffer}
                    onChange={(e) => setSpecialOffer(e.target.checked)}
                    className="rounded border-slate-300 text-[#0066FF]"
                  />
                  <span>Special Offer Deal</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Multi-Image Upload & Studio Artwork Fallback */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF] border-b border-slate-100 pb-1.5">
              4. Product Images & Studio Artwork Fallback
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {/* Upload File or URL */}
              <div className="md:col-span-2 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold cursor-pointer transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImage ? 'Uploading...' : 'Upload Image (JPEG/PNG/WebP ≤ 5MB)'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 flex items-center gap-2 min-w-[220px]">
                    <input
                      type="url"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Or paste image URL (/uploads/...)"
                      aria-label="Image URL"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageByUrl}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      Add URL
                    </button>
                  </div>
                </div>

                {/* Image Gallery List */}
                {images.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    No custom photos uploaded yet. The selected Studio Vector Artwork fallback on the right will be displayed on the storefront.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className={`p-2 rounded-xl border bg-slate-50 space-y-2 ${
                          img.isPrimary ? 'border-[#0066FF] ring-1 ring-[#0066FF]' : 'border-slate-200'
                        }`}
                      >
                        <div className="aspect-[4/3] rounded-lg overflow-hidden bg-white border border-slate-200">
                          <img
                            src={img.url}
                            alt={img.alt}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryImage(img.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                              img.isPrimary
                                ? 'bg-[#0066FF] text-white'
                                : 'bg-white border border-slate-200 text-slate-700'
                            }`}
                          >
                            <Star className="w-3 h-3" />
                            <span>{img.isPrimary ? 'Primary' : 'Set Primary'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, -1)}
                              disabled={idx === 0}
                              aria-label="Move image left"
                              className="p-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 1)}
                              disabled={idx === images.length - 1}
                              aria-label="Move image right"
                              className="p-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id)}
                              aria-label="Remove image"
                              className="p-1 rounded bg-rose-50 border border-rose-200 text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Studio Vector Artwork Selector */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <label htmlFor="prod-artwork-select" className="block text-xs font-bold text-slate-700">
                  Studio Vector Artwork Fallback
                </label>
                <select
                  id="prod-artwork-select"
                  value={artwork}
                  onChange={(e) => setArtwork(e.target.value as ProductArtworkKey)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white font-semibold"
                >
                  {ARTWORK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-white border border-slate-200">
                  <ProductArtwork artwork={artwork} />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Variants & Key Specifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Variants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF]">
                  5. Product Variants (Size / Color / Model)
                </h3>
                <button
                  type="button"
                  onClick={handleAddVariant}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variant</span>
                </button>
              </div>
              <div className="space-y-2">
                {variants.map((v, idx) => (
                  <div key={v.id} className="grid grid-cols-4 gap-2 items-center">
                    <input
                      type="text"
                      value={v.size ?? ''}
                      onChange={(e) => {
                        const next = [...variants];
                        next[idx] = { ...v, size: e.target.value };
                        setVariants(next);
                      }}
                      placeholder="Size"
                      aria-label="Variant Size"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={v.color ?? ''}
                      onChange={(e) => {
                        const next = [...variants];
                        next[idx] = { ...v, color: e.target.value };
                        setVariants(next);
                      }}
                      placeholder="Color"
                      aria-label="Variant Color"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      value={v.stock}
                      onChange={(e) => {
                        const next = [...variants];
                        next[idx] = { ...v, stock: Number(e.target.value) || 0 };
                        setVariants(next);
                      }}
                      placeholder="Stock"
                      aria-label="Variant Stock"
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setVariants(variants.filter((_, i) => i !== idx))}
                      aria-label="Remove variant"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg justify-self-start cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Specifications & Highlights */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF]">
                  6. Specifications & Highlights
                </h3>
                <button
                  type="button"
                  onClick={handleAddSpecification}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Spec Row</span>
                </button>
              </div>
              <div className="space-y-2">
                {specifications.map((spec, idx) => (
                  <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => {
                        const next = [...specifications];
                        next[idx] = { ...spec, key: e.target.value };
                        setSpecifications(next);
                      }}
                      placeholder="Attribute (e.g. Battery)"
                      aria-label="Specification Name"
                      className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => {
                        const next = [...specifications];
                        next[idx] = { ...spec, value: e.target.value };
                        setSpecifications(next);
                      }}
                      placeholder="Value (e.g. 40 Hours)"
                      aria-label="Specification Value"
                      className="col-span-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecifications(specifications.filter((_, i) => i !== idx))}
                      aria-label="Remove specification row"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg justify-self-start cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="prod-highlights-area" className="block text-xs font-bold text-slate-700 mb-1">
                  Bullet Highlights (One per line)
                </label>
                <textarea
                  id="prod-highlights-area"
                  rows={2}
                  value={highlightsText}
                  onChange={(e) => setHighlightsText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-bold text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              {saving ? 'Saving Product...' : isEditing ? 'Save Product Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
