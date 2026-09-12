import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'window', // ఇది global ని window కి మ్యాప్ చేస్తుంది
  },
  server: {
    port: 2000, // మీ లాగ్స్ ప్రకారం సర్వర్ పోర్ట్ 2000 కాబట్టి ఇది సెట్ చేసుకోవచ్చు
    hmr: {
      host: 'localhost',
    }
  }
})