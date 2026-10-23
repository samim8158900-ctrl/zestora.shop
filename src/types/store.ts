import type { ProductSpecAttribute, ProductVariant } from './admin.ts';

export type CategoryId =
  | 'Fashion'
  | 'Electronics'
  | 'Home and Kitchen'
  | 'Beauty'
  | 'Sports'
  | 'Footwear'
  | 'Accessories'
  | 'Toys';

export type ProductArtworkKey =
  | 'anc-headphones'
  | 'ultrabook-pro'
  | 'smartwatch-series'
  | 'cobalt-hoodie'
  | 'linen-overshirt'
  | 'espresso-maker'
  | 'air-purifier'
  | 'vitamin-serum'
  | 'hydration-kit'
  | 'adjustable-dumbbell'
  | 'yoga-mat-pro'
  | 'cloud-sneaker'
  | 'trail-runner'
  | 'leather-weekender'
  | 'polarized-wayfarer'
  | 'wooden-stem-kit'
  | 'plush-teddy';

export interface Product {
  id: string;
  name: string;
  sku?: string;
  category: CategoryId;
  subcategory?: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  discountLabel?: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  trending: boolean;
  specialOffer?: boolean;
  shortDescription: string;
  description?: string;
  highlights: string[];
  specifications?: ProductSpecAttribute[];
  variants?: ProductVariant[];
  images?: { id: string; url: string; alt: string; isPrimary: boolean; order: number }[];
  artwork: ProductArtworkKey;
  primaryImageUrl?: string;
  inStock: boolean;
  stock?: number;
  weight?: string;
  dimensions?: string;
  warranty?: string;
  demoTag: string;
}

export interface CategoryItem {
  id: CategoryId;
  name: CategoryId;
  shortLabel: string;
  description: string;
  itemCount: number;
  bgTint: string;
  accentColor: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export interface HeroSlide {
  id: string;
  kicker: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  ctaText: string;
  targetCategory?: CategoryId | 'All';
  highlightBadge: string;
  theme: 'sky' | 'indigo' | 'emerald';
}

export interface SpecialOffer {
  id: string;
  title: string;
  subtitle: string;
  discountHeadline: string;
  category: CategoryId;
  code: string;
  validNote: string;
  productId: string;
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating-desc';
