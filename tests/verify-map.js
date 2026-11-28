/* Automated checks for the family map (map.html).
 *
 *   node tests/verify-map.js            (needs Playwright with Chromium)
 *   SHOTS=1 node tests/verify-map.js    also writes screenshots to tests/screenshots/
 *
 * Map tiles, Google and the font service are blocked here, so the page runs on its own
 * fallback map. The checks are about the family's data and what the page does with it:
 * place links and sources; the held-back list; dates no more precise
 * than the site; approximate places drawn as dashed pins; the Hamiltons and Earls of Orkney
 * left off (except Cecil); the family filter; Today as the default map; key counts, toggles and
 * person scopes; the peek by hover, keyboard and tap; the mode switcher and mode=tour; the
 * step player with hand-made steps and no Timeline code; Timeline order, playback, keys,
 * ticks, list, markers, scrubbing, filters, voyages, undated and unplaced events and reduced
 * motion; Street View links, the Embed URL and the overlay; URL state; the list view and
 * the WebGL fallback; no page errors; and no em or en dash in any new or changed text file.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const { ROOT, DIST, ENGINE } = require('./site-paths');
const SHOTS = process.env.SHOTS ? path.join(__dirname, 'screenshots') : null;
const BASE_COMMIT = '7639fee';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/json', '.pbf': 'application/x-protobuf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.md': 'text/plain', '.txt': 'text/plain' };
const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
// stands in for Google's Street View page, which the test cannot reach
const SV_STUB = '<!doctype html><title>Street View</title><body style="margin:0;display:grid;place-items:center;height:100vh;background:#3d4a52;color:#fff;font:18px Georgia,serif;text-align:center">Google Street View loads here.<br><small>(A stand-in page: the test cannot reach Google.)</small></body>';

function serve() {
    return new Promise(res => {
        const srv = http.createServer((req, rsp) => {
            let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
            if (p.endsWith('/')) p += 'index.html';
            const f = path.join(DIST, p);
            if (!f.startsWith(DIST) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end('not found'); }
            rsp.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
            fs.createReadStream(f).pipe(rsp);
        });
        srv.listen(0, () => res(srv));
    });
}

const failures = [];
const fail = (m) => { failures.push(m); console.log('  FAIL ' + m); };
const ok = (m) => console.log('  ok   ' + m);
const check = (cond, m, detail) => (cond ? ok(m) : fail(m + (detail ? ': ' + detail : '')));
const section = (t) => console.log('\n' + t);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const sameSet = (a, b) => { const A = new Set(a), B = new Set(b); return A.size === B.size && [...A].every(x => B.has(x)); };
const diff = (a, b) => [...new Set(a)].filter(x => !new Set(b).has(x));

// ------------------------------------------------------------------ the data on disk
const peopleDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/people.json')));
const placesDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/places.json')));
const sourcesDoc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources.json')));
const people = peopleDoc.people, places = placesDoc.places;
const P = Object.fromEntries(people.map(p => [p.id, p]));
const PL = Object.fromEntries(places.map(p => [p.id, p]));
const sid = new Set(sourcesDoc.sources.map(s => s.id));
// PR #3's held-back list: words that would only appear if one of its items had got onto the map
const HELD_BACK_WORDS = ['Evening News', 'Melbourne', 'Wynberg', 'Plumstead'];

const linkIds = (refs) => (refs || []).map(r => (typeof r === 'string' ? r : r.id)).filter(id => P[id]);
function expectScope(id, scope) {
    const out = new Set([id]);
    const p = P[id];
    if (scope === 'spouse') linkIds(p.spouses).forEach(x => out.add(x));
    if (scope === 'family') linkIds(p.parents).concat(linkIds(p.children)).forEach(x => out.add(x));
    if (scope === 'ancestors') { const q = linkIds(p.parents); while (q.length) { const x = q.shift(); if (!out.has(x)) { out.add(x); q.push(...linkIds(P[x].parents)); } } }
    if (scope === 'descendants') { const q = linkIds(p.children); while (q.length) { const x = q.shift(); if (!out.has(x)) { out.add(x); q.push(...linkIds(P[x].children)); } } }
    // living people are included: the map shows whatever the data holds for them
    return [...out];
}

(async () => {
    const srv = await serve();
    const base = 'http://localhost:' + srv.address().port + '/';
    const browser = await chromium.launch({ args: GL_ARGS });
    if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
    const allErrors = [];

    async function open(url, opts = {}) {
        const context = await browser.newContext({
            viewport: opts.viewport || { width: 1440, height: 900 }, deviceScaleFactor: 1,
            reducedMotion: opts.reducedMotion || 'no-preference', isMobile: !!opts.mobile, hasTouch: !!opts.mobile
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', e => errors.push(url + ': ' + e.message));
        page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR|AJAXError|Failed to fetch|NetworkError/i.test(m.text())) errors.push(url + ': ' + m.text()); });
        if (opts.init) await page.addInitScript(opts.init);
        await page.route('**/*', async route => {
            const u = route.request().url();
            if (u.startsWith(base)) {
                // the site settings with a test Embed key and no MapTiler key
                if (opts.embedKey && /\/site-config\.js(\?|$)/.test(u)) { const r = await route.fetch(); return route.fulfill({ response: r, body: (await r.text()) + "\nwindow.FamilySite.map.maptilerKey = ''; window.FamilySite.map.googleEmbedKey = 'TEST-EMBED-KEY';" }); }
                if (opts.noTimeline && /\/map-timeline\.js(\?|$)/.test(u)) return route.fulfill({ contentType: 'text/javascript', body: '/* left out by the test */' });
                return route.continue();
            }
            if (/^https:\/\/www\.google\.com\/maps\/embed\//.test(u)) return route.fulfill({ contentType: 'text/html', body: SV_STUB });
            return route.abort();
        });
        await page.goto(base + url);
        await page.waitForFunction(() => window.FM && FM.ready, null, { timeout: 30000 });
        await page.waitForTimeout(opts.settle || 900);
        const close = async () => { allErrors.push(...errors); await context.close(); };
        return { page, errors, close };
    }
    const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
    // every place that has a marker on screen (a cluster counts for all of its places)
    const markerPlaces = (page) => page.evaluate(() => [].concat(...[].map.call(document.querySelectorAll('.mk-wrap'), el => (el.dataset.places || '').split('|').filter(Boolean))));

    // ================================================================ data
    section('Data: places, sources and links');
    const refs = [];
    const walk = (o, where) => {
        if (Array.isArray(o)) o.forEach(x => walk(x, where));
        else if (o && typeof o === 'object') for (const k of Object.keys(o)) { if (/^(placeId|fromPlaceId|toPlaceId)$/.test(k) && o[k]) refs.push([o[k], where + '.' + k]); walk(o[k], where); }
    };
    people.forEach(p => walk(p, p.id));
    const missing = refs.filter(r => !PL[r[0]]);
    check(!missing.length, `every placeId in people.json exists in places.json (${refs.length} links)`, missing.slice(0, 5).map(r => r.join(' at ')).join('; '));
    const referenced = new Set(refs.map(r => r[0]));
    const orphans = places.filter(p => !(p.events || []).length && !referenced.has(p.id));
    check(!orphans.length, `no place is orphaned (${places.length} places)`, orphans.map(p => p.id).join(', '));
    const addedPlaces = ['st-georges-cathedral-cape-town','auleta-three-anchor-bay','7-bertram-road-sea-point','17-berkley-street-gardens','1st-avenue-bellville','parish-of-woodstock','somerset-hospital-cape-town','port-elizabeth','9a-st-marks-avenue-easton','1-leat-walk-peverell','18-saltoun-road','westfield-house-brixton','3-salisbury-road-leicester','205-highfield-feltham','fore-street-bodmin','thombrake-hampton-hill','44-new-street-stepney','140a-clapham-road','brompton-london','ealing-isolation-hospital'];
    const missingAdded = addedPlaces.filter(id => !PL[id] || PL[id].lat == null || !(PL[id].coordinateSourceIds || []).length);
    check(!missingAdded.length, `the ledger places are on the map with coordinates and a source (${addedPlaces.length})`, missingAdded.join(', '));
    const scott = people.find(p => p.id === 'edward-scott-fitzmaurice');
    const yallop = people.find(p => p.id === 'eileen-alice-yallop');
    check(scott && scott.isLiving === false && yallop && yallop.isLiving === false, 'Edward Scott and Eileen Alice are on the tree as people who have died');
    const badSrc = [];
    const needSrc = (ids, where, required) => { if (required && !(ids || []).length) badSrc.push(where + ' has no source'); (ids || []).forEach(i => { if (!sid.has(i)) badSrc.push(where + ' cites unknown source ' + i); }); };
    let nEvents = 0, nImages = 0;
    for (const p of places) {
        needSrc(p.coordinateSourceIds, p.id + ' coordinates', p.lat != null);
        needSrc(p.blurbSourceIds, p.id + ' blurb', !!p.blurb);
        for (const e of p.events || []) { nEvents++; needSrc(e.sourceIds, e.id, !e.familyStatement && e.confidence !== 'family tradition'); }
        for (const im of p.images || []) {
            nImages++;
            needSrc([im.sourceId].filter(Boolean), p.id + ' image ' + im.file, true);
            if (!String(im.credit || '').trim() || !String(im.licence || '').trim()) badSrc.push(p.id + ' image ' + im.file + ' lacks a credit or a licence');
        }
    }
    check(!badSrc.length, `every place, event and image is sourced, and every image has a credit and a licence (${nEvents} events, ${nImages} images)`, badSrc.slice(0, 6).join('; '));

    section('Data: the held-back list and dates');
    const placeText = places.map(p => [p.id, [p.name, p.historicName, p.blurb, p.todayNote, p.significance, p.address, (p.images || []).map(i => i.caption).join(' '), (p.events || []).map(e => (e.summary || '') + ' ' + (e.date || '')).join(' ')].join(' ')]);
    const held = [];
    placeText.forEach(([id, t]) => HELD_BACK_WORDS.forEach(w => { if (t.includes(w)) held.push(id + ': ' + w); }));
    for (const p of places) for (const e of p.events || []) {
        (e.recordCrops || []).forEach(c => {
            if (/nestles/i.test(c) && /19(49|5\d|6[0-5])/.test(c)) held.push(e.id + ': a 1949 to 1965 Nestles Avenue register crop');
            if (/army/i.test(c) && /(p|page)[-_ ]?0?[69]\b/i.test(c)) held.push(e.id + ': army file page 6 or 9');
        });
        (e.sourceIds || []).forEach(s => { if (/evening-news/i.test(s)) held.push(e.id + ': Evening News cutting'); });
        if (/eliza/i.test(e.id) && /1806/.test(String(e.dateStart || ''))) held.push(e.id + ': the 1806 St Philip baptism');
    }
    check(!held.length, "nothing on PR #3's held-back list is on the map", held.join('; '));

    // ================================================================ Explore
    section('Explore: markers, key, scopes and peek');
    let s = await open('map.html');
    let page = s.page;
    const info = await page.evaluate(() => {
        const D = FM.DATA, rank = { day: 4, month: 3, quarter: 2, year: 1, range: 1, decade: 0.5, unknown: 0 };
        const tooPrecise = [];
        D.events.concat(D.unplaced).forEach(e => {
            if (!e.factRef) return;
            let f = FM.data.getFact(D.people, e.factRef);
            if (Array.isArray(f) && e.voyageId) f = f.filter(v => v.id === e.voyageId)[0]; // a voyage end points at its person's voyages
            if (!f || typeof f !== 'object' || Array.isArray(f)) return;
            // the date as the site records it for that kind of fact
            const k = e.factRef.replace(/^[^.]+\./, '').replace(/\[\d+\]$/, '');
            const d = /^(birth|death|burial)$/.test(k) ? FM.data.deriveDates(f.date, f.display || '', f.dateQualifier)
                : k === 'spouses' ? FM.data.deriveDates(f.marriageDate, f.marriageDisplay || '', null)
                : k === 'timeline' ? FM.data.deriveDates(f.date, f.label || '', null)
                : k === 'voyages' ? FM.data.deriveDates(e.voyageEnd === 'arrival' ? f.arrivalDate : (f.departureDate || f.arrivalDate), '', null)
                : FM.data.deriveDates(null, f.years || '', null);
            if ((rank[e.datePrecision] || 0) > (rank[d.datePrecision] || 0) + 1e-9) tooPrecise.push(e.id + ' ' + e.datePrecision + ' > ' + d.datePrecision);
        });
        const hw = D.events.concat(D.unplaced).filter(e => e.factRef === 'herbert-andrews.birth')[0];
        return {
            events: D.events.length, unplaced: D.unplaced.length, tooPrecise,
            herbert: hw ? [hw.datePrecision, hw.dateStart, FM.util.dateLabel(hw)] : null,
            text: D.events.concat(D.unplaced).map(e => e.summary + ' ' + (e.date || '') + ' ' + FM.util.dateLabel(e)).join('\n')
        };
    });
    check(!info.tooPrecise.length, `no date on the map is more precise than the site's own record (${info.events} placed events, ${info.unplaced} not yet placed)`, info.tooPrecise.slice(0, 5).join('; '));
    check(info.herbert && info.herbert[0] === 'day' && info.herbert[1] === '1916-07-17' && /17 July 1916/.test(info.herbert[2]), 'Herbert William was born on 17 July 1916', JSON.stringify(info.herbert));
    const textHits = HELD_BACK_WORDS.filter(n => info.text.includes(n));
    check(!textHits.length, 'no event sentence names anything held back', textHits.join(', '));

    // the mode switcher and the default state
    const modes = await page.$$eval('#modeSwitch [data-mode]', els => els.map(e => e.textContent.trim()));
    check(JSON.stringify(modes) === JSON.stringify(['Explore', 'Timeline']), 'the mode switcher shows only Explore and Timeline', modes.join(', '));
    const orkneyIds = people.filter(p => p.region === 'orkney' && p.id !== 'cecil-8th').map(p => p.id);
    const ork = await page.evaluate((ids) => ({
        events: FM.DATA.events.concat(FM.DATA.unplaced).filter(e => e.personIds.some(id => ids.indexOf(id) >= 0)).length,
        list: Object.keys(FM.DATA.branchOf).filter(id => ids.indexOf(id) >= 0).length,
        cecil: (FM.DATA.personEvents['cecil-8th'] || []).length, cecilBadge: FM.DATA.events.filter(e => e.personIds.indexOf('cecil-8th') >= 0).every(e => e.noProvenLink),
        toggle: !!document.getElementById('orkneyToggle'), style: FM.state.style
    }), orkneyIds);
    check(!ork.events && !ork.list && !ork.toggle, 'the Hamiltons and the Earls of Orkney are not on the map, in the list or in the filters', JSON.stringify(ork));
    check(ork.cecil > 0 && ork.cecilBadge, "Cecil O'Bryen FitzMaurice stays on the map, marked as no proven link", JSON.stringify(ork));
    check(ork.style === 'today', 'the Today map is the default', ork.style);
    const midEngland = await page.evaluate(async () => {
        FM.map.jumpTo({ center: [-1.8, 52.5], zoom: 6.2 });
        FM.refresh();
        await new Promise(r => setTimeout(r, 200));
        return { n: document.querySelectorAll('.mk-wrap').length, z: Math.round(FM.map.getZoom() * 10) / 10 };
    });
    check(midEngland.n >= 6, 'at a mid zoom over England the places are not one cluster', JSON.stringify(midEngland));
    // site.config.json holds the site's MapTiler key, so this check empties it for one click and puts it back. The assertion is the same: with no key, Then stays on the current map and says why.
    await page.evaluate(() => { window.__fmMaptiler = window.FamilySite.map.maptilerKey; window.FamilySite.map.maptilerKey = ''; });
    await page.click('#styleSwitch [data-style="then"]');
    await page.waitForTimeout(400);
    const thenNoKey = await page.evaluate(() => ({ style: FM.state.style, pressed: document.querySelector('#styleSwitch [aria-checked="true"]').dataset.style, note: document.getElementById('note').innerText }));
    await page.evaluate(() => { window.FamilySite.map.maptilerKey = window.__fmMaptiler; });
    check(thenNoKey.style === 'today' && thenNoKey.pressed === 'today' && /MapTiler/.test(thenNoKey.note), 'Then without a key explains and stays on the current map', JSON.stringify(thenNoKey));
    const conf = await page.evaluate(() => ({ key: /Confidence|Probable|Confirmed/.test(document.getElementById('confKey').innerText), sat: !!document.getElementById('satBtn'), peg: !!document.getElementById('pegman') }));
    check(!conf.key && conf.sat && conf.peg, 'no confidence legend; the Satellite toggle and the Street View figure are there', JSON.stringify(conf));
    await page.click('#satBtn'); await page.waitForTimeout(300);
    const sat = await page.evaluate(() => ({ on: FM.state.sat, layer: !!FM.map.getLayer('fm-sat'), url: location.search }));
    await page.click('#satBtn'); await page.waitForTimeout(200);
    check(sat.on && sat.layer && /sat=1/.test(sat.url) && !(await page.evaluate(() => FM.map.getLayer('fm-sat'))), 'Satellite adds the aerial layer under the labels, and takes it away again', JSON.stringify(sat));
    let mp = await markerPlaces(page);
    // every place with a visible event has a marker; key counts match the index
    const expectedPlaces = await page.evaluate(() => Object.keys(FM.DATA.placeEvents).filter(pid => FM.DATA.placeEvents[pid].some(e => FM.filters.eventPasses(e))));
    check(sameSet(mp, expectedPlaces), `every place with a visible event has a marker (${expectedPlaces.length} places)`, 'missing ' + diff(expectedPlaces, mp).join(', ') + ' extra ' + diff(mp, expectedPlaces).join(', '));
    const keyCounts = await page.evaluate(() => {
        const rows = [].map.call(document.querySelectorAll('#types [data-group]'), b => [b.dataset.group, +b.querySelector('.kt-n').textContent]);
        const want = {}; FM.DATA.events.forEach(e => { if (!e.orkney) want[e.group] = (want[e.group] || 0) + 1; });
        return { rows, want };
    });
    const badCounts = keyCounts.rows.filter(([g, n]) => keyCounts.want[g] !== n).map(([g, n]) => `${g} shows ${n}, data has ${keyCounts.want[g]}`);
    check(keyCounts.rows.length && !badCounts.length, `the key's counts match the data (${keyCounts.rows.length} kinds of event)`, badCounts.join('; '));
    // per type: with only one kind switched on, the markers are exactly the places with that kind of event
    const perType = await page.evaluate(() => {
        const out = [];
        FM.data.KEY_GROUPS.forEach(g => {
            if (!FM.DATA.events.some(e => e.group === g.id && !e.orkney)) return;
            FM.state.hidden = {}; FM.data.KEY_GROUPS.forEach(o => { if (o.id !== g.id) FM.state.hidden[o.id] = true; });
            FM.refresh();
            const shown = [].concat(...[].map.call(document.querySelectorAll('.mk-wrap'), el => el.dataset.places.split('|')));
            const want = Object.keys(FM.DATA.placeEvents).filter(pid => FM.DATA.placeEvents[pid].some(e => e.group === g.id && !e.orkney));
            const a = new Set(shown), b = new Set(want);
            if (a.size !== b.size || [...a].some(x => !b.has(x))) out.push(g.id + ': ' + a.size + ' shown, ' + b.size + ' expected');
        });
        FM.state.hidden = {}; FM.refresh();
        return out;
    });
    check(!perType.length, 'each kind of event on its own shows exactly its places', perType.join('; '));
    // a key toggle by click
    await page.click('#types [data-group="died"]');
    await page.waitForTimeout(400);
    const afterToggle = await page.evaluate(() => ({ pressed: document.querySelector('#types [data-group="died"]').getAttribute('aria-pressed'), hidden: !!FM.state.hidden.died, url: location.search }));
    mp = await markerPlaces(page);
    const onlyDied = Object.keys(PL).filter(pid => (PL[pid].events || []).length && (PL[pid].events || []).every(e => e.type === 'died'));
    check(afterToggle.pressed === 'false' && afterToggle.hidden && /hide=died/.test(afterToggle.url) && !mp.some(id => onlyDied.includes(id)), 'clicking a key row hides that kind of place and records it in the URL', JSON.stringify(afterToggle));
    await page.click('#types [data-group="died"]');
    await page.waitForTimeout(300);

    // registration districts and other approximate places are dashed pins, never exact ones
    const districtPins = await page.evaluate(async () => {
        const out = [];
        const ids = Object.keys(FM.DATA.places).filter(id => FM.DATA.places[id].kind === 'registration district' && (FM.DATA.placeEvents[id] || []).length);
        for (const id of ids) {
            const pl = FM.DATA.places[id];
            if (pl.drawAs === 'pin') out.push(id + ' drawAs pin');
            FM.map.jumpTo({ center: [pl.lng, pl.lat], zoom: 13 });
            FM.refresh();
            await new Promise(r => setTimeout(r, 60));
            const el = [].filter.call(document.querySelectorAll('.mk-wrap'), m => m.dataset.places === id)[0];
            if (el && !el.classList.contains('mk--approx')) out.push(id + ' drawn as ' + el.className);
        }
        FM.frameEngland(0);
        return { out, n: ids.length };
    });
    check(!districtPins.out.length, `registration districts are drawn as approximate (dashed) pins, never exact ones (${districtPins.n} districts)`, districtPins.out.join('; '));

    // no circle by default: an approximate place's area appears only while it is in focus
    const areas = await page.evaluate(async () => {
        const before = (FM.lastData['fm-areas'] || { features: [] }).features.length + (FM.lastData['fm-halos'] || { features: [] }).features.length;
        const pl = FM.DATA.places['west-ham-registration-district'];
        FM.map.jumpTo({ center: [pl.lng, pl.lat], zoom: 12 }); await new Promise(r => setTimeout(r, 500));
        const el = [].filter.call(document.querySelectorAll('.mk-wrap'), m => m.dataset.places === 'west-ham-registration-district')[0];
        el.focus(); await new Promise(r => setTimeout(r, 300));
        const during = FM.lastData['fm-areas'].features.map(f => f.properties.id);
        const pk = document.getElementById('peek').innerText;
        el.blur(); document.body.focus(); await new Promise(r => setTimeout(r, 500));
        return { before, during, pk, labels: FM.map.getContainer().classList.contains('fm-labels') ? 'on at z12' : 'off at z12' };
    });
    check(areas.before === 0 && areas.during.join() === 'west-ham-registration-district' && /Somewhere in the West Ham/.test(areas.pk), 'no area circles are drawn until an approximate place is in focus, and its peek says it is somewhere in the area', JSON.stringify(areas).slice(0, 220));
    // the peek says who and what, not initials
    check(/Cousins' (birth|death|home)|Cousins'/.test(areas.pk) && !/\b[A-Z]{2}\b\s*\b[A-Z]{2}\b/.test(areas.pk.split('\n').slice(0, 3).join(' ')), 'the peek names who and what (for example "Annie Cousins\' death")', areas.pk.split('\n').slice(0, 4).join(' | '));
    await page.evaluate(() => FM.frameEngland(0));

    // the family filter: Ron's family, back to his parents
    await page.selectOption('#famSel', 'ron');
    await page.selectOption('#genSel', '1');
    await page.waitForTimeout(500);
    const fam = await page.evaluate(() => {
        const set = FM.familySet(), bad = [];
        [].forEach.call(document.querySelectorAll('.mk-wrap'), el => el.dataset.places.split('|').forEach(pid => {
            if (!FM.DATA.placeEvents[pid].some(e => e.personIds.some(id => set[id]))) bad.push(pid);
        }));
        return { set: Object.keys(set).sort(), bad, url: location.search, chip: !document.getElementById('famChip').hidden };
    });
    const wantFam = ['ronald-andrews'].concat(linkIds(P['ronald-andrews'].parents)).sort();
    check(JSON.stringify(fam.set) === JSON.stringify(wantFam) && !fam.bad.length && /family=ron/.test(fam.url) && /gen=1/.test(fam.url) && fam.chip, "choosing Ron's family, back to his parents, shows only their places", JSON.stringify(fam).slice(0, 240));
    await page.click('#sibChk');
    await page.waitForTimeout(300);
    const sib = await page.evaluate(() => Object.keys(FM.familySet()));
    const wantSib = new Set(wantFam); linkIds(P['ronald-andrews'].parents).forEach(pid => linkIds(P[pid].children).forEach(c => wantSib.add(c)));
    linkIds(P['ronald-andrews'].parents).forEach(pid => linkIds(P[pid].parents).forEach(gp => linkIds(P[gp].children).forEach(c => wantSib.add(c))));
    check(sib.length >= wantFam.length && sib.every(id => wantSib.has(id)) && linkIds(P['ronald-andrews'].parents).flatMap(pid => linkIds(P[pid].children)).every(c => sib.includes(c)), 'adding brothers and sisters brings in Ron\'s siblings', sib.join(','));
    await page.click('#famChip');
    await page.waitForTimeout(400);
    check(await page.evaluate(() => !FM.familySet() && !/family=/.test(location.search)), 'the family chip clears the family filter');

    // person scopes
    const scopeCases = [['ronald-andrews', 'spouse'], ['ronald-andrews', 'family'], ['herbert-andrews', 'family'], ['patricia-andrews', 'ancestors'], ['robert-william-fitzmaurice', 'descendants']];
    const scopeBad = [];
    for (const [id, sc] of scopeCases) {
        const got = await page.evaluate(([id, sc]) => { FM.state.person = id; FM.state.scope = sc; return Object.keys(FM.filters.scopeIds() || {}); }, [id, sc]);
        const want = expectScope(id, sc);
        if (!sameSet(got, want)) scopeBad.push(`${id} ${sc}: got ${got.join(',')}, expected ${want.join(',')}`);
    }
    check(!scopeBad.length, `the person filter's scopes return the right people (${scopeCases.length} cases)`, scopeBad.join('; '));
    await page.evaluate(() => { FM.state.person = null; FM.state.scope = 'self'; FM.refresh(); });
    // the combobox: type a name, choose, then scope chips fade the rest
    await page.fill('#personInput', 'Ronald');
    await page.waitForTimeout(250);
    const opts = await page.$$eval('#personList [role="option"]', els => els.map(e => e.textContent));
    await page.fill('#personInput', '');
    await page.focus('#personInput');
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(200);
    const allOpts = await page.$$eval('#personList [role="option"]', els => els.map(e => e.id.replace(/^opt-/, '')));
    check(opts.some(t => /Ronald/.test(t)) && allOpts.length > 50, `the person list finds people by name (${allOpts.length} people)`);
    await page.fill('#personInput', 'Ronald');
    await page.waitForTimeout(250);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
    await page.click('#scopes [data-scope="spouse"]');
    await page.waitForTimeout(600);
    const fade = await page.evaluate(() => {
        const scope = FM.filters.scopeIds() || {};
        const bad = [];
        [].forEach.call(document.querySelectorAll('.mk-wrap'), el => {
            const pids = el.dataset.places.split('|');
            const involved = pids.some(pid => (FM.DATA.placeEvents[pid] || []).some(e => e.personIds.some(id => scope[id])));
            if (involved === el.classList.contains('is-faded')) bad.push(el.dataset.places);
        });
        return { person: FM.state.person, scope: FM.state.scope, bad, url: location.search };
    });
    check(fade.person === 'ronald-andrews' && fade.scope === 'spouse' && !fade.bad.length && /person=ronald-andrews/.test(fade.url) && /scope=spouse/.test(fade.url), 'choosing a person and a scope fades every place that is not theirs', JSON.stringify(fade).slice(0, 300));
    await page.waitForTimeout(2600); // let the camera settle on their places
    await shot(page, 'map-person-1440');
    await page.evaluate(() => { document.getElementById('personClear').click(); });
    await page.waitForTimeout(400);

    // the peek by hover and by keyboard, with a Street View button
    // a church with a Street View entry, in the middle of the map
    await page.evaluate(() => { const pl = FM.DATA.places['st-marys-church-wanstead']; FM.map.jumpTo({ center: [pl.lng, pl.lat], zoom: 15 }); });
    await page.waitForTimeout(700);
    const pinId = await page.evaluate(() => { const el = [].filter.call(document.querySelectorAll('.mk-wrap'), m => m.dataset.places === 'st-marys-church-wanstead')[0]; if (!el) return null; el.id = 'test-pin'; return el.dataset.places; });
    check(pinId && PL_NAME_OK(pinId), 'the Wanstead church has a pin of its own at street level');
    await page.hover('#test-pin');
    await page.waitForTimeout(450);
    const peekHover = await page.evaluate(() => { const p = document.getElementById('peek'); return { shown: !p.hidden, text: p.innerText, sv: !!p.querySelector('.sv-btn') }; });
    check(peekHover.shown && peekHover.text.includes(PL_NAME(pinId)), 'hovering a marker shows its peek', JSON.stringify(peekHover).slice(0, 160));
    check(peekHover.sv, 'the peek has a Street View button');
    await page.mouse.move(5, 300);
    await page.waitForTimeout(500);
    await page.focus('#test-pin');
    await page.waitForTimeout(300);
    const peekFocus = await page.evaluate(() => !document.getElementById('peek').hidden);
    check(peekFocus, 'focusing a marker with the keyboard shows its peek');
    // site.config.json holds the Embed key, so this check empties it before the panel is drawn and puts it back. The assertion is the same: with no key, Street View is a Maps link.
    await page.evaluate(() => { window.__fmEmbed = window.FamilySite.map.googleEmbedKey; window.FamilySite.map.googleEmbedKey = ''; });
    await page.keyboard.press('Enter');
    await page.waitForTimeout(900);
    const panel = await page.evaluate(() => { const p = document.getElementById('panel'); const a = p.querySelector('a.sv-btn'); return { shown: !p.hidden, href: a ? a.href : null, place: FM.state.place, url: location.search }; });
    check(panel.shown && panel.place === pinId && /place=/.test(panel.url), 'Enter on a marker opens its place panel and puts it in the URL', JSON.stringify(panel).slice(0, 200));
    // the Street View link without a key
    const sv = PL[pinId].streetView;
    let u = panel.href ? new URL(panel.href) : null;
    const vp = u && u.searchParams.get('viewpoint');
    const wantLat = sv.panoLat != null ? sv.panoLat : sv.targetLat, wantLng = sv.panoLng != null ? sv.panoLng : sv.targetLng;
    check(u && u.origin === 'https://www.google.com' && u.pathname === '/maps/@' && u.searchParams.get('api') === '1' && u.searchParams.get('map_action') === 'pano' &&
        vp && Math.abs(+vp.split(',')[0] - wantLat) < 1e-5 && Math.abs(+vp.split(',')[1] - wantLng) < 1e-5 && u.searchParams.get('pitch') === String(Math.round(sv.pitch)) && u.searchParams.get('fov') === String(Math.round(sv.fov)) &&
        (sv.heading == null ? !u.searchParams.has('heading') : u.searchParams.get('heading') === String(Math.round(sv.heading))),
        'without a key, the panel\'s Street View button is a correct Google Maps link (viewpoint, pitch, fov, and heading when known)', panel.href);
    await page.evaluate(() => { window.FamilySite.map.googleEmbedKey = window.__fmEmbed; });
    const withHeading = await page.evaluate(() => FM.sv.mapsUrl({ lat: 51.5, lng: -0.1, streetView: { panoLat: 51.50001, panoLng: -0.10002, heading: 123.4, pitch: 6, fov: 75 } }));
    u = new URL(withHeading);
    check(u.searchParams.get('viewpoint') === '51.50001,-0.10002' && u.searchParams.get('heading') === '123' && u.searchParams.get('pitch') === '6' && u.searchParams.get('fov') === '75', 'a checked viewpoint puts its heading in the Maps URL', withHeading);
    await shot(page, 'map-place-1440');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => ({ hidden: document.getElementById('panel').hidden, focus: document.activeElement && document.activeElement.id }));
    check(closed.hidden && closed.focus === 'test-pin', 'Esc closes the panel and returns focus to the marker', JSON.stringify(closed));

    // the list view and the tray
    await page.click('#listOpen');
    await page.waitForTimeout(500);
    const list = await page.evaluate(() => { const v = document.getElementById('listView'); return { shown: !v.hidden, text: v.innerText }; });
    const listMissing = expectedPlaces.filter(id => !list.text.includes(PL[id].name));
    check(list.shown && !listMissing.length, 'View as list lists every place on the map', listMissing.slice(0, 5).join(', '));
    const listHeld = HELD_BACK_WORDS.filter(n => list.text.includes(n));
    check(!listHeld.length, 'the list names nothing held back', listHeld.join(', '));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.click('#trayBtn');
    await page.waitForTimeout(400);
    const tray = await page.evaluate(() => ({ shown: !document.getElementById('tray').hidden, n: document.querySelectorAll('#trayList li').length, want: FM.DATA.unplaced.filter(e => !e.orkney).length }));
    check(tray.shown && tray.n === tray.want && tray.n > 0, `"Not yet on the map" lists every event with no place yet (${tray.want})`, JSON.stringify(tray));
    await page.keyboard.press('Escape');
    await shot(page, 'map-explore-1440');
    check(!s.errors.length, 'Explore: no page errors', s.errors.slice(0, 3).join(' | '));
    await s.close();

    // ================================================================ modes and URL state
    section('Modes and URL state');
    s = await open('map.html?mode=tour');
    page = s.page;
    const tour = await page.evaluate(() => ({ mode: FM.state.mode, url: location.search, tl: document.getElementById('timeline').hidden }));
    check(tour.mode === 'explore' && !/tour/.test(tour.url) && tour.tl && !s.errors.length, 'a URL with mode=tour falls back to Explore cleanly', JSON.stringify(tour));
    await s.close();

    s = await open('map.html?style=atlas&hide=died,lived&from=1850&to=1950&family=pat&gen=2&place=st-marys-church-wanstead');
    page = s.page;
    const rt = await page.evaluate(() => { FM.writeURL(); return location.search; });
    const q = new URLSearchParams(rt);
    check(q.get('style') === 'atlas' && q.get('family') === 'pat' && q.get('gen') === '2' && q.get('hide').split(',').sort().join() === 'died,lived' && q.get('from') === '1850' && q.get('to') === '1950' && q.get('place') === 'st-marys-church-wanstead', 'Explore state round-trips through the URL', rt);
    await page.click('#modeSwitch [data-mode="timeline"]');
    await page.waitForTimeout(1200);
    const kept = await page.evaluate(() => ({ mode: FM.state.mode, style: FM.state.style, died: !!FM.state.hidden.died, fam: FM.state.fam, url: location.search }));
    await page.click('#modeSwitch [data-mode="explore"]');
    await page.waitForTimeout(800);
    const kept2 = await page.evaluate(() => ({ mode: FM.state.mode, style: FM.state.style, died: !!FM.state.hidden.died }));
    check(kept.mode === 'timeline' && kept.style === 'atlas' && kept.died && kept.fam === 'pat' && kept2.mode === 'explore' && kept2.style === 'atlas' && kept2.died, 'switching modes keeps the filters and the map style', JSON.stringify([kept, kept2]));
    await s.close();

    s = await open('map.html?person=patricia-andrews&scope=ancestors');
    page = s.page;
    const prt = await page.evaluate(() => { FM.writeURL(); return { url: location.search, panel: !document.getElementById('panel').hidden }; });
    check(/person=patricia-andrews/.test(prt.url) && /scope=ancestors/.test(prt.url) && prt.panel, 'a person link opens their panel and keeps the scope', JSON.stringify(prt));
    await s.close();

    // ================================================================ the step player, with no Timeline code loaded
    section('Step player (a stand-in for a future tour)');
    s = await open('map.html', { noTimeline: true });
    page = s.page;
    const stepModes = await page.$$eval('#modeSwitch [data-mode]', els => els.map(e => e.textContent.trim()));
    const steps = await page.evaluate(async () => {
        const ev = (FM.DATA.placeEvents['st-marys-battersea'] || [])[0];
        const opener = document.getElementById('listOpen'); opener.focus();
        FM.stepStage.run([
            { places: ['st-marys-battersea'], events: ev ? [ev.id] : [], card: { title: 'Battersea', text: 'Where the Falckes married.' }, waitForNext: true },
            { camera: { center: [0.0335, 51.5257], zoom: 15 }, card: { title: 'Plaistow', text: 'A hand-written camera.' }, waitForNext: true },
            { places: ['st-marys-church-wanstead'], card: { title: 'Wanstead', text: 'The wedding church.' }, waitForNext: true }
        ]);
        await new Promise(r => setTimeout(r, 2600));
        const c = document.getElementById('stepCard'), m = FM.map.getCenter(), b = FM.DATA.places['st-marys-battersea'];
        return { shown: !c.hidden, text: c.innerText, near: Math.abs(m.lat - b.lat) < 0.01 && Math.abs(m.lng - b.lng) < 0.02, focusNext: document.activeElement && document.activeElement.dataset.sc };
    });
    check(JSON.stringify(stepModes) === '["Explore"]' && !s.errors.length, 'with map-timeline.js left out the page still works, with Explore only', stepModes.join(','));
    check(steps.shown && /1 of 3/i.test(steps.text) && /Battersea/.test(steps.text) && steps.near && steps.focusNext === 'next', 'the step player frames the first step and shows its card, with focus on Next', JSON.stringify({ near: steps.near, focus: steps.focusNext, shown: steps.shown }));
    await page.click('#stepCard [data-sc="next"]');
    await page.waitForTimeout(2600);
    const step2 = await page.evaluate(() => { const m = FM.map.getCenter(); return { text: document.getElementById('stepCard').innerText, near: Math.abs(m.lat - 51.5257) < 0.003 && Math.abs(m.lng - 0.0335) < 0.005, z: Math.round(FM.map.getZoom()) }; });
    check(/2 of 3/i.test(step2.text) && /Plaistow/.test(step2.text) && step2.near && step2.z === 15, 'Next moves to the second step and uses its own camera', JSON.stringify(step2).slice(0, 160));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const step3 = await page.evaluate(() => ({ hidden: document.getElementById('stepCard').hidden, focus: document.activeElement && document.activeElement.id, active: FM.stepStage.active() }));
    check(step3.hidden && !step3.active && step3.focus === 'listOpen', 'Esc ends the steps and returns focus', JSON.stringify(step3));
    await s.close();

    // ================================================================ Timeline
    section('Timeline');
    s = await open('map.html?mode=timeline', { settle: 1500 });
    page = s.page;
    const tl = await page.evaluate(() => {
        const T = FM.timeline, D = FM.DATA;
        const dec = (d) => { const p = String(d).split('-'); return +p[0] + (((+p[1] || 1) - 1) * 30.44 + ((+p[2] || 1) - 1)) / 365.25; };
        const flat = []; T.beats.forEach(b => b.events.forEach(e => flat.push(e)));
        let ordered = true; for (let i = 1; i < flat.length; i++) if (dec(flat[i].dateStart) < dec(flat[i - 1].dateStart) - 1e-9) ordered = false;
        const ids = flat.filter(e => !e.isVoyage).map(e => e.id);
        const want = D.events.concat(D.unplaced).filter(e => e.dateStart && !e.orkney && !e.voyageId).map(e => e.id);
        const voyages = flat.filter(e => e.isVoyage).length;
        const listUndated = [].map.call(document.querySelectorAll('#tlList [data-undated]'), li => li.dataset.undated);
        const inBeats = T.undated.filter(e => flat.indexOf(e) >= 0).length;
        return { beats: T.beats.length, events: flat.length, ordered, missing: want.filter(id => ids.indexOf(id) < 0), extra: ids.filter(id => want.indexOf(id) < 0), voyages, voyagesWant: Object.keys(D.voyages || {}).length,
            undated: T.undated.length, listUndated: listUndated.length, inBeats, dateUnknown: /Date unknown/.test(document.getElementById('tlList').innerText) };
    });
    check(tl.ordered, `the timeline's events run in date order (${tl.events} events in ${tl.beats} beats)`);
    check(!tl.missing.length && !tl.extra.length, 'every dated event is in the timeline, once', 'missing ' + tl.missing.slice(0, 5).join(',') + ' extra ' + tl.extra.slice(0, 5).join(','));
    check(tl.voyages > 0, `voyages play as their own beats (${tl.voyages})`);
    check(tl.undated > 0 && tl.listUndated === tl.undated && !tl.inBeats && tl.dateUnknown, `undated events are listed under "Date unknown" and not played (${tl.undated})`, JSON.stringify(tl).slice(0, 200));
    // close family is named by how they are related to Pat or Ron, up to three steps away
    const kin = await page.evaluate(() => {
        const D = FM.DATA, k = id => { const r = FM.data.kinOf(id, D.people); return r ? r.label : null; };
        const want = { 'reg-fitzmaurice': "Pat's father", 'mrs-r-fitzmaurice': "Pat's mother", 'edward-dixon-fitzmaurice': "Pat's grandfather", 'mr-hg-andrews': "Ron's father",
            'sidney-andrews': "Ron's brother", 'herbert-andrews-sr': "Ron's grandfather", 'eileen-sybil-fitzmaurice': "Pat's aunt", 'patricia-andrews': null, 'ronald-andrews': null, 'cecil-8th': null };
        const bad = Object.keys(want).filter(id => D.people[id] && k(id) !== want[id]).map(id => id + ': ' + k(id));
        const row = [].find.call(document.querySelectorAll('#tlList .el'), li => /Henry George Andrews/.test(li.querySelector('.el-t').textContent));
        return { bad, row: row && row.querySelector('.el-r') ? row.querySelector('.el-r').textContent : '' };
    });
    check(!kin.bad.length && /Ron's (father|parents)/.test(kin.row), "the timeline names close family by their link to Pat or Ron (Reg, Pat's father; Henry George, Ron's father)", JSON.stringify(kin));
    const start = await page.evaluate(() => ({ i: FM.timeline.index, playing: FM.timelineDebug.player().playing, card: document.getElementById('tlNow').innerText }));
    check(start.i === 0 && !start.playing, 'Timeline opens paused at the first event', JSON.stringify(start).slice(0, 160));
    // an unplaced event gets a beat that says so
    const unplaced = await page.evaluate(async () => {
        const i = FM.timeline.beats.findIndex(b => b.events.every(e => !e.placeId));
        FM.timelineDebug.player().goTo(i);
        await new Promise(r => setTimeout(r, 300));
        return { i, card: document.getElementById('tlNow').innerText };
    });
    check(unplaced.i >= 0 && /Place not known/.test(unplaced.card), 'an event with no place gets its beat, marked "Place not known"', JSON.stringify(unplaced).slice(0, 160));
    // keyboard
    await page.evaluate(() => { document.activeElement && document.activeElement.blur(); FM.timelineDebug.player().goTo(5); });
    await page.waitForTimeout(200);
    const k = [];
    const idx = () => page.evaluate(() => FM.timeline.index);
    await page.keyboard.press('ArrowRight'); k.push(await idx());
    await page.keyboard.press('ArrowLeft'); k.push(await idx());
    await page.keyboard.press('Shift+ArrowRight'); k.push(await idx());
    const decade = await page.evaluate(() => FM.timeline.beats[FM.timeline.index].t - FM.timeline.beats[5].t);
    await page.keyboard.press('End'); k.push(await idx());
    await page.keyboard.press('Home'); k.push(await idx());
    await page.keyboard.press('Space'); const playing1 = await page.evaluate(() => FM.timelineDebug.player().playing);
    await page.keyboard.press('Space'); const playing2 = await page.evaluate(() => FM.timelineDebug.player().playing);
    check(k[0] === 6 && k[1] === 5 && decade >= 10 - 1e-6 && k[3] === tl.beats - 1 && k[4] === 0 && playing1 && !playing2, 'the keys work: arrows step, Shift steps a decade, Home and End, Space plays and pauses', JSON.stringify({ k, decade, playing1, playing2 }));
    await page.click('#tlNext'); const n1 = await idx();
    await page.click('#tlPrev'); const n0 = await idx();
    check(n1 === 1 && n0 === 0, 'the Next and Previous buttons step by event');
    // clicking a tick, a stacked tick's fan, a list item and a marker
    const single = await page.evaluate(() => { const t = [].filter.call(document.querySelectorAll('#rail .tk:not(.tk--stack)'), x => +x.dataset.beat > 3)[0]; t.id = 'test-tick'; return +t.dataset.beat; });
    await page.click('#test-tick'); const afterTick = await idx();
    const stackInfo = await page.evaluate(() => { const t = document.querySelectorAll('#rail .tk--stack')[3]; t.id = 'test-stack'; return t.dataset.beats.split(' ').map(Number); });
    await page.hover('#test-stack'); await page.waitForTimeout(400);
    const fanOpen = await page.evaluate(() => !document.getElementById('tlFan').hidden && document.querySelectorAll('#tlFan .fan-b').length);
    await page.click('#tlFan .fan-b:last-child'); const afterFan = await idx();
    const li = await page.evaluate(() => { const x = document.querySelectorAll('#tlList .el[data-beat]')[40]; x.querySelector('button').id = 'test-li'; return +x.dataset.beat; });
    await page.click('#test-li'); const afterLi = await idx();
    check(afterTick === single && fanOpen > 1 && stackInfo.includes(afterFan) && afterLi === li, 'clicking a tick, an event in a stacked tick\'s list, or an event in the list jumps to it', JSON.stringify({ single, afterTick, fanOpen, afterFan, li, afterLi }));
    await page.waitForTimeout(2200);
    const mk = await page.evaluate(() => {
        const cur = FM.timeline.beats[FM.timeline.index];
        const el = [].filter.call(document.querySelectorAll('.mk-wrap'), m => { const ids = m.dataset.places.split('|'); const r = m.getBoundingClientRect(); return ids.length === 1 && cur.places.indexOf(ids[0]) < 0 && !m.classList.contains('is-future') && r.left > 330 && r.right < 1040 && r.top > 170 && r.bottom < 720; })[0];
        if (!el) return null; el.id = 'test-mk'; return el.dataset.places;
    });
    if (mk) {
        await page.click('#test-mk', { force: true }); await page.waitForTimeout(300);
        const afterMk = await page.evaluate((pid) => { const b = FM.timeline.beats[FM.timeline.index]; return b.places.indexOf(pid) >= 0; }, mk);
        check(afterMk, 'clicking a marker in Timeline moves the playhead to its event', mk);
    } else fail('clicking a marker in Timeline: no marker found to click');
    // Street View in the card
    const svCard = await page.evaluate(async () => {
        const i = FM.timeline.beats.findIndex(b => b.places.some(pid => FM.DATA.places[pid].streetView));
        FM.timelineDebug.player().goTo(i); await new Promise(r => setTimeout(r, 300));
        return !!document.querySelector('#tlNow .sv-btn');
    });
    check(svCard, 'the timeline card has a Street View button');
    // voyages draw their arcs
    const arc = await page.evaluate(async () => {
        const i = FM.timeline.beats.findIndex(b => b.voyage);
        FM.timelineDebug.player().goTo(i);
        await new Promise(r => setTimeout(r, 2600));
        const fc = FM.lastData['fm-arcs'];
        return { i, feats: fc ? fc.features.length : 0, pts: fc && fc.features.length ? fc.features[fc.features.length - 1].geometry.coordinates.length : 0, ship: /Castle|Saxon|Montrose|Marburn|Balmoral/.test(document.getElementById('tlNow').innerText) };
    });
    check(arc.i >= 0 && arc.feats > 0 && arc.pts > 10 && arc.ship, 'a voyage draws its arc and names the ship', JSON.stringify(arc));
    // scrubbing to a year shows exactly the events up to that year
    const scrub = await page.evaluate(() => { const r = document.getElementById('rail').getBoundingClientRect(), sc = FM.timeline.scale; return { x: r.left + (1900.5 - sc.lo) / (sc.hi - sc.lo) * r.width, y: r.top + 18, x2: r.left + (1871.5 - sc.lo) / (sc.hi - sc.lo) * r.width }; });
    await page.mouse.move(scrub.x, scrub.y);
    await page.mouse.down();
    await page.mouse.move(scrub.x2, scrub.y, { steps: 6 });
    await page.waitForTimeout(400);
    const during = await page.evaluate(() => {
        const t = FM.timeline.time;
        const dec = (d) => { const p = String(d).split('-'); return +p[0] + (((+p[1] || 1) - 1) * 30.44 + ((+p[2] || 1) - 1)) / 365.25; };
        const want = Object.keys(FM.DATA.placeEvents).filter(pid => FM.DATA.placeEvents[pid].some(e => FM.filters.eventPasses(e, { ignoreYears: true }) && e.dateStart && dec(e.dateStart) <= t + 1e-6));
        const shown = [].concat(...[].map.call(document.querySelectorAll('.mk-wrap'), el => el.dataset.places.split('|')));
        const a = new Set(shown), b = new Set(want);
        return { t, ok: a.size === b.size && [...a].every(x => b.has(x)), shown: a.size, want: b.size, year: document.getElementById('tlYear').textContent };
    });
    await page.mouse.up();
    await page.waitForTimeout(500);
    const settled = await page.evaluate(() => ({ i: FM.timeline.index, t: FM.timeline.beats[FM.timeline.index].t }));
    check(during.ok && Math.floor(during.t) === 1871 && during.year === '1871' && Math.abs(settled.t - during.t) < 6, 'scrubbing to 1871 shows exactly the places with events up to then, and settles on the nearest event', JSON.stringify({ during, settled }));
    // play through every beat (fast)
    const run = await page.evaluate(async () => {
        const p = FM.timelineDebug.player(), seen = [];
        FM.camera.following = false;
        p.goTo(0);
        const on = (step, i) => seen.push(i);
        p.on('enter', on);
        p.setSpeed(400);
        p.play();
        const t0 = Date.now();
        while (p.index < p.steps.length - 1 && Date.now() - t0 < 90000) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 300));
        p.pause(); p.setSpeed(1);
        let inOrder = true; for (let i = 1; i < seen.length; i++) if (seen[i] !== seen[i - 1] + 1) inOrder = false;
        return { seen: seen.length, n: p.steps.length, inOrder, last: seen[seen.length - 1] };
    });
    check(run.inOrder && run.last === run.n - 1 && run.seen >= run.n - 1, `Play advances through every dated event in order (${run.n} beats)`, JSON.stringify(run));
    // the URL holds the moment, and a shared link opens there, paused
    const linkUrl = await page.evaluate(async () => { FM.timelineDebug.player().goTo(30); FM.timelineDebug.player().play(); await new Promise(r => setTimeout(r, 400)); FM.writeURL(); return location.search; });
    const wantEvent = await page.evaluate(() => FM.timeline.beats[30].events[0].id);
    check(/mode=timeline/.test(linkUrl) && linkUrl.includes('event=' + encodeURIComponent(wantEvent)) && /playing=1/.test(linkUrl), 'the URL holds the mode, the event and whether it is playing', linkUrl);
    await s.close();
    s = await open('map.html' + linkUrl, { settle: 1500 });
    page = s.page;
    const reopened = await page.evaluate(() => ({ i: FM.timeline.index, id: FM.timeline.beats[FM.timeline.index].events[0].id, playing: FM.timelineDebug.player().playing }));
    check(reopened.id === wantEvent && !reopened.playing, 'a shared timeline link opens at the same event, paused', JSON.stringify(reopened));
    check(!s.errors.length, 'Timeline: no page errors', s.errors.slice(0, 3).join(' | '));
    await s.close();

    // a filtered timeline
    s = await open('map.html?mode=timeline&person=edward-dixon-fitzmaurice', { settle: 1500 });
    page = s.page;
    const filt = await page.evaluate(() => ({ n: FM.timeline.beats.length, bad: FM.timeline.beats.filter(b => !b.events.some(e => e.personIds.indexOf('edward-dixon-fitzmaurice') >= 0)).length }));
    check(filt.n > 3 && !filt.bad, `a timeline filtered to one person contains only that person's events (${filt.n} beats)`, JSON.stringify(filt));
    await s.close();

    // reduced motion: cuts, no flights, no pulsing
    s = await open('map.html?mode=timeline', { reducedMotion: 'reduce', settle: 1500 });
    page = s.page;
    const rm = await page.evaluate(async () => {
        const m = FM.map, moving = [];
        ['flyTo', 'easeTo', 'fitBounds', 'panTo', 'zoomTo'].forEach(fn => { const o = m[fn].bind(m); m[fn] = function (a, b) { const opt = fn === 'fitBounds' || fn === 'panTo' || fn === 'zoomTo' ? b : a; if (!opt || opt.duration !== 0) moving.push(fn); return o(a, b); }; });
        const p = FM.timelineDebug.player();
        for (const i of [3, 40, 41, 90, 20]) { p.goTo(i); await new Promise(r => setTimeout(r, 500)); }
        p.setSpeed(20); p.play(); await new Promise(r => setTimeout(r, 2500)); p.pause();
        return { moving, pulse: document.querySelectorAll('.is-pulse').length };
    });
    check(!rm.moving.length && !rm.pulse, 'with reduced motion the camera cuts instead of flying, and nothing pulses', JSON.stringify(rm));
    await s.close();

    // ================================================================ Street View with a key
    section('Street View with an Embed key');
    s = await open('map.html?place=st-marys-church-wanstead', { embedKey: true });
    page = s.page;
    const emb = await page.evaluate(() => ({ url: FM.sv.embedUrl(FM.DATA.places['st-marys-church-wanstead']), btn: !!document.querySelector('#panel button.sv-btn[data-sv]') }));
    u = new URL(emb.url);
    const wsv = PL['st-marys-church-wanstead'].streetView;
    check(emb.btn && u.origin + u.pathname === 'https://www.google.com/maps/embed/v1/streetview' && u.searchParams.get('key') === 'TEST-EMBED-KEY' &&
        u.searchParams.get('location') === `${+(wsv.panoLat ?? wsv.targetLat).toFixed(6)},${+(wsv.panoLng ?? wsv.targetLng).toFixed(6)}` && u.searchParams.has('pitch') && u.searchParams.has('fov') && u.searchParams.get('language') === 'en-GB',
        'with a key the button opens the overlay, and the Embed URL is right', emb.url);
    const pnsv = await page.evaluate(() => { const f = document.querySelector('#panel .pn-sv iframe'); return { src: f && f.src, open: !!document.querySelector('#panel .pn-sv-open[data-sv]'), first: document.querySelector('#panel .pn').firstElementChild.className }; });
    check(pnsv.src === emb.url && pnsv.open && pnsv.first === 'pn-sv', "the place panel opens with that address's Street View at the top", JSON.stringify(pnsv).slice(0, 200));
    const anyConf = await page.evaluate(() => document.querySelectorAll('.badge.c-conf, .badge.c-prob, .badge.c-fam').length);
    check(!anyConf, 'no confidence tags in the panel', String(anyConf));
    await page.click('#panel .pn-sv-open');
    await page.waitForTimeout(700);
    const ovp = await page.evaluate(() => ({ open: FM.sv.isOpen(), tab: document.getElementById('svTab').href, head: document.getElementById('svHead').textContent, card: (() => { const r = document.getElementById('svCard').getBoundingClientRect(), f = document.querySelector('.fm-sv-frame').getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - (f.left + f.right) / 2) < 4 && f.bottom - r.bottom < 80; })() }));
    check(ovp.head && ovp.card, 'Street View shows the place title front and centre at the bottom', JSON.stringify(ovp).slice(0, 200));
    check(ovp.open && /^https:\/\/www\.google\.com\/maps\/@\?api=1&map_action=pano/.test(ovp.tab), 'clicking the Street View in the panel opens it inside the map, with a link to open it in a new tab', JSON.stringify(ovp));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await page.click('#panel button.sv-btn[data-sv]');
    await page.waitForTimeout(900);
    const ov = await page.evaluate(() => ({ shown: !document.getElementById('sv').hidden, src: (document.querySelector('#svFrame iframe') || {}).src, focus: document.activeElement && document.activeElement.id, cap: document.getElementById('svCap').innerText }));
    check(ov.shown && ov.src === emb.url && ov.focus === 'svClose' && ov.cap.length > 20, 'the Street View overlay opens with the Embed URL, a caption and focus on Close', JSON.stringify(ov).slice(0, 200));
    await shot(page, 'map-streetview-1440');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const ov2 = await page.evaluate(() => ({ hidden: document.getElementById('sv').hidden, focus: document.activeElement && document.activeElement.matches('button.sv-btn') }));
    check(ov2.hidden && ov2.focus, 'Esc closes the overlay and returns focus to the button', JSON.stringify(ov2));
    await page.evaluate(() => FM.util.closePanel && FM.util.closePanel());
    await page.waitForTimeout(400);
    const pb = await page.$eval('#pegman', el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    await page.mouse.move(pb.x, pb.y); await page.mouse.down();
    await page.mouse.move(pb.x - 300, pb.y + 250, { steps: 8 });
    const ghost = await page.evaluate(() => !!document.querySelector('.fm-peg-ghost'));
    await page.mouse.up(); await page.waitForTimeout(600);
    const dropped = await page.evaluate(() => ({ open: FM.sv.isOpen(), src: (document.querySelector('#svFrame iframe') || {}).src || '', head: document.getElementById('svHead').textContent }));
    check(ghost && dropped.open && /embed\/v1\/streetview\?key=TEST-EMBED-KEY&location=/.test(dropped.src), 'dragging the little figure onto the map opens Street View there, inside the map', JSON.stringify(dropped).slice(0, 200));
    await page.keyboard.press('Escape');
    await s.close();
    s = await open('map.html?mode=timeline', { embedKey: true, settle: 1500 });
    page = s.page;
    const pause = await page.evaluate(async () => {
        const p = FM.timelineDebug.player();
        const i = FM.timeline.beats.findIndex(b => b.places.some(pid => FM.DATA.places[pid].streetView));
        p.goTo(i); p.play(); await new Promise(r => setTimeout(r, 300));
        document.querySelector('#tlNow button.sv-btn').click();
        await new Promise(r => setTimeout(r, 400));
        return { open: FM.sv.isOpen(), playing: p.playing };
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const resumed = await page.evaluate(() => ({ open: FM.sv.isOpen(), playing: FM.timelineDebug.player().playing }));
    check(pause.open && !pause.playing && !resumed.open && resumed.playing, 'Street View from the timeline pauses playback, and closing it resumes', JSON.stringify([pause, resumed]));
    await s.close();

    // Street View coverage in the data
    const noSv = places.filter(p => p.drawAs === 'pin' && !p.streetView && !String(p.streetViewReason || '').trim()).map(p => p.id);
    check(!noSv.length, 'every place with an address or building has a Street View entry or a recorded reason for none', noSv.join(', '));

    // ================================================================ mobile
    section('Mobile (390 x 844)');
    s = await open('map.html', { viewport: { width: 390, height: 844 }, mobile: true, settle: 1200 });
    page = s.page;
    const tapId = await page.evaluate(() => {
        const pl = FM.DATA.places['st-marys-church-wanstead']; FM.map.jumpTo({ center: [pl.lng, pl.lat], zoom: 16 });
        return 'st-marys-church-wanstead';
    });
    await page.waitForTimeout(700);
    await page.evaluate((id) => { const el = [].filter.call(document.querySelectorAll('.mk-wrap'), m => m.dataset.places === id)[0]; el.id = 'test-tap'; }, tapId);
    await page.tap('#test-tap');
    await page.waitForTimeout(400);
    const tap1 = await page.evaluate(() => ({ peek: !document.getElementById('peek').hidden, panel: !document.getElementById('panel').hidden }));
    await page.tap('#test-tap');
    await page.waitForTimeout(800);
    const tap2 = await page.evaluate(() => ({ panel: !document.getElementById('panel').hidden, w: document.documentElement.scrollWidth }));
    check(tap1.peek && !tap1.panel && tap2.panel, 'on a phone the first tap shows the peek and the second opens the place', JSON.stringify([tap1, tap2]));
    check(tap2.w <= 390, 'nothing overflows the phone width', String(tap2.w));
    await shot(page, 'map-place-390');
    await page.evaluate(() => FM.util.closePanel());
    await page.evaluate(() => FM.frameEngland(0));
    await page.waitForTimeout(600);
    await shot(page, 'map-explore-390');
    check(!s.errors.length, 'Mobile Explore: no page errors', s.errors.slice(0, 3).join(' | '));
    await s.close();
    s = await open('map.html?mode=timeline', { viewport: { width: 390, height: 844 }, mobile: true, settle: 1500, embedKey: true });
    page = s.page;
    const mtl = await page.evaluate(async () => {
        const p = FM.timelineDebug.player(); p.goTo(60); p.play(); await new Promise(r => setTimeout(r, 3500));
        const tl = document.getElementById('timeline').getBoundingClientRect(), ev = document.getElementById('tlPanel').getBoundingClientRect();
        return { tlBottom: Math.round(tl.bottom), evBottom: Math.round(ev.bottom), tlTop: Math.round(tl.top), w: document.documentElement.scrollWidth, playBtn: document.getElementById('tlPlay').getBoundingClientRect().height };
    });
    check(mtl.tlBottom === 844 && mtl.evBottom <= mtl.tlTop + 1 && mtl.w <= 390 && mtl.playBtn >= 44, 'on a phone the track sits at the bottom with large controls and the card above it', JSON.stringify(mtl));
    await shot(page, 'map-timeline-390');
    await page.evaluate(() => { FM.timelineDebug.player().pause(); FM.sv.open('st-marys-church-wanstead'); });
    await page.waitForTimeout(900);
    await shot(page, 'map-streetview-390');
    check(!s.errors.length, 'Mobile Timeline: no page errors', s.errors.slice(0, 3).join(' | '));
    await s.close();

    // ================================================================ a desktop timeline screenshot mid-playback
    if (SHOTS) {
        s = await open('map.html?mode=timeline', { settle: 1500 });
        page = s.page;
        await page.evaluate(async () => {
            const p = FM.timelineDebug.player();
            const i = FM.timeline.beats.findIndex(b => b.events.some(e => e.id === 'v-1916-llanstephan-castle' || (e.isVoyage && /1916/.test(e.dateStart))));
            p.goTo(Math.max(0, i - 1)); p.play();
        });
        await page.waitForTimeout(9000);
        await shot(page, 'map-timeline-1440');
        await s.close();
    }

    // ================================================================ no WebGL: the list is the map
    section('Without WebGL');
    s = await open('map.html', { init: () => { const g = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (t, o) { return /webgl/i.test(t) ? null : g.call(this, t, o); }; } });
    page = s.page;
    const nogl = await page.evaluate(() => ({ list: !document.getElementById('listView').hidden, n: document.querySelectorAll('#listBody .lv-place').length }));
    check(nogl.list && nogl.n > 50, 'without WebGL the page opens the list of every place and event', JSON.stringify(nogl));
    await s.close();

    // ================================================================ dashes
    section('Text');
    let files = [];
    try {
        files = execSync(`git diff --name-only ${BASE_COMMIT}`, { cwd: ROOT }).toString().split('\n')
            .concat(execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().split('\n')).filter(Boolean);
    } catch (e) { files = ['map.html', 'map.css', 'map-data.js', 'map-ui.js', 'map-player.js', 'map-steps.js', 'map-timeline.js', 'map-glyphs.js', 'config.js', 'data/places.json', 'data/people.json', 'data/sources.json', 'docs/map-audit.md', 'docs/map-architecture.md']; }
    const text = [...new Set(files)].filter(f => /\.(js|mjs|css|html|md|json|py|txt|geojson)$/i.test(f) && fs.existsSync(path.join(ROOT, f)) && !/^vendor\//.test(f) && !/^fonts\/.*\.txt$/.test(f));
    const dashed = text.filter(f => /[\u2013\u2014]/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    check(!dashed.length, `no em dash or en dash in any new or changed text file (${text.length} files)`, dashed.join(', '));

    await browser.close();
    srv.close();
    const errs = [...new Set(allErrors)];
    check(!errs.length, 'no page errors in any run', errs.slice(0, 5).join(' | '));
    console.log(failures.length ? `\n${failures.length} problem(s) found.` : '\nAll checks passed.');
    process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });

function PL_NAME(id) { return (PL[id] || {}).name || id; }
function PL_NAME_OK(id) { return !!PL[id] && PL[id].drawAs === 'pin'; }
