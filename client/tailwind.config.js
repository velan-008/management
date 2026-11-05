/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#F8F8F8', // Light Background
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#0B1120', // Dark Navy
          950: '#060A14',
        },
        gold: {
          50: '#FDFBF4',
          100: '#FAF5E8',
          200: '#F4E7C4',
          300: '#EBD496',
          400: '#E0C068',
          500: '#D4AF37', // Primary Golden
          600: '#B89326',
          700: '#917118',
          800: '#6E5513',
          900: '#4D3B0D',
        },
        navy: {
          600: '#233354',
          700: '#1B2640',
          750: '#162038',
          800: '#121A2D',
          850: '#0E1627',
          900: '#0B1120', // Dark Navy
          950: '#060A14',
        },
        brand: {
          50: '#FAF5E8',
          100: '#F4E7C4',
          200: '#EBD496',
          300: '#E0C068',
          400: '#D4AF37',
          500: '#B89326',
          600: '#1B2640',
          700: '#162038',
          800: '#121A2D',
          900: '#0B1120',
          950: '#060A14',
        },
        accent: {
          50: '#FDFBF4',
          100: '#FAF5E8',
          200: '#F4E7C4',
          500: '#D4AF37',
          600: '#B89326',
          700: '#917118',
        }
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(11, 17, 32, 0.04), 0 1px 3px 0 rgba(11, 17, 32, 0.02)',
        card: '0 1px 3px 0 rgba(11, 17, 32, 0.06), 0 1px 2px -1px rgba(11, 17, 32, 0.06)',
        popup: '0 10px 25px -3px rgba(11, 17, 32, 0.15), 0 4px 6px -4px rgba(11, 17, 32, 0.1)',
        gold: '0 0 0 1px #D4AF37, 0 4px 12px rgba(212, 175, 55, 0.25)',
      }
    },
  },
  plugins: [],
};
