/* Ask the Archive: the page.
 *
 * Loads the archive index (archive/manifest.json points to the current archive/kb-<hash>.json, so an updated
 * archive is never hidden behind an old cached copy), answers questions with ArchiveCore, and, only if the visitor
 * sets it up, has the on-device model write the answer out from the same records (ArchiveLLM).
 *
 * Everything the model writes is treated as untrusted text: it is checked by ArchiveCore.checkModelAnswer and put
 * on the page with textContent, never as HTML.
 */
(function () {
    'use strict';
    // the small-screen menu button (kept here so the page needs no inline script)
    var navToggle = document.getElementById('navToggle');
    if (navToggle) navToggle.addEventListener('click', function () { document.getElementById('navLinks').classList.toggle('open'); });
    var $ = function (id) { return document.getElementById(id); };
    var LLM = window.ArchiveLLM;
    var archive = null, kb = null, manifest = null;
    var convo = { history: [], pins: {} };
    var turnSeq = 0;
    var W = { caps: null, on: false, key: 'standard', id: null, engine: null, loading: false, busy: null };
    var STORE = 'askArchive.written';

    function el(tag, attrs, kids) {
        var n = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            if (k === 'text') n.textContent = attrs[k];
            else if (k === 'class') n.className = attrs[k];
            else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
            else if (attrs[k] != null && attrs[k] !== false) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
        });
        (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return n;
    }
    function announce(t) { var l = $('askLive'); l.textContent = ''; setTimeout(function () { l.textContent = t; }, 60); }
    function store(v) { try { if (v) localStorage.setItem(STORE, JSON.stringify(v)); else localStorage.removeItem(STORE); } catch (e) { /* private mode */ } }
    function stored() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }

    // ---------------------------------------------------------------- loading the archive
    function boot() {
        fetch('archive/manifest.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
            .then(function (m) { manifest = m; return fetch('archive/' + m.kb).then(function (r) { if (!r.ok) throw new Error('index ' + r.status); return r.json(); }); })
            .then(function (data) {
                kb = data;
                archive = window.ArchiveCore.create(kb);
                showExamples();
                if (W.caps && !W.loading && !W.on) drawWritten();
                var q = new URLSearchParams(location.search).get('q');
                if (q) { $('askInput').value = q.slice(0, 500); ask(q); }
            })
            .catch(function (e) {
                $('turns').appendChild(el('li', { class: 'turn' }, [el('p', { class: 'uncertain', text: 'The archive could not be loaded (' + e.message + '). The family tree and the other pages still work.' })]));
            });
        checkDevice();
    }
    function showExamples() {
        var ul = $('askExamples'); ul.textContent = '';
        (archive.examples || []).slice(0, 7).forEach(function (x) {
            ul.appendChild(el('li', {}, [el('button', { type: 'button', class: 'chip', onclick: function () { $('askInput').value = x.q; ask(x.q); } }, [x.q])]));
        });
    }

    // ---------------------------------------------------------------- asking
    function ask(raw, pin) {
        var q = String(raw || '').trim().slice(0, 500);
        if (!q || !archive) return;
        if (pin) convo.pins[pin.text] = pin.id;
        if (W.busy) stopWriting();
        var result = archive.ask(q, convo);
        var id = ++turnSeq;
        var li = el('li', { class: 'turn', id: 'turn-' + id });
        li.appendChild(el('h3', { class: 'turn-q', text: q }));
        var art = el('article', { class: 'answer', 'aria-label': 'Answer' });
        li.appendChild(art);
        $('turns').appendChild(li);
        $('convoBar').hidden = false;
        $('askStart').hidden = true;
        render(result, art, id);
        // remember what this was about, for "he", "her father", "that branch"
        convo.focus = result.state.focus; convo.family = result.state.family; convo.period = result.state.period; convo.last = result.state.last;
        var entry = { q: q, a: plainAnswer(result) };
        convo.history.push(entry);
        if (convo.history.length > 6) convo.history.shift();
        $('askInput').value = '';
        li.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        if (W.on && result.llm && W.engine && W.engine.model) write(result, art, id, entry);
        else announce('Answer ready. ' + (result.paras[0] ? plain(result.paras[0]).slice(0, 160) : ''));
    }
    function plain(s) { return String(s || '').replace(/\{\{p:([a-z0-9-]+)\}\}/g, function (m, id) { return archive.nameOf(id); }).replace(/\[\d+\]/g, ''); }
    function plainAnswer(r) { return r.paras.concat(r.bullets || []).map(plain).join(' ').slice(0, 600); }

    // the answer text: {{p:id}} becomes a link to the person, [n] a link to source n. Text only, never HTML.
    function inline(str, tid) {
        var frag = document.createDocumentFragment();
        var re = /\{\{p:([a-z0-9-]+)\}\}|\[(\d+)\]/g, last = 0, m;
        str = String(str || '');
        while ((m = re.exec(str))) {
            if (m.index > last) frag.appendChild(document.createTextNode(str.slice(last, m.index)));
            if (m[1]) {
                var p = archive.byId[m[1]];
                frag.appendChild(p ? el('a', { href: p.url, text: p.name, title: p.about || '' }) : document.createTextNode(m[1]));
            } else {
                frag.appendChild(el('sup', {}, [el('a', { href: '#src-' + tid + '-' + m[2], 'aria-label': 'source ' + m[2], text: m[2] })]));
            }
            last = re.lastIndex;
        }
        if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
        return frag;
    }

    function render(r, art, tid) {
        art.textContent = '';
        var rec = el('div', { class: 'records-part' }, [el('h4', { class: 'records-label', text: 'From the records' })]);
        art.appendChild(rec);
        r.paras.forEach(function (p) { rec.appendChild(el('p', {}, [inline(p, tid)])); });
        if (r.bullets && r.bullets.length) rec.appendChild(el('ul', { class: 'bul' }, r.bullets.map(function (b) { return el('li', {}, [inline(b, tid)]); })));
        (r.paras2 || []).forEach(function (p) { rec.appendChild(el('p', {}, [inline(p, tid)])); });
        if (r.choices) {
            rec.appendChild(el('div', { class: 'choices' }, r.choices.map(function (c) {
                var p = archive.byId[c.id];
                return el('button', { type: 'button', class: 'chip', onclick: function () { ask(c.q, c.pin); } }, [p.name, el('small', { text: c.note })]);
            })));
        }
        if (r.diagram) rec.appendChild(chain(r.diagram));
        if (r.list && r.list.length) {
            rec.appendChild(el('ul', { class: 'people-list' }, r.list.map(function (x) {
                var p = archive.byId[x.id];
                return el('li', {}, [el('a', { href: p.url, text: p.name }), x.note ? el('span', { class: 'who-note', text: ', ' + x.note }) : null]);
            })));
        }
        if (r.after) {
            rec.appendChild(el('h4', { class: 'after-head', text: r.after.title }));
            rec.appendChild(el('ul', { class: 'bul' }, r.after.bullets.map(function (b) { return el('li', {}, [inline(b, tid)]); })));
        }
        if (r.uncertainty && r.uncertainty.length && r.type !== 'relationship' && r.type !== 'relation-list' && r.type !== 'age') {
            rec.appendChild(el('p', { class: 'uncertain', text: 'Not certain: ' + r.uncertainty.slice(0, 3).join('; ') }));
        }
        if (r.photos && r.photos.length) {
            rec.appendChild(el('div', { class: 'photos' }, r.photos.map(function (ph) {
                return el('a', { href: ph.url || ph.full }, [el('img', { src: ph.file, alt: ph.caption || '', loading: 'lazy' }), el('span', { text: trim(ph.caption, 70) })]);
            })));
        }
        if (r.mapLink) rec.appendChild(el('p', {}, [el('a', { href: r.mapLink, text: 'See these places on the family map' })]));
        if (r.more) rec.appendChild(el('p', {}, [el('button', { type: 'button', class: 'ask-link', onclick: function () { ask('Tell me more'); } }, ['Tell me more'])]));
        if (r.evidence && r.evidence.length) art.appendChild(sources(r.evidence, tid));
        if (r.followups && r.followups.length) {
            art.appendChild(el('div', { class: 'next', role: 'group', 'aria-label': 'Ask next' }, r.followups.map(function (f) {
                return el('button', { type: 'button', class: 'chip', onclick: function () { ask(f); } }, [f]);
            })));
        }
        art.appendChild(el('p', { class: 'answer-meta', text: meta(r) }));
    }
    function meta(r) {
        if (r.type === 'not-found' || r.type === 'out-of-scope' || r.type === 'meta' || r.type === 'help') return 'Quick answer.';
        if (r.type === 'clarify') return 'Choose one to carry on.';
        var calc = r.evidence && r.evidence.some(function (e) { return e.kind === 'calculated'; });
        return calc ? 'Quick answer, worked out from the family tree and the records listed.' : 'Quick answer, put together from the records listed.';
    }
    function trim(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '...' : s; }
    function chain(d) {
        var ol = el('ol', { class: 'chain', 'aria-label': 'How they are connected' });
        d.steps.forEach(function (s, i) {
            var p = archive.byId[s.id];
            if (i) {
                var arrow = s.rel === 'father' || s.rel === 'mother' || s.rel === 'parent' ? '↑' : s.rel === 'husband' || s.rel === 'wife' || s.rel === 'spouse' ? '↔' : '↓';
                var prev = archive.byId[d.steps[i - 1].id];
                ol.appendChild(el('li', { class: 'rel', 'data-arrow': arrow, text: s.rel + ' of ' + prev.name }));
            }
            ol.appendChild(el('li', {}, [el('a', { href: p.url, text: p.name })]));
        });
        // the answer's first sentence already says what the chain shows, so no caption under it
        var wrap = el('div', {}, [ol]);
        return wrap;
    }
    function sources(list, tid) {
        var box = el('div', { class: 'answer-sources' }, [el('h4', { class: 'src-head', text: 'Where this comes from' })]);
        var ol = el('ol', { class: 'sources' });
        list.forEach(function (e) {
            var title = e.url ? el('a', { href: safeUrl(e.url), text: e.title, target: e.external ? '_blank' : null, rel: e.external ? 'noopener' : null }) : el('span', { text: e.title });
            ol.appendChild(el('li', { id: 'src-' + tid + '-' + e.n }, [
                el('span', { class: 'n', text: e.n + '.' }),
                el('span', {}, [el('span', { class: 'kind kind--' + e.kind, text: e.label }), title, e.external ? el('span', { class: 'visually-hidden', text: ' (opens another site)' }) : null, e.detail ? el('span', { class: 'detail', text: e.detail }) : null])
            ]));
        });
        box.appendChild(ol);
        return box;
    }
    // links come only from the archive index, but check anyway: no javascript: or data: URLs
    function safeUrl(u) { u = String(u || ''); return /^(https?:\/\/|[a-z0-9][a-z0-9._\/-]*\.(html|jpg|jpeg|png|pdf)([?#].*)?$|[a-z0-9-]+\.html([?#].*)?$|map\.html|family-tree\.html)/i.test(u) && !/^\s*(javascript|data):/i.test(u) ? u : '#'; }

    // ---------------------------------------------------------------- written answers
    function write(result, art, tid, entry) {
        var box = el('div', { class: 'written' });
        var label = el('p', { class: 'written-label', text: 'Written answer, from the records below' });
        var stream = el('p', { class: 'stream' });
        var stopBtn = el('button', { type: 'button', class: 'btn-b', onclick: stopWriting }, ['Stop']);
        var stopRow = el('p', { class: 'stop-row' }, [stopBtn]);
        box.appendChild(label); box.appendChild(stream); box.appendChild(stopRow);
        art.insertBefore(box, art.firstChild);
        art.querySelector('.records-part').classList.add('is-secondary');
        art.setAttribute('aria-busy', 'true');
        var raw = '';
        W.busy = { art: art };
        announce('Writing the answer.');
        var messages = [{ role: 'system', content: result.llm.system }, { role: 'user', content: result.llm.user }];
        W.engine.generate(messages, result.llm.maxTokens, function (d) {
            raw += d;
            stream.textContent = raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/\[(\d+)\]/g, '[$1]');
        }).then(function (out) {
            finishWriting(result, box, stream, stopRow, art, tid, out.text, entry, out);
        }).catch(function (e) {
            if (/Stopped|interrupt/i.test(e.message) || (e.name === 'AbortError')) finishWriting(result, box, stream, stopRow, art, tid, raw, entry, null, true);
            else { stopRow.remove(); stream.textContent = ''; box.appendChild(el('p', { class: 'warn', text: LLM.explain(e) })); art.removeAttribute('aria-busy'); W.busy = null; announce('The written answer failed; the quick answer is below.'); }
        });
    }
    function finishWriting(result, box, stream, stopRow, art, tid, text, entry, stats, stopped) {
        W.busy = null;
        stopRow.remove();
        art.removeAttribute('aria-busy');
        var checked = archive.checkModelAnswer(text, result);
        stream.remove();
        if (!checked.ok) {
            box.appendChild(el('p', { class: 'warn', text: stopped ? 'Stopped. The quick answer is below.' : 'The written answer could not be matched to the records, so it is not shown. The quick answer below comes straight from them.' }));
            announce('Quick answer shown.');
            return;
        }
        checked.paras.forEach(function (p) { box.insertBefore(el('p', {}, [inline(p, tid)]), null); });
        var notes = [];
        if (stopped) notes.push('Stopped before the end.');
        if (checked.removed) notes.push(checked.removed + (checked.removed === 1 ? ' sentence was' : ' sentences were') + ' left out because ' + (checked.removed === 1 ? 'it' : 'they') + ' could not be matched to the records.');
        if (!checked.cited) notes.push('This written answer did not point to its records; check it against the list below.');
        if (notes.length) box.appendChild(el('p', { class: 'warn', text: notes.join(' ') }));
        if (stats && stats.ms) box.setAttribute('data-ms', String(stats.ms));
        entry.a = checked.paras.map(plain).join(' ').slice(0, 600);
        var meta = art.querySelector('.answer-meta');
        if (meta) meta.textContent = 'Written on this device by a small language model, from the records listed. ' + meta.textContent.replace(/^Quick answer,?/, 'The quick answer underneath is').replace(/\.$/, '.');
        announce('Written answer ready.');
    }
    function stopWriting() { if (W.engine) W.engine.stop(); }

    // ---------------------------------------------------------------- device check and setup
    function size(id) { var m = manifest && manifest.models && manifest.models[id]; return m ? m.bytes : null; }
    function checkDevice() {
        LLM.detect().then(function (caps) {
            W.caps = caps;
            var saved = stored();
            if (saved && caps.webgpu) {
                W.key = saved.key || 'standard';
                W.id = LLM.idFor(W.key, caps);
                if (saved.on) {
                    W.engine = W.engine || new LLM.Engine();
                    W.engine.cached(W.id).then(function (yes) {
                        if (yes) { startModel(true); } else { store(null); drawWritten(); }
                    });
                    drawWritten('Getting written answers ready from this device…');
                    return;
                }
            }
            drawWritten();
        });
    }
    function drawWritten(busyText) {
        var st = $('writtenState'), act = $('writtenActions');
        st.textContent = ''; act.textContent = '';
        var caps = W.caps || {};
        var strong = el('strong', { text: 'Written answers' });
        if (busyText) { st.appendChild(strong); st.appendChild(document.createTextNode(': ' + busyText)); return; }
        if (W.on && W.engine && W.engine.model) {
            st.appendChild(strong); st.appendChild(document.createTextNode(' are on. A small language model (' + LLM.model(W.key).name.toLowerCase() + ') runs on this device and writes each answer out from the same records. Nothing you type leaves the device.'));
            act.appendChild(el('button', { type: 'button', class: 'btn-b', onclick: function () { W.on = false; store({ key: W.key, on: false }); W.engine.terminate(); drawWritten(); announce('Written answers are off.'); } }, ['Turn off']));
            act.appendChild(el('button', { type: 'button', class: 'ask-link', onclick: removeModel }, ['Remove the downloaded model']));
            return;
        }
        if (!caps.webgpu) {
            st.appendChild(strong);
            st.appendChild(document.createTextNode(' need WebGPU, which ' + (caps.reason === 'no-webgpu' ? 'this browser does not offer' : 'could not start on this device') + '. The quick answers do not need it and work in full. Recent versions of Chrome, Edge, Safari (on macOS and iOS 26 or later) and Firefox on Windows can run written answers.'));
            return;
        }
        var sz = size(LLM.idFor('standard', caps));
        st.appendChild(strong);
        st.appendChild(document.createTextNode(' are optional. A small language model runs on this device and writes the answer out in full sentences from the same records, with the record numbers. It is a one-time download of about ' + (sz ? LLM.mb(sz) : '1 GB') + '; your questions never leave the device.'));
        act.appendChild(el('button', { type: 'button', class: 'btn-a', onclick: openSetup }, ['Set up written answers']));
        var saved = stored();
        if (saved && saved.on === false) act.appendChild(el('button', { type: 'button', class: 'ask-link', onclick: removeModel }, ['Remove the downloaded model']));
    }
    function openSetup() {
        var d = $('setup'), body = $('setupBody'), actions = $('setupActions');
        body.textContent = ''; actions.textContent = '';
        $('setupProgress').hidden = true; $('setupError').hidden = true;
        var caps = W.caps;
        var opts = LLM.MODELS.map(function (m) {
            var id = LLM.idFor(m.key, caps), bytes = size(id), v = LLM.verdict(m.key, caps, bytes);
            return { m: m, id: id, bytes: bytes, v: v, measured: manifest && manifest.models && manifest.models[id] && manifest.models[id].measured };
        });
        var std = opts[0];
        body.appendChild(el('p', { text: 'Written answers use a small open language model, Qwen3 from Alibaba (Apache 2.0 licence), running inside this browser on the graphics chip of this device. It writes each answer from the same records the quick answer uses, and lists them.' }));
        body.appendChild(el('ul', {}, [
            el('li', { text: 'The model is downloaded once, from Hugging Face (the model files) and GitHub (the code that runs them), and kept by this browser for next time. The browser can clear it if it runs short of space.' }),
            el('li', { text: 'Your questions and the answers stay on this device. Nothing is sent to an AI service.' }),
            el('li', { text: 'The first setup takes a few minutes on a fast connection. After that, starting up takes a few seconds.' })
        ]));
        var check = el('div', { class: 'check' + (std.v.v === 'no' ? ' check--no' : '') });
        check.appendChild(el('strong', { text: std.v.v === 'yes' ? 'This device looks able to run it.' : std.v.v === 'maybe' ? 'This device may struggle to run it.' : 'This device cannot run it.' }));
        std.v.notes.forEach(function (n) { check.appendChild(el('span', { text: ' ' + n })); });
        body.appendChild(check);
        var fs = el('fieldset', {}, [el('legend', { text: 'Choose a model' })]);
        opts.forEach(function (o, i) {
            var input = el('input', { type: 'radio', name: 'model', value: o.m.key, checked: (W.key === o.m.key || (!W.key && i === 0)) && o.v.v !== 'no' ? true : null, disabled: o.v.v === 'no' ? true : null });
            fs.appendChild(el('label', { class: 'opt' + (o.v.v === 'no' ? ' is-off' : '') }, [input, el('span', {}, [
                o.m.name + ', ' + (o.bytes ? (o.measured ? '' : 'about ') + LLM.mb(o.bytes) : 'size unknown') + ' download',
                el('small', { text: o.m.about + ' Needs about ' + LLM.mb((o.v.gpuMB || o.m.gpuMB.f32) * 1e6) + ' of graphics memory.' + (o.v.v === 'no' && o.v.notes.length ? ' ' + o.v.notes[0] : '') })
            ])]));
        });
        if (!fs.querySelector('input:checked')) { var first = fs.querySelector('input:not([disabled])'); if (first) first.checked = true; }
        // one click for most people: the standard model is chosen; the larger one sits behind "More detailed answers"
        var chosen = opts.filter(function (o) { return o.m.key === (W.key || 'standard'); })[0] || std;
        body.appendChild(el('p', { class: 'check', text: 'This will download the ' + chosen.m.name.toLowerCase() + ' model, ' + (chosen.bytes ? (chosen.measured ? '' : 'about ') + LLM.mb(chosen.bytes) : 'size unknown') + '.' }));
        var more = el('details', { class: 'more-models' }, [el('summary', { text: 'Want more detailed answers? Choose a larger model' }), fs]);
        fs.addEventListener('change', function () { var c = fs.querySelector('input:checked'); var o = opts.filter(function (x) { return c && x.m.key === c.value; })[0]; if (o) more.previousSibling.textContent = 'This will download the ' + o.m.name.toLowerCase() + ' model, ' + (o.bytes ? (o.measured ? '' : 'about ') + LLM.mb(o.bytes) : 'size unknown') + '.'; });
        body.appendChild(more);
        var any = opts.some(function (o) { return o.v.v !== 'no'; });
        actions.appendChild(el('button', { type: 'button', class: 'btn-b', onclick: function () { d.close(); } }, ['Not now']));
        if (any) actions.appendChild(el('button', { type: 'button', class: 'btn-a', id: 'setupGo', onclick: function () {
            var pick = fs.querySelector('input:checked');
            W.key = pick ? pick.value : 'standard';
            W.id = LLM.idFor(W.key, caps);
            startModel(false);
        } }, ['Download and start']));
        if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
    }
    function step(name, state) {
        Array.prototype.forEach.call($('setupSteps').children, function (li) {
            var order = ['archive', 'download', 'start', 'ready'], i = order.indexOf(li.dataset.step), j = order.indexOf(name);
            li.className = i < j || (i === j && state === 'done') ? 'is-done' : i === j ? 'is-now' : '';
        });
    }
    function startModel(quiet) {
        W.engine = W.engine || new LLM.Engine();
        W.loading = true;
        var d = $('setup');
        if (!quiet) {
            $('setupBody').textContent = ''; $('setupError').hidden = true;
            $('setupProgress').hidden = false;
            var actions = $('setupActions'); actions.textContent = '';
            actions.appendChild(el('button', { type: 'button', class: 'btn-b', onclick: function () { W.engine.terminate(); W.loading = false; step('archive'); $('setupError').textContent = LLM.explain({ name: 'AbortError' }); $('setupError').hidden = false; drawWritten(); } }, ['Stop']));
            step('archive', 'done');
            step('download');
            if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
        }
        var bar = $('setupBar'), detail = $('setupDetail');
        W.engine.load(W.id, function (p) {
            var t = p.text || '';
            var pct = typeof p.progress === 'number' ? Math.round(p.progress * 100) : null;
            if (/fetch|download|cache\[/i.test(t) && !/finish/i.test(t)) step('download');
            else if (/load|init|shader|compil|gpu/i.test(t)) step('start');
            if (pct != null) { bar.firstChild.style.width = pct + '%'; bar.setAttribute('aria-valuenow', String(pct)); }
            detail.textContent = tidyProgress(t);
            if (quiet) drawWritten('getting ready, ' + (pct != null ? pct + '%' : '') + '…');
        }).then(function () {
            W.loading = false; W.on = true;
            store({ key: W.key, on: true });
            step('ready', 'done');
            // the button that opened the dialog has been redrawn, so send focus to the question box, where the next step is
            if (d.open) setTimeout(function () { d.close(); $('askInput').focus(); }, 600);
            drawWritten();
            announce('Written answers are ready.');
        }).catch(function (e) {
            W.loading = false; W.on = false;
            if (!quiet) { $('setupError').textContent = LLM.explain(e); $('setupError').hidden = false; var a = $('setupActions'); a.textContent = ''; a.appendChild(el('button', { type: 'button', class: 'btn-b', onclick: function () { d.close(); } }, ['Close'])); a.appendChild(el('button', { type: 'button', class: 'btn-a', onclick: function () { startModel(false); } }, ['Try again'])); }
            W.engine.terminate();
            drawWritten();
            if (quiet) $('writtenState').appendChild(document.createTextNode(' (' + LLM.explain(e) + ')'));
        });
    }
    // WebLLM's progress lines, in plainer words
    function tidyProgress(t) {
        var m = /Fetching param cache\[(\d+)\/(\d+)\]:\s*(\d+)MB fetched\.\s*(\d+)% completed,\s*(\d+) secs/.exec(t);
        if (m) return 'Downloaded ' + m[3] + ' MB (' + m[4] + '%), ' + m[5] + ' seconds so far.';
        if (/Loading model from cache\[(\d+)\/(\d+)\]/.test(t)) return 'Loading the model from this device’s storage.';
        if (/Finish loading/i.test(t)) return 'Ready.';
        return t.replace(/It can take a while.*$/, '').slice(0, 140);
    }
    function removeModel() {
        var id = W.id || LLM.idFor(W.key || 'standard', W.caps || {});
        W.engine = W.engine || new LLM.Engine();
        drawWritten('removing the downloaded files…');
        var ids = LLM.MODELS.map(function (m) { return [m.f16, m.f32]; }).reduce(function (a, b) { return a.concat(b); }, []);
        ids.reduce(function (p, mid) { return p.then(function () { return W.engine.remove(mid).catch(function () {}); }); }, Promise.resolve()).then(function () {
            W.on = false; store(null); W.engine.terminate(); W.engine = null; drawWritten();
            announce('The downloaded model has been removed from this browser.');
        });
    }

    // ---------------------------------------------------------------- wiring
    $('askForm').addEventListener('submit', function (e) { e.preventDefault(); ask($('askInput').value); });
    $('askInput').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask($('askInput').value); } });
    $('newConvo').addEventListener('click', function () {
        if (W.busy) stopWriting();
        convo = { history: [], pins: {} };
        $('turns').textContent = ''; $('convoBar').hidden = true; $('askStart').hidden = false;
        $('askInput').focus();
        announce('Started a new conversation.');
    });
    // leaving the page while the model loads or writes: let it go cleanly
    window.addEventListener('pagehide', function () { if (W.engine && (W.loading || W.busy)) W.engine.terminate(); });
    $('setup').addEventListener('cancel', function (e) { if (W.loading) e.preventDefault(); });
    window.__ask = { get archive() { return archive; }, get convo() { return convo; }, W: W, ask: ask };
    boot();
})();
