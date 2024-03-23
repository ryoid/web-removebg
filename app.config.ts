import { defineConfig } from "@solidjs/start/config"
import { FontaineTransform } from "fontaine"

export default defineConfig({
  server: {
    preset: "cloudflare-pages",
    rollupConfig: {
      external: ["__STATIC_CONTENT_MANIFEST", "node:async_hooks"],
    },
  },
  vite: {
    worker: {
      format: "es",
    },
    plugins: [
      FontaineTransform.vite({
        fallbacks: ["BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans"],
        resolvePath: (id) => {
          // id is the font src value in the CSS
          if (id.startsWith("http")) {
            return new URL(id)
          }
          return new URL(`.${id}`, import.meta.url)
        },
      }),
    ],
  },
})
