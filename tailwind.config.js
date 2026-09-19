/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* `wine` is the brand ramp. The name is kept so every component that
           already references it recolours from this one place. */
        wine: {
          DEFAULT: '#E01B6A',
          50: '#FFF1F6',
          100: '#FFD9E7',
          200: '#FFB3CF',
          300: '#FF80AF',
          400: '#F94D8E',
          500: '#E01B6A',
          600: '#C4135A',
          700: '#A00E49',
          800: '#7A0A38',
          900: '#4F0624',
        },
        gold: {
          DEFAULT: '#F5C24B',
          soft: '#FDF1D6',
          deep: '#B98A18',
        },
        blush: '#FFF1F6',
        canvas: '#FFFBFC',
        ink: '#1A0E14',
        muted: '#7A6570',
        rose: '#C4478A',
        line: '#F6E3EB',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '16px' },
      boxShadow: {
        card: '0 1px 2px rgba(26,14,20,0.04), 0 8px 24px -16px rgba(26,14,20,0.16)',
        lift: '0 12px 40px -18px rgba(26,14,20,0.28)',
        drawer: '0 0 60px rgba(26,14,20,0.24)',
        glow: '0 8px 28px -12px rgba(224,27,106,0.45)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up .45s cubic-bezier(.22,1,.36,1) both',
        'fade-in': 'fade-in .3s ease both',
      },
    },
  },
  plugins: [],
}
