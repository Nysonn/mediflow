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
        'clinical-blue': '#1D4ED8',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        mediflow: {
          "primary": "#1D4ED8",
          "primary-content": "#ffffff",
          "secondary": "#7C3AED",
          "secondary-content": "#ffffff",
          "accent": "#0EA5E9",
          "neutral": "#374151",
          "base-100": "#ffffff",
          "base-200": "#F0F4FF",
          "base-300": "#E5E7EB",
          "base-content": "#111827",
          "info": "#0EA5E9",
          "success": "#16A34A",
          "warning": "#D97706",
          "error": "#DC2626",
        },
      },
    ],
    defaultTheme: "mediflow",
  },
}
