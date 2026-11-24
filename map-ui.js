/* Family map: the page. Explore mode, the key and filters, the peek, the place and person panels,
 * Street View, map styles, then and now, the list view and the URL state. Timeline mode lives in
 * map-timeline.js and registers itself as a mode. */
(function () {
    'use strict';
    var FM = window.FM = window.FM || {};
    var CFG = window.FM_CONFIG || {};
    var $ = function (id) { return document.getElementById(id); };
    var esc = FM.data.esc, glyph = FM.glyph;
    var BASE = location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
    var ENGLAND = [[-6.4, 49.85], [1.9, 55.9]];
    var TYPE_PRIORITY = ['married', 'buried', 'died', 'baptised', 'born', 'served', 'lived', 'worked', 'sailed', 'photographed', 'civil case', 'celebrated'];
    var CONF_RANK = { 'confirmed': 0, 'probable': 1, 'family tradition': 2, 'unverified': 3 };
    var MIN_YEAR = 1400, MAX_YEAR = 2030;
    var reducedMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

    var S = {
        mode: 'explore', style: 'today', place: null, person: null, scope: 'self', from: null, to: null,
        hidden: {}, orkney: false, fam: null, gen: 3, sib: false, streets: false, compare: false, beyond: false, event: null
    };
    var DATA = null, map = null, cmap = null, camera = null;
    var markers = {}, markerOrder = '', peekTimer = null, peekFor = null, peekHideTimer = null, lastTapKey = null;
    var styleCache = {}, styleState = { failed: false, current: null };
    var modes = {}, modeOrder = [];
    var personStops = [];
    var ready = false;

    // ================================================================== helpers
    function yearOf(d) { return d ? +String(d).slice(0, 4) : null; }
    function announce(t) { var l = $('live'); if (!l) return; l.textContent = ''; setTimeout(function () { l.textContent = t; }, 30); }
    function note(t, ms) {
        var n = $('note'); if (!n) return;
        n.textContent = t; n.hidden = false;
        clearTimeout(note._t); note._t = setTimeout(function () { n.hidden = true; }, ms || 5200);
    }
    function reduced() { return !!reducedMQ.matches; }
    function initials(p) { return String(p.displayName || '').split(/\s+/).filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase(); }
    function avatar(p, cls) {
        var img = p.photo || p.portrait;
        if (img && !DATA.orkney[p.id]) return '<span class="av ' + (cls || '') + '"><img src="' + esc(img) + '" alt="" loading="lazy"></span>';
        return '<span class="av av--mono ' + (cls || '') + '" aria-hidden="true">' + esc(initials(p)) + '</span>';
    }
    function lifeYears(p) {
        var b = p.birth && (p.birth.date || '').slice(0, 4), d = p.death && (p.death.date || '').slice(0, 4);
        if (!b && !d) return '';
        return (b ? (p.birth.dateQualifier || /about|probably/i.test(p.birth.display || '') ? 'c. ' : '') + b : '?') + ' to ' + (d || '?');
    }
    function confLabel(c) { return c === 'family tradition' ? 'Family statement' : c === 'confirmed' ? 'Confirmed' : c === 'probable' ? 'Probable' : (c || ''); }
    function confClass(c) { return c === 'confirmed' ? 'c-conf' : c === 'probable' ? 'c-prob' : 'c-fam'; }
    function placeLL(pl) { return [pl.lng, pl.lat]; }
    function personName(id) { var p = DATA.people[id]; return p ? p.displayName : id; }
    var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    function fmtISO(iso, prec) {
        if (!iso) return '';
        var p = String(iso).split('-'), m = +p[1], d = +p[2];
        if (prec === 'day' && d) return d + ' ' + MONTHS[m - 1] + ' ' + p[0];
        if (prec === 'month' && m) return MONTHS[m - 1] + ' ' + p[0];
        return p[0];
    }
    // the date as the site records it, without the place or age words that
    // some recorded dates carry ("10 May 1895, Edgbaston, aged 64" reads "10 May 1895")
    function dateLabel(e) {
        if (!e.dateStart) {
            if (e.voyageEnd === 'arrival') return 'Arrival date not recorded';
            if (e.voyageEnd === 'departure') return 'Sailing date not recorded';
            return 'Date unknown';
        }
        var d = String(e.date || '').replace(/\s*\(family\)/i, '').trim();
        if (d && !e.isVoyage) {
            var out = d.split(/,\s*/).filter(function (x, i) { return i === 0 || (/\b\d{4}\b/.test(x) && !/^(as\s+)?aged\b|^under\b/i.test(x)); }).join(', ');
            if (e.type === 'baptised') out = out.replace(/^(probably\s+|about\s+)?baptised\s+/i, '$1');
            if (/\d{4}|\d0s\b/.test(out) && out.length <= 44) return out;
        }
        var prec = e.datePrecision === 'day' || e.datePrecision === 'month' ? e.datePrecision : 'year';
        var label = fmtISO(e.dateStart, prec);
        if (e.isVoyage && e.dateEnd && e.dateEnd !== e.dateStart) label += ' to ' + fmtISO(e.dateEnd, prec);
        return (e.approximate && !e.isVoyage ? 'about ' : '') + label;
    }
    function spanOf(evs) {
        var ys = []; evs.forEach(function (e) { if (e.dateStart) { ys.push(yearOf(e.dateStart)); ys.push(yearOf(e.dateEnd)); } });
        if (!ys.length) return 'Date unknown';
        var a = Math.min.apply(null, ys), b = Math.max.apply(null, ys);
        return a === b ? String(a) : a + ' to ' + b;
    }
    function headline(e) { return FM.data.headline(e, DATA.people, DATA.places); }
    // what a place is, in a few words: its main event, and how many more
    function placeHeadline(evs) {
        var seen = [], order = evs.slice().sort(function (a, b) { return (TYPE_PRIORITY.indexOf(a.type) - TYPE_PRIORITY.indexOf(b.type)) || FM.data.byDate(a, b); });
        order.forEach(function (e) { var h = headline(e); if (seen.indexOf(h) < 0) seen.push(h); });
        return { text: seen[0] || '', more: Math.max(0, seen.length - 1), all: seen };
    }
    function approxLine(pl) {
        if (pl.drawAs === 'area') return 'Somewhere in ' + (/^(the|a)\s/i.test(pl.name) ? '' : pl.kind === 'registration district' || pl.kind === 'district' || pl.kind === 'parish' ? 'the ' : '') + pl.name + '. The exact place is not known, so the pin marks the middle of the area.';
        if (pl.drawAs === 'halo') return 'In this general area, within ' + metresText(pl.uncertaintyMetres) + ' of the pin. The exact house is not known.';
        return '';
    }
    function metresText(m) { return m >= 1500 ? 'about ' + Math.round(m / 1000) + ' km' : 'about ' + Math.round(m / 10) * 10 + ' metres'; }

    // ================================================================== filters and scope
    function scopeIds() {
        if (!S.person || !DATA.people[S.person]) return null;
        var p = DATA.people[S.person], out = {};
        out[p.id] = true;
        function parents(x) { return (x.parents || []).map(function (r) { return typeof r === 'string' ? r : r.id; }).filter(function (id) { return DATA.people[id]; }); }
        function children(x) { return (x.children || []).map(function (r) { return typeof r === 'string' ? r : r.id; }).filter(function (id) { return DATA.people[id]; }); }
        if (S.scope === 'spouse') (p.spouses || []).forEach(function (s) { out[s.id] = true; });
        if (S.scope === 'family') { parents(p).concat(children(p)).forEach(function (id) { out[id] = true; }); }
        if (S.scope === 'ancestors') { var q = parents(p); while (q.length) { var id = q.shift(); if (!out[id]) { out[id] = true; q = q.concat(parents(DATA.people[id])); } } }
        if (S.scope === 'descendants') { var r = children(p); while (r.length) { var c = r.shift(); if (!out[c]) { out[c] = true; r = r.concat(children(DATA.people[c])); } } }
        Object.keys(out).forEach(function (id) { if (!DATA.visible(id)) delete out[id]; });
        return out;
    }
    // ---- family: Ron's or Pat's (or both), back a chosen number of generations
    var FAMILIES = { ron: { label: "Ron's family", roots: ['ronald-andrews'] }, pat: { label: "Pat's family", roots: ['patricia-andrews'] }, both: { label: "Ron's and Pat's families", roots: ['ronald-andrews', 'patricia-andrews'] } };
    var GENS = [[1, 'Parents'], [2, 'Grandparents'], [3, 'Great-grandparents'], [4, '2x great-grandparents'], [5, '3x great-grandparents'], [0, 'Every generation']];
    var famCache = { key: null, set: null };
    function refIds(list) { return (list || []).map(function (r) { return typeof r === 'string' ? r : r && r.id; }).filter(function (id) { return id && DATA.people[id]; }); }
    function familySet() {
        if (!S.fam || !FAMILIES[S.fam]) return null;
        var key = S.fam + '|' + S.gen + '|' + (S.sib ? 1 : 0);
        if (famCache.key === key) return famCache.set;
        var out = {}, front = FAMILIES[S.fam].roots.slice(), depth = 0;
        front.forEach(function (id) { out[id] = 0; });
        while (front.length && (!S.gen || depth < S.gen)) {
            depth++;
            var next = [];
            front.forEach(function (id) { refIds(DATA.people[id].parents).forEach(function (pid) { if (!(pid in out)) { out[pid] = depth; next.push(pid); } }); });
            front = next;
        }
        if (S.sib) Object.keys(out).forEach(function (id) {
            refIds(DATA.people[id].parents).forEach(function (pid) { refIds(DATA.people[pid].children).forEach(function (c) { if (!(c in out)) out[c] = out[id]; }); });
        });
        var set = {}; Object.keys(out).forEach(function (id) { if (DATA.visible(id)) set[id] = true; });
        famCache = { key: key, set: set };
        return set;
    }
    FM.familySet = familySet;
    function eventPasses(e, opts) {
        opts = opts || {};
        if (S.hidden[e.group]) return false;
        var fam = familySet();
        if (fam && !e.personIds.some(function (id) { return fam[id]; })) return false;
        if (e.orkney && !S.orkney) return false;
        if (!opts.ignoreYears && (S.from != null || S.to != null)) {
            if (e.dateStart) {
                if (S.to != null && yearOf(e.dateStart) > S.to) return false;
                if (S.from != null && yearOf(e.dateEnd) < S.from) return false;
            }
        }
        return true;
    }
    function visiblePlaceEvents(pid, opts) {
        return (DATA.placeEvents[pid] || []).filter(function (e) { return eventPasses(e, opts); });
    }
    FM.filters = { eventPasses: eventPasses, scopeIds: scopeIds, state: S };

    // ================================================================== map styles
    function loadStyleJson(name) {
        if (styleCache[name]) return Promise.resolve(JSON.parse(JSON.stringify(styleCache[name])));
        return fetch(BASE + 'map-styles/' + name + '.json').then(function (r) { return r.json(); }).then(function (s) {
            var t = JSON.stringify(s).split('{GLYPHS}').join(BASE + 'fonts/{fontstack}/{range}.pbf').split('{BASE}').join(BASE);
            styleCache[name] = JSON.parse(t);
            return JSON.parse(t);
        });
    }
    var EDITIONS = [
        { id: 'uk-osgb63k1885', name: 'Ordnance Survey one-inch, 1885 to 1900', from: 0, to: 1887, note: 'the earliest edition available here' },
        { id: 'uk-oslondon1k1893', name: 'Ordnance Survey London five-foot, 1893 to 1896', from: 1888, to: 1905, london: true },
        { id: 'uk-osgb10k1888', name: 'Ordnance Survey six-inch, 1888 to 1913', from: 1888, to: 1918 },
        { id: 'uk-osgb1919', name: 'Ordnance Survey, 1919 to 1947', from: 1919, to: 1936 },
        { id: 'uk-osgb25k1937', name: 'Ordnance Survey 1:25,000, 1937 to 1961', from: 1937, to: 1954 },
        { id: 'uk-osgb63k1955', name: 'Ordnance Survey one-inch, 1955 to 1961', from: 1955, to: 3000 }
    ];
    function editionFor(year, lngLat) {
        var y = year || 1900;
        var inLondon = lngLat && lngLat[0] > -0.55 && lngLat[0] < 0.35 && lngLat[1] > 51.3 && lngLat[1] < 51.7;
        for (var i = 0; i < EDITIONS.length; i++) {
            var e = EDITIONS[i];
            if (e.london && !inLondon) continue;
            if (y >= e.from && y <= e.to) return e;
        }
        return EDITIONS[EDITIONS.length - 1];
    }
    FM.editionFor = editionFor;
    function nlsSource(ed) {
        return { type: 'raster', url: 'https://api.maptiler.com/tiles/' + ed.id + '/tiles.json?key=' + encodeURIComponent(CFG.MAPTILER_KEY), tileSize: 256,
                 attribution: '<a href="https://maps.nls.uk/projects/subscription-api/" target="_blank" rel="noopener">National Library of Scotland</a> historic maps via <a href="https://www.maptiler.com/copyright/" target="_blank" rel="noopener">MapTiler</a>' };
    }
    function styleFor(name, ctx) {
        if (name === 'today') return styleState.failed ? loadStyleJson('fallback') : Promise.resolve('https://tiles.openfreemap.org/styles/liberty');
        if (name === 'fallback') return loadStyleJson('fallback');
        return loadStyleJson(styleState.failed ? 'fallback' : 'atlas').then(function (s) {
            if (name === 'then' && CFG.MAPTILER_KEY) {
                var ed = editionFor(ctx && ctx.year, ctx && ctx.lngLat);
                s.sources.nls = nlsSource(ed);
                var firstSymbol = 0; for (var i = 0; i < s.layers.length; i++) { if (s.layers[i].type === 'symbol') { firstSymbol = i; break; } }
                s.layers.splice(firstSymbol || s.layers.length, 0, { id: 'nls', type: 'raster', source: 'nls', paint: { 'raster-opacity': 1, 'raster-fade-duration': 300 } });
                s.metadata = Object.assign({}, s.metadata, { edition: ed });
            }
            return s;
        });
    }
    function thenContext() {
        var pl = S.place && DATA.places[S.place];
        var y = null;
        if (FM.timelineYear && S.mode === 'timeline') y = FM.timelineYear();
        else if (pl) { var ev = visiblePlaceEvents(pl.id)[0]; y = ev && yearOf(ev.dateStart); }
        else if (S.to != null) y = S.to;
        return { year: y || 1900, lngLat: pl ? placeLL(pl) : map && map.getCenter().toArray() };
    }
    function setStyle(name, opts) {
        opts = opts || {};
        if ((name === 'then') && !CFG.MAPTILER_KEY) {
            // without a key the map stays as it is, rather than jumping to another style
            note('The old maps are not switched on yet: they need a free MapTiler key in config.js.');
            renderStyleSwitch();
            return Promise.resolve();
        }
        S.style = name;
        renderStyleSwitch();
        return styleFor(name, thenContext()).then(function (st) {
            styleState.current = name;
            map.setStyle(st, { diff: false });
            showEdition(name === 'then' && st.metadata ? st.metadata.edition : null);
            if (!opts.silent) writeURL();
        });
    }
    function showEdition(ed) {
        var el = $('edition');
        if (!ed) { el.hidden = true; return; }
        el.hidden = false;
        el.innerHTML = '<strong>' + esc(ed.name) + '</strong>' + (ed.note ? ' (' + esc(ed.note) + ')' : '') + '<br>Map: <a href="https://maps.nls.uk/" target="_blank" rel="noopener">National Library of Scotland</a>, CC BY';
    }
    FM.setThenEdition = function (year, lngLat) {
        if (S.style !== 'then' || !CFG.MAPTILER_KEY || !map) return;
        var ed = editionFor(year, lngLat), cur = map.getSource('nls');
        if (cur && map._fmEdition === ed.id) return;
        map._fmEdition = ed.id;
        var src = nlsSource(ed), nid = 'nls-' + ed.id;
        if (map.getSource(nid)) return;
        try {
            map.addSource(nid, src);
            var before = map.getLayer('nls') ? 'nls' : undefined;
            map.addLayer({ id: nid, type: 'raster', source: nid, paint: { 'raster-opacity': 0, 'raster-opacity-transition': { duration: reduced() ? 0 : 900 } } }, before);
            map.moveLayer(nid, before);
            requestAnimationFrame(function () { map.setPaintProperty(nid, 'raster-opacity', 1); });
            setTimeout(function () {
                map.getStyle().layers.forEach(function (l) { if (/^nls/.test(l.id) && l.id !== nid) { map.removeLayer(l.id); } });
                Object.keys(map.getStyle().sources).forEach(function (s) { if (/^nls/.test(s) && s !== nid) try { map.removeSource(s); } catch (e) { /* still in use */ } });
            }, reduced() ? 50 : 1000);
            showEdition(ed);
        } catch (e) { /* style not ready yet */ }
    };
    function renderStyleSwitch() {
        var box = $('styleSwitch');
        var opts = [['today', 'Today'], ['atlas', 'Atlas'], ['then', 'Then']];
        box.innerHTML = opts.map(function (o) {
            return '<button type="button" role="radio" aria-checked="' + (S.style === o[0]) + '" data-style="' + o[0] + '"' +
                (o[0] === 'then' && !CFG.MAPTILER_KEY ? ' title="Needs a MapTiler key (see config.js)"' : '') + '>' + o[1] + '</button>';
        }).join('');
    }

    // ================================================================== overlays
    function circlePoly(lng, lat, r, n) {
        n = n || 64; var out = [];
        for (var i = 0; i <= n; i++) {
            var a = (i / n) * Math.PI * 2;
            var dx = r * Math.cos(a), dy = r * Math.sin(a);
            out.push([lng + (dx / (111320 * Math.cos(lat * Math.PI / 180))), lat + dy / 110540]);
        }
        return out;
    }
    function firstSymbolLayer() {
        var ls = map.getStyle().layers || [];
        for (var i = 0; i < ls.length; i++) if (ls[i].type === 'symbol') return ls[i].id;
        return undefined;
    }
    function addOverlays() {
        if (!map.getStyle()) return;
        var before = firstSymbolLayer();
        function src(id) { if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } }); }
        ['fm-areas', 'fm-halos', 'fm-path', 'fm-arcs', 'fm-trails', 'fm-hl'].forEach(src);
        function layer(def) { if (!map.getLayer(def.id)) map.addLayer(def, before); }
        layer({ id: 'fm-area-fill', type: 'fill', source: 'fm-areas', paint: { 'fill-color': ['case', ['get', 'orkney'], '#8b0000', '#704214'], 'fill-opacity': 0.08 } });
        layer({ id: 'fm-area-line', type: 'line', source: 'fm-areas', paint: { 'line-color': ['case', ['get', 'orkney'], '#8b0000', '#704214'], 'line-width': ['case', ['get', 'hl'], 2, 1.1], 'line-dasharray': [3, 2.4], 'line-opacity': ['case', ['get', 'faded'], 0.25, 0.65] } });
        layer({ id: 'fm-halo', type: 'circle', source: 'fm-halos', paint: {
            'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 0, ['get', 'k'], 22, ['*', ['get', 'k'], 4194304]],
            'circle-color': ['case', ['get', 'orkney'], '#8b0000', '#b8860b'],
            'circle-opacity': 0.14, 'circle-blur': 0.55,
            'circle-stroke-width': ['case', ['get', 'hl'], 1.2, 0], 'circle-stroke-color': '#8b0000', 'circle-stroke-opacity': 0.5 } });
        layer({ id: 'fm-trails', type: 'line', source: 'fm-trails', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#8b0000', 'line-width': 1.6, 'line-opacity': ['get', 'o'], 'line-dasharray': [1, 2.2] } });
        layer({ id: 'fm-path-casing', type: 'line', source: 'fm-path', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fffdf9', 'line-width': 5, 'line-opacity': 0.8 } });
        layer({ id: 'fm-path', type: 'line', source: 'fm-path', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#8b0000', 'line-width': 2, 'line-dasharray': [2, 2] } });
        layer({ id: 'fm-arcs', type: 'line', source: 'fm-arcs', layout: { 'line-cap': 'round' }, paint: { 'line-color': '#7f5c0b', 'line-width': 2, 'line-opacity': 0.85, 'line-dasharray': [0.5, 2] } });
        refreshOverlays();
        if (FM.onOverlays) FM.onOverlays();
    }
    var areaFocus = null; // the place whose area is shown while its peek is open
    var lastData = FM.lastData = {};
    function setData(id, fc) { lastData[id] = fc; var s = map && map.getSource(id); if (s) s.setData(fc); }
    FM.setData = setData;

    // ================================================================== markers
    function placeSummary(pid, evs) {
        var pl = DATA.places[pid];
        var types = {}; evs.forEach(function (e) { types[e.type] = true; });
        var head = TYPE_PRIORITY.filter(function (t) { return types[t]; })[0] || 'lived';
        var best = evs.map(function (e) { return CONF_RANK[e.familyStatement ? 'family tradition' : e.confidence] || 0; });
        var conf = best.length ? Math.min.apply(null, best) : 1;
        var confName = conf === 0 ? 'confirmed' : conf === 1 ? 'probable' : 'family tradition';
        if (evs.length && evs.every(function (e) { return e.familyStatement; })) confName = 'family tradition';
        return { place: pl, events: evs, head: head, conf: confName, orkney: !!pl.noProvenLink || evs.every(function (e) { return e.orkney; }), types: Object.keys(types) };
    }
    function currentItems() {
        var scope = scopeIds(), items = [];
        Object.keys(DATA.places).forEach(function (pid) {
            var pl = DATA.places[pid];
            if (pl.lat == null) return;
            var evs = visiblePlaceEvents(pid);
            if (FM.timelineFilter && S.mode === 'timeline') evs = FM.timelineFilter(evs, pid);
            if (!evs.length) return;
            var sm = placeSummary(pid, evs);
            sm.faded = !!scope && !evs.some(function (e) { return e.personIds.some(function (id) { return scope[id]; }); });
            if (FM.timelineState && S.mode === 'timeline') { var ts = FM.timelineState(pid, evs); sm.tl = ts; }
            items.push(sm);
        });
        return items;
    }
    function refreshOverlays() {
        if (!map || !map.getSource('fm-areas')) return;
        var items = currentItems();
        lastItems = items;
        refreshAreas();
        updateMarkers(items);
    }
    // the soft area round an approximate place is drawn only while that place is in focus
    // (its peek is open, its panel is open, or it is the timeline's current event)
    function refreshAreas() {
        if (!map || !map.getSource('fm-areas')) return;
        var areas = [], halos = [];
        lastItems.forEach(function (it) {
            var pl = it.place;
            if (pl.drawAs === 'pin') return;
            var hl = (S.place === pl.id) || (it.tl && it.tl.current) || pl.id === areaFocus;
            if (!hl) return;
            if (pl.drawAs === 'area') areas.push({ type: 'Feature', properties: { id: pl.id, faded: false, hl: true, orkney: it.orkney }, geometry: { type: 'Polygon', coordinates: [circlePoly(pl.lng, pl.lat, pl.uncertaintyMetres || 2000)] } });
            else halos.push({ type: 'Feature', properties: { id: pl.id, k: (pl.uncertaintyMetres || 500) / (156543.03392 * Math.cos(pl.lat * Math.PI / 180)), faded: false, hl: true, orkney: it.orkney }, geometry: { type: 'Point', coordinates: placeLL(pl) } });
        });
        setData('fm-areas', { type: 'FeatureCollection', features: areas });
        setData('fm-halos', { type: 'FeatureCollection', features: halos });
    }
    FM.refresh = function () { refreshOverlays(); renderKey(); renderChips(); };

    var lastItems = [], tapZoomParked = false;
    function updateMarkers(items) {
        if (items) lastItems = items; else items = lastItems;
        if (!map) return;
        var z = map.getZoom();
        // screen-space clustering: places closer than 34 px share a marker
        var pts = items.map(function (it) { var p = map.project(placeLL(it.place)); return { it: it, x: p.x, y: p.y }; });
        pts.sort(function (a, b) { return b.it.events.length - a.it.events.length; });
        var clusters = [];
        var R = z >= 15.5 ? 0 : 34;
        pts.forEach(function (p) {
            var hit = null;
            for (var i = 0; i < clusters.length && R; i++) {
                var c = clusters[i];
                if (Math.abs(c.x - p.x) < R && Math.abs(c.y - p.y) < R) { hit = c; break; }
            }
            if (hit) { hit.members.push(p.it); }
            else clusters.push({ x: p.x, y: p.y, members: [p.it], seed: p.it });
        });
        var keep = {};
        clusters.forEach(function (c) {
            c.members.sort(function (a, b) { return (a.events[0].dateStart || '9') < (b.events[0].dateStart || '9') ? -1 : 1; });
            var key = c.members.map(function (m) { return m.place.id; }).sort().join('|');
            keep[key] = true;
            var lngLat = placeLL(c.seed.place);
            var mk = markers[key];
            var html = markerHTML(c.members);
            if (!mk) {
                var el = document.createElement('button');
                el.type = 'button';
                el.className = 'mk-wrap';
                el.innerHTML = html.inner;
                mk = { key: key, el: el, members: c.members, marker: new maplibregl.Marker({ element: el, anchor: html.anchor }).setLngLat(lngLat).addTo(map) };
                bindMarker(mk);
                markers[key] = mk;
                mk.isNew = true;
            } else {
                mk.members = c.members;
                mk.marker.setLngLat(lngLat);
                if (mk.el._html !== html.inner) mk.el.innerHTML = html.inner;
            }
            mk.el._html = html.inner;
            // keep MapLibre's own classes (they position the marker) and replace only ours
            var ml = Array.prototype.filter.call(mk.el.classList, function (c) { return c.indexOf('maplibregl-') === 0; }).join(' ');
            mk.el.className = 'mk-wrap ' + html.cls + (ml ? ' ' + ml : '');
            if (mk.isNew) {
                mk.isNew = false;
                var nel = mk.el; nel.classList.add('is-new');
                requestAnimationFrame(function () { requestAnimationFrame(function () { nel.classList.remove('is-new'); }); });
            }
            mk.el.setAttribute('aria-label', html.label);
            mk.el.dataset.places = key;
            mk.first = (c.members.map(function (m) { return m.events[0].dateStart || '9999'; }).sort()[0]);
        });
        Object.keys(markers).forEach(function (k) { if (!keep[k]) { markers[k].marker.remove(); delete markers[k]; } });
        // keyboard order follows the dates
        var order = Object.keys(markers).sort(function (a, b) { return markers[a].first < markers[b].first ? -1 : markers[a].first > markers[b].first ? 1 : (a < b ? -1 : 1); });
        var sig = order.join(',');
        if (sig !== markerOrder) {
            markerOrder = sig;
            var active = document.activeElement;
            var parent = map.getCanvasContainer();
            order.forEach(function (k) { var w = markers[k].marker.getElement(); if (w !== active) parent.appendChild(w); });
        }
        if (FM.afterMarkers) FM.afterMarkers(markers);
    }
    function markerHTML(members) {
        if (members.length > 1) {
            var n = members.reduce(function (a, m) { return a + m.events.length; }, 0);
            var allFaded = members.every(function (m) { return m.faded; });
            var anyOrk = members.every(function (m) { return m.orkney; });
            var tlCur = members.some(function (m) { return m.tl && m.tl.current; });
            var tlPast = members.every(function (m) { return m.tl && m.tl.past; });
            var tlFut = members.every(function (m) { return m.tl && m.tl.future; });
            return {
                anchor: 'center', cls: 'mk--cluster' + (allFaded ? ' is-faded' : '') + (anyOrk ? ' is-orkney' : '') + (tlCur ? ' is-current' : '') + (tlPast ? ' is-past' : '') + (tlFut ? ' is-future' : ''),
                inner: '<span class="mk-c"><span class="mk-n">' + members.length + '</span><span class="mk-sub">places</span></span>',
                label: members.length + ' places close together, ' + n + ' events: ' + members.map(function (m) { return placeHeadline(m.events).text + ', ' + m.place.name; }).slice(0, 6).join('; ') + (members.length > 6 ? '; and more' : '') + '. Press Enter to zoom in.'
            };
        }
        var m = members[0], pl = m.place;
        var approx = pl.drawAs !== 'pin';
        var cls = 'mk--pin' + (approx ? ' mk--approx' : '') + ' mk-conf--' + (m.conf === 'family tradition' ? 'family' : m.conf) + (m.faded ? ' is-faded' : '') + (m.orkney ? ' is-orkney' : '') + (S.place === pl.id ? ' is-selected' : '') +
                  (m.tl ? (m.tl.current ? ' is-current' : '') + (m.tl.past ? ' is-past' : '') + (m.tl.future ? ' is-future' : '') : '');
        var count = m.events.length > 1 ? '<span class="mk-count" aria-hidden="true">' + m.events.length + '</span>' : '';
        var hd = placeHeadline(m.events);
        var shape = '<span class="mk-pin"><svg class="mk-pin-bg" viewBox="0 0 30 40" aria-hidden="true"><path d="M15 39C15 39 3 24.5 3 15a12 12 0 0 1 24 0c0 9.5-12 24-12 24z"/></svg>' + glyph(m.head, 'mk-gl') + '</span>';
        var tag = '<span class="mk-label" aria-hidden="true">' + esc(hd.text) + (hd.more ? ' <i>+' + hd.more + '</i>' : '') + '</span>';
        var label = hd.text + (hd.more ? ' and ' + hd.more + ' more' : '') + ', ' + pl.name + ', ' + spanOf(m.events) +
                    (approx ? '. Somewhere in this area, not an exact address' : '') + (m.orkney ? '. No proven link to this family' : '') + '.';
        return { anchor: 'bottom', cls: cls, inner: shape + count + tag, label: label };
    }
    // the area chip's label: the name before its first comma, never cut mid-word
    function shortName(pl) {
        var n = String(pl.name).replace(/\s*registration district$/i, ' district').split(',')[0].trim();
        if (n.length <= 26) return n;
        var cut = n.slice(0, 26), sp = cut.lastIndexOf(' ');
        return (sp > 10 ? cut.slice(0, sp) : cut) + '\u2026';
    }

    function bindMarker(mk) {
        var el = mk.el;
        el.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'touch') return;
            clearTimeout(peekHideTimer);
            clearTimeout(peekTimer);
            peekTimer = setTimeout(function () { showPeek(mk); }, 120);
        });
        el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'touch') return; clearTimeout(peekTimer); schedulePeekHide(); }); // a finger lifting is not leaving
        el.addEventListener('focus', function () { showPeek(mk); });
        el.addEventListener('blur', function () { schedulePeekHide(); });
        el.addEventListener('click', function (e) {
            e.stopPropagation();
            var touch = e.pointerType === 'touch' || (e.detail && el._lastPointer === 'touch');
            if (mk.members.length > 1) { zoomToCluster(mk); return; }
            if (touch && peekFor !== mk.key) { showPeek(mk); return; }
            // in Timeline a marker moves the playhead to its event; elsewhere it opens the place
            if (S.mode === 'timeline' && FM.timelineJumpToPlace) { hidePeek(); FM.timelineJumpToPlace(mk.members[0].place.id); return; }
            openPlace(mk.members[0].place.id, { opener: el, push: true });
        });
        el.addEventListener('pointerdown', function (e) { el._lastPointer = e.pointerType; });
        // two quick taps on a marker are peek then open, not the map's double-tap zoom
        el.addEventListener('touchstart', function () { if (map.doubleClickZoom.isEnabled()) { map.doubleClickZoom.disable(); tapZoomParked = true; } }, { passive: true });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { hidePeek(); }
        });
    }
    function zoomToCluster(mk) {
        var b = new maplibregl.LngLatBounds(placeLL(mk.members[0].place), placeLL(mk.members[0].place));
        mk.members.forEach(function (m) { b.extend(placeLL(m.place)); });
        var sw = b.getSouthWest(), ne = b.getNorthEast();
        if (FM.geo.dist([sw.lng, sw.lat], [ne.lng, ne.lat]) < 30 || map.getZoom() >= 15.4) {
            showPeek(mk, { chooser: true });
            return;
        }
        hidePeek();
        fitTo(b, cameraPadding(80), { maxZoom: 15.6, duration: reduced() ? 0 : 900 });
    }

    // ================================================================== peek (level 1)
    function schedulePeekHide() {
        clearTimeout(peekHideTimer);
        peekHideTimer = setTimeout(function () {
            var pk = $('peek');
            if (pk.matches(':hover') || pk.contains(document.activeElement)) return;
            var f = document.activeElement && document.activeElement.closest && document.activeElement.closest('.mk-wrap');
            if (f && peekFor && markers[peekFor] && markers[peekFor].el === f) return;
            hidePeek();
        }, 220);
    }
    function hidePeek() { var pk = $('peek'); pk.hidden = true; peekFor = null; setAreaFocus(null); }
    function setAreaFocus(pid) { if (areaFocus === pid) return; areaFocus = pid; refreshAreas(); }
    function showPeek(mk, opts) {
        opts = opts || {};
        var pk = $('peek');
        peekFor = mk.key;
        if (mk.members.length > 1) {
            pk.innerHTML = '<p class="pk-kicker">' + mk.members.length + ' places here</p><ul class="pk-choose">' + mk.members.map(function (m) {
                var hd = placeHeadline(m.events);
                return '<li><button type="button" data-open-place="' + esc(m.place.id) + '">' + glyph(m.head) + '<span>' + esc(hd.text) + (hd.more ? ' <em>and ' + hd.more + ' more</em>' : '') +
                    '</span><small>' + esc(m.place.name) + ', ' + esc(spanOf(m.events)) + (m.place.drawAs !== 'pin' ? ', somewhere in the area' : '') + '</small></button></li>';
            }).join('') + '</ul>' + (opts.chooser ? '' : '<p class="pk-hint">Select one to open it, or the cluster to zoom in.</p>');
            setAreaFocus(null);
        } else {
            var m = mk.members[0], pl = m.place;
            var hd = placeHeadline(m.events);
            var rows = m.events.slice(0, 4).map(function (e) {
                return '<li>' + glyph(e.type) + '<span>' + esc(headline(e)) + '</span><small>' + esc(dateLabel(e)) + '</small></li>';
            }).join('') + (m.events.length > 4 ? '<li class="pk-ev-more">and ' + (m.events.length - 4) + ' more</li>' : '');
            var approx = approxLine(pl);
            pk.innerHTML =
                '<p class="pk-kicker">' + esc(kindLabel(pl)) + ' · ' + esc(spanOf(m.events)) + '</p>' +
                '<h3 class="pk-name">' + esc(hd.text) + '</h3>' +
                '<p class="pk-where">' + esc(pl.name) + '</p>' +
                (approx ? '<p class="pk-approx">' + esc(approx) + '</p>' : '') +
                (m.events.length > 1 ? '<ul class="pk-evs">' + rows + '</ul>' : '<p class="pk-line">' + esc(m.events[0].summary) + '</p>') +
                '<p class="pk-badges"><span class="badge ' + confClass(m.conf) + '">' + esc(confLabel(m.conf)) + '</span>' + (m.orkney ? '<span class="badge badge--npl">No proven link</span>' : '') + '</p>' +
                '<div class="pk-actions"><button type="button" class="fm-btn fm-btn--sm" data-open-place="' + esc(pl.id) + '">Open</button>' + (pl.streetView ? FM.sv.button(pl, { small: true }) : '') + '</div>';
            setAreaFocus(pl.drawAs !== 'pin' ? pl.id : null);
        }
        pk.hidden = false;
        positionPeek(mk);
    }
    function positionPeek(mk) {
        var pk = $('peek'), stage = $('stage').getBoundingClientRect();
        var r = mk.el.getBoundingClientRect();
        var w = pk.offsetWidth, h = pk.offsetHeight;
        var x = r.left + r.width / 2 - stage.left - w / 2;
        var above = r.top - stage.top - h - 12;
        var y = above >= 8 ? above : (r.bottom - stage.top + 12);
        if (y + h > stage.height - 8) y = Math.max(8, stage.height - h - 8);
        x = Math.max(8, Math.min(stage.width - w - 8, x));
        pk.style.left = x + 'px'; pk.style.top = y + 'px';
        pk.classList.toggle('is-below', above < 8);
    }
    function kindLabel(pl) {
        var k = { 'home': 'Home', 'church': 'Church', 'cemetery': 'Cemetery', 'studio': "Photographer's studio", 'workplace': 'Workplace', 'hospital': 'Hospital',
                  'military site': 'Military', 'port': 'Port', 'venue': 'Place', 'parish': 'Parish', 'registration district': 'Registration district', 'district': 'District',
                  'town': 'Town', 'county': 'County', 'country': 'Country', 'farm': 'Farm' }[pl.kind] || 'Place';
        return k;
    }

    // ================================================================== panel (levels 2 and 3)
    var panelOpener = null;
    function cameraPadding(extra) {
        extra = extra || 40;
        var pad = { top: extra + 10, bottom: extra, left: extra, right: extra };
        var panel = $('panel'), key = $('key'), tl = $('timeline'), tlp = $('tlPanel');
        var wide = window.innerWidth > 820;
        if (wide) {
            if (!panel.hidden) pad.right += panel.offsetWidth;
            if (!tlp.hidden) pad.right += tlp.offsetWidth;
            if (key && !key.classList.contains('is-collapsed')) pad.left += Math.min(key.offsetWidth, 320);
        } else {
            if (!panel.hidden) pad.bottom += panel.offsetHeight * 0.55;
            if (!tlp.hidden) pad.bottom += tlp.offsetHeight;
        }
        if (!tl.hidden) pad.bottom += tl.offsetHeight;
        return pad;
    }
    FM.cameraPadding = cameraPadding;
    function crumbs(parts) {
        $('crumbs').innerHTML = '<ol>' + parts.map(function (p, i) {
            var last = i === parts.length - 1;
            return '<li>' + (last ? '<span aria-current="page">' + esc(p.label) + '</span>' : '<button type="button" data-crumb="' + i + '">' + esc(p.label) + '</button>') + '</li>';
        }).join('') + '</ol>';
        $('crumbs')._parts = parts;
    }
    function openPanel(html, title, parts) {
        var panel = $('panel');
        $('panelBody').innerHTML = html;
        crumbs(parts);
        panel.hidden = false;
        panel.classList.remove('is-peek'); panel.classList.add('is-half');
        $('panelBody').scrollTop = 0;
        hidePeek();
        var h = $('panelTitle'); if (h) h.focus({ preventScroll: true });
    }
    function closePanel(opts) {
        opts = opts || {};
        $('panel').hidden = true;
        var had = S.place || S.person;
        S.place = null;
        if (!opts.keepPerson) { S.person = null; clearPersonPath(); }
        refreshOverlays();
        if (!opts.silent) writeURL(true);
        if (panelOpener && document.contains(panelOpener)) panelOpener.focus();
        panelOpener = null;
        return had;
    }
    function lifeKey(e) { return !e.dateStart ? '9999' : (/^(year|range|decade)$/.test(e.datePrecision) ? e.dateStart.slice(0, 4) + '~' : e.dateStart); }
    function lifeOrder(a, b) { var x = lifeKey(a), y = lifeKey(b); return x < y ? -1 : x > y ? 1 : FM.data.byDate(a, b); }
    function openPlace(pid, opts) {
        opts = opts || {};
        var pl = DATA.places[pid]; if (!pl) return;
        if (opts.opener) panelOpener = opts.opener;
        S.place = pid;
        var evs = (DATA.placeEvents[pid] || []).filter(function (e) { return eventPasses(e, { ignoreYears: true }); });
        if (!evs.length) evs = DATA.placeEvents[pid] || [];
        evs = evs.slice().sort(lifeOrder);
        var sm = placeSummary(pid, evs);
        var parts = [{ label: 'Map', act: 'map' }];
        if (S.person && DATA.people[S.person]) parts.push({ label: DATA.people[S.person].displayName, act: 'person', id: S.person });
        parts.push({ label: pl.name, act: 'place', id: pid });
        openPanel(placeHTML(pl, evs, sm), pl.name, parts);
        refreshOverlays();
        if (!opts.noFly) {
            var target = { points: [placeLL(pl)], radius: pl.uncertaintyMetres || 100 };
            if (camera) { camera.following = true; camera.frame(target, { mode: 'follow', force: true, noJourney: true }); }
        }
        if (S.style === 'then') FM.setThenEdition(yearOf(evs[0] && evs[0].dateStart), placeLL(pl));
        writeURL(opts.push);
        announce(pl.name + ' opened. ' + evs.length + ' events.');
    }
    FM.openPlace = openPlace;
    function placeHTML(pl, evs, sm) {
        var hero = '';
        var img = (pl.images || [])[0];
        var crop = null; evs.some(function (e) { if (e.recordCrops && e.recordCrops.length) { crop = { file: 'images/records/' + e.recordCrops[0], caption: e.summary }; return true; } return false; });
        var then = '';
        if (img) hero = '<figure class="pn-hero"><a class="record-link" href="' + esc(img.file) + '"><img src="' + esc(img.thumb || img.file) + '" alt="' + esc(img.caption) + '" loading="lazy"></a><figcaption>' + esc(img.caption) + ' <span class="pn-credit">' + esc(img.credit) + ', ' + esc(img.year) + '</span></figcaption></figure>';
        else if (crop) hero = '<figure class="pn-hero pn-hero--record"><a class="record-link" href="' + esc(crop.file) + '"><img src="' + esc(crop.file) + '" alt="' + esc(crop.caption) + '" loading="lazy"></a><figcaption>The record: ' + esc(crop.caption) + '</figcaption></figure>';
        else hero = '<div class="pn-hero pn-hero--plate" aria-hidden="true">' + glyph(sm.head, 'pn-plate-gl') + '<span>' + esc(kindLabel(pl)) + '</span></div>';
        if (pl.streetView && CFG.GOOGLE_EMBED_KEY) {
            // today's street at the top; the old photo or record follows as "then"
            if (img || crop) then = hero.replace('class="pn-hero', 'class="pn-then pn-hero').replace('<figcaption>', '<figcaption><span class="then-k">Then</span>');
            hero = '<div class="pn-sv"><div class="pn-sv-frame"><iframe src="' + esc(FM.sv.embedUrl(pl)) + '" title="Street View of ' + esc(pl.name) + ' today" loading="lazy" referrerpolicy="no-referrer-when-downgrade" tabindex="-1"></iframe>' +
                '<button type="button" class="pn-sv-open" data-sv="' + esc(pl.id) + '" aria-label="Open Street View of ' + esc(pl.name) + ' here in the map"><span class="pn-sv-hint">' + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>Explore the street</span></button></div>' +
                '<p class="pn-sv-cap"><span class="then-k">Today</span>' + esc(FM.sv.caption(pl)) + ' <a href="' + esc(FM.sv.mapsUrl(pl)) + '" target="_blank" rel="noopener">Open in a new tab</a></p></div>';
        }
        var precision = pl.drawAs === 'area' ? (pl.kind === 'registration district' ? 'A registration district. Births, marriages and deaths here are "registered in the district", not at a known address, so the dashed pin marks the middle of the district and the shaded circle shows roughly how far it reaches.' : 'An area rather than an address: the dashed pin marks its middle and the shaded circle shows roughly how far it reaches.')
                      : pl.drawAs === 'halo' ? 'Known to within ' + metresText(pl.uncertaintyMetres) + ', so the pin is dashed and the shaded circle shows where the house could be.'
                      : 'A published address or named building.';
        var sv = pl.streetView ? FM.sv.button(pl) : '<p class="pn-nosv">' + esc(pl.streetViewReason || 'No Street View for this place.') + '</p>';
        var thenNow = '<div class="pn-tn" role="group" aria-label="Then and now"><button type="button" class="fm-btn fm-btn--sm" data-style-set="then"' + (CFG.MAPTILER_KEY && pl.inEngland !== false ? '' : ' disabled title="' + (CFG.MAPTILER_KEY ? 'The old maps cover Great Britain only' : 'Needs a MapTiler key') + '"') + '>Then</button><button type="button" class="fm-btn fm-btn--sm" data-style-set="today">Today</button>' +
                      (CFG.MAPTILER_KEY && pl.inEngland !== false ? '<button type="button" class="fm-btn fm-btn--sm" data-compare="1">Swipe then and now</button>' : '') + '</div>';
        var today = todayText(pl, evs);
        var bomb = pl.id === '23-sutton-court-road' ? '<p class="pn-bomb">Henry George, Rosina and Sidney were killed here on 19 April 1941. <a href="http://bombsight.org/#17/51.52567/0.03349" target="_blank" rel="noopener">See the bomb census for this street on Bomb Sight</a> (October 1940 to June 1941).</p>' : '';
        var srcIds = []; evs.forEach(function (e) { e.sourceIds.forEach(function (s) { if (srcIds.indexOf(s) < 0) srcIds.push(s); }); });
        (pl.blurbSourceIds || []).forEach(function (s) { if (srcIds.indexOf(s) < 0) srcIds.push(s); });
        var num = {}; srcIds.forEach(function (s, i) { num[s] = i + 1; });
        var locIds = (pl.coordinateSourceIds || []).filter(function (s) { return DATA.sources[s]; });
        return '<article class="pn" data-place="' + esc(pl.id) + '">' + hero + then +
            '<p class="pn-kicker">' + esc(kindLabel(pl)) + (sm.orkney ? ' · <span class="badge badge--npl">No proven link to this family</span>' : '') + '</p>' +
            '<h2 class="pn-title" id="panelTitle" tabindex="-1">' + esc(pl.name) + '</h2>' +
            ((pl.historicName && pl.historicName !== pl.name) || (pl.variants || []).length ? '<p class="pn-also">Also written ' + esc([pl.historicName].concat(pl.variants || []).filter(function (v) { return v && v !== pl.name; }).join('; ')) + '</p>' : '') +
            (pl.blurb ? '<p class="pn-blurb">' + esc(pl.blurb) + fn(pl.blurbSourceIds, num) + '</p>' : '') +
            '<p class="pn-prec">' + esc(precision) + '</p>' +
            '<div class="pn-actions">' + sv + thenNow + '</div>' +
            '<h3 class="pn-h">At this place</h3><ol class="pn-events">' + evs.map(function (e) { return eventRow(e, num, { hidePlace: true }); }).join('') + '</ol>' +
            '<h3 class="pn-h">What is here today</h3><p class="pn-today">' + esc(today) + '</p>' + bomb +
            '<h3 class="pn-h">Sources</h3><ol class="pn-src">' + srcIds.map(function (s) { return srcItem(s, num[s]); }).join('') + '</ol>' +
            (locIds.length || pl.coordinateMethod ? '<details class="pn-where"><summary>How it is placed on the map</summary><p>' + esc(pl.coordinateMethod || '') + '</p>' + (locIds.length ? '<ul>' + locIds.map(function (s) { return '<li>' + srcLine(s) + '</li>'; }).join('') + '</ul>' : '') + '</details>' : '') +
            '</article>';
    }
    function todayText(pl, evs) {
        var st = pl.standsToday;
        if (pl.todayNote) return pl.todayNote;
        if (st === 'yes') return 'The building still stands.';
        if (st === 'rebuilt') return 'Rebuilt: the building here today is not the one the family knew.';
        if (st === 'demolished') return 'The building has gone.';
        if (pl.drawAs === 'area') return 'An area rather than a building; use the Then and Today maps to look around.';
        return 'Not yet checked: whether the building the family knew still stands has not been confirmed against the old maps.';
    }
    function fn(ids, num) {
        var l = (ids || []).filter(function (s) { return num[s]; }).map(function (s) { return '<a href="#fm-src-' + num[s] + '" class="fn" data-fn="' + num[s] + '">' + num[s] + '</a>'; });
        return l.length ? '<sup>' + l.join(',') + '</sup>' : '';
    }
    function srcLine(s) {
        var x = DATA.sources[s] || { title: s };
        return '<strong>' + esc(x.title) + '</strong>' + (x.repository ? '. ' + esc(x.repository) : '') + (x.url ? ' <a href="' + esc(x.url) + '" target="_blank" rel="noopener">Open</a>' : '');
    }
    function srcItem(s, n) {
        var x = DATA.sources[s] || { title: s };
        return '<li id="fm-src-' + n + '">' + srcLine(s) + (x.note ? '<span class="pn-src-note">' + esc(x.note) + '</span>' : '') + '</li>';
    }
    function eventRow(e, num, opts) {
        opts = opts || {};
        var pl = DATA.places[e.placeId];
        var people = e.personIds.filter(function (id) { return id !== opts.skipPerson; }).map(function (id) { var p = DATA.people[id]; return '<button type="button" class="chip" data-person="' + esc(id) + '">' + avatar(p, 'av--xs') + esc(p.displayName) + '</button>'; }).join('');
        var crops = (e.recordCrops || []).slice(0, 3).map(function (c) { return '<a class="record-link ev-crop" href="images/records/' + esc(c) + '"><img src="images/records/' + esc(c) + '" alt="' + esc(e.summary) + '" loading="lazy"></a>'; }).join('');
        var voyage = e.voyage ? '<span class="ev-ship">' + esc(e.voyage.ship) + ': ' + esc(e.voyage.display) + '</span>' : '';
        return '<li class="ev ev--' + esc(e.type.replace(/\s+/g, '-')) + (e.familyStatement ? ' is-family' : '') + (e.orkney ? ' is-orkney' : '') + '" data-event="' + esc(e.id) + '">' +
            '<span class="ev-gl" title="' + esc(FM.data.TYPE_LABEL[e.type]) + '">' + glyph(e.type) + '</span>' +
            '<div class="ev-body"><p class="ev-date">' + esc(dateLabel(e)) + (e.approximate ? '' : '') + ' <span class="badge ' + confClass(e.familyStatement ? 'family tradition' : e.confidence) + '">' + esc(confLabel(e.familyStatement ? 'family tradition' : e.confidence)) + '</span></p>' +
            '<p class="ev-text">' + esc(e.summary) + (e.familyStatement && !/\(family/.test(e.summary) ? ' (family)' : '') + (num ? fn(e.sourceIds, num) : '') + '</p>' +
            (opts.hidePlace || !pl ? '' : '<p class="ev-place"><button type="button" class="ev-plbtn" data-open-place="' + esc(pl.id) + '">' + esc(pl.name) + '</button></p>') +
            voyage + (people ? '<div class="ev-people">' + people + '</div>' : '') + (crops ? '<div class="ev-crops">' + crops + '</div>' : '') +
            (e.note ? '<p class="ev-note">' + esc(e.note) + '</p>' : '') + '</div></li>';
    }
    FM.eventRow = eventRow;

    // person mode (level 3)
    function openPerson(id, opts) {
        opts = opts || {};
        var p = DATA.people[id];
        if (!p || !DATA.visible(id)) return;
        S.person = id; S.place = null;
        if (opts.scope) S.scope = opts.scope;
        renderPersonBox();
        var evs = (DATA.personEvents[id] || []).filter(function (e) { return !S.hidden[e.group]; }).slice().sort(lifeOrder);
        var placed = evs.filter(function (e) { return e.placeId; });
        var html = '<article class="pp">' +
            '<div class="pp-head">' + avatar(p, 'av--lg') + '<div><p class="pn-kicker">' + (DATA.orkney[id] ? '<span class="badge badge--npl">No proven link to this family</span>' : 'Person') + '</p>' +
            '<h2 class="pn-title" id="panelTitle" tabindex="-1">' + esc(p.displayName) + '</h2>' + (p.disambiguator ? '<p class="pn-also">' + esc(p.disambiguator) + '</p>' : '') +
            '<p class="pp-years">' + esc(lifeYears(p)) + '</p></div></div>' +
            (p.summary && !DATA.namesLiving(p.summary) ? '<p class="pn-blurb">' + esc(p.summary) + '</p>' : '') +
            '<div class="pn-actions"><button type="button" class="fm-btn" data-play-person="' + esc(id) + '">' + '<svg viewBox="0 0 24 24" aria-hidden="true" class="i"><path d="M8 5l11 7-11 7z"/></svg> Play their life</button>' +
            '<a class="fm-btn fm-btn--ghost" href="family-tree.html#/person/' + esc(id) + '">Full profile</a></div>' +
            '<h3 class="pn-h">' + placed.length + ' events on the map</h3><ol class="pn-events pn-events--person">' + evs.map(function (e, i) {
                var stop = e.placeId ? (placed.indexOf(e) + 1) : null;
                return eventRow(e, null, { skipPerson: id }).replace('<span class="ev-gl"', (stop ? '<span class="ev-stop">' + stop + '</span>' : '<span class="ev-stop ev-stop--none" title="Not on the map">&middot;</span>') + '<span class="ev-gl"');
            }).join('') + '</ol></article>';
        openPanel(html, p.displayName, [{ label: 'Map', act: 'map' }, { label: p.displayName, act: 'person', id: id }]);
        drawPersonPath(id, placed);
        refreshOverlays();
        writeURL(opts.push !== false);
        announce('Showing ' + p.displayName + ': ' + placed.length + ' events on the map.');
    }
    FM.openPerson = openPerson;
    function clearPersonPath() {
        personStops.forEach(function (m) { m.remove(); }); personStops = [];
        setData('fm-path', { type: 'FeatureCollection', features: [] });
        if (S.mode === 'explore') setData('fm-arcs', { type: 'FeatureCollection', features: [] });
    }
    function arc(a, b, n) {
        n = n || 48;
        var out = [], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
        var nx = -dy / (len || 1), ny = dx / (len || 1), lift = len * 0.18;
        for (var i = 0; i <= n; i++) {
            var t = i / n, k = 4 * t * (1 - t);
            out.push([a[0] + dx * t + nx * lift * k, a[1] + dy * t + ny * lift * k]);
        }
        return out;
    }
    FM.arc = arc;
    function drawPersonPath(id, placed) {
        clearPersonPath();
        var coords = [], seen = {}, arcs = [];
        var dated = placed.filter(function (e) { return e.dateStart && !e.voyageId; });
        dated.forEach(function (e) { var pl = DATA.places[e.placeId]; coords.push(placeLL(pl)); });
        var p = DATA.people[id];
        Object.keys(DATA.voyages).forEach(function (vid) {
            var v = DATA.voyages[vid]; if (v.personIds.indexOf(id) < 0) return;
            var a = DATA.places[v.fromPlaceId], b = DATA.places[v.toPlaceId];
            if (a && b) arcs.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arc(placeLL(a), placeLL(b)) } });
        });
        var legs = [];
        var vEnds = Object.keys(DATA.voyages).map(function (vid) { return DATA.voyages[vid]; }).filter(function (v) { return v.personIds.indexOf(id) >= 0 && DATA.places[v.fromPlaceId] && DATA.places[v.toPlaceId]; })
            .map(function (v) { return [placeLL(DATA.places[v.fromPlaceId]), placeLL(DATA.places[v.toPlaceId])]; });
        var near = function (a, b) { return FM.geo.dist(a, b) < 400000; };
        for (var li = 1; li < coords.length; li++) {
            var a0 = coords[li - 1], b0 = coords[li];
            if (a0[0] === b0[0] && a0[1] === b0[1]) continue;
            if (FM.geo.dist(a0, b0) > 1500000) {
                // a long journey: a recorded voyage already draws it; otherwise it gets an arc of its own
                var covered = vEnds.some(function (v) { return (near(a0, v[0]) && near(b0, v[1])) || (near(a0, v[1]) && near(b0, v[0])); });
                if (!covered) arcs.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: arc(a0, b0) } });
                continue;
            }
            legs.push([a0, b0]);
        }
        if (legs.length) setData('fm-path', { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: legs } }] });
        setData('fm-arcs', { type: 'FeatureCollection', features: arcs });
        var n = 0;
        placed.forEach(function (e) {
            var pl = DATA.places[e.placeId]; n++;
            var key = pl.id;
            if (seen[key]) { seen[key].nums.push(n); seen[key].el.firstChild.textContent = seen[key].nums.slice(0, 3).join(',') + (seen[key].nums.length > 3 ? '…' : ''); return; }
            var el = document.createElement('span'); el.className = 'stop'; el.setAttribute('aria-hidden', 'true');
            el.innerHTML = '<span>' + n + '</span>';
            var m = new maplibregl.Marker({ element: el, anchor: 'bottom-left', offset: [8, -8] }).setLngLat(placeLL(pl)).addTo(map);
            seen[key] = { el: el, nums: [n] };
            personStops.push(m);
        });
        if (coords.length || arcs.length) {
            var b = null;
            placed.forEach(function (e) { var pl = DATA.places[e.placeId]; if (!b) b = new maplibregl.LngLatBounds(placeLL(pl), placeLL(pl)); else b.extend(placeLL(pl)); });
            if (b) fitTo(b, cameraPadding(70), { maxZoom: 12, duration: reduced() ? 0 : 1200 });
        }
    }

    // ================================================================== key and filters
    function renderKey() {
        var counts = {};
        var fam = familySet();
        DATA.events.forEach(function (e) { if (fam && !e.personIds.some(function (id) { return fam[id]; })) return; counts[e.group] = (counts[e.group] || 0) + 1; });
        $('types').innerHTML = FM.data.KEY_GROUPS.filter(function (g) { return counts[g.id]; }).map(function (g) {
            var on = !S.hidden[g.id];
            return '<li><button type="button" class="kt" aria-pressed="' + on + '" data-group="' + esc(g.id) + '">' + glyph(g.types[0], 'kt-gl') +
                '<span class="kt-l">' + esc(g.label) + '</span><span class="kt-n" aria-label="' + counts[g.id] + ' events">' + counts[g.id] + '</span></button></li>';
        }).join('');
        $('confKey').innerHTML = '<p class="fm-label">Confidence</p><ul class="kc">' +
            '<li><span class="kc-s kc-s--conf"></span>Confirmed</li><li><span class="kc-s kc-s--prob"></span>Probable</li><li><span class="kc-s kc-s--fam"></span>Family statement (family)</li>' +
            '<li><span class="kc-s kc-s--npl"></span>No proven link</li></ul>' +
            '<p class="fm-label">Pins</p><ul class="kc kc--prec"><li><span class="kc-pin"></span>A known address or building</li><li><span class="kc-pin kc-pin--approx"></span>Somewhere in this area: the exact place is not known</li></ul>';
    }
    function initYears() {
        var ys = [];
        DATA.events.forEach(function (e) { if (e.dateStart && !e.orkney) { ys.push(yearOf(e.dateStart)); ys.push(yearOf(e.dateEnd)); } });
        var lo = Math.floor(Math.min.apply(null, ys) / 10) * 10, hi = Math.ceil(Math.max.apply(null, ys) / 10) * 10;
        FM.yearBounds = [lo, hi];
        [$('yearFrom'), $('yearTo')].forEach(function (inp) { inp.min = lo; inp.max = hi; inp.step = 1; });
        $('yearFrom').value = S.from != null ? S.from : lo;
        $('yearTo').value = S.to != null ? S.to : hi;
        showYears();
    }
    function showYears() {
        var a = +$('yearFrom').value, b = +$('yearTo').value;
        $('yearsOut').textContent = (a === FM.yearBounds[0] && b === FM.yearBounds[1]) ? 'All years (undated events always shown, dashed)' : a + ' to ' + b;
    }
    function onYears() {
        var a = +$('yearFrom').value, b = +$('yearTo').value;
        if (a > b) { if (this === $('yearFrom')) $('yearTo').value = a; else $('yearFrom').value = b; a = +$('yearFrom').value; b = +$('yearTo').value; }
        S.from = a === FM.yearBounds[0] ? null : a;
        S.to = b === FM.yearBounds[1] ? null : b;
        showYears(); refreshOverlays(); renderChips(); writeURL();
    }
    function renderFamily() {
        $('famSel').value = S.fam || '';
        $('genSel').innerHTML = GENS.map(function (g) { return '<option value="' + g[0] + '"' + (g[0] === S.gen ? ' selected' : '') + '>' + g[1] + '</option>'; }).join('');
        $('sibChk').checked = !!S.sib;
        $('famMore').hidden = !S.fam;
        var set = familySet();
        if (set) {
            var nPeople = Object.keys(set).length, nPlaces = Object.keys(DATA.placeEvents).filter(function (pid) { return visiblePlaceEvents(pid).length; }).length;
            $('famCount').textContent = nPeople + (nPeople === 1 ? ' person, ' : ' people, ') + nPlaces + (nPlaces === 1 ? ' place' : ' places') + ' on the map.';
        }
        var chip = $('famChip');
        chip.hidden = !S.fam;
        if (S.fam) {
            var g = GENS.filter(function (x) { return x[0] === S.gen; })[0];
            chip.innerHTML = esc(FAMILIES[S.fam].label) + ': ' + esc(g ? g[1].toLowerCase() : '') + (S.sib ? ', with brothers and sisters' : '') + ' <span aria-hidden="true">&times;</span>';
            chip.setAttribute('aria-label', 'Showing ' + FAMILIES[S.fam].label + '. Show everyone instead');
        }
    }
    function setFamily(fam, gen, sib) {
        S.fam = fam; S.gen = gen; S.sib = sib;
        if (S.person && familySet() && !familySet()[S.person]) { S.person = null; S.scope = 'self'; if (S.mode === 'explore' && !$('panel').hidden) closePanel({ silent: true }); clearPersonPath(); }
        renderFamily(); renderKey(); renderChips(); renderPersonBox(); refreshOverlays();
        if (FM.onFiltersChanged) FM.onFiltersChanged();
        writeURL();
        announce(fam ? 'Showing ' + FAMILIES[fam].label + '.' : 'Showing everyone on the map.');
    }
    function renderChips() {
        var beyond = Object.keys(DATA.places).filter(function (pid) { var pl = DATA.places[pid]; return pl.inEngland === false && pl.lat != null && visiblePlaceEvents(pid).length; });
        var b = $('beyondBtn');
        b.hidden = !beyond.length || S.beyond;
        b.textContent = 'Beyond England: ' + beyond.length + (beyond.length === 1 ? ' place' : ' places');
        b._places = beyond;
        $('backEngland').hidden = !S.beyond;
        var nUn = DATA.unplaced.filter(function (u) { return eventPasses(u); }).length;
        $('trayBtn').textContent = 'Not yet on the map: ' + nUn;
        $('trayBtn').hidden = !nUn;
    }
    function frameEngland(duration) { fitTo(ENGLAND, cameraPadding(30), { duration: duration == null ? (reduced() ? 0 : 1100) : duration }); }
    function fitTo(b, pad, opts) {
        opts = opts || {};
        var cam = FM.geo.fitCamera(map, b, pad, opts.maxZoom);
        if (!opts.duration) map.jumpTo(cam); else map.easeTo(Object.assign({ duration: opts.duration, essential: true }, cam));
    }
    FM.frameEngland = frameEngland;

    // person combobox
    var comboItems = [], comboActive = -1;
    function personPlaces(id) {
        var set = {}; (DATA.personEvents[id] || []).forEach(function (e) { if (e.placeId) set[e.placeId] = true; });
        return Object.keys(set).length;
    }
    function renderPersonList(q) {
        q = String(q || '').toLowerCase().trim();
        var groups = FM.data.BRANCHES.map(function (b) { return { b: b, people: [] }; });
        Object.keys(DATA.branchOf).forEach(function (id) {
            var p = DATA.people[id], g = DATA.branchOf[id];
            var famSet = familySet(); if (famSet && !famSet[id]) return;
            var hay = [p.displayName, p.givenNames + ' ' + p.surname, p.disambiguator].concat((p.nameVariants || []).map(function (v) { return v.name; })).join(' ').toLowerCase();
            if (q && hay.indexOf(q) < 0) return;
            groups.filter(function (x) { return x.b.id === g; })[0].people.push(p);
        });
        comboItems = [];
        var html = groups.filter(function (g) { return g.people.length; }).map(function (g) {
            g.people.sort(function (a, b) { return (a.generation - b.generation) || a.displayName.localeCompare(b.displayName); });
            return '<li role="presentation" class="lb-group">' + esc(g.b.label) + '</li>' + g.people.map(function (p) {
                var n = personPlaces(p.id), idx = comboItems.length;
                comboItems.push({ id: p.id, disabled: !n });
                return '<li role="option" id="opt-' + esc(p.id) + '" data-idx="' + idx + '" aria-selected="false"' + (n ? '' : ' aria-disabled="true"') + ' class="lb-opt' + (n ? '' : ' is-off') + '">' +
                    avatar(p, 'av--sm') + '<span class="lb-t"><span class="lb-n">' + esc(p.displayName) + '</span><span class="lb-d">' + esc(p.disambiguator || lifeYears(p)) + '</span></span>' +
                    '<span class="lb-c">' + (n ? n + (n === 1 ? ' place' : ' places') : 'no places yet') + '</span></li>';
            }).join('');
        }).join('');
        $('personList').innerHTML = html || '<li class="lb-empty" role="presentation">No one by that name. Living family are not on the map.</li>';
        comboActive = -1;
    }
    function openCombo() { renderPersonList($('personInput').value); $('personList').hidden = false; $('personInput').setAttribute('aria-expanded', 'true'); }
    function closeCombo() { $('personList').hidden = true; $('personInput').setAttribute('aria-expanded', 'false'); $('personInput').removeAttribute('aria-activedescendant'); }
    function moveCombo(d) {
        if (!comboItems.length) return;
        var i = comboActive;
        for (var k = 0; k < comboItems.length; k++) { i = (i + d + comboItems.length) % comboItems.length; if (!comboItems[i].disabled) break; }
        comboActive = i;
        Array.prototype.forEach.call($('personList').querySelectorAll('.lb-opt'), function (li) { li.setAttribute('aria-selected', li.dataset.idx == i ? 'true' : 'false'); });
        var el = $('opt-' + comboItems[i].id);
        if (el) { el.scrollIntoView({ block: 'nearest' }); $('personInput').setAttribute('aria-activedescendant', el.id); }
    }
    function chooseCombo(i) {
        var it = comboItems[i]; if (!it || it.disabled) return;
        closeCombo();
        S.scope = 'self';
        openPerson(it.id);
    }
    var SCOPES = [['self', 'Just them'], ['spouse', 'With spouse'], ['family', 'Parents and children'], ['ancestors', 'All ancestors'], ['descendants', 'All descendants']];
    function renderPersonBox() {
        var p = S.person && DATA.people[S.person];
        $('personInput').value = p ? p.displayName : '';
        $('personClear').hidden = !p && !Object.keys(S.hidden).length && S.from == null && S.to == null;
        var sc = $('scopes');
        sc.hidden = !p;
        sc.innerHTML = p ? SCOPES.map(function (s) { return '<button type="button" class="chip chip--scope" aria-pressed="' + (S.scope === s[0]) + '" data-scope="' + s[0] + '">' + esc(s[1]) + '</button>'; }).join('') : '';
    }
    function clearAll() {
        S.person = null; S.scope = 'self'; S.hidden = {}; S.from = null; S.to = null; S.fam = null; S.sib = false; S.gen = 3; renderFamily();
        clearPersonPath();
        initYears(); renderPersonBox(); renderKey(); refreshOverlays(); renderChips();
        if (!$('panel').hidden) closePanel({ silent: true });
        if (FM.onFiltersChanged) FM.onFiltersChanged();
        writeURL();
        announce('Filters cleared.');
    }

    // ================================================================== Street View
    FM.sv = (function () {
        function viewOf(t) {
            var sv = t.streetView || {};
            var lat = sv.panoLat != null ? sv.panoLat : (sv.targetLat != null ? sv.targetLat : t.lat);
            var lng = sv.panoLng != null ? sv.panoLng : (sv.targetLng != null ? sv.targetLng : t.lng);
            return { lat: lat, lng: lng, heading: sv.heading != null ? sv.heading : null, pitch: sv.pitch != null ? sv.pitch : 5, fov: sv.fov != null ? sv.fov : 80 };
        }
        function f(n) { return (Math.round(n * 1e6) / 1e6).toFixed(6).replace(/0+$/, '').replace(/\.$/, ''); }
        function mapsUrl(t) {
            var v = viewOf(t);
            return 'https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=' + f(v.lat) + ',' + f(v.lng) +
                (v.heading != null ? '&heading=' + Math.round(v.heading) : '') + '&pitch=' + Math.round(v.pitch) + '&fov=' + Math.round(v.fov);
        }
        function embedUrl(t) {
            var v = viewOf(t);
            return 'https://www.google.com/maps/embed/v1/streetview?key=' + encodeURIComponent(CFG.GOOGLE_EMBED_KEY) + '&location=' + f(v.lat) + ',' + f(v.lng) +
                (v.heading != null ? '&heading=' + Math.round(v.heading) : '') + '&pitch=' + Math.round(v.pitch) + '&fov=' + Math.round(v.fov) + '&language=en-GB';
        }
        var ICON = glyph('streetview', 'sv-gl');
        function button(pl, opts) {
            opts = opts || {};
            var cls = 'sv-btn' + (opts.small ? ' sv-btn--sm' : '');
            if (CFG.GOOGLE_EMBED_KEY) return '<button type="button" class="' + cls + '" data-sv="' + esc(pl.id) + '">' + ICON + '<span>Street View</span></button>';
            return '<a class="' + cls + '" data-sv-link="' + esc(pl.id) + '" href="' + esc(mapsUrl(pl)) + '" target="_blank" rel="noopener" aria-label="Street View of ' + esc(pl.name) + ' (opens Google Maps in a new tab)">' + ICON + '<span>Street View</span></a>';
        }
        function caption(pl) {
            var sv = pl.streetView || {};
            if (sv.caption) return sv.caption;
            var ev = (DATA.placeEvents[pl.id] || [])[0];
            var why = pl.blurb || (ev ? ev.summary : '');
            var subj = sv.subject;
            var lead = subj === 'original building' ? pl.name + ', today.' :
                       subj === 'rebuilt on the site' ? pl.name + ' was rebuilt; what stands here today is not the building the family knew.' :
                       subj === 'site only' ? 'The building that stood here has gone. This is the site today.' :
                       'The street today. Whether the building the family knew still stands has not been checked.';
            return lead + (why ? ' ' + why : '') + (sv.checked ? '' : ' (The viewpoint has not yet been checked by eye.)');
        }
        function thenOf(pl) {
            var im = (pl.images || [])[0];
            if (im) return { file: im.file, thumb: im.thumb || im.file, alt: im.caption, caption: im.caption };
            var evs = DATA.placeEvents[pl.id] || [];
            for (var i = 0; i < evs.length; i++) {
                var c = (evs[i].recordCrops || [])[0];
                if (c) return { file: 'images/records/' + c, thumb: 'images/records/' + c, alt: evs[i].summary, caption: 'The record: ' + evs[i].summary };
            }
            return null;
        }
        var opener = null, resumeAfter = false;
        function open(target, from) {
            var pl = typeof target === 'string' ? DATA.places[target] : target;
            if (!pl) return;
            opener = from || document.activeElement;
            resumeAfter = !!(FM.player && FM.player.playing);
            if (FM.player && FM.player.playing) FM.player.pause();
            var box = $('sv');
            $('svTitle').textContent = pl.name ? 'Street View: ' + pl.name : 'Street View';
            $('svTab').href = mapsUrl(pl); $('svTab').setAttribute('aria-label', 'Open Street View in Google Maps in a new tab');
            $('svFrame').innerHTML = '<iframe title="Street View of ' + esc(pl.name || 'this spot') + '" src="' + esc(embedUrl(pl)) + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>';
            $('svCap').textContent = pl.id ? caption(pl) : 'Street View near here. The family\'s places are marked on the map beside it.';
            // then and now: the place's old photo or record sits over the corner of today's view
            var then = pl.id ? thenOf(pl) : null;
            $('svThen').innerHTML = then ? '<a class="record-link" href="' + esc(then.file) + '"><img src="' + esc(then.thumb) + '" alt="' + esc(then.alt) + '" loading="lazy"></a><figcaption><span class="then-k">Then</span>' + esc(then.caption) + '</figcaption>' : '';
            $('svThen').hidden = !then;
            box.hidden = false;
            document.body.classList.add('sv-open');
            if (pl.lat != null) map.easeTo({ center: [pl.lng, pl.lat], zoom: Math.max(map.getZoom(), 15), duration: reduced() ? 0 : 700, padding: { left: 0, right: Math.round(window.innerWidth * 0.62), top: 0, bottom: 0 } });
            $('svClose').focus();
        }
        function close() {
            var box = $('sv');
            if (box.hidden) return;
            box.hidden = true;
            $('svFrame').innerHTML = ''; $('svThen').innerHTML = ''; $('svThen').hidden = true;
            document.body.classList.remove('sv-open');
            if (opener && document.contains(opener)) opener.focus();
            if (resumeAfter && FM.player) FM.player.play();
            resumeAfter = false;
        }
        function linkClicked(pl) {
            // without a key the button is a link to Google Maps in a new tab: pause now, resume when the visitor comes back
            if (FM.player && FM.player.playing) {
                FM.player.pause();
                var back = function () { if (document.visibilityState === 'visible') { document.removeEventListener('visibilitychange', back); FM.player.play(); } };
                document.addEventListener('visibilitychange', back);
            }
        }
        return { button: button, mapsUrl: mapsUrl, embedUrl: embedUrl, open: open, close: close, caption: caption, linkClicked: linkClicked, isOpen: function () { return !$('sv').hidden; } };
    })();

    // ================================================================== then and now
    function setCompare(on) {
        if (on && !CFG.MAPTILER_KEY) { note('Then and now needs a free MapTiler key for the old maps. config.js says how to add one.'); on = false; }
        S.compare = on;
        $('compareBtn').setAttribute('aria-pressed', on ? 'true' : 'false');
        var wrap = $('compareWrap');
        wrap.hidden = !on;
        if (on) {
            if (S.style !== 'then') setStyle('then');
            if (!cmap) {
                cmap = new maplibregl.Map({ container: 'compareMap', style: 'https://tiles.openfreemap.org/styles/liberty', center: map.getCenter(), zoom: map.getZoom(), interactive: false, attributionControl: false });
                map.on('move', function () { if (S.compare) cmap.jumpTo({ center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() }); });
            }
            cmap.resize(); cmap.jumpTo({ center: map.getCenter(), zoom: map.getZoom() });
            setDivider(50);
            $('cmpEdition').textContent = map.getStyle() && map.getStyle().metadata && map.getStyle().metadata.edition ? map.getStyle().metadata.edition.name : 'Then';
        }
        writeURL();
    }
    function setDivider(pct) {
        pct = Math.max(0, Math.min(100, pct));
        $('compareMap').style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
        $('divider').style.left = pct + '%';
        $('divider').setAttribute('aria-valuenow', Math.round(pct));
    }

    // ================================================================== list view and tray
    function openList() {
        var placesSorted = Object.keys(DATA.places).map(function (pid) { return { pl: DATA.places[pid], evs: visiblePlaceEvents(pid) }; })
            .filter(function (x) { return x.evs.length; })
            .sort(function (a, b) { return (a.evs[0].dateStart || '9') < (b.evs[0].dateStart || '9') ? -1 : 1; });
        $('listBody').innerHTML = '<ol class="lv">' + placesSorted.map(function (x) {
            return '<li class="lv-place"><h3><button type="button" class="lv-open" data-open-place="' + esc(x.pl.id) + '">' + esc(x.pl.name) + '</button></h3>' +
                '<p class="lv-meta">' + esc(kindLabel(x.pl)) + '. ' + esc(x.pl.drawAs === 'area' ? 'An area.' : x.pl.drawAs === 'halo' ? 'Known to within ' + metresText(x.pl.uncertaintyMetres) + '.' : 'A known address or building.') + (x.pl.noProvenLink ? ' No proven link to this family.' : '') + '</p>' +
                '<ol class="lv-events">' + x.evs.map(function (e) { return '<li><strong>' + esc(dateLabel(e)) + '</strong>, ' + esc(FM.data.TYPE_LABEL[e.type].toLowerCase()) + ': ' + esc(e.summary) + ' <span class="lv-people">(' + esc(e.personIds.map(personName).join(', ')) + ')</span></li>'; }).join('') + '</ol></li>';
        }).join('') + '</ol>';
        showSheet('listView', $('listOpen'));
    }
    function openTray() {
        var items = DATA.unplaced.filter(function (u) { return eventPasses(u); }).sort(FM.data.byDate);
        $('trayList').innerHTML = items.map(function (u) {
            var p = DATA.people[u.personIds[0]];
            return '<li><span class="ev-gl">' + glyph(u.type) + '</span><div><p class="ev-date">' + esc(dateLabel(u)) + '</p><p class="ev-text">' + esc(p.displayName) + ': ' + esc(u.summary) + '</p><p class="ev-note">What would place it: ' + esc(u.what) + '</p></div></li>';
        }).join('');
        showSheet('tray', $('trayBtn'));
    }
    var sheetOpener = null;
    function showSheet(id, opener) { sheetOpener = opener; $(id).hidden = false; var x = $(id).querySelector('.fm-x'); if (x) x.focus(); }
    function hideSheet(id) { $(id).hidden = true; if (sheetOpener && document.contains(sheetOpener)) sheetOpener.focus(); }

    // ================================================================== URL state
    function readURL() {
        var q = new URLSearchParams(location.search);
        var st = {};
        st.mode = q.get('mode') || 'explore';
        st.place = q.get('place'); st.person = q.get('person'); st.scope = q.get('scope') || 'self';
        st.fam = FAMILIES[q.get('family')] ? q.get('family') : null; st.gen = q.get('gen') != null ? +q.get('gen') : 3; st.sib = q.get('siblings') === '1';
        st.from = q.get('from') ? +q.get('from') : null; st.to = q.get('to') ? +q.get('to') : null;
        st.style = q.get('style') || 'today';
        st.hidden = {}; (q.get('hide') || '').split(',').filter(Boolean).forEach(function (g) { st.hidden[g] = true; });
        st.compare = q.get('compare') === '1';
        st.event = q.get('event'); st.speed = q.get('speed'); st.camera = q.get('camera'); st.playing = q.get('playing') === '1';
        st.pace = q.get('pace');
        return st;
    }
    var urlTimer = null;
    function writeURL(push) {
        if (!ready) return;
        var q = new URLSearchParams();
        if (S.mode !== 'explore') q.set('mode', S.mode);
        if (S.place) q.set('place', S.place);
        if (S.fam) { q.set('family', S.fam); if (S.gen !== 3) q.set('gen', String(S.gen)); if (S.sib) q.set('siblings', '1'); }
        if (S.person) { q.set('person', S.person); if (S.scope !== 'self') q.set('scope', S.scope); }
        if (S.from != null) q.set('from', S.from);
        if (S.to != null) q.set('to', S.to);
        if (S.style !== 'today') q.set('style', S.style);
        var hid = Object.keys(S.hidden); if (hid.length) q.set('hide', hid.join(','));
        if (S.compare) q.set('compare', '1');
        if (modes[S.mode] && modes[S.mode].urlState) { var extra = modes[S.mode].urlState(); Object.keys(extra).forEach(function (k) { if (extra[k] != null && extra[k] !== '') q.set(k, extra[k]); }); }
        var url = location.pathname + (q.toString() ? '?' + q.toString() : '');
        if (url === location.pathname + location.search) return;
        if (push) history.pushState({ fm: 1 }, '', url); else history.replaceState({ fm: 1 }, '', url);
    }
    FM.writeURL = writeURL;
    function applyState(st, opts) {
        opts = opts || {};
        S.hidden = st.hidden || {}; S.orkney = false;
        S.from = st.from; S.to = st.to; S.scope = st.scope || 'self';
        S.fam = st.fam || null; S.gen = st.gen != null && !isNaN(st.gen) ? st.gen : 3; S.sib = !!st.sib; renderFamily();
        // the person belongs to the page, so it is set before the mode starts (Timeline scopes its beats by it)
        var person = st.person && DATA.people[st.person] && DATA.visible(st.person) ? st.person : null;
        S.person = person;
        initYears(); renderKey(); renderChips(); renderPersonBox();
        if ((st.style || 'today') !== S.style) setStyle(st.style || 'today', { silent: true });
        var targetMode = modes[st.mode] ? st.mode : 'explore';
        if (targetMode !== S.mode) setMode(targetMode, { silent: true, state: st });
        else if (modes[S.mode] && modes[S.mode].applyState) modes[S.mode].applyState(st);
        if (S.mode === 'explore') {
            if (person) {
                if (st.place && DATA.places[st.place]) { drawPersonPath(person, (DATA.personEvents[person] || []).filter(function (e) { return e.placeId; })); openPlace(st.place, {}); }
                else openPerson(person, { push: false, scope: st.scope });
            } else if (st.place && DATA.places[st.place]) { clearPersonPath(); openPlace(st.place, {}); }
            else { if (!$('panel').hidden) closePanel({ silent: true }); clearPersonPath(); }
        } else if (FM.onFiltersChanged) FM.onFiltersChanged();
        if (st.compare && !S.compare) setCompare(true);
        refreshOverlays();
    }

    // ================================================================== modes
    function registerMode(id, def) {
        modes[id] = def; if (modeOrder.indexOf(id) < 0) modeOrder.push(id);
        renderModes();
    }
    FM.registerMode = registerMode;
    function renderModes() {
        var box = $('modeSwitch'); if (!box) return;
        box.innerHTML = modeOrder.filter(function (id) { return !modes[id].hidden; }).map(function (id) {
            return '<button type="button" role="tab" id="tab-' + id + '" aria-selected="' + (S.mode === id) + '" data-mode="' + id + '" tabindex="' + (S.mode === id ? 0 : -1) + '">' + esc(modes[id].label) + '</button>';
        }).join('');
    }
    function setMode(id, opts) {
        opts = opts || {};
        if (!modes[id]) id = 'explore';
        if (id === S.mode && !opts.force) return;
        var prev = S.mode;
        if (modes[prev] && modes[prev].leave) modes[prev].leave();
        S.mode = id;
        $('fm').dataset.mode = id;
        renderModes();
        if (modes[id].enter) modes[id].enter(opts.state || {});
        refreshOverlays();
        if (!opts.silent) writeURL(true);
        announce(modes[id].label + ' mode.');
    }
    FM.setMode = setMode;
    FM.state = S;

    registerMode('explore', {
        label: 'Explore',
        enter: function () { hidePeek(); },
        leave: function () { hidePeek(); }
    });

    // ================================================================== events
    function bindUI() {
        $('modeSwitch').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });
        $('modeSwitch').addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            var tabs = Array.prototype.slice.call(this.querySelectorAll('[role=tab]'));
            var i = tabs.indexOf(document.activeElement); if (i < 0) return;
            var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            n.focus(); setMode(n.dataset.mode);
        });
        $('styleSwitch').addEventListener('click', function (e) { var b = e.target.closest('[data-style]'); if (b) setStyle(b.dataset.style); });
        $('compareBtn').addEventListener('click', function () { setCompare(!S.compare); });
        $('famSel').addEventListener('change', function () { setFamily(this.value || null, S.gen, S.sib); });
        $('genSel').addEventListener('change', function () { setFamily(S.fam, +this.value, S.sib); });
        $('sibChk').addEventListener('change', function () { setFamily(S.fam, S.gen, this.checked); });
        $('famChip').addEventListener('click', function () { setFamily(null, S.gen, S.sib); $('famSel').focus(); });
        $('listOpen').addEventListener('click', openList);
        $('listClose').addEventListener('click', function () { hideSheet('listView'); });
        $('trayBtn').addEventListener('click', openTray);
        $('trayClose').addEventListener('click', function () { hideSheet('tray'); });
        $('beyondBtn').addEventListener('click', function () {
            var ps = $('beyondBtn')._places || []; if (!ps.length) return;
            var b = new maplibregl.LngLatBounds(placeLL(DATA.places[ps[0]]), placeLL(DATA.places[ps[0]]));
            ps.forEach(function (pid) { b.extend(placeLL(DATA.places[pid])); });
            b.extend([-0.1, 51.5]);
            S.beyond = true; renderChips();
            fitTo(b, cameraPadding(50), { duration: reduced() ? 0 : 1600 });
            $('backEngland').focus();
        });
        $('backEngland').addEventListener('click', function () { S.beyond = false; renderChips(); frameEngland(); $('beyondBtn').focus(); });
        $('panelClose').addEventListener('click', function () { closePanel(); });
        $('svClose').addEventListener('click', function () { FM.sv.close(); });
        $('keyPill').addEventListener('click', function () {
            var k = $('key'), open = !k.classList.contains('is-open');
            k.classList.toggle('is-open', open); this.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        $('types').addEventListener('click', function (e) {
            var b = e.target.closest('[data-group]'); if (!b) return;
            var g = b.dataset.group;
            if (S.hidden[g]) delete S.hidden[g]; else S.hidden[g] = true;
            renderKey(); refreshOverlays(); renderChips(); renderPersonBox();
            if (FM.onFiltersChanged) FM.onFiltersChanged();
            writeURL();
            var nb = $('types').querySelector('[data-group="' + g + '"]'); if (nb) nb.focus();
        });
        $('yearFrom').addEventListener('input', onYears); $('yearTo').addEventListener('input', onYears);
        // combobox
        var inp = $('personInput');
        inp.addEventListener('focus', openCombo);
        inp.addEventListener('input', function () { openCombo(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); if ($('personList').hidden) openCombo(); moveCombo(1); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); moveCombo(-1); }
            else if (e.key === 'Enter') { e.preventDefault(); if (comboActive >= 0) chooseCombo(comboActive); else { var f = comboItems.filter(function (x) { return !x.disabled; })[0]; if (f) chooseCombo(comboItems.indexOf(f)); } }
            else if (e.key === 'Escape') { closeCombo(); }
        });
        inp.addEventListener('blur', function () { setTimeout(function () { if (!$('personBox').contains(document.activeElement)) closeCombo(); }, 150); });
        $('personList').addEventListener('mousedown', function (e) { e.preventDefault(); });
        $('personList').addEventListener('click', function (e) { var li = e.target.closest('.lb-opt'); if (li && li.getAttribute('aria-disabled') !== 'true') chooseCombo(+li.dataset.idx); });
        $('personClear').addEventListener('click', clearAll);
        $('scopes').addEventListener('click', function (e) {
            var b = e.target.closest('[data-scope]'); if (!b) return;
            S.scope = b.dataset.scope; renderPersonBox(); refreshOverlays();
            if (FM.onFiltersChanged) FM.onFiltersChanged();
            writeURL();
            var ids = scopeIds(); announce('Showing ' + Object.keys(ids || {}).length + ' people.');
        });
        // delegated actions anywhere on the page
        document.addEventListener('click', function (e) {
            var t;
            if ((t = e.target.closest('[data-open-place]'))) { e.preventDefault(); if (!$('listView').hidden) hideSheet('listView'); if (S.mode === 'timeline' && FM.timelineOpenPlace) { FM.timelineOpenPlace(t.dataset.openPlace); return; } openPlace(t.dataset.openPlace, { opener: t, push: true }); return; }
            if ((t = e.target.closest('[data-person]')) && !e.target.closest('a')) { e.preventDefault(); if (S.mode !== 'explore') setMode('explore'); openPerson(t.dataset.person); return; }
            if ((t = e.target.closest('[data-sv]'))) { e.preventDefault(); FM.sv.open(t.dataset.sv, t); return; }
            if ((t = e.target.closest('[data-sv-link]'))) { FM.sv.linkClicked(t.dataset.svLink); return; }
            if ((t = e.target.closest('[data-style-set]'))) { setStyle(t.dataset.styleSet); return; }
            if ((t = e.target.closest('[data-compare]'))) { setCompare(true); return; }
            if ((t = e.target.closest('[data-play-person]'))) { var pid = t.dataset.playPerson; S.person = pid; S.scope = 'self'; renderPersonBox(); setMode('timeline', { state: { fromPerson: true } }); return; }
            if ((t = e.target.closest('[data-crumb]'))) {
                var parts = $('crumbs')._parts, part = parts[+t.dataset.crumb];
                if (part.act === 'map') closePanel();
                else if (part.act === 'person') openPerson(part.id);
                return;
            }
            if ((t = e.target.closest('.fn[data-fn]'))) { e.preventDefault(); var li = document.getElementById('fm-src-' + t.dataset.fn); if (li) { li.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' }); li.classList.add('is-flash'); setTimeout(function () { li.classList.remove('is-flash'); }, 1600); } return; }
        });
        $('peek').addEventListener('pointerleave', schedulePeekHide);
        $('peek').addEventListener('pointerenter', function () { clearTimeout(peekHideTimer); });
        $('peek').addEventListener('click', function (e) {
            var t = e.target.closest('[data-open-place]');
            if (t) return; // handled above
            if (e.target.closest('a,button')) return;
            // tapping the card opens level 2
            var mk = peekFor && markers[peekFor];
            if (mk && mk.members.length === 1) openPlace(mk.members[0].place.id, { opener: mk.el, push: true });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                var lb = document.querySelector('.record-lightbox'); // the site's record lightbox closes first
                if (lb) { lb.remove(); e.preventDefault(); return; }
                if (FM.sv.isOpen()) { FM.sv.close(); e.preventDefault(); return; }
                if (!$('listView').hidden) { hideSheet('listView'); return; }
                if (!$('tray').hidden) { hideSheet('tray'); return; }
                if (!$('peek').hidden) { hidePeek(); return; }
                if (FM.stepStage && FM.stepStage.active()) { FM.stepStage.stop(); return; }
                if (!$('panel').hidden && !e.target.closest('input,select,textarea')) { closePanel(); return; }
            }
            if (FM.sv.isOpen() && e.key === 'Tab') {
                var f = $('sv').querySelectorAll('button, iframe, a');
                if (f.length) { var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); } }
            }
        });
        window.addEventListener('popstate', function () { applyState(readURL()); });
        // compare divider
        var div = $('divider'), dragging = false;
        div.addEventListener('pointerdown', function (e) { dragging = true; div.setPointerCapture(e.pointerId); });
        div.addEventListener('pointermove', function (e) { if (!dragging) return; var r = $('stage').getBoundingClientRect(); setDivider((e.clientX - r.left) / r.width * 100); });
        div.addEventListener('pointerup', function () { dragging = false; });
        div.addEventListener('keydown', function (e) {
            var v = +div.getAttribute('aria-valuenow');
            if (e.key === 'ArrowLeft') { setDivider(v - 5); e.preventDefault(); }
            if (e.key === 'ArrowRight') { setDivider(v + 5); e.preventDefault(); }
            if (e.key === 'Home') { setDivider(0); e.preventDefault(); }
            if (e.key === 'End') { setDivider(100); e.preventDefault(); }
        });
        $('thenOpacity').addEventListener('input', function () {
            var v = +this.value / 100;
            (map.getStyle().layers || []).forEach(function (l) { if (/^nls/.test(l.id)) map.setPaintProperty(l.id, 'raster-opacity', v); });
        });
        window.addEventListener('resize', function () { if (!$('peek').hidden && peekFor && markers[peekFor]) positionPeek(markers[peekFor]); });
    }

    // ================================================================== map
    function hasWebGL() {
        try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
    }
    function initMap(st) {
        var first = st.style === 'then' && CFG.MAPTILER_KEY ? 'then' : (st.style === 'atlas' ? 'atlas' : 'today');
        return styleFor(first, { year: 1900 }).then(function (style) {
            S.style = first;
            map = new maplibregl.Map({
                container: 'map', style: style, bounds: ENGLAND, fitBoundsOptions: { padding: 30 },
                attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false,
                maxPitch: 0, minZoom: 1.5, maxZoom: 18, cooperativeGestures: false, fadeDuration: 150
            });
            map.touchZoomRotate.disableRotation();
            map.keyboard.disableRotation && map.keyboard.disableRotation();
            map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: 'Family data: this site' }), 'bottom-right');
            FM.map = map;
            // fall back to the shipped style if the free tile service does not answer
            var gotTiles = false;
            map.on('data', function (e) { if (e.sourceId === 'openmaptiles' && e.isSourceLoaded) gotTiles = true; });
            map.on('error', function (e) {
                var src = e && e.sourceId;
                var msg = String((e && e.error && e.error.message) || '');
                if (!styleState.failed && (src === 'openmaptiles' || /openfreemap|Failed to fetch|NetworkError|AJAXError/i.test(msg)) && (S.style === 'atlas' || S.style === 'today' || S.style === 'then') && !gotTiles) {
                    styleState.failed = true;
                    note('The modern map is not loading, so a simpler map is shown. The family\'s places are all here.', 7000);
                    loadStyleJson('fallback').then(function (fb) {
                        if (S.style === 'then' && CFG.MAPTILER_KEY) styleFor('then', thenContext()).then(function (s2) { map.setStyle(s2); });
                        else map.setStyle(fb);
                    });
                }
            });
            setTimeout(function () {
                if (!gotTiles && !styleState.failed && (S.style === 'atlas' || S.style === 'today')) {
                    styleState.failed = true;
                    loadStyleJson('fallback').then(function (fb) { map.setStyle(fb); note('The modern map is slow to load, so a simpler map is shown.', 6000); });
                }
            }, 8000);
            map.on('style.load', addOverlays);
            map.on('styledata', function () { if (map.isStyleLoaded() && !map.getSource('fm-areas')) addOverlays(); });
            var raf = null;
            map.on('move', function () { if (raf) return; raf = requestAnimationFrame(function () { raf = null; updateMarkers(); if (!$('peek').hidden && peekFor && markers[peekFor]) positionPeek(markers[peekFor]); }); });
            map.on('moveend', function () { updateMarkers(); });
            // names under the pins once the map is close enough to read them
            var labelsAt = function () { map.getContainer().classList.toggle('fm-labels', map.getZoom() >= 13); };
            map.on('zoom', labelsAt); labelsAt();
            map.on('click', function (e) {
                var t = e.originalEvent && e.originalEvent.target;
                if (t && t.closest && t.closest('.mk-wrap')) return; // a marker handles its own click (a first tap shows its peek)
                hidePeek();
            });
            // zoom controls in the site's style
            var zc = document.createElement('div');
            zc.className = 'fm-zoom';
            zc.innerHTML = '<button type="button" aria-label="Zoom in">+</button><button type="button" aria-label="Zoom out">&minus;</button><button type="button" aria-label="Show all of England" class="fm-zoom-home"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 12 4.5l8 7M6 10v9.5h12V10"/></svg></button>';
            $('stage').appendChild(zc);
            zc.children[0].addEventListener('click', function () { map.zoomIn({ duration: reduced() ? 0 : 300 }); });
            zc.children[1].addEventListener('click', function () { map.zoomOut({ duration: reduced() ? 0 : 300 }); });
            zc.children[2].addEventListener('click', function () { S.beyond = false; renderChips(); frameEngland(); });
            map.getCanvasContainer().addEventListener('touchstart', function (e) {
                if (tapZoomParked && !(e.target.closest && e.target.closest('.mk-wrap'))) { map.doubleClickZoom.enable(); tapZoomParked = false; }
            }, { passive: true, capture: true });
            camera = new FM.Camera(map, { reducedMotion: reduced, padding: function () { return cameraPadding(50); }, onUnfollow: function () { if (FM.onUnfollow) FM.onUnfollow(); } });
            FM.camera = camera;
            return new Promise(function (res) { map.once('load', res); });
        });
    }

    function start() {
        var st = readURL();
        FM.data.load().then(function (d) {
            DATA = d; FM.DATA = d;
            S.style = st.style === 'atlas' || (st.style === 'then' && CFG.MAPTILER_KEY) ? st.style : 'today';
            renderStyleSwitch();
            renderFamily(); renderKey(); initYears(); renderPersonBox(); bindUI();
            if (!hasWebGL() || !window.maplibregl) {
                document.body.classList.add('no-webgl');
                $('listHint').textContent = 'This device cannot draw the map, so here is every place and event as a list.';
                ready = true;
                openList();
                FM.ready = true;
                document.dispatchEvent(new CustomEvent('fm:ready'));
                return;
            }
            return initMap(st).then(function () {
                ready = true;
                addOverlays();
                renderChips();
                if (!st.place && !st.person) frameEngland(0);
                if (FM.onReady) FM.onReady();
                applyState(st, { initial: true });
                document.body.classList.add('fm-ready');
                FM.ready = true;
                writeURL();
                document.dispatchEvent(new CustomEvent('fm:ready'));
            });
        }).catch(function (err) {
            console.error(err);
            note('The map could not load its data. Please reload the page.', 20000);
        });
    }
    FM.start = start;
    FM.util = { yearOf: yearOf, avatar: avatar, dateLabel: dateLabel, confLabel: confLabel, confClass: confClass, placeLL: placeLL, announce: announce, note: note,
                reduced: reduced, spanOf: spanOf, metresText: metresText, kindLabel: kindLabel, refreshOverlays: function () { refreshOverlays(); }, hidePeek: hidePeek,
                closePanel: closePanel, openPanel: openPanel, clearPersonPath: clearPersonPath, renderPersonBox: renderPersonBox, setStyle: setStyle, lifeYears: lifeYears };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
    else setTimeout(start, 0);
})();
