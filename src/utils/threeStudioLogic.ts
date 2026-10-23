import type { Product, ProductArtworkKey } from '../types/store.ts';

export type StudioFinishId =
  | 'signature-cobalt'
  | 'obsidian-titanium'
  | 'champagne-gold'
  | 'arctic-pearl'
  | 'emerald-carbon';

export type StudioCameraPresetId = 'hero' | 'front' | 'side' | 'top' | 'macro';

export type StudioLightingPresetId = 'studio-daylight' | 'cyber-cobalt' | 'warm-golden';

export interface StudioFinishPalette {
  id: StudioFinishId;
  name: string;
  swatchHex: string;
  primaryHex: number;
  secondaryHex: number;
  accentHex: number;
  cushionHex: number;
  metalness: number;
  roughness: number;
  anisotropy: number;
}

export interface StudioCameraPreset {
  id: StudioCameraPresetId;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface StudioLightingPreset {
  id: StudioLightingPresetId;
  label: string;
  backgroundHex: number;
  fogHex: number;
  fogDensity: number;
  keyLightHex: number;
  keyLightIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  rimLightHex: number;
  rimLightIntensity: number;
  exposure: number;
}

export const STUDIO_FINISH_PALETTES: StudioFinishPalette[] = [
  {
    id: 'signature-cobalt',
    name: 'Signature Cobalt',
    swatchHex: '#0066FF',
    primaryHex: 0x0f2547,
    secondaryHex: 0xdbeafe,
    accentHex: 0x0066ff,
    cushionHex: 0x1e293b,
    metalness: 0.88,
    roughness: 0.2,
    anisotropy: 0.75,
  },
  {
    id: 'obsidian-titanium',
    name: 'Obsidian Titanium',
    swatchHex: '#334155',
    primaryHex: 0x1e293b,
    secondaryHex: 0x64748b,
    accentHex: 0x38bdf8,
    cushionHex: 0x0f172a,
    metalness: 0.94,
    roughness: 0.18,
    anisotropy: 0.85,
  },
  {
    id: 'champagne-gold',
    name: 'Champagne Gold',
    swatchHex: '#D97706',
    primaryHex: 0xd4af37,
    secondaryHex: 0x27272a,
    accentHex: 0xf59e0b,
    cushionHex: 0x18181b,
    metalness: 0.95,
    roughness: 0.16,
    anisotropy: 0.8,
  },
  {
    id: 'arctic-pearl',
    name: 'Arctic Pearl',
    swatchHex: '#E2E8F0',
    primaryHex: 0xf1f5f9,
    secondaryHex: 0x94a3b8,
    accentHex: 0x0284c7,
    cushionHex: 0xcbd5e1,
    metalness: 0.65,
    roughness: 0.25,
    anisotropy: 0.5,
  },
  {
    id: 'emerald-carbon',
    name: 'Emerald Carbon',
    swatchHex: '#059669',
    primaryHex: 0x064e3b,
    secondaryHex: 0x334155,
    accentHex: 0x10b981,
    cushionHex: 0x0f172a,
    metalness: 0.86,
    roughness: 0.22,
    anisotropy: 0.7,
  },
];

export const STUDIO_CAMERA_PRESETS: StudioCameraPreset[] = [
  {
    id: 'hero',
    label: 'Hero 3/4',
    position: [3.2, 2.35, 3.6],
    target: [0, 1.05, 0],
  },
  {
    id: 'front',
    label: 'Front',
    position: [0, 1.45, 4.4],
    target: [0, 1.05, 0],
  },
  {
    id: 'side',
    label: 'Profile',
    position: [4.4, 1.4, 0.2],
    target: [0, 1.05, 0],
  },
  {
    id: 'top',
    label: 'Overhead',
    position: [0.1, 4.8, 0.9],
    target: [0, 0.9, 0],
  },
  {
    id: 'macro',
    label: 'Macro Detail',
    position: [1.75, 1.55, 1.95],
    target: [0, 1.15, 0],
  },
];

export const STUDIO_LIGHTING_PRESETS: StudioLightingPreset[] = [
  {
    id: 'studio-daylight',
    label: 'Studio Daylight',
    backgroundHex: 0x0b1528,
    fogHex: 0x0b1528,
    fogDensity: 0.032,
    keyLightHex: 0xfff7ed,
    keyLightIntensity: 2.8,
    hemiSkyHex: 0x93c5fd,
    hemiGroundHex: 0x1e293b,
    hemiIntensity: 0.95,
    rimLightHex: 0x38bdf8,
    rimLightIntensity: 2.1,
    exposure: 1.15,
  },
  {
    id: 'cyber-cobalt',
    label: 'Cyber Cobalt',
    backgroundHex: 0x060d1a,
    fogHex: 0x060d1a,
    fogDensity: 0.036,
    keyLightHex: 0xe0f2fe,
    keyLightIntensity: 2.6,
    hemiSkyHex: 0x3b82f6,
    hemiGroundHex: 0x0f172a,
    hemiIntensity: 1.05,
    rimLightHex: 0x0066ff,
    rimLightIntensity: 3.0,
    exposure: 1.18,
  },
  {
    id: 'warm-golden',
    label: 'Golden Hour',
    backgroundHex: 0x161219,
    fogHex: 0x161219,
    fogDensity: 0.03,
    keyLightHex: 0xfde68a,
    keyLightIntensity: 3.1,
    hemiSkyHex: 0xfdba74,
    hemiGroundHex: 0x1c1917,
    hemiIntensity: 0.9,
    rimLightHex: 0xf59e0b,
    rimLightIntensity: 2.4,
    exposure: 1.12,
  },
];

/**
 * Frame-rate independent exponential smoothing factor: 1 - exp(-lambda * dt)
 */
export function computeExponentialDecayAlpha(lambda: number, dtSeconds: number): number {
  const safeLambda = Math.max(0, lambda);
  const safeDt = Math.max(0, Math.min(dtSeconds, 0.25));
  return 1 - Math.exp(-safeLambda * safeDt);
}

/**
 * Smoothly interpolates a scalar value toward target using exponential damping.
 */
export function dampScalar(
  current: number,
  target: number,
  lambda: number,
  dtSeconds: number
): number {
  const alpha = computeExponentialDecayAlpha(lambda, dtSeconds);
  return current + (target - current) * alpha;
}

/**
 * Computes the displaced 3D coordinates for a component part in Exploded View.
 */
export function calculateExplodedPosition(
  basePosition: [number, number, number],
  explodeVector: [number, number, number],
  explosionProgress: number
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(explosionProgress) ? explosionProgress : 0));
  return [
    Number((basePosition[0] + explodeVector[0] * clamped).toFixed(4)),
    Number((basePosition[1] + explodeVector[1] * clamped).toFixed(4)),
    Number((basePosition[2] + explodeVector[2] * clamped).toFixed(4)),
  ];
}

