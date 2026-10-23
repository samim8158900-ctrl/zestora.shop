import { ArrowRight, Tag } from 'lucide-react';
import type { CategoryId, Product, SpecialOffer } from '../types/store.ts';
import { formatINR } from '../utils/cartLogic.ts';
import { ProductArtwork } from './ProductIllustration.tsx';

interface SpecialOffersSectionProps {
  offers: SpecialOffer[];
  products: Product[];
  onAddToCart: (product: Product) => void;
  onSelectCategory: (category: CategoryId) => void;
}

export function SpecialOffersSection({
  offers,
  products,
  onAddToCart,
  onSelectCategory,
}: SpecialOffersSectionProps) {
  return (
    <section
      id="special-offers"
      aria-labelledby="special-offers-heading"
      className="relative overflow-hidden py-12 sm:py-16 bg-[#0A192F] text-white"
    >
      {/* Subtle Dark Navy to Royal Blue Architectural Glow */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(0,102,255,0.22),transparent_60%)]"
        aria-hidden="true"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-400">
              Zestora Curated Value Showcase
            </p>
            <h2
              id="special-offers-heading"
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1"
            >
              Special Offers & Bundle Highlights
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-1.5 max-w-2xl">
              Explore featured demo promotions across electronics, home appliances, and athletic footwear. All prices shown in Indian Rupees (₹).
            </p>
          </div>
          <div className="text-xs text-slate-400 font-medium">
            <span>Demo Storefront Offers</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>No Real Payment Required</span>
          </div>
        </div>

        {/* 3-Column Promotional Offer Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {offers.map((offer) => {
            const spotlightProduct = products.find((p) => p.id === offer.productId);
            return (
              <div
                key={offer.id}
                className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-6 flex flex-col justify-between gap-5 hover:border-[#0066FF]/70 transition-colors"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 text-xs text-sky-300 font-semibold">
                    <span>{offer.category}</span>
                    <span className="font-mono text-slate-300">CODE: {offer.code}</span>
                  </div>

                  <div>
                    <p className="text-2xl font-extrabold text-white tracking-tight">
                      {offer.discountHeadline}
                    </p>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">
                      {offer.title}
                    </h3>
                    <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                      {offer.subtitle}
                    </p>
                  </div>

                  {spotlightProduct && (
                    <div className="flex items-center gap-3.5 bg-[#0A192F] border border-slate-700/70 rounded-xl p-3">
                      <div className="w-16 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-800">
                        <ProductArtwork artwork={spotlightProduct.artwork} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">
                          {spotlightProduct.name}
                        </p>
                        <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
                          <span className="text-sm font-extrabold text-sky-400">
                            {formatINR(spotlightProduct.price)}
                          </span>
                          {spotlightProduct.originalPrice && (
                            <span className="text-xs text-slate-400 line-through">
                              {formatINR(spotlightProduct.originalPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectCategory(offer.category)}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Filter {offer.category}</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {spotlightProduct && (
                    <button
                      type="button"
                      onClick={() => onAddToCart(spotlightProduct)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Tag className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Add Deal Item</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
