import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Manus Preview 通过带端口的转发域名访问本服务
    allowedHosts: true,
  },
})
