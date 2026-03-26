/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0a0f',
          card: '#12121a',
          hover: '#1a1a25',
          border: '#1e1e2e',
          muted: '#71717a',
          subtle: '#52525b',
          text: '#e4e4e7',
        },
        accent: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
        },
        chain: {
          ethereum: '#627EEA',
          base: '#0052FF',
          arbitrum: '#28A0F0',
          polygon: '#8247E5',
          bsc: '#F3BA2F',
        },
      },
    },
  },
  plugins: [],
}
