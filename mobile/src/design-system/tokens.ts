// Design tokens TIKEXO Mobile
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
  background: '#F1F5F9',
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
} as const;

export const borderRadius = {
  sm: 4, md: 8, lg: 16, xl: 24, full: 9999,
} as const;

export const fontSize = {
  xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 32,
} as const;

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
