import { Index, Match, Show, Switch, batch, createSignal, onCleanup, onMount, type Component } from "solid-js"
import { createStore } from "solid-js/store"
import { Dynamic } from "solid-js/web"
import {
  CheckCircleIcon,
  DoubleTickIcon,
  DownloadIcon,
  PhotoIcon,
  RobotDeadFillIcon,
  RobotDeadIcon,
  RobotExcitedIcon,
  Spinner,
} from "~/components/Icons"
import { isGpuSupported, useCommandKey } from "~/lib/browser"
import { cn } from "~/lib/cn"
import { guarded } from "~/lib/primitives"

import type { CreateTaskMsg, Msg } from "./worker"
// @ts-ignore
import RemovebgWorker from "./worker?worker"

type AfterPendingMsg = Exclude<Msg, { status: "initiate" | "ready" }> & {
  imageUrl: string
}

type TaskMsg = ((Omit<CreateTaskMsg, "canvas"> & { status: "pending" }) | AfterPendingMsg) & {
  canvas: HTMLCanvasElement
  fileName?: string
}

const AppStatusText = {
  initiate: "Initializing app. Please wait...",
  ready: "Model Loaded. Ready to process image",
  process: "Processing image",
} as const

type AppStatus = keyof typeof AppStatusText

const AppStatusIcon: Record<
  keyof typeof AppStatusText,
  Component<{
    class?: string
  }>
> = {
  initiate: Spinner,
  ready: RobotExcitedIcon,
  process: RobotExcitedIcon,
}

