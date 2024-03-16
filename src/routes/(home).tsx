import { ErrorBoundary, Show } from "solid-js"
import { Link } from "~/components/Link"
import { RemovebgApp } from "~/components/Removebg"
import { guarded } from "~/lib/primitives"

export default function Home() {
  return (
    <main class="container mx-auto my-12">
      <div class="mx-2 xs:mx-4 md:mx-0 mb-12">
        {/* <div class="text-blue-600 font-medium text-sm">enchants.ai/removebg</div> */}
        <h1 class="font-semibold text-2xl text-balance mb-3">Remove Background from Image for free</h1>
        <p class="mb-2 text-balance">Runs locally in your browser</p>
        <ul class="text-sm text-zinc-800 text-pretty">
          <li>- Actually free, really</li>
          <li>- No sign up required</li>
          <li>- HD Original resolution</li>
          <li>- Bulk image background removal</li>
          <li>- We never see your images</li>
        </ul>
      </div>

      <ErrorBoundary
        fallback={(e) => {
          console.error("[RemovebgApp.ErrorBoundary]", e)
          return (
            <div class="bg-red-100 md:rounded-xl p-3 text-red-900">
              <h2 class="font-semibold mb-1">An error occured. Try refreshing the page.</h2>
              <p class="text-sm mb-1">{"If the problem persists, try using another device."}</p>
              <details class="bg-red-100 rounded text-xs max-w-screen-lg">
                <summary class="cursor-pointer select-none">{e instanceof Error ? e.message : "Unknown error"}</summary>
                <div class=" mt-1">{e.name ?? e.toString()}</div>
                <Show when={guarded(e, (e) => (e instanceof Error ? e : null))}>
                  {(e) => <pre class="whitespace-pre mt-0.5 opacity-70">{JSON.stringify(e, null, 2)}</pre>}
                </Show>
              </details>
            </div>
          )
        }}
      >
        <RemovebgApp />
      </ErrorBoundary>

      <div class="mt-24 mx-2 xs:mx-4 md:mx-0 text-pretty">
        <h2 class="font-semibold text-xl text-balance mt-8 mb-3">About</h2>
        Made by{" "}
        <Link variant="subtle" href="https://ryanjc.com" target="_blank">
          Ryan Conceicao
        </Link>
        <h3 class="font-semibold text-lg text-balance mt-8 mb-3">How it works</h3>
        <ul class="space-y-2">
          <li>
            WebGPU Background Removal using{" "}
            <Link variant="subtle" href="http://github.com/xenova/transformers.js" target="_blank">
              Transformers.js
            </Link>
          </li>
          <li>
            Runs locally in your browser, powered by the{" "}
            <Link variant="subtle" href="https://huggingface.co/briaai/RMBG-1.4" target="_blank">
              RMBG V1.4 model
            </Link>{" "}
            from{" "}
            <Link variant="subtle" href="https://bria.ai/" target="_blank">
              BRIA AI
            </Link>
          </li>
        </ul>
      </div>
    </main>
  )
}
