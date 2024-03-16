import { MetaProvider } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense } from "solid-js"
import "./app.css"

export default function App() {
  return (
    <MetaProvider>
      <Router
        root={(props) => (
          <div class="min-h-dvh flex flex-col">
            <nav class="container px-2 xs:px-4 md:px-0 py-6">
              <div class="flex font-medium text-sm items-center mb-1">
                <img src="/logo.svg" alt="logo" class="w-6 h-6 inline-block mr-2" />
                web-removebg
              </div>
            </nav>
            {/* <Nav /> */}
            <Suspense>{props.children}</Suspense>
          </div>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  )
}
