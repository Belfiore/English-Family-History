/* Checks for Stuart, the family archivist (ask.html and the Ask Stuart button).
 *
 *   node tests/verify-archive.js           everything
 *   SHOTS=1 node tests/verify-archive.js   also writes screenshots to tests/screenshots/ask-*.png
 *   QUICK=1 node tests/verify-archive.js   the Node checks only (no browser)
 *
 * Part 1, in Node: the archive index is up to date and keeps living people private; the genealogy engine on
 * made-up families and on the real tree (and agrees with the family tree page on every pair); the question
 * benchmark in tests/archive-eval.json; the checks kept for written answers, should they come back.
 * Part 2, in a browser: Stuart's page (choosing who you are, answers about you, sources, follow-ups, choosing
 * between people, a visitor), the button, window and drawer on the story pages, following links, safety against
 * injected markup, phones, the home page and the family tree link.
 */
const fs = require('fs'), path = require('path'), http = require('http'), cp = require('child_process');
const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.SHOTS ? path.join(__dirname, 'screenshots') : null;
let failures = 0;
const ok = m => console.log('  ok   ' + m);
const fail = m => { failures++; console.log('  FAIL ' + m); };
const check = (c, m, detail) => c ? ok(m) : fail(m + (detail ? ': ' + detail : ''));
const section = t => console.log('\n' + t);

const Kin = require(path.join(ROOT, 'archive-kin.js'));
const Core = require(path.join(ROOT, 'archive-core.js'));
const Dt = require(path.join(ROOT, 'archive-dates.js'));

function loadKb() {
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'archive/manifest.json')));
    return { man, kb: JSON.parse(fs.readFileSync(path.join(ROOT, 'archive', man.kb))) };
}

// ------------------------------------------------------------------ part 1
section('Archive index');
const fresh = cp.spawnSync('python3', [path.join(ROOT, 'tools/build-archive.py'), '--check'], { encoding: 'utf8' });
check(fresh.status === 0, 'archive index matches data/*.json and the story pages', (fresh.stdout + fresh.stderr).trim());
const { man, kb } = loadKb();
const byId = {}; kb.people.forEach(p => { byId[p.id] = p; });
const rawPeople = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/people.json'))).people;
const living = kb.people.filter(p => p.living);
const leaks = living.filter(p => ['birth', 'death', 'burial', 'story', 'summary', 'residences', 'occupations', 'facts', 'timeline', 'media', 'voyages'].some(k => p[k] != null));
check(living.length === rawPeople.filter(p => p.isLiving).length && !leaks.length, `${living.length} living people carry a name and family links only`, leaks.map(p => p.id).join(', '));
const orkney = kb.people.filter(p => rawPeople.find(r => r.id === p.id).region === 'orkney').map(p => p.id);
check(orkney.length === 1 && orkney[0] === 'cecil-8th', 'the Orkney line is left out, except Cecil', orkney.join(', '));
const bad = [];
kb.people.forEach(p => {
    p.parents.concat(p.children).concat(p.spouses.map(s => s.id)).forEach(id => { if (!byId[id]) bad.push(p.id + ' -> ' + id); });
    const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o.sources)) o.sources.forEach(s => { if (!kb.sources.find(x => x.id === s)) bad.push(p.id + ' source ' + s); }); Object.values(o).forEach(walk); };
    walk(p);
});
check(!bad.length, 'every person, family link and source in the index resolves', bad.slice(0, 5).join('; '));
const text = JSON.stringify(kb);
check(!/[\u2014\u2013]/.test(text), 'no em or en dashes in the index');
check(kb.sections.length > 80 && kb.photos.length > 50 && kb.examples.length >= 6, `${kb.sections.length} page sections, ${kb.photos.length} captioned images, ${kb.examples.length} starter questions`);
const anchors = {};
const missingAnchor = [];
kb.sections.concat(kb.photos).forEach(s => {
    const [file, hash] = s.url.split('#');
    if (!fs.existsSync(path.join(ROOT, file))) { missingAnchor.push(s.url); return; }
    if (hash) { anchors[file] = anchors[file] || fs.readFileSync(path.join(ROOT, file), 'utf8'); if (anchors[file].indexOf('id="' + hash + '"') < 0) missingAnchor.push(s.url); }
});
check(!missingAnchor.length, 'every section and image link goes to a real page and anchor', missingAnchor.slice(0, 5).join(', '));

