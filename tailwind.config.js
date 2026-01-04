/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Augusta Green palette
        'augusta-green': {
          50: '#f0f9f4',
          100: '#daf2e4',
          200: '#b7e5cb',
          300: '#86d1aa',
          400: '#54b585',
          500: '#2f9968',
          600: '#1f7a52',
          700: '#196143',
          800: '#164d36',
          900: '#13402e',
        },
        // Fairway grass tones
        'fairway': {
          light: '#8FBC8F',
          DEFAULT: '#6B8E23',
          dark: '#556B2F',
        },
        // Sand bunker tones
        'sand': {
          light: '#F5DEB3',
          DEFAULT: '#D2B48C',
          dark: '#BC9A6B',
        },
        // Sky/water tones
        'golf-blue': {
          light: '#B0C4DE',
          DEFAULT: '#4682B4',
          dark: '#36648B',
        },
        // Earth/clubhouse tones
        'clubhouse': {
          cream: '#FAF8F3',
          beige: '#E8E4DC',
          brown: '#8B7355',
          mahogany: '#4A3728',
        },
        // Accent colors
        'trophy-gold': '#D4AF37',
        'error-red': '#8B0000',
        'success-green': '#228B22',
      },
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'body': ['Merriweather', 'Georgia', 'serif'],
        'sans': ['Lato', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'headline': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'stagger-1': 'fadeIn 0.4s ease-in-out 0.1s both',
        'stagger-2': 'fadeIn 0.4s ease-in-out 0.2s both',
        'stagger-3': 'fadeIn 0.4s ease-in-out 0.3s both',
        'stagger-4': 'fadeIn 0.4s ease-in-out 0.4s both',
        'stagger-5': 'fadeIn 0.4s ease-in-out 0.5s both',
        'stagger-6': 'fadeIn 0.4s ease-in-out 0.6s both',
        'stagger-7': 'fadeIn 0.4s ease-in-out 0.7s both',
        'stagger-8': 'fadeIn 0.4s ease-in-out 0.8s both',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
      boxShadow: {
        'country-club': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'elevated': '0 8px 30px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
