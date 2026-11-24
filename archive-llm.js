/* Ask the Archive: written answers from a language model that runs on the visitor's own device.
 *
 * Nothing here downloads anything until the visitor chooses to set up written answers. Then a module worker
 * (archive-worker.js) loads WebLLM and the chosen model. This file only checks what the device can do, keeps
 * the list of models, and passes messages to and from the worker.
 *
 * To change the model, edit MODELS below (any model in WebLLM's prebuilt list works), add its size to
 * tools/build-archive.py, and rebuild. Nothing else needs to change.
 */
(function (root) {
    'use strict';

    // Qwen3 (Apache-2.0) in the 4-bit builds WebLLM publishes. "f16" needs the shader-f16 GPU feature; "f32" works without it.
    var MODELS = [
        { key: 'standard', name: 'Standard', f16: 'Qwen3-1.7B-q4f16_1-MLC', f32: 'Qwen3-1.7B-q4f32_1-MLC', gpuMB: { f16: 2040, f32: 2640 },
          about: 'Good for most laptops, desktop computers and recent phones.' },
        { key: 'larger', name: 'More detailed', f16: 'Qwen3-4B-q4f16_1-MLC', f32: 'Qwen3-4B-q4f32_1-MLC', gpuMB: { f16: 3440, f32: 4330 },
          about: 'Writes better answers, but needs a recent computer with plenty of memory. Not suited to phones.' }
    ];

    // what this browser and device can do; nothing is sent anywhere
    function detect() {
        var out = { webgpu: false, f16: false, worker: typeof Worker !== 'undefined', reason: null, deviceMemory: (typeof navigator !== 'undefined' && navigator.deviceMemory) || null,
                    mobile: typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ''), storage: null };
        var steps = [];
        if (typeof navigator === 'undefined' || !navigator.gpu) out.reason = 'no-webgpu';
        else steps.push(navigator.gpu.requestAdapter({ powerPreference: 'high-performance' }).then(function (ad) {
            if (!ad) { out.reason = 'no-adapter'; return; }
            out.webgpu = true;
            out.f16 = ad.features && ad.features.has('shader-f16');
            out.maxBuffer = ad.limits && ad.limits.maxBufferSize;
            out.maxStorage = ad.limits && ad.limits.maxStorageBufferBindingSize;
        }).catch(function () { out.reason = 'adapter-error'; }));
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) steps.push(navigator.storage.estimate().then(function (e) { out.storage = { quota: e.quota, usage: e.usage }; }).catch(function () {}));
        if (!out.worker) out.reason = 'no-worker';
        return Promise.all(steps).then(function () { if (!out.worker) out.webgpu = false; return out; });
    }
    function model(key) { return MODELS.filter(function (m) { return m.key === key; })[0] || MODELS[0]; }
    function idFor(key, caps) { var m = model(key); return caps && caps.f16 ? m.f16 : m.f32; }
    // can this device reasonably run this model? 'yes', 'maybe' (with reasons) or 'no'
    function verdict(key, caps, bytes) {
        var m = model(key), notes = [], v = 'yes';
        if (!caps.webgpu) return { v: 'no', notes: [caps.reason === 'no-worker' ? 'This browser cannot run background tasks.' : 'This browser does not offer WebGPU, which the written answers need.'] };
        var free = caps.storage && caps.storage.quota ? caps.storage.quota - (caps.storage.usage || 0) : null;
        if (free != null && bytes && free < bytes * 1.15) return { v: 'no', notes: ['There is not enough free storage for the download (about ' + mb(bytes) + ' is needed).'] };
        var gpu = caps.f16 ? m.gpuMB.f16 : m.gpuMB.f32;
        if (caps.deviceMemory && caps.deviceMemory * 1024 < gpu * 1.6) { v = 'maybe'; notes.push('This device reports ' + caps.deviceMemory + ' GB of memory, which may not be enough.'); }
        if (caps.maxBuffer && caps.maxBuffer < 256 * 1024 * 1024) { v = 'maybe'; notes.push('The graphics card allows only small buffers, so loading may fail.'); }
        if (caps.mobile) { v = key === 'larger' ? 'no' : (v === 'yes' ? 'maybe' : v); notes.push(key === 'larger' ? 'The larger model is too big for most phones.' : 'Phones can run it, but slowly, and some will run out of memory.'); }
        if (!caps.f16) notes.push('This graphics card uses the slightly larger build without 16-bit maths.');
        return { v: v, notes: notes, gpuMB: gpu };
    }
    function mb(bytes) { return bytes >= 1e9 ? (bytes / 1e9).toFixed(1) + ' GB' : Math.round(bytes / 1e6) + ' MB'; }

    // ---------------------------------------------------------------- the engine, in a worker
    function Engine(opts) {
        opts = opts || {};
        var self = this, w = null, waiting = {}, seq = 0, progressCb = null, loadP = null;
        var backend = root.__ASK_TEST_BACKEND || null;   // a stand-in used by the automated tests only
        function start() {
            if (w) return w;
            w = backend ? backend.createWorker() : new Worker(opts.worker || 'archive-worker.js', { type: 'module' });
            w.onmessage = function (ev) {
                var m = ev.data || {};
                if (m.type === 'progress' && progressCb) progressCb(m);
                var k = m.type === 'cached' ? 'cached:' + m.model : m.type === 'loaded' ? 'load' : m.type === 'removed' ? 'remove:' + m.model : m.type === 'unloaded' ? 'unload' : m.id != null ? 'gen:' + m.id : null;
                if (m.type === 'token' && waiting['gen:' + m.id] && waiting['gen:' + m.id].onToken) waiting['gen:' + m.id].onToken(m.delta);
                if (m.type === 'error') {
                    var key = m.id != null && waiting['gen:' + m.id] ? 'gen:' + m.id : waiting.load ? 'load' : Object.keys(waiting)[0];
                    if (key && waiting[key]) { waiting[key].reject(Object.assign(new Error(m.message), { name: m.name })); delete waiting[key]; }
                    return;
                }
                if (k && waiting[k] && m.type !== 'token') { waiting[k].resolve(m); delete waiting[k]; }
            };
            w.onerror = function (e) {
                var err = new Error((e && e.message) || 'The model could not start.');
                Object.keys(waiting).forEach(function (k) { waiting[k].reject(err); delete waiting[k]; });
            };
            return w;
        }
        function call(key, msg, extra) {
            start();
            return new Promise(function (res, rej) { waiting[key] = Object.assign({ resolve: res, reject: rej }, extra || {}); w.postMessage(msg); });
        }
        self.cached = function (id) { return call('cached:' + id, { type: 'cached', model: id }).then(function (m) { return !!m.cached; }).catch(function () { return false; }); };
        self.load = function (id, onProgress) {
            progressCb = onProgress || null;
            loadP = call('load', { type: 'load', model: id }).then(function () { self.model = id; return id; });
            return loadP;
        };
        self.generate = function (messages, maxTokens, onToken) {
            var id = ++seq, t0 = Date.now(), first = null;
            return call('gen:' + id, { type: 'generate', id: id, messages: messages, maxTokens: maxTokens }, {
                onToken: function (d) { if (first == null) first = Date.now() - t0; if (onToken) onToken(d); }
            }).then(function (m) { return { text: m.text, usage: m.usage, ms: Date.now() - t0, firstTokenMs: first }; });
        };
        self.stop = function () { if (w) w.postMessage({ type: 'stop' }); };
        self.remove = function (id) { return call('remove:' + id, { type: 'remove', model: id }).then(function () { self.model = null; }); };
        // stopping a download, or leaving the page: end the worker (shards already downloaded stay cached)
        self.terminate = function () {
            if (w) { w.terminate(); w = null; }
            Object.keys(waiting).forEach(function (k) { waiting[k].reject(Object.assign(new Error('Stopped'), { name: 'AbortError' })); delete waiting[k]; });
            self.model = null;
        };
        self.model = null;
    }

    // what to tell the visitor when loading fails, in plain words
    function explain(err) {
        var msg = String((err && err.message) || err || '');
        if (/AbortError|Stopped/i.test((err && err.name) + msg)) return 'The download was stopped. Anything already downloaded is kept, so it will carry on from there next time.';
        if (/quota|storage|QuotaExceeded/i.test(msg)) return 'The browser ran out of storage space for the model. Free some space, or use the quick answers, which need no download.';
        if (/shader-f16|feature/i.test(msg)) return 'This graphics card is missing a feature the model needs.';
        if (/device (was )?lost|out of memory|OOM|allocation|buffer/i.test(msg)) return 'The device ran out of graphics memory while starting the model. Close other tabs and try again, or use the quick answers.';
        if (/fetch|network|Failed to fetch|NetworkError|load failed/i.test(msg)) return 'The download was interrupted. Check the connection and try again; what was already downloaded is kept.';
        if (/WebGPU|adapter|gpu/i.test(msg)) return 'WebGPU could not start on this device. The quick answers still work.';
        return 'The written answers could not start (' + msg.slice(0, 140) + '). The quick answers still work.';
    }

    var api = { MODELS: MODELS, detect: detect, idFor: idFor, verdict: verdict, Engine: Engine, explain: explain, mb: mb, model: model };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ArchiveLLM = api;
})(typeof self !== 'undefined' ? self : this);
