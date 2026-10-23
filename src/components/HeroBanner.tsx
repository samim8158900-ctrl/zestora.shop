import { useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Truck, ShieldCheck, RefreshCw, Headphones } from 'lucide-react';
import type { CategoryId, HeroSlide } from '../types/store.ts';
import { HeroStudioComposition } from './ProductIllustration.tsx';

interface HeroBannerProps {
  slides: HeroSlide[];
  onShopNow: (targetCategory?: CategoryId | 'All') => void;
}

export function HeroBanner({ slides, onShopNow }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const currentSlide = slides[activeIndex] ?? slides[0];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  return (
    <section
      id="top"
      aria-label="Promotional Hero Banner"
      className="relative overflow-hidden bg-gradient-to-br from-[#DDF0FF] via-[#EFF6FF] to-[#DBEAFE] border-b border-blue-200/70"
    >
      {/* Subtle Architectural Wave Curves Echoing Zestora Brand Background Direction */}
      <svg
        viewBox="0 0 1440 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-70"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-100 420C240 280 520 510 920 350C1180 246 1340 120 1540 80V560H-100V420Z"
          fill="#FFFFFF"
          fillOpacity="0.45"
        />
        <path
          d="M820 -40C980 120 1120 280 1480 340V-40H820Z"
          fill="#BAE6FD"
          fillOpacity="0.35"
        />
      </svg>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 sm:pt-12 sm:pb-10 lg:pt-14 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          {/* Left Column: Promotional Heading & Call to Action */}
          <div className="lg:col-span-6 space-y-5 text-left z-10 lg:pl-8">
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#0066FF] bg-[#0066FF]/10 px-4 py-1.5 rounded-full">
              <span className="whitespace-nowrap">{currentSlide.kicker}</span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="hidden sm:inline text-[#0A192F] font-semibold whitespace-nowrap">
                {currentSlide.highlightBadge}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight leading-[1.08] text-[#0A192F]">
              <span className="block">{currentSlide.titleLine1}</span>
              <span className="block text-[#0066FF] mt-1">{currentSlide.titleLine2}</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-700 max-w-xl leading-relaxed font-normal">
              {currentSlide.subtitle}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onShopNow(currentSlide.targetCategory)}
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#0066FF] hover:bg-[#0052CC] active:bg-blue-800 text-white text-base font-bold shadow-md hover:shadow-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] whitespace-nowrap shrink-0"
              >
                <span>{currentSlide.ctaText}</span>
                <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </button>

              <a
                href="#categories-section"
                className="inline-flex items-center px-5 py-3.5 rounded-full bg-white/90 hover:bg-white text-[#0A192F] text-sm font-bold border border-slate-300/80 shadow-2xs transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF]"
              >
                Browse 8 Categories
              </a>
            </div>

            {/* Clean Unboxed Metadata Strip */}
            <div className="pt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm font-medium text-slate-600">
              <span>Curated Demo Catalog</span>
              <span aria-hidden="true">·</span>
              <span>Indian Rupee (₹) Pricing</span>
              <span aria-hidden="true">·</span>
              <span>Instant Local Cart Preview</span>
            </div>
          </div>

          {/* Right Column: High-Quality Studio Product Showcase Stage */}
          <div className="lg:col-span-6 relative z-10">
            <HeroStudioComposition slideIndex={activeIndex} />
          </div>
        </div>

        {/* Left & Right Carousel Navigation Controls */}
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Previous promotional banner slide"
          className="hidden sm:flex items-center justify-center absolute left-3 lg:left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-[#0A192F] shadow-md border border-slate-200/80 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#0066FF] z-20"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={handleNext}
          aria-label="Next promotional banner slide"
          className="hidden sm:flex items-center justify-center absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 hover:bg-white text-[#0A192F] shadow-md border border-slate-200/80 transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-[#0066FF] z-20"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Carousel Slide Indicators */}
        <div
          className="flex items-center justify-center gap-2.5 mt-5"
          role="tablist"
          aria-label="Promotional slides"
        >
          {slides.map((slide, index) => {
            const isSelected = index === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`Show slide ${index + 1}: ${slide.titleLine1}`}
                onClick={() => setActiveIndex(index)}
                className={`h-2.5 rounded-full transition-all ${
                  isSelected
                    ? 'w-7 bg-[#0066FF]'
                    : 'w-2.5 bg-slate-400/50 hover:bg-slate-500/70'
                }`}
              />
            );
          })}
        </div>

        {/* Brand Value & Shopping Trust Strip */}
        <div className="mt-8 pt-6 border-t border-blue-200/60 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 text-[#0066FF] flex items-center justify-center shadow-2xs shrink-0">
              <Truck className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#0A192F]">Fast Demo Delivery</p>
              <p className="text-[11px] text-slate-600">Free on demo orders over ₹999</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 text-[#0066FF] flex items-center justify-center shadow-2xs shrink-0">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#0A192F]">Quality Assured</p>
              <p className="text-[11px] text-slate-600">Curated multi-category showcase</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 text-[#0066FF] flex items-center justify-center shadow-2xs shrink-0">
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#0A192F]">Transparent Pricing</p>
              <p className="text-[11px] text-slate-600">Clear INR (₹) & MRP savings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/90 text-[#0066FF] flex items-center justify-center shadow-2xs shrink-0">
              <Headphones className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-[#0A192F]">Dedicated Support</p>
              <p className="text-[11px] text-slate-600">Friendly shopping assistance</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
