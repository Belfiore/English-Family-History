/*
 * Ask the Archive evaluation page (tests/archive-eval.html).
 *
 * Runs the question set in tests/archive-eval.json through the archive in a real browser:
 *   quick answers: the same pass/fail rules as tests/verify-archive.js
 *   written answers: the on-device model writes each answer that the page would offer to write,
 *     the answer is vetted exactly as on ask.html, and the page records what was kept, what was
 *     left out, whether it cited its records, how many of the expected facts it kept, and timings.
 * Results can be downloaded as JSON for docs/ask-the-archive.md.
 */
(function () {
    'use strict';
    var Core = window.ArchiveCore, LLM = window.ArchiveLLM;
    var $ = function (id) { return document.getElementById(id); };
    var A = null, set = [], kb = null, manifest = null, caps = null, engine = null, stopping = false;
    var out = { date: new Date().toISOString().slice(0, 10), userAgent: navigator.userAgent, quick: null, written: null };

    function el(tag, attrs, kids) {
        var n = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) { if (k === 'text') n.textContent = attrs[k]; else n.setAttribute(k, attrs[k]); });
        (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return n;
    }
    function name(id) { return A.nameOf(id); }
    function plain(r) {
        return [].concat(r.paras, r.bullets || [], r.paras2 || [], r.after ? r.after.bullets : [], (r.list || []).map(function (x) { return name(x.id) + ' ' + (x.note || ''); }),
            (r.choices || []).map(function (c) { return name(c.id); }), r.diagram ? [r.diagram.summary] : [])
            .join(' ').replace(/\{\{p:([a-z0-9-]+)\}\}/g, function (m, id) { return name(id); });
    }
    // the conversation leading up to a question, as in verify-archive.js
    function prepare(item) {
        var convo = { history: [], pins: {} }, res = null;
        function step(q, c) { var r = A.ask(q, c); return { r: r, c: { pins: c.pins, focus: r.state.focus, family: r.state.family, period: r.state.period, last: r.state.last, history: c.history.concat([{ q: q, a: plain(r) }]) } }; }
        (item.after || []).forEach(function (q) { res = step(q, convo); convo = res.c; });
        if (item.pick != null && res && res.r.choices) {
            var ch = res.r.choices[item.pick];
            convo.pins = Object.assign({}, convo.pins); convo.pins[ch.pin.text] = ch.pin.id;
            res = step(ch.q, convo); convo = res.c;
        }
        return convo;
    }
    function scoreQuick(item, r) {
        var t = plain(r), why = [];
        (item.all || []).forEach(function (s) { if (t.indexOf(s) < 0) why.push('missing "' + s + '"'); });
        if (item.any && !item.any.some(function (s) { return t.indexOf(s) >= 0; })) why.push('none of ' + item.any.join(' / '));
        (item.none || []).forEach(function (s) { if (new RegExp(s).test(t)) why.push('should not match ' + s); });
        if (item.type && r.type !== item.type) why.push('type ' + r.type + ', expected ' + item.type);
        var insufficient = ['none', 'clarify'].indexOf(r.confidence) >= 0 || ['not-found', 'out-of-scope', 'meta', 'clarify'].indexOf(r.type) >= 0;
        if (item.insufficient && !insufficient) why.push('should say the records cannot answer, or ask which person');
        if (!item.insufficient && insufficient && r.confidence !== 'private') why.push('said it could not answer (' + r.type + ')');
        (t.match(/\[(\d+)\]/g) || []).forEach(function (x) { var n = +x.slice(1, -1); if (n < 1 || n > r.evidence.length) why.push('citation ' + x + ' has no source'); });
        return why;
    }

    function row(i, item, quickWhy, w) {
        var tr = el('tr', { id: 'row-' + item.id });
        tr.appendChild(el('td', { text: String(i + 1) }));
        tr.appendChild(el('td', { text: item.q + (item.after ? ' (after: ' + item.after.join(' / ') + ')' : '') }));
        tr.appendChild(el('td', { text: item.cat }));
        tr.appendChild(el('td', { class: quickWhy.length ? 'fail' : 'pass', text: quickWhy.length ? 'Fail: ' + quickWhy.join('; ') : 'Pass' }));
        var wtd = el('td', { class: 'written' }), ctd = el('td'), ttd = el('td');
        if (w) {
            if (w.skipped) wtd.textContent = w.skipped;
            else if (w.error) { wtd.textContent = 'Error: ' + w.error; wtd.className = 'fail'; }
            else {
                wtd.textContent = w.text || '(nothing kept)';
                if (w.dropped && w.dropped.length) wtd.appendChild(el('div', { class: 'dropped', text: 'Left out: ' + w.dropped.join(' | ') }));
                ctd.textContent = [w.ok ? 'shown' : 'not shown', w.cited + ' citations', w.removed + ' left out', item.all && item.all.length ? w.factsKept + '/' + item.all.length + ' expected facts' : null].filter(Boolean).join(', ');
                ttd.textContent = (w.firstTokenMs != null ? 'first word ' + (w.firstTokenMs / 1000).toFixed(1) + ' s, ' : '') + 'done ' + (w.ms / 1000).toFixed(1) + ' s' + (w.tokensPerSec ? ', ' + w.tokensPerSec.toFixed(1) + ' tokens/s' : '');
            }
        }
        tr.appendChild(wtd); tr.appendChild(ctd); tr.appendChild(ttd);
        var old = $('row-' + item.id);
        if (old) old.replaceWith(tr); else $('rows').appendChild(tr);
    }

    function runQuick() {
        var t0 = performance.now(), byCat = {}, failed = [];
        $('rows').textContent = '';
        set.forEach(function (item, i) {
            var r = A.ask(item.q, prepare(item));
            var why = scoreQuick(item, r);
            var c = byCat[item.cat] = byCat[item.cat] || { n: 0, pass: 0 };
            c.n++; if (!why.length) c.pass++; else failed.push(item.id + ': ' + why.join('; '));
            row(i, item, why, null);
        });
        var ms = performance.now() - t0;
        out.quick = { total: set.length, passed: set.length - failed.length, byCategory: byCat, failed: failed, avgMs: +(ms / set.length).toFixed(2) };
        summary();
        $('download').disabled = false;
    }

    function median(xs) { xs = xs.slice().sort(function (a, b) { return a - b; }); return xs.length ? xs[Math.floor(xs.length / 2)] : null; }
    function summary() {
        var s = $('summary'); s.hidden = false; s.textContent = '';
        if (out.quick) s.appendChild(el('p', { text: 'Quick answers: ' + out.quick.passed + ' of ' + out.quick.total + ' pass, ' + out.quick.avgMs + ' ms each on average.' }));
        var w = out.written;
        if (w) {
            var done = w.rows.filter(function (x) { return !x.skipped && !x.error; });
            var lines = [
                'Written answers (' + w.model + '): ' + done.length + ' written, ' + w.rows.filter(function (x) { return x.error; }).length + ' errors, ' + w.rows.filter(function (x) { return x.skipped; }).length + ' answered by quick answer only.',
                'Load: ' + (w.loadMs / 1000).toFixed(1) + ' s' + (w.wasCached ? ' (model already on this device)' : ' (including the download)') + '.',
                'Shown to the visitor: ' + done.filter(function (x) { return x.ok; }).length + ' of ' + done.length + '. Answers with at least one sentence left out: ' + done.filter(function (x) { return x.removed; }).length + ' (' + done.reduce(function (a, x) { return a + x.removed; }, 0) + ' sentences in all). Answers with no citation: ' + done.filter(function (x) { return !x.cited; }).length + '.',
                'Expected facts kept: ' + done.reduce(function (a, x) { return a + x.factsKept; }, 0) + ' of ' + done.reduce(function (a, x) { return a + x.factsExpected; }, 0) + '.',
                'Median time to first word: ' + ((median(done.map(function (x) { return x.firstTokenMs || 0; })) || 0) / 1000).toFixed(1) + ' s; median full answer: ' + ((median(done.map(function (x) { return x.ms; })) || 0) / 1000).toFixed(1) + ' s; median speed: ' + (median(done.map(function (x) { return x.tokensPerSec || 0; })) || 0).toFixed(1) + ' tokens/s.'
            ];
            lines.forEach(function (l) { s.appendChild(el('p', { text: l })); });
            w.summary = lines;
        }
    }

    function runWritten() {
        var key = document.querySelector('input[name=model]:checked').value;
        var id = LLM.idFor(key, caps);
        var only = $('writtenOnly').checked;
        stopping = false;
        $('runWritten').disabled = true; $('runQuick').disabled = true; $('stop').disabled = false;
        if (!out.quick) runQuick();
        engine = engine || new LLM.Engine({ worker: '../archive-worker.js' });
        var t0 = performance.now(), wasCached = false;
        out.written = { model: id, caps: { f16: caps.f16, maxBuffer: caps.maxBuffer, deviceMemory: caps.deviceMemory, mobile: caps.mobile }, rows: [] };
        engine.cached(id).then(function (c) {
            wasCached = c;
            $('progress').textContent = c ? 'Starting the model on this device…' : 'Downloading the model…';
            return engine.load(id, function (p) { $('progress').textContent = p.text || ''; });
        }).then(function () {
            out.written.loadMs = Math.round(performance.now() - t0);
            out.written.wasCached = wasCached;
            var i = 0;
            function next() {
                if (stopping || i >= set.length) { finish(); return; }
                var item = set[i], idx = i++;
                var r = A.ask(item.q, prepare(item));
                var quickWhy = scoreQuick(item, r);
                if (!r.llm) {
                    var sk = { id: item.id, skipped: 'Quick answer only (' + r.type + ')' };
                    out.written.rows.push(sk);
                    if (!only) row(idx, item, quickWhy, sk); else { var tr = $('row-' + item.id); if (tr) tr.remove(); }
                    next(); return;
                }
                $('progress').textContent = 'Writing ' + (idx + 1) + ' of ' + set.length + ': ' + item.q;
                engine.generate([{ role: 'system', content: r.llm.system }, { role: 'user', content: r.llm.user }], r.llm.maxTokens).then(function (res) {
                    var chk = A.checkModelAnswer(res.text, r);
                    var text = chk.paras.join(' ').replace(/\{\{p:([a-z0-9-]+)\}\}/g, function (m, pid) { return name(pid); });
                    var toks = res.usage && res.usage.completion_tokens;
                    var decode = res.usage && res.usage.extra && res.usage.extra.decode_tokens_per_s;
                    var facts = (item.all || []).filter(function (s) { return text.indexOf(s) >= 0; }).length;
                    var w = { id: item.id, q: item.q, cat: item.cat, text: text, raw: res.text, ok: chk.ok, removed: chk.removed, dropped: chk.dropped || [], cited: chk.cited,
                              factsKept: facts, factsExpected: (item.all || []).length, ms: res.ms, firstTokenMs: res.firstTokenMs, completionTokens: toks || null,
                              promptTokens: res.usage && res.usage.prompt_tokens || null, tokensPerSec: decode || (toks && res.ms ? toks / (res.ms / 1000) : null) };
                    out.written.rows.push(w);
                    row(idx, item, quickWhy, w);
                    summary();
                    next();
                }).catch(function (e) {
                    var w = { id: item.id, error: LLM.explain(e) + ' [' + (e && e.message) + ']' };
                    out.written.rows.push(w);
                    row(idx, item, quickWhy, w);
                    if (/device|memory|lost/i.test(String(e && e.message))) finish(); else next();
                });
            }
            next();
        }).catch(function (e) {
            $('progress').textContent = LLM.explain(e);
            $('runWritten').disabled = false; $('runQuick').disabled = false; $('stop').disabled = true;
        });
        function finish() {
            $('progress').textContent = stopping ? 'Stopped.' : 'Finished.';
            $('runWritten').disabled = false; $('runQuick').disabled = false; $('stop').disabled = true; $('download').disabled = false;
            summary();
        }
    }

    function download() {
        out.kb = manifest && manifest.kb;
        var blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
        var a = el('a', { href: URL.createObjectURL(blob), download: 'ask-the-archive-eval-' + out.date + (out.written ? '-' + out.written.model : '') + '.json' });
        document.body.appendChild(a); a.click(); a.remove();
    }

    $('runQuick').addEventListener('click', runQuick);
    $('runWritten').addEventListener('click', runWritten);
    $('stop').addEventListener('click', function () { stopping = true; if (engine) engine.stop(); });
    $('download').addEventListener('click', download);

    Promise.all([
        fetch('../archive/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) { manifest = m; return fetch('../archive/' + m.kb).then(function (r) { return r.json(); }); }),
        fetch('archive-eval.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }),
        LLM.detect()
    ]).then(function (res) {
        kb = res[0]; set = res[1].questions; caps = res[2];
        A = Core.create(kb);
        var env = $('env'); env.textContent = '';
        env.appendChild(el('p', { text: set.length + ' questions. Index ' + manifest.kb + '.' }));
        env.appendChild(el('p', { text: caps.webgpu ? 'WebGPU is available' + (caps.f16 ? ' with 16-bit maths (q4f16 builds).' : ' without 16-bit maths (q4f32 builds).') + (caps.deviceMemory ? ' Device memory reported: ' + caps.deviceMemory + ' GB.' : '') : 'WebGPU is not available here, so only quick answers can be evaluated (' + caps.reason + ').' }));
        env.appendChild(el('p', { class: 'muted', text: navigator.userAgent }));
        $('runQuick').disabled = false;
        $('runWritten').disabled = !caps.webgpu;
    }).catch(function (e) { $('env').textContent = 'Could not load the archive: ' + e.message; });
})();
