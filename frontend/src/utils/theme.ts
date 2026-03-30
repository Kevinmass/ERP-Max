// Theme and font size utilities

export const FONT_SIZE_SCALES = {
  small: '0.875',
  medium: '1.125',
  large: '1.375',
} as const;

export type FontSize = keyof typeof FONT_SIZE_SCALES;
export type ThemeName = 'blue' | 'green' | 'purple' | 'professional';
export type ThemeVariant = 'light' | 'dark';

// Base theme colors for each theme
const THEME_BASE_COLORS = {
  blue: {
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    accent: '#60a5fa',
  },
  green: {
    primary: '#22c55e',
    secondary: '#15803d',
    accent: '#4ade80',
  },
  purple: {
    primary: '#a855f7',
    secondary: '#7c3aed',
    accent: '#c084fc',
  },
  professional: {
    primary: '#374151',
    secondary: '#1f2937',
    accent: '#6b7280',
  },
} as const;

// Generate complete color palette for a theme variant
function generateThemeColors(themeName: ThemeName, variant: ThemeVariant) {
  const baseColors = THEME_BASE_COLORS[themeName];
  const isDark = variant === 'dark';

  const colors = {
    // Brand colors (based on theme)
    '--color-brand-50': isDark ? '#1e1b4b' : '#eff6ff',
    '--color-brand-100': isDark ? '#312e81' : '#dbeafe',
    '--color-brand-200': isDark ? '#4338ca' : '#bfdbfe',
    '--color-brand-300': isDark ? '#4f46e5' : '#93c5fd',
    '--color-brand-400': isDark ? '#6366f1' : '#60a5fa',
    '--color-brand-500': baseColors.primary,
    '--color-brand-600': baseColors.secondary,
    '--color-brand-700': isDark ? '#3730a3' : '#1d4ed8',
    '--color-brand-800': isDark ? '#312e81' : '#1e40af',
    '--color-brand-900': isDark ? '#1e1b4b' : '#1e3a8a',
    '--color-brand-950': isDark ? '#0f0a23' : '#172554',

    // Neutral grays (theme-aware)
    '--color-neutral-50': isDark ? '#0a0a0a' : '#fafafa',
    '--color-neutral-100': isDark ? '#171717' : '#f5f5f5',
    '--color-neutral-200': isDark ? '#262626' : '#e5e5e5',
    '--color-neutral-300': isDark ? '#404040' : '#d4d4d4',
    '--color-neutral-400': isDark ? '#525252' : '#a3a3a3',
    '--color-neutral-500': isDark ? '#737373' : '#737373',
    '--color-neutral-600': isDark ? '#a3a3a3' : '#525252',
    '--color-neutral-700': isDark ? '#d4d4d4' : '#404040',
    '--color-neutral-800': isDark ? '#e5e5e5' : '#262626',
    '--color-neutral-900': isDark ? '#f5f5f5' : '#171717',
    '--color-neutral-950': isDark ? '#fafafa' : '#0a0a0a',

    // Surface colors (theme-aware backgrounds)
    '--color-surface-50': isDark ? '#0f172a' : '#ffffff',
    '--color-surface-100': isDark ? '#1e293b' : '#fafbfc',
    '--color-surface-200': isDark ? '#334155' : '#f1f3f4',
    '--color-surface-300': isDark ? '#475569' : '#e8eaed',
    '--color-surface-400': isDark ? '#64748b' : '#dadce0',
    '--color-surface-500': isDark ? '#94a3b8' : '#bdc1c6',
    '--color-surface-600': isDark ? '#cbd5e1' : '#80868b',
    '--color-surface-700': isDark ? '#e2e8f0' : '#5f6368',
    '--color-surface-800': isDark ? '#f1f5f9' : '#3c4043',
    '--color-surface-900': isDark ? '#f8fafc' : '#202124',
  };

  return colors;
}

