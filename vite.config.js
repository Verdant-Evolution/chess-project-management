import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/chess-project-management/",
  plugins: [react()],
});
