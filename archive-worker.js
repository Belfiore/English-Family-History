/* Ask the Archive: the language model, in its own thread.
 *
 * Runs WebLLM (vendor/web-llm-0.2.89, Apache-2.0) on the visitor's own graphics card through WebGPU. The page
 * talks to this worker with a few plain messages, so the page itself never loads the 6 MB engine and the
 * page stays responsive while the model works. The model weights come from Hugging Face and the compiled model
 * library from GitHub, once, the first time the visitor chooses to set up written answers; the browser keeps
 * them in its cache after that. Questions and answers never leave the device.
 *
 *   in:  {type:'cached', model} {type:'load', model} {type:'generate', id, messages, maxTokens} {type:'stop'}
 *        {type:'unload'} {type:'remove', model}
 *   out: {type:'cached', model, cached} {type:'progress', progress, text, elapsed} {type:'loaded', model}
 *        {type:'token', id, delta} {type:'done', id, text, usage} {type:'error', id, message, name} {type:'removed', model}
 */
import * as webllm from './vendor/web-llm-0.2.89/web-llm.js';

let engine = null;
let loaded = null;
let busy = null;

function post(msg) { self.postMessage(msg); }
function fail(id, e) { post({ type: 'error', id: id, name: (e && e.name) || 'Error', message: String((e && e.message) || e) }); }

self.onmessage = async (ev) => {
    const m = ev.data || {};
    try {
        if (m.type === 'cached') {
            const cached = await webllm.hasModelInCache(m.model).catch(() => false);
            post({ type: 'cached', model: m.model, cached: !!cached });
        } else if (m.type === 'load') {
            if (loaded === m.model && engine) { post({ type: 'loaded', model: m.model }); return; }
            if (!engine) {
                engine = new webllm.MLCEngine({
                    initProgressCallback: (r) => post({ type: 'progress', progress: typeof r.progress === 'number' ? r.progress : null, text: String(r.text || ''), elapsed: r.timeElapsed || 0 })
                });
            }
            await engine.reload(m.model);
            loaded = m.model;
            post({ type: 'loaded', model: m.model });
        } else if (m.type === 'generate') {
            if (!engine || !loaded) throw new Error('The model is not loaded.');
            busy = m.id;
            let text = '';
            const stream = await engine.chat.completions.create({
                messages: m.messages,
                stream: true,
                stream_options: { include_usage: true },
                max_tokens: Math.min(m.maxTokens || 320, 700),
                temperature: 0.2,
                top_p: 0.9,
                // Qwen3: answer straight away, without a long hidden "thinking" pass
                extra_body: { enable_thinking: false }
            });
            let usage = null;
            for await (const chunk of stream) {
                const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
                if (delta) { text += delta; post({ type: 'token', id: m.id, delta: delta }); }
                if (chunk.usage) usage = chunk.usage;
            }
            busy = null;
            post({ type: 'done', id: m.id, text: text, usage: usage });
        } else if (m.type === 'stop') {
            if (engine) engine.interruptGenerate();
        } else if (m.type === 'unload') {
            if (engine) await engine.unload();
            engine = null; loaded = null;
            post({ type: 'unloaded' });
        } else if (m.type === 'remove') {
            if (engine && loaded === m.model) { await engine.unload(); engine = null; loaded = null; }
            await webllm.deleteModelAllInfoInCache(m.model);
            post({ type: 'removed', model: m.model });
        }
    } catch (e) {
        busy = null;
        fail(m.id, e);
    }
};
