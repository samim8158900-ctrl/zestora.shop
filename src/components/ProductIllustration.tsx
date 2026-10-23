import type { CategoryId, ProductArtworkKey } from '../types/store.ts';
import { ZestoraAppIcon, ZestoraLogo } from './ZestoraLogo.tsx';

export { ZestoraAppIcon, ZestoraLogo };

/**
 * Backwards-compatible wrapper for ZestoraBrandLogo using the official Phase 2 ZestoraAppIcon
 */
export function ZestoraBrandLogo({ className = 'w-10 h-10' }: { className?: string }) {
  return <ZestoraAppIcon className={className} />;
}

/**
 * Studio Hero Podium Composition with slide-specific visual arrangements:
 * - Slide 0: Flagship Multi-Category Podium (Laptop, ANC Headphones, Smartphone, Smartwatch, Sneaker, Plant)
 * - Slide 1: Smart Audio & Computing Podium (Ultrabook Pro, ANC Headphones, Smartwatch, Branded Zestora Bag)
 * - Slide 2: Elevated Home & Lifestyle Podium (Espresso Maker, HEPA Air Purifier, Botanical Serum, Sneaker, Plant)
 */
export function HeroStudioComposition({ slideIndex = 0 }: { slideIndex?: number }) {
  return (
    <div className="relative w-full max-w-[600px] mx-auto select-none">
      <svg
        viewBox="0 0 680 430"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto drop-shadow-xl"
        role="img"
        aria-label="Zestora promotional product showcase on a studio podium"
      >
        <defs>
          <radialGradient id="heroGlowP2" cx="50%" cy="44%" r="52%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
            <stop offset="58%" stopColor="#E0F2FE" stopOpacity="0.68" />
            <stop offset="100%" stopColor="#BAE6FD" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="podiumTopP2" x1="100" y1="320" x2="580" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </linearGradient>
          <linearGradient id="podiumSideP2" x1="80" y1="350" x2="600" y2="395" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#CBD5E1" />
            <stop offset="50%" stopColor="#F8FAFC" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
          <linearGradient id="screenWaveP2" x1="210" y1="90" x2="450" y2="290" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0052CC" />
            <stop offset="45%" stopColor="#0066FF" />
            <stop offset="80%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0A192F" />
          </linearGradient>
          <linearGradient id="phoneBackP2" x1="455" y1="120" x2="535" y2="320" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="55%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0A192F" />
          </linearGradient>
          <linearGradient id="zestBagGrad" x1="0" y1="0" x2="120" y2="160" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0066FF" />
            <stop offset="100%" stopColor="#003594" />
          </linearGradient>
        </defs>

        {/* Soft Studio Halo & Architectural Backdrop */}
        <ellipse cx="350" cy="210" rx="292" ry="176" fill="url(#heroGlowP2)" />
        <circle cx="350" cy="205" r="195" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.5" />

        {/* 3D White Circular Studio Podium */}
        <ellipse cx="350" cy="380" rx="276" ry="34" fill="#0A192F" fillOpacity="0.13" />
        <path
          d="M85 344C85 362 203 376 350 376C497 376 615 362 615 344V368C615 386 497 400 350 400C203 400 85 386 85 368V344Z"
          fill="url(#podiumSideP2)"
        />
        <ellipse cx="350" cy="344" rx="265" ry="32" fill="url(#podiumTopP2)" stroke="#E2E8F0" strokeWidth="1.5" />

        {/* Indoor Plant on Right (Present across slides for fresh studio warmth) */}
        <g transform="translate(525, 95)">
          <path d="M45 125C25 85 5 55 15 15C35 45 50 80 48 125Z" fill="#16A34A" />
          <path d="M52 125C50 75 68 30 92 5C88 55 72 95 52 125Z" fill="#22C55E" />
          <path d="M48 128C45 80 35 35 48 0C62 35 58 80 48 128Z" fill="#15803D" />
          <path d="M56 128C75 95 105 70 122 45C105 85 82 112 56 128Z" fill="#4ADE80" />
          <path d="M42 128C20 102 -2 85 -12 58C12 72 30 98 42 128Z" fill="#22C55E" />
          <path
            d="M18 122H84L74 228C73 234 68 238 62 238H40C34 238 29 234 28 228L18 122Z"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="2"
          />
          <ellipse cx="51" cy="122" rx="33" ry="6" fill="#E2E8F0" />
        </g>

        {/* Zestora Branded Shopping Bag on Left Podium */}
        <g transform="translate(52, 126)">
          <path
            d="M34 32V14C34 2 68 2 68 14V32"
            stroke="#0052CC"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path d="M12 28H92L98 188H6L12 28Z" fill="url(#zestBagGrad)" />
          <path d="M92 28L108 38L102 180L98 188L92 28Z" fill="#002966" />
          {/* Zestora Emblem on Shopping Bag */}
          <g transform="translate(35, 76) scale(0.55)">
            <path d="M15 12H49L41.5 23H11L15 12Z" fill="#38BDF8" />
            <path d="M22.5 41H53L49 52H15L22.5 41Z" fill="#38BDF8" />
            <path d="M37.5 12H51L26.5 52H13L37.5 12Z" fill="#FFFFFF" />
          </g>
          <text
            x="52"
            y="124"
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="10"
            fontWeight="800"
            letterSpacing="1.2"
          >
            Zestora
          </text>
        </g>

        {/* Ultrabook Laptop in Center */}
        <g transform="translate(205, 86)">
          <rect x="18" y="0" width="248" height="166" rx="12" fill="#0A192F" stroke="#475569" strokeWidth="2" />
          <rect x="26" y="8" width="232" height="146" rx="6" fill="url(#screenWaveP2)" />
          <path d="M26 115C85 65 140 140 258 45V154H26V115Z" fill="#38BDF8" fillOpacity="0.48" />
          <path d="M26 135C95 95 175 145 258 85V154H26V135Z" fill="#BAE6FD" fillOpacity="0.58" />
          {slideIndex === 1 && (
            <text
              x="142"
              y="76"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="15"
              fontWeight="800"
              letterSpacing="1"
            >
              ZESTBOOK OLED
            </text>
          )}
          {slideIndex === 2 && (
            <text
              x="142"
              y="76"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="15"
              fontWeight="800"
              letterSpacing="1"
            >
              SMART HOME HUB
            </text>
          )}
          <rect x="128" y="8" width="28" height="5" rx="2.5" fill="#0A192F" />
          <path
            d="M2 166H282L296 178C296 183 291 186 284 186H0C-7 186 -12 183 -12 178L2 166Z"
            fill="#CBD5E1"
          />
          <path
            d="M-12 178H296C296 183 290 187 282 187H2C-6 187 -12 183 -12 178Z"
            fill="#64748B"
          />
          <rect x="115" y="168" width="54" height="4" rx="2" fill="#94A3B8" />
        </g>

        {/* Flagship Smartphone (Right of Laptop) */}
        <g transform="translate(452, 118)">
          <rect x="0" y="0" width="88" height="178" rx="16" fill="url(#phoneBackP2)" stroke="#64748B" strokeWidth="2" />
          <rect x="8" y="8" width="38" height="40" rx="10" fill="#334155" stroke="#475569" strokeWidth="1.5" />
          <circle cx="19" cy="19" r="7" fill="#0A192F" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="19" cy="37" r="7" fill="#0A192F" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="35" cy="28" r="7" fill="#0A192F" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="44" cy="92" r="9" fill="#334155" />
        </g>

        {/* Studio Wireless ANC Headphones (Left Foreground) */}
        <g transform="translate(116, 152)">
          <path
            d="M24 98C20 36 52 6 88 6C124 6 152 36 148 98"
            stroke="#0A192F"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M36 42C50 16 68 8 88 8C108 8 126 16 138 42"
            stroke="#0066FF"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <g transform="rotate(-12 38 118)">
            <ellipse cx="38" cy="118" rx="26" ry="36" fill="#0A192F" />
            <ellipse cx="44" cy="118" rx="22" ry="32" fill="#1E293B" stroke="#475569" strokeWidth="2" />
            <ellipse cx="48" cy="118" rx="12" ry="20" fill="#0A192F" />
          </g>
          <g transform="rotate(14 128 122)">
            <ellipse cx="128" cy="122" rx="28" ry="38" fill="#0A192F" />
            <ellipse cx="122" cy="122" rx="22" ry="32" fill="#1E293B" stroke="#475569" strokeWidth="2" />
            <circle cx="122" cy="122" r="10" fill="#334155" />
          </g>
        </g>

        {/* Smartwatch in Front Center-Right */}
        <g transform="translate(392, 240)">
          <rect x="16" y="0" width="36" height="98" rx="12" fill="#1E293B" />
          <rect x="6" y="18" width="56" height="64" rx="14" fill="#0A192F" stroke="#64748B" strokeWidth="2.5" />
          <rect x="11" y="23" width="46" height="54" rx="10" fill="#020617" />
          <text
            x="34"
            y="44"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="12"
            fontWeight="700"
            fontFamily="monospace"
          >
            10:08
          </text>
          <circle cx="24" cy="60" r="6" stroke="#38BDF8" strokeWidth="2.5" />
          <circle cx="42" cy="60" r="6" stroke="#22C55E" strokeWidth="2.5" />
        </g>

        {/* Crisp White & Zestora Blue Sneaker in Front Right */}
        <g transform="translate(458, 228)">
          <ellipse cx="82" cy="114" rx="76" ry="10" fill="#0A192F" fillOpacity="0.16" />
          <path
            d="M14 82C26 78 52 60 74 36C80 30 88 32 92 40C98 50 112 52 126 42C134 36 144 42 146 54L152 92H8C6 86 9 83 14 82Z"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="2"
          />
          <path
            d="M62 72C78 76 104 68 126 52C116 68 94 84 66 82Z"
            fill="#0066FF"
            fillOpacity="0.75"
          />
          <rect
            x="4"
            y="90"
            width="150"
            height="18"
            rx="8"
            fill="#F8FAFC"
            stroke="#CBD5E1"
            strokeWidth="1.5"
          />
          <line x1="12" y1="99" x2="146" y2="99" stroke="#E2E8F0" strokeWidth="2" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Clean Studio SVG Illustrations for Category Cards
 */
export function CategoryArtwork({ category }: { category: CategoryId }) {
  switch (category) {
    case 'Electronics':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <rect x="22" y="14" width="76" height="50" rx="6" fill="#0A192F" />
          <rect x="26" y="18" width="68" height="42" rx="3" fill="#0066FF" />
          <path d="M26 48C45 32 68 52 94 26V60H26V48Z" fill="#38BDF8" fillOpacity="0.75" />
          <path d="M12 64H108L112 70H8L12 64Z" fill="#94A3B8" />
        </svg>
      );
    case 'Fashion':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <path
            d="M42 16L20 30L28 44L38 36V76H82V36L92 44L100 30L78 16C74 22 67 25 60 25C53 25 46 22 42 16Z"
            fill="#0066FF"
          />
          <path
            d="M48 14C48 10 53 7 60 7C67 7 72 10 72 14"
            stroke="#0A192F"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          <line x1="56" y1="25" x2="56" y2="44" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" />
          <line x1="64" y1="25" x2="64" y2="44" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'Footwear':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <ellipse cx="60" cy="72" rx="44" ry="5" fill="#CBD5E1" />
          <path
            d="M18 56C30 52 46 40 58 26C62 22 68 24 72 30C78 36 88 36 96 30C101 27 105 32 106 40L108 62H16C14 58 15 57 18 56Z"
            fill="#FFFFFF"
            stroke="#94A3B8"
            strokeWidth="2"
          />
          <path d="M50 50C64 53 82 47 94 37" stroke="#0066FF" strokeWidth="4" strokeLinecap="round" fill="none" />
          <rect x="14" y="61" width="96" height="10" rx="5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
        </svg>
      );
    case 'Accessories':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <path
            d="M36 52C34 26 46 14 60 14C74 14 86 26 84 52"
            stroke="#0A192F"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="36" cy="56" rx="11" ry="16" fill="#0A192F" stroke="#475569" strokeWidth="2" />
          <ellipse cx="84" cy="56" rx="11" ry="16" fill="#0A192F" stroke="#475569" strokeWidth="2" />
        </svg>
      );
    case 'Home and Kitchen':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <rect
            x="22"
            y="36"
            width="64"
            height="26"
            rx="6"
            fill="#D97706"
            fillOpacity="0.25"
            stroke="#B45309"
            strokeWidth="2"
          />
          <rect
            x="16"
            y="46"
            width="76"
            height="18"
            rx="5"
            fill="#F59E0B"
            fillOpacity="0.45"
            stroke="#B45309"
            strokeWidth="2"
          />
          <line x1="24" y1="64" x2="22" y2="74" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <line x1="84" y1="64" x2="86" y2="74" stroke="#78350F" strokeWidth="3" strokeLinecap="round" />
          <path d="M92 26H108L104 14H96L92 26Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
          <line x1="100" y1="26" x2="100" y2="74" stroke="#92400E" strokeWidth="2" />
        </svg>
      );
    case 'Beauty':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <rect
            x="30"
            y="44"
            width="24"
            height="28"
            rx="5"
            fill="#F43F5E"
            fillOpacity="0.25"
            stroke="#E11D48"
            strokeWidth="2"
          />
          <rect x="33" y="38" width="18" height="6" rx="2" fill="#881337" />
          <rect
            x="62"
            y="26"
            width="24"
            height="46"
            rx="6"
            fill="#FB7185"
            fillOpacity="0.35"
            stroke="#E11D48"
            strokeWidth="2"
          />
          <rect x="69" y="18" width="10" height="8" rx="2" fill="#881337" />
          <path d="M74 18V12H82" stroke="#881337" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
      );
    case 'Sports':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <rect x="68" y="20" width="24" height="52" rx="6" fill="#0066FF" stroke="#1E3A8A" strokeWidth="2" />
          <rect x="73" y="12" width="14" height="8" rx="2" fill="#0A192F" />
          <rect x="20" y="48" width="8" height="22" rx="3" fill="#0A192F" />
          <rect x="52" y="48" width="8" height="22" rx="3" fill="#0A192F" />
          <line x1="28" y1="59" x2="52" y2="59" stroke="#475569" strokeWidth="5" />
        </svg>
      );
    case 'Toys':
      return (
        <svg viewBox="0 0 120 90" className="w-20 h-16 mx-auto" aria-hidden="true">
          <circle cx="44" cy="24" r="9" fill="#D97706" />
          <circle cx="76" cy="24" r="9" fill="#D97706" />
          <circle cx="60" cy="36" r="18" fill="#F59E0B" />
          <ellipse cx="60" cy="62" rx="20" ry="16" fill="#F59E0B" />
          <circle cx="54" cy="33" r="2.2" fill="#0A192F" />
          <circle cx="66" cy="33" r="2.2" fill="#0A192F" />
          <ellipse cx="60" cy="40" rx="6" ry="4" fill="#FEF3C7" />
          <circle cx="60" cy="39" r="2" fill="#0A192F" />
        </svg>
      );
  }
}

