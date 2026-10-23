import React, { useState } from 'react';
import { Star, ShoppingCart, Check, Eye, Heart, Zap, ZoomIn } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { formatINR, calculateDiscountPercent, calculateZoomPosition } from '../utils/cartLogic.ts';
import { ProductArtwork } from './ProductIllustration.tsx';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onBuyNow?: (product: Product) => void;
  onQuickView: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
}

const ZOOM_ORIGINS_X = [
  'origin-[0%_50%]',
  'origin-[25%_50%]',
  'origin-[50%_50%]',
  'origin-[75%_50%]',
  'origin-[100%_50%]',
] as const;

const ZOOM_ORIGINS_GRID: Record<string, string> = {
  '0-0': 'origin-top-left',
  '1-0': 'origin-[25%_0%]',
  '2-0': 'origin-top',
  '3-0': 'origin-[75%_0%]',
  '4-0': 'origin-top-right',
  '0-1': 'origin-[0%_25%]',
  '1-1': 'origin-[25%_25%]',
  '2-1': 'origin-[50%_25%]',
  '3-1': 'origin-[75%_25%]',
  '4-1': 'origin-[100%_25%]',
  '0-2': 'origin-left',
  '1-2': 'origin-[25%_50%]',
  '2-2': 'origin-center',
  '3-2': 'origin-[75%_50%]',
  '4-2': 'origin-right',
  '0-3': 'origin-[0%_75%]',
  '1-3': 'origin-[25%_75%]',
  '2-3': 'origin-[50%_75%]',
  '3-3': 'origin-[75%_75%]',
  '4-3': 'origin-[100%_75%]',
  '0-4': 'origin-bottom-left',
  '1-4': 'origin-[25%_100%]',
  '2-4': 'origin-bottom',
  '3-4': 'origin-[75%_100%]',
  '4-4': 'origin-bottom-right',
};

function getZoomOriginClass(xPercent: number, yPercent: number): string {
  const xBucket = Math.min(4, Math.max(0, Math.round(xPercent / 25)));
  const yBucket = Math.min(4, Math.max(0, Math.round(yPercent / 25)));
  return ZOOM_ORIGINS_GRID[`${xBucket}-${yBucket}`] ?? ZOOM_ORIGINS_X[2];
}

