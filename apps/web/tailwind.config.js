/** @type {import('tailwindcss').Config} */

// Semantic tokens resolve from CSS custom properties defined in globals.css, so a
// single class works in both themes and the palette swaps in one place. The brand
// ramp stays literal for the few places that need a specific step rather than a role.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/contexts/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Role tokens - theme-aware, no dark: variant needed
        wall: token('wall'),
        placard: token('placard'),
        ink: {
          DEFAULT: token('ink'),
          muted: token('ink-muted'),
        },
        rule: token('rule'),
        accent: {
          DEFAULT: token('accent'),
          contrast: token('accent-contrast'),
        },

        // Gold ramp. 500 is the dark-mode accent, 800 the light-mode accent.
        brand: {
          50: '#f6f3ea',
          100: '#ece4d0',
          200: '#e0d2ae',
          300: '#d3be88',
          400: '#cdb270',
          500: '#c7a75c',
          600: '#b08d36',
          700: '#907427',
          800: '#725b1d',
          900: '#524214',
        },
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'Times New Roman', 'serif'],
        data: ['var(--font-data)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.6' }],
        'lg': ['1.1875rem', { lineHeight: '1.5' }],
        'xl': ['1.5rem', { lineHeight: '1.3' }],
        '2xl': ['2rem', { lineHeight: '1.2' }],
        '3xl': ['2.75rem', { lineHeight: '1.12' }],
      },
      letterSpacing: {
        label: '0.14em',
        wordmark: '0.34em',
      },
      borderRadius: {
        // The placard is a printed card, not a pill. One tight radius, used sparingly.
        DEFAULT: '2px',
        sm: '2px',
        md: '3px',
        lg: '3px',
        xl: '4px',
        '2xl': '4px',
      },
      boxShadow: {
        // Tinted to the wall hue rather than pure black.
        plate: '0 18px 40px -28px rgb(var(--shadow) / 0.9)',
        lift: '0 2px 10px -6px rgb(var(--shadow) / 0.8)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        fast: '140ms',
        normal: '200ms',
        slow: '320ms',
        curtain: '900ms',
      },
      keyframes: {
        'entry-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      animation: {
        'entry-in': 'entry-in 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shake: 'shake 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}
