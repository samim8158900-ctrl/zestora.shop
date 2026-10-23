import { useState } from 'react';
import { X, Star, ShoppingCart, CheckCircle2, Zap, ShieldCheck, Truck } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { formatINR, calculateDiscountPercent } from '../utils/cartLogic.ts';
import { ProductArtwork } from './ProductIllustration.tsx';

interface ProductQuickViewModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
}

export function ProductQuickViewModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}: ProductQuickViewModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>('');

  if (!product) return null;

  const discount = calculateDiscountPercent(product.price, product.originalPrice);
  const isOutOfStock =
    product.inStock === false || (product.stock !== undefined && product.stock <= 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-view-title"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-2 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-3.5 right-3.5 z-10 p-2 rounded-lg bg-white/90 hover:bg-white text-slate-600 hover:text-slate-900 shadow-xs"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Artwork / Uploaded Image Column */}
        <div className="bg-slate-50 flex items-center justify-center min-h-[260px] overflow-hidden">
          {product.primaryImageUrl ? (
            <img
              src={product.primaryImageUrl}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <ProductArtwork artwork={product.artwork} className="w-full h-full max-h-80" />
          )}
        </div>

        {/* Right Details Column */}
        <div className="p-6 flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                {product.brand ? `${product.brand} · ${product.category}` : product.category}
              </span>
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-md ${
                  isOutOfStock
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isOutOfStock
                  ? 'Out of Stock'
                  : product.stock !== undefined
                  ? `In Stock (${product.stock} available)`
                  : 'In Stock'}
              </span>
            </div>

            <h2
              id="quick-view-title"
              className="text-xl font-extrabold text-slate-900 leading-snug"
            >
              {product.name}
            </h2>

            {product.sku && (
              <p className="text-[11px] font-mono text-slate-400">SKU: {product.sku}</p>
            )}

            <div className="flex items-center gap-2 text-xs">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating.toFixed(1)}</span>
              </div>
              <span className="text-slate-500">{product.reviewCount} ratings</span>
            </div>

            <div className="flex items-baseline gap-2.5 pt-1">
              <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {formatINR(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-slate-400 line-through tabular-nums">
                    {formatINR(product.originalPrice)}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">{discount}% OFF</span>
                </>
              )}
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              {product.description || product.shortDescription}
            </p>

            {/* Variants selector if present */}
            {product.variants && product.variants.length > 0 && (
              <div className="pt-1 space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Available Options
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {product.variants.map((v) => {
                    const label = [v.color, v.size, v.model].filter(Boolean).join(' · ') || v.skuSuffix;
                    const active = selectedVariant === label;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(label)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          active
                            ? 'border-blue-600 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Highlights
              </p>
              <ul className="space-y-1.5">
                {product.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Free Delivery above ₹999</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>7-Day Easy Return & COD</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                if (!isOutOfStock) {
                  onAddToCart(product);
                  onClose();
                }
              }}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                if (!isOutOfStock) {
                  onClose();
                  if (onBuyNow) {
                    onBuyNow(product);
                  } else {
                    onAddToCart(product);
                  }
                }
              }}
              className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-colors ${
                isOutOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