// Theme definitions with variants and backgrounds
export const THEMES = {
  blue: {
    name: 'Blue',
    variants: {
      light: {
        ...generateThemeColors('blue', 'light'),
        backgroundPattern: 'squares',
        gradientStart: '#eff6ff',
        gradientEnd: '#ffffff',
      },
      dark: {
        ...generateThemeColors('blue', 'dark'),
        backgroundPattern: 'circles',
        gradientStart: '#0f172a',
        gradientEnd: '#1e293b',
      },
    },
  },
  green: {
    name: 'Green',
    variants: {
      light: {
        ...generateThemeColors('green', 'light'),
        backgroundPattern: 'diamonds',
        gradientStart: '#f0fdf4',
        gradientEnd: '#ffffff',
      },
      dark: {
        ...generateThemeColors('green', 'dark'),
        backgroundPattern: 'waves',
        gradientStart: '#052e16',
        gradientEnd: '#14532d',
      },
    },
  },
  purple: {
    name: 'Purple',
    variants: {
      light: {
        ...generateThemeColors('purple', 'light'),
        backgroundPattern: 'circles',
        gradientStart: '#faf5ff',
        gradientEnd: '#ffffff',
      },
      dark: {
        ...generateThemeColors('purple', 'dark'),
        backgroundPattern: 'squares',
        gradientStart: '#3b0764',
        gradientEnd: '#581c87',
      },
    },
  },
  professional: {
    name: 'Professional',
    variants: {
      light: {
        ...generateThemeColors('professional', 'light'),
        backgroundPattern: 'waves',
        gradientStart: '#f9fafb',
        gradientEnd: '#ffffff',
      },
      dark: {
        ...generateThemeColors('professional', 'dark'),
        backgroundPattern: 'diamonds',
        gradientStart: '#111827',
        gradientEnd: '#1f2937',
      },
    },
  },
} as const;

export function applyFontSize(fontSize: FontSize) {
  const scale = FONT_SIZE_SCALES[fontSize];
  document.documentElement.style.setProperty('--font-scale-base', scale);
}

export function applyTheme(themeName: ThemeName, variant: ThemeVariant = 'light') {
  const theme = THEMES[themeName];
  const themeVariant = theme.variants[variant];

  // Remove existing theme classes
  Object.keys(THEMES).forEach(name => {
    document.documentElement.classList.remove(`theme-${name}`);
    document.documentElement.classList.remove(`theme-${name}-light`);
    document.documentElement.classList.remove(`theme-${name}-dark`);
  });

  // Add new theme class
  document.documentElement.classList.add(`theme-${themeName}`);
  document.documentElement.classList.add(`theme-${themeName}-${variant}`);

  // Manage dark mode class for Tailwind CSS
  if (variant === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Apply background gradient
  document.documentElement.style.setProperty('--bg-gradient-start', themeVariant.gradientStart);
  document.documentElement.style.setProperty('--bg-gradient-end', themeVariant.gradientEnd);

  // Apply CSS custom properties (excluding special properties)
  const { backgroundPattern, gradientStart, gradientEnd, ...colors } = themeVariant;
  Object.entries(colors).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });
}

export function applyThemeBackground(themeName: ThemeName, variant: ThemeVariant = 'light') {
  const theme = THEMES[themeName];
  const themeVariant = theme.variants[variant];

  // Apply background pattern CSS
  const pattern = themeVariant.backgroundPattern;
  let backgroundCSS = '';

  switch (pattern) {
    case 'squares':
      backgroundCSS = `
        background-image:
          linear-gradient(45deg, ${themeVariant.gradientStart}20 25%, transparent 25%),
          linear-gradient(-45deg, ${themeVariant.gradientStart}20 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${themeVariant.gradientStart}20 75%),
          linear-gradient(-45deg, transparent 75%, ${themeVariant.gradientStart}20 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
      `;
      break;
    case 'circles':
      backgroundCSS = `
        background-image: radial-gradient(circle at 25% 25%, ${themeVariant.gradientStart}15 2px, transparent 2px),
                          radial-gradient(circle at 75% 75%, ${themeVariant.gradientStart}15 2px, transparent 2px);
        background-size: 20px 20px;
      `;
      break;
    case 'diamonds':
      backgroundCSS = `
        background-image:
          linear-gradient(45deg, ${themeVariant.gradientStart}18 25%, transparent 25%),
          linear-gradient(-45deg, ${themeVariant.gradientStart}18 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, ${themeVariant.gradientStart}18 75%),
          linear-gradient(-45deg, transparent 75%, ${themeVariant.gradientStart}18 75%);
        background-size: 15px 15px;
      `;
      break;
    case 'waves':
      backgroundCSS = `
        background-image:
          radial-gradient(circle at 50% 100%, ${themeVariant.gradientStart}12 2px, transparent 2px),
          radial-gradient(circle at 50% 0%, ${themeVariant.gradientStart}12 2px, transparent 2px);
        background-size: 25px 25px;
      `;
      break;
  }

  // Apply to body
  const body = document.body;
  body.style.background = `linear-gradient(135deg, ${themeVariant.gradientStart}, ${themeVariant.gradientEnd})`;
  body.style.backgroundAttachment = 'fixed';

  // Add pattern as additional background
  if (backgroundCSS) {
    body.style.backgroundImage = `
      linear-gradient(135deg, ${themeVariant.gradientStart}, ${themeVariant.gradientEnd}),
      ${backgroundCSS.replace('background-image:', '').trim()}
    `;
  }
}
