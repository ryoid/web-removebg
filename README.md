# web-removebg

Image background removal locally in browser with WebGPU.

Powered by [transformers.js](http://github.com/xenova/transformers.js) and [BRIA AI RMBG 1.4](https://huggingface.co/briaai/RMBG-1.4)

## Developing

This project was created with [`solid-start`](https://start.solidjs.com);

```bash
pnpm install

pnpm dev
# or start the server and open the app in a new browser tab
pnpm dev -- --open
```

## Building

Solid apps are built with _presets_, which optimise your project for deployment to different environments.

By default, `pnpm build` will generate an app to deploy to Vercel.
