import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Star,
  ShoppingCart,
  Zap,
  Heart,
  ShieldCheck,
  Truck,
  RotateCcw,
  Check,
  Maximize2,
  X,
  ThumbsUp,
  Flag,
  Camera,
  Trash2,
  Edit3,
  MessageSquarePlus,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Package,
  MapPin,
  Sparkles,
  ZoomIn,
  Upload,
  Box,
  BellRing,
} from 'lucide-react';
import type { CategoryId, Product } from '../types/store.ts';
import type {
  CustomerAccount,
  ProductQuestionRecord,
  ProductRatingSummary,
  ProductReviewPhoto,
  ProductReviewRecord,
  ProductVariant,
  StockAlertRecord,
} from '../types/admin.ts';
import { formatINR, calculateDiscountPercent, calculateZoomPosition } from '../utils/cartLogic.ts';
import {
  estimateDeliveryByPinCode,
  validateStockAlertEmail,
  type ReviewSortOption,
  type ReviewStarFilter,
} from '../utils/reviewAndProductLogic.ts';
import { ProductArtwork } from './ProductIllustration.tsx';
import { ProductCard } from './ProductCard.tsx';

interface ProductDetailsPageProps {
  productIdOrSlug: string;
  catalogProducts: Product[];
  customerAccount: CustomerAccount | null;
  customerToken?: string;
  wishlistIds: string[];
  recentlyViewedProducts: Product[];
  onBackToStore: () => void;
  onSelectCategory: (category: CategoryId) => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product, quantity?: number, selectedVariant?: string) => void;
  onBuyNow: (product: Product, quantity?: number, selectedVariant?: string) => void;
  onToggleWishlist: (productId: string) => void;
  onRequireCustomerAuth: (pendingActionMessage?: string) => void;
  onCatalogRefresh?: () => void;
  onOpen3DStudio?: (productId: string) => void;
}

interface GallerySlide {
  id: string;
  label: string;
  type: 'image' | 'artwork';
  url?: string;
  angleClass?: string;
  tintClass?: string;
  variantLabel?: string;
}

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
  return ZOOM_ORIGINS_GRID[`${xBucket}-${yBucket}`] ?? 'origin-center';
}

