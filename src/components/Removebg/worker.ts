// @ts-expect-error alpha version types broken
import { AutoModel, AutoProcessor, RawImage, env } from "@xenova/transformers"
import { isGpuSupported } from "~/lib/browser"

const supported = await isGpuSupported()
if (!supported) {
  throw new Error("WebGPU not supported")
}

// Since we will download the model from the Hugging Face Hub, we can skip the local model check
env.allowLocalModels = false

// Proxy the WASM backend to prevent the UI from freezing
env.backends.onnx.wasm.proxy = false // already in a worker

// https://github.com/xenova/transformers.js/pull/545
// Update wasmPaths and number of threads... This won't be needed in future.

env.backends.onnx.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.1/dist/"
env.backends.onnx.wasm.numThreads = 1

export type CreateTaskMsg = {
  id: number
  /**
   * The canvas to draw the output to
   */
  canvas: OffscreenCanvas
  imageUrl: string
}

export type ProcessMsg = {
  id: number
  status: "process"
}

export type ResultMsg = {
  id: number
  status: "complete"
  result: {
    time: number
  }
}
export type ErrorMsg = {
  id: number
  status: "error"
  error: Error
}

export type Msg =
  | {
      status: "initiate" | "ready"
    }
  | ErrorMsg
  | ProcessMsg
  | ResultMsg

export type Status = Msg["status"]

self.postMessage({ status: "initiate" } satisfies Msg)

const model_id = "briaai/RMBG-1.4"
const model = await AutoModel.from_pretrained(model_id, {
  device: "webgpu",
  dtype: "fp32", // TODO: add fp16 support
  config: {
    model_type: "custom",
  },
})

const processor = await AutoProcessor.from_pretrained(model_id, {
  // https://huggingface.co/briaai/RMBG-1.4/blob/main/preprocessor_config.json
  config: {
    do_normalize: true,
    do_pad: false,
    do_rescale: true,
    do_resize: true,
    image_mean: [0.5, 0.5, 0.5],
    feature_extractor_type: "ImageFeatureExtractor",
    image_std: [1, 1, 1],
    resample: 2,
    rescale_factor: 0.00392156862745098,
    size: { width: 1024, height: 1024 },
  },
})

self.postMessage({ status: "ready" } satisfies Msg)

// Listen for messages from the main thread
self.addEventListener("message", async (event: { data: CreateTaskMsg }) => {
  try {
    console.debug("[removebg] Received message", event.data)

    // https://github.com/xenova/transformers.js/blob/314b7f0dc4291e8a38a516073b710d7c6a29aefb/examples/remove-background-client/main.js#L23
    self.postMessage({
      id: event.data.id,
      status: "process",
    } satisfies Msg)

    // Read image
    const start = performance.now()
    let step = performance.now()
    const image = await RawImage.fromURL(event.data.imageUrl)
    console.debug("[removebg] Image loaded in", performance.now() - step, "ms")
    step = performance.now()

    // Preprocess image
    const { pixel_values } = await processor(image)
    console.debug("[removebg] Image preprocessed in", performance.now() - step, "ms")
    step = performance.now()

    // Predict alpha matte
    const { output } = await model({ input: pixel_values })
    console.debug("[removebg] Model ran in", performance.now() - step, "ms")
    step = performance.now()

    // Resize mask back to original size
    const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(image.width, image.height)
    console.debug("[removebg] Mask resized in", performance.now() - step, "ms")
    step = performance.now()

    // Use canvas
    const ctx = event.data.canvas.getContext("2d")!

    // Set container width and height depending on the image aspect ratio
    const ar = image.width / image.height
    // const [cw, ch] =
    //   ar > event.data.width / event.data.height
    //     ? [event.data.width, event.data.width / ar]
    //     : [event.data.height * ar, event.data.height]
    // canvasConatiner.style.width = cw
    // canvasConatiner.style.height = ch

    event.data.canvas.width = image.width
    event.data.canvas.height = image.height

    // Draw original image output to canvas
    ctx.drawImage(image.toCanvas(), 0, 0)
    console.debug("[removebg] Image drawn in", performance.now() - step, "ms")
    step = performance.now()

    // Update alpha channel
    const pixelData = ctx.getImageData(0, 0, image.width, image.height)
    for (let i = 0; i < mask.data.length; ++i) {
      pixelData.data[4 * i + 3] = mask.data[i]
    }
    ctx.putImageData(pixelData, 0, 0)
    console.debug("[removebg] Alpha channel updated in", performance.now() - step, "ms")
    step = performance.now()

    // Send the output back to the main thread
    self.postMessage({
      id: event.data.id,
      status: "complete",
      result: {
        time: performance.now() - start,
      },
    } satisfies Msg)
  } catch (e) {
    console.error(e)
    self.postMessage({
      id: event.data.id,
      status: "error",
      error: e instanceof Error ? e : new Error("Unknown error"),
    } satisfies Msg)
  }
})
