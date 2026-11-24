/* Stuart: the family archive's guide.
 *
 * One chat, used two ways:
 *   - the full page, ask.html (<main id="stuart-page">), where Stuart sits at the top and the conversation fills the page;
 *   - a floating "Ask Stuart" button on every other page (<script src="stuart.js" data-widget>), which opens the same chat.
 *     data-compact shows only the seal; data-avoid="<selectors>" keeps the button above those page controls
 *     as a window in the corner or a drawer down the right-hand side.
 *
 * Stuart first asks who the visitor is, with a type-ahead list of the family, so that "my grandfather" can be worked out
 * from them. Answers come from archive-core.js (quick answers, worked out in the browser from the records); nothing is
 * downloaded beyond the site's own small index and nothing typed leaves the page. The conversation is kept for the
 * browser tab (sessionStorage), so it carries on from page to page; who the visitor is, is kept on the device
 * (localStorage) until they change it.
 *
 * Answer text from the archive is never inserted as HTML: {{p:id}} becomes a link to the person, [n] a link to source n.
 */
(function () {
    'use strict';
    var KEY = { me: 'stuart.me', chat: 'stuart.chat', mode: 'stuart.mode', open: 'stuart.open', flash: 'stuart.flash', seen: 'stuart.seen' };
    var ENGINE = ['archive-kin.js', 'archive-dates.js', 'archive-search.js', 'archive-core.js'];
    var REDUCE = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var HERE = decodeURIComponent(location.pathname.split('/').pop() || 'index.html');
    var uid = 0;

    // ------------------------------------------------------------------ small helpers
    function get(k, session) { try { var v = (session ? sessionStorage : localStorage).getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
    function put(k, v, session) { try { var s = session ? sessionStorage : localStorage; if (v == null) s.removeItem(k); else s.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode: carry on without memory */ } }
    function el(tag, attrs, kids) {
        var n = document.createElement(tag);
        Object.keys(attrs || {}).forEach(function (k) {
            var v = attrs[k];
            if (v == null || v === false) return;
            if (k === 'text') n.textContent = v;
            else if (k === 'class') n.className = v;
            else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
            else n.setAttribute(k, v === true ? '' : v);
        });
        (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
        return n;
    }
    var NS = 'http://www.w3.org/2000/svg';
    function svgEl(tag, attrs, kids) {
        var n = document.createElementNS(NS, tag);
        Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
        (kids || []).forEach(function (c) { n.appendChild(c); });
        return n;
    }
    // Stuart's seal: a wax seal with an S, drawn here rather than loaded
    function seal(cls) {
        var pts = [], i, n = 28;
        for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, r = i % 2 ? 21.2 : 23.4; pts.push((24 + r * Math.cos(a)).toFixed(2) + ',' + (24 + r * Math.sin(a)).toFixed(2)); }
        var t = svgEl('text', { x: '24', y: '31', 'text-anchor': 'middle', 'font-family': 'Cinzel, Georgia, serif', 'font-size': '19', 'font-weight': '600', fill: '#f3e3b5' });
        t.textContent = 'S';
        return svgEl('svg', { class: 'st-seal ' + (cls || ''), viewBox: '0 0 48 48', 'aria-hidden': 'true', focusable: 'false' }, [
            svgEl('polygon', { points: pts.join(' '), fill: '#7a0f12' }),
            svgEl('circle', { cx: '24', cy: '24', r: '17.5', fill: '#8b1a1a' }),
            svgEl('circle', { cx: '24', cy: '24', r: '15.6', fill: 'none', stroke: '#d4af37', 'stroke-width': '0.9' }), t]);
    }
    function icon(name) {
        var paths = {
            send: 'M12 19V5M5 12l7-7 7 7',
            close: 'M6 6l12 12M18 6L6 18',
            drawer: 'M4 4h16v16H4zM14 4v16',
            float: 'M4 4h16v16H4zM12 12h8v8h-8z',
            expand: 'M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7',
            down: 'M12 5v14M5 12l7 7 7-7',
            chevron: 'M9 6l6 6-6 6'
        };
        return svgEl('svg', { class: 'st-icon', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, [svgEl('path', { d: paths[name], fill: 'none', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })]);
    }
    function trim(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '...' : s; }

    // ------------------------------------------------------------------ the archive, loaded once per page
    var archiveP = null;
    function loadScript(src) {
        return new Promise(function (ok, no) {
            if (document.querySelector('script[src="' + src + '"]')) return ok();
            var s = el('script', { src: src });
            s.onload = function () { ok(); };
            s.onerror = function () { no(new Error('could not load ' + src)); };
            document.head.appendChild(s);
        });
    }
    function loadArchive() {
        if (archiveP) return archiveP;
        archiveP = (window.ArchiveCore ? Promise.resolve() : ENGINE.reduce(function (p, src) { return p.then(function () { return loadScript(src); }); }, Promise.resolve()))
            .then(function () { return fetch('archive/manifest.json', { cache: 'no-cache' }); })
            .then(function (r) { if (!r.ok) throw new Error('manifest ' + r.status); return r.json(); })
            .then(function (m) { return fetch('archive/' + m.kb); })
            .then(function (r) { if (!r.ok) throw new Error('index ' + r.status); return r.json(); })
            .then(function (kb) { return window.ArchiveCore.create(kb); });
        return archiveP;
    }

    // ------------------------------------------------------------------ moving around the site from an answer
    function flash(target) {
        if (!target) return;
        target.classList.remove('st-flash');
        void target.offsetWidth;
        target.classList.add('st-flash');
        setTimeout(function () { target.classList.remove('st-flash'); }, 2600);
    }
    function revealAnchor(hash) {
        var id = decodeURIComponent(String(hash || '').replace(/^#/, ''));
        var target = id && document.getElementById(id);
        if (!target) return false;
        target.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
        flash(target);
        try { history.replaceState(null, '', '#' + id); } catch (e) { /* ignore */ }
        return true;
    }

    // ------------------------------------------------------------------ the chat
    function Chat(host, opts) {
        var A = null, me = null, ready = false, pendingQ = opts.ask || null;
        var convo = { history: [], pins: {} }, turns = [];
        var page = opts.mode === 'page';
        var self = this;
        var id = ++uid;

        var root = el('section', { class: 'st st--' + opts.mode, 'aria-label': 'Conversation with Stuart' });
        var scroller = el('div', { class: 'st-scroll' });
        var log = el('ol', { class: 'st-log' });
        var live = el('div', { class: 'st-sr', role: 'status', 'aria-live': 'polite' });
        var jump = el('button', { type: 'button', class: 'st-jump', hidden: true, onclick: function () { toEnd(true); } }, [icon('down'), 'Latest answer']);
        var ta = el('textarea', { class: 'st-input', rows: '1', maxlength: '500', id: 'st-input-' + id, 'aria-label': 'Your question for Stuart', placeholder: 'Tell Stuart who you are first', disabled: true });
        var send = el('button', { type: 'submit', class: 'st-send', 'aria-label': 'Ask Stuart', disabled: true }, [icon('send')]);
        var whoText = el('span', { class: 'st-who-text' });
        var who = el('p', { class: 'st-who', hidden: true }, [whoText,
            el('button', { type: 'button', class: 'st-link', onclick: function () { changeMe(); } }, ['Change']),
            el('button', { type: 'button', class: 'st-link', onclick: function () { restart(); } }, ['New conversation'])]);
        var form = el('form', { class: 'st-compose', onsubmit: function (e) { e.preventDefault(); ask(ta.value); } }, [
            who, el('div', { class: 'st-field' }, [ta, send]),
            el('p', { class: 'st-hint', id: 'st-hint-' + id, text: 'Enter to ask. Shift and Enter for a new line.' })]);
        ta.setAttribute('aria-describedby', 'st-hint-' + id);

        if (page) {
            root.appendChild(el('header', { class: 'st-hero' }, [seal('st-hero-seal'), el('div', {}, [
                el('h1', { class: 'st-hero-name', text: 'Ask Stuart' }),
                el('p', { class: 'st-hero-role', text: 'The family archivist. Every answer comes from the records on this site, with a link to each one.' })])]));
        }
        scroller.appendChild(log);
        root.appendChild(scroller);
        root.appendChild(jump);
        root.appendChild(form);
        root.appendChild(live);
        host.appendChild(root);

        // the composer grows with the question, up to a few lines
        function autosize() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; }
        ta.addEventListener('input', function () { autosize(); send.disabled = !ta.value.trim() || !ready; });
        ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(ta.value); } });

        // ---------------------------------------------------------- scrolling
        function scrollBox() { return page ? document.scrollingElement || document.documentElement : scroller; }
        function nearEnd() { var b = scrollBox(), h = page ? window.innerHeight : b.clientHeight; return b.scrollHeight - b.scrollTop - h < 160; }
        function toEnd(smooth) {
            var b = scrollBox();
            var top = b.scrollHeight;
            if (page) window.scrollTo({ top: top, behavior: smooth && !REDUCE ? 'smooth' : 'auto' });
            else b.scrollTo({ top: top, behavior: smooth && !REDUCE ? 'smooth' : 'auto' });
            jump.hidden = true;
        }
        function bringIn(li) {
            // like a modern chat: the question goes to the top and the answer unfolds under it
            if (page) {
                var y = li.getBoundingClientRect().top + window.scrollY - 76;
                window.scrollTo({ top: Math.max(0, y), behavior: REDUCE ? 'auto' : 'smooth' });
            } else scroller.scrollTo({ top: li.offsetTop - 12, behavior: REDUCE ? 'auto' : 'smooth' });
        }
        (page ? window : scroller).addEventListener('scroll', function () { if (nearEnd()) jump.hidden = true; }, { passive: true });

        // ---------------------------------------------------------- messages
        function stuart(children, cls) {
            var body = el('div', { class: 'st-body' }, children);
            var li = el('li', { class: 'st-msg st-msg--stuart' + (cls ? ' ' + cls : '') }, [el('div', { class: 'st-avatar' }, [seal()]), body]);
            log.appendChild(li);
            stagger(body);
            return li;
        }
        function mine(text) {
            var li = el('li', { class: 'st-msg st-msg--me' }, [el('p', { class: 'st-bubble', text: text })]);
            log.appendChild(li);
            return li;
        }
        function typing() {
            return stuart([el('div', { class: 'st-typing', role: 'img', 'aria-label': 'Stuart is looking through the records' }, [el('span'), el('span'), el('span')])], 'st-msg--typing');
        }
        function stagger(body) { Array.prototype.forEach.call(body.children, function (c, i) { c.style.setProperty('--i', String(Math.min(i, 8))); }); }
        function chip(text, onPick, cls) { return el('button', { type: 'button', class: 'st-chip' + (cls ? ' ' + cls : ''), onclick: onPick }, [text]); }
        function chips(list) { return list.length ? el('div', { class: 'st-chips' }, list.map(function (q) { return chip(q, function () { ask(q); }); })) : null; }
        function announce(t) { live.textContent = ''; setTimeout(function () { live.textContent = t; }, 40); }

        // ---------------------------------------------------------- links in answers
        function go(e, url) {
            var u;
            try { u = new URL(url, location.href); } catch (err) { return; }
            if (u.origin !== location.origin) return;
            if (u.pathname === location.pathname && u.hash) {
                if (revealAnchor(u.hash)) { e.preventDefault(); if (opts.onLeave) opts.onLeave('scroll'); }
                return;
            }
            // another page of the site: keep the chat open there, and show the place the answer points to
            put(KEY.flash, u.hash || null, true);
            if (opts.onLeave) opts.onLeave('page');
        }
        function link(text, url, cls, title) {
            var a = el('a', { href: url, class: cls || null, title: title || null }, [text]);
            a.addEventListener('click', function (e) { go(e, url); });
            return a;
        }
        function inline(str, sid) {
            var frag = document.createDocumentFragment();
            var re = /\{\{p:([a-z0-9-]+)\}\}|\[(\d+)\]/g, last = 0, m;
            str = String(str || '');
            while ((m = re.exec(str))) {
                if (m.index > last) frag.appendChild(document.createTextNode(str.slice(last, m.index)));
                if (m[1]) {
                    var p = A.byId[m[1]];
                    if (!p) frag.appendChild(document.createTextNode(m[1]));
                    else if (m[1] === me) frag.appendChild(el('span', { class: 'st-you', text: 'you' }));
                    else frag.appendChild(link(p.name, p.url, 'st-person', p.about || ''));
                } else frag.appendChild(citeLink(m[2], sid));
                last = re.lastIndex;
            }
            if (last < str.length) frag.appendChild(document.createTextNode(str.slice(last)));
            return frag;
        }
        function citeLink(n, sid) {
            var a = el('a', { href: '#' + sid + '-' + n, class: 'st-cite', 'aria-label': 'source ' + n, text: n });
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var box = document.getElementById(sid);
                if (box) box.dispatchEvent(new CustomEvent('st-open'));
                var li = document.getElementById(sid + '-' + n);
                if (li) { flash(li); li.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'nearest' }); }
            });
            return el('sup', {}, [a]);
        }
        // links come only from the archive index, but check anyway
        function safeUrl(u) { u = String(u || ''); return /^(https?:\/\/|[a-z0-9][a-z0-9._\/-]*\.(html|jpg|jpeg|png|webp|pdf)([?#].*)?$|[a-z0-9-]+\.html([?#].*)?$)/i.test(u) && !/^\s*(javascript|data):/i.test(u) ? u : null; }

        // ---------------------------------------------------------- answers
        function answer(r) {
            var sid = 'st-src-' + id + '-' + turns.length;
            var kids = [];
            r.paras.forEach(function (p) { kids.push(el('p', {}, [inline(p, sid)])); });
            if (r.bullets && r.bullets.length) kids.push(el('ul', { class: 'st-list' }, r.bullets.map(function (b) { return el('li', {}, [inline(b, sid)]); })));
            (r.paras2 || []).forEach(function (p) { kids.push(el('p', { class: 'st-aside' }, [inline(p, sid)])); });
            if (r.choices) kids.push(el('div', { class: 'st-chips st-chips--choose' }, r.choices.map(function (c) {
                var p = A.byId[c.id];
                return chip(p.name, function () { ask(c.q, c.pin, 'I mean ' + p.name); }, 'st-chip--person');
            })));
            if (r.diagram) kids.push(chain(r.diagram));
            if (r.list && r.list.length) kids.push(el('ul', { class: 'st-people' }, r.list.slice(0, 24).map(function (x) {
                var p = A.byId[x.id];
                return el('li', {}, [x.id === me ? el('span', { class: 'st-you', text: 'You' }) : link(p.name, p.url, 'st-person'), x.note ? el('span', { class: 'st-note', text: x.note }) : null]);
            })));
            if (r.after) { kids.push(el('h3', { class: 'st-sub', text: r.after.title })); kids.push(el('ul', { class: 'st-list' }, r.after.bullets.map(function (b) { return el('li', {}, [inline(b, sid)]); }))); }
            if (r.uncertainty && r.uncertainty.length && ['relationship', 'relation-list', 'age'].indexOf(r.type) < 0) kids.push(el('p', { class: 'st-caution', text: 'Not certain: ' + r.uncertainty.slice(0, 3).join('; ') }));
            if (r.photos && r.photos.length) kids.push(el('div', { class: 'st-photos' }, r.photos.slice(0, 6).map(function (ph) {
                var href = safeUrl(ph.url || ph.full) || '#';
                var a = el('a', { href: href, class: 'st-photo' }, [el('img', { src: ph.file, alt: ph.caption || '', loading: 'lazy' }), el('span', { text: trim(ph.caption, 64) })]);
                a.addEventListener('click', function (e) { go(e, href); });
                return a;
            })));
            if (r.mapLink) kids.push(el('p', {}, [link('See these places on the family map', r.mapLink, 'st-go')]));
            if (r.evidence && r.evidence.length) kids.push(sources(r.evidence, sid));
            var next = (r.more ? ['Tell me more'] : []).concat(r.followups || []);
            if (next.length) kids.push(chips(next.slice(0, 4)));
            return stuart(kids, 'st-msg--answer');
        }
        // each step reads from the person above it: "your mother", then "her father", then "his father"
        function edge(prevId, prev, rel) {
            if (prevId === me) return 'your ' + rel;
            if (prev.sex === 'F') return 'her ' + rel;
            if (prev.sex === 'M') return 'his ' + rel;
            return rel + ' of ' + prev.name;
        }
        function chain(d) {
            var ol = el('ol', { class: 'st-chain', 'aria-label': 'How they are connected' });
            d.steps.forEach(function (s, i) {
                var p = A.byId[s.id];
                if (i) {
                    var prev = A.byId[d.steps[i - 1].id];
                    var up = /father|mother|parent/.test(s.rel), side = /husband|wife|spouse/.test(s.rel);
                    ol.appendChild(el('li', { class: 'st-chain-rel', 'data-dir': up ? 'up' : side ? 'side' : 'down', text: edge(d.steps[i - 1].id, prev, s.rel) }));
                }
                ol.appendChild(el('li', { class: 'st-chain-who' + (s.id === me ? ' is-you' : '') }, [s.id === me ? el('span', { text: 'You' }) : link(p.name, p.url, 'st-person')]));
            });
            return ol;
        }
        function sources(list, sid) {
            var kind = { record: 'Original record', family: 'Family memory', reference: 'Reference', page: 'On this site', story: 'Family tree', photo: 'Photograph', calculated: 'Worked out' };
            var inner = el('ol', { class: 'st-src-list' }, list.map(function (e) {
                var url = safeUrl(e.url);
                var title = url ? link(e.title, url, null) : el('span', { text: e.title });
                if (url && e.external) { title.setAttribute('target', '_blank'); title.setAttribute('rel', 'noopener'); }
                return el('li', { id: sid + '-' + e.n }, [el('span', { class: 'st-src-n', text: String(e.n) }), el('span', { class: 'st-src-text' }, [
                    el('span', { class: 'st-kind st-kind--' + e.kind, text: kind[e.kind] || 'Record' }), title,
                    e.external ? el('span', { class: 'st-sr', text: ' (opens another site)' }) : null,
                    e.detail ? el('span', { class: 'st-src-detail', text: e.detail }) : null])]);
            }));
            var wrap = el('div', { class: 'st-src-wrap' }, [inner]);
            var btn = el('button', { type: 'button', class: 'st-src-toggle', 'aria-expanded': 'false', 'aria-controls': sid }, [icon('chevron'), 'Where this comes from', el('span', { class: 'st-count', text: String(list.length) })]);
            var box = el('div', { class: 'st-sources', id: sid }, [btn, wrap]);
            function set(open) { btn.setAttribute('aria-expanded', String(open)); box.classList.toggle('is-open', open); }
            btn.addEventListener('click', function () { set(btn.getAttribute('aria-expanded') !== 'true'); });
            box.addEventListener('st-open', function () { set(true); });
            return box;
        }
        function plainOf(r) {
            var t = r.paras.concat(r.bullets || []).join(' ');
            return t.replace(/\{\{p:([a-z0-9-]+)\}\}/g, function (m, pid) { return pid === me ? 'you' : A.nameOf(pid); }).replace(/\[\d+\]/g, '').slice(0, 600);
        }

        // ---------------------------------------------------------- asking
        function ask(raw, pin, shown, quiet) {
            var q = String(raw || '').trim().slice(0, 500);
            if (!q || !A) return;
            if (!ready) { pendingQ = q; return; }
            var asked = mine(shown || q);
            if (quiet) asked.classList.add('st-still');
            ta.value = ''; autosize(); send.disabled = true;
            if (pin) { convo.pins = Object.assign({}, convo.pins); convo.pins[pin.text] = pin.id; }
            convo.me = me && me !== 'visitor' ? me : null;
            var r;
            try { r = A.ask(q, convo); } catch (err) { r = null; }
            turns.push({ q: q, pin: pin || null, shown: shown || null });
            put(KEY.chat, { me: me, turns: turns }, true);
            function show() {
                if (!r) { stuart([el('p', { text: 'Something went wrong while I was looking that up. Please try asking another way.' })]); return; }
                var li = answer(r);
                if (quiet) li.classList.add('st-still');
                convo.focus = r.state.focus; convo.family = r.state.family; convo.period = r.state.period; convo.last = r.state.last;
                convo.history.push({ q: q, a: plainOf(r) });
                if (convo.history.length > 6) convo.history.shift();
                if (!quiet) { announce('Stuart answered. ' + trim(plainOf(r), 180)); bringIn(asked); }
            }
            if (quiet || REDUCE) { show(); return; }
            var t = typing();
            if (page || nearEnd()) bringIn(asked); else jump.hidden = false;
            // a short pause, so the answer arrives like a reply rather than a page refresh
            setTimeout(function () { t.remove(); show(); }, 420 + Math.min(380, q.length * 5));
        }

        // ---------------------------------------------------------- who the visitor is
        function firstName(pid) {
            var p = A.byId[pid];
            var nick = (p.aliases || []).filter(function (x) { return x.kind === 'nickname' && x.text.indexOf(' ') < 0; })[0];
            return nick ? nick.text : String(p.given || p.name).split(' ')[0];
        }
        function describe(pid) {
            var k = A.kin, out = [];
            [[A.PAT, 'Grandma Pat'], [A.RON, 'Grandpa Ron']].forEach(function (x) {
                if (x[0] === pid) return;
                var r = k.relate(x[0], pid);
                if (r && r.label && r.kind !== 'none' && r.kind !== 'unknown') out.push({ who: x[1], label: r.label, blood: r.kind === 'blood', marriage: /related by marriage/.test(r.label) });
            });
            if (pid === A.PAT) return 'Grandma Pat herself';
            if (pid === A.RON) return 'Grandpa Ron himself';
            var blood = out.filter(function (x) { return x.blood; });
            if (blood.length === 2 && blood[0].label === blood[1].label) return blood[0].who + ' and ' + blood[1].who + "'s " + blood[0].label;
            var best = blood[0] || out.filter(function (x) { return !x.marriage; })[0] || out[0];
            if (best && best.marriage) return 'related to ' + best.who + ' by marriage';
            return best ? best.who + "'s " + best.label : 'on the family tree';
        }
        function people() {
            // Grandma Pat and Grandpa Ron's own descendants first, oldest generation first; then those who married in
            var desc = {};
            A.kin.descendants(A.PAT).concat(A.kin.descendants(A.RON)).forEach(function (d) { desc[d.id] = true; });
            return Object.keys(A.byId).map(function (k) { return A.byId[k]; })
                .filter(function (p) { return p.living && !p.unidentified; })
                .sort(function (x, y) { return (desc[x.id] ? 0 : 1) - (desc[y.id] ? 0 : 1) || (x.generation || 0) - (y.generation || 0) || x.name.localeCompare(y.name); });
        }
        function picker() {
            var listId = 'st-pick-' + id, active = -1, shown = [];
            var input = el('input', { type: 'text', class: 'st-pick-input', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': listId,
                'aria-autocomplete': 'list', 'aria-label': 'Your name', placeholder: 'Start typing your name', autocomplete: 'off', spellcheck: 'false' });
            var list = el('ul', { class: 'st-pick-list', id: listId, role: 'listbox', 'aria-label': 'Family members' });
            var everyone = people();
            function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
            function matches(q) {
                q = norm(q).trim();
                if (!q) return everyone.slice(0, 8);
                return everyone.map(function (p) {
                    var names = [p.name].concat((p.aliases || []).map(function (a) { return a.text; }));
                    var score = 0;
                    names.forEach(function (n) { var w = norm(n); if (w.indexOf(q) === 0) score = Math.max(score, 3); else if (w.split(' ').some(function (x) { return x.indexOf(q) === 0; })) score = Math.max(score, 2); else if (w.indexOf(q) > 0) score = Math.max(score, 1); });
                    return { p: p, s: score };
                }).filter(function (x) { return x.s; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 8).map(function (x) { return x.p; });
            }
            function draw() {
                shown = matches(input.value);
                list.textContent = '';
                shown.forEach(function (p, i) {
                    var opt = el('li', { id: listId + '-' + i, role: 'option', class: 'st-pick-opt', 'aria-selected': String(i === active) }, [
                        el('span', { class: 'st-pick-name', text: p.name }), el('span', { class: 'st-pick-rel', text: describe(p.id) })]);
                    opt.addEventListener('mousedown', function (e) { e.preventDefault(); });
                    opt.addEventListener('click', function () { choose(p.id); });
                    list.appendChild(opt);
                });
                if (!shown.length) list.appendChild(el('li', { class: 'st-pick-none', role: 'presentation', text: 'No one by that name on the tree yet.' }));
                input.setAttribute('aria-expanded', 'true');
                if (active >= 0 && shown[active]) input.setAttribute('aria-activedescendant', listId + '-' + active); else input.removeAttribute('aria-activedescendant');
            }
            input.addEventListener('input', function () { active = 0; draw(); });
            input.addEventListener('focus', function () { draw(); });
            input.addEventListener('keydown', function (e) {
                if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(shown.length - 1, active + 1); draw(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(0, active - 1); draw(); }
                else if (e.key === 'Enter') { e.preventDefault(); if (shown[Math.max(0, active)]) choose(shown[Math.max(0, active)].id); }
                else if (e.key === 'Escape') { list.textContent = ''; input.setAttribute('aria-expanded', 'false'); }
            });
            var box = el('div', { class: 'st-pick' }, [el('label', { class: 'st-pick-label', for: 'st-pick-in-' + id, text: 'Who are you?' }), input, list,
                el('button', { type: 'button', class: 'st-link st-pick-visitor', onclick: function () { choose('visitor'); } }, ["I'm not on the family tree"])]);
            input.id = 'st-pick-in-' + id;
            box.input = input;
            draw();
            return box;
        }
        function intro() {
            var pick = picker();
            stuart([
                el('p', { class: 'st-hello', text: "Hello, I'm Stuart." }),
                el('p', { text: 'I look after the records of the FitzMaurice and Andrews families: the family tree, the certificates and census returns, the photographs and the stories on this site. Ask me about anyone, and I will answer from the records and show you where each fact comes from.' }),
                el('p', { text: 'First, who are you? Find yourself on the family tree, and I will answer from where you sit in it, so "my grandfather" or "my cousins" means yours.' }),
                pick], 'st-msg--intro');
            setTimeout(function () { if (opts.focus !== false) pick.input.focus({ preventScroll: true }); }, REDUCE ? 0 : 350);
        }
        // the person open on the family tree (#/person/id) or followed on the map (?person=id), if any
        function focusPerson() {
            var m = /#\/person\/([^\/?#]+)/.exec(location.hash) || /[?&]person=([^&#]+)/.exec(location.search);
            var id = m && decodeURIComponent(m[1]);
            return id && A.byId[id] && !A.byId[id].living ? id : null;
        }
        function pageChips() {
            var f = focusPerson();
            if (f) return [f];
            // on a story page, start with the people on it
            var count = {};
            (A.docs || []).forEach(function (d) {
                if (d.type !== 'section' || String(d.url || '').split('#')[0] !== HERE) return;
                (d.pagePeople || []).concat(d.people || []).forEach(function (p) { if (A.byId[p] && !A.byId[p].living) count[p] = (count[p] || 0) + 1; });
            });
            return Object.keys(count).sort(function (a, b) { return count[b] - count[a]; }).slice(0, 3);
        }
        function starters() {
            var onPage = page ? [] : pageChips();
            var out = [];
            if (me && me !== 'visitor') {
                onPage.slice(0, 2).forEach(function (p) { out.push('How am I related to ' + A.byId[p].name + '?'); });
                out = out.concat(['Who were my grandparents?', 'Who were my great-grandparents?', 'Where did my great-grandparents live?', 'Which of my ancestors went to South Africa?']);
            } else {
                onPage.forEach(function (p) { out.push('Who was ' + A.byId[p].name + '?'); });
                out = out.concat((A.examples || []).map(function (x) { return x.q; }));
            }
            return out.filter(function (q, i) { return out.indexOf(q) === i; }).slice(0, 4);
        }
        function pageName() { var t = String(document.title || '').split('|')[0].trim(); if (t) return t; var h = document.querySelector('h1'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : ''; }
        function greet(returning) {
            var kids = [];
            var onStory = !page && HERE !== 'index.html' && pageName();
            if (me && me !== 'visitor') {
                var nm = firstName(me);
                kids.push(el('p', { text: returning ? 'Welcome back, ' + nm + '.' : 'Lovely to meet you, ' + nm + '. You are ' + describe(me) + ', so the whole tree is your family.' }));
                if (!returning) kids.push(el('p', { text: 'When you ask about "my grandmother" or "my cousins", I will work it out from you. Ask about anyone by name too.' }));
            } else {
                kids.push(el('p', { text: returning ? 'Welcome back.' : 'That is fine. I will answer about the family as a whole. Ask about anyone by name, a place, a year or a family.' }));
            }
            var tool = HERE === 'family-tree.html' ? 'the family tree' : HERE === 'map.html' ? 'the family map' : null, f = !page && focusPerson();
            if (f) kids.push(el('p', { text: 'You are looking at ' + A.byId[f].name + (tool ? ' on ' + tool : '') + '. Here is where I would start:' }));
            else if (tool) kids.push(el('p', { text: 'You are looking at ' + tool + '. Here is where I would start:' }));
            else if (onStory) kids.push(el('p', { text: 'You are reading ' + onStory + '. Here is where I would start:' }));
            else kids.push(el('p', { text: 'Here are some places to start:' }));
            kids.push(chips(starters()));
            stuart(kids, 'st-msg--greet');
        }
        function setMe(pid) {
            me = pid;
            put(KEY.me, pid);
            ready = true;
            ta.disabled = false;
            ta.placeholder = 'Ask Stuart about the family';
            whoText.textContent = pid === 'visitor' ? 'Asking as a visitor.' : 'Asking as ' + A.byId[pid].name + '.';
            who.hidden = false;
        }
        function choose(pid) {
            if (pid !== 'visitor' && !A.byId[pid]) return;
            var pickMsg = log.querySelector('.st-msg--intro .st-pick');
            if (pickMsg) pickMsg.replaceWith(el('p', { class: 'st-picked', text: pid === 'visitor' ? 'Answering as a visitor.' : 'You are ' + A.byId[pid].name + '.' }));
            mine(pid === 'visitor' ? "I'm not on the family tree" : "I'm " + A.byId[pid].name);
            setMe(pid);
            turns = []; convo = { history: [], pins: {} };
            put(KEY.chat, { me: me, turns: turns }, true);
            var t = REDUCE ? null : typing();
            setTimeout(function () {
                if (t) t.remove();
                greet(false);
                toEnd(true);
                ta.focus({ preventScroll: true });
                if (pendingQ) { var q = pendingQ; pendingQ = null; ask(q); }
            }, REDUCE ? 0 : 500);
        }
        function changeMe() { put(KEY.me, null); me = null; ready = false; ta.disabled = true; send.disabled = true; who.hidden = true; ta.placeholder = 'Tell Stuart who you are first'; intro(); toEnd(true); }
        function restart() { turns = []; convo = { history: [], pins: {} }; put(KEY.chat, { me: me, turns: [] }, true); log.textContent = ''; greet(true); ta.focus(); }

        // ---------------------------------------------------------- start
        log.appendChild(el('li', { class: 'st-msg st-msg--stuart st-msg--loading' }, [el('div', { class: 'st-avatar' }, [seal()]), el('div', { class: 'st-body' }, [el('div', { class: 'st-typing', role: 'img', 'aria-label': 'Stuart is opening the archive' }, [el('span'), el('span'), el('span')])])]));
        loadArchive().then(function (archive) {
            A = archive;
            log.textContent = '';
            var saved = get(KEY.me);
            if (saved && (saved === 'visitor' || A.byId[saved])) {
                setMe(saved);
                var chat = get(KEY.chat, true);
                if (chat && chat.me === saved && chat.turns && chat.turns.length) {
                    // carry the conversation on from the last page, without replaying the animations
                    greet(true);
                    chat.turns.forEach(function (t) { ask(t.q, t.pin, t.shown, true); });
                    requestAnimationFrame(function () { toEnd(false); });
                } else greet(true);
                if (pendingQ) { var q = pendingQ; pendingQ = null; ask(q); }
            } else intro();
            if (opts.onReady) opts.onReady(self);
            if (wantFocus) self.focus();
        }).catch(function (e) {
            log.textContent = '';
            stuart([el('p', { text: 'I could not open the archive just now (' + e.message + '). The family tree and the other pages still work, and you can try again in a moment.' })]);
        });

        // focus the question box, or the name finder; if the archive is still loading, do it once it arrives
        var wantFocus = false;
        this.focus = function () {
            var i = ready ? ta : log.querySelector('.st-pick-input');
            if (i) { wantFocus = false; i.focus({ preventScroll: true }); } else wantFocus = true;
        };
        this.ask = function (q) { if (ready) ask(q); else pendingQ = q; };
        this.archive = function () { return A; };
        this.root = root;
    }

    // ------------------------------------------------------------------ the floating button, window and drawer
    function Widget() {
        var chat = null, mode = get(KEY.mode) === 'drawer' ? 'drawer' : 'float';
        var tip = el('div', { class: 'st-tip', id: 'st-tip', role: 'tooltip' }, [
            el('strong', { text: 'Ask Stuart, the family archivist' }),
            el('span', { text: 'Ask about anyone on the family tree. Stuart answers from the records on this site, works out how people are related to you, and shows where each fact comes from.' })]);
        var launch = el('button', { type: 'button', class: 'st-launch', 'aria-expanded': 'false', 'aria-controls': 'st-panel', 'aria-describedby': 'st-tip' }, [
            seal('st-launch-seal'), el('span', { class: 'st-launch-text', text: 'Ask Stuart' })]);
        var modeBtn = el('button', { type: 'button', class: 'st-icon-btn' });
        var title = el('div', { class: 'st-head-title' }, [el('strong', { text: 'Stuart' }), el('span', { text: 'Family archivist' })]);
        var head = el('header', { class: 'st-head' }, [el('div', { class: 'st-avatar' }, [seal()]), title, el('div', { class: 'st-head-tools' }, [
            modeBtn,
            el('a', { class: 'st-icon-btn', href: 'ask.html', title: 'Open Stuart on a full page', 'aria-label': 'Open Stuart on a full page' }, [icon('expand')]),
            el('button', { type: 'button', class: 'st-icon-btn', title: 'Close', 'aria-label': 'Close Stuart', onclick: function () { close(); } }, [icon('close')])])]);
        var bodyHost = el('div', { class: 'st-panel-body' });
        var panel = el('div', { class: 'st-panel', id: 'st-panel', role: 'dialog', 'aria-label': 'Chat with Stuart', 'data-mode': mode, tabindex: '-1', hidden: true }, [head, bodyHost]);
        // one labelled region holds the button, its explanation and the chat, so it is easy to find with a screen reader
        document.body.appendChild(el('aside', { class: 'st-widget', 'aria-label': 'Ask Stuart' }, [launch, tip, panel]));

        // On full-screen pages (the family tree, the map) the button shrinks to Stuart's seal, and the page names its
        // own controls in data-avoid so the button sits just above whichever of them is showing in the corner.
        var avoid = script.getAttribute('data-avoid') || '';
        if (script.hasAttribute('data-compact')) launch.classList.add('st-launch--compact');
        var lastBottom = null;
        function place() {
            if (!avoid) return;
            var W = window.innerWidth, H = window.innerHeight, edge = W <= 640 ? 14 : 22, size = launch.offsetHeight || 58, w = launch.offsetWidth || 58;
            var right = edge, bottom = edge, boxes = [];
            document.querySelectorAll(avoid).forEach(function (e) {
                var cs = getComputedStyle(e);
                if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0 || e.closest('[hidden]')) return;
                var r = e.getBoundingClientRect();
                if (r.width && r.height && r.bottom > 0 && r.top < H) boxes.push(r);
            });
            // move the button up past anything in its way, or left of a narrow panel down the right-hand side;
            // a wide panel is left alone (it scrolls under the button), but its own footer is listed and avoided
            for (var pass = 0, moved = true; moved && pass < 8; pass++) {
                moved = false;
                for (var i = 0; i < boxes.length; i++) {
                    var r = boxes[i], L = W - right - w - 8, R = W - right + 8, T = H - bottom - size - 8, B = H - bottom + 8;
                    if (r.right < L || r.left > R || r.bottom < T || r.top > B) continue;
                    if (r.top > H * 0.45) { bottom = Math.round(H - r.top + 12); moved = true; }
                    else if (r.right >= W - 2 && r.width < W * 0.6) { right = Math.round(W - r.left + edge); moved = true; }
                }
            }
            var key = right + ',' + bottom;
            if (key !== lastBottom) {
                lastBottom = key;
                document.documentElement.style.setProperty('--st-launch-bottom', bottom + 'px');
                document.documentElement.style.setProperty('--st-launch-right', right + 'px');
            }
        }
        if (avoid) {
            place();
            window.addEventListener('resize', place);
            // the page's controls change as people use it (the map's timeline, the tree's minimap): check now and then
            setInterval(function () { if (!document.hidden && !panel.classList.contains('is-open')) place(); }, 700);
        }

        function drawModeBtn() {
            modeBtn.textContent = '';
            var toDrawer = mode === 'float';
            modeBtn.appendChild(icon(toDrawer ? 'drawer' : 'float'));
            modeBtn.setAttribute('aria-label', toDrawer ? 'Show as a drawer down the side' : 'Show as a small window');
            modeBtn.title = modeBtn.getAttribute('aria-label');
        }
        modeBtn.addEventListener('click', function () {
            panel.classList.add('is-switching');
            setTimeout(function () {
                mode = mode === 'float' ? 'drawer' : 'float';
                panel.setAttribute('data-mode', mode);
                document.documentElement.classList.toggle('st-drawer-open', mode === 'drawer');
                put(KEY.mode, mode);
                drawModeBtn();
                requestAnimationFrame(function () { panel.classList.remove('is-switching'); });
            }, REDUCE ? 0 : 160);
        });
        drawModeBtn();

        function open(q) {
            if (!chat) chat = new Chat(bodyHost, { mode: 'widget', focus: true, onLeave: function (how) { if (how === 'page') put(KEY.open, true, true); else if (window.innerWidth < 640) close(); } });
            panel.hidden = false;
            launch.setAttribute('aria-expanded', 'true');
            document.documentElement.classList.toggle('st-drawer-open', mode === 'drawer');
            requestAnimationFrame(function () { requestAnimationFrame(function () { panel.classList.add('is-open'); launch.classList.add('is-hidden'); }); });
            put(KEY.open, true, true);
            // move focus into the chat straight away, then on to the question box when it is ready
            if (document.activeElement === launch || !panel.contains(document.activeElement)) panel.focus({ preventScroll: true });
            setTimeout(function () { chat.focus(); if (q) chat.ask(q); }, REDUCE ? 0 : 260);
        }
        function close() {
            panel.classList.remove('is-open');
            launch.classList.remove('is-hidden');
            launch.setAttribute('aria-expanded', 'false');
            document.documentElement.classList.remove('st-drawer-open');
            put(KEY.open, false, true);
            setTimeout(function () { if (!panel.classList.contains('is-open')) panel.hidden = true; }, REDUCE ? 0 : 320);
            launch.focus({ preventScroll: true });
        }
        launch.addEventListener('click', function () { open(); });
        panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
        document.addEventListener('click', function (e) {
            var t = e.target.closest && e.target.closest('[data-stuart-open]');
            if (t) { e.preventDefault(); open(t.getAttribute('data-stuart-ask') || null); }
        });
        // say hello once, the first time someone sees the button
        if (!get(KEY.seen)) { setTimeout(function () { tip.classList.add('is-peek'); put(KEY.seen, true); setTimeout(function () { tip.classList.remove('is-peek'); }, 5200); }, 1400); }
        // the chat was open on the last page: open it again here, and show the place the answer pointed to
        if (get(KEY.open, true)) open();
        var pending = get(KEY.flash, true);
        if (pending) { put(KEY.flash, null, true); setTimeout(function () { revealAnchor(pending); }, 450); }
        this.open = open; this.close = close;
        this.chat = function () { return chat; };
    }

    // ------------------------------------------------------------------ start up
    var script = document.currentScript;
    function start() {
        var host = document.getElementById('stuart-page');
        var navToggle = document.getElementById('navToggle');
        if (host && navToggle) navToggle.addEventListener('click', function () { document.getElementById('navLinks').classList.toggle('open'); });
        if (host) {
            var q = new URLSearchParams(location.search).get('q');
            if (get(KEY.flash, true)) put(KEY.flash, null, true);
            window.Stuart = { chat: new Chat(host, { mode: 'page', ask: q ? q.slice(0, 500) : null, onReady: function (chat) { window.__ask = { archive: chat.archive(), chat: chat }; } }) };
            return;
        }
        if (script && script.hasAttribute('data-widget')) window.Stuart = { widget: new Widget() };
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
})();