section('Genealogy engine on made-up families');
const P = (id, sex, parents = [], spouses = [], extra = {}) => Object.assign({ id, name: id, sex, parents, children: [], spouses: spouses.map((s, i) => typeof s === 'string' ? { id: s, order: i + 1 } : s) }, extra);
const fam = [
    P('gg', 'M', [], ['ggw']), P('ggw', 'F', [], ['gg']),
    P('g1', 'M', ['gg', 'ggw'], ['g1w']), P('g1w', 'F', [], ['g1']), P('g2', 'F', ['gg', 'ggw']),
    P('a', 'M', ['g1', 'g1w'], ['aw', 'aw2']), P('aw', 'F', [], ['a']), P('aw2', 'F', [], ['a']),
    P('b', 'F', ['g2']), P('c', 'M', ['a', 'aw']), P('h', 'F', ['a', 'aw2']), P('d', 'F', ['b']),
    P('e', 'M', ['c'], [{ id: 'ep', relation: 'partner' }]), P('ep', 'F', [], [{ id: 'e', relation: 'partner' }]),
    P('lone', 'M'), P('stepkid', 'M', ['aw2'])
];
fam.forEach(p => { p.children = fam.filter(c => c.parents.includes(p.id)).map(c => c.id); });
const K = Kin.create(fam);
const cases = [
    ['c', 'a', 'father'], ['a', 'c', 'son'], ['c', 'g1', 'grandfather'], ['c', 'gg', 'great-grandfather'], ['e', 'gg', 'great-great-grandfather'],
    ['c', 'h', 'half-sister'], ['a', 'b', '1st cousin'], ['c', 'b', '1st cousin once removed'], ['c', 'd', '2nd cousin'], ['e', 'd', '2nd cousin once removed'],
    ['c', 'g2', 'great-aunt'], ['g2', 'c', 'grand-nephew'], ['b', 'a', '1st cousin'], ['a', 'aw', 'first wife'], ['a', 'aw2', 'second wife'],
    ['e', 'ep', 'partner'], ['c', 'aw2', 'stepmother'], ['aw', 'g1', 'father-in-law'], ['g1', 'aw', 'daughter-in-law'], ['c', 'lone', null],
    ['h', 'stepkid', 'brother'], ['a', 'stepkid', 'stepson'], ['aw', 'stepkid', 'related by marriage']
];
// h and stepkid share a mother, and stepkid's father is not recorded: the engine says brother, as the tree does,
// rather than guessing half-brother. A half relation is named only when both sides have two recorded parents.
const kbad = cases.filter(([a, b, want]) => K.relate(a, b).label !== want).map(([a, b, want]) => `${a}->${b}: "${K.relate(a, b).label}" not "${want}"`);
check(!kbad.length, `${cases.length} made-up relationships, including half, step, in-law, partner, cousins removed and no link`, kbad.join('; '));
const chainP = K.relate('c', 'gg').path.map(s => s.id).join('>');
check(chainP === 'c>a>g1>gg', 'the path runs up the parent line to the common ancestor', chainP);
check(K.relate('c', 'b').commons.join(',') === 'gg,ggw' && K.relate('c', 'b').m === 3, 'common ancestors and generation counts are returned');
check(K.siblings('c').filter(s => s.half).map(s => s.id).join() === 'h', 'half-siblings are told apart from full siblings');
check(K.ofRelation('d', 'aunts-uncles').length === 0 && K.ofRelation('a', 'cousins').join() === 'b' && K.ofRelation('c', 'cousins').length === 0 && K.ofRelation('c', 'grandparents').sort().join() === 'g1,g1w', 'aunts, cousins and grandparents only where the links exist');
check(K.line('e', 'paternal').join('>') === 'c>a>g1>gg' && K.line('d', 'maternal').join('>') === 'b>g2>ggw', 'paternal and maternal lines');
check(K.descendants('gg').length === 8 && K.ancestors('e').length === 7, 'ancestors and descendants are counted from the links');
check(K.relate('c', 'nobody').kind === 'unknown', 'an unknown person is reported as unknown, not guessed');

section('Genealogy engine on the real tree');
const RK = Kin.create(kb.people);
const real = [
    ['sebastian-belfiore', 'patricia-andrews', 'grandmother'], ['sebastian-belfiore', 'reg-fitzmaurice', 'great-grandfather'],
    ['sebastian-belfiore', 'edward-dixon-fitzmaurice', 'great-great-grandfather'], ['sebastian-belfiore', 'herbert-andrews', 'great-uncle'],
    ['sebastian-belfiore', 'bob-fitzmaurice', 'great-great-uncle'], ['sebastian-belfiore', 'max-austin', '1st cousin'],
    ['patricia-andrews', 'john-fitzmaurice', 'great-great-grandfather'], ['ronald-andrews', 'annie-bennett', 'grandmother by marriage'],
    ['robert-belfiore', 'patricia-andrews', 'mother-in-law'], ['reg-fitzmaurice', 'mrs-r-fitzmaurice', 'wife'], ['venetia-austin', 'amanda-belfiore', 'sister'],
    ['sebastian-belfiore', 'edith-madeleine-fitzmaurice', 'great-great-grandmother'], ['patricia-andrews', 'eileen-sybil-fitzmaurice', 'aunt']
];
const rbad = real.filter(([a, b, w]) => RK.relate(a, b).label !== w).map(([a, b, w]) => `${a}->${b}: "${RK.relate(a, b).label}" not "${w}"`);
check(!rbad.length, `${real.length} relationships on the real tree`, rbad.join('; '));
check(RK.relate('patricia-andrews', 'cecil-8th').kind === 'none', 'Cecil has no proven link to Grandma Pat');
const weak = RK.relate('patricia-andrews', 'john-fitzmaurice').weak.map(w => w.child);
check(weak.includes('reg-fitzmaurice') && weak.includes('edward-dixon-fitzmaurice'), 'probable parent links in a chain are reported', weak.join(','));

