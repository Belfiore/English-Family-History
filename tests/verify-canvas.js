/* Automated checks for the interactive family canvas (family-tree.html).
 *
 *   node tests/verify-canvas.js            (needs Playwright with Chromium)
 *   SHOTS=1 node tests/verify-canvas.js    also writes screenshots to tests/screenshots/
 *
 * Ported from the Belfiore & Circelli site. Checks: every source id resolves; no fact is
 * unsourced unless labelled unverified or family tradition; no em dashes; living people
 * show no dates or places; the withheld family name appears nowhere; no card text
 * overflows at 1440, 1024 and 390 px; no page errors; every connector starts and ends on
 * the right card and never crosses another card; the one disputed parent link is drawn and labelled;
 * every file path and every #/person/
 * route resolves; the lightbox; search across name variants; the pinned story button,
 * expanding in place, arrows and previous/next; the relationship finder, including a
 * real drag; text and line contrast; and every internal link on every page.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PAGE = 'family-tree.html';
const SHOTS = process.env.SHOTS ? path.join(__dirname, 'screenshots') : null;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.md': 'text/plain' };
// A family name the family asked to keep off the site, stored encoded so this file does not contain it either.
const WITHHELD = Buffer.from('a2lsbWFydGlu', 'base64').toString();

function serve() {
    return new Promise(res => {
        const srv = http.createServer((req, rsp) => {
            let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
            if (p.endsWith('/')) p += 'index.html';
            const f = path.join(ROOT, p);
            if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end('not found'); }
            rsp.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
            fs.createReadStream(f).pipe(rsp);
        });
        srv.listen(0, () => res(srv));
    });
}

const failures = [];
const fail = (m) => { failures.push(m); console.log('  FAIL ' + m); };
const ok = (m) => console.log('  ok   ' + m);

(async () => {
    const srv = await serve();
    const base = 'http://localhost:' + srv.address().port + '/';
    const browser = await chromium.launch();
    if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

    // ---------------------------------------------------------------- data integrity
    const people = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/people.json'))).people;
    const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/sources.json'))).sources;
    const sid = new Set(sources.map(s => s.id));
    let refs = 0, bad = 0, unsourced = 0;
    const use = (ids, where) => (ids || []).forEach(i => { refs++; if (!sid.has(i)) { bad++; fail(`${where}: unknown source "${i}"`); } });
    const labelled = c => ['unverified', 'family tradition'].includes(c);
    const needSource = (r, where) => { if (!(r.sourceIds || []).length && !labelled(r.confidence)) { unsourced++; fail(`${where} has no source and is not labelled unverified or family tradition`); } };
    const files = new Set();
    for (const p of people) {
        (p.story.match(/\[\^([a-z0-9-]+)\]/g) || []).forEach(m => use([m.slice(2, -1)], p.id + ' story'));
        ['birth', 'death'].forEach(k => { if (p[k]) { use(p[k].sourceIds, `${p.id}.${k}`); (p[k].alternates || []).forEach(a => use(a.sourceIds, `${p.id}.${k}.alt`)); needSource(p[k], `${p.id}.${k}`); } });
        (p.residences || []).forEach((r, i) => { use(r.sourceIds, p.id + '.residence'); needSource(r, `${p.id}.residences[${i}]`); });
        (p.occupations || []).forEach((r, i) => { use(r.sourceIds, p.id + '.occupation'); needSource(r, `${p.id}.occupations[${i}]`); });
        (p.facts || []).forEach(r => { use(r.sourceIds, p.id + '.fact'); needSource(r, `${p.id} fact "${r.label}"`); });
        (p.timeline || []).forEach((r, i) => { use(r.sourceIds, p.id + '.timeline'); needSource(r, `${p.id}.timeline[${i}]`); });
        (p.spouses || []).forEach(r => use(r.sourceIds, p.id + '.spouse'));
        (p.nameVariants || []).forEach(r => use(r.sourceIds, p.id + '.variant'));
        if (p.immigration) use(p.immigration.sourceIds, p.id + '.immigration');
        (p.media || []).forEach(m => { use([m.sourceId], p.id + '.media'); [m.file, m.thumb, m.pdf, m.original].filter(Boolean).forEach(f => files.add(f)); if (!m.alt) fail(`${p.id} media ${m.id} has no alt text`); });
        [p.photo, p.portrait].filter(Boolean).forEach(f => files.add(f));
        if (!p.story.trim()) fail(`${p.id}: no story`);
        if (p.isLiving) {
            if (p.birth || p.death || (p.residences || []).length || (p.timeline || []).length || (p.occupations || []).length) fail(`${p.id}: living person shows dates, places or a timeline`);
            const txt = [p.story, p.summary, p.disambiguator, ...(p.facts || []).map(f => f.value)].join(' ');
            if (/\b(1[89]\d\d|20\d\d)\b/.test(txt)) fail(`${p.id}: living person has a year in their text`);
        }
    }
    sources.forEach(s => s.file && files.add(s.file));
    if (!bad) ok(`all ${refs} source references resolve to ${sid.size} sources`);
    if (!unsourced) ok('every date, place, fact and timeline entry cites a source or is labelled unverified or family tradition');
    const living = people.filter(p => p.isLiving);
    if (living.every(p => !p.birth && !p.death)) ok(`${living.length} living people show names and relationships only`);

    // no em dashes in the data or the new canvas files; no en dashes in the data
    const dashFiles = ['data/people.json', 'data/sources.json', PAGE, 'tree-canvas.js', 'tree-canvas.css', 'docs/canvas-audit.md'].filter(f => fs.existsSync(path.join(ROOT, f)));
    const dashErr = [];
    dashFiles.forEach(f => { const t = fs.readFileSync(path.join(ROOT, f), 'utf8'); if (t.includes('—')) dashErr.push(f + ' has an em dash'); if (f.startsWith('data/') && t.includes('–')) dashErr.push(f + ' has an en dash'); });
    if (dashErr.length) dashErr.forEach(fail); else ok(`no em dashes in ${dashFiles.join(', ')}`);

    // the withheld family name appears in no file on the site
    const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name.startsWith('.') || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
    const textFiles = walk(ROOT).filter(f => /\.(html|js|css|json|md|txt|svg)$/i.test(f));
    // The handoff brief quotes the name once, in the instruction not to use it. It is an existing file, so it is
    // left as it is and listed in docs/canvas-audit.md for a decision; every other file must be clean.
    const KNOWN = ['claude_code_handoff_brief_v2.md'];
    const hit = textFiles.filter(f => !KNOWN.includes(path.relative(ROOT, f)) && fs.readFileSync(f, 'utf8').toLowerCase().includes(WITHHELD));
    KNOWN.filter(f => fs.existsSync(path.join(ROOT, f)) && fs.readFileSync(path.join(ROOT, f), 'utf8').toLowerCase().includes(WITHHELD)).forEach(f => console.log('  note ' + f + ' still quotes the withheld name in its own instruction (flagged in the audit)'));
    if (hit.length) hit.forEach(f => fail('withheld family name found in ' + path.relative(ROOT, f))); else ok(`the withheld family name appears in none of ${textFiles.length} text files`);

    // ---------------------------------------------------------------- canvas at three widths
    for (const [w, h] of [[1440, 900], [1024, 768], [390, 844]]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: w < 800, isMobile: w < 800 });
        const page = await ctx.newPage();
        const errs = [];
        page.on('pageerror', e => errs.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
        await page.goto(base + PAGE, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => window.__tree && document.querySelectorAll('.card').length > 0);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(400);
        if (errs.length) fail(`${w}px: page errors: ${errs.join(' | ')}`); else ok(`${w}px: no page errors`);

        const over = await page.evaluate(() => {
            const out = [];
            document.querySelectorAll('.card').forEach(c => {
                [c, ...c.querySelectorAll('.c-name,.c-dis,.c-dates,.c-place,.c-foot')].forEach(n => {
                    if (n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1)
                        out.push(`${c.dataset.id} ${n.className} (${n.scrollWidth}x${n.scrollHeight} > ${n.clientWidth}x${n.clientHeight})`);
                });
            });
            return out;
        });
        if (over.length) over.forEach(o => fail(`${w}px overflow: ${o}`)); else ok(`${w}px: no card overflows (${people.length} cards)`);

        const chrome = await page.evaluate(() => ({ rail: document.querySelectorAll('#genrail > *').length, mini: !!document.getElementById('minimap'), vp: document.getElementById('viewpoint').options.length, s: window.__tree.S.s }));
        if (!chrome.rail || !chrome.mini || chrome.vp < 10) fail(`${w}px: generation rail, minimap or relationships selector missing ${JSON.stringify(chrome)}`);
        else ok(`${w}px: generation rail, minimap and "Relationships to" selector present; starting zoom ${Math.round(chrome.s * 100)}%`);
        if (w < 800 && chrome.s < 0.55) fail(`${w}px: starting zoom ${chrome.s} is too small to read`);

        if (w === 1440) {
            const conn = await page.evaluate(() => {
                const t = window.__tree, CW = t.CW, CH = t.CH, out = [], rects = {};
                Object.entries(t.L.pos).forEach(([id, p]) => { rects[id] = { x: p.x, y: p.y, w: CW, h: CH }; });
                const near = (a, b) => Math.abs(a - b) < 0.6;
                const pts = d => { const r = []; let x = 0, y = 0; (d.match(/[MVH][^MVH]*/g) || []).forEach(seg => { const c = seg[0], v = seg.slice(1).trim().split(/[\s,]+/).map(Number); if (c === 'M') { x = v[0]; y = v[1]; } else if (c === 'V') y = v[0]; else x = v[0]; r.push([x, y]); }); return r; };
                let n = 0;
                document.querySelectorAll('#links path.ln').forEach(path => {
                    const p = pts(path.getAttribute('d')); n++;
                    const a = p[0], z = p[p.length - 1];
                    const touches = pt => Object.keys(rects).filter(id => { const r = rects[id]; return pt[0] >= r.x - 0.6 && pt[0] <= r.x + r.w + 0.6 && pt[1] >= r.y - 0.6 && pt[1] <= r.y + r.h + 0.6 && (near(pt[0], r.x) || near(pt[0], r.x + r.w) || near(pt[1], r.y) || near(pt[1], r.y + r.h)); });
                    const endIds = touches(z);
                    for (let i = 1; i < p.length; i++) {
                        const [x1, y1] = p[i - 1], [x2, y2] = p[i];
                        Object.entries(rects).forEach(([id, r]) => {
                            const ix = Math.max(Math.min(x1, x2), r.x + 1.5) < Math.min(Math.max(x1, x2), r.x + r.w - 1.5);
                            const iy = Math.max(Math.min(y1, y2), r.y + 1.5) < Math.min(Math.max(y1, y2), r.y + r.h - 1.5);
                            const vx = x1 === x2 && x1 > r.x + 1.5 && x1 < r.x + r.w - 1.5 && iy;
                            const hy = y1 === y2 && y1 > r.y + 1.5 && y1 < r.y + r.h - 1.5 && ix;
                            if (vx || hy) out.push(`segment ${x1},${y1} to ${x2},${y2} crosses card ${id}`);
                        });
                    }
                    if (path.classList.contains('ln--bar')) {
                        if (!touches(a).length || !endIds.length) out.push('marriage bar not attached to two cards: ' + path.getAttribute('d'));
                    } else if (!endIds.length) out.push('connector ends on no card: ' + path.getAttribute('d'));
                });
                // every child with parents has exactly one incoming connector ending on its own card, starting at a parent
                t.D.people.forEach(p => {
                    if (!p.parents.length) return;
                    const r = rects[p.id];
                    const hits = Array.from(document.querySelectorAll('#links path.ln:not(.ln--bar)')).filter(path => { const q = pts(path.getAttribute('d')); const z = q[q.length - 1]; return z[0] >= r.x - 0.6 && z[0] <= r.x + r.w + 0.6 && z[1] >= r.y - 0.6 && z[1] <= r.y + r.h + 0.6; });
                    if (hits.length !== 1) out.push(`${p.id} has ${hits.length} incoming connectors`);
                    else {
                        const q = pts(hits[0].getAttribute('d'));
                        const parentsTop = q[0];
                        const ok = p.parents.some(pid => { const pr = rects[pid]; return parentsTop[1] >= pr.y && parentsTop[1] <= pr.y + pr.h + 0.6 && parentsTop[0] >= pr.x - 70 && parentsTop[0] <= pr.x + pr.w + 70; });
                        if (!ok) out.push(`${p.id}: connector does not start at a parent`);
                    }
                });
                // the framed Orkney group: every member inside the frame, no one else inside it
                const frames = Array.from(document.querySelectorAll('#links rect.ln--region'));
                t.D.people.forEach(p => {
                    const r = rects[p.id];
                    const inside = frames.some(f => { const fx = +f.getAttribute('x'), fy = +f.getAttribute('y'), fw = +f.getAttribute('width'), fh = +f.getAttribute('height'); return r.x >= fx && r.y >= fy && r.x + r.w <= fx + fw && r.y + r.h <= fy + fh; });
                    if (frames.length && !!p.region !== inside) out.push(`${p.id} is ${inside ? 'inside' : 'outside'} the Orkney frame`);
                });
                // the disputed link is drawn, dashed, and labelled on the canvas
                const disputed = document.querySelectorAll('#links path.ln--disputed').length, flags = Array.from(document.querySelectorAll('#links text.link-flag')).map(t => t.textContent);
                if (disputed !== 1 || flags.length !== 1 || flags[0] !== 'Disputed link') out.push(`expected one labelled disputed link, found ${disputed} lines and ${flags.length} labels`);
                return { out, n, frames: frames.length };
            });
            if (conn.out.length) conn.out.forEach(o => fail('connector: ' + o)); else ok(`all ${conn.n} connectors attach to the right cards and cross no card; the disputed Henry Warrender to Edward Dixon link is drawn dashed and labelled`);

            const missing = await page.evaluate(async (list) => {
                const out = [];
                for (const f of list) { const r = await fetch(encodeURI(f), { method: 'HEAD' }); if (!r.ok) out.push(f + ' ' + r.status); }
                return out;
            }, [...files]);
            if (missing.length) missing.forEach(m => fail('missing file: ' + m)); else ok(`all ${files.size} image, PDF and data file paths resolve`);

            const routeErrs = [];
            for (const p of people) {
                await page.evaluate(id => { location.hash = '#/person/' + id; }, p.id);
                await page.waitForFunction(id => { const d = document.getElementById('drawer'); return !d.hidden && d.classList.contains('is-expanded') && window.__tree.S.drawerFor === id && document.querySelector('#drawerBody .pf-name'); }, p.id, { timeout: 4000 }).catch(() => routeErrs.push(p.id + ' did not open'));
                const r = await page.evaluate(() => {
                    const h = document.querySelector('#drawerBody .pf-name');
                    const imgs = Array.from(document.querySelectorAll('#drawerBody img')).filter(i => !i.closest('.c-av, .ch-av') && !i.getAttribute('alt'));
                    const dead = Array.from(document.querySelectorAll('#drawerBody [data-scroll]')).filter(a => !document.getElementById(a.dataset.scroll)).map(a => a.dataset.scroll);
                    return { name: h && h.textContent, noalt: imgs.length, dead };
                });
                if (r.name !== p.displayName) routeErrs.push(`${p.id}: heading "${r.name}"`);
                if (r.noalt) routeErrs.push(`${p.id}: ${r.noalt} images without alt`);
                if (r.dead.length) routeErrs.push(`${p.id}: footnote targets missing ${r.dead.join(',')}`);
            }
            await page.evaluate(() => { history.pushState('', '', location.pathname); dispatchEvent(new HashChangeEvent('hashchange')); });
            if (routeErrs.length) routeErrs.forEach(e => fail('route: ' + e)); else ok(`all ${people.length} #/person/ routes open the full story in the expanded panel`);

            // lightbox: the wedding album's dedication page, with its transcription beside it
            await page.evaluate(() => { location.hash = '#/person/patricia-andrews'; });
            await page.waitForTimeout(400);
            await page.click('#pf-docs .gallery button');
            await page.waitForTimeout(300);
            const lb = await page.evaluate(() => ({ open: !document.getElementById('lightbox').hidden, alt: document.getElementById('lbImg').alt, text: (document.querySelector('.lb-text') || {}).textContent || '', src: document.getElementById('lbImg').getAttribute('src') }));
            if (!lb.open || !lb.alt || !/pictorial record/.test(lb.text)) fail('lightbox did not show the album page with its transcription ' + JSON.stringify(lb)); else ok('lightbox shows the album page with alt text and the transcription');
            await page.keyboard.press('Escape');

            // search finds people by a name variant
            await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
            const sr = [];
            for (const [q, id] of [['Herb.', 'herbert-andrews'], ['Ginger', 'cecil-8th'], ['Fitzmaurice', 'patricia-andrews'], ['Seb', 'sebastian-belfiore']]) {
                await page.fill('#search', q); await page.waitForTimeout(120);
                const got = await page.evaluate(() => Array.from(document.querySelectorAll('#searchResults li[data-id]')).map(li => li.dataset.id));
                if (!got.includes(id)) sr.push(`"${q}" did not find ${id} (${got.join(', ')})`);
            }
            await page.fill('#search', ''); await page.waitForTimeout(100);
            if (sr.length) sr.forEach(e => fail('search: ' + e)); else ok('search finds people by name variants and spellings');
        }

        if (w === 1440) {
            const rel = await page.evaluate(() => {
                const t = window.__tree, r = (a, b) => t.relInfo(a, b).label, out = [];
                const want = [
                    ['sebastian-belfiore', 'patricia-andrews', 'grandmother'], ['sebastian-belfiore', 'reg-fitzmaurice', 'great-grandfather'],
                    ['sebastian-belfiore', 'edward-dixon-fitzmaurice', 'great-great-grandfather'], ['sebastian-belfiore', 'herbert-andrews', 'great-uncle'],
                    ['sebastian-belfiore', 'bob-fitzmaurice', 'great-great-uncle'], ['sebastian-belfiore', 'max-austin', '1st cousin'],
                    ['enzo-belfiore', 'violet-belfiore', '1st cousin'], ['amanda-belfiore', 'robert-belfiore', 'husband'],
                    ['robert-belfiore', 'patricia-andrews', 'mother-in-law'], ['max-austin', 'lizzie-eley', 'partner'],
                    ['cecil-8th', 'edmond-7th', '1st cousin twice removed'], ['sebastian-belfiore', 'alex-belfiore', 'brother'],
                    ['venetia-austin', 'amanda-belfiore', 'sister'], ['reg-fitzmaurice', 'mrs-r-fitzmaurice', 'wife'],
                    ['kirkwall', 'lansdowne', 'uncle'], ['george-orkney', 'james-ii', '6× great-grandfather'],
                    ['sebastian-belfiore', 'james-ii', '17× great-grandfather'], ['sebastian-belfiore', 'henry-warrender', '3× great-grandfather'],
                    ['patricia-andrews', 'edmond-7th', 'great-uncle'], ['patricia-andrews', 'cecil-8th', '3rd cousin'], ['amanda-belfiore', 'cecil-8th', '3rd cousin once removed']];
                want.forEach(([a, b, l]) => { const g = r(a, b); if (g !== l) out.push(`${a} -> ${b}: "${g}", expected "${l}"`); });
                ['james-ii', 'edmond-7th', 'cecil-8th', 'henry-warrender'].forEach(id => { const notes = t.relNotes(t.relPath('sebastian-belfiore', id), t.relInfo('sebastian-belfiore', id)).join(' '); if (!/is disputed\. The 1890 London Gazette/.test(notes)) out.push(`Sebastian -> ${id}: the disputed link is not flagged (${notes})`); });
                if (t.relNotes(t.relPath('sebastian-belfiore', 'patricia-andrews'), t.relInfo('sebastian-belfiore', 'patricia-andrews')).some(n => /disputed/.test(n))) out.push('Sebastian -> Patricia should not mention the disputed link');
                if (t.relInfo('sebastian-belfiore', 'edith-madeleine-fitzmaurice').kind !== 'none') out.push('Edith should have no recorded link to Sebastian');
                let n = 0;
                t.D.people.forEach(a => t.D.people.forEach(b => { if (a.id === b.id) return; const i = t.relInfo(a.id, b.id); n++; if (i.kind !== 'none' && !i.label) out.push(`${a.id} -> ${b.id}: no label`); if (i.kind !== 'none' && !t.relPath(a.id, b.id)) out.push(`${a.id} -> ${b.id}: no path`); }));
                return { out, n };
            });
            if (rel.out.length) rel.out.forEach(o => fail('relationship: ' + o)); else ok(`relationship labels right for test pairs; all ${rel.n} pairs resolve`);

            await page.mouse.click(5, 300); await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
            await page.waitForTimeout(400);
            await page.evaluate(() => window.__tree.centerOn('robert-belfiore', 0.7, false));
            await page.waitForTimeout(250);
            const pts = await page.evaluate(() => { const d = document.querySelector('.card[data-id="sebastian-belfiore"] .c-link').getBoundingClientRect(), c = document.querySelector('.card[data-id="robert-belfiore"]').getBoundingClientRect(); return { x: d.x + d.width / 2, y: d.y + d.height / 2, tx: c.x + c.width / 2, ty: c.y + c.height / 2 }; });
            await page.mouse.move(pts.x, pts.y); await page.mouse.down();
            for (let i = 1; i <= 12; i++) { await page.mouse.move(pts.x + (pts.tx - pts.x) * i / 12, pts.y + (pts.ty - pts.y) * i / 12); await page.waitForTimeout(16); }
            await page.waitForTimeout(120);
            const mid = await page.evaluate(() => ({ bubble: document.getElementById('relBubble').innerText, line: !!document.getElementById('relLine').getAttribute('d') }));
            await page.mouse.up(); await page.waitForTimeout(350);
            const pop = await page.evaluate(() => ({ open: !document.getElementById('relPop').hidden, title: (document.getElementById('relPopTitle') || {}).textContent, text: document.getElementById('relPop').innerText }));
            const dErr = [];
            if (!/Father/.test(mid.bubble) || !mid.line) dErr.push('no live label or line while dragging: ' + JSON.stringify(mid));
            if (!pop.open || pop.title !== "Robert Belfiore is Sebastian's father.") dErr.push('popover: ' + JSON.stringify(pop.title));
            await page.keyboard.press('Escape'); await page.waitForTimeout(100);
            if (!(await page.evaluate(() => document.getElementById('relPop').hidden))) dErr.push('Escape did not close the popover');
            // keyboard: R, arrow up, Enter
            await page.keyboard.press('Escape');
            await page.evaluate(() => document.querySelector('.card[data-id="sebastian-belfiore"]').focus());
            await page.keyboard.press('r'); await page.keyboard.press('ArrowUp'); await page.keyboard.press('Enter'); await page.waitForTimeout(250);
            const kt = await page.evaluate(() => (document.getElementById('relPopTitle') || {}).textContent);
            if (!/is Sebastian's (father|mother)\.$/.test(kt || '')) dErr.push('keyboard compare: ' + kt);
            await page.keyboard.press('Escape');
            if (dErr.length) dErr.forEach(e => fail('drag: ' + e)); else ok('dragging a dot onto a card, and R + arrows + Enter, show the relationship');
        }

        // the panel: story button always visible, expands in place, arrows and prev/next move through the tree
        {
            await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
            await page.evaluate(() => window.__tree.select('reg-fitzmaurice', { open: true, center: true }));
            await page.waitForTimeout(400);
            const errsP = [];
            const vis = await page.evaluate(() => { const b = document.getElementById('drRead').getBoundingClientRect(), d = document.getElementById('drawer').getBoundingClientRect(); return b.height > 30 && b.top >= d.top && b.bottom <= Math.min(d.bottom, innerHeight) + 1; });
            if (!vis) errsP.push('read button not visible at the bottom of the panel');
            await page.evaluate(() => { document.getElementById('drawerBody').scrollTop = 99999; });
            const vis2 = await page.evaluate(() => { const b = document.getElementById('drRead').getBoundingClientRect(); return b.bottom <= innerHeight + 1 && b.height > 30; });
            if (!vis2) errsP.push('read button scrolls away');
            const href0 = page.url();
            await page.click('#drRead'); await page.waitForTimeout(450);
            const ex = await page.evaluate(() => ({ exp: document.getElementById('drawer').classList.contains('is-expanded'), w: document.getElementById('drawer').getBoundingClientRect().width, vw: innerWidth, name: (document.querySelector('#drawerBody .pf-name') || {}).textContent, path: location.pathname, secs: Array.from(document.querySelectorAll('#drawerBody section[id^="pf-"]')).map(s => s.id) }));
            if (!ex.exp || ex.name !== 'Reg FitzMaurice') errsP.push('read button did not expand the panel with the full story');
            if (w > 900 && ex.w < ex.vw * 0.7) errsP.push(`expanded panel only ${Math.round(ex.w)}px of ${ex.vw}px`);
            if (w < 800 && ex.w < ex.vw - 2) errsP.push(`expanded panel should be full screen on phones (${Math.round(ex.w)}px of ${ex.vw}px)`);
            if (new URL(href0).pathname !== ex.path) errsP.push('expanding changed the page');
            ['pf-story', 'pf-glance', 'pf-timeline', 'pf-docs', 'pf-family', 'pf-questions', 'pf-sources'].forEach(s => { if (!ex.secs.includes(s)) errsP.push('profile has no ' + s + ' section (' + ex.secs.join(',') + ')'); });
            await page.keyboard.press('ArrowRight'); await page.waitForTimeout(250);
            const r1 = await page.evaluate(() => window.__tree.S.drawerFor);
            const want = await page.evaluate(() => { const o = window.__tree.L.order; return o[o.indexOf('reg-fitzmaurice') + 1]; });
            if (r1 !== want) errsP.push(`right arrow went to ${r1}, expected ${want}`);
            await page.click('#drPrev'); await page.waitForTimeout(250);
            if (await page.evaluate(() => window.__tree.S.drawerFor) !== 'reg-fitzmaurice') errsP.push('previous button did not return to Reg');
            const prevName = await page.evaluate(() => document.getElementById('drPrevName').textContent + '|' + document.getElementById('drNextName').textContent);
            if (!/\w/.test(prevName.replace('|', ''))) errsP.push('previous and next buttons show no names');
            await page.keyboard.press('ArrowUp'); await page.waitForTimeout(250);
            const up = await page.evaluate(() => window.__tree.S.drawerFor);
            if (up !== 'edward-dixon-fitzmaurice') errsP.push(`up arrow went to ${up}, expected Edward Dixon FitzMaurice`);
            await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250);
            const down = await page.evaluate(() => window.__tree.S.drawerFor);
            if (!['bob-fitzmaurice', 'babs-fitzmaurice', 'reg-fitzmaurice'].includes(down)) errsP.push(`down arrow went to ${down}, expected a child of Edward Dixon`);
            const still = await page.evaluate(() => document.getElementById('drawer').classList.contains('is-expanded'));
            if (!still) errsP.push('panel collapsed while moving between people');
            await page.keyboard.press('Escape'); await page.waitForTimeout(200);
            const col = await page.evaluate(() => ({ exp: document.getElementById('drawer').classList.contains('is-expanded'), open: !document.getElementById('drawer').hidden, hash: location.hash }));
            if (col.exp || !col.open || col.hash) errsP.push('Escape should return to the summary and clear the hash');
            await page.keyboard.press('Escape'); await page.waitForTimeout(200);
            if (!(await page.evaluate(() => document.getElementById('drawer').hidden))) errsP.push('second Escape should close the panel');
            if (errsP.length) errsP.forEach(e => fail(`${w}px panel: ${e}`)); else ok(`${w}px: story button stays visible, expands in place, arrows and previous/next work, Esc steps back`);
        }

        // contrast: text 4.5:1 (3:1 if large), connector lines 3:1, measured on the rendered page
        if (w === 1440) {
            await page.evaluate(() => { location.hash = '#/person/ronald-andrews'; });
            await page.waitForTimeout(600);
            const con = await page.evaluate(() => {
                const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const v = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v.length > 3 ? v[3] : 1 }; };
                const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
                const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
                const blend = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
                const bgOf = el => { const stack = []; for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.backgroundImage !== 'none' && !/gradient/.test(cs.backgroundImage)) return null; const c = parse(cs.backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let out = { r: 255, g: 255, b: 255, a: 1 }; for (let i = stack.length - 1; i >= 0; i--) out = blend(stack[i], out); return out; };
                const out = [], seen = new Set(); let n = 0;
                const els = Array.from(document.querySelectorAll('.card, .card *, #drawer *, #legend *, #genrail *, .tree-head *, .toolbar *, .main-nav *, .conf, .tag'));
                els.forEach(el => {
                    if (!el.childNodes.length || !Array.from(el.childNodes).some(t => t.nodeType === 3 && t.textContent.trim())) return;
                    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
                    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
                    if (el.closest('.is-dim, [aria-hidden="true"]')) return;
                    const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) return;
                    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
                    const need = (size >= 24 || (bold && size >= 18.66)) ? 3 : 4.5;
                    const k = ratio(blend(fg, bg), bg); n++;
                    const key = el.className + '|' + cs.color + '|' + cs.backgroundColor;
                    if (k < need && !seen.has(key)) { seen.add(key); out.push(`${(el.className || el.tagName).toString().slice(0, 40)} "${el.textContent.trim().slice(0, 24)}" ${k.toFixed(2)}:1 (needs ${need})`); }
                });
                const canvasBg = bgOf(document.getElementById('viewport')) || { r: 248, g: 241, b: 228, a: 1 };
                const lines = {};
                document.querySelectorAll('#links path.ln, #links rect.ln--region').forEach(p => { const c = parse(getComputedStyle(p).stroke); if (c) { const k = ratio(c, canvasBg); const cls = p.getAttribute('class'); if (!(cls in lines) || k < lines[cls]) lines[cls] = k; } });
                Object.entries(lines).forEach(([cls, k]) => { if (k < 3) out.push(`line ${cls} ${k.toFixed(2)}:1 (needs 3)`); });
                return { out, n, lines };
            });
            if (con.out.length) con.out.forEach(o => fail('contrast: ' + o));
            else ok(`contrast: ${con.n} text elements meet 4.5:1 (3:1 large); lines ${Object.entries(con.lines).map(([c, k]) => c.replace('ln ', '') + ' ' + k.toFixed(1)).join(', ')}`);
            await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
        }

        if (SHOTS) {
            await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
            await page.click('#fit');
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(SHOTS, `fit-${w}.png`) });
            await page.goto(base + PAGE, { waitUntil: 'networkidle' });
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(SHOTS, `canvas-${w}.png`) });
            await page.evaluate(() => window.__tree.select('patricia-andrews', { open: true, center: true }));
            await page.waitForTimeout(700);
            await page.screenshot({ path: path.join(SHOTS, `drawer-${w}.png`) });
            await page.evaluate(() => { location.hash = '#/person/ronald-andrews'; });
            await page.waitForTimeout(1100);
            await page.screenshot({ path: path.join(SHOTS, `expanded-${w}.png`) });
            await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
            await page.evaluate(() => window.__tree.centerOn('edmond-7th', 0.75, false));
            await page.waitForTimeout(400);
            await page.screenshot({ path: path.join(SHOTS, `orkney-${w}.png`) });
        }
        await ctx.close();
    }

    // ---------------------------------------------------------------- internal links on every page
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const pages = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
    const linkErrs = [];
    for (const f of pages) {
        await page.goto(base + f, { waitUntil: 'domcontentloaded' });
        const links = await page.evaluate(() => Array.from(document.querySelectorAll('a[href], img[src], iframe[src], link[rel=stylesheet][href], script[src]'))
            .map(n => n.getAttribute('href') || n.getAttribute('src')).filter(h => h && !/^(https?:|mailto:|data:|#\/|tel:|javascript:)/.test(h)));
        for (const l of new Set(links)) {
            const [file, hash] = l.split('#');
            if (file) {
                const r = await page.evaluate(async u => (await fetch(u, { method: 'HEAD' })).status, new URL(l, base + f).href.split('#')[0]);
                if (r !== 200) linkErrs.push(`${f}: ${l} -> ${r}`);
            }
            if (hash && !hash.startsWith('/')) {
                const target = file || f;
                await page.goto(base + target, { waitUntil: 'domcontentloaded' });
                const has = await page.evaluate(h => !!document.getElementById(h), hash);
                if (!has) linkErrs.push(`${f}: ${l} -> no element #${hash}`);
                await page.goto(base + f, { waitUntil: 'domcontentloaded' });
            }
        }
    }
    if (linkErrs.length) linkErrs.forEach(e => fail('link: ' + e)); else ok(`internal links resolve on ${pages.length} pages`);

    await browser.close();
    srv.close();
    console.log(failures.length ? `\n${failures.length} problem(s) found.` : '\nAll checks passed.');
    process.exit(failures.length ? 1 : 0);
})();
