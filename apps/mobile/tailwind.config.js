
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#f4f6fa',
        surface: '#ffffff',
        text: { DEFAULT: '#0f172a', muted: '#475569', meta: '#64748b' },
        border: { DEFAULT: '#cbd5e1', subtle: '#e2e8f0' },
        primary: { DEFAULT: '#2563eb', hover: '#1d4ed8', contrast: '#ffffff' },
        error: { DEFAULT: '#b91c1c', hover: '#7f1d1d' },
        success: '#15803d',
        accent: { warm: '#06b6d4' },
        badge: {
          'finished-bg': '#e2e8f0',
          'finished-text': '#475569',
          'upcoming-bg': '#fef3c7',
          'upcoming-text': '#92400e',
          'live-bg': '#d1fae5',
          'live-text': '#065f46',
          'host-bg': '#e0e7ff',
          'host-text': '#3730a3',
          'me-bg': '#dbeafe',
          'me-text': '#1e40af',
        },
      },
      borderRadius: {
        sm: '6px',
        md: '12px',
        lg: '18px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
