/* Family map: Timeline mode.
 * Timeline mode turns the event index into steps for FM.Player and plays them with the shared
 * camera (map-player.js) and event card (map-steps.js). */
(function () {
    'use strict';
    var FM = window.FM = window.FM || {};
    var $ = function (id) { return document.getElementById(id); };
    var esc = FM.data.esc, glyph = FM.glyph;
    var U = function () { return FM.util; };
    var T = {
        active: false, beats: [], undated: [], index: -1, time: null, speed: 1, camera: 'follow', real: false, trails: true, showAll: false,
        period: false, scrubbing: false, scale: null, lastEdition: null, arcAnim: null
    };
    try { var saved = localStorage.getItem('fm-camera'); if (saved) T.camera = saved; } catch (e) { /* storage blocked */ }

    function yearOf(d) { return d ? +String(d).slice(0, 4) : null; }
    function dec(d) { // ISO date to decimal year
        if (!d) return null;
        var y = +d.slice(0, 4), m = +(d.slice(5, 7) || 1), day = +(d.slice(8, 10) || 1);
        return y + ((m - 1) * 30.44 + (day - 1)) / 365.25;
    }
    function isoOf(x) { var y = Math.floor(x), r = x - y, m = Math.min(11, Math.floor(r * 12)), d = Math.min(27, Math.floor((r * 12 - m) * 28)); return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d + 1).padStart(2, '0'); }


    // ================================================================== beats
    function scopeSet() { return FM.filters.scopeIds(); }
    function eventsForTimeline() {
        var D = FM.DATA, scope = scopeSet();
        var pass = function (e) {
            if (!FM.filters.eventPasses(e, { ignoreYears: true })) return false;
            if (scope && !e.personIds.some(function (id) { return scope[id]; })) return false;
            return true;
        };
        var placed = D.events.filter(pass);
        var unplaced = D.unplaced.filter(pass);
        // voyages: one item per voyage
        var seenV = {}, out = [];
        placed.forEach(function (e) {
            if (e.voyageId) {
                if (seenV[e.voyageId]) return;
                seenV[e.voyageId] = true;
                var v = e.voyage, start = v.departureDate || v.arrivalDate, end = v.arrivalDate || v.departureDate;
                out.push(Object.assign({}, e, { id: 'voyage-' + v.id, placeId: v.fromPlaceId, toPlaceId: v.toPlaceId, dateStart: start, dateEnd: end, datePrecision: 'day', isVoyage: true, date: v.display }));
                return;
            }
            out.push(e);
        });
        return out.concat(unplaced);
    }
    // events share a beat only when they share a start: the same day, the same month, the same
    // quarter, or the same year when only the year is known (a range plays at its earliest date)
    function beatKey(e) {
        if (e.isVoyage) return 'v:' + e.id;
        if (e.datePrecision === 'day') return 'd:' + e.dateStart;
        if (e.datePrecision === 'month') return 'm:' + e.dateStart.slice(0, 7);
        if (e.datePrecision === 'quarter') return 'q:' + e.dateStart;
        if (/-01-01$/.test(e.dateStart)) return 'y:' + e.dateStart.slice(0, 4);
        return 'd:' + e.dateStart;
    }
    function buildBeats() {
        var all = eventsForTimeline().sort(FM.data.byDate);
        var dated = all.filter(function (e) { return e.dateStart; });
        T.undated = all.filter(function (e) { return !e.dateStart; });
        var beats = [], map = {};
        dated.forEach(function (e) {
            var k = beatKey(e);
            if (!map[k]) { map[k] = { id: k, events: [], date: e.dateStart }; beats.push(map[k]); }
            map[k].events.push(e);
        });
        beats.forEach(function (b, i) {
            b.index = i;
            b.year = yearOf(b.date);
            b.t = dec(b.date);
            b.places = [];
            b.events.forEach(function (e) { if (e.placeId && b.places.indexOf(e.placeId) < 0) b.places.push(e.placeId); if (e.toPlaceId && b.places.indexOf(e.toPlaceId) < 0) b.places.push(e.toPlaceId); });
            b.voyage = b.events.filter(function (e) { return e.isVoyage; })[0] || null;
            b.orkney = b.events.every(function (e) { return e.orkney; });
            var longest = Math.max.apply(null, b.events.map(function (e) { return (e.summary || '').length; }));
            b.dwell = Math.max(4000, Math.min(8000, 3200 + longest * 28)) + Math.min(4000, (b.events.length - 1) * 900);
            if (b.voyage && b.voyage.dateEnd && b.voyage.dateEnd !== b.voyage.dateStart) b.tEnd = dec(b.voyage.dateEnd);
        });
        T.beats = beats;
        var ts = beats.map(function (b) { return b.t; }).concat(beats.map(function (b) { return b.tEnd || b.t; }));
        var lo = Math.floor((Math.min.apply(null, ts) - 2) / 10) * 10, hi = Math.ceil((Math.max.apply(null, ts) + 2) / 10) * 10;
        if (!beats.length) { lo = 1800; hi = 2030; }
        T.scale = { lo: lo, hi: hi };
        return beats;
    }

    // ================================================================== steps for the player
    function stepsFromBeats(beats) {
        return beats.map(function (b) {
            return { id: b.id, beat: b, places: b.places, events: b.events.map(function (e) { return e.id; }), dwell: b.dwell, waitForNext: false };
        });
    }
    function transitionFor(from, to) {
        var g = Math.abs(to.beat.t - (from.beat.tEnd || from.beat.t));
        if (T.real) return Math.min(45000, 350 + g * 450);
        if (g <= 5) return 450 + g * 260;
        return 1000 + Math.min(1000, g * 18);
    }

    // ================================================================== rendering
    function x(t) { var s = T.scale; return (t - s.lo) / (s.hi - s.lo) * 100; }
    function renderTrack() {
        var rail = $('rail'), s = T.scale;
        var html = '';
        for (var y = Math.ceil(s.lo / 10) * 10; y <= s.hi; y += 10) {
            var major = y % 50 === 0;
            html += '<span class="tk-dec' + (major ? ' is-major' : '') + '" style="left:' + x(y) + '%"><i></i>' + (major || (s.hi - s.lo) <= 160 ? '<b>' + y + '</b>' : '') + '</span>';
        }
        // event glyphs; ticks that would overlap merge into a stacked tick that fans out
        var w = rail.offsetWidth || 800, groups = [], gap = w < 600 ? 15 : 13;
        T.beats.forEach(function (b) {
            b.events.forEach(function (e) {
                var px = x(dec(e.dateStart)) / 100 * w;
                var g = groups.length ? groups[groups.length - 1] : null;
                if (g && px - g.px0 < gap) { g.items.push({ e: e, b: b }); g.px1 = px; }
                else groups.push({ px0: px, px1: px, items: [{ e: e, b: b }] });
                if (e.dateEnd && e.dateEnd !== e.dateStart && (e.datePrecision === 'range' || e.datePrecision === 'quarter' || e.datePrecision === 'decade' || e.isVoyage)) {
                    var s0 = dec(e.dateStart), s1 = dec(e.dateEnd) + (e.isVoyage ? 0 : 1 / 365);
                    var l = x(s0), r = x(s1);
                    html += '<span class="tk-bar' + (e.orkney ? ' is-orkney' : '') + '" data-bar="' + esc(e.id) + '" data-s="' + s0 + '" data-e="' + s1 + '" style="left:' + l + '%;width:' + Math.max(0.15, r - l) + '%"></span>';
                }
            });
        });
        groups.forEach(function (g, gi) {
            var first = g.items[0], last = g.items[g.items.length - 1], stack = g.items.length > 1;
            var beats = []; g.items.forEach(function (it) { if (beats.indexOf(it.b.index) < 0) beats.push(it.b.index); });
            g.beats = beats;
            var label = stack ? g.items.length + ' events, ' + U().dateLabel(first.e) + (U().dateLabel(last.e) !== U().dateLabel(first.e) ? ' to ' + U().dateLabel(last.e) : '') + '. Opens a list.'
                              : U().dateLabel(first.e) + ': ' + FM.data.TYPE_LABEL[first.e.type] + ', ' + whoOf(first.e) + ', ' + (first.e.placeId ? FM.DATA.places[first.e.placeId].name : 'place not known');
            html += '<button type="button" class="tk' + (stack ? ' tk--stack' : '') + (first.e.orkney ? ' is-orkney' : '') + '" style="left:' + ((g.px0 + g.px1) / 2 / w * 100) + '%" data-beat="' + first.b.index + '" data-beats="' + beats.join(' ') + '" data-group="' + gi + '"' + (stack ? ' aria-haspopup="true" aria-expanded="false"' : '') + ' aria-label="' + esc(label) + '">' +
                glyph(first.e.type, 'tk-gl') + '</button>';
        });
        rail.innerHTML = html;
        rail._groups = groups;
        closeFan();
        markTicks();
    }
    function whoOf(e) { return e.personIds.map(function (id) { return FM.DATA.people[id].displayName; }).join(', ') || FM.data.TYPE_LABEL[e.type]; }
    function markTicks() {
        Array.prototype.forEach.call($('rail').querySelectorAll('.tk'), function (tk) {
            var bs = tk.dataset.beats.split(' ').map(Number);
            tk.classList.toggle('is-current', bs.indexOf(T.index) >= 0);
            tk.classList.toggle('is-past', bs[bs.length - 1] < T.index);
        });
    }
    // ---- the fan: a stacked tick opens a short list of its events
    var fanFor = null, fanTimer = null;
    function openFan(tk, focusFirst) {
        clearTimeout(fanTimer);
        var g = $('rail')._groups[+tk.dataset.group], fan = $('tlFan');
        if (!g) return;
        if (fanFor === tk && !fan.hidden) { if (focusFirst) { var f0 = fan.querySelector('.fan-b'); if (f0) f0.focus(); } return; }
        closeFan();
        fanFor = tk;
        $('tlTip').hidden = true;
        fan.innerHTML = '<p class="fan-h">' + g.items.length + ' events</p>' + g.items.map(function (it, i) {
            return '<button type="button" class="fan-b' + (it.b.index === T.index ? ' is-current' : '') + '" style="--i:' + Math.min(i, 12) + '" data-beat="' + it.b.index + '" data-event="' + esc(it.e.id) + '">' + glyph(it.e.type) +
                '<span class="fan-d">' + esc(U().dateLabel(it.e)) + '</span><span class="fan-t">' + esc(whoOf(it.e)) + '</span></button>';
        }).join('');
        fan.hidden = false;
        tk.classList.add('is-open'); tk.setAttribute('aria-expanded', 'true');
        var r = tk.getBoundingClientRect(), tr = $('track').getBoundingClientRect();
        fan.style.left = Math.max(0, Math.min(tr.width - fan.offsetWidth, r.left - tr.left + r.width / 2 - fan.offsetWidth / 2)) + 'px';
        if (focusFirst) { var f = fan.querySelector('.fan-b'); if (f) f.focus(); }
    }
    function closeFan(returnFocus) {
        clearTimeout(fanTimer);
        var fan = $('tlFan');
        if (!fan || fan.hidden) { fanFor = null; return; }
        fan.hidden = true; fan.innerHTML = '';
        if (fanFor) { fanFor.classList.remove('is-open'); fanFor.setAttribute('aria-expanded', 'false'); if (returnFocus) fanFor.focus(); }
        fanFor = null;
    }
    function closeFanSoon() { clearTimeout(fanTimer); fanTimer = setTimeout(function () { closeFan(); }, 220); }
    function renderList() {
        var html = T.beats.map(function (b) {
            return b.events.map(function (e) {
                return '<li class="el" data-beat="' + b.index + '" data-event="' + esc(e.id) + '"><button type="button" class="el-b"><span class="el-gl">' + glyph(e.type) + '</span><span class="el-d">' + esc(U().dateLabel(e)) + '</span><span class="el-t">' +
                    esc(e.personIds.map(function (id) { return FM.DATA.people[id].displayName; }).join(', ') || FM.data.TYPE_LABEL[e.type]) + '</span><span class="el-p">' + esc(e.placeId ? FM.DATA.places[e.placeId].name : 'Place not known') + '</span></button></li>';
            }).join('');
        }).join('');
        if (T.undated.length) html += '<li class="el-h" role="presentation">Date unknown</li>' + T.undated.map(function (e) {
            return '<li class="el el--undated" data-undated="' + esc(e.id) + '"><button type="button" class="el-b"><span class="el-gl">' + glyph(e.type) + '</span><span class="el-d">Date unknown</span><span class="el-t">' + esc(e.personIds.map(function (id) { return FM.DATA.people[id].displayName; }).join(', ')) + '</span><span class="el-p">' + esc(e.placeId ? FM.DATA.places[e.placeId].name : 'Place not known') + '</span></button></li>';
        }).join('');
        $('tlList').innerHTML = html;
    }
    function setTime(t, opts) {
        opts = opts || {};
        T.time = t;
        var pct = Math.max(0, Math.min(100, x(t)));
        $('playhead').style.left = pct + '%';
        $('playhead').setAttribute('aria-valuenow', Math.floor(t));
        $('playhead').setAttribute('aria-valuetext', String(Math.floor(t)));
        var yr = $('tlYear'), tw = $('track').offsetWidth || 800;
        yr.textContent = Math.floor(t);
        var half = (yr.offsetWidth || 70) / 2;
        yr.style.left = Math.max(half, Math.min(tw - half, pct / 100 * tw)) + 'px';
        Array.prototype.forEach.call($('rail').querySelectorAll('.tk-bar'), function (bar) { bar.classList.toggle('is-lit', t >= +bar.dataset.s - 1e-6 && t <= +bar.dataset.e + 1e-6); });
        if (T.period && FM.setThenEdition) {
            var b = T.beats[T.index], ll = b && b.places[0] && FM.DATA.places[b.places[0]] ? U().placeLL(FM.DATA.places[b.places[0]]) : null;
            FM.setThenEdition(Math.floor(t), ll);
        }
        if (!opts.noMarkers) U().refreshOverlays();
    }
    function highlightList() {
        var b = T.beats[T.index];
        Array.prototype.forEach.call($('tlList').querySelectorAll('.el'), function (li) {
            var bi = li.dataset.beat != null ? +li.dataset.beat : null;
            li.classList.toggle('is-current', bi === T.index);
            li.classList.toggle('is-past', bi != null && bi < T.index);
        });
        var cur = $('tlList').querySelector('.el.is-current');
        if (cur && !T.scrubbing) {
            var box = $('tlPanel'), r = cur.getBoundingClientRect(), br = box.getBoundingClientRect();
            if (r.top < br.top + 120 || r.bottom > br.bottom - 10) cur.scrollIntoView({ block: 'nearest', behavior: U().reduced() ? 'auto' : 'smooth' });
        }
        markTicks();
    }
    function showBeat(b) {
        $('tlNow').innerHTML = '<p class="fm-label">' + (b.events.length > 1 ? b.events.length + ' events' : 'Now') + '</p>' + b.events.map(function (e) { return FM.eventCard(e); }).join('');
    }

    // ================================================================== map during playback
    FM.timelineFilter = function (evs) {
        if (!T.active) return evs;
        var scope = scopeSet();
        return evs.filter(function (e) {
            if (!e.dateStart || e.voyageId && e.voyageEnd === 'arrival' && e.dateStart === null) return false;
            if (scope && !e.personIds.some(function (id) { return scope[id]; })) return false;
            if (T.showAll) return true;
            return dec(e.dateStart) <= T.time + 1e-6;
        });
    };
    FM.timelineState = function (pid, evs) {
        var b = T.beats[T.index];
        var cur = b && b.events.some(function (e) { return e.placeId === pid || e.toPlaceId === pid; }) && !T.scrubbingFuture;
        var future = evs.length && evs.every(function (e) { return dec(e.dateStart) > T.time + 1e-6; });
        return { current: !!cur && !future, past: !cur && !future, future: !!future };
    };
    FM.timelineYear = function () { return T.time ? Math.floor(T.time) : null; };
    function drawTrails() {
        if (!T.trails || !FM.map) { FM.setData('fm-trails', { type: 'FeatureCollection', features: [] }); return; }
        var D = FM.DATA, scope = scopeSet(), feats = [];
        var byPerson = {};
        T.beats.forEach(function (b) {
            if (b.t > T.time + 1e-6) return;
            b.events.forEach(function (e) {
                if (!e.placeId || e.isVoyage) return;
                e.personIds.forEach(function (pid) {
                    if (scope && !scope[pid]) return;
                    (byPerson[pid] = byPerson[pid] || []).push({ t: b.t, pl: D.places[e.placeId] });
                });
            });
        });
        Object.keys(byPerson).forEach(function (pid) {
            var seq = byPerson[pid];
            for (var i = 1; i < seq.length; i++) {
                var a = seq[i - 1].pl, c = seq[i].pl;
                if (a.id === c.id) continue;
                var age = T.time - seq[i].t, o = Math.max(0.12, 0.85 - age / 40);
                feats.push({ type: 'Feature', properties: { o: o }, geometry: { type: 'LineString', coordinates: [[a.lng, a.lat], [c.lng, c.lat]] } });
            }
        });
        FM.setData('fm-trails', { type: 'FeatureCollection', features: feats });
    }
    function animateArc(b, duration) {
        if (T.arcAnim) cancelAnimationFrame(T.arcAnim);
        var D = FM.DATA, v = b && b.voyage;
        var done = T.beats.filter(function (x) { return x.voyage && x.index < (b ? b.index : T.index); }).map(function (x) {
            var a = D.places[x.voyage.placeId], c = D.places[x.voyage.toPlaceId];
            return a && c ? { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: FM.arc([a.lng, a.lat], [c.lng, c.lat]) } } : null;
        }).filter(Boolean);
        if (!v) { FM.setData('fm-arcs', { type: 'FeatureCollection', features: T.trails ? done : [] }); return; }
        var a = D.places[v.placeId], c = D.places[v.toPlaceId];
        if (!a || !c) return;
        var pts = FM.arc([a.lng, a.lat], [c.lng, c.lat], 80);
        var start = performance.now();
        var step = function () {
            var p = U().reduced() ? 1 : Math.min(1, (performance.now() - start) / duration);
            var n = Math.max(2, Math.round(pts.length * p));
            FM.setData('fm-arcs', { type: 'FeatureCollection', features: (T.trails ? done : []).concat([{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.slice(0, n) } }]) });
            if (p < 1 && T.active) T.arcAnim = requestAnimationFrame(step);
        };
        step();
    }
    function frameBeat(b, scrub) {
        if (!FM.camera || scrub) return;
        var D = FM.DATA;
        var pts = [], radius = 0;
        b.places.forEach(function (pid) { var pl = D.places[pid]; if (pl && pl.lat != null) { pts.push([pl.lng, pl.lat]); radius = Math.max(radius, pl.uncertaintyMetres || 100); } });
        FM.camera.mode = T.camera;
        if (!pts.length) {
            // place not known: ease out to England rather than pretend to a place
            if (FM.camera.following) FM.frameEngland(U().reduced() ? 0 : 1400);
            return;
        }
        if (b.voyage) {
            FM.camera.frame({ points: pts, radius: radius }, { mode: T.camera === 'overview' ? 'overview' : 'follow', noJourney: true });
            return;
        }
        FM.camera.frame({ points: pts, radius: radius }, { mode: T.camera });
    }
    function pulse(b) {
        if (U().reduced()) return;
        setTimeout(function () {
            Array.prototype.forEach.call(document.querySelectorAll('.mk-wrap.is-current'), function (el) { el.classList.remove('is-pulse'); void el.offsetWidth; el.classList.add('is-pulse'); });
        }, 400);
    }

    // ================================================================== player wiring
    var player = null;
    function onEnter(step, i, ctx) {
        var b = step.beat;
        T.index = i;
        setTime(b.t, { noMarkers: true });
        showBeat(b);
        highlightList();
        U().refreshOverlays();
        drawTrails();
        animateArc(b, Math.max(1200, (player ? player.dwellFor(step) / player.speed : 4000) * 0.8));
        frameBeat(b, ctx && ctx.scrub);
        pulse(b);
        var first = b.events[0];
        U().announce(U().dateLabel(first) + '. ' + b.events.map(function (e) { return e.summary; }).join(' '));
        FM.writeURL();
    }
    function onTransition(p, from, to) {
        var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        var t0 = from.beat.tEnd || from.beat.t;
        setTime(t0 + (to.beat.t - t0) * e, { noMarkers: p < 0.98 && (Math.floor(t0 + (to.beat.t - t0) * e) === Math.floor(T.time)) });
    }
    function onState(st) {
        var btn = $('tlPlay');
        btn.classList.toggle('is-playing', st.playing);
        btn.setAttribute('aria-label', st.playing ? 'Pause' : 'Play');
        $('fm').classList.toggle('tl-playing', st.playing);
        FM.writeURL();
    }
    function rebuild(keepId) {
        var cur = T.beats[T.index];
        var curEvent = keepId || (cur && cur.events[0] && cur.events[0].id);
        var wasPlaying = player && player.playing;
        if (player) player.pause();
        buildBeats();
        renderTrack(); renderList();
        var startAt = 0;
        if (curEvent) T.beats.forEach(function (b, i) { if (b.events.some(function (e) { return e.id === curEvent; })) startAt = i; });
        player.setSteps(stepsFromBeats(T.beats), startAt);
        if (wasPlaying) player.play();
    }
    function ensurePlayer() {
        if (player) return player;
        player = new FM.Player({ speed: T.speed, transitionFor: transitionFor, dwellFor: function (s) { return s.dwell; } });
        player.on('enter', onEnter).on('transition', onTransition).on('state', onState).on('end', function () { U().announce('The end of the timeline.'); });
        FM.player = player;
        return player;
    }
    function nearestBeat(t) {
        var best = 0, bd = 1e9;
        T.beats.forEach(function (b, i) { var d = Math.abs(b.t - t); if (d < bd) { bd = d; best = i; } });
        return best;
    }

    // ================================================================== controls
    function renderSpeed() {
        $('tlSpeed').innerHTML = [0.5, 1, 2].map(function (s) { return '<button type="button" role="radio" aria-checked="' + (T.speed === s) + '" data-speed="' + s + '">' + (s === 0.5 ? '0.5' : s) + '&times;</button>'; }).join('');
    }
    function bind() {
        $('tlPlay').addEventListener('click', function () { player.toggle(); });
        $('tlNext').addEventListener('click', function () { player.next(); });
        $('tlPrev').addEventListener('click', function () { player.prev(); });
        $('tlRestart').addEventListener('click', function () { FM.camera && FM.camera.resetOverview(); player.restart(); });
        $('tlSpeed').addEventListener('click', function (e) { var b = e.target.closest('[data-speed]'); if (!b) return; T.speed = +b.dataset.speed; player.setSpeed(T.speed); renderSpeed(); FM.writeURL(); });
        $('tlReal').addEventListener('change', function () { T.real = this.checked; FM.writeURL(); });
        $('tlTrails').addEventListener('change', function () { T.trails = this.checked; drawTrails(); animateArc(null); });
        $('tlAll').addEventListener('change', function () { T.showAll = this.checked; U().refreshOverlays(); });
        $('tlPeriod').addEventListener('change', function () {
            T.period = this.checked;
            if (T.period) { if (!(window.FM_CONFIG || {}).MAPTILER_KEY) { U().note('The period maps need a MapTiler key (see config.js).'); this.checked = false; T.period = false; return; } U().setStyle('then'); }
        });
        $('tlCamera').value = T.camera;
        $('tlCamera').addEventListener('change', function () { T.camera = this.value; try { localStorage.setItem('fm-camera', T.camera); } catch (e) { /* blocked */ } FM.camera.following = true; FM.camera.resetOverview(); $('followAgain').hidden = true; var s = player.current(); if (s) frameBeat(s.beat); FM.writeURL(); });
        $('followAgain').addEventListener('click', function () { FM.camera.following = true; this.hidden = true; var s = player.current(); if (s) frameBeat(s.beat); });
        $('rail').addEventListener('click', function (e) {
            var tk = e.target.closest('.tk'); if (!tk) return;
            if (tk.classList.contains('tk--stack')) {
                // first press opens the fan (touch has no hover); a second press goes to the first event
                if (fanFor === tk && !$('tlFan').hidden && e.pointerType === 'mouse') { closeFan(); jumpTo(+tk.dataset.beat); }
                else openFan(tk, e.detail === 0);
                return;
            }
            closeFan();
            jumpTo(+tk.dataset.beat);
        });
        $('rail').addEventListener('pointerover', function (e) {
            var tk = e.target.closest('.tk'); if (!tk || e.pointerType === 'touch') return;
            if (tk.classList.contains('tk--stack')) { clearTimeout(fanTimer); fanTimer = setTimeout(function () { openFan(tk); }, 110); }
            else { closeFanSoon(); showTip(tk); }
        });
        $('rail').addEventListener('pointerout', function (e) { $('tlTip').hidden = true; if (e.target.closest('.tk--stack')) closeFanSoon(); });
        $('rail').addEventListener('focusin', function (e) { var tk = e.target.closest('.tk'); if (!tk) return; if (tk.classList.contains('tk--stack')) openFan(tk); else { closeFan(); showTip(tk); } });
        $('rail').addEventListener('focusout', function (e) { $('tlTip').hidden = true; if (!e.relatedTarget || !e.relatedTarget.closest('#tlFan, .tk--stack')) closeFanSoon(); });
        var fanEl = $('tlFan');
        fanEl.addEventListener('pointerover', function () { clearTimeout(fanTimer); });
        fanEl.addEventListener('pointerout', function (e) { if (!e.relatedTarget || !e.relatedTarget.closest('#tlFan')) closeFanSoon(); });
        fanEl.addEventListener('focusout', function (e) { if (!e.relatedTarget || !e.relatedTarget.closest('#tlFan, .tk--stack')) closeFanSoon(); });
        fanEl.addEventListener('click', function (e) { var b = e.target.closest('.fan-b'); if (!b) return; var tk = fanFor; closeFan(); jumpTo(+b.dataset.beat, b.dataset.event); if (tk) tk.focus({ preventScroll: true }); });
        fanEl.addEventListener('keydown', function (e) {
            var items = Array.prototype.slice.call(fanEl.querySelectorAll('.fan-b')), i = items.indexOf(document.activeElement);
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeFan(true); }
            else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); (items[i + 1] || items[0]).focus(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); (items[i - 1] || items[items.length - 1]).focus(); }
        }, true);
        $('rail').addEventListener('keydown', function (e) {
            var tk = e.target.closest('.tk--stack');
            if (tk && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); e.stopPropagation(); openFan(tk, true); }
            else if (tk && e.key === 'Escape' && !$('tlFan').hidden) { e.preventDefault(); e.stopPropagation(); closeFan(true); }
        }, true);
        $('tlOpts').addEventListener('click', function () { var on = !$('timeline').classList.contains('is-opts'); $('timeline').classList.toggle('is-opts', on); this.setAttribute('aria-expanded', on ? 'true' : 'false'); });
        $('tlList').addEventListener('click', function (e) {
            var li = e.target.closest('.el'); if (!li) return;
            if (li.dataset.undated) { var ev = FM.DATA.byId[li.dataset.undated] || T.undated.filter(function (x) { return x.id === li.dataset.undated; })[0]; if (ev) { $('tlNow').innerHTML = '<p class="fm-label">Date unknown</p>' + FM.eventCard(ev); if (ev.placeId) FM.openPlace(ev.placeId, { noFly: false }); } return; }
            jumpTo(+li.dataset.beat, li.dataset.event);
        });
        $('tlNow').addEventListener('click', function () { /* links and buttons are delegated in map-ui.js */ });
        // scrubbing
        var track = $('track');
        var drag = false;
        function tAt(clientX) { var r = $('rail').getBoundingClientRect(); var p = Math.max(0, Math.min(1, (clientX - r.left) / r.width)); return T.scale.lo + p * (T.scale.hi - T.scale.lo); }
        function scrubTo(t) {
            T.scrubbing = true;
            setTime(t);
            var i = nearestBeat(t);
            if (i !== T.index) { T.index = i; showBeat(T.beats[i]); highlightList(); drawTrails(); }
        }
        $('playhead').addEventListener('pointerdown', function (e) { drag = true; T.wasPlaying = player.playing; player.pause(); this.setPointerCapture(e.pointerId); e.preventDefault(); });
        $('rail').addEventListener('pointerdown', function (e) { if (e.target.closest('.tk')) return; drag = true; T.wasPlaying = player.playing; player.pause(); scrubTo(tAt(e.clientX)); $('playhead').setPointerCapture && $('playhead').setPointerCapture(e.pointerId); });
        document.addEventListener('pointermove', function (e) { if (drag) scrubTo(tAt(e.clientX)); });
        document.addEventListener('pointerup', function () {
            if (!drag) return; drag = false; T.scrubbing = false;
            var i = nearestBeat(T.time);
            player.goTo(i);
            if (T.wasPlaying) player.play();
        });
        $('playhead').addEventListener('keydown', function (e) { handleKey(e, true); });
        document.addEventListener('keydown', function (e) { if (T.active && !e.defaultPrevented && !e.target.closest('input,select,textarea,[role=slider],.fm-listbox,#tlFan,.fm-sv,.fm-sheet')) handleKey(e); });
        // mobile sheet: tap the grip to show the whole list
        // swipe the sheet up for the whole list, down to close it; a tap on the grip toggles it
        var grip = $('tlPanel').querySelector('.fm-events-grip'), sy = null;
        var setOpen = function (on) { $('tlPanel').classList.toggle('is-open', on); grip.setAttribute('aria-expanded', on ? 'true' : 'false'); };
        grip.setAttribute('role', 'button'); grip.setAttribute('tabindex', '0'); grip.setAttribute('aria-label', 'Show every event'); grip.setAttribute('aria-expanded', 'false');
        grip.addEventListener('click', function () { setOpen(!$('tlPanel').classList.contains('is-open')); });
        grip.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!$('tlPanel').classList.contains('is-open')); } });
        $('tlPanel').addEventListener('touchstart', function (e) { var t = e.target; sy = (t === grip || t.closest('.fm-now .fm-label') || ($('tlPanel').classList.contains('is-open') && t.closest('.fm-h--list'))) ? e.touches[0].clientY : null; }, { passive: true });
        $('tlPanel').addEventListener('touchend', function (e) {
            if (sy == null) return;
            var dy = e.changedTouches[0].clientY - sy; sy = null;
            if (dy < -30) setOpen(true); else if (dy > 30) setOpen(false);
        }, { passive: true });
    }
    function handleKey(e) {
        if (FM.sv.isOpen()) return;
        if (e.target.closest && e.target.closest('#modeSwitch')) return;
        var k = e.key;
        if (k === ' ' || k === 'Spacebar') { e.preventDefault(); player.toggle(); }
        else if (k === 'ArrowRight' && e.shiftKey) { e.preventDefault(); jumpYear(10); }
        else if (k === 'ArrowLeft' && e.shiftKey) { e.preventDefault(); jumpYear(-10); }
        else if (k === 'ArrowRight') { e.preventDefault(); player.next(); }
        else if (k === 'ArrowLeft') { e.preventDefault(); player.prev(); }
        else if (k === 'Home') { e.preventDefault(); player.goTo(0); }
        else if (k === 'End') { e.preventDefault(); player.goTo(T.beats.length - 1); }
    }
    function jumpYear(d) {
        var target = (T.beats[T.index] ? T.beats[T.index].t : T.scale.lo) + d;
        var i = d > 0 ? T.beats.findIndex(function (b) { return b.t >= target; }) : (function () { var k = -1; T.beats.forEach(function (b, j) { if (b.t <= target) k = j; }); return k; })();
        if (i < 0) i = d > 0 ? T.beats.length - 1 : 0;
        player.goTo(i);
    }
    function jumpTo(i, eventId) {
        FM.camera.following = true; $('followAgain').hidden = true;
        player.goTo(i);
        if (eventId) { var card = $('tlNow').querySelector('[data-event="' + CSS.escape(eventId) + '"]'); if (card) card.classList.add('is-picked'); }
    }
    function showTip(tk) {
        var g = $('rail')._groups[+tk.dataset.group];
        var tip = $('tlTip');
        tip.innerHTML = g.items.slice(0, 8).map(function (it) { return '<span>' + glyph(it.e.type) + ' <b>' + esc(U().dateLabel(it.e)) + '</b> ' + esc(it.e.personIds.map(function (id) { return FM.DATA.people[id].givenNames || FM.DATA.people[id].displayName; }).join(', ')) + '</span>'; }).join('') + (g.items.length > 8 ? '<span>and ' + (g.items.length - 8) + ' more</span>' : '');
        tip.hidden = false;
        var r = tk.getBoundingClientRect(), tr = $('track').getBoundingClientRect();
        tip.style.left = Math.max(4, Math.min(tr.width - 260, r.left - tr.left - 60)) + 'px';
    }

    // ================================================================== the mode
    var bound = false;
    function enter(st) {
        st = st || {};
        T.active = true;
        ensurePlayer();
        if (!bound) { bind(); bound = true; }
        U().hidePeek();
        $('timeline').hidden = false; $('tlPanel').hidden = false;
        if (!$('panel').hidden) U().closePanel({ silent: true, keepPerson: true });
        U().clearPersonPath();
        if (st.speed) T.speed = +st.speed || 1;
        if (st.camera) T.camera = st.camera;
        if (st.pace === 'real') { T.real = true; $('tlReal').checked = true; }
        $('tlCamera').value = T.camera;
        renderSpeed();
        player.speed = T.speed;
        FM.camera.active = true; FM.camera.following = true; FM.camera.resetOverview();
        rebuild(st.event || null);
        if (st.event && FM.DATA.byId[st.event] === undefined) U().note('That event is not in the timeline with the current filters.');
        if (st.fromPerson) player.play();
        setTimeout(function () { measure(); renderTrack(); highlightList(); setTime(T.time || (T.beats[0] ? T.beats[0].t : 0), { noMarkers: true }); }, 60);
    }
    function measure() { var h = $('timeline').offsetHeight; if (h) $('fm').style.setProperty('--fm-tl-h', h + 'px'); }
    function leave() {
        T.active = false;
        if (player) player.pause();
        if (T.arcAnim) cancelAnimationFrame(T.arcAnim);
        $('timeline').hidden = true; $('tlPanel').hidden = true; $('followAgain').hidden = true;
        FM.setData('fm-trails', { type: 'FeatureCollection', features: [] });
        FM.setData('fm-arcs', { type: 'FeatureCollection', features: [] });
        FM.camera.active = false; FM.camera.following = true;
        $('fm').classList.remove('tl-playing');
    }
    FM.registerMode('timeline', {
        label: 'Timeline',
        enter: enter, leave: leave,
        urlState: function () {
            var b = T.beats[T.index];
            return { event: b ? b.events[0].id : null, speed: T.speed !== 1 ? T.speed : null, camera: T.camera !== 'follow' ? T.camera : null, playing: player && player.playing ? 1 : null, pace: T.real ? 'real' : null };
        },
        applyState: function (st) { if (st.event) { var i = T.beats.findIndex(function (b) { return b.events.some(function (e) { return e.id === st.event; }); }); if (i >= 0) player.goTo(i); } }
    });
    FM.onFiltersChanged = function () { if (T.active) rebuild(); };
    // a marker click: the latest event at that place up to now, or the next one if none has happened yet
    FM.timelineJumpToPlace = function (pid) {
        var before = -1, after = -1;
        T.beats.forEach(function (b, i) {
            if (b.places.indexOf(pid) < 0) return;
            if (b.t <= T.time + 1e-6) before = i; else if (after < 0) after = i;
        });
        var i = before >= 0 ? before : after;
        if (i >= 0) jumpTo(i);
    };
    FM.onUnfollow = function () { if (T.active) $('followAgain').hidden = false; };
    FM.timelineOpenPlace = function (pid) {
        // in Timeline mode, a place opens in Explore without losing the moment
        if (player) player.pause();
        FM.setMode('explore');
        FM.openPlace(pid, { push: true });
    };
    FM.onOverlays = function () { if (T.active) { drawTrails(); animateArc(T.beats[T.index] || null, 1); } };
    FM.timeline = T;
    FM.timelineDebug = { beats: function () { return T.beats; }, undated: function () { return T.undated; }, player: function () { return player; }, setTime: setTime, nearestBeat: nearestBeat };
    window.addEventListener('resize', function () { if (T.active) { measure(); renderTrack(); highlightList(); setTime(T.time, { noMarkers: true }); } });

})();
