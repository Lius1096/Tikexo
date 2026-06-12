// Design tokens TIKEXO
export const colors = {
  primary: '#1A3C5E',
  accent: '#0EA5E9',
  gold: '#B45309',
  success: '#166534',
  danger: '#991B1B',
  lightBlue: '#DBEAFE',
  lightGray: '#F1F5F9',
  dark: '#1E293B',
  white: '#FFFFFF',
} as const;

export const fonts = {
  sans: 'Inter, sans-serif',
  mono: 'JetBrains Mono, monospace',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
} as const;

export const borderRadius = {
  sm: '0.25rem',
  md: '0.5rem',
  lg: '1rem',
  full: '9999px',
} as const;