section('Dates and ages');
const age = (b, e) => Dt.ageText(Dt.age(b, e));
check(age({ from: '1872-10-21', to: '1872-10-21', precision: 'day' }, { from: '1928-06-07', to: '1928-06-07', precision: 'day' }) === '55', 'exact dates give an exact age');
check(age({ from: '1849-01-01', to: '1851-12-31', precision: 'range' }, { from: '1925-12-05', to: '1925-12-05', precision: 'day' }) === 'between 73 and 76', 'a birth known only as a range gives a range of ages');
check(age({ from: '1904-05-26', to: '1904-05-26', precision: 'day' }, { from: '1927-10-01', to: '1927-12-31', precision: 'quarter' }) === 'about 23', 'a quarter-year date is never shown as an exact age');
check(JSON.stringify(Dt.period('who was born in the 1880s')) === JSON.stringify({ from: 1880, to: 1889, text: 'the 1880s' }) && Dt.period('during the second world war').from === 1939, 'decades and named periods are read from questions');

section('Question benchmark (quick answers)');
const A = Core.create(kb);
const evalSet = JSON.parse(fs.readFileSync(path.join(__dirname, 'archive-eval.json'))).questions;
const name = id => A.nameOf(id);
const plain = r => [].concat(r.paras, r.bullets || [], r.paras2 || [], r.after ? r.after.bullets : [], (r.list || []).map(x => name(x.id) + ' ' + (x.note || '')), (r.choices || []).map(c => name(c.id)), r.diagram ? [r.diagram.summary] : [])
    .join(' ').replace(/\{\{p:([a-z0-9-]+)\}\}/g, (m, id) => name(id));
