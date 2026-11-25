/* Stuart: finding people, places and passages.
 *
 *  - Names: every spelling the site uses (display names, full names, variants, nicknames, maiden names), with a
 *    sound-alike key so "Fitzmorris" finds FitzMaurice and "Stacy" finds Stacey.
 *  - Places: the map's place names and the place words in people's records.
 *  - Passages: a BM25 keyword index over records, stories, page sections and captions, with a small list of
 *    everyday words for archive terms ("job" also looks for occupation, "emigrate" also for sailed).
 *
 * The archive is small (a few thousand passages), so everything is built in the browser in a few milliseconds
 * and nothing extra is downloaded. Semantic embeddings were considered and left out: see docs/ask-the-archive.md (Stuart's maintainer notes).
 */
(function (root) {
    'use strict';

    var STOP = ('a an the and or but of to in on at by for with from as is was were are be been being it its this that these those ' +
        'he she they them his her their hers theirs him i me my we us our you your who whom whose what which when where why how ' +
        'did do does done have has had any some all about into over than then there here also not no yes can could would should ' +
        'will shall may might must so such very just only ever more most much many tell me please know there s').split(' ');
    var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = true; });

    // everyday words for the archive's own terms; each key also searches for its list
    var SYN = {
        job: ['occupation', 'worked', 'work', 'trade', 'employed', 'labourer', 'clerk'], jobs: ['occupation', 'worked', 'trade'],
        work: ['occupation', 'worked', 'employed'], career: ['occupation', 'worked'], profession: ['occupation'],
        emigrate: ['sailed', 'voyage', 'passenger', 'abroad', 'emigrated'], emigrated: ['sailed', 'voyage', 'passenger', 'abroad'],
        immigrate: ['arrived', 'born abroad', 'passenger'], migrate: ['moved', 'sailed', 'voyage'], moved: ['lived', 'move', 'sailed'],
        abroad: ['sailed', 'voyage', 'south africa', 'cape town', 'canada', 'egypt'], ship: ['sailed', 'voyage', 'passenger'],
        war: ['army', 'raf', 'served', 'military', 'killed', 'blitz', 'service'], army: ['served', 'regiment', 'military', 'corps'],
        soldier: ['army', 'served', 'regiment'], raf: ['aircraftman', 'royal air force', 'tura'], navy: ['naval', 'ship'],
        killed: ['died', 'death', 'killed'], died: ['death', 'died', 'buried'], death: ['died', 'death'], grave: ['buried', 'burial', 'cemetery'],
        buried: ['burial', 'cemetery', 'churchyard'], born: ['birth', 'baptised', 'born'], birth: ['born', 'baptised'], baptism: ['baptised', 'christened'],
        married: ['marriage', 'wedding', 'married'], wedding: ['married', 'marriage'], marriage: ['married', 'wedding'], wife: ['married'], husband: ['married'],
        home: ['lived', 'house', 'address'], house: ['lived', 'home', 'address'], live: ['lived', 'living', 'home', 'address'], lived: ['home', 'address', 'living'],
        photo: ['photograph', 'portrait', 'picture'], photos: ['photograph', 'portrait'], picture: ['photograph', 'portrait'], pictures: ['photograph'],
        document: ['record', 'register', 'certificate', 'census'], documents: ['record', 'register', 'certificate', 'census'],
        certificate: ['register', 'index', 'record'], records: ['register', 'census', 'record'], census: ['household', 'enumerated'],
        newspaper: ['cutting', 'clipping', 'paper', 'evening news'], cutting: ['newspaper', 'clipping'], earl: ['orkney', 'earldom'],
        school: ['scholar', 'pupil'], money: ['estate', 'probate', 'effects'], will: ['probate', 'estate'], church: ['parish', 'baptised', 'married'],
        father: ['dad'], mother: ['mum'], dad: ['father'], mum: ['mother'], mom: ['mother'], kids: ['children'], children: ['child', 'son', 'daughter']
    };

    function fold(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    // possessives are dropped ("Pat's" is "Pat"), other apostrophes closed up ("O'Bryen" is "obryen")
    function norm(s) { return fold(s).toLowerCase().replace(/[‘’']s\b/g, '').replace(/[‘’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
    function stem(w) {
        if (w.length <= 3) return w;
        if (/ies$/.test(w) && w.length > 4) return w.slice(0, -3) + 'y';
        if (/(ss|us|is)$/.test(w)) return w;
        if (/sses$/.test(w)) return w.slice(0, -2);
        if (/ing$/.test(w) && w.length > 5) return w.slice(0, -3);
        if (/ed$/.test(w) && w.length > 4) return w.slice(0, -2);
        if (/es$/.test(w) && w.length > 4 && /(ch|sh|x|z)es$/.test(w)) return w.slice(0, -2);
        if (/s$/.test(w)) return w.slice(0, -1);
        return w;
    }
    function tokens(s, keepStop) { return norm(s).split(' ').filter(function (w) { return w && (keepStop || !STOPSET[w]); }); }
    function terms(s) { return tokens(s).map(stem); }

    // a sound-alike key for names: drop vowels after the first letter, fold similar consonants
    function soundKey(w) {
        w = norm(w).replace(/\s+/g, '');
        if (!w) return '';
        w = w.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/c(?=[eiy])/g, 's').replace(/[cq]/g, 'k').replace(/z/g, 's').replace(/x/g, 'ks').replace(/y/g, 'i').replace(/w/g, 'v').replace(/gh/g, 'g');
        var first = w[0], rest = w.slice(1).replace(/[aeiouh]/g, '');
        return (first + rest).replace(/(.)\1+/g, '$1');
    }
    function lev(a, b) {
        if (a === b) return 0;
        var m = a.length, n = b.length, d = [], i, j;
        for (i = 0; i <= m; i++) { d[i] = [i]; }
        for (j = 1; j <= n; j++) d[0][j] = j;
        for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        return d[m][n];
    }

    // ------------------------------------------------------------------ names
    var WORDLIKE = {}; ('will may grace rose frank mark bill art pat ron sid fred ted jack bob babs lil herb bert rosie harry violet ' +
        'faith hope joy dawn ivy lily daisy ruby pearl iris amber summer june april august earl baron king prince field walter walters ' +
        'stacey spencer bennett gall cousins andrews field').split(' ').forEach(function (w) { WORDLIKE[w] = true; });
    var KIND_SCORE = { display: 3, full: 2.8, variant: 2.6, maiden: 2.4, nickname: 2.5, first: 2.2, given: 2.1 };
    function Names(people) {
        var byAlias = {}, byFirst = {}, bySurname = {}, bySound = {};
        people.forEach(function (p) {
            // "Edward Dixon" and "Fanny Mary": the given names of a longer name find the person too
            var extra = [];
            (p.aliases || []).forEach(function (a) {
                var w = norm(a.text).split(' ');
                if ((a.kind === 'display' || a.kind === 'full') && w.length >= 3) extra.push({ text: w.slice(0, -1).join(' '), kind: 'given' });
            });
            (p.aliases || []).concat(extra).forEach(function (a) {
                var k = norm(a.text);
                if (!k) return;
                (byAlias[k] = byAlias[k] || []).push({ id: p.id, score: KIND_SCORE[a.kind] || 2, how: a.kind === 'given' ? 'name' : a.kind });
                var sk = k.split(' ').map(soundKey).join(' ');
                (bySound[sk] = bySound[sk] || []).push({ id: p.id, score: (KIND_SCORE[a.kind] || 2) - 0.6, how: 'sounds like' });
                // one-word nicknames ("Reg", "Babs") are first names too
                if (a.kind === 'nickname' && k.indexOf(' ') < 0) (byFirst[k] = byFirst[k] || []).push(p.id);
            });
            var g = norm(p.given).split(' ')[0];
            if (g) (byFirst[g] = byFirst[g] || []).push(p.id);
            var s = norm(p.surname);
            if (s) (bySurname[s] = bySurname[s] || []).push(p.id);
            // maiden names count as surnames for "the Bennetts"
            (p.aliases || []).filter(function (a) { return a.kind === 'maiden'; }).forEach(function (a) {
                var ms = norm(a.text).split(' ').pop();
                if (ms && ms !== s) (bySurname[ms] = bySurname[ms] || []).push(p.id);
            });
        });
        var aliasKeys = Object.keys(byAlias).sort(function (a, b) { return b.split(' ').length - a.split(' ').length || b.length - a.length; });
        var surnames = Object.keys(bySurname);

        // people named in a question: longest match first, never overlapping. Each mention lists its candidates.
        function find(text) {
            var words = norm(text).split(' ').filter(Boolean), used = [], out = [];
            var raw = String(text || '');
            function taken(i, n) { for (var k = i; k < i + n; k++) if (used[k]) return true; return false; }
            function mark(i, n) { for (var k = i; k < i + n; k++) used[k] = true; }
            // exact aliases, up to five words long
            for (var len = 5; len >= 1; len--) {
                for (var i = 0; i + len <= words.length; i++) {
                    if (taken(i, len)) continue;
                    var phrase = words.slice(i, i + len).join(' ');
                    if (i > 0 && (words[i - 1] === 'st' || words[i - 1] === 'saint')) continue;
                    var hit = byAlias[phrase];
                    if (hit && (len > 1 || phrase.length > 2)) { out.push({ at: i, len: len, text: phrase, cands: dedupe(hit), how: 'name' }); mark(i, len); }
                }
            }
            // a possessive surname plural ("the Bennetts", "the Andrews family")
            for (var j = 0; j < words.length; j++) {
                if (used[j]) continue;
                var w = words[j], base = w.replace(/es$|s$/, '');
                var sn = bySurname[w] ? w : bySurname[base] ? base : null;
                var family = words[j + 1] === 'family' || words[j + 1] === 'families' || words[j + 1] === 'branch' || words[j + 1] === 'line' || words[j - 1] === 'the';
                if (sn && family) { out.push({ at: j, len: 1, text: sn, family: sn, cands: bySurname[sn].map(function (id) { return { id: id, score: 1, how: 'surname' }; }), how: 'family' }); used[j] = true; }
            }
            // a couple sharing a surname: "Charles and Annie Bennett" is Charles Bennett and Annie Bennett
            for (var c = 0; c + 3 < words.length; c++) {
                if (used[c] || words[c + 1] !== 'and' || !used[c + 2] || !used[c + 3]) continue;
                var both = byAlias[words[c] + ' ' + words[c + 3]];
                var second = out.filter(function (o) { return o.at === c + 2 && o.len === 2; })[0];
                if (both && second) { out.push({ at: c, len: 1, text: words[c], cands: dedupe(both), how: 'name' }); used[c] = true; }
            }
            // sound-alike names of three or two words ("Edward Dixon Fitzmorris"), then single first names and nicknames
            for (var sl = 3; sl >= 2; sl--) {
                for (var t = 0; t + sl <= words.length; t++) {
                    if (taken(t, sl) || words.slice(t, t + sl).some(function (w) { return STOPSET[w]; })) continue;
                    var key = words.slice(t, t + sl).map(soundKey).join(' ');
                    var sh = bySound[key];
                    if (sh) { out.push({ at: t, len: sl, text: words.slice(t, t + sl).join(' '), cands: dedupe(sh), how: 'sounds like' }); mark(t, sl); }
                }
            }
            for (var f = 0; f < words.length; f++) {
                if (used[f] || STOPSET[words[f]] || words[f].length < 3) continue;
                if (f > 0 && (words[f - 1] === 'st' || words[f - 1] === 'saint')) continue;  // St Mary's is a church
                // a name that is also an everyday word ("will", "may", "grace") counts only when written with a capital
                if (WORDLIKE[words[f]]) {
                    var cap = new RegExp('\\b' + words[f].charAt(0).toUpperCase() + words[f].slice(1) + '\\b');
                    if (!cap.test(fold(raw))) continue;
                }
                if (byFirst[words[f]]) { out.push({ at: f, len: 1, text: words[f], cands: byFirst[words[f]].map(function (id) { return { id: id, score: 1, how: 'first name' }; }), how: 'first' }); used[f] = true; continue; }
                if (bySurname[words[f]]) { out.push({ at: f, len: 1, text: words[f], family: words[f], cands: bySurname[words[f]].map(function (id) { return { id: id, score: 0.8, how: 'surname' }; }), how: 'family' }); used[f] = true; continue; }
                // a misspelt surname on its own ("Fitzmorris"), but only where a name is plausible: written with a capital,
                // after a first name, or before "family" or "line". "Did anyone fight at the Somme?" is not about the Knights.
                var asTyped = (fold(raw).match(new RegExp('\\b' + words[f] + '\\b', 'i')) || [''])[0];
                var capd = /^[A-Z]/.test(asTyped);
                var nameSlot = capd || (f > 0 && byFirst[words[f - 1]]) || /^(family|families|line|branch|side|surname|name)$/.test(words[f + 1] || '');
                var best = null;
                if (nameSlot) surnames.forEach(function (s) {
                    var d = lev(words[f], s);
                    if ((soundKey(words[f]) === soundKey(s) && s.length > 4) || (s.length > 5 && d <= 2 && s[0] === words[f][0]) || (s.length > 3 && d <= 1)) { if (!best || d < best.d) best = { s: s, d: d }; }
                });
                if (best) { out.push({ at: f, len: 1, text: words[f], family: best.s, cands: bySurname[best.s].map(function (id) { return { id: id, score: 0.7, how: 'spelling' }; }), how: 'family', corrected: best.s }); used[f] = true; }
            }
            out.sort(function (a, b) { return a.at - b.at; });
            return { mentions: out, words: words, used: used };
        }
        function dedupe(list) {
            var best = {};
            list.forEach(function (c) { if (!best[c.id] || best[c.id].score < c.score) best[c.id] = c; });
            return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.score - a.score; });
        }
        return { find: find, bySurname: bySurname, byFirst: byFirst, surnames: surnames };
    }

    // ------------------------------------------------------------------ places
    function Places(kb) {
        var index = {};  // place word or phrase -> { placeIds:[], people:[] }
        function add(name, rec) {
            var k = norm(name);
            if (!k || k.length < 3 || STOPSET[k]) return;
            var e = index[k] = index[k] || { placeIds: [], people: [] };
            if (rec.placeId && e.placeIds.indexOf(rec.placeId) < 0) e.placeIds.push(rec.placeId);
            if (rec.person && e.people.indexOf(rec.person) < 0) e.people.push(rec.person);
        }
        function parts(text) {
            // "Plaistow, West Ham" -> "Plaistow, West Ham", "Plaistow", "West Ham"
            var t = String(text || '').replace(/\b\d+[a-z]?\b/gi, ' ').replace(/\b(district|registration|parish|road|street|lane|avenue)\b/gi, ' ');
            var out = [String(text || '')];
            t.split(/[,;()]/).forEach(function (s) { s = s.trim(); if (s && /[A-Z]/.test(s)) out.push(s); });
            return out;
        }
        (kb.places || []).forEach(function (pl) {
            parts(pl.name).concat(parts(pl.historicName)).concat(pl.variants || []).forEach(function (n) { add(n, { placeId: pl.id }); });
        });
        (kb.people || []).forEach(function (p) {
            if (p.living) return;
            var recs = [p.birth, p.death, p.burial].filter(Boolean).concat(p.residences || [], p.occupations || []);
            recs.forEach(function (r) { parts(r.place).concat(parts(r.address)).forEach(function (n) { add(n, { placeId: r.placeId, person: p.id }); }); });
            (p.voyages || []).forEach(function (v) { [v.from, v.to].forEach(function (n) { add(n, { person: p.id }); }); });
            (p.spouses || []).forEach(function (s) { parts(s.place).forEach(function (n) { add(n, { placeId: s.placeId, person: p.id }); }); });
        });
        var keys = Object.keys(index).sort(function (a, b) { return b.length - a.length; });
        function find(text, skip) {
            var t = ' ' + norm(text) + ' ', out = [];
            keys.forEach(function (k) {
                if (t.indexOf(' ' + k + ' ') < 0) return;
                if (skip && skip.some(function (s) { return s.indexOf(k) >= 0; })) return;
                if (out.some(function (o) { return o.key.indexOf(k) >= 0; })) return;
                out.push({ key: k, placeIds: index[k].placeIds, people: index[k].people });
            });
            return out;
        }
        return { find: find, index: index };
    }

    // ------------------------------------------------------------------ passages (BM25)
    function Index(docs) {
        var N = docs.length, df = {}, avg = 0, k1 = 1.2, b = 0.75;
        docs.forEach(function (d) {
            d._t = terms((d.title || '') + ' ' + (d.title || '') + ' ' + d.text);
            d._len = d._t.length; avg += d._len;
            d._tf = {};
            d._t.forEach(function (t) { d._tf[t] = (d._tf[t] || 0) + 1; });
            Object.keys(d._tf).forEach(function (t) { df[t] = (df[t] || 0) + 1; });
        });
        avg = avg / Math.max(1, N);
        function expand(q) {
            var base = tokens(q), extra = [];
            base.forEach(function (w) { (SYN[w] || []).forEach(function (s) { extra.push(s); }); });
            var main = base.map(stem), syn = [];
            extra.forEach(function (s) { tokens(s).map(stem).forEach(function (t) { if (main.indexOf(t) < 0 && syn.indexOf(t) < 0) syn.push(t); }); });
            return { main: main, syn: syn };
        }
        function search(q, opts) {
            opts = opts || {};
            var ex = typeof q === 'string' ? expand(q) : q;
            var res = [];
            docs.forEach(function (d) {
                if (opts.filter && !opts.filter(d)) return;
                var s = 0, matched = 0;
                function add(t, w) {
                    var f = d._tf[t]; if (!f) return;
                    var idf = Math.log(1 + (N - df[t] + 0.5) / (df[t] + 0.5));
                    s += w * idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d._len / avg));
                    matched++;
                }
                ex.main.forEach(function (t) { add(t, 1); });
                ex.syn.forEach(function (t) { add(t, 0.45); });
                if (!s) return;
                if (opts.people && opts.people.length) {
                    var hit = (d.people || []).filter(function (p) { return opts.people.indexOf(p) >= 0; }).length;
                    var onPage = (d.pagePeople || []).some(function (p) { return opts.people.indexOf(p) >= 0; });
                    s *= hit ? 1.6 + 0.2 * hit : onPage ? 1.3 : (opts.strictPeople ? 0 : 0.55);
                }
                if (d.boost) s *= d.boost;
                if (s > 0) res.push({ doc: d, score: s, matched: matched });
            });
            res.sort(function (a, b) { return b.score - a.score; });
            return res.slice(0, opts.limit || 12);
        }
        return { search: search, expand: expand, docs: docs };
    }

    // sentences, without breaking after "No. 111", "St. Mary's", "Mrs.", "vol. 4a" or an initial ("H. G. Andrews")
    var ABBR = /(?:^|[\s(])(?:No|Nos|St|Mr|Mrs|Ms|Dr|Rev|Revd|Capt|Lt|Col|Sgt|Cpl|Pte|Gen|Maj|Co|Bros|Jr|Sr|vol|Vol|pp?|c|ca|approx|nr|fol|ff|ed|eds|[A-Z])\.$/;
    function splitSentences(text) {
        text = String(text || '');
        var out = [], start = 0, re = /[.!?]+(?=\s+|$)/g, m;
        while ((m = re.exec(text))) {
            var end = m.index + m[0].length;
            if (m[0] === '.' && ABBR.test(text.slice(Math.max(0, m.index - 8), end))) continue;
            out.push(text.slice(start, end)); start = end;
        }
        if (start < text.length && text.slice(start).trim()) out.push(text.slice(start));
        return out.length ? out : [text];
    }

    // a list of names with no verb, such as a card's label paragraph
    function labelLike(s) {
        var w = String(s).replace(/[.,;:!?]/g, ' ').split(/\s+/).filter(Boolean);
        if (w.length > 9) return false;
        var caps = w.filter(function (x) { return /^[A-Z]/.test(x); }).length, small = w.filter(function (x) { return /^[a-z]/.test(x) && !/^(and|of|the|in|at|on|or)$/.test(x); }).length;
        return caps >= 2 && small === 0;
    }

    // the sentences of a passage that best match a question, in their original order
    function bestSentences(text, q, max) {
        var ex = typeof q === 'string' ? { main: terms(q), syn: [] } : q;
        var sents = splitSentences(text);
        var scored = sents.map(function (s, i) {
            var t = terms(s), sc = 0;
            ex.main.forEach(function (w) { if (t.indexOf(w) >= 0) sc += 1; });
            (ex.syn || []).forEach(function (w) { if (t.indexOf(w) >= 0) sc += 0.4; });
            return { s: s.trim(), i: i, sc: sc };
        }).filter(function (x) { return x.s.length > 12 && !labelLike(x.s); });
        var top = scored.slice().sort(function (a, b) { return b.sc - a.sc || a.i - b.i; }).slice(0, max || 2).filter(function (x) { return x.sc > 0; });
        return top.sort(function (a, b) { return a.i - b.i; }).map(function (x) { return x.s; });
    }

    var api = { Names: Names, Places: Places, Index: Index, norm: norm, tokens: tokens, terms: terms, stem: stem, soundKey: soundKey, lev: lev, bestSentences: bestSentences, splitSentences: splitSentences, STOP: STOPSET };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ArchiveSearch = api;
})(typeof self !== 'undefined' ? self : this);
