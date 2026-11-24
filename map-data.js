/* Family map: data. Builds the event index in the browser from data/people.json (the facts) and
 * data/places.json (the places, and the facts the pages publish that people.json does not hold).
 * Each fact lives in one place: events that mirror a people.json fact take their dates, wording and
 * confidence from people.json; places.json adds the record crops and the pages.
 * Living people, and anyone the site shows by name and relationship only, never enter the index.
 */
(function () {
    'use strict';
    var FM = window.FM = window.FM || {};

    var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    var SEASON = { early: [1, 3], spring: [4, 6], summer: [7, 9], late: [10, 12] };
    function pad(n, w) { n = String(n); while (n.length < (w || 2)) n = '0' + n; return n; }
    function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
    function monthIndex(s) {
        s = String(s || '').toLowerCase();
        for (var i = 0; i < 12; i++) if (MONTHS[i] === s || MONTHS[i].slice(0, 3) === s || (s === 'sept' && i === 8)) return i + 1;
        return 0;
    }
    function rangeYears(text) {
        var ys = (text.match(/\b(1[0-9]{3}|20[0-9]{2})(?:s)?\b/g) || []).map(function (y) { return parseInt(y, 10); });
        if (ys.length >= 2 && /\bto\b|\band\b|between|,/.test(text)) {
            var lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
            if (new RegExp('\\b' + hi + 's\\b').test(text)) hi += 9;
            return [lo, hi];
        }
        return null;
    }
    function D(s, e, p, a) { return { dateStart: s, dateEnd: e, datePrecision: p, approximate: !!a }; }

    // Mirrors deriveDates() in the Phase 1 tools: the earliest date the record allows, the end of a range, the precision.
    function deriveDates(date, display, qualifier) {
        var text = String(display || '').trim();
        var approx = !!qualifier || /\b(about|probably|likely|circa|c\.)\s/i.test(text);
        var m;
        if (date) {
            date = String(date);
            if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return D(date, date, 'day', approx);
            if (/^\d{4}-\d{2}$/.test(date)) {
                var y = +date.slice(0, 4), mo = +date.slice(5, 7);
                return D(date + '-01', date + '-' + pad(lastDay(y, mo)), 'month', approx);
            }
            if (/^\d{4}$/.test(date)) {
                var yy = +date;
                m = text.match(/\b(early|spring|summer|late)\s+(\d{4})\b/i);
                if (m && +m[2] === yy) {
                    var q = SEASON[m[1].toLowerCase()];
                    return D(yy + '-' + pad(q[0]) + '-01', yy + '-' + pad(q[1]) + '-' + pad(lastDay(yy, q[1])), 'quarter', approx);
                }
                var r = rangeYears(text);
                if (r && r[0] <= yy && yy <= r[1] && r[0] !== r[1]) return D(r[0] + '-01-01', r[1] + '-12-31', 'range', approx);
                return D(yy + '-01-01', yy + '-12-31', 'year', approx);
            }
        }
        return deriveFromText(text, approx);
    }
    function deriveFromText(t, approx) {
        t = String(t || '').trim();
        if (!t) return D(null, null, 'unknown', approx);
        approx = approx || /\b(about|probably|likely|circa)\b/i.test(t);
        var days = [], re = /\b(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b/g, m;
        while ((m = re.exec(t))) { var mi = monthIndex(m[2]); if (mi) days.push([+m[1], mi, +m[3]]); }
        if (days.length) {
            var d0 = days[0], start = d0[2] + '-' + pad(d0[1]) + '-' + pad(d0[0]);
            if (days.length > 1 && /\bto\b/.test(t)) {
                var d1 = days[days.length - 1];
                return D(start, d1[2] + '-' + pad(d1[1]) + '-' + pad(d1[0]), 'range', approx);
            }
            return D(start, start, 'day', approx);
        }
        m = t.match(/\b([A-Z][a-z]+)\s+(\d{4})\b/);
        if (m && monthIndex(m[1]) && !/\bto\b/.test(t)) {
            var mo2 = monthIndex(m[1]), y2 = +m[2];
            return D(y2 + '-' + pad(mo2) + '-01', y2 + '-' + pad(mo2) + '-' + pad(lastDay(y2, mo2)), 'month', approx);
        }
        m = t.match(/\b(early|spring|summer|late)\s+(\d{4})\b/i);
        if (m && !/\bto\b/.test(t)) {
            var y3 = +m[2], q3 = SEASON[m[1].toLowerCase()];
            return D(y3 + '-' + pad(q3[0]) + '-01', y3 + '-' + pad(q3[1]) + '-' + pad(lastDay(y3, q3[1])), 'quarter', approx);
        }
        var r2 = rangeYears(t);
        if (r2) return D(r2[0] + '-01-01', r2[1] + '-12-31', /^(the\s+)?\d{4}s$/.test(t) ? 'decade' : 'range', approx);
        m = t.match(/\b(\d{3})0s\b/);
        if (m) { var y4 = +m[1] * 10; return D(y4 + '-01-01', (y4 + 9) + '-12-31', 'decade', approx); }
        m = t.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
        if (m) return D(m[1] + '-01-01', m[1] + '-12-31', 'year', approx);
        return D(null, null, 'unknown', approx);
    }

    function factKind(ref) { var k = ref.split('.').slice(1).join('.'); return k.replace(/\[\d+\]$/, ''); }
    function getFact(people, ref) {
        var parts = ref.split('.'), p = people[parts[0]];
        if (!p) return null;
        var path = parts.slice(1).join('.'), obj = p;
        var toks = path.match(/[^.\[\]]+|\[\d+\]/g) || [];
        for (var i = 0; i < toks.length; i++) {
            if (obj == null) return null;
            obj = toks[i].charAt(0) === '[' ? obj[+toks[i].slice(1, -1)] : obj[toks[i]];
        }
        return obj;
    }
    function factDates(ref, f) {
        var k = factKind(ref);
        if (k === 'birth' || k === 'death' || k === 'burial') return deriveDates(f.date, f.display || '', f.dateQualifier);
        if (k === 'spouses') return deriveDates(f.marriageDate, f.marriageDisplay || '', null);
        if (k === 'timeline') return deriveDates(f.date, f.label || '', null);
        return deriveDates(null, f.years || '', null);
    }
    function factDisplay(ref, f) {
        var k = factKind(ref);
        if (k === 'birth' || k === 'death' || k === 'burial') return f.display || f.date || '';
        if (k === 'spouses') return f.marriageDisplay || f.marriageDate || '';
        if (k === 'timeline') return f.label || f.date || '';
        return f.years || '';
    }

    var TYPE_ORDER = ['born', 'baptised', 'lived', 'married', 'worked', 'served', 'sailed', 'civil case', 'photographed', 'celebrated', 'died', 'buried'];
    var TYPE_LABEL = {
        'born': 'Born', 'baptised': 'Baptised', 'lived': 'Lived', 'married': 'Married', 'worked': 'Worked', 'served': 'Served',
        'sailed': 'Sailed', 'civil case': 'Court case', 'photographed': 'Photographed', 'celebrated': 'Celebrated', 'died': 'Died', 'buried': 'Buried'
    };
    // The key groups born and baptised, and worked and studied, as one row each.
    var KEY_GROUPS = [
        { id: 'born', label: 'Born or baptised', types: ['born', 'baptised'] },
        { id: 'lived', label: 'Lived', types: ['lived'] },
        { id: 'married', label: 'Married', types: ['married'] },
        { id: 'worked', label: 'Worked or studied', types: ['worked'] },
        { id: 'served', label: 'Served', types: ['served'] },
        { id: 'sailed', label: 'Sailed', types: ['sailed'] },
        { id: 'civil case', label: 'Court case', types: ['civil case'] },
        { id: 'photographed', label: 'Photographed', types: ['photographed'] },
        { id: 'celebrated', label: 'Celebrated', types: ['celebrated'] },
        { id: 'died', label: 'Died', types: ['died'] },
        { id: 'buried', label: 'Buried', types: ['buried'] }
    ];
    function keyGroupOf(type) { for (var i = 0; i < KEY_GROUPS.length; i++) if (KEY_GROUPS[i].types.indexOf(type) >= 0) return KEY_GROUPS[i].id; return type; }

    var BRANCHES = [
        { id: 'ron-pat', label: 'Ron and Pat', pages: ['ron-egypt.html', 'wedding.html'] },
        { id: 'falcke', label: 'Falcke and FitzMaurice', pages: ['falcke.html'] },
        { id: 'reg-sisters', label: "Reg's brother and sisters", pages: ['reg-sisters.html'] },
        { id: 'bennett', label: 'Bennett of Bodmin', pages: ['bennett.html'] },
        { id: 'andrews', label: 'Andrews, Stacey, Walter', pages: ['andrews-roots.html'] },
        { id: 'cousins', label: 'Cousins and Auntie May', pages: ['cousins.html'] },
        { id: 'orkney', label: 'The Hamiltons and the Earls of Orkney (no proven link)', pages: [] }
    ];

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

    function load(base) {
        base = base || '';
        function get(u) { return fetch(base + u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); }); }
        return Promise.all([get('data/people.json'), get('data/places.json'), get('data/sources.json')]).then(function (all) { return build(all[0], all[1], all[2]); });
    }

    function build(peopleDoc, placesDoc, sourcesDoc) {
        var people = {}, living = {}, orkney = {}, placeholder = {}, nameOnly = {};
        peopleDoc.people.forEach(function (p) {
            people[p.id] = p;
            if (p.isLiving) living[p.id] = true;
            if (p.region === 'orkney') orkney[p.id] = true;
            if (p.placeholder) placeholder[p.id] = true;
        });
        var sources = {}; sourcesDoc.sources.forEach(function (s) { sources[s.id] = s; });
        var places = {}; placesDoc.places.forEach(function (p) { places[p.id] = p; });
        function visible(pid) { return pid && people[pid] && !living[pid] && !nameOnly[pid]; }

        // names of living people, for keeping them out of borrowed sentences
        var livingNames = [];
        Object.keys(living).forEach(function (id) {
            var p = people[id];
            livingNames.push(p.displayName);
            if (p.surname && p.givenNames) livingNames.push(p.givenNames.split(' ')[0] + ' ' + p.surname);
            String(p.givenNames || '').split(' ').forEach(function (g) { if (g.length > 2) livingNames.push(g + ' ' + (p.surname || '')); });
            (p.nameVariants || []).forEach(function (v) { if (v.name) livingNames.push(v.name); });
        });
        // a name matches with or without middle names or initials ("Christina M. Knight" matches "Christina Knight")
        var reEsc = function (t) { return t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
        var livingRe = livingNames.length ? new RegExp(livingNames.filter(Boolean).map(function (n) {
            var w = n.trim().split(/\s+/);
            if (w.length < 2) return '\\b' + reEsc(w[0]) + '\\b';
            return '\\b' + w.slice(0, -1).map(reEsc).join('\\s+') + '(?:\\s+[A-Z][a-z]*\\.?)*\\s+' + reEsc(w[w.length - 1]) + '\\b';
        }).join('|'), 'i') : null;
        function namesLiving(text) { return livingRe ? livingRe.test(text || '') : false; }

        // ---- events
        var events = [], byId = {}, byFactRef = {};
        function add(ev) {
            if (byId[ev.id]) return;
            ev.personIds = (ev.personIds || []).filter(visible);
            if (!ev.personIds.length && ev.type !== 'photographed') return;
            ev.group = keyGroupOf(ev.type);
            ev.orkney = !!(ev.personIds.length && ev.personIds.every(function (id) { return orkney[id]; })) || !!(places[ev.placeId] && places[ev.placeId].noProvenLink);
            events.push(ev); byId[ev.id] = ev;
            (ev.factRefs || []).forEach(function (r) { byFactRef[r] = ev; });
        }

        placesDoc.places.forEach(function (pl) {
            (pl.events || []).forEach(function (e) {
                var ev = {
                    id: e.id, placeId: pl.id, type: e.type, personIds: (e.personIds || []).slice(),
                    date: e.date, dateStart: e.dateStart, dateEnd: e.dateEnd, datePrecision: e.datePrecision, approximate: !!e.approximate,
                    factRef: e.factRef || '', factRefs: [], recordCrops: e.recordCrops || [], pages: e.pages || [],
                    sourceIds: (e.sourceIds || []).slice(), confidence: e.confidence, familyStatement: !!e.familyStatement,
                    summary: e.summary || '', voyageId: e.voyageId || null, voyageEnd: e.voyageEnd || null, note: e.note || ''
                };
                if (e.factRef && !e.voyageId) {
                    // the fact in people.json is the truth
                    var refs = [e.factRef].concat(e.alsoFactRefs || []);
                    var f0 = getFact(people, e.factRef);
                    if (!f0 || (f0.placeId && f0.placeId !== pl.id && factKind(e.factRef) !== 'timeline')) return; // moved or gone: the people.json fact is built below
                    var d = factDates(e.factRef, f0);
                    ev.dateStart = d.dateStart; ev.dateEnd = d.dateEnd; ev.datePrecision = d.datePrecision; ev.approximate = d.approximate;
                    ev.date = factDisplay(e.factRef, f0);
                    ev.confidence = f0.confidence || ev.confidence;
                    ev.familyStatement = f0.confidence === 'family tradition';
                    ev.factRefs = refs;
                    ev.fact = f0;
                }
                add(ev);
            });
        });

        // any placed fact in people.json not yet in places.json (new research shows up automatically)
        peopleDoc.people.forEach(function (p) {
            if (!visible(p.id)) return;
            function consider(ref, f, type) {
                if (!f || !f.placeId || byFactRef[ref] || !places[f.placeId]) return;
                var d = factDates(ref, f);
                add({ id: ref.replace(/[.\[\]]+/g, '-').replace(/-+$/, ''), placeId: f.placeId, type: type, personIds: [p.id].concat(type === 'married' && f.id ? [f.id] : []),
                      date: factDisplay(ref, f), dateStart: d.dateStart, dateEnd: d.dateEnd, datePrecision: d.datePrecision, approximate: d.approximate,
                      factRef: ref, factRefs: [ref], recordCrops: f.recordCrops || [], pages: [], sourceIds: (f.sourceIds || []).slice(),
                      confidence: f.confidence || p.confidence, familyStatement: f.confidence === 'family tradition', summary: '', fact: f });
            }
            if (p.birth) consider(p.id + '.birth', p.birth, places[p.birth.placeId] && places[p.birth.placeId].kind === 'church' && /baptised/i.test(p.birth.display || '') ? 'baptised' : 'born');
            if (p.death && !(p.burial && /^buried/i.test(p.death.display || ''))) consider(p.id + '.death', p.death, 'died');
            if (p.burial) consider(p.id + '.burial', p.burial, 'buried');
            (p.residences || []).forEach(function (f, i) { consider(p.id + '.residences[' + i + ']', f, 'lived'); });
            (p.occupations || []).forEach(function (f, i) { consider(p.id + '.occupations[' + i + ']', f, /Aircraftman|Maintenance Unit|Army|Royal Air Force|Corps/.test((f.title || '') + ' ' + (f.employer || '')) ? 'served' : 'worked'); });
            (p.spouses || []).forEach(function (f, i) {
                var ref = p.id + '.spouses[' + i + ']';
                var other = people[f.id], twin = null;
                if (other) (other.spouses || []).forEach(function (g, j) { if (g.id === p.id && byFactRef[f.id + '.spouses[' + j + ']']) twin = true; });
                if (!twin) consider(ref, f, 'married');
            });
        });

        // voyages (people.json is the truth for the voyage; places.json carries its two ends)
        var voyages = {};
        peopleDoc.people.forEach(function (p) {
            if (!visible(p.id)) return;
            (p.voyages || []).forEach(function (v) {
                if (!voyages[v.id]) voyages[v.id] = { id: v.id, ship: v.ship, from: v.from, to: v.to, fromPlaceId: v.fromPlaceId, toPlaceId: v.toPlaceId,
                    departureDate: v.departureDate, arrivalDate: v.arrivalDate, display: v.display, sourceIds: v.sourceIds, confidence: v.confidence,
                    recordCrops: v.recordCrops || [], personIds: [] };
                if (voyages[v.id].personIds.indexOf(p.id) < 0) voyages[v.id].personIds.push(p.id);
            });
        });
        events.forEach(function (e) {
            if (e.voyageId && voyages[e.voyageId]) { e.voyage = voyages[e.voyageId]; e.personIds = voyages[e.voyageId].personIds.slice(); }
        });

        // timeline prose: borrow the sentence the tree already has for the same fact, unless it names someone living
        events.forEach(function (e) {
            if (e.summary) { if (namesLiving(e.summary)) e.summary = ''; return; }
            e.personIds.forEach(function (pid) {
                if (e.summary) return;
                (people[pid].timeline || []).forEach(function (t) {
                    if (e.summary || !t.event || namesLiving(t.event)) return;
                    if (t.placeId && t.placeId !== e.placeId) return;
                    var d = deriveDates(t.date, t.label || '', null);
                    if (!d.dateStart || !e.dateStart) return;
                    var sameDay = d.dateStart === e.dateStart && e.datePrecision === 'day';
                    var overlap = d.dateStart <= e.dateEnd && d.dateEnd >= e.dateStart;
                    var typeFits = (/^Born|Baptised/.test(t.event) && (e.type === 'born' || e.type === 'baptised')) ||
                                   (/Marries|married/i.test(t.event) && e.type === 'married') ||
                                   (/Dies|Killed|dies/i.test(t.event) && e.type === 'died') ||
                                   (/Sails|Lands/.test(t.event) && e.type === 'sailed') ||
                                   (t.mapEvent && t.mapEvent === e.type) ||
                                   (e.type === 'lived' && !/Born|Marries|Dies|Killed|Baptised|Sails|Lands/.test(t.event)) ||
                                   (e.type === 'worked' && /clerk|engineer|apprentice|labourer|worker|maid/i.test(t.event));
                    if ((sameDay || overlap) && typeFits && t.placeId === e.placeId) e.summary = t.event;
                });
            });
        });
        events.forEach(function (e) { if (!e.summary) e.summary = sentenceFor(e, people, places); });

        // ---- unplaced facts (for the tray and for Timeline beats with "Place not known")
        var unplaced = [];
        peopleDoc.people.forEach(function (p) {
            if (!visible(p.id) || orkney[p.id] || placeholder[p.id]) return;
            function un(ref, f, type, what) {
                if (!f || f.placeId) return;
                var disp = factDisplay(ref, f);
                if (!disp && !f.date) return;
                var d = factDates(ref, f);
                unplaced.push({ id: 'u-' + ref.replace(/[.\[\]]+/g, '-').replace(/-+$/, ''), placeId: null, type: type, personIds: [p.id], date: disp,
                    dateStart: d.dateStart, dateEnd: d.dateEnd, datePrecision: d.datePrecision, approximate: d.approximate, factRef: ref, factRefs: [ref],
                    recordCrops: [], pages: [], sourceIds: (f.sourceIds || []).slice(), confidence: f.confidence || p.confidence,
                    familyStatement: f.confidence === 'family tradition', unplaced: true, group: keyGroupOf(type),
                    summary: sentenceFor({ type: type, personIds: [p.id], date: disp, fact: f, factRef: ref }, people, places),
                    what: what });
            }
            if (p.birth) un(p.id + '.birth', p.birth, 'born', 'A birth or baptism record that names the place.');
            if (p.death) un(p.id + '.death', p.death, 'died', 'The death certificate or a burial record.');
            (p.occupations || []).forEach(function (f, i) { if (f.years) un(p.id + '.occupations[' + i + ']', f, 'worked', 'A census or register entry that names the place of work.'); });
            (p.spouses || []).forEach(function (f, i) { if (f.marriageDisplay || f.marriageDate) un(p.id + '.spouses[' + i + ']', f, 'married', 'The marriage entry or certificate.'); });
        });
        unplaced.forEach(function (u) { byId[u.id] = u; });

        // ---- place summaries
        var placeEvents = {};
        events.forEach(function (e) { (placeEvents[e.placeId] = placeEvents[e.placeId] || []).push(e); });
        Object.keys(placeEvents).forEach(function (k) { placeEvents[k].sort(byDate); });

        // ---- people on the map
        var personEvents = {};
        events.concat(unplaced).forEach(function (e) { e.personIds.forEach(function (pid) { (personEvents[pid] = personEvents[pid] || []).push(e); }); });
        Object.keys(personEvents).forEach(function (k) { personEvents[k].sort(byDate); });

        var branchOf = {};
        peopleDoc.people.forEach(function (p) {
            if (!visible(p.id) || placeholder[p.id]) return;
            if (orkney[p.id]) { branchOf[p.id] = 'orkney'; return; }
            var pages = (p.relatedPages || []).map(function (r) { return (typeof r === 'string' ? r : (r.url || r.href || '')).split('#')[0]; });
            var b = null;
            if (p.id === 'ronald-andrews' || p.id === 'patricia-andrews') b = 'ron-pat';
            for (var i = 1; i < BRANCHES.length - 1 && !b; i++) if (pages.some(function (pg) { return BRANCHES[i].pages.indexOf(pg) >= 0; })) b = BRANCHES[i].id;
            branchOf[p.id] = b || 'ron-pat';
        });

        return {
            people: people, places: places, sources: sources, events: events, unplaced: unplaced, byId: byId, voyages: voyages,
            placeEvents: placeEvents, personEvents: personEvents, branchOf: branchOf, living: living, orkney: orkney,
            meta: { people: peopleDoc.meta, places: placesDoc.meta }, namesLiving: namesLiving, visible: visible
        };
    }

    function byDate(a, b) {
        var x = a.dateStart || '9999', y = b.dateStart || '9999';
        if (x !== y) return x < y ? -1 : 1;
        var tx = TYPE_ORDER.indexOf(a.type), ty = TYPE_ORDER.indexOf(b.type);
        if (tx !== ty) return tx - ty;
        return a.id < b.id ? -1 : 1;
    }

    // One plain sentence from a structured fact, keeping the record's own wording for the date.
    function sentenceFor(e, people, places) {
        var f = e.fact || {}, pl = places[e.placeId] || {};
        var has = !!pl.name;
        var where = placePhrase(pl, e.type);
        var who = (people[e.personIds[0]] || {}).givenNames || '';
        var d = e.date || '';
        var ds = has ? stripPlace(d, pl) : d;
        var district = pl.kind === 'registration district';
        switch (e.type) {
            case 'born':
                if (district) return finish('Birth registered in the ' + districtName(pl), ds);
                if (!has) return finish('Born ' + ds.replace(/,\s*born\s+/i, ', '));
                return finish('Born ' + (ds ? ds + ', ' : '') + where);
            case 'baptised': return finish('Baptised ' + where, ds.replace(/^baptised\s+/i, ''));
            case 'died':
                if (district) return finish('Death registered in the ' + districtName(pl), ds);
                if (!has) return finish('Died ' + ds);
                return finish(ds ? 'Died ' + ds + ', ' + where : 'Died ' + where);
            case 'buried': return f.display ? finish('Buried: ' + f.display) : finish('Buried ' + where);
            case 'married':
                var names = e.personIds.map(function (id) { return (people[id] || {}).givenNames; }).filter(Boolean);
                var lead = names.length > 1 ? names.join(' and ') + ' married' : (who ? who + ' married' : 'Married');
                return district ? finish(lead + ', registered in the ' + districtName(pl), ds) : finish(lead + (where ? ' ' + where : ''), d);
            case 'lived': return finish('Lived' + (f.address ? ' at ' + f.address : (where ? ' ' + where : '')), d);
            case 'worked': case 'served': return finish(f.title ? f.title : (e.type === 'served' ? 'Served' : 'Worked'), f.employer, pl.name, d);
            default: return finish(pl.name, d);
        }
    }
    // joins the non-empty parts with commas and ends the sentence once
    function finish() {
        var s = Array.prototype.filter.call(arguments, function (x) { return x != null && String(x).trim(); }).map(function (x) { return String(x).trim(); }).join(', ');
        s = s.replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,(\s*,)+/g, ',').replace(/[,\s]+$/, '');
        if (!s) return '';
        s = s.charAt(0).toUpperCase() + s.slice(1);
        return /[.!?)]$/.test(s) && !/\(family\)$/.test(s) ? s : s + '.';
    }
    function districtName(pl) { return String(pl.historicName || pl.name || '').replace(/\s*registration district$/i, '').replace(/\s*district$/i, '') + ' district'; }
    // keeps the date parts of a recorded date and drops the place words after it
    // ("4 November 1829, St Dunstan's, Stepney" becomes "4 November 1829")
    function stripPlace(d) {
        var segs = String(d || '').split(/,\s*/);
        return segs.filter(function (x, i) { return i === 0 || /\d/.test(x); }).join(', ');
    }
    function placePhrase(pl, type) {
        if (!pl.name) return '';
        if (pl.kind === 'registration district' || pl.kind === 'district') return 'in the ' + districtName(pl);
        if (pl.kind === 'church' || pl.kind === 'cemetery' || pl.kind === 'hospital' || pl.kind === 'venue' || pl.kind === 'studio' || pl.kind === 'workplace' || pl.kind === 'military site') return 'at ' + pl.name;
        if (pl.kind === 'home') return 'at ' + pl.name;
        return 'in ' + pl.name;
    }

    FM.data = {
        load: load, build: build, deriveDates: deriveDates, deriveFromText: deriveFromText, byDate: byDate, esc: esc,
        TYPE_ORDER: TYPE_ORDER, TYPE_LABEL: TYPE_LABEL, KEY_GROUPS: KEY_GROUPS, keyGroupOf: keyGroupOf, BRANCHES: BRANCHES,
        districtName: districtName, getFact: getFact
    };
})();
