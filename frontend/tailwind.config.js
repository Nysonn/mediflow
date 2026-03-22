/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Andika', 'sans-serif'],
      },
      colors: {
        'scrubs-blue': '#6B8CAE',
        'scrubs-dark': '#4A6D8C',
        'navy-deep': '#2C3E6B',
        'coat-white': '#ffffff',
        'ward-grey': '#F4F6F8',
        'border-cool': '#DDE3EA',
        'text-primary': '#1A2535',
        'text-secondary': '#6B7A8D',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mediflow: {
          "primary": "#6B8CAE",
          "primary-content": "#ffffff",
          "secondary": "#4A6D8C",
          "secondary-content": "#ffffff",
          "accent": "#2C3E6B",
          "accent-content": "#ffffff",
          "neutral": "#1A2535",
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#F4F6F8",
          "base-300": "#DDE3EA",
          "base-content": "#1A2535",
          "info": "#6B8CAE",
          "info-content": "#ffffff",
          "success": "#5B8A6F",
          "success-content": "#ffffff",
          "warning": "#B8860B",
          "warning-content": "#ffffff",
          "error": "#C0392B",
          "error-content": "#ffffff",
        },
      },
    ],
    defaultTheme: "mediflow",
  },
}
