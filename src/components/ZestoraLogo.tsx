import React from 'react';

export interface ZestoraLogoProps {
  /**
   * 'light' = dark navy wordmark for light backgrounds (Header, Modals)
   * 'dark'  = crisp white wordmark for dark navy backgrounds (Footer, Dark Banners)
   */
  variant?: 'light' | 'dark';
  /**
   * Controls overall scale of the symbol and wordmark
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Whether to render the "Shop More · Live Better" brand subtitle
   */
  showTagline?: boolean;
  /**
   * Renders only the standalone Zestora app icon symbol when true
   */
  iconOnly?: boolean;
  className?: string;
}

/**
 * Standalone Zestora geometric ribbon 'Z' symbol that also serves as an app icon.
 * Designed to remain crisp on both light and dark surfaces.
 */
export function ZestoraAppIcon({
  className = 'w-10 h-10',
  withAppTile = false,
}: {
  className?: string;
  withAppTile?: boolean;
}) {
  const uid = React.useId().replace(/:/g, '');
  const topRibbonGrad = `zestTopRibbon_${uid}`;
  const diagRibbonGrad = `zestDiagRibbon_${uid}`;
  const bottomRibbonGrad = `zestBottomRibbon_${uid}`;
  const tileGrad = `zestTileBg_${uid}`;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={tileGrad} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0A192F" />
          <stop offset="100%" stopColor="#0F2952" />
        </linearGradient>
        <linearGradient id={topRibbonGrad} x1="12" y1="12" x2="52" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0066FF" />
        </linearGradient>
        <linearGradient id={diagRibbonGrad} x1="48" y1="12" x2="16" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0052CC" />
          <stop offset="50%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#00D2FF" />
        </linearGradient>
        <linearGradient id={bottomRibbonGrad} x1="14" y1="44" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      {withAppTile && (
        <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#${tileGrad})`} />
      )}

      {/* Top Horizontal Geometric Wing of 'Z' */}
      <path
        d="M15 12H49L41.5 23H11L15 12Z"
        fill={`url(#${topRibbonGrad})`}
      />

      {/* Bottom Horizontal Geometric Wing of 'Z' */}
      <path
        d="M22.5 41H53L49 52H15L22.5 41Z"
        fill={`url(#${bottomRibbonGrad})`}
      />

      {/* Central Forward-Slanted Speed Ribbon of 'Z' */}
      <path
        d="M37.5 12H51L26.5 52H13L37.5 12Z"
        fill={`url(#${diagRibbonGrad})`}
      />

      {/* Subtle Fold Depth Shadow */}
      <path
        d="M37.5 12L31.5 23H41.5L49 12H37.5Z"
        fill="#002B80"
        fillOpacity="0.28"
      />
      <path
        d="M22.5 41L15 52H26.5L32.5 41H22.5Z"
        fill="#002B80"
        fillOpacity="0.22"
      />
    </svg>
  );
}

/**
 * Official Reusable Zestora Brand Logo Component (Symbol + "Zestora" Wordmark + Tagline)
 */
export function ZestoraLogo({
  variant = 'light',
  size = 'md',
  showTagline = true,
  iconOnly = false,
  className = '',
}: ZestoraLogoProps) {
  const iconDimensions =
    size === 'sm'
      ? 'w-8 h-8'
      : size === 'lg'
      ? 'w-11 h-11 sm:w-12 sm:h-12'
      : 'w-9 h-9 sm:w-10 sm:h-10';

  const wordmarkSize =
    size === 'sm'
      ? 'text-lg sm:text-xl'
      : size === 'lg'
      ? 'text-2xl sm:text-3xl'
      : 'text-xl sm:text-2xl';

  const wordmarkColor =
    variant === 'dark' ? 'text-white' : 'text-[#0A192F]';

  const taglineColor =
    variant === 'dark' ? 'text-slate-300' : 'text-slate-500';

  const dotColor =
    variant === 'dark' ? 'text-sky-400' : 'text-[#0066FF]';

  if (iconOnly) {
    return <ZestoraAppIcon className={`${iconDimensions} ${className}`} />;
  }

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <ZestoraAppIcon className={`${iconDimensions} shrink-0`} />
      <div className="flex flex-col justify-center">
        <span
          className={`${wordmarkSize} font-extrabold tracking-tight leading-none ${wordmarkColor}`}
        >
          Zestora
        </span>
        {showTagline && (
          <span
            className={`text-[10px] sm:text-[11px] font-semibold tracking-wider mt-0.5 whitespace-nowrap ${taglineColor}`}
          >
            Shop More <span className={dotColor}>·</span> Live Better
          </span>
        )}
      </div>
    </div>
  );
}
