import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // client/public/pixel-ui.* are symlinks into ../.claude/skills/pixel-ui/,
    // so the dev server needs to be allowed to read outside client/.
    fs: { allow: ['..'] },
  },
})
