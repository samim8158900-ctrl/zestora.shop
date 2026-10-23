import { ArrowRight } from 'lucide-react';
import type { CategoryId, CategoryItem } from '../types/store.ts';
import { CategoryArtwork } from './ProductIllustration.tsx';

interface CategorySectionProps {
  categories: CategoryItem[];
  selectedCategory: CategoryId | 'All';
  onSelectCategory: (category: CategoryId | 'All') => void;
}

export function CategorySection({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategorySectionProps) {
  return (
    <section
      id="categories-section"
      aria-labelledby="categories-heading"
      className="py-10 sm:py-12 bg-white border-b border-slate-200/70"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
          <div>
            <h2
              id="categories-heading"
              className="text-2xl sm:text-3xl font-extrabold text-[#0A192F] tracking-tight"
            >
              Shop by Category
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-1">
              Find exactly what you need across our 8 curated departments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onSelectCategory('All')}
            className={`inline-flex items-center gap-1.5 text-sm font-bold transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer ${
              selectedCategory === 'All'
                ? 'text-[#0066FF]'
                : 'text-[#0A192F] hover:text-[#0066FF]'
            }`}
          >
            <span>{selectedCategory === 'All' ? 'Showing All Categories' : 'Reset Category Filter'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* 8 Required Category Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5 sm:gap-4">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() =>
                  onSelectCategory(isSelected ? 'All' : cat.id)
                }
                aria-pressed={isSelected}
                className={`group flex flex-col items-center text-center px-2.5 py-3.5 rounded-2xl transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] ${
                  isSelected
                    ? 'bg-blue-50/90 ring-2 ring-[#0066FF] shadow-sm'
                    : 'bg-[#F8FAFC] hover:bg-white border border-slate-200/90 hover:border-[#0066FF]/40 hover:shadow-md'
                }`}
              >
                <div
                  className={`w-full aspect-[4/3] rounded-xl bg-gradient-to-br ${cat.bgTint} flex items-center justify-center p-2 mb-3 transition-transform duration-150 group-hover:-translate-y-0.5`}
                >
                  <CategoryArtwork category={cat.id} />
                </div>

                <span
                  className={`text-xs sm:text-[13px] font-bold leading-snug whitespace-nowrap ${
                    isSelected ? 'text-[#0066FF]' : 'text-[#0A192F] group-hover:text-[#0066FF]'
                  }`}
                >
                  {cat.name}
                </span>

                <span className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                  {cat.itemCount} demo items
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
