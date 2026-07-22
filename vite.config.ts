import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 允许局域网 / Cloudflare Tunnel 访问（不能只绑 127.0.0.1）
    host: true,
    // Tunnel 随机域名不会触发 Vite Host check 拦截
    allowedHosts: true,
    strictPort: true,
  },
  preview: {
    port: 5173,
    host: true,
    allowedHosts: true,
    strictPort: true,
  },
});
