import { defineConfig } from "vite";
import pico from "@rusticstack/pico-reforged/vite";

export default defineConfig({
  plugins: [pico()],
});
