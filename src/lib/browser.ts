import { createSignal, onMount } from "solid-js"
import { isServer } from "solid-js/web"

/**
 * Gets a Promise<boolean> indicating if the engine can be instantiated (ie. if a WebGPU context can be found)
 */
export async function isGpuSupported(): Promise<Boolean> {
  if (isServer) return true
  if (!navigator.gpu) {
    return false
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      console.error("Couldn't request WebGPU adapter.")
      return false
    }
  } catch (e) {
    console.error(e)
  }
  return true
}

/** '⌘' command key */
const COMMAND_KEY = "\u2318"

export const useCommandKey = () => {
  const [commandKey, setCommandKey] = createSignal("Ctrl")
  onMount(() => {
    // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/platform#examples
    const isMac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform) || /(mac)/i.test(navigator.userAgent)

    if (isMac) {
      setCommandKey(COMMAND_KEY)
    } else {
      setCommandKey("Ctrl")
    }
  })
  return commandKey
}
