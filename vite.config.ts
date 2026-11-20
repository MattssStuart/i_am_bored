import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works under any GitHub Pages path
  // (e.g. https://<username>.github.io/i_am_bored/)
  base: './',
})
