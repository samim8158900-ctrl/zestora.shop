import type { CategoryId, CategoryItem } from '../types/store.ts';
import { ZestoraAppIcon, ZestoraLogo } from './ZestoraLogo.tsx';

interface FooterProps {
  categories: CategoryItem[];
  onSelectCategory: (category: CategoryId | 'All') => void;
  onNavigateSection: (sectionId: string) => void;
  onOpenAdminLogin: () => void;
}

export function Footer({
  categories,
  onSelectCategory,
  onNavigateSection,
  onOpenAdminLogin,
}: FooterProps) {
  return (
    <footer
      id="footer-contact"
      className="bg-[#0A192F] text-slate-300 border-t border-slate-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1: Brand Identity & Mission (Dark Background Logo Variant) */}
          <div className="lg:col-span-2 space-y-4">
            <ZestoraLogo variant="dark" size="md" showTagline={true} />

            <p className="text-sm text-slate-300/90 max-w-sm leading-relaxed">
              Zestora is a modern e-commerce shopping platform designed for effortless discovery across electronics, fashion, footwear, home essentials, beauty, sports, accessories, and toys.
            </p>

            {/* Standalone App Icon & Official Brand Palette Showcase */}
            <div className="pt-2 flex items-center gap-3.5">
              <ZestoraAppIcon className="w-10 h-10 shrink-0" withAppTile={true} />
              <div className="text-xs text-slate-400">
                <p className="font-semibold text-white">Zestora Brand Identity System</p>
                <p>Primary Blue #0066FF · Navy #0A192F · Pure White #FFFFFF</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1 pt-1">
              <p className="font-semibold text-slate-200">Customer Care (Demo Preview)</p>
              <p>Email: support@zestora-demo.in · Hours: Mon–Sat, 9:00 AM – 8:00 PM IST</p>
            </div>
          </div>

          {/* Column 2: Shop Categories */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Categories
            </h3>
            <ul className="space-y-2.5 text-sm">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onNavigateSection('featured-products');
                    }}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: More Departments */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              More Departments
            </h3>
            <ul className="space-y-2.5 text-sm">
              {categories.slice(5).map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onNavigateSection('featured-products');
                    }}
                    className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('All');
                    onNavigateSection('featured-products');
                  }}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  View All Demo Products
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Store Sections & Administration */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Store Sections
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="#top"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateSection('top');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Promotional Banner
                </a>
              </li>
              <li>
                <a
                  href="#categories-section"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateSection('categories-section');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Product Categories
                </a>
              </li>
              <li>
                <a
                  href="#featured-products"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateSection('featured-products');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Featured Products
                </a>
              </li>
              <li>
                <a
                  href="#trending-products"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateSection('trending-products');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Trending Products
                </a>
              </li>
              <li>
                <a
                  href="#special-offers"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigateSection('special-offers');
                  }}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Special Offers
                </a>
              </li>
              <li className="pt-1 border-t border-slate-800/80">
                <a
                  href="/admin/login"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenAdminLogin();
                  }}
                  className="text-sky-400 hover:text-sky-300 font-semibold transition-colors"
                >
                  Administrator Login
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal & Demo Disclosure Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>
            © {new Date().getFullYear()} Zestora E-Commerce Platform. All products shown are clearly labeled demo samples and not real inventory.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span>Indian Rupee (₹) Pricing</span>
            <span aria-hidden="true">·</span>
            <a
              href="/admin/login"
              onClick={(e) => {
                e.preventDefault();
                onOpenAdminLogin();
              }}
              className="text-slate-300 hover:text-white underline underline-offset-4"
            >
              Admin Portal
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