/**
 * Resolves a Zestora product to one of the 8 composite 3D procedural model archetypes.
 */
export function resolveProductArchetype(
  product?: Pick<Product, 'artwork' | 'category' | 'name'> | null
): ProductArtworkKey {
  if (!product) return 'headphones';
  const validKeys: ProductArtworkKey[] = [
    'headphones',
    'watch',
    'hoodie',
    'sneakers',
    'lamp',
    'skincare',
    'backpack',
    'keyboard',
  ];
  if (product.artwork && validKeys.includes(product.artwork)) {
    return product.artwork;
  }
  const nameLower = (product.name || '').toLowerCase();
  if (nameLower.includes('watch') || nameLower.includes('chrono')) return 'watch';
  if (nameLower.includes('keyboard') || nameLower.includes('tactile')) return 'keyboard';
  if (nameLower.includes('sneaker') || nameLower.includes('shoe') || nameLower.includes('stride')) return 'sneakers';
  if (nameLower.includes('hoodie') || nameLower.includes('jacket') || nameLower.includes('shirt')) return 'hoodie';
  if (nameLower.includes('lamp') || nameLower.includes('light')) return 'lamp';
  if (nameLower.includes('serum') || nameLower.includes('skin') || nameLower.includes('glow')) return 'skincare';
  if (nameLower.includes('backpack') || nameLower.includes('bag')) return 'backpack';

  switch (product.category) {
    case 'Footwear':
      return 'sneakers';
    case 'Fashion':
      return 'hoodie';
    case 'Home & Kitchen':
      return 'lamp';
    case 'Beauty':
      return 'skincare';
    case 'Accessories':
      return 'backpack';
    default:
      return 'headphones';
  }
}
