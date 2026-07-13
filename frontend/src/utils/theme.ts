// Theme and font size utilities — «Taller» identity (Phase 4)
//
// Phase 4 narrows the old 4-theme engine down to ONE identity: «Taller»
// (steel neutrals + safety-amber accent). We keep the public API
// (applyTheme / applyFontSize and their signatures) unchanged so existing
// callers — Layout.tsx (startup) and SettingsView.tsx (on save) — keep
// compiling. `themeName` is now accepted-but-ignored; only the light/dark
// `variant` still selects a palette. The legacy theme-name selector in
// Settings is retired in a later increment.
//
// Mechanism (unchanged): we write CSS custom properties onto :root that the
// utility-class overrides in index.css consume (--color-brand-*, -neutral-*,
// -surface-*). We ALSO emit semantic Taller tokens (--accent, --money-positive,
// --danger, --border-strong, --selected-bg, …) for components adopted later.

export const FONT_SIZE_SCALES = {
  small: '0.9375',
  medium: '1',
  large: '1.0625',
} as const;

export type FontSize = keyof typeof FONT_SIZE_SCALES;
export type ThemeVariant = 'light' | 'dark';
export type Density = 'comodo' | 'compacto';

// ---------------------------------------------------------------------------
// «Taller» palette
// ---------------------------------------------------------------------------
// LIGHT is the fully-tuned, flagship-quality surface (daylight counter).
// DARK is functional/legible; a few tokens (e.g. brand-600, used as both a
// white-text button fill AND as accent text) can't be perfected by a pure
// remap and are finished when components gain real classes (grammar increment).

const TALLER_LIGHT: Record<string, string> = {
  // Amber accent ramp (pale → deep). Deep enough at 600/700 for white text.
  '--color-brand-50': '#FBF3E7',
  '--color-brand-100': '#F6E6CC',
  '--color-brand-200': '#ECCB99',
  '--color-brand-300': '#E0AC63',
  '--color-brand-400': '#D18B2E',
  '--color-brand-500': '#C25E00', // accent
  '--color-brand-600': '#A85200', // button fill (white text OK)
  '--color-brand-700': '#8A4400', // hover / accent text on pale
  '--color-brand-800': '#6B3500',
  '--color-brand-900': '#4A2500',
  '--color-brand-950': '#2E1700',

  // Steel neutrals (higher number = darker; dark text on light).
  '--color-neutral-50': '#F7F8FA',
  '--color-neutral-100': '#EEF0F2',
  '--color-neutral-200': '#DDE0E4',
  '--color-neutral-300': '#C7CCD3',
  '--color-neutral-400': '#9BA2AC',
  '--color-neutral-500': '#5E6570', // muted text
  '--color-neutral-600': '#4A515B',
  '--color-neutral-700': '#363B43',
  '--color-neutral-800': '#22262B',
  '--color-neutral-900': '#16181B', // text
  '--color-neutral-950': '#0C0D0F',

  // Surfaces (backgrounds & borders).
  '--color-surface-50': '#FFFFFF',  // panels / cards (bg-white)
  '--color-surface-100': '#F2F3F5', // app background
  '--color-surface-200': '#E8EAEE',
  '--color-surface-300': '#D9DCE1', // default borders (border-gray-200)
  '--color-surface-400': '#C7CCD3',
  '--color-surface-500': '#B8BDC6',
  '--color-surface-600': '#98A1AC',
  '--color-surface-700': '#5E6570',
  '--color-surface-800': '#363B43',
  '--color-surface-900': '#16181B',

  // Semantic Taller tokens (for components adopted in later increments).
  '--accent': '#C25E00',
  '--accent-hover': '#A85200',
  '--accent-contrast': '#FFFFFF',
  '--money-positive': '#1F7A46',
  '--danger': '#C4302B',
  '--info': '#2E6699',
  '--text': '#16181B',
  '--text-muted': '#5E6570',
  '--app-bg': '#F2F3F5',
  '--surface': '#FFFFFF',
  '--surface-raised': '#FFFFFF',
  '--border': '#D9DCE1',
  '--border-strong': '#B8BDC6',
  '--selected-bg': '#FBF3E7',
  '--focus-ring': '#C25E00',
};

