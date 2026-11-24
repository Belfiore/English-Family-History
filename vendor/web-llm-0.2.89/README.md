# WebLLM 0.2.89

`web-llm.js` is the `@mlc-ai/web-llm` package, version 0.2.89, bundled into one minified ES module so that the site never loads it from a CDN. `LICENSE` is the package's own licence (Apache License 2.0).

Only `archive-worker.js` imports it, inside a Web Worker, and only after a visitor chooses to set up written answers on `ask.html`.

To replace it with a newer version (say 0.2.90):

```sh
mkdir /tmp/webllm && cd /tmp/webllm
npm install @mlc-ai/web-llm@0.2.90 esbuild
npx esbuild node_modules/@mlc-ai/web-llm/lib/index.js --bundle --format=esm --minify --outfile=web-llm.js
```

Then copy `web-llm.js` and `node_modules/@mlc-ai/web-llm/LICENSE` into a new `vendor/web-llm-0.2.90/` folder, change the import at the top of `archive-worker.js`, check that the model ids in `archive-llm.js` are still in the package's built-in model list, and run `tests/archive-eval.html` on a machine with WebGPU. See `docs/ask-the-archive.md`.