export function ProductCard({
  product,
  onAddToCart,
  onBuyNow,
  onQuickView,
  isWishlisted,
  onToggleWishlist,
}: ProductCardProps) {
  const [justAdded, setJustAdded] = useState(false);
  const [isZooming, setIsZooming] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ xPercent: number; yPercent: number }>({
    xPercent: 50,
    yPercent: 50,
  });

  const discountPercent = calculateDiscountPercent(product.price, product.originalPrice);
  const isOutOfStock = product.inStock === false || (product.stock !== undefined && product.stock <= 0);
  const isLowStock = !isOutOfStock && product.stock !== undefined && product.stock <= 5;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1100);
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = calculateZoomPosition(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height
    );
    setZoomOrigin(pos);
    if (!isZooming) {
      setIsZooming(true);
    }
  };

  const handleImageMouseLeave = () => {
    setIsZooming(false);
    setZoomOrigin({ xPercent: 50, yPercent: 50 });
  };

  const zoomOriginClass = isZooming
    ? getZoomOriginClass(zoomOrigin.xPercent, zoomOrigin.yPercent)
    : 'origin-center';

  return (
    <article className="group bg-white rounded-2xl border border-slate-200/85 hover:border-blue-300 transition-all duration-200 hover:shadow-xl hover:shadow-blue-950/5 flex flex-col overflow-hidden">
      {/* Product Visual Container (4:3 aspect ratio) with interactive hover-to-zoom inspection */}
      <div
        data-testid={`product-image-zoom-${product.id}`}
        data-zooming={isZooming ? 'true' : 'false'}
        data-zoom-origin={`${zoomOrigin.xPercent}%,${zoomOrigin.yPercent}%`}
        onMouseEnter={() => setIsZooming(true)}
        onMouseMove={handleImageMouseMove}
        onMouseLeave={handleImageMouseLeave}
        className="relative aspect-4/3 w-full overflow-hidden bg-slate-50 cursor-zoom-in select-none"
      >
        <div
          onClick={() => onQuickView(product)}
          className="w-full h-full"
        >
          {product.primaryImageUrl && !imageLoadError ? (
            <img
              src={product.primaryImageUrl}
              alt={product.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImageLoadError(true)}
              className={`w-full h-full object-cover transition-transform duration-200 ease-out will-change-transform ${zoomOriginClass} ${
                isZooming ? 'scale-[1.85]' : 'scale-100'
              } ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
            />
          ) : (
            <ProductArtwork
              artwork={product.artwork}
              className={`w-full h-full transition-transform duration-200 ease-out will-change-transform ${zoomOriginClass} ${
                isZooming ? 'scale-[1.85]' : 'scale-100'
              } ${isOutOfStock ? 'grayscale opacity-75' : ''}`}
            />
          )}
        </div>

        {/* Top-left Status / Discount Badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
          {isOutOfStock ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-600 text-white text-[11px] font-bold tracking-wide shadow-xs">
              OUT OF STOCK
            </span>
          ) : discountPercent > 0 ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#0066FF] text-white text-[11px] font-bold tracking-wide shadow-xs">
              {discountPercent}% OFF
            </span>
          ) : null}

          {isLowStock && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[10px] font-extrabold tracking-wide shadow-xs">
              Only {product.stock} left
            </span>
          )}
        </div>

        {/* Bottom-left Hover-to-Zoom Status Pill */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-2.5 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900/75 text-white text-[11px] font-medium backdrop-blur-xs transition-opacity duration-200 ${
            isZooming ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ZoomIn className="w-3.5 h-3.5 text-blue-300" />
          <span>1.85x Zoom · Move to inspect</span>
        </div>

        {/* Top-right Wishlist & Quick View Buttons */}
        <div
          onMouseEnter={() => setIsZooming(false)}
          onMouseMove={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 flex flex-col gap-1.5 z-10"
        >
          <button
            type="button"
            onClick={() => onToggleWishlist(product.id)}
            aria-label={
              isWishlisted
                ? `Remove ${product.name} from wishlist`
                : `Save ${product.name} to wishlist`
            }
            className={`p-2 rounded-lg backdrop-blur-md transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-[#0066FF] ${
              isWishlisted
                ? 'bg-rose-500 text-white'
                : 'bg-white/90 text-slate-600 hover:text-rose-500 hover:bg-white'
            }`}
          >
            <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>

          <button
            type="button"
            onClick={() => onQuickView(product)}
            aria-label={`Quick view details for ${product.name}`}
            className="p-2 rounded-lg bg-white/90 hover:bg-white text-slate-600 hover:text-[#0066FF] backdrop-blur-md transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-[#0066FF]"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Details Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          {/* Category & Rating Row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[#0066FF] uppercase tracking-wider truncate">
              {product.brand ? `${product.brand} · ${product.category}` : product.category}
            </span>

            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold shrink-0"
              aria-label={`Rated ${product.rating} out of 5 stars from ${product.reviewCount} reviews`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="tabular-nums">{product.rating.toFixed(1)}</span>
              <span className="text-slate-400 font-normal tabular-nums">
                ({product.reviewCount})
              </span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="text-base font-bold text-[#0A192F] leading-snug line-clamp-2 group-hover:text-[#0066FF] transition-colors">
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="text-left focus:outline-none focus-visible:underline"
            >
              {product.name}
            </button>
          </h3>

          {/* Short Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.shortDescription}
          </p>
        </div>

        {/* Price & Action Footer */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-extrabold text-[#0A192F] tabular-nums">
                  {formatINR(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-xs text-slate-400 line-through tabular-nums">
                    {formatINR(product.originalPrice)}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-emerald-700">
                {isOutOfStock ? 'Currently Unavailable' : 'Free Delivery · COD & UPI Eligible'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052CC] hover:underline shrink-0 focus:outline-none focus-visible:underline"
            >
              View Details →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isOutOfStock}
              onClick={handleAdd}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] whitespace-nowrap ${
                isOutOfStock
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : justAdded
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-[#0A192F]'
              }`}
            >
              {isOutOfStock ? (
                <span>Unavailable</span>
              ) : justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                if (!isOutOfStock) {
                  if (onBuyNow) {
                    onBuyNow(product);
                  } else {
                    handleAdd();
                  }
                }
              }}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isOutOfStock
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-xs'
              }`}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Buy Now</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