const TALLER_DARK: Record<string, string> = {
  // Amber ramp for graphite. Pale/text ends inverted (light) so badge pairs
  // like bg-blue-100 / text-blue-800 stay legible; 500 stays bright accent;
  // 600/700 stay deep for white-text button fills.
  '--color-brand-50': '#241E14',  // selected-bg
  '--color-brand-100': '#33291A', // badge background
  '--color-brand-200': '#4A3A20',
  '--color-brand-300': '#6E5626',
  '--color-brand-400': '#9E7524',
  '--color-brand-500': '#F5A623', // accent (bright)
  '--color-brand-600': '#B4620A', // button fill (compromise: white text ~ AA-large)
  '--color-brand-700': '#C87718', // button hover (lighter in dark)
  '--color-brand-800': '#E8B562', // accent text on dark (light)
  '--color-brand-900': '#F3D39A',
  '--color-brand-950': '#F9E9CC',

  // Steel neutrals inverted so hardcoded text-gray-900 etc. stay readable.
  '--color-neutral-50': '#0C0D0F',
  '--color-neutral-100': '#16181B',
  '--color-neutral-200': '#22262B',
  '--color-neutral-300': '#4A525C',
  '--color-neutral-400': '#6B7480',
  '--color-neutral-500': '#98A1AC', // muted text
  '--color-neutral-600': '#B4BBC4',
  '--color-neutral-700': '#CDD2D8',
  '--color-neutral-800': '#E1E4E8',
  '--color-neutral-900': '#E9EBEE', // text
  '--color-neutral-950': '#FFFFFF',

  '--color-surface-50': '#1A1D21',  // panels / cards
  '--color-surface-100': '#101214', // app background
  '--color-surface-200': '#22262B',
  '--color-surface-300': '#343A42', // borders
  '--color-surface-400': '#4A525C',
  '--color-surface-500': '#5E6570',
  '--color-surface-600': '#98A1AC',
  '--color-surface-700': '#C7CCD3',
  '--color-surface-800': '#E1E4E8',
  '--color-surface-900': '#F7F8FA',

  '--accent': '#F5A623',
  '--accent-hover': '#FFB84D',
  '--accent-contrast': '#231400',
  '--money-positive': '#4CC38A',
  '--danger': '#E5645A',
  '--info': '#6FA8D6',
  '--text': '#E9EBEE',
  '--text-muted': '#98A1AC',
  '--app-bg': '#101214',
  '--surface': '#1A1D21',
  '--surface-raised': '#22262B',
  '--border': '#343A42',
  '--border-strong': '#4A525C',
  '--selected-bg': '#2A241A',
  '--focus-ring': '#F5A623',
};

export function applyFontSize(fontSize: FontSize) {
  const scale = FONT_SIZE_SCALES[fontSize] ?? FONT_SIZE_SCALES.medium;
  document.documentElement.style.setProperty('--font-scale-base', scale);
}

/**
 * Apply the «Taller» palette for the given light/dark variant. There is one
 * identity now — «Taller» — so no theme-name argument is needed.
 */
export function applyTheme(variant: ThemeVariant = 'light') {
  const root = document.documentElement;
  const palette = variant === 'dark' ? TALLER_DARK : TALLER_LIGHT;

  // Tailwind dark: class (kept for any dark: utilities in components).
  root.classList.toggle('dark', variant === 'dark');
  // Marker class for CSS that needs to branch on variant.
  root.classList.toggle('taller-dark', variant === 'dark');
  root.classList.toggle('taller-light', variant !== 'dark');

  Object.entries(palette).forEach(([prop, value]) => {
    root.style.setProperty(prop, value);
  });
}

/**
 * Apply table/list density. «Compacto» tightens table row padding — the one
 * real ERP need called out in DESIGN_DIRECTION.md §3 (long product tables).
 * Other density-aware refinements are future work, not implied by this flag.
 */
export function applyDensity(density: Density) {
  document.documentElement.classList.toggle('density-compact', density === 'compacto');
}
