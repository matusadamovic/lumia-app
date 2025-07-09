import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
        fontFamily: {
          sans: [
            'var(--font-geist-sans)',
            'Apple Color Emoji',
            'Segoe UI Emoji',
            'Noto Color Emoji',
            'sans-serif',
          ],
          mono: ['var(--font-geist-mono)', 'monospace'],
        },
    },
  },
  plugins: [],
}
export default config