export function RemovebgApp() {
  const [supported, setSupported] = createSignal<boolean>(true)
  const [status, setStatus] = createSignal<AppStatus>("initiate")
  const [messages, setMessages] = createStore<TaskMsg[]>([])

  // Register worker and handle messages
  let worker: Worker
  let tasks: CreateTaskMsg[] = []
  function nextTask() {
    if (tasks.length === 0 || status() === "process") {
      return
    }
    const task = tasks.shift()
    if (task) {
      setStatus("process")
      worker.postMessage(task, [task.canvas])
    }
  }
  onMount(async () => {
    if (!window.Worker) {
      throw new Error("Web Workers are not supported in this browser. Try using Chrome on Desktop")
    }
    if (!("OffscreenCanvas" in window)) {
      throw new Error("OffscreenCanvas in worker is not supported by browser. Try using Chrome on Desktop")
    }
    if (!(await isGpuSupported())) {
      setSupported(false)
      throw new Error("WebGPU not supported. Try using Chrome on Desktop")
    }
    // worker = new Worker(new URL("../workers/removebg.ts", import.meta.url), { type: "module" })
    worker = new RemovebgWorker()

    // Create a callback function for messages from the worker thread.
    const onMessageReceived = (e: MessageEvent<Msg>) => {
      console.debug("[removebg] onMessage", e.data)
      batch(() => {
        switch (e.data.status) {
          case "initiate":
          case "ready":
            setStatus(e.data.status)
            break
          case "error":
            console.error(e.data.error)
            setStatus("ready")
            setMessages(e.data.id, "status", e.data.status)
            setMessages(e.data.id, "error" as any, e.data.error)
            nextTask()
            break
          case "complete":
            setStatus("ready")
            setMessages(e.data.id, "status", e.data.status)
            setMessages(e.data.id, "result" as any, e.data.result)
            nextTask()
            break
          case "process":
            setStatus("process")
            setMessages(e.data.id, "status", e.data.status)
            break
          default:
            throw new Error(`Unhandled message`)
        }
      })
    }
    // Attach the callback function as an event listener.
    worker.addEventListener("message", onMessageReceived)

    // Define a cleanup function for when the component is unmounted.
    onCleanup(() => worker.removeEventListener("message", onMessageReceived))
  })

  // Send message to worker
  function createTask(
    payload: Omit<CreateTaskMsg, "id" | "canvas"> & {
      fileName?: string
    }
  ) {
    // Create canvas to allow resubmission
    const canvas = document.createElement("canvas")
    canvas.style.height = "100%"
    canvas.style.width = "100%"
    canvas.style.objectFit = "contain"
    const offscreen = canvas.transferControlToOffscreen()

    const message: CreateTaskMsg = {
      id: messages.length,
      canvas: offscreen,
      imageUrl: payload.imageUrl,
    }
    setMessages(message.id, {
      ...message,
      status: "pending",
      canvas,
      fileName: payload.fileName,
    })
    // Enqueue task
    tasks.push(message)
    nextTask()
  }

  function createTaskFromUrl(value: string) {
    // Handle urls with no protocol
    if (!value.startsWith("http")) {
      value = "https://" + value
    }
    let url: URL | undefined
    try {
      url = new URL(value)
    } catch (e) {}
    if (!url) {
      alert("Invalid url. Please enter a valid URL")
      return
    }
    const fileName = url.hostname + url.pathname
    if (fileName === "") {
      alert("Invalid url. Please enter a valid URL")
      return
    }
    createTask({ imageUrl: value, fileName })
  }

  function createTaskFromFile(file: File) {
    if (!file.type.startsWith("image/")) {
      console.warn(`File type ${file.type} not supported`, file.name)
      return
    }
    const imageUrl = URL.createObjectURL(file)
    createTask({ imageUrl, fileName: file.name })
  }

  function createTaskFromFileList(files: FileList) {
    for (const file of files) {
      createTaskFromFile(file)
    }
  }

  function createTaskFromDataTransfer(dt: DataTransfer) {
    for (const item of dt.items) {
      if (item.kind === "file") {
        const file = item.getAsFile()
        if (!file) {
          console.warn(`DataTransferItem.getAsFile() returned null`, item)
          continue
        }
        createTaskFromFile(file)
      }
      if (item.kind === "string") {
        if (item.type !== "text/plain") {
          console.warn(`DataTransferItem type ${item.type} not supported`)
          continue
        }
        item.getAsString((str) => {
          let value = str.trim()
          if (!value || value === "") {
            alert("Invalid url. Please enter a valid URL")
            return
          }
          createTaskFromUrl(value)
        })
      }
    }
  }

  // Handle paste
  onMount(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!e.clipboardData) {
        return
      }
      e.preventDefault()

      createTaskFromDataTransfer(e.clipboardData)
    }
    window.addEventListener("paste", handlePaste)
    onCleanup(() => window.removeEventListener("paste", handlePaste))
  })

  const commandKey = useCommandKey()
  const disabled = () => ["initiate", "processing"].includes(status())

  return (
    <Show
      when={supported()}
      fallback={
        <div class="flex flex-col gap-4">
          <h2 class="flex items-center mx-2 xs:mx-4 md:mx-0 text-balance">
            Browser does not support WebGPU. Try using Chrome on Desktop
          </h2>
          <div class="md:rounded-2xl bg-zinc-100 flex flex-col items-center justify-center text-center px-4 sm:px-8 py-12 text-pretty">
            <RobotDeadFillIcon class="h-14 w-14 text-zinc-600" />
            <h3 class="font-medium">Unsupported browser</h3>
          </div>
        </div>
      }
    >
      <form
        class="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <h2 class="flex items-center mx-2 xs:mx-4 md:mx-0 text-balance">
          <Dynamic
            class={cn("h-4 w-4 inline mr-1.5 text-zinc-600 max-xs:hidden", {
              // Visual center
              "h-4.5 w-4.5 -mt-px": ["ready"].includes(status()),
            })}
            component={AppStatusIcon[status()]}
          />
          {AppStatusText[status()]}
        </h2>

        <input
          class="hidden peer"
          id="image"
          type="file"
          multiple={true}
          accept="image/*"
          onInput={(e) => {
            if (!e.currentTarget.files) {
              return
            }
            createTaskFromFileList(e.currentTarget.files)
          }}
          disabled={disabled()}
        />
        <label
          for="image"
          class="md:rounded-2xl bg-zinc-100 flex items-center flex-col py-12 px-4 sm:px-8 justify-center relative overflow-hidden peer-disabled:cursor-wait cursor-pointer group peer-enabled:hover:ring-zinc-200 ring-2 ring-transparent transition max-w-[100vw] md:-mx-4"
          role="button"
          title={disabled() ? "Please wait" : "Click to upload image"}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()

            if (!e.dataTransfer) {
              return
            }
            createTaskFromDataTransfer(e.dataTransfer)
          }}
        >
          <button
            type="button"
            class="bg-blue-600 pointer-events-none text-zinc-100 font-medium rounded-full px-10 py-2.5 transition group-hover:bg-blue-700"
          >
            Upload <span class="max-xs:hidden">Image</span>
          </button>
          <ul class="text-zinc-800 text-sm mt-2 space-y-1.5 text-pretty">
            <li class="max-xs:hidden">Drag and drop an image here</li>
            <li class="max-xs:hidden">
              Paste image
              <kbd class="ml-1 text-xs font-sans p-0.5 border border-zinc-400 text-zinc-500 font-medium rounded max-xs:hidden">
                {commandKey()} V
              </kbd>
            </li>
            <li>
              <button
                type="button"
                class="underline hover:text-blue-600 transition underline-offset-2"
                onClick={() => {
                  let value = prompt("Enter an image URL", "")?.trim()
                  if (!value || value === "") {
                    alert("Invalid url. Please enter a valid URL")
                    return
                  }
                  createTaskFromUrl(value)
                }}
              >
                Enter an image url
              </button>
            </li>
          </ul>
        </label>
      </form>

      <Show when={messages.length > 0}>
        <div class="mx-2 xs:mx-4 md:mx-0">
          <h2 class="font-semibold text-balance mt-8 mb-1 text-xl">Images</h2>
          <div class="mb-3 text-sm text-zinc-700 text-pretty">
            Images are processed in the order they were added. Images are not stored beyond the current session.
          </div>
        </div>
      </Show>
      <ol>
        <Index each={messages}>{(msg) => <TaskRow msg={msg()} />}</Index>
      </ol>
    </Show>
  )
}