const byCat = {}, failed = [];
let citeBad = 0, cites = 0;
const t0 = Date.now();
evalSet.forEach(item => {
    let convo = { history: [], pins: {} };
    const step = (q, c) => { const r = A.ask(q, c); return { r, c: { pins: c.pins, focus: r.state.focus, family: r.state.family, period: r.state.period, last: r.state.last, history: c.history.concat([{ q, a: plain(r) }]) } }; };
    let res;
    (item.after || []).forEach(q => { res = step(q, convo); convo = res.c; });
    if (item.pick != null && res && res.r.choices) { const ch = res.r.choices[item.pick]; convo.pins = Object.assign({}, convo.pins, { [ch.pin.text]: ch.pin.id }); res = step(ch.q, convo); convo = res.c; }
    const r = A.ask(item.q, convo);
    const t = plain(r), why = [];
    (item.all || []).forEach(s => { if (t.indexOf(s) < 0) why.push('missing "' + s + '"'); });
    if (item.any && !item.any.some(s => t.indexOf(s) >= 0)) why.push('none of ' + item.any.join(' / '));
    (item.none || []).forEach(s => { if (new RegExp(s).test(t)) why.push('should not match ' + s); });
    if (item.type && r.type !== item.type) why.push('type ' + r.type + ', expected ' + item.type);
    const insufficient = ['none', 'clarify'].indexOf(r.confidence) >= 0 || ['not-found', 'out-of-scope', 'meta', 'clarify'].indexOf(r.type) >= 0;
    if (item.insufficient && !insufficient) why.push('should say the records cannot answer, or ask which person');
    if (!item.insufficient && insufficient && r.confidence !== 'private') why.push('said it could not answer (' + r.type + ')');
    if (item.people) item.people.forEach(id => { if (r.analysis.people.indexOf(id) < 0 && r.focus.indexOf(id) < 0) why.push('did not read the question as about ' + id); });
    if (item.minSources && r.evidence.length < item.minSources) why.push(r.evidence.length + ' sources');
    if (item.minPhotos && (r.photos || []).length < item.minPhotos) why.push('no photographs');
    if (item.sourceUrl && !r.evidence.some(e => String(e.url).indexOf(item.sourceUrl) === 0)) why.push('no link to ' + item.sourceUrl);
    // every [n] in the answer points at a listed source; every source has a working link
    const refs = (t.match(/\[(\d+)\]/g) || []).map(x => +x.slice(1, -1));
    cites += refs.length;
    refs.forEach(n => { if (n < 1 || n > r.evidence.length) { citeBad++; why.push('citation [' + n + '] has no source'); } });
    r.evidence.forEach(e => { if (!e.url) return; const f = String(e.url).split(/[?#]/)[0]; if (!/^https?:/.test(e.url) && !fs.existsSync(path.join(ROOT, f))) { citeBad++; why.push('source link ' + e.url + ' is missing'); } });
    const c = byCat[item.cat] = byCat[item.cat] || { n: 0, pass: 0 };
    c.n++; if (!why.length) c.pass++; else failed.push(item.id + ' "' + item.q + '": ' + why.join('; '));
});
const ms = Date.now() - t0;
const total = evalSet.length, passed = total - failed.length;
console.log('  ' + Object.keys(byCat).map(k => k + ' ' + byCat[k].pass + '/' + byCat[k].n).join(', '));
failed.forEach(f => fail(f));
check(passed === total, `${passed} of ${total} benchmark questions answered correctly (${Math.round(ms / total)} ms each on average)`);
check(!citeBad, `all ${cites} citations point to a listed source with a working link`);
// how each later round of questions fared the first time it was asked (judged by hand, recorded in the question set)
const rounds = {};
evalSet.forEach(q => { const k = 'round ' + (q.round || 1); const x = rounds[k] = rounds[k] || { questions: 0, now: 0 }; x.questions++; if (!failed.some(f => f.startsWith(q.id + ' '))) x.now++; if (q.firstRun) x[q.firstRun] = (x[q.firstRun] || 0) + 1; });
console.log('  ' + Object.keys(rounds).map(k => k + ': ' + rounds[k].questions + (rounds[k].right != null ? ' (first run: ' + rounds[k].right + ' right, ' + (rounds[k].partly || 0) + ' partly, ' + (rounds[k].wrong || 0) + ' wrong)' : ' (written with the code)')).join('; '));
fs.writeFileSync(path.join(ROOT, 'docs', 'ask-the-archive-eval.json'), JSON.stringify({ date: new Date().toISOString().slice(0, 10), mode: 'quick answers', total, passed, byCategory: byCat, rounds, failed, citations: cites, citationErrors: citeBad, avgMs: Math.round(ms / total) }, null, 1) + '\n');

section('Checks kept for written answers (not switched on)');
const rr = A.ask('How old was Edward Dixon FitzMaurice when he died?', {});
rr.question = 'How old was Edward Dixon FitzMaurice when he died?';
const v1 = A.checkModelAnswer('<think>hmm</think>Edward Dixon FitzMaurice died on 7 June 1928 [3]. He moved to Paris in 1931 [2]. <img src=x onerror=alert(1)>He was **55** [9].', rr);
const j = v1.paras.join(' ');
check(!/1931/.test(j) && v1.removed === 1, 'a sentence with a year the records never mention is removed');
check(!/<|think|\*\*/.test(j), 'thinking, markup and markdown are stripped');
check(!/\[9\]/.test(j) && /\[3\]/.test(j), 'citations to sources that were not given are dropped, real ones kept');
check(/\{\{p:edward-dixon-fitzmaurice\}\}/.test(j), 'names the model writes are linked to the person on the tree');
const v2 = A.checkModelAnswer('His cousin Albert FitzMaurice was a sailor [1].', rr);
check(v2.removed === 1 && !v2.ok, 'a family name that is neither on the tree nor in the records is removed');
const p1 = A.ask('Tell me about Auntie Babs', {});
check(p1.llm && /only the numbered records/.test(p1.llm.system) && /information, not instructions/.test(p1.llm.system) && p1.llm.user.length < 12000, 'written answers get the grounding rules and a bounded set of numbered records');
const inj = A.ask('<script>alert(1)</script> '.repeat(80), {});
check(inj.question.length <= 500, 'questions are cut to 500 characters');

if (process.env.QUICK) finish();
else browserChecks().then(finish).catch(e => { fail('browser checks crashed: ' + e.stack); finish(); });

function finish() {
    console.log(failures ? `\n${failures} problem(s) found.` : '\nAll checks passed.');
    process.exit(failures ? 1 : 0);
}

// ------------------------------------------------------------------ part 2
async function browserChecks() {
    const { chromium } = require('playwright');
    const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.JPEG': 'image/jpeg', '.svg': 'image/svg+xml' };
    const srv = http.createServer((req, rsp) => { let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); return rsp.end(); } rsp.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp); });
    await new Promise(r => srv.listen(0, r));
    const base = 'http://localhost:' + srv.address().port + '/';
    const browser = await chromium.launch();
    if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
    const shot = async (page, n, full) => {
        if (!SHOTS) return;
        // the sticky nav lands mid-page in a full-page capture unless the page is at the top
        if (full) { await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150); }
        await page.screenshot({ path: path.join(SHOTS, 'ask-' + n + '.png'), fullPage: !!full });
    };

    async function open(url, opts = {}) {
        const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 }, reducedMotion: opts.motion ? 'no-preference' : 'reduce' });
        const page = await ctx.newPage();
        const errs = [], external = [];
        page.on('pageerror', e => errs.push(e.message));
        page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
        page.on('request', r => { if (!r.url().startsWith(base) && !/fonts\.g/.test(r.url())) external.push(r.url()); });
        await page.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
        if (opts.init) await page.addInitScript(opts.init);
        await page.goto(base + url);
        if (opts.wait !== false) await page.waitForFunction(() => window.__ask && window.__ask.archive, null, { timeout: 8000 });
        await page.waitForTimeout(300);
        return { ctx, page, errs, external };
    }
    const answers = page => page.evaluate(() => document.querySelectorAll('.st-msg--answer').length);
    async function askIt(page, q) {
        const n = await answers(page);
        await page.fill('.st-input', q);
        await page.keyboard.press('Enter');
        await page.waitForFunction(k => document.querySelectorAll('.st-msg--answer').length === k + 1, n, { timeout: 6000 });
        return page.evaluate(() => { const a = [...document.querySelectorAll('.st-msg--answer')].pop(); return a.textContent; });
    }

    section('Stuart on his own page');
    let s = await open('ask.html', { motion: true });
    let page = s.page;
    await page.waitForSelector('.st-pick-input');
    const first = await page.evaluate(() => ({
        hero: (document.querySelector('.st-hero-name') || {}).textContent, intro: document.querySelector('.st-msg--intro').textContent,
        locked: document.querySelector('.st-input').disabled, nav: !!document.querySelector('.nav-links a.active[href="ask.html"]'),
        options: document.querySelectorAll('.st-pick-opt').length, combo: document.querySelector('.st-pick-input').getAttribute('role')
    }));
    check(/Ask Stuart/.test(first.hero) && /I'm Stuart/.test(first.intro) && first.nav, 'Stuart introduces himself at the top of the page');
    check(first.locked && /who are you/i.test(first.intro), 'Stuart asks who you are before the question box opens');
    await page.waitForTimeout(900);
    await shot(page, 'intro');
    await page.fill('.st-pick-input', 'ven');
    await page.waitForTimeout(150);
    const ta = await page.evaluate(() => [...document.querySelectorAll('.st-pick-opt')].map(o => o.textContent));
    check(first.combo === 'combobox' && ta.length === 1 && /Venetia Andrews Austin/.test(ta[0]) && /Grandma Pat and Grandpa Ron's daughter/.test(ta[0]), 'typing part of a name finds the person, with how they fit in the family');
    await shot(page, 'typeahead');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.st-msg--greet');
    await page.waitForTimeout(700);
    const hi = await page.evaluate(() => ({ greet: document.querySelector('.st-msg--greet').textContent, open: !document.querySelector('.st-input').disabled, who: document.querySelector('.st-who').textContent, stored: localStorage.getItem('stuart.me') }));
    check(/Venetia/.test(hi.greet) && /Who were my grandparents/.test(hi.greet) && hi.open && /Venetia Andrews Austin/.test(hi.who) && /venetia-austin/.test(hi.stored), 'after choosing, Stuart greets you by name with questions about your own family, and the question box opens');
    await shot(page, 'greeting');
    let t = await askIt(page, "Who was my grandpa's grandpa?");
    check(/Your grandfathers' grandfathers were/.test(t) && /Robert W. FitzMaurice/.test(t) && /George Andrews/.test(t), '"my grandpa\'s grandpa" is worked out from the person you are');
    t = await askIt(page, 'How am I related to Edward Dixon FitzMaurice?');
    check(/Edward Dixon FitzMaurice was your great-grandfather/.test(t), '"How am I related to" answers from you');
    const rel = await page.evaluate(() => {
        const a = [...document.querySelectorAll('.st-msg--answer')].pop();
        const cite = a.querySelector('.st-cite');
        return { you: !!a.querySelector('.st-chain .is-you'), chain: a.querySelectorAll('.st-chain-who').length, cite: cite && cite.getAttribute('href'), open: a.querySelector('.st-sources').classList.contains('is-open'), people: a.querySelectorAll('a.st-person[href^="family-tree.html#/person/"]').length };
    });
    check(rel.you && rel.chain === 4, 'the line from you to them is drawn, starting from you');
    check(rel.people >= 3, 'names link to each person on the family tree');
    await page.click('.st-msg--answer:last-child .st-cite');
    await page.waitForTimeout(400);
    check(!rel.open && await page.evaluate(() => [...document.querySelectorAll('.st-msg--answer')].pop().querySelector('.st-sources').classList.contains('is-open')), 'sources are folded away until a citation or "Where this comes from" opens them');
    await page.waitForFunction(() => /Stuart answered/.test(document.querySelector('.st-sr[role=status]').textContent), null, { timeout: 2000 }).catch(() => {});
    check(/Stuart answered/.test(await page.evaluate(() => document.querySelector('.st-sr[role=status]').textContent)), 'each answer is announced to screen readers once');
    await shot(page, 'relationship');
    await page.click('.st-msg--answer:last-child .st-chips .st-chip');
    await page.waitForFunction(() => document.querySelectorAll('.st-msg--answer').length === 3);
    check(true, 'a suggested follow-up asks itself');
    await page.fill('.st-input', 'Tell me about Edith');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.st-chips--choose .st-chip');
    await page.click('.st-chips--choose .st-chip >> nth=1');
    await page.waitForFunction(() => document.querySelectorAll('.st-msg--answer').length === 5);
    const pinned = await page.evaluate(() => [...document.querySelectorAll('.st-msg--answer')].pop().textContent);
    check(/Edith Marjorie/.test(pinned) && /1899|1900/.test(pinned), 'when a name is shared, Stuart asks which person, and answers about the one chosen');
    t = await askIt(page, 'Which family members went to South Africa?');
    await shot(page, 'historical', true);
    // injected markup is shown as text, never run
    await page.fill('.st-input', '<img src=x onerror="window.__xss=1"> Who was Reg?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.st-msg--answer').length === 7);
    const xss = await page.evaluate(() => ({ flag: window.__xss, imgs: [...document.querySelectorAll('.st-bubble img, .st-body img')].filter(i => i.getAttribute('src') === 'x').length }));
    check(!xss.flag && !xss.imgs, 'markup typed into a question is shown as text and never runs');
    // the conversation carries on after a reload
    await page.reload();
    await page.waitForFunction(() => document.querySelectorAll('.st-msg--answer').length === 7, null, { timeout: 8000 });
    check(true, 'the conversation is still there after going to another page and coming back');
    await page.click('.st-who .st-link >> text=New conversation');
    check(await page.evaluate(() => !document.querySelector('.st-msg--answer') && !!document.querySelector('.st-msg--greet')), 'a new conversation clears the answers and keeps who you are');
    await page.click('.st-who .st-link >> text=Change');
    await page.waitForSelector('.st-pick-input');
    await page.click('.st-pick-visitor');
    await page.waitForSelector('.st-msg--greet >> nth=1');
    t = await askIt(page, 'Why did Ron emigrate to Australia?');
    check(/do not show Ronald Andrews in Australia/.test(t), 'a visitor not on the tree can ask too, and a false premise is answered plainly');
    await shot(page, 'missing-information');
    check(!s.errs.length, 'no page errors', s.errs.join(' | '));
    check(!s.external.length, 'nothing is requested from anywhere but this site', s.external.slice(0, 2).join(', '));
    await s.ctx.close();

    section('The evaluation page');
    s = await open('tests/archive-eval.html', { wait: false });
    page = s.page;
    await page.waitForFunction(() => !document.getElementById('runQuick').disabled);
    await page.click('#runQuick');
    const evq = await page.textContent('#summary');
    check(new RegExp('Quick answers: ' + total + ' of ' + total + ' pass').test(evq), 'tests/archive-eval.html runs the question set in the browser and agrees with this script', evq.slice(0, 120));
    check(!s.errs.length, 'no page errors on the evaluation page', s.errs.join(' | '));
    await s.ctx.close();

    section('Ask Stuart on the story pages');
    s = await open('falcke.html', { wait: false, motion: true, init: () => { localStorage.setItem('stuart.me', JSON.stringify('venetia-austin')); } });
    page = s.page;
    await page.waitForSelector('.st-launch');
    await page.waitForTimeout(1200);
    await page.hover('.st-launch');
    await page.waitForTimeout(400);
    const tip = await page.evaluate(() => { const t = document.querySelector('.st-tip'); return { text: t.textContent, shown: getComputedStyle(t).opacity === '1' }; });
    check(tip.shown && /family archivist/.test(tip.text) && /where each fact comes from/.test(tip.text), 'hovering over "Ask Stuart" explains what he does');
    await shot(page, 'launcher');
    await page.click('.st-launch');
    await page.waitForSelector('.st-panel.is-open .st-msg--greet');
    await page.waitForTimeout(800);
    const fl = await page.evaluate(() => { const p = document.querySelector('.st-panel'); const r = p.getBoundingClientRect(); return { mode: p.dataset.mode, w: r.width, right: innerWidth - r.right, greet: p.querySelector('.st-msg--greet').textContent }; });
    check(fl.mode === 'float' && fl.w < 480 && fl.right < 40, 'Ask Stuart opens as a window in the bottom right-hand corner');
    check(/Welcome back, Venetia/.test(fl.greet) && /Falcke and FitzMaurice/.test(fl.greet) && /How am I related to/.test(fl.greet), 'Stuart knows who you are and which page you are reading, and suggests questions about the people on it');
    await shot(page, 'window');
    await page.click('.st-head-tools button >> nth=0');
    await page.waitForTimeout(600);
    const dr = await page.evaluate(() => { const p = document.querySelector('.st-panel'); const r = p.getBoundingClientRect(); return { mode: p.dataset.mode, h: r.height, stored: localStorage.getItem('stuart.mode') }; });
    check(dr.mode === 'drawer' && dr.h >= 890 && /drawer/.test(dr.stored), 'the window can become a drawer down the side, and stays that way');
    await page.fill('.st-panel .st-input', 'When did the Falckes come to England?');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.st-panel .st-msg--answer');
    await page.waitForTimeout(700);
    await shot(page, 'drawer');
    // an answer that points to this page scrolls to the place and highlights it
    const here = await page.evaluate(() => { const a = [...document.querySelectorAll('.st-panel a')].find(x => /^falcke\.html#/.test(x.getAttribute('href'))); return a ? a.getAttribute('href') : null; });
    if (here) {
        const y0 = await page.evaluate(() => scrollY);
        await page.evaluate(h => { const a = [...document.querySelectorAll('.st-panel a')].find(x => x.getAttribute('href') === h); const box = a.closest('.st-sources'); if (box) box.dispatchEvent(new CustomEvent('st-open')); a.click(); }, here);
        await page.waitForTimeout(900);
        const moved = await page.evaluate(() => ({ y: scrollY, flash: !!document.querySelector('.st-flash'), url: location.pathname }));
        check(moved.url.endsWith('falcke.html') && moved.flash && moved.y !== y0, 'a link to this page scrolls to the right section and highlights it, without leaving the page');
    } else check(false, 'an answer about this page links to a section of it');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    check(await page.evaluate(() => document.querySelector('.st-panel').hidden && document.activeElement === document.querySelector('.st-launch')), 'Escape closes Stuart and puts the focus back on the button');
    check(!s.errs.length, 'no page errors on a story page', s.errs.join(' | '));
    // the chat follows you to another page
    await page.click('.st-launch');
    await page.waitForSelector('.st-panel.is-open');
    await page.evaluate(() => { const a = document.querySelector('.st-panel a.st-person'); a.click(); });
    await page.waitForURL(/family-tree\.html/);
    await page.goto(base + 'bennett.html');
    await page.waitForSelector('.st-panel.is-open .st-msg--answer', { timeout: 8000 });
    check(true, 'after following a link, Stuart opens again on the next page with the conversation carried on');
    await s.ctx.close();

    section('Phone, home page and family tree');
    s = await open('ask.html?q=' + encodeURIComponent('Who were Reg FitzMaurice\'s grandparents?'), { viewport: { width: 390, height: 844 }, init: () => { localStorage.setItem('stuart.me', JSON.stringify('visitor')); } });
    page = s.page;
    await page.waitForSelector('.st-msg--answer');
    const mob = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, btn: document.querySelector('.st-send').getBoundingClientRect().height, text: document.querySelector('.st-msg--answer').textContent }));
    check(mob.over <= 1 && mob.btn >= 40 && /Robert W. FitzMaurice/.test(mob.text), 'on a phone nothing runs off the side, and a question in the link is asked straight away');
    const csp = await page.evaluate(() => (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '');
    check(/script-src 'self'/.test(csp) && /connect-src 'self'/.test(csp) && !/script-src[^;]*unsafe/.test(csp) && !/huggingface/.test(csp), 'the page only runs its own scripts and only talks to this site');
    check(!s.errs.length, 'no page errors or blocked resources on a phone', s.errs.join(' | '));
    await shot(page, 'mobile', true);
    await page.click('#navToggle');
    check(await page.evaluate(() => document.getElementById('navLinks').classList.contains('open')), 'the menu button opens the menu (the page has no inline script)');
    await s.ctx.close();
    s = await open('index.html', { wait: false, viewport: { width: 390, height: 844 } });
    page = s.page;
    await page.waitForSelector('.st-launch');
    await page.click('.st-launch');
    await page.waitForSelector('.st-panel.is-open .st-pick-input');
    await page.waitForTimeout(500);
    const full = await page.evaluate(() => { const r = document.querySelector('.st-panel').getBoundingClientRect(); return r.width >= 389 && r.height >= 843; });
    check(full, 'on a phone Stuart opens full screen');
    await shot(page, 'mobile-widget');
    await s.ctx.close();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const hp = await ctx.newPage();
    await hp.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
    await hp.addInitScript(() => { localStorage.setItem('stuart.me', JSON.stringify('visitor')); });
    await hp.goto(base + 'index.html');
    await hp.click('.home-ask-try a >> nth=0');
    await hp.waitForSelector('.st-panel.is-open .st-msg--answer', { timeout: 8000 });
    check(/Cape Town|South Africa/.test(await hp.textContent('.st-panel .st-msg--answer')), 'the example questions on the home page open Stuart and ask them');
    await hp.goto(base + 'family-tree.html#/person/reg-fitzmaurice');
    await hp.waitForTimeout(1500);
    check(await hp.evaluate(() => !!document.querySelector('a.more-ask[href^="ask.html?q="]')), 'each person on the family tree links to Stuart');
    // the archive and the family tree page give the same label for every pair of people
    const treeLabels = await hp.evaluate(() => { const t = window.__tree, out = {}; t.D.people.forEach(a => t.D.people.forEach(b => { if (a.id !== b.id) out[a.id + '|' + b.id] = t.relInfo(a.id, b.id).label; })); return out; });
    const RK2 = Kin.create(loadKb().kb.people);
    const diff = Object.keys(treeLabels).filter(k => { const [x, y] = k.split('|'); return RK2.byId[x] && RK2.byId[y] && (RK2.relate(x, y).label || null) !== (treeLabels[k] || null); });
    check(Object.keys(treeLabels).length > 8000 && !diff.length, `the archive agrees with the family tree on all ${Object.keys(treeLabels).length} pairs of people`, diff.slice(0, 4).map(k => k + ': tree "' + treeLabels[k] + '", archive "' + RK2.relate(...k.split('|')).label + '"').join('; '));
    // the profile link opens Stuart where you are, with the question waiting
    await hp.click('a.more-ask');
    await hp.waitForSelector('.st-panel.is-open .st-msg--answer', { timeout: 8000 });
    check(/family-tree\.html/.test(hp.url()) && /Baron Reginald FitzMaurice/.test(await hp.textContent('.st-panel .st-msg--answer')), '"Ask Stuart about" on a profile opens Stuart on the family tree and asks');
    await ctx.close();

    section('Every page: the same navigation bar, and Stuart');
    const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
    const navAt = async (w, h) => {
        const out = {};
        for (const f of PAGES) {
            const c = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' }); const pg = await c.newPage();
            await pg.route(/fonts\.g|tile|openstreetmap|carto|arcgis|stadia/, r => r.abort());
            await pg.addInitScript(() => { localStorage.setItem('stuart.seen', 'true'); });
            await pg.goto(base + f); await pg.waitForTimeout(f === 'map.html' || f === 'family-tree.html' ? 1500 : 500);
            out[f] = await pg.evaluate(() => {
                const n = document.querySelector('.main-nav').getBoundingClientRect(), l = document.querySelector('.nav-logo').getBoundingClientRect(), a = document.querySelector('.nav-links a').getBoundingClientRect();
                const menu = getComputedStyle(document.querySelector('.nav-toggle')).display !== 'none';
                const btn = document.querySelector('.st-launch'), b = btn && btn.getBoundingClientRect();
                const avoid = (document.querySelector('script[data-avoid]') || { getAttribute: () => '' }).getAttribute('data-avoid');
                const hits = !b || !avoid ? [] : [...document.querySelectorAll(avoid)].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).display !== 'none' && !(r.right <= b.left || r.left >= b.right || r.bottom <= b.top || r.top >= b.bottom); }).map(e => e.className);
                return { nav: [Math.round(n.top), Math.round(n.height), Math.round(l.left), menu, menu ? 0 : Math.round(a.left)].join(','), last: [...document.querySelectorAll('link[rel=stylesheet]')].pop().getAttribute('href'), stuart: !!btn || !!document.getElementById('stuart-page'), hits };
            });
            await c.close();
        }
        return out;
    };
    for (const [w, h] of [[1440, 900], [1100, 800], [390, 844]]) {
        const r = await navAt(w, h), kinds = [...new Set(Object.values(r).map(x => x.nav))];
        check(kinds.length === 1, `at ${w} pixels wide the navigation bar is in the same place on all ${PAGES.length} pages` + (w <= 1100 ? ', behind the menu button' : ''), kinds.length > 1 ? PAGES.map(f => f + ' ' + r[f].nav).join('; ') : '');
        if (w === 1440) {
            check(PAGES.every(f => r[f].last === 'nav.css'), 'every page loads nav.css last, so nothing overrides it', PAGES.filter(f => r[f].last !== 'nav.css').join(', '));
            check(PAGES.every(f => r[f].stuart), 'Stuart is on every page', PAGES.filter(f => !r[f].stuart).join(', '));
        }
        const hit = PAGES.filter(f => r[f].hits.length);
        check(!hit.length, `at ${w} pixels Stuart's button stays clear of the family tree's and the map's own controls`, hit.map(f => f + ': ' + r[f].hits.join(' ')).join('; '));
    }
    await browser.close(); srv.close();
}
