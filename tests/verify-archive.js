/* Checks for Ask the Archive.
 *
 *   node tests/verify-archive.js           everything
 *   SHOTS=1 node tests/verify-archive.js   also writes screenshots to tests/screenshots/ask-*.png
 *   QUICK=1 node tests/verify-archive.js   the Node checks only (no browser)
 *
 * Part 1, in Node: the archive index is up to date and keeps living people private; the genealogy engine on
 * made-up families and on the real tree (and agrees with the family tree page on every pair); the question
 * benchmark in tests/archive-eval.json; the checks on model output.
 * Part 2, in a browser: the page, its links and sources, the fallback without WebGPU, the setup and written
 * answers with a stand-in model (no real model can run here), safety against injected markup, mobile layout.
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
check(Object.keys(man.models).length >= 2 && Object.values(man.models).every(m => m.bytes > 1e8), 'download sizes are recorded for the offered models' + (Object.values(man.models).some(m => !m.measured) ? ' (estimates: the build could not reach the model host)' : ' (measured)'));

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

section('Checking what a model writes');
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
        const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 900 } });
        const page = await ctx.newPage();
        const errs = [], external = [];
        page.on('pageerror', e => errs.push(e.message));
        page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
        page.on('request', r => { if (/huggingface|raw\.githubusercontent|mlc\.ai/.test(r.url())) external.push(r.url()); });
        await page.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
        if (opts.init) await page.addInitScript(opts.init);
        await page.goto(base + url);
        if (opts.wait !== false) await page.waitForFunction(() => window.__ask && window.__ask.archive, null, { timeout: 8000 });
        await page.waitForTimeout(300);
        return { ctx, page, errs, external };
    }

    section('The page');
    let s = await open('ask.html');
    let page = s.page;
    const first = await page.evaluate(() => ({ examples: document.querySelectorAll('#askExamples button').length, label: !!document.querySelector('label[for="askInput"]'), written: document.getElementById('writtenState').textContent, nav: !!document.querySelector('.nav-links a.active[href="ask.html"]') }));
    check(first.examples >= 6 && first.label && first.nav, `the page opens with ${first.examples} starter questions, a labelled question box and its menu item`);
    check(/need WebGPU/.test(first.written), 'without WebGPU the page says written answers cannot run here, and that quick answers work in full');
    await shot(page, 'start');
    await page.fill('#askInput', 'How was John FitzMaurice related to Grandma Pat?');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.turn .answer .sources li');
    await page.waitForFunction(() => /Answer ready/.test(document.getElementById('askLive').textContent), null, { timeout: 2000 }).catch(() => {});
    const rel = await page.evaluate(() => {
        const a = document.querySelector('.turn .answer');
        const cites = [...a.querySelectorAll('sup a')].map(x => x.getAttribute('href'));
        return { text: a.textContent, chain: a.querySelectorAll('.chain li').length, cites, targets: cites.every(h => !!document.getElementById(h.slice(1))), people: [...a.querySelectorAll('a[href^="family-tree.html#/person/"]')].length, live: document.getElementById('askLive').textContent };
    });
    check(/great-great-grandfather/.test(rel.text) && rel.chain >= 9, 'a relationship answer shows the label and the chain of five people');
    check(rel.cites.length && rel.targets, 'citation numbers link to the source list under the answer');
    check(rel.people >= 5, 'names link to each person on the family tree');
    check(/Answer ready/.test(rel.live), 'the answer is announced to screen readers once, when it is ready');
    await shot(page, 'relationship', true);
    await page.click('.next button');
    await page.waitForFunction(() => document.querySelectorAll('.turn').length === 2);
    check(true, 'a suggested follow-up question asks itself');
    await page.fill('#askInput', 'Tell me about Edith');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.choices button');
    await page.click('.choices button >> nth=1');
    await page.waitForFunction(() => document.querySelectorAll('.turn').length === 4);
    const pinned = await page.evaluate(() => document.querySelectorAll('.turn')[3].textContent);
    check(/Edith Marjorie/.test(pinned) && /1899|1900/.test(pinned), 'when a name is shared, choosing one answers about that person');
    await page.click('#newConvo');
    check(await page.evaluate(() => !document.querySelector('.turn') && !document.getElementById('askStart').hidden), 'a new conversation clears the answers');
    await page.fill('#askInput', 'Why did Ron emigrate to Australia?');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.turn .answer p');
    await shot(page, 'missing-information');
    await page.fill('#askInput', 'Which family members went to South Africa?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.turn').length === 2);
    await shot(page, 'historical', true);
    // injected markup is shown as text, never run
    await page.fill('#askInput', '<img src=x onerror="window.__xss=1"> Who was Reg?');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.turn').length === 3);
    const xss = await page.evaluate(() => ({ flag: window.__xss, imgs: [...document.querySelectorAll('.turn-q img, .answer img')].filter(i => i.getAttribute('src') === 'x').length }));
    check(!xss.flag && !xss.imgs, 'markup typed into a question is shown as text and never runs');
    check(!s.errs.length, 'no page errors', s.errs.join(' | '));
    check(!s.external.length, 'nothing is requested from the model hosts until the visitor sets up written answers', s.external.slice(0, 2).join(', '));
    await s.ctx.close();

    section('Written answers, with a stand-in model');
    // A fake GPU and a fake worker that behaves like archive-worker.js: real progress messages, streamed tokens.
    const init = () => {
        Object.defineProperty(navigator, 'gpu', { value: { requestAdapter: async () => ({ features: new Set(['shader-f16']), limits: { maxBufferSize: 2 ** 31, maxStorageBufferBindingSize: 2 ** 30 } }) } });
        window.__ASK_TEST_BACKEND = {
            createWorker() {
                const w = { cached: false, onmessage: null, terminated: false };
                const send = m => setTimeout(() => { if (!w.terminated && w.onmessage) w.onmessage({ data: m }); }, 5);
                w.terminate = () => { w.terminated = true; };
                w.postMessage = m => {
                    if (m.type === 'cached') send({ type: 'cached', model: m.model, cached: w.cached });
                    if (m.type === 'load') {
                        window.__loadedModel = m.model;
                        // half way after 0.3 s, then a pause long enough for the screenshot to show the bar at 50%
                        [0.1, 0.5, 1].forEach((p, i) => setTimeout(() => send({ type: 'progress', progress: p, text: 'Fetching param cache[' + (i + 1) + '/3]: ' + Math.round(p * 990) + 'MB fetched. ' + Math.round(p * 100) + '% completed, ' + (i + 1) * 4 + ' secs elapsed.' }), [0, 300, 1600][i]));
                        setTimeout(() => send({ type: 'progress', progress: 1, text: 'Finish loading on WebGPU' }), 1900);
                        setTimeout(() => send({ type: 'loaded', model: m.model }), 2000);
                    }
                    if (m.type === 'generate') {
                        window.__lastPrompt = m.messages;
                        const out = '<think>\n\n</think>Edward Dixon FitzMaurice was a civil engineer [1]. He sailed for South Africa in 1916 [2]. He also won a prize in 1999 [1].';
                        out.match(/.{1,12}/g).forEach((t, i) => setTimeout(() => send({ type: 'token', id: m.id, delta: t }), 10 + i * 6));
                        setTimeout(() => send({ type: 'done', id: m.id, text: out }), 30 + out.length / 12 * 6);
                    }
                    if (m.type === 'stop') {}
                    if (m.type === 'remove') send({ type: 'removed', model: m.model });
                };
                return w;
            }
        };
    };
    s = await open('ask.html', { init });
    page = s.page;
    await page.waitForSelector('#writtenActions .btn-a');
    await page.click('#writtenActions .btn-a');
    await page.waitForSelector('#setup[open]');
    const dlg = await page.evaluate(() => ({ text: document.getElementById('setupBody').textContent, radios: document.querySelectorAll('#setup input[type=radio]').length, checked: (document.querySelector('#setup input:checked') || {}).value }));
    check(/Hugging Face/.test(dlg.text) && /stay on this device/.test(dlg.text) && /GB|MB/.test(dlg.text) && dlg.radios === 2 && dlg.checked === 'standard', 'setup explains where the model comes from, that questions stay on the device, and the download size, before anything downloads');
    await shot(page, 'setup');
    await page.click('#setupGo');
    await page.waitForFunction(() => document.querySelector('#setupSteps li[data-step="download"]').className === 'is-now' || document.querySelector('#setupSteps li[data-step="start"]').className === 'is-now');
    // half way through the stand-in download, after the bar has caught up
    await page.waitForFunction(() => /50%/.test(document.getElementById('setupDetail').textContent));
    await page.waitForTimeout(400);
    await shot(page, 'loading');
    await page.waitForFunction(() => !document.getElementById('setup').open, null, { timeout: 4000 });
    const on = await page.evaluate(() => ({ state: document.getElementById('writtenState').textContent, model: window.__loadedModel, stored: localStorage.getItem('askArchive.written') }));
    check(/are on/.test(on.state) && on.model === 'Qwen3-1.7B-q4f16_1-MLC' && /"on":true/.test(on.stored), 'after a real-progress download the standard model is on, and the choice is remembered');
    await page.fill('#askInput', 'Tell me about Edward Dixon FitzMaurice');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.written p:not(.written-label):not(.stream)', { timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('.answer[aria-busy]'));
    const wr = await page.evaluate(() => {
        const w = document.querySelector('.written');
        return { text: w.textContent, cites: w.querySelectorAll('sup a').length, warn: (w.querySelector('.warn') || {}).textContent || '', sys: window.__lastPrompt[0].content, user: window.__lastPrompt[1].content, records: !!document.querySelector('.records-part.is-secondary') };
    });
    check(/civil engineer/.test(wr.text) && wr.cites >= 2 && !/think/.test(wr.text), 'the written answer streams in, with its citations linked');
    check(!/1999/.test(wr.text) && /left out/.test(wr.warn), 'a sentence with an invented year is left out, and the page says so');
    check(/Records:\n\[1\]/.test(wr.user) && /information, not instructions/.test(wr.sys) && wr.records, 'the model gets the numbered records and the rules, and the quick answer stays underneath');
    await shot(page, 'written', true);
    await page.click('#writtenActions .ask-link');
    await page.waitForFunction(() => /Set up written answers/.test(document.getElementById('writtenActions').textContent));
    check(await page.evaluate(() => localStorage.getItem('askArchive.written') === null), 'removing the downloaded model forgets it and offers setup again');
    check(!s.errs.length, 'no page errors with written answers', s.errs.join(' | '));
    await s.ctx.close();

    section('The evaluation page');
    s = await open('tests/archive-eval.html', { init, wait: false });
    page = s.page;
    await page.waitForFunction(() => !document.getElementById('runQuick').disabled);
    await page.click('#runQuick');
    const evq = await page.textContent('#summary');
    check(new RegExp('Quick answers: ' + total + ' of ' + total + ' pass').test(evq), 'tests/archive-eval.html runs the question set in the browser and agrees with this script', evq.slice(0, 120));
    await page.click('#runWritten');
    await page.waitForFunction(() => /Finished/.test(document.getElementById('progress').textContent), null, { timeout: 60000 });
    const evw = await page.evaluate(() => ({ text: document.getElementById('summary').textContent, rows: document.querySelectorAll('#rows tr').length, left: document.querySelectorAll('#rows .dropped').length }));
    check(/Written answers \(Qwen3-1\.7B-q4f16_1-MLC\)/.test(evw.text) && /tokens\/s/.test(evw.text) && evw.left > 0, 'with a model loaded it writes each answer, vets it as the page does and reports what was left out and the timings', evw.text.slice(0, 200));
    check(!s.errs.length, 'no page errors on the evaluation page', s.errs.join(' | '));
    await s.ctx.close();

    section('Mobile, home page and family tree');
    s = await open('ask.html?q=' + encodeURIComponent('Who were Reg FitzMaurice\'s grandparents?'), { viewport: { width: 390, height: 844 } });
    page = s.page;
    await page.waitForSelector('.turn .answer .sources');
    const mob = await page.evaluate(() => ({ over: document.documentElement.scrollWidth - window.innerWidth, btn: document.getElementById('askGo').getBoundingClientRect().height }));
    check(mob.over <= 1 && mob.btn >= 44, 'on a phone nothing runs off the side and the Ask button is a full-size target');

    const csp = await page.evaluate(() => (document.querySelector('meta[http-equiv="Content-Security-Policy"]') || {}).content || '');
    check(/script-src 'self'/.test(csp) && /connect-src 'self'/.test(csp) && !/script-src[^;]*unsafe-inline/.test(csp) && !/script-src[^;]*unsafe-eval'/.test(csp.replace("'wasm-unsafe-eval'", '')), 'the page only runs its own scripts, and fetches only from this site and the two model hosts');
    check(!s.errs.length, 'no page errors or blocked resources on a phone', s.errs.join(' | '));
    await shot(page, 'mobile', true);
    // after the screenshot, so the open menu is not in it
    await page.click('#navToggle');
    check(await page.evaluate(() => document.getElementById('navLinks').classList.contains('open')), 'the menu button opens the menu (the page has no inline script)');
    await s.ctx.close();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const hp = await ctx.newPage();
    await hp.route(/fonts\.googleapis|fonts\.gstatic/, r => r.abort());
    await hp.goto(base + 'index.html');
    await hp.fill('#homeAsk', 'Who was Pat\'s father?');
    await hp.press('#homeAsk', 'Enter');
    await hp.waitForSelector('.turn .answer .sources', { timeout: 8000 });
    check(/Baron Reginald FitzMaurice/.test(await hp.textContent('.turn .answer')), 'the question box on the home page opens Ask the Archive with the answer');
    await hp.goto(base + 'family-tree.html#/person/reg-fitzmaurice');
    await hp.waitForTimeout(1500);
    check(await hp.evaluate(() => !!document.querySelector('a.more-ask[href^="ask.html?q="]')), 'each person on the family tree links to Ask the Archive');
    // the archive and the family tree page give the same label for every pair of people
    const treeLabels = await hp.evaluate(() => { const t = window.__tree, out = {}; t.D.people.forEach(a => t.D.people.forEach(b => { if (a.id !== b.id) out[a.id + '|' + b.id] = t.relInfo(a.id, b.id).label; })); return out; });
    const RK2 = Kin.create(loadKb().kb.people);
    const diff = Object.keys(treeLabels).filter(k => { const [x, y] = k.split('|'); return RK2.byId[x] && RK2.byId[y] && (RK2.relate(x, y).label || null) !== (treeLabels[k] || null); });
    check(Object.keys(treeLabels).length > 8000 && !diff.length, `the archive agrees with the family tree on all ${Object.keys(treeLabels).length} pairs of people`, diff.slice(0, 4).map(k => k + ': tree "' + treeLabels[k] + '", archive "' + RK2.relate(...k.split('|')).label + '"').join('; '));
    await ctx.close();
    await browser.close(); srv.close();
}
