export const colors = {
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceElevated: '#22223A',
  accentPrimary: '#00D4FF',
  accentSecondary: '#7B2FBE',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#6B6B7D',
  codeHighlight: '#FFD700',
  success: '#00FF88',
  warning: '#FFB347',
  danger: '#FF6B6B',
  border: 'rgba(255, 255, 255, 0.08)',
} as const;

export const syntax = {
  keyword: '#C792EA',
  string: '#C3E88D',
  function: '#82AAFF',
  comment: '#546E7A',
  number: '#F78C6C',
  operator: '#89DDFF',
  punctuation: '#E0E0E0',
  variable: '#EEFFFF',
  className: '#FFCB6B',
  property: '#80CBC4',
  default: '#EEFFFF',
} as const;

export const fonts = {
  display: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const shadows = {
  glow: (color: string, intensity = 16) => `0 0 ${intensity}px ${color}`,
  panel: '0 20px 60px rgba(0, 0, 0, 0.4)',
} as const;
