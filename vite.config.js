import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3007,
    allowedHosts: ['sale.ecosmartgroup.vn']
  }
})
