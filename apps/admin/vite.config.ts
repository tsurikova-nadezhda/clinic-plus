import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// React + Vite, без SSR (SPEC §2).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