const MsgStatusText = {
  pending: "Pending",
  initiate: "Initializing",
  ready: "Model Loaded. Ready to process image",
  process: "Processing image",
  error: "Error. Refresh and try again",
  complete: "Done",
} as const

const MsgStatusIcon: Record<
  keyof typeof MsgStatusText,
  Component<{
    class?: string
  }>
> = {
  pending: Spinner,
  initiate: Spinner,
  ready: RobotExcitedIcon,
  process: Spinner,
  error: RobotDeadIcon,
  complete: DoubleTickIcon,
}

const TaskRow: Component<{ msg: TaskMsg }> = (props) => {
  let canvasContainer: HTMLDivElement
  onMount(() => {
    const canvas = props.msg.canvas
    if (canvas) {
      canvasContainer.appendChild(canvas)
    }
    onCleanup(() => {
      if (canvas) {
        canvas.remove()
      }
    })
  })
  return (
    <li class="mx-2 xs:mx-4 md:mx-0 flex items-center py-2">
      <div class="relative h-20 w-20 rounded-lg overflow-hidden shrink-0">
        <div
          class="absolute inset-0"
          ref={canvasContainer!}
          style={{
            background:
              props.msg.status === "complete"
                ? `url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAGUExURb+/v////5nD/3QAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAUSURBVBjTYwABQSCglEENMxgYGAAynwRB8BEAgQAAAABJRU5ErkJggg==")`
                : "none",
          }}
        />
        <img src={props.msg.imageUrl} class="h-20 w-20 rounded-lg object-cover" />
      </div>
      <div class="flex items-center justify-between gap-4 w-full ml-4">
        <div>
          <div class="flex items-center">
            <Dynamic
              class={cn("h-6 w-6 inline mr-1.5 text-zinc-600", {
                "text-red-500": props.msg.status === "error",
                // Visual center
                "h-5 w-5 -mt-px": ["ready", "complete", "error"].includes(props.msg.status),
                "mr-1": ["complete"].includes(props.msg.status),
              })}
              component={MsgStatusIcon[props.msg.status]}
            />
            {MsgStatusText[props.msg.status]}
          </div>

          <Switch>
            <Match when={guarded(props.msg, (m) => m.status === "error" && m)}>
              {(msg) => (
                <div class="flex">
                  <details class="bg-red-100 rounded pl-2 pr-1 py-0.5 text-sm max-w-screen-lg">
                    <summary class="cursor-pointer select-none text-red-900">{msg().error.message}</summary>
                    <div class="text-red-700 mt-1">{msg().error.name}</div>
                    <pre class="whitespace-pre mt-0.5 text-red-700/70">{JSON.stringify(msg().error, null, 2)}</pre>
                  </details>
                </div>
              )}
            </Match>
            <Match when={guarded(props.msg, (m) => m.status === "pending" && m)}>
              <div class="text-sm text-zinc-600">Waiting for previous image to complete</div>
            </Match>
            <Match when={guarded(props.msg, (m) => m.status === "complete" && m)}>
              {(msg) => (
                <div class="text-sm text-zinc-600">
                  Completed in{" "}
                  {(msg().result.time / 1000).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                  s
                </div>
              )}
            </Match>
          </Switch>
        </div>
        <div class="flex items-center gap-2 mt-0.5">
          <Show when={guarded(props.msg, (m) => m.status === "complete" && m)}>
            {(msg) => {
              let blob: Blob
              function makeBlob() {
                return new Promise((resolve) => {
                  msg().canvas.toBlob((b) => {
                    if (!b) {
                      return
                    }
                    blob = b
                    resolve(undefined)
                  }, "image/png")
                })
              }

              const [saved, setSaved] = createSignal(false)
              let savedTimeout: ReturnType<typeof setTimeout>
              async function download() {
                let ogName = msg().fileName
                let fileName: string
                if (ogName) {
                  fileName = "removebg-" + ogName
                  if (!fileName.endsWith(".png")) {
                    fileName += ".png"
                  }
                } else {
                  fileName = "removebg.png"
                }
                if (!blob) {
                  await makeBlob()
                }
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = fileName
                a.click()
                URL.revokeObjectURL(url)
                setSaved(true)
                copiedTimeout = setTimeout(() => setSaved(false), 2000)
              }
              onCleanup(() => clearTimeout(savedTimeout))

              // Copy raw data
              const [copied, setCopied] = createSignal(false)
              let copiedTimeout: ReturnType<typeof setTimeout>
              async function copy() {
                if (!blob) {
                  await makeBlob()
                }
                const buffer = await blob.arrayBuffer()
                await navigator.clipboard.write([
                  new ClipboardItem({
                    [blob.type]: new Blob([buffer], { type: blob.type }),
                  }),
                ])
                setCopied(true)
                copiedTimeout = setTimeout(() => setCopied(false), 2000)
              }
              onCleanup(() => clearTimeout(copiedTimeout))

              return (
                <>
                  <button
                    type="button"
                    onClick={copy}
                    class={cn(
                      "ring-1 rounded-full px-4 py-1.5 ring-zinc-200 hover:bg-zinc-50 transition hover:text-zinc-900 text-zinc-700 hover:ring-zinc-300",
                      {
                        "!text-green-600 !ring-green-600 !bg-green-50": copied(),
                      }
                    )}
                  >
                    <Show when={!copied()} fallback={<CheckCircleIcon class="h-5 w-5 inline mr-1 -mt-px" />}>
                      <PhotoIcon class="h-5 w-5 inline mr-1 -mt-px" />
                    </Show>
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={download}
                    class={cn(
                      "ring-1 rounded-full px-4 py-1.5 ring-zinc-200 hover:bg-zinc-50 transition hover:text-zinc-900 text-zinc-700 hover:ring-zinc-300",
                      {
                        "!text-blue-600 !ring-blue-600 !bg-blue-50": saved(),
                      }
                    )}
                  >
                    <DownloadIcon class="h-5 w-5 inline mr-1 -mt-px" />
                    Save
                  </button>
                </>
              )
            }}
          </Show>
        </div>
      </div>
    </li>
  )
}
