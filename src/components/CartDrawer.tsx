import React from 'react';
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Bookmark,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { CartItem, Product } from '../types/store.ts';
import { calculateCartSummary, formatINR } from '../utils/cartLogic.ts';
import { ProductArtwork } from './ProductIllustration.tsx';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  savedForLater?: Product[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onSaveForLater?: (product: Product) => void;
  onMoveSavedToCart?: (product: Product) => void;
  onRemoveSaved?: (productId: string) => void;
  onClearCart: () => void;
  onProceedToCheckout: () => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  savedForLater = [],
  onUpdateQuantity,
  onRemoveItem,
  onSaveForLater,
  onMoveSavedToCart,
  onRemoveSaved,
  onClearCart,
  onProceedToCheckout,
}: CartDrawerProps) {
  if (!isOpen) return null;

  const summary = calculateCartSummary(items);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 id="cart-drawer-title" className="text-base font-extrabold text-slate-900">
                Your Zestora Cart
              </h2>
              <p className="text-xs text-slate-500 tabular-nums">
                {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'} selected
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping cart"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cart Items & Saved For Later Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {items.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Your shopping cart is empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Explore Zestora categories, featured deals, or trending items and add products to your cart.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex gap-3.5 p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-200/60 bg-white">
                    {product.primaryImageUrl ? (
                      <img
                        src={product.primaryImageUrl}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ProductArtwork artwork={product.artwork} className="w-full h-full" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                        {product.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{product.name}</h4>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <p className="text-sm font-extrabold text-slate-900 tabular-nums">
                          {formatINR(product.price * quantity)}
                        </p>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-[11px] text-slate-400 line-through tabular-nums">
                            {formatINR(product.originalPrice * quantity)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, -1)}
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="p-1.5 text-slate-600 hover:text-blue-600"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-slate-900 tabular-nums">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, 1)}
                          aria-label={`Increase quantity of ${product.name}`}
                          className="p-1.5 text-slate-600 hover:text-blue-600"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        {onSaveForLater && (
                          <button
                            type="button"
                            onClick={() => onSaveForLater(product)}
                            className="px-2 py-1 rounded text-[11px] font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-1"
                          >
                            <Bookmark className="w-3 h-3" />
                            Save for Later
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onRemoveItem(product.id)}
                          aria-label={`Remove ${product.name} from cart`}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Saved For Later Section */}
          {savedForLater.length > 0 && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-blue-600" />
                Saved for Later ({savedForLater.length})
              </h3>
              <div className="space-y-2.5">
                {savedForLater.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                      <p className="text-xs font-extrabold text-blue-600 tabular-nums">
                        {formatINR(prod.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onMoveSavedToCart && (
                        <button
                          type="button"
                          onClick={() => onMoveSavedToCart(prod)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-blue-600 text-white text-[11px] font-bold transition-colors"
                        >
                          Move to Cart
                        </button>
                      )}
                      {onRemoveSaved && (
                        <button
                          type="button"
                          onClick={() => onRemoveSaved(prod.id)}
                          aria-label={`Remove ${prod.name} from saved for later`}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cart Summary Footer */}
        {items.length > 0 && (
          <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-4">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center gap-2 text-xs text-blue-950">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Use code <strong>ZESTORA10</strong> in Checkout for 10% Instant Discount!
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-semibold tabular-nums">{formatINR(summary.subtotal)}</span>
              </div>
              {summary.totalSavings > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>MRP Discount Savings</span>
                  <span className="font-semibold tabular-nums">
                    -{formatINR(summary.totalSavings)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Estimated Delivery</span>
                <span className="font-semibold">
                  {summary.subtotal >= 999 ? (
                    <span className="text-emerald-700 font-bold">FREE</span>
                  ) : (
                    formatINR(79)
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200 tabular-nums">
                <span>Estimated Total</span>
                <span>
                  {formatINR(summary.subtotal + (summary.subtotal >= 999 ? 0 : 79))}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={onProceedToCheckout}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <span>Proceed to Secure Checkout (UPI / Cards / COD)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  100% Authentic · Easy Returns
                </span>
                <button
                  type="button"
                  onClick={onClearCart}
                  className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Clear Cart
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
