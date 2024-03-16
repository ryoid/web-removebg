import { useLocation } from "@solidjs/router"

export default function Nav() {
  const location = useLocation()
  const active = (path: string) =>
    path == location.pathname ? "-mb-px border-b border-zinc-400" : "-mb-px border-transparent hover:border-zinc-400"
  return (
    <nav class="border-b border-zinc-200">
      <ul class="container flex items-center px-3">
        <li class={`${active("/")} font-medium text-sm py-3.5 px-1.5 text-zinc-600 hover:text-zinc-900`}>
          <a class="hover:bg-zinc-50 transition rounded px-2 py-1" href="/">
            Home
          </a>
        </li>
      </ul>
    </nav>
  )
}
