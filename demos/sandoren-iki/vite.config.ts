import { defineConfig } from "vite";

export default defineConfig({
  // iframe 挂在 /api/media/files/demos/sandoren-iki/v1/，必须用相对路径
  base: "./",
  server: {
    port: 5599,
    host: "127.0.0.1",
    strictPort: true,
  },
  build: {
    target: "es2022",
  },
});
