/*
 * Stuart evaluation page (tests/archive-eval.html).
 *
 * Runs the question set in tests/archive-eval.json through the archive in a real browser, with the same
 * pass rules as tests/verify-archive.js, and lets the results be downloaded as JSON.
 */
(function () {
    'use strict';
    var Core = window.ArchiveCore;
    var $ = function (id) { return document.getElementById(id); };
    var A = null, set = [], kb = null, manifest = null;
    var out = { date: new Date().toISOString().slice(0, 10), userAgent: navigator.userAgent, quick: null };

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

    function row(i, item, quickWhy) {
        var tr = el('tr', { id: 'row-' + item.id });
        tr.appendChild(el('td', { text: String(i + 1) }));
        tr.appendChild(el('td', { text: item.q + (item.after ? ' (after: ' + item.after.join(' / ') + ')' : '') }));
        tr.appendChild(el('td', { text: item.cat }));
        tr.appendChild(el('td', { class: quickWhy.length ? 'fail' : 'pass', text: quickWhy.length ? 'Fail: ' + quickWhy.join('; ') : 'Pass' }));
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

    function summary() {
        var s = $('summary'); s.hidden = false; s.textContent = '';
        if (out.quick) s.appendChild(el('p', { text: 'Quick answers: ' + out.quick.passed + ' of ' + out.quick.total + ' pass, ' + out.quick.avgMs + ' ms each on average.' }));
    }

    function download() {
        out.kb = manifest && manifest.kb;
        var blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
        var a = el('a', { href: URL.createObjectURL(blob), download: 'ask-the-archive-eval-' + out.date + '.json' });
        document.body.appendChild(a); a.click(); a.remove();
    }

    $('runQuick').addEventListener('click', runQuick);
    $('download').addEventListener('click', download);

    Promise.all([
        fetch('../archive/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) { manifest = m; return fetch('../archive/' + m.kb).then(function (r) { return r.json(); }); }),
        fetch('archive-eval.json', { cache: 'no-cache' }).then(function (r) { return r.json(); })
    ]).then(function (res) {
        kb = res[0]; set = res[1].questions;
        A = Core.create(kb);
        var env = $('env'); env.textContent = '';
        env.appendChild(el('p', { text: set.length + ' questions. Index ' + manifest.kb + '.' }));
        env.appendChild(el('p', { class: 'muted', text: navigator.userAgent }));
        $('runQuick').disabled = false;
    }).catch(function (e) { $('env').textContent = 'Could not load the archive: ' + e.message; });
})();
