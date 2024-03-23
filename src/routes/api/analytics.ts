import type { APIEvent } from "@solidjs/start/server"
import type { CfPagesEnv } from "~/global"

export function GET(ev: APIEvent) {
  console.log("event", ev.nativeEvent.context)
  const env = (ev.nativeEvent.context.cloudflare?.env as CfPagesEnv) || undefined
  if (!env) {
    return new Response("Cloudflare environment not found", { status: 500 })
  }
  const url = new URL(ev.request.url)
  env.ANALYTICS_ENGINE.writeDataPoint({
    indexes: [],
    blobs: [url.hostname, url.pathname, url.search, url.hash],
    doubles: [],
  })
  return new Response("Cloudflare environment found", { status: 200 })
}