/**
 * High-Resolution Studio Vector Illustration for Reusable Product Cards
 */
export function ProductArtwork({
  artwork,
  className = 'w-full h-full',
}: {
  artwork: ProductArtworkKey;
  className?: string;
}) {
  switch (artwork) {
    case 'anc-headphones':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="bgHeadphone" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#EFF6FF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </radialGradient>
          </defs>
          <rect width="320" height="240" fill="url(#bgHeadphone)" />
          <ellipse cx="160" cy="204" rx="75" ry="10" fill="#0A192F" fillOpacity="0.12" />
          <path
            d="M104 128C100 62 128 36 160 36C192 36 220 62 216 128"
            stroke="#0A192F"
            strokeWidth="16"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M118 68C130 46 144 38 160 38C176 38 190 46 202 68"
            stroke="#0066FF"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <ellipse cx="106" cy="144" rx="24" ry="36" fill="#0A192F" stroke="#475569" strokeWidth="2" />
          <ellipse cx="112" cy="144" rx="14" ry="24" fill="#1E293B" />
          <ellipse cx="214" cy="144" rx="24" ry="36" fill="#0A192F" stroke="#475569" strokeWidth="2" />
          <ellipse cx="208" cy="144" rx="14" ry="24" fill="#1E293B" />
        </svg>
      );

    case 'cobalt-hoodie':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#F0F9FF" />
          <ellipse cx="160" cy="208" rx="78" ry="9" fill="#0A192F" fillOpacity="0.1" />
          <path
            d="M118 48L68 82L86 116L110 96V192H210V96L234 116L252 82L202 48C190 60 176 66 160 66C144 66 130 60 118 48Z"
            fill="#0066FF"
            stroke="#0052CC"
            strokeWidth="2"
          />
          <path d="M126 48C126 30 140 22 160 22C180 22 194 30 194 48" fill="#1E3A8A" />
          <rect x="128" y="138" width="64" height="34" rx="8" fill="#0052CC" />
          <line x1="150" y1="64" x2="150" y2="104" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
          <line x1="170" y1="64" x2="170" y2="104" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'cloud-sneaker':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#F8FAFC" />
          <ellipse cx="160" cy="190" rx="96" ry="10" fill="#0A192F" fillOpacity="0.12" />
          <path
            d="M66 146C92 138 130 110 156 76C164 68 176 70 184 82C194 96 216 98 234 84C244 76 256 86 258 104L264 156H58C54 150 58 148 66 146Z"
            fill="#FFFFFF"
            stroke="#94A3B8"
            strokeWidth="2.5"
          />
          <path
            d="M132 132C162 138 202 126 232 102"
            stroke="#0066FF"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="52" y="156" width="218" height="22" rx="10" fill="#E0F2FE" stroke="#7DD3FC" strokeWidth="2" />
        </svg>
      );

    case 'espresso-maker':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#FFFBEB" />
          <ellipse cx="160" cy="204" rx="80" ry="10" fill="#78350F" fillOpacity="0.14" />
          <rect x="104" y="36" width="112" height="156" rx="12" fill="#334155" stroke="#0A192F" strokeWidth="2.5" />
          <rect x="112" y="46" width="96" height="36" rx="6" fill="#94A3B8" />
          <circle cx="160" cy="64" r="11" fill="#0A192F" stroke="#E2E8F0" strokeWidth="2" />
          <rect x="144" y="92" width="32" height="18" rx="4" fill="#0A192F" />
          <line x1="176" y1="101" x2="212" y2="101" stroke="#0A192F" strokeWidth="6" strokeLinecap="round" />
          <path d="M142 142H178L174 176H146L142 142Z" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2" />
          <rect x="112" y="176" width="96" height="10" rx="3" fill="#94A3B8" />
        </svg>
      );

    case 'vitamin-serum':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#FFF1F2" />
          <ellipse cx="160" cy="202" rx="64" ry="9" fill="#881337" fillOpacity="0.12" />
          <rect
            x="128"
            y="84"
            width="64"
            height="110"
            rx="14"
            fill="#EA580C"
            fillOpacity="0.85"
            stroke="#9A3412"
            strokeWidth="2"
          />
          <rect x="136" y="108" width="48" height="62" rx="4" fill="#FFFBEB" />
          <text x="160" y="136" textAnchor="middle" fill="#9A3412" fontSize="11" fontWeight="700">
            VITAMIN C
          </text>
          <text x="160" y="152" textAnchor="middle" fill="#C2410C" fontSize="9" fontWeight="600">
            15% SERUM
          </text>
          <rect x="144" y="66" width="32" height="18" rx="3" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
          <path d="M150 66V46C150 40 170 40 170 46V66" fill="#0A192F" />
        </svg>
      );

    case 'adjustable-dumbbell':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#EFF6FF" />
          <ellipse cx="160" cy="198" rx="95" ry="10" fill="#1E3A8A" fillOpacity="0.12" />
          <rect x="196" y="52" width="48" height="136" rx="12" fill="#0066FF" stroke="#1E3A8A" strokeWidth="2" />
          <rect x="208" y="34" width="24" height="18" rx="4" fill="#0A192F" />
          <rect x="66" y="118" width="20" height="68" rx="6" fill="#0A192F" />
          <rect x="88" y="126" width="14" height="52" rx="4" fill="#334155" />
          <rect x="148" y="126" width="14" height="52" rx="4" fill="#334155" />
          <rect x="164" y="118" width="20" height="68" rx="6" fill="#0A192F" />
          <line x1="102" y1="152" x2="148" y2="152" stroke="#94A3B8" strokeWidth="10" />
        </svg>
      );

    case 'leather-weekender':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#F8FAFC" />
          <ellipse cx="160" cy="200" rx="92" ry="10" fill="#0A192F" fillOpacity="0.12" />
          <path
            d="M124 78C124 48 196 48 196 78"
            stroke="#78350F"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <rect x="76" y="76" width="168" height="114" rx="18" fill="#92400E" stroke="#78350F" strokeWidth="2.5" />
          <rect x="118" y="76" width="12" height="114" fill="#451A03" />
          <rect x="190" y="76" width="12" height="114" fill="#451A03" />
          <rect x="144" y="112" width="32" height="20" rx="4" fill="#B45309" stroke="#FDE68A" strokeWidth="1.5" />
        </svg>
      );

    case 'plush-teddy':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#FFF7ED" />
          <ellipse cx="160" cy="204" rx="76" ry="10" fill="#9A3412" fillOpacity="0.12" />
          <circle cx="122" cy="56" r="18" fill="#B45309" />
          <circle cx="198" cy="56" r="18" fill="#B45309" />
          <circle cx="160" cy="84" r="38" fill="#D97706" />
          <ellipse cx="160" cy="148" rx="44" ry="42" fill="#D97706" />
          <ellipse cx="160" cy="150" rx="26" ry="26" fill="#FDE68A" />
          <circle cx="146" cy="76" r="4.5" fill="#0A192F" />
          <circle cx="174" cy="76" r="4.5" fill="#0A192F" />
          <ellipse cx="160" cy="92" rx="13" ry="9" fill="#FEF3C7" />
          <circle cx="160" cy="90" r="4.5" fill="#0A192F" />
          <rect x="78" y="156" width="34" height="34" rx="4" fill="#0066FF" />
          <rect x="208" y="156" width="34" height="34" rx="4" fill="#16A34A" />
        </svg>
      );

    case 'ultrabook-pro':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#F1F5F9" />
          <rect x="64" y="44" width="192" height="126" rx="8" fill="#0A192F" stroke="#475569" strokeWidth="2" />
          <rect x="72" y="52" width="176" height="110" rx="4" fill="#0066FF" />
          <path d="M72 132C118 92 174 146 248 76V162H72V132Z" fill="#38BDF8" fillOpacity="0.65" />
          <path d="M44 170H276L286 180H34L44 170Z" fill="#94A3B8" />
        </svg>
      );

    case 'smartwatch-series':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#EFF6FF" />
          <rect x="134" y="28" width="52" height="184" rx="18" fill="#1E293B" />
          <rect x="114" y="64" width="92" height="112" rx="24" fill="#0A192F" stroke="#64748B" strokeWidth="3" />
          <rect x="124" y="74" width="72" height="92" rx="16" fill="#020617" />
          <text
            x="160"
            y="112"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="20"
            fontWeight="700"
            fontFamily="monospace"
          >
            10:08
          </text>
          <circle cx="144" cy="140" r="10" stroke="#38BDF8" strokeWidth="3.5" fill="none" />
          <circle cx="176" cy="140" r="10" stroke="#22C55E" strokeWidth="3.5" fill="none" />
        </svg>
      );

    case 'air-purifier':
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#F0FDFA" />
          <rect x="112" y="38" width="96" height="164" rx="22" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="2.5" />
          <circle cx="160" cy="82" r="22" fill="#0A192F" stroke="#10B981" strokeWidth="3" />
          <text
            x="160"
            y="86"
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="12"
            fontWeight="700"
            fontFamily="monospace"
          >
            012
          </text>
          <line x1="128" y1="132" x2="192" y2="132" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="128" y1="148" x2="192" y2="148" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="128" y1="164" x2="192" y2="164" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 4" />
          <line x1="128" y1="180" x2="192" y2="180" stroke="#94A3B8" strokeWidth="3" strokeDasharray="4 4" />
        </svg>
      );

    case 'polarized-wayfarer':
    default:
      return (
        <svg viewBox="0 0 320 240" className={className} aria-hidden="true">
          <rect width="320" height="240" fill="#F8FAFC" />
          <rect x="62" y="92" width="84" height="58" rx="14" fill="#1E293B" stroke="#0A192F" strokeWidth="6" />
          <rect x="174" y="92" width="84" height="58" rx="14" fill="#1E293B" stroke="#0A192F" strokeWidth="6" />
          <path d="M146 106Q160 96 174 106" stroke="#0A192F" strokeWidth="6" fill="none" />
          <line
            x1="68"
            y1="104"
            x2="102"
            y2="138"
            stroke="#38BDF8"
            strokeWidth="3"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
          <line
            x1="180"
            y1="104"
            x2="214"
            y2="138"
            stroke="#38BDF8"
            strokeWidth="3"
            strokeOpacity="0.6"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}