export function ProductDetailsPage({
  productIdOrSlug,
  catalogProducts,
  customerAccount,
  customerToken,
  wishlistIds,
  recentlyViewedProducts,
  onBackToStore,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onRequireCustomerAuth,
  onCatalogRefresh,
  onOpen3DStudio,
}: ProductDetailsPageProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [ratingSummary, setRatingSummary] = useState<ProductRatingSummary>({
    averageRating: 0,
    totalRatings: 0,
    totalWrittenReviews: 0,
    verifiedPurchaseCount: 0,
    withPhotosCount: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    distributionPercent: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [reviews, setReviews] = useState<ProductReviewRecord[]>([]);
  const [questions, setQuestions] = useState<ProductQuestionRecord[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [frequentlyBoughtTogether, setFrequentlyBoughtTogether] = useState<Product[]>([]);
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState<boolean>(false);

  // Gallery & Zoom State
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});
  const [isZoomingMain, setIsZoomingMain] = useState<boolean>(false);
  const [zoomOrigin, setZoomOrigin] = useState<{ xPercent: number; yPercent: number }>({
    xPercent: 50,
    yPercent: 50,
  });
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [lightboxCustomPhotoUrl, setLightboxCustomPhotoUrl] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Variant & Quantity Selection State
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('Obsidian Black');
  const [selectedSize, setSelectedSize] = useState<string>('Standard');
  const [quantity, setQuantity] = useState<number>(1);
  const [justAddedToCart, setJustAddedToCart] = useState<boolean>(false);

  // Delivery Estimator State
  const defaultPin =
    customerAccount?.addresses?.find((a) => a.isDefault)?.postalCode ??
    customerAccount?.addresses?.[0]?.postalCode ??
    '560001';
  const [pinCodeInput, setPinCodeInput] = useState<string>(defaultPin);
  const [deliveryEstimate, setDeliveryEstimate] = useState(() =>
    estimateDeliveryByPinCode(defaultPin)
  );

  // Review Filter & Sort State
  const [starFilter, setStarFilter] = useState<ReviewStarFilter>('all');
  const [withPhotosOnly, setWithPhotosOnly] = useState<boolean>(false);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [reviewSortBy, setReviewSortBy] = useState<ReviewSortOption>('helpful');
  const [visibleReviewLimit, setVisibleReviewLimit] = useState<number>(5);

  // Review Form State
  const [reviewFormOpen, setReviewFormOpen] = useState<boolean>(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewPhotos, setReviewPhotos] = useState<ProductReviewPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewFeedback, setReviewFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Report Review Modal State
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<'Spam' | 'Abuse' | 'Misleading' | 'Inappropriate'>('Spam');
  const [reportComment, setReportComment] = useState<string>('');
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Q&A State
  const [qaSearchQuery, setQaSearchQuery] = useState<string>('');
  const [questionInput, setQuestionInput] = useState<string>('');
  const [askingQuestion, setAskingQuestion] = useState<boolean>(false);
  const [activeAnswerQuestionId, setActiveAnswerQuestionId] = useState<string | null>(null);
  const [answerInputText, setAnswerInputText] = useState<string>('');
  const [submittingAnswer, setSubmittingAnswer] = useState<boolean>(false);
  const [qaFeedback, setQaFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Out-of-Stock 'Notify Me' Alert State (stock_alerts table)
  const [notifyEmail, setNotifyEmail] = useState<string>(customerAccount?.email ?? '');
  const [notifySubmitting, setNotifySubmitting] = useState<boolean>(false);
  const [stockAlertsCount, setStockAlertsCount] = useState<number>(0);
  const [notifyFeedback, setNotifyFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    subscribedEmail?: string;
  } | null>(null);

  const reviewsSectionRef = useRef<HTMLElement | null>(null);
  const notifyInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (customerAccount?.email && !notifyEmail) {
      setNotifyEmail(customerAccount.email);
    }
  }, [customerAccount?.email, notifyEmail]);

  const showToast = (msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => {
      setActionToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (customerToken) {
      headers['X-Customer-Token'] = customerToken;
    }
    return headers;
  }, [customerToken]);

  const fetchProductDetails = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (starFilter !== 'all') params.set('star', String(starFilter));
      if (withPhotosOnly) params.set('withPhotos', 'true');
      if (verifiedOnly) params.set('verified', 'true');
      params.set('sortBy', reviewSortBy);

      const res = await fetch(
        `/api/storefront/products/${encodeURIComponent(productIdOrSlug)}?${params.toString()}`,
        {
          credentials: 'include',
          headers: authHeaders,
        }
      );

      if (res.status === 404) {
        setNotFound(true);
        setProduct(null);
        return;
      }

      if (!res.ok) {
        throw new Error('Failed to load product details from server.');
      }

      const data = await res.json();
      const loadedProduct = data.product as Product;
      setProduct(loadedProduct);
      if (data.ratingSummary) {
        setRatingSummary(data.ratingSummary as ProductRatingSummary);
      }
      if (Array.isArray(data.reviews)) {
        setReviews(data.reviews as ProductReviewRecord[]);
      }
      if (Array.isArray(data.questions)) {
        setQuestions(data.questions as ProductQuestionRecord[]);
      }
      if (Array.isArray(data.relatedProducts)) {
        setRelatedProducts(data.relatedProducts as Product[]);
      }
      if (Array.isArray(data.frequentlyBoughtTogether)) {
        setFrequentlyBoughtTogether(data.frequentlyBoughtTogether as Product[]);
      }
      if (data.customerContext) {
        setIsVerifiedBuyer(Boolean(data.customerContext.isVerifiedBuyer));
      }
      if (typeof data.stockAlertsCount === 'number') {
        setStockAlertsCount(data.stockAlertsCount);
      }
      if (data.customerStockAlert) {
        const existingAlert = data.customerStockAlert as StockAlertRecord;
        setNotifyFeedback({
          type: 'success',
          text: `You're on the notify list! We'll email ${existingAlert.email} when restocked.`,
          subscribedEmail: existingAlert.email,
        });
      }

      if (loadedProduct.variants && loadedProduct.variants.length > 0) {
        setSelectedVariantId((prev) => prev || loadedProduct.variants![0].id);
      }
    } catch {
      // Fallback to local catalog if network error
      const fallback = catalogProducts.find(
        (p) => p.id.toLowerCase() === productIdOrSlug.toLowerCase()
      );
      if (fallback) {
        setProduct(fallback);
        setRelatedProducts(
          catalogProducts.filter((p) => p.category === fallback.category && p.id !== fallback.id).slice(0, 4)
        );
      } else {
        setNotFound(true);
        setErrorMessage('Unable to find the requested product.');
      }
    } finally {
      setLoading(false);
    }
  }, [productIdOrSlug, starFilter, withPhotosOnly, verifiedOnly, reviewSortBy, authHeaders, catalogProducts]);

  useEffect(() => {
    setActiveSlideIndex(0);
    setQuantity(1);
    setReviewFeedback(null);
    setQaFeedback(null);
    setNotifyFeedback(null);
    fetchProductDetails();
  }, [productIdOrSlug, fetchProductDetails]);

  // Build Gallery Slides (combines valid uploaded images with multi-angle studio views so every product has a 4+ image gallery)
  const gallerySlides: GallerySlide[] = useMemo(() => {
    if (!product) return [];
    const slides: GallerySlide[] = [];

    if (Array.isArray(product.images) && product.images.length > 0) {
      for (const img of product.images) {
        if (img.url && !brokenUrls[img.url]) {
          slides.push({
            id: img.id || img.url,
            label: img.alt || `${product.name} — Main View`,
            type: 'image',
            url: img.url,
          });
        }
      }
    } else if (product.primaryImageUrl && !brokenUrls[product.primaryImageUrl]) {
      slides.push({
        id: 'primary-img',
        label: `${product.name} — Primary View`,
        type: 'image',
        url: product.primaryImageUrl,
      });
    }

    const studioAngles: { id: string; label: string; angleClass: string; tintClass: string }[] = [
      {
        id: 'studio-front',
        label: 'Studio Front Elevation',
        angleClass: 'scale-100',
        tintClass: 'bg-slate-50',
      },
      {
        id: 'studio-detail',
        label: 'Close-Up Craftsmanship & Finish',
        angleClass: 'scale-125 origin-center',
        tintClass: 'bg-blue-50/40',
      },
      {
        id: 'studio-profile',
        label: 'Ergonomic Profile & Silhouette',
        angleClass: 'scale-110 -rotate-2',
        tintClass: 'bg-indigo-50/30',
      },
      {
        id: 'studio-edition',
        label: 'Retail Packaging & Edition View',
        angleClass: 'scale-95',
        tintClass: 'bg-emerald-50/30',
      },
    ];

    for (const angle of studioAngles) {
      if (slides.length < 5) {
        slides.push({
          id: angle.id,
          label: `${product.name} — ${angle.label}`,
          type: 'artwork',
          angleClass: angle.angleClass,
          tintClass: angle.tintClass,
        });
      }
    }

    return slides;
  }, [product, brokenUrls]);

  const safeSlideIndex = Math.min(
    Math.max(0, activeSlideIndex),
    Math.max(0, gallerySlides.length - 1)
  );
  const currentSlide = gallerySlides[safeSlideIndex];

  // Selected Variant Resolution
  const activeVariant: ProductVariant | undefined = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return undefined;
    return product.variants.find((v) => v.id === selectedVariantId) ?? product.variants[0];
  }, [product, selectedVariantId]);

  const effectivePrice = activeVariant?.priceOverride ?? product?.price ?? 0;
  const effectiveStock =
    activeVariant !== undefined
      ? activeVariant.stock
      : product?.stock !== undefined
      ? product.stock
      : product?.inStock
      ? 15
      : 0;
  const isOutOfStock = effectiveStock <= 0;
  const discountPercent = product
    ? calculateDiscountPercent(effectivePrice, product.originalPrice)
    : 0;
  const totalSavingsPerUnit =
    product?.originalPrice && product.originalPrice > effectivePrice
      ? product.originalPrice - effectivePrice
      : 0;

  const formattedVariantSummary = useMemo(() => {
    if (activeVariant) {
      return [activeVariant.color, activeVariant.size, activeVariant.model]
        .filter(Boolean)
        .join(' · ');
    }
    return `${selectedColor} · ${selectedSize}`;
  }, [activeVariant, selectedColor, selectedSize]);

  const isWishlisted = product ? wishlistIds.includes(product.id) : false;

  const customerOwnReview = useMemo(() => {
    if (!customerAccount) return null;
    return reviews.find((r) => r.customerId === customerAccount.id) ?? null;
  }, [reviews, customerAccount]);

  const allCustomerReviewPhotos = useMemo(() => {
    const list: { id: string; url: string; reviewerName: string; rating: number; title: string }[] =
      [];
    for (const rev of reviews) {
      if (Array.isArray(rev.photos)) {
        for (const p of rev.photos) {
          if (p.url) {
            list.push({
              id: p.id,
              url: p.url,
              reviewerName: rev.customerName,
              rating: rev.rating,
              title: rev.title,
            });
          }
        }
      }
    }
    return list;
  }, [reviews]);

  // Handlers: Gallery Navigation & Swipe
  const handlePrevSlide = () => {
    if (gallerySlides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length);
  };

  const handleNextSlide = () => {
    if (gallerySlides.length <= 1) return;
    setActiveSlideIndex((prev) => (prev + 1) % gallerySlides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
  };

  const handleMainImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = calculateZoomPosition(
      e.clientX - rect.left,
      e.clientY - rect.top,
      rect.width,
      rect.height
    );
    setZoomOrigin(pos);
    if (!isZoomingMain) {
      setIsZoomingMain(true);
    }
  };

  // Handlers: Cart, Buy Now & Wishlist
  const handleAddToCartClick = () => {
    if (!product || isOutOfStock) return;
    const safeQty = Math.min(Math.max(1, quantity), Math.max(1, effectiveStock));
    onAddToCart(product, safeQty, formattedVariantSummary);
    setJustAddedToCart(true);
    showToast(`Added ${safeQty} × "${product.name}" (${formattedVariantSummary}) to cart.`);
    window.setTimeout(() => setJustAddedToCart(false), 1400);
  };

  const handleBuyNowClick = () => {
    if (!product || isOutOfStock) return;
    const safeQty = Math.min(Math.max(1, quantity), Math.max(1, effectiveStock));
    onBuyNow(product, safeQty, formattedVariantSummary);
  };

  const handleWishlistClick = () => {
    if (!product) return;
    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to save products to your Zestora Wishlist.');
      return;
    }
    onToggleWishlist(product.id);
    showToast(
      isWishlisted
        ? `Removed "${product.name}" from your wishlist.`
        : `Saved "${product.name}" to your wishlist.`
    );
  };

  // Handler: Submit Out-of-Stock 'Notify Me' Email Alert
  const handleSubmitStockAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    const validation = validateStockAlertEmail(notifyEmail);
    if (!validation.valid) {
      setNotifyFeedback({
        type: 'error',
        text: validation.error || 'Please enter a valid email address.',
      });
      return;
    }

    setNotifySubmitting(true);
    setNotifyFeedback(null);

    try {
      const res = await fetch('/api/products/stock-alert', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          email: validation.normalizedEmail,
          productId: product.id,
          variantId: activeVariant?.id,
          variantLabel: formattedVariantSummary,
        }),
      });

      const data = await res.json();
      if (!res.ok && !data.alreadySubscribed) {
        setNotifyFeedback({
          type: 'error',
          text: data.error || 'Unable to register stock alert. Please try again.',
        });
        return;
      }

      if (typeof data.totalAlertsForProduct === 'number') {
        setStockAlertsCount(data.totalAlertsForProduct);
      }
      setNotifyEmail(validation.normalizedEmail);
      setNotifyFeedback({
        type: 'success',
        text:
          data.message ||
          data.error ||
          `We'll notify ${validation.normalizedEmail} as soon as ${product.name} is back in stock!`,
        subscribedEmail: validation.normalizedEmail,
      });
    } catch {
      setNotifyFeedback({
        type: 'error',
        text: 'Network error while saving your stock alert request. Please try again.',
      });
    } finally {
      setNotifySubmitting(false);
    }
  };

  // Handler: Upload Review Photo
  const handleUploadReviewFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to upload review photos.');
      return;
    }

    if (reviewPhotos.length + files.length > 5) {
      setReviewFeedback({
        type: 'error',
        text: 'You can upload a maximum of 5 photos per review.',
      });
      e.target.value = '';
      return;
    }

    setUploadingPhoto(true);
    setUploadProgress(15);
    setReviewFeedback(null);

    try {
      const uploadedList: ProductReviewPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          throw new Error(`Unsupported file type "${file.type}". Please upload JPEG, PNG, or WebP.`);
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`File "${file.name}" exceeds the 5MB maximum size limit.`);
        }

        const buf = await file.arrayBuffer();
        setUploadProgress(Math.round(((i + 0.5) / files.length) * 100));

        const res = await fetch('/api/customers/reviews/upload-photo', {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...authHeaders,
            'Content-Type': file.type,
            'X-File-Name': file.name,
          },
          body: buf,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload review photo.');
        }

        uploadedList.push({
          id: data.id,
          url: data.url,
          caption: file.name,
        });
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      setReviewPhotos((prev) => [...prev, ...uploadedList]);
    } catch (err) {
      setReviewFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Photo upload failed.',
      });
    } finally {
      setUploadingPhoto(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  // Handler: Submit or Update Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to submit a product rating and review.');
      return;
    }

    setSubmittingReview(true);
    setReviewFeedback(null);

    try {
      const endpoint = editingReviewId
        ? `/api/storefront/reviews/${encodeURIComponent(editingReviewId)}`
        : `/api/storefront/products/${encodeURIComponent(product.id)}/reviews`;
      const method = editingReviewId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
          photos: reviewPhotos,
          selectedVariant: formattedVariantSummary,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReviewFeedback({
          type: 'error',
          text: data.error || 'Could not save your review.',
        });
        return;
      }

      if (data.ratingSummary) {
        setRatingSummary(data.ratingSummary as ProductRatingSummary);
      }
      await fetchProductDetails();
      onCatalogRefresh?.();

      setReviewFeedback({
        type: 'success',
        text: editingReviewId || data.updated
          ? 'Your review and rating have been updated!'
          : 'Thank you! Your customer review has been published.',
      });
      setEditingReviewId(null);
      setReviewFormOpen(false);
    } catch {
      setReviewFeedback({
        type: 'error',
        text: 'Network error while submitting your review. Please try again.',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleStartEditReview = (rev: ProductReviewRecord) => {
    setEditingReviewId(rev.id);
    setReviewRating(rev.rating);
    setReviewTitle(rev.title);
    setReviewComment(rev.comment);
    setReviewPhotos(rev.photos ?? []);
    setReviewFormOpen(true);
    setReviewFeedback(null);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!customerAccount) return;
    try {
      const res = await fetch(`/api/storefront/reviews/${encodeURIComponent(reviewId)}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders,
      });
      if (res.ok) {
        showToast('Your review has been deleted.');
        setEditingReviewId(null);
        setReviewTitle('');
        setReviewComment('');
        setReviewPhotos([]);
        await fetchProductDetails();
        onCatalogRefresh?.();
      }
    } catch {
      showToast('Could not delete review.');
    }
  };

  // Handler: Toggle Helpful Vote on Review
  const handleToggleReviewHelpful = async (review: ProductReviewRecord) => {
    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to mark a review as helpful.');
      return;
    }

    try {
      const res = await fetch(
        `/api/storefront/reviews/${encodeURIComponent(review.id)}/helpful`,
        {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Unable to record vote.');
        return;
      }

      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id
            ? {
                ...r,
                helpfulCount: data.helpfulCount,
                helpfulVoterIds: data.review?.helpfulVoterIds ?? r.helpfulVoterIds,
              }
            : r
        )
      );
      showToast(data.voted ? 'Marked review as helpful!' : 'Helpful vote removed.');
    } catch {
      showToast('Failed to update helpful vote.');
    }
  };

  // Handler: Submit Review Report
  const handleSubmitReportReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingReviewId) return;
    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to report a review.');
      return;
    }

    try {
      const res = await fetch(
        `/api/storefront/reviews/${encodeURIComponent(reportingReviewId)}/report`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            reason: reportReason,
            comment: reportComment,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not report review.');
      } else {
        showToast(data.message || 'Review reported for moderation.');
      }
    } catch {
      showToast('Network error while reporting review.');
    } finally {
      setReportingReviewId(null);
      setReportComment('');
    }
  };

  // Handler: Ask a Question
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to ask a question about this product.');
      return;
    }

    setAskingQuestion(true);
    setQaFeedback(null);
    try {
      const res = await fetch(
        `/api/storefront/products/${encodeURIComponent(product.id)}/questions`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ questionText: questionInput }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setQaFeedback({ type: 'error', text: data.error || 'Could not post question.' });
        return;
      }
      if (Array.isArray(data.questions)) {
        setQuestions(data.questions as ProductQuestionRecord[]);
      }
      setQuestionInput('');
      setQaFeedback({
        type: 'success',
        text: 'Your question has been posted! Verified buyers and Zestora sellers can now respond.',
      });
    } catch {
      setQaFeedback({ type: 'error', text: 'Failed to submit question.' });
    } finally {
      setAskingQuestion(false);
    }
  };

  // Handler: Post Answer to a Question
  const handlePostAnswer = async (e: React.FormEvent, questionId: string) => {
    e.preventDefault();
    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to answer a customer question.');
      return;
    }

    setSubmittingAnswer(true);
    try {
      const res = await fetch(
        `/api/storefront/questions/${encodeURIComponent(questionId)}/answers`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ answerText: answerInputText }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Could not post answer.');
        return;
      }
      if (Array.isArray(data.questions)) {
        setQuestions(data.questions as ProductQuestionRecord[]);
      }
      setAnswerInputText('');
      setActiveAnswerQuestionId(null);
      showToast('Your answer has been published!');
    } catch {
      showToast('Failed to post answer.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleToggleAnswerHelpful = async (questionId: string, answerId: string) => {
    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to vote on an answer.');
      return;
    }
    try {
      const res = await fetch(
        `/api/storefront/questions/${encodeURIComponent(questionId)}/answers/${encodeURIComponent(
          answerId
        )}/helpful`,
        {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders,
        }
      );
      const data = await res.json();
      if (res.ok && data.question) {
        setQuestions((prev) =>
          prev.map((q) => (q.id === questionId ? (data.question as ProductQuestionRecord) : q))
        );
        showToast(data.voted ? 'Marked answer as helpful!' : 'Helpful vote removed.');
      }
    } catch {
      showToast('Could not update vote.');
    }
  };

  const handleReportAnswer = async (questionId: string, answerId: string) => {
    if (!customerAccount) {
      onRequireCustomerAuth('Please sign in to report inappropriate content.');
      return;
    }
    try {
      const res = await fetch(
        `/api/storefront/questions/${encodeURIComponent(questionId)}/answers/${encodeURIComponent(
          answerId
        )}/report`,
        {
          method: 'POST',
          credentials: 'include',
          headers: authHeaders,
        }
      );
      const data = await res.json();
      showToast(data.message || data.error || 'Answer reported.');
    } catch {
      showToast('Could not report answer.');
    }
  };

  const filteredQuestions = useMemo(() => {
    const q = qaSearchQuery.trim().toLowerCase();
    if (!q) return questions;
    return questions.filter(
      (item) =>
        item.questionText.toLowerCase().includes(q) ||
        item.answers.some((a) => a.answerText.toLowerCase().includes(q))
    );
  }, [questions, qaSearchQuery]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="h-5 w-64 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 aspect-4/3 bg-slate-200 rounded-2xl" />
          <div className="lg:col-span-7 space-y-4">
            <div className="h-8 w-3/4 bg-slate-200 rounded-lg" />
            <div className="h-5 w-1/3 bg-slate-200 rounded-md" />
            <div className="h-12 w-1/2 bg-slate-200 rounded-xl" />
            <div className="h-28 w-full bg-slate-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192F]">
            Product Not Found
          </h1>
          <p className="text-slate-600 max-w-md mx-auto text-sm">
            {errorMessage ||
              `We couldn't find a product matching "${productIdOrSlug}". It may have been removed or the URL is incorrect.`}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-bold shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Zestora Storefront</span>
          </button>
        </div>
      </div>
    );
  }

  const displayRating =
    ratingSummary.totalRatings > 0 ? ratingSummary.averageRating : product.rating;
  const displayRatingCount =
    ratingSummary.totalRatings > 0 ? ratingSummary.totalRatings : product.reviewCount;
  const zoomOriginClass = isZoomingMain
    ? getZoomOriginClass(zoomOrigin.xPercent, zoomOrigin.yPercent)
    : 'origin-center';

  return (
    <div className="bg-[#F8FAFC] pb-24 sm:pb-16">
      {/* Floating Action Toast */}
      {actionToast && (
        <div
          role="status"
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#0A192F] text-white text-xs sm:text-sm font-semibold shadow-xl border border-slate-700"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Top Breadcrumb Navigation Bar */}
      <div className="bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 overflow-x-auto">
            <button
              type="button"
              onClick={onBackToStore}
              className="hover:text-[#0066FF] font-semibold transition-colors shrink-0"
            >
              Home
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <button
              type="button"
              onClick={() => onSelectCategory(product.category)}
              className="hover:text-[#0066FF] font-semibold transition-colors shrink-0"
            >
              {product.category}
            </button>
            {product.subcategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-slate-500 shrink-0">{product.subcategory}</span>
              </>
            )}
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-bold text-[#0A192F] truncate max-w-[220px] sm:max-w-md">
              {product.name}
            </span>
          </nav>

          <button
            type="button"
            onClick={onBackToStore}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#0066FF] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Catalog</span>
          </button>
        </div>
      </div>

      {/* Main Product Section: Gallery (Left) + Complete Information & Purchase Controls (Right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 space-y-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* LEFT COLUMN: Interactive Product Image Gallery */}
          <div className="lg:col-span-5 space-y-4">
            <div
              data-testid="pdp-main-gallery-viewport"
              data-zooming={isZoomingMain ? 'true' : 'false'}
              onMouseEnter={() => setIsZoomingMain(true)}
              onMouseMove={handleMainImageMouseMove}
              onMouseLeave={() => {
                setIsZoomingMain(false);
                setZoomOrigin({ xPercent: 50, yPercent: 50 });
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={`relative aspect-4/3 w-full rounded-2xl border border-slate-200/80 overflow-hidden select-none cursor-zoom-in ${
                currentSlide?.tintClass ?? 'bg-slate-50'
              }`}
            >
              <div
                onClick={() => {
                  setLightboxCustomPhotoUrl(null);
                  setLightboxOpen(true);
                }}
                className="w-full h-full flex items-center justify-center"
              >
                {currentSlide?.type === 'image' && currentSlide.url ? (
                  <img
                    src={currentSlide.url}
                    alt={currentSlide.label}
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setBrokenUrls((prev) => ({ ...prev, [currentSlide.url!]: true }))
                    }
                    className={`w-full h-full object-cover transition-transform duration-200 ease-out ${zoomOriginClass} ${
                      isZoomingMain ? 'scale-[1.85]' : 'scale-100'
                    }`}
                  />
                ) : (
                  <div
                    className={`w-full h-full transition-transform duration-200 ease-out ${
                      currentSlide?.angleClass ?? ''
                    }`}
                  >
                    <ProductArtwork
                      artwork={product.artwork}
                      className={`w-full h-full transition-transform duration-200 ease-out ${zoomOriginClass} ${
                        isZoomingMain ? 'scale-[1.85]' : 'scale-100'
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Top-left Discount & Counter Pill */}
              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                {discountPercent > 0 && (
                  <span className="px-2.5 py-1 rounded-md bg-[#0066FF] text-white text-xs font-extrabold tracking-wide shadow-xs">
                    {discountPercent}% OFF
                  </span>
                )}
                <span
                  data-testid="pdp-gallery-counter"
                  className="px-2.5 py-1 rounded-md bg-slate-900/75 text-white text-xs font-bold tabular-nums backdrop-blur-xs"
                >
                  {safeSlideIndex + 1}/{gallerySlides.length}
                </span>
              </div>

              {/* Top-right Fullscreen & Wishlist Controls */}
              <div
                onMouseEnter={() => setIsZoomingMain(false)}
                onMouseMove={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 flex flex-col gap-2 z-10"
              >
                <button
                  type="button"
                  onClick={handleWishlistClick}
                  aria-label={
                    isWishlisted
                      ? `Remove ${product.name} from wishlist`
                      : `Add ${product.name} to wishlist`
                  }
                  className={`p-2.5 rounded-xl backdrop-blur-md transition-colors shadow-xs ${
                    isWishlisted
                      ? 'bg-rose-500 text-white'
                      : 'bg-white/90 hover:bg-white text-slate-700 hover:text-rose-500'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLightboxCustomPhotoUrl(null);
                    setLightboxOpen(true);
                  }}
                  aria-label="Open full-screen image viewer"
                  className="p-2.5 rounded-xl bg-white/90 hover:bg-white text-slate-700 hover:text-[#0066FF] backdrop-blur-md transition-colors shadow-xs"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {onOpen3DStudio && (
                  <button
                    type="button"
                    data-testid="pdp-open-3d-studio"
                    onClick={() => onOpen3DStudio(product.id)}
                    aria-label="Inspect product in 3D Studio"
                    title="Inspect in 3D Studio"
                    className="p-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white transition-colors shadow-md"
                  >
                    <Box className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Left / Right Gallery Arrows */}
              {gallerySlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onMouseEnter={() => setIsZoomingMain(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevSlide();
                    }}
                    aria-label="Previous product image"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onMouseEnter={() => setIsZoomingMain(false)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextSlide();
                    }}
                    aria-label="Next product image"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}

              {/* Bottom caption & zoom hint */}
              <div className="pointer-events-none absolute bottom-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                <span className="px-2.5 py-1 rounded-md bg-slate-900/75 text-white text-[11px] font-medium truncate backdrop-blur-xs">
                  {currentSlide?.label}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900/75 text-blue-200 text-[11px] font-medium backdrop-blur-xs shrink-0">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Hover to Zoom · Click for Fullscreen</span>
                </span>
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {gallerySlides.map((slide, idx) => {
                const isSelected = idx === safeSlideIndex;
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => setActiveSlideIndex(idx)}
                    aria-label={`View gallery image ${idx + 1}: ${slide.label}`}
                    className={`relative aspect-4/3 rounded-xl overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-[#0066FF] ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100'
                    } ${slide.tintClass ?? 'bg-slate-50'}`}
                  >
                    {slide.type === 'image' && slide.url ? (
                      <img
                        src={slide.url}
                        alt={slide.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full ${slide.angleClass ?? ''}`}>
                        <ProductArtwork artwork={product.artwork} className="w-full h-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Complete Product Information & Purchase Controls */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Brand, SKU & Availability Row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-blue-50 text-[#0066FF] text-xs font-extrabold uppercase tracking-wider">
                    {product.brand || 'Zestora Originals'}
                  </span>
                  {product.sku && (
                    <span className="text-xs font-mono text-slate-400">
                      SKU: {product.sku}
                    </span>
                  )}
                </div>

                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Out of Stock</span>
                  </span>
                ) : effectiveStock <= 5 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold">
                    <span>Hurry! Only {effectiveStock} unit(s) left in stock</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>In Stock ({effectiveStock} available)</span>
                  </span>
                )}
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0A192F] leading-tight">
                {product.name}
              </h1>

              {/* Rating Summary Row */}
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() =>
                    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-bold transition-colors"
                >
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span className="tabular-nums">{displayRating.toFixed(1)}</span>
                  <span className="text-xs text-amber-700 font-medium">out of 5</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    reviewsSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="text-slate-600 hover:text-[#0066FF] font-semibold text-xs sm:text-sm underline-offset-4 hover:underline"
                >
                  {displayRatingCount.toLocaleString('en-IN')} Ratings &{' '}
                  {ratingSummary.totalWrittenReviews} Written Reviews
                </button>

                {ratingSummary.verifiedPurchaseCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{ratingSummary.verifiedPurchaseCount} Verified Buyer Reviews</span>
                  </span>
                )}
              </div>

              {/* Price & Savings Block */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span
                    data-testid="pdp-selling-price"
                    className="text-3xl font-extrabold text-[#0A192F] tabular-nums"
                  >
                    {formatINR(effectivePrice)}
                  </span>
                  {product.originalPrice && product.originalPrice > effectivePrice && (
                    <>
                      <span className="text-sm text-slate-400 line-through tabular-nums">
                        MRP {formatINR(product.originalPrice)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-extrabold">
                        Save {formatINR(totalSavingsPerUnit)} ({discountPercent}% OFF)
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Inclusive of all taxes · Instant UPI, Cards, NetBanking & Cash on Delivery available
                </p>
              </div>

              {/* Variant Selector (Backend Variants or Color/Edition Swatches) */}
              {product.variants && product.variants.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Variant / Configuration
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((v) => {
                      const label = [v.color, v.size, v.model].filter(Boolean).join(' · ') || v.skuSuffix;
                      const active = v.id === activeVariant?.id;
                      const variantOut = v.stock <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          data-testid={`pdp-variant-${v.skuSuffix || v.id}`}
                          onClick={() => {
                            setSelectedVariantId(v.id);
                            setNotifyFeedback(null);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all inline-flex items-center gap-1.5 ${
                            active
                              ? variantOut
                                ? 'border-rose-500 bg-rose-50/80 text-rose-700'
                                : 'border-[#0066FF] bg-blue-50/70 text-[#0066FF]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <span>{label}</span>
                          {variantOut && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase">
                              Out of Stock
                            </span>
                          )}
                          {v.priceOverride && (
                            <span className="ml-1 text-slate-500">
                              ({formatINR(v.priceOverride)})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Color Finish: <strong className="text-slate-800">{selectedColor}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['Obsidian Black', 'Cobalt Blue', 'Arctic Silver'].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedColor === color
                              ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                      Edition / Size: <strong className="text-slate-800">{selectedSize}</strong>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {['Standard', 'Pro Bundle'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                            selectedSize === sz
                              ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity & Primary Purchase Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="w-8 h-8 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    -
                  </button>
                  <span
                    data-testid="pdp-quantity-value"
                    className="w-10 text-center text-sm font-bold text-[#0A192F] tabular-nums"
                  >
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={isOutOfStock || quantity >= effectiveStock}
                    onClick={() => setQuantity((q) => Math.min(effectiveStock, q + 1))}
                    aria-label="Increase quantity"
                    className="w-8 h-8 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-bold"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleAddToCartClick}
                  className={`flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${
                    isOutOfStock
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : justAddedToCart
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0A192F] hover:bg-slate-800 text-white shadow-xs'
                  }`}
                >
                  {justAddedToCart ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Cart</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isOutOfStock}
                  onClick={handleBuyNowClick}
                  className={`flex-1 min-w-[150px] inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold transition-all ${
                    isOutOfStock
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-md shadow-blue-600/20'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy Now</span>
                </button>

                <button
                  type="button"
                  onClick={handleWishlistClick}
                  className={`inline-flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-xl border text-sm font-bold transition-colors ${
                    isWishlisted
                      ? 'border-rose-200 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Heart className="w-4 h-4" fill={isWishlisted ? 'currentColor' : 'none'} />
                  <span className="hidden sm:inline">
                    {isWishlisted ? 'Wishlisted' : 'Wishlist'}
                  </span>
                </button>
              </div>

              {/* Out-of-Stock 'Notify Me' Back-in-Stock Email Alert Card */}
              {isOutOfStock && (
                <div
                  data-testid="pdp-notify-me-card"
                  className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-200 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                        <BellRing className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-[#0A192F]">
                          Notify Me When Back in Stock
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          This configuration is currently out of stock. Enter your email below and we&apos;ll send you an instant alert as soon as it returns.
                        </p>
                      </div>
                    </div>
                    {stockAlertsCount > 0 && (
                      <span
                        data-testid="pdp-notify-waiting-count"
                        className="px-2.5 py-1 rounded-full bg-white border border-amber-200 text-[11px] font-bold text-amber-800 shrink-0 tabular-nums"
                      >
                        {stockAlertsCount} waiting
                      </span>
                    )}
                  </div>

                  <form
                    onSubmit={handleSubmitStockAlert}
                    noValidate
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                  >
                    <label htmlFor="pdp-notify-email-input" className="sr-only">
                      Email address for back-in-stock notification
                    </label>
                    <input
                      ref={notifyInputRef}
                      id="pdp-notify-email-input"
                      data-testid="pdp-notify-email-input"
                      type="email"
                      value={notifyEmail}
                      onChange={(e) => setNotifyEmail(e.target.value)}
                      placeholder="Enter your email address (e.g., name@example.com)"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-sm text-[#0A192F] placeholder:text-slate-400 focus:outline-2 focus:outline-[#0066FF]"
                    />
                    <button
                      type="submit"
                      data-testid="pdp-notify-submit-btn"
                      disabled={notifySubmitting}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white text-xs sm:text-sm font-extrabold shadow-xs transition-colors shrink-0"
                    >
                      <BellRing className="w-4 h-4" />
                      <span>{notifySubmitting ? 'Saving Alert...' : 'Notify Me'}</span>
                    </button>
                  </form>

                  {notifyFeedback && (
                    <div
                      data-testid={
                        notifyFeedback.type === 'success'
                          ? 'pdp-notify-success'
                          : 'pdp-notify-error'
                      }
                      role={notifyFeedback.type === 'error' ? 'alert' : 'status'}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold ${
                        notifyFeedback.type === 'success'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border border-rose-200 text-rose-700'
                      }`}
                    >
                      {notifyFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{notifyFeedback.text}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Delivery Location Estimator & Service Guarantees */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0A192F]">
                    <MapPin className="w-4 h-4 text-[#0066FF]" />
                    <span>Check Delivery & COD Eligibility by PIN Code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pinCodeInput}
                      onChange={(e) => setPinCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="Enter 6-digit PIN"
                      aria-label="Enter 6-digit delivery PIN code"
                      className="w-28 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-[#0A192F] focus:outline-2 focus:outline-[#0066FF]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryEstimate(estimateDeliveryByPinCode(pinCodeInput))
                      }
                      className="px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold transition-colors"
                    >
                      Check
                    </button>
                  </div>
                </div>

                {deliveryEstimate.valid ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                      <Truck className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#0A192F]">
                          Get it by {deliveryEstimate.estimatedDateFormatted}
                        </p>
                        <p className="text-[11px] text-slate-500">{deliveryEstimate.zoneLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                      <RotateCcw className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#0A192F]">7-Day Replacement</p>
                        <p className="text-[11px] text-slate-500">Easy self-service returns</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-white border border-slate-200/60">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[#0A192F]">
                          {product.warranty || '1 Year Zestora Warranty'}
                        </p>
                        <p className="text-[11px] text-slate-500">Sold by Zestora Retail</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-rose-600 font-medium">{deliveryEstimate.error}</p>
                )}
              </div>

              {/* Product Description, Highlights & Technical Specifications */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2.5">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A192F]">
                    Key Highlights & Features
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {product.description || product.shortDescription}
                  </p>
                  <ul className="space-y-1.5 pt-1">
                    {product.highlights.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2 text-xs font-medium text-slate-700"
                      >
                        <Check className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#0A192F]">
                    Specifications & Details
                  </h2>
                  <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                    <table className="w-full">
                      <tbody className="divide-y divide-slate-200">
                        <tr className="bg-slate-50/70">
                          <th className="py-2 px-3 text-left font-semibold text-slate-500 w-2/5">
                            Brand
                          </th>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {product.brand || 'Zestora Originals'}
                          </td>
                        </tr>
                        <tr>
                          <th className="py-2 px-3 text-left font-semibold text-slate-500">
                            Category
                          </th>
                          <td className="py-2 px-3 font-semibold text-slate-800">
                            {product.category}
                          </td>
                        </tr>
                        {product.weight && (
                          <tr className="bg-slate-50/70">
                            <th className="py-2 px-3 text-left font-semibold text-slate-500">
                              Item Weight
                            </th>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {product.weight}
                            </td>
                          </tr>
                        )}
                        {product.dimensions && (
                          <tr>
                            <th className="py-2 px-3 text-left font-semibold text-slate-500">
                              Dimensions
                            </th>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {product.dimensions}
                            </td>
                          </tr>
                        )}
                        {product.specifications?.map((spec, idx) => (
                          <tr
                            key={spec.key}
                            className={idx % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'}
                          >
                            <th className="py-2 px-3 text-left font-semibold text-slate-500">
                              {spec.key}
                            </th>
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {spec.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================================
            FREQUENTLY BOUGHT TOGETHER SECTION (WHEN DATA SUPPORTS IT)
        ==================================================================== */}
        {frequentlyBoughtTogether.length > 0 && (
          <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF]">
                  Verified Order Co-Purchases
                </span>
                <h2 className="text-xl font-extrabold text-[#0A192F]">
                  Frequently Bought Together
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  onAddToCart(product, 1, formattedVariantSummary);
                  for (const item of frequentlyBoughtTogether) {
                    onAddToCart(item, 1);
                  }
                  showToast('Added bundle items to your cart!');
                }}
                className="px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-bold shadow-xs transition-colors"
              >
                Add All {1 + frequentlyBoughtTogether.length} Items to Cart (
                {formatINR(
                  effectivePrice +
                    frequentlyBoughtTogether.reduce((s, p) => s + p.price, 0)
                )}
                )
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {frequentlyBoughtTogether.map((coProd) => (
                <ProductCard
                  key={coProd.id}
                  product={coProd}
                  onAddToCart={(p) => onAddToCart(p, 1)}
                  onBuyNow={(p) => onBuyNow(p, 1)}
                  onQuickView={(p) => onSelectProduct(p)}
                  isWishlisted={wishlistIds.includes(coProd.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>
        )}

        {/* ====================================================================
            CUSTOMER RATINGS, PHOTO GALLERY & WRITTEN REVIEWS SECTION
        ==================================================================== */}
        <section
          ref={reviewsSectionRef}
          id="customer-reviews"
          className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF]">
                Verified Feedback & Photo Reviews
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F]">
                Customer Ratings & Reviews
              </h2>
            </div>

            {customerOwnReview ? (
              <button
                type="button"
                onClick={() => handleStartEditReview(customerOwnReview)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Your Review</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!customerAccount) {
                    onRequireCustomerAuth('Please sign in to write a customer review.');
                    return;
                  }
                  setEditingReviewId(null);
                  setReviewFormOpen((prev) => !prev);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
              >
                <Star className="w-4 h-4" />
                <span>Write a Customer Review</span>
              </button>
            )}
          </div>

          {/* Rating Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Overall Score */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
              <div
                data-testid="pdp-aggregate-rating"
                className="text-4xl sm:text-5xl font-extrabold text-[#0A192F] tabular-nums"
              >
                {ratingSummary.totalRatings > 0
                  ? ratingSummary.averageRating.toFixed(1)
                  : 'No Ratings'}
              </div>
              <div className="flex items-center justify-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-5 h-5 ${
                      s <= Math.round(ratingSummary.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-slate-600">
                Based on {ratingSummary.totalRatings} stored customer rating(s) and{' '}
                {ratingSummary.totalWrittenReviews} written review(s)
              </p>
              {isVerifiedBuyer && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>You are a Verified Buyer of this product</span>
                </span>
              )}
            </div>

            {/* Right: 5-Star to 1-Star Distribution Bars */}
            <div className="lg:col-span-8 space-y-2.5">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = ratingSummary.distribution[star];
                const pct = ratingSummary.distributionPercent[star];
                const isSelected = starFilter === star;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() =>
                      setStarFilter((prev) => (prev === star ? 'all' : star))
                    }
                    className={`w-full flex items-center gap-3 p-1.5 rounded-xl text-xs transition-colors ${
                      isSelected ? 'bg-blue-50/80 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-14 text-left font-bold text-slate-700 shrink-0">
                      {star} Star
                    </span>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-slate-600 tabular-nums shrink-0">
                      {pct}% ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Customer Review Photos Gallery Strip */}
          {allCustomerReviewPhotos.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-sm font-extrabold text-[#0A192F] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#0066FF]" />
                <span>Customer Photos ({allCustomerReviewPhotos.length})</span>
              </h3>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {allCustomerReviewPhotos.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => {
                      setLightboxCustomPhotoUrl(photo.url);
                      setLightboxOpen(true);
                    }}
                    className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:border-[#0066FF] shrink-0 group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Review Feedback Banner */}
          {reviewFeedback && (
            <div
              role="status"
              className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
                reviewFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              <span>{reviewFeedback.text}</span>
              <button
                type="button"
                onClick={() => setReviewFeedback(null)}
                className="text-xs underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Review Submission / Edit Form */}
          {reviewFormOpen && (
            <form
              onSubmit={handleSubmitReview}
              className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-[#0A192F]">
                  {editingReviewId ? 'Update Your Rating & Review' : 'Submit Your Rating & Review'}
                </h3>
                <button
                  type="button"
                  onClick={() => setReviewFormOpen(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>

              {/* Star Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Overall Star Rating *
                </label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || reviewRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        aria-label={`Rate ${star} out of 5 stars`}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setReviewRating(star)}
                        className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            active ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-2 text-xs font-bold text-slate-700">
                    {reviewRating} out of 5 stars
                  </span>
                </div>
              </div>

              {/* Review Headline */}
              <div className="space-y-1.5">
                <label
                  htmlFor="pdp-review-title"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Review Title *
                </label>
                <input
                  id="pdp-review-title"
                  type="text"
                  required
                  minLength={3}
                  maxLength={120}
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Summarize your experience (e.g., Impressive build quality and battery)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0A192F] focus:outline-2 focus:outline-[#0066FF]"
                />
              </div>

              {/* Written Review */}
              <div className="space-y-1.5">
                <label
                  htmlFor="pdp-review-comment"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                >
                  Written Review *
                </label>
                <textarea
                  id="pdp-review-comment"
                  required
                  minLength={10}
                  maxLength={2500}
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="What did you like or dislike? How is the quality, fit, or performance?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-[#0A192F] focus:outline-2 focus:outline-[#0066FF]"
                />
              </div>

              {/* Photo Upload Input & Preview */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Add Product Photos (Optional · JPEG, PNG, WebP up to 5MB, max 5)
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-slate-300 bg-white hover:border-[#0066FF] text-xs font-bold text-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-4 h-4 text-[#0066FF]" />
                    <span>{uploadingPhoto ? `Uploading (${uploadProgress}%)...` : 'Upload Photos'}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadingPhoto || reviewPhotos.length >= 5}
                      onChange={handleUploadReviewFiles}
                      className="hidden"
                    />
                  </label>

                  {reviewPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white"
                    >
                      <img src={photo.url} alt="Review preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove uploaded review photo"
                        onClick={() =>
                          setReviewPhotos((prev) => prev.filter((p) => p.id !== photo.id))
                        }
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/80 text-white hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={submittingReview || uploadingPhoto}
                  className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052CC] disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors"
                >
                  {submittingReview
                    ? 'Saving Review...'
                    : editingReviewId
                    ? 'Update Review'
                    : 'Submit Review'}
                </button>
              </div>
            </form>
          )}

          {/* Review Filter & Sort Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 5, 4, 3, 2, 1] as const).map((st) => (
                <button
                  key={String(st)}
                  type="button"
                  onClick={() => setStarFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    starFilter === st
                      ? 'bg-[#0A192F] text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {st === 'all' ? 'All Reviews' : `${st} ★`}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setWithPhotosOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  withPhotosOnly
                    ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                With Photos
              </button>

              <button
                type="button"
                onClick={() => setVerifiedOnly((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  verifiedOnly
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                Verified Purchases Only
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="pdp-review-sort" className="font-bold text-slate-500">
                Sort by:
              </label>
              <select
                id="pdp-review-sort"
                value={reviewSortBy}
                onChange={(e) => setReviewSortBy(e.target.value as ReviewSortOption)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-[#0A192F]"
              >
                <option value="helpful">Most Helpful</option>
                <option value="recent">Most Recent</option>
                <option value="rating-high">Highest Rated</option>
                <option value="rating-low">Lowest Rated</option>
              </select>
            </div>
          </div>

          {/* Reviews List or Empty State */}
          {reviews.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
              <p className="text-sm font-bold text-[#0A192F]">
                No customer reviews match the selected filter.
              </p>
              <p className="text-xs text-slate-500">
                Try clearing the active filter or be the first customer to share your review!
              </p>
              {(starFilter !== 'all' || withPhotosOnly || verifiedOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setStarFilter('all');
                    setWithPhotosOnly(false);
                    setVerifiedOnly(false);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0066FF] text-white text-xs font-bold"
                >
                  Reset Review Filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.slice(0, visibleReviewLimit).map((rev) => {
                const isOwner = customerAccount?.id === rev.customerId;
                const hasVotedHelpful = customerAccount
                  ? (rev.helpfulVoterIds ?? []).includes(customerAccount.id)
                  : false;

                return (
                  <article
                    key={rev.id}
                    className="p-5 rounded-2xl border border-slate-200/90 bg-white space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-[#0066FF] font-extrabold text-xs flex items-center justify-center">
                          {rev.customerName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-[#0A192F]">
                              {rev.customerName}
                            </span>
                            {rev.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                                <ShieldCheck className="w-3 h-3" />
                                <span>Verified Purchase</span>
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Reviewed on{' '}
                            {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                            {rev.selectedVariant ? ` · Variant: ${rev.selectedVariant}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{rev.rating}.0</span>
                      </div>
                    </div>

                    <h4 className="text-sm sm:text-base font-extrabold text-[#0A192F]">
                      {rev.title}
                    </h4>

                    {rev.comment && (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        {rev.comment}
                      </p>
                    )}

                    {/* Attached Review Photos */}
                    {Array.isArray(rev.photos) && rev.photos.length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {rev.photos.map((photo) => (
                          <button
                            key={photo.id}
                            type="button"
                            onClick={() => {
                              setLightboxCustomPhotoUrl(photo.url);
                              setLightboxOpen(true);
                            }}
                            className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-[#0066FF]"
                          >
                            <img
                              src={photo.url}
                              alt={rev.title}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Helpful Vote, Report & Owner Actions */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleReviewHelpful(rev)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
                            hasVotedHelpful
                              ? 'bg-blue-50 text-[#0066FF] border border-blue-200'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Helpful ({rev.helpfulCount})</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setReportingReviewId((prev) => (prev === rev.id ? null : rev.id))
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-semibold transition-colors"
                        >
                          <Flag className="w-3.5 h-3.5" />
                          <span>Report</span>
                        </button>
                      </div>

                      {isOwner && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleStartEditReview(rev)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(rev.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline Report Form */}
                    {reportingReviewId === rev.id && (
                      <form
                        onSubmit={handleSubmitReportReview}
                        className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200/80 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-900">
                            Report Review to Zestora Moderation
                          </span>
                          <button
                            type="button"
                            onClick={() => setReportingReviewId(null)}
                            className="text-xs text-slate-500"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(['Spam', 'Abuse', 'Misleading', 'Inappropriate'] as const).map(
                            (reason) => (
                              <button
                                key={reason}
                                type="button"
                                onClick={() => setReportReason(reason)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                                  reportReason === reason
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-white text-slate-700 border border-slate-200'
                                }`}
                              >
                                {reason}
                              </button>
                            )
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={reportComment}
                            onChange={(e) => setReportComment(e.target.value)}
                            placeholder="Optional note for moderators..."
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                          />
                          <button
                            type="submit"
                            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                          >
                            Submit Report
                          </button>
                        </div>
                      </form>
                    )}
                  </article>
                );
              })}

              {reviews.length > visibleReviewLimit && (
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleReviewLimit((n) => n + 5)}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#0A192F]"
                  >
                    Load More Reviews ({reviews.length - visibleReviewLimit} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ====================================================================
            PRODUCT QUESTIONS & ANSWERS (Q&A) SECTION
        ==================================================================== */}
        <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF]">
                Community & Seller Support
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F] flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#0066FF]" />
                <span>Product Questions & Answers ({questions.length})</span>
              </h2>
            </div>

            <input
              type="search"
              value={qaSearchQuery}
              onChange={(e) => setQaSearchQuery(e.target.value)}
              placeholder="Search questions & answers..."
              aria-label="Search product questions and answers"
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#0A192F]"
            />
          </div>

          {/* Ask a Question Form */}
          <form onSubmit={handleAskQuestion} className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              placeholder="Have a question about specifications, compatibility, or warranty? Ask here..."
              aria-label="Ask a question about this product"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-[#0A192F]"
            />
            <button
              type="submit"
              disabled={askingQuestion}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A192F] hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shrink-0"
            >
              <MessageSquarePlus className="w-4 h-4" />
              <span>{askingQuestion ? 'Posting...' : 'Post Question'}</span>
            </button>
          </form>

          {qaFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold ${
                qaFeedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {qaFeedback.text}
            </div>
          )}

          {/* Q&A List */}
          {filteredQuestions.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No matching questions yet. Ask a question above to get answers from verified buyers and Zestora specialists.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-extrabold text-[#0A192F]">
                        Q: {q.questionText}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Asked by {q.customerName} on{' '}
                        {new Date(q.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setActiveAnswerQuestionId((prev) => (prev === q.id ? null : q.id))
                      }
                      className="text-xs font-bold text-[#0066FF] hover:underline"
                    >
                      Answer this question
                    </button>
                  </div>

                  {/* Answers */}
                  {q.answers.length > 0 && (
                    <div className="space-y-2.5 pl-3 border-l-2 border-blue-200">
                      {q.answers.map((ans) => (
                        <div
                          key={ans.id}
                          className="p-3.5 rounded-xl bg-white border border-slate-200/70 space-y-2"
                        >
                          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                            <strong className="text-[#0A192F]">A:</strong> {ans.answerText}
                          </p>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-700">{ans.authorName}</span>
                              {ans.authorRole === 'Verified Seller' && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#0066FF] font-extrabold">
                                  Verified Seller
                                </span>
                              )}
                              {ans.authorRole === 'Verified Buyer' && (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-extrabold">
                                  Verified Buyer
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleAnswerHelpful(q.id, ans.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>Helpful ({ans.helpfulCount})</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReportAnswer(q.id, ans.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                Report
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Answer Submission Form */}
                  {activeAnswerQuestionId === q.id && (
                    <form
                      onSubmit={(e) => handlePostAnswer(e, q.id)}
                      className="pt-2 flex flex-col sm:flex-row gap-2"
                    >
                      <input
                        type="text"
                        required
                        minLength={4}
                        value={answerInputText}
                        onChange={(e) => setAnswerInputText(e.target.value)}
                        placeholder="Write your helpful answer..."
                        className="flex-1 px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs"
                      />
                      <button
                        type="submit"
                        disabled={submittingAnswer}
                        className="px-4 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold"
                      >
                        {submittingAnswer ? 'Submitting...' : 'Submit Answer'}
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ====================================================================
            SIMILAR / RELATED PRODUCTS IN SAME CATEGORY
        ==================================================================== */}
        {relatedProducts.length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#0066FF]">
                  More in {product.category}
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#0A192F]">
                  Similar Products You May Like
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  onAddToCart={(p) => onAddToCart(p, 1)}
                  onBuyNow={(p) => onBuyNow(p, 1)}
                  onQuickView={(p) => onSelectProduct(p)}
                  isWishlisted={wishlistIds.includes(rel.id)}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>
        )}

        {/* ====================================================================
            RECENTLY VIEWED PRODUCTS
        ==================================================================== */}
        {recentlyViewedProducts.filter((p) => p.id !== product.id).length > 0 && (
          <section className="space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0066FF]" />
              <h2 className="text-xl font-extrabold text-[#0A192F]">
                Recently Viewed Products
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyViewedProducts
                .filter((p) => p.id !== product.id)
                .slice(0, 4)
                .map((rv) => (
                  <ProductCard
                    key={rv.id}
                    product={rv}
                    onAddToCart={(p) => onAddToCart(p, 1)}
                    onBuyNow={(p) => onBuyNow(p, 1)}
                    onQuickView={(p) => onSelectProduct(p)}
                    isWishlisted={wishlistIds.includes(rv.id)}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Mobile Purchase Bar */}
      <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div>
          <p className="text-xs text-slate-500 font-medium">Total Price</p>
          <p className="text-lg font-extrabold text-[#0A192F] tabular-nums">
            {formatINR(effectivePrice * quantity)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleAddToCartClick}
            className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-40"
          >
            Add to Cart
          </button>
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={handleBuyNowClick}
            className="px-4 py-2.5 rounded-xl bg-[#0066FF] text-white text-xs font-bold disabled:opacity-40"
          >
            Buy Now
          </button>
        </div>
      </div>

      {/* Full-Screen Image Lightbox Viewer */}
      {lightboxOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Full-screen product image viewer"
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-8"
        >
          <div className="flex items-center justify-between text-white">
            <span className="text-xs sm:text-sm font-bold">
              {lightboxCustomPhotoUrl
                ? `${product.name} — Customer Review Photo`
                : `${currentSlide?.label} (${safeSlideIndex + 1}/${gallerySlides.length})`}
            </span>
            <button
              type="button"
              onClick={() => {
                setLightboxOpen(false);
                setLightboxCustomPhotoUrl(null);
              }}
              aria-label="Close full-screen viewer"
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden">
            {lightboxCustomPhotoUrl ? (
              <img
                src={lightboxCustomPhotoUrl}
                alt="Customer review full view"
                className="max-h-[75vh] max-w-full rounded-2xl object-contain"
              />
            ) : currentSlide?.type === 'image' && currentSlide.url ? (
              <img
                src={currentSlide.url}
                alt={currentSlide.label}
                className="max-h-[75vh] max-w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="w-full max-w-xl aspect-4/3 rounded-3xl overflow-hidden bg-slate-50">
                <ProductArtwork artwork={product.artwork} className="w-full h-full" />
              </div>
            )}

            {!lightboxCustomPhotoUrl && gallerySlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  aria-label="Previous image in fullscreen"
                  className="absolute left-4 p-3 rounded-full bg-white/15 hover:bg-white/25 text-white"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={handleNextSlide}
                  aria-label="Next image in fullscreen"
                  className="absolute right-4 p-3 rounded-full bg-white/15 hover:bg-white/25 text-white"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {!lightboxCustomPhotoUrl && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
              {gallerySlides.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSlideIndex(idx)}
                  className={`w-16 h-12 rounded-lg overflow-hidden border-2 ${
                    idx === safeSlideIndex ? 'border-[#0066FF]' : 'border-transparent opacity-60'
                  } bg-slate-100`}
                >
                  {s.type === 'image' && s.url ? (
                    <img src={s.url} alt={s.label} className="w-full h-full object-cover" />
                  ) : (
                    <ProductArtwork artwork={product.artwork} className="w-full h-full" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
