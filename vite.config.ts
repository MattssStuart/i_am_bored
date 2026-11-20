import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built site works under any GitLab Pages path
  // (e.g. https://<username>.gitlab.io/i_am_bored/)
  base: './',
})
