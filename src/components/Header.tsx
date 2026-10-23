import React, { useState } from 'react';
import {
  Search,
  User,
  ShoppingCart,
  Menu,
  X,
  Heart,
  ChevronDown,
  Truck,
  Box,
} from 'lucide-react';
import type { CategoryId, CategoryItem } from '../types/store.ts';
import type { CustomerAccount } from '../types/admin.ts';
import { ZestoraLogo } from './ZestoraLogo.tsx';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  selectedCategory: CategoryId | 'All';
  onSelectCategory: (category: CategoryId | 'All') => void;
  categories: CategoryItem[];
  cartCount: number;
  wishlistCount: number;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onOpenOrdersTracking?: () => void;
  onOpen3DStudio?: () => void;
  customer?: CustomerAccount | null;
  onNavigateSection: (sectionId: string) => void;
}

export function Header({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  selectedCategory,
  onSelectCategory,
  categories,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenAccount,
  onOpenOrdersTracking,
  onOpen3DStudio,
  customer,
  onNavigateSection,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const handleMobileNav = (sectionId: string) => {
    setMobileMenuOpen(false);
    onNavigateSection(sectionId);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 lg:gap-4 h-16 sm:h-20">
          {/* 1. Zestora Official Brand Logo Area */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center p-2.5 rounded-lg text-[#0A192F] hover:text-[#0066FF] hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                onSelectCategory('All');
                onSearchChange('');
                onNavigateSection('top');
              }}
              className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] rounded-lg"
            >
              <ZestoraLogo
                variant="light"
                size="md"
                showTagline={true}
                className="transition-transform duration-150 group-hover:scale-[1.01]"
              />
            </a>
          </div>

          {/* 2. Main Navigation Bar (Desktop) */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-4 text-sm font-semibold text-slate-700 shrink-0"
          >
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                onSelectCategory('All');
                onNavigateSection('top');
              }}
              className="text-[#0066FF] border-b-2 border-[#0066FF] py-1 whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="#featured-products"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('featured-products');
              }}
              className="hover:text-[#0066FF] transition-colors py-1 whitespace-nowrap shrink-0"
            >
              Shop
            </a>

            {/* Categories Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setCategoryDropdownOpen(true)}
              onMouseLeave={() => setCategoryDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                aria-expanded={categoryDropdownOpen}
                className="inline-flex items-center gap-1 hover:text-[#0066FF] transition-colors py-1 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] rounded"
              >
                <span>Categories</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute left-0 top-full pt-2 w-64 z-50">
                  <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-2 grid grid-cols-1 gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectCategory('All');
                        setCategoryDropdownOpen(false);
                        onNavigateSection('categories-section');
                      }}
                      className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedCategory === 'All'
                          ? 'bg-blue-50 text-[#0066FF] font-semibold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          onSelectCategory(cat.id);
                          setCategoryDropdownOpen(false);
                          onNavigateSection('featured-products');
                        }}
                        className={`flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedCategory === cat.id
                            ? 'bg-blue-50 text-[#0066FF] font-semibold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-xs text-slate-400 tabular-nums">{cat.itemCount}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a
              href="#special-offers"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('special-offers');
              }}
              className="hover:text-[#0066FF] transition-colors py-1 whitespace-nowrap shrink-0"
            >
              Deals
            </a>
            <a
              href="#trending-products"
              onClick={(e) => {
                e.preventDefault();
                onNavigateSection('trending-products');
              }}
              className="hover:text-[#0066FF] transition-colors py-1 whitespace-nowrap shrink-0"
            >
              Trending
            </a>
            {onOpen3DStudio && (
              <button
                type="button"
                data-testid="header-open-3d-studio"
                onClick={onOpen3DStudio}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-[#0066FF] text-[#0066FF] hover:text-white text-xs font-extrabold transition-colors whitespace-nowrap shrink-0"
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Studio</span>
              </button>
            )}
          </nav>

          {/* 3. Search Bar (Desktop & Tablet) */}
          <form
            onSubmit={onSearchSubmit}
            role="search"
            aria-label="Product Search"
            className="hidden md:flex items-center flex-1 min-w-[200px] lg:min-w-[260px] max-w-md bg-slate-100/90 hover:bg-slate-100 focus-within:bg-white rounded-full border border-slate-200/90 focus-within:border-[#0066FF] focus-within:ring-2 focus-within:ring-[#0066FF]/15 transition-all pl-4 pr-1.5 py-1"
          >
            <label htmlFor="desktop-product-search" className="sr-only">
              Search for products, brands, or categories
            </label>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" aria-hidden="true" />
            <input
              id="desktop-product-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search for products, brands, SKU..."
              className="w-full bg-transparent text-sm text-[#0A192F] placeholder:text-slate-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search query"
                className="p-1 text-slate-400 hover:text-slate-600 mr-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-full transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF]"
            >
              Search
            </button>
          </form>

          {/* 4. Account, Orders/Tracking & Shopping Cart Controls */}
          <div className="flex items-center gap-1 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenAccount}
              className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-[#0A192F] hover:text-[#0066FF] hover:bg-slate-100/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] whitespace-nowrap shrink-0"
              aria-label="Account and Login"
            >
              <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#0066FF]" aria-hidden="true" />
              <span className="hidden sm:inline">
                {customer ? `Hi, ${customer.fullName.split(' ')[0]}` : 'Login / Sign Up'}
              </span>
            </button>

            {onOpenOrdersTracking && (
              <button
                type="button"
                onClick={onOpenOrdersTracking}
                className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-2 rounded-lg text-xs sm:text-sm font-semibold text-[#0A192F] hover:text-[#0066FF] hover:bg-slate-100/80 transition-colors whitespace-nowrap shrink-0"
                aria-label="Orders and Live Parcel Tracking"
              >
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" aria-hidden="true" />
                <span className="hidden xl:inline">Orders & Track</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateSection('featured-products')}
              className="hidden sm:inline-flex relative items-center justify-center p-2 rounded-lg text-[#0A192F] hover:text-[#0066FF] hover:bg-slate-100/80 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF]"
              aria-label={`Saved wishlist items (${wishlistCount})`}
            >
              <Heart className="w-5 h-5" aria-hidden="true" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onOpenCart}
              className="relative inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-2 rounded-xl bg-[#0A192F] hover:bg-[#0066FF] text-white text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF] whitespace-nowrap shrink-0"
              aria-label={`Open shopping cart with ${cartCount} items`}
            >
              <ShoppingCart className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">Cart</span>
              <span
                data-testid="header-cart-count"
                className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[#0066FF] text-white text-xs font-bold tabular-nums"
              >
                {cartCount}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar Row */}
        <div className="md:hidden pb-3">
          <form
            onSubmit={onSearchSubmit}
            role="search"
            aria-label="Mobile Product Search"
            className="flex items-center w-full bg-slate-100 focus-within:bg-white rounded-full border border-slate-200 focus-within:border-[#0066FF] pl-3.5 pr-1.5 py-1"
          >
            <label htmlFor="mobile-product-search" className="sr-only">
              Search for products
            </label>
            <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2" aria-hidden="true" />
            <input
              id="mobile-product-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search products, categories..."
              className="w-full bg-transparent text-sm text-[#0A192F] placeholder:text-slate-400 focus:outline-none py-1"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-[#0066FF] text-white text-xs font-semibold rounded-full whitespace-nowrap shrink-0"
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile Navigation"
          className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-4 shadow-lg"
        >
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleMobileNav('top')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#0A192F] bg-slate-50 hover:bg-blue-50 hover:text-[#0066FF]"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleMobileNav('featured-products')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#0A192F] bg-slate-50 hover:bg-blue-50 hover:text-[#0066FF]"
            >
              Featured Products
            </button>
            {onOpenOrdersTracking && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenOrdersTracking();
                }}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
              >
                Orders & Tracking
              </button>
            )}
            <button
              type="button"
              onClick={() => handleMobileNav('special-offers')}
              className="text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-[#0A192F] bg-slate-50 hover:bg-blue-50 hover:text-[#0066FF]"
            >
              Special Offers
            </button>
            {onOpen3DStudio && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpen3DStudio();
                }}
                className="col-span-2 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-extrabold text-white bg-[#0066FF] hover:bg-[#0052CC]"
              >
                <Box className="w-4 h-4" />
                <span>Launch Interactive 3D Product Studio</span>
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
              Shop by Category
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelectCategory(cat.id);
                    handleMobileNav('featured-products');
                  }}
                  className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-[#0066FF] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat.shortLabel}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
