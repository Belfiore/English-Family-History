/* Stuart: the genealogy engine.
 *
 * Every relationship answer is worked out here from the parent, child and marriage links in the family data,
 * never by the language model. The labels follow the family tree exactly (tree-canvas.js relInfo), so the tree
 * and the archive always say the same thing: "great-great-grandfather", "1st cousin twice removed", "half-sister",
 * "sister-in-law".
 *
 * Works in the browser (window.ArchiveKin) and in Node (require), so the tests can run it on the real data and
 * on made-up families.
 *
 *   var kin = ArchiveKin.create(people);  // [{id, name, sex, parents:[id], children:[id], spouses:[{id, relation}], parentLink}]
 *   kin.relate('sebastian-belfiore', 'reg-fitzmaurice')  ->  { kind: 'blood', label: 'great-grandfather', path: [...], ... }
 *   ("label" is what the second person is to the first.)
 */
(function (root) {
    'use strict';

    function create(list) {
        var byId = {};
        list.forEach(function (p) { byId[p.id] = p; });
        var has = function (id) { return !!byId[id]; };
        var parentsOf = function (id) { return ((byId[id] || {}).parents || []).filter(has); };
        var childrenOf = function (id) {
            // children are read from both sides of the link, so a child listed only under one parent is still found
            var out = ((byId[id] || {}).children || []).filter(has);
            list.forEach(function (p) { if ((p.parents || []).indexOf(id) >= 0 && out.indexOf(p.id) < 0) out.push(p.id); });
            return out;
        };
        var spousesOf = function (id) { return ((byId[id] || {}).spouses || []).filter(function (s) { return has(s.id); }); };
        var word = function (p, m, f, n) { return p && p.sex === 'M' ? m : p && p.sex === 'F' ? f : n; };

        function ancestorDepths(id) {
            var map = {}; map[id] = 0; var q = [[id, 0]];
            while (q.length) {
                var c = q.shift();
                parentsOf(c[0]).forEach(function (p) { if (!(p in map)) { map[p] = c[1] + 1; q.push([p, c[1] + 1]); } });
            }
            return map;
        }
        // nearest shared ancestors of a and b: m = generations up from a, n = from b (same rule as the tree)
        function blood(a, b) {
            var A = ancestorDepths(a), B = ancestorDepths(b), best = null;
            Object.keys(A).forEach(function (k) {
                if (!(k in B)) return;
                var s = A[k] + B[k];
                if (!best || s < best.s || (s === best.s && Math.abs(A[k] - B[k]) < Math.abs(best.m - best.n))) best = { m: A[k], n: B[k], s: s };
            });
            if (!best) return null;
            best.commons = Object.keys(A).filter(function (k) { return k in B && A[k] === best.m && B[k] === best.n; })
                .sort(function (x, y) { return (byId[x].sex === 'M' ? 0 : 1) - (byId[y].sex === 'M' ? 0 : 1); });
            // half relations: one shared ancestor who had children by more than one partner
            best.half = best.m > 0 && best.n > 0 && best.commons.length === 1 && spousesOf(best.commons[0]).length > 1;
            return best;
        }
        function ordinal(n) { var s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
        function label(m, n, sex) {
            var g = function (mw, fw, nw) { return sex === 'M' ? mw : sex === 'F' ? fw : nw; };
            var greats = function (k) { return k <= 0 ? '' : k === 1 ? 'great-' : k === 2 ? 'great-great-' : k + '× great-'; };
            if (m === 0 && n === 0) return 'the same person';
            if (m === 0) return n === 1 ? g('son', 'daughter', 'child') : greats(n - 2) + g('grandson', 'granddaughter', 'grandchild');
            if (n === 0) return m === 1 ? g('father', 'mother', 'parent') : greats(m - 2) + g('grandfather', 'grandmother', 'grandparent');
            if (m === 1 && n === 1) return g('brother', 'sister', 'sibling');
            if (n === 1) return greats(m - 2) + g('uncle', 'aunt', 'aunt or uncle');
            if (m === 1) return (n === 2 ? '' : n === 3 ? 'grand-' : greats(n - 3) + 'grand-') + g('nephew', 'niece', 'niece or nephew');
            var deg = Math.min(m, n) - 1, rem = Math.abs(m - n);
            return ordinal(deg) + ' cousin' + (rem === 1 ? ' once removed' : rem === 2 ? ' twice removed' : rem > 2 ? ' ' + rem + ' times removed' : '');
        }
        function halfify(lbl, b) {
            if (!b.half) return lbl;
            if (/cousin/.test(lbl)) return 'half ' + lbl;
            return lbl.replace(/(aunt or uncle|niece or nephew|brother|sister|sibling|uncle|aunt|nephew|niece)$/, 'half-$1');
        }
        function isPartner(a, b) { return spousesOf(a).some(function (s) { return s.id === b && s.relation === 'partner'; }); }

        // Shortest chain through parents, children and marriages; confirmed links are preferred (same weights as the tree).
        function path(a, b) {
            if (!has(a) || !has(b)) return null;
            var dist = {}, prev = {}, done = {};
            list.forEach(function (p) { dist[p.id] = Infinity; });
            dist[a] = 0;
            function pen(id) { var p = byId[id]; return (p.confidence === 'confirmed' ? 0 : 0.05) + (p.parentLink && p.parentLink !== 'confirmed' ? 0.05 : 0) + (p.directLine ? 0 : 0.001); }
            for (;;) {
                var u = null, best = Infinity;
                Object.keys(dist).forEach(function (k) { if (!done[k] && dist[k] < best) { best = dist[k]; u = k; } });
                if (u === null || u === b) break;
                done[u] = true;
                var nb = [];
                parentsOf(u).forEach(function (x) { nb.push([x, 1, 'parent']); });
                childrenOf(u).forEach(function (x) { nb.push([x, 1, 'child']); });
                spousesOf(u).forEach(function (s) { nb.push([s.id, 1.25, 'spouse']); });
                nb.forEach(function (e) {
                    var d = dist[u] + e[1] + pen(e[0]);
                    if (d < dist[e[0]]) { dist[e[0]] = d; prev[e[0]] = { from: u, type: e[2] }; }
                });
            }
            if (dist[b] === Infinity) return null;
            var out = [{ id: b, type: prev[b] ? prev[b].type : null }], c = b;
            while (prev[c]) { c = prev[c].from; out.unshift({ id: c, type: prev[c] ? prev[c].type : null }); }
            out[0].type = null;
            return out;
        }
        // the blood path through a common ancestor: up from a, then down to b
        function bloodPath(a, b, x) {
            if (!x || !x.commons.length) return null;
            var top = x.commons[0];
            function chain(from, to) { // from descendant up to ancestor
                var q = [[from]], seen = {};
                while (q.length) {
                    var p = q.shift(), last = p[p.length - 1];
                    if (last === to) return p;
                    parentsOf(last).forEach(function (y) { if (!seen[y]) { seen[y] = true; q.push(p.concat([y])); } });
                }
                return null;
            }
            var up = chain(a, top), down = chain(b, top);
            if (!up || !down) return null;
            var out = up.map(function (id, i) { return { id: id, type: i === 0 ? null : 'parent' }; });
            down.slice(0, -1).reverse().forEach(function (id) { out.push({ id: id, type: 'child' }); });
            return out;
        }
        // links in a chain that the records only make probable, or that are unverified
        function weakLinks(p) {
            var out = [];
            (p || []).forEach(function (step, i) {
                if (!i) return;
                var prevId = p[i - 1].id, child = step.type === 'parent' ? prevId : step.type === 'child' ? step.id : null;
                if (!child) return;
                var c = byId[child];
                if (c && c.parentLink && c.parentLink !== 'confirmed') out.push({ child: child, parent: child === prevId ? step.id : prevId, confidence: c.parentLink });
            });
            return out;
        }

        // What b is to a, with the reasoning behind it (the tree's relInfo, plus the path and the weak links).
        function relate(a, b) {
            var A = byId[a], B = byId[b], r = { a: a, b: b, kind: 'none', label: null, commons: [], m: 0, n: 0, half: false, via: null, path: null };
            if (!A || !B) { r.kind = 'unknown'; return r; }
            if (a === b) { r.kind = 'self'; r.label = 'the same person'; return r; }
            var sp = spousesOf(a).filter(function (s) { return s.id === b; })[0];
            if (sp) {
                r.kind = 'spouse';
                r.label = sp.relation === 'partner' ? 'partner' : ((spousesOf(a).length > 1) ? (sp.order === 1 ? 'first ' : 'second ') : '') + word(B, 'husband', 'wife', 'spouse');
                r.path = [{ id: a, type: null }, { id: b, type: 'spouse' }];
                return r;
            }
            var x = blood(a, b);
            if (x) {
                r.kind = 'blood'; r.m = x.m; r.n = x.n; r.commons = x.commons; r.half = x.half; r.label = halfify(label(x.m, x.n, B.sex), x);
                r.path = bloodPath(a, b, x) || path(a, b);
                r.weak = weakLinks(r.path);
                return r;
            }
            var hit = null;
            spousesOf(b).some(function (s) { var y = blood(a, s.id); if (y) { hit = { y: y, s: s.id }; return true; } return false; });
            if (hit) {
                var y = hit.y, S2 = byId[hit.s];
                r.kind = 'inlaw'; r.via = hit.s; r.commons = y.commons; r.m = y.m; r.n = y.n;
                if (isPartner(hit.s, b)) r.label = halfify(label(y.m, y.n, S2.sex), y) + "'s partner";
                else if (y.m === 0 && y.n === 1) r.label = word(B, 'son-in-law', 'daughter-in-law', 'child-in-law');
                else if (y.m === 1 && y.n === 1) r.label = word(B, 'brother-in-law', 'sister-in-law', 'sibling-in-law');
                else if (y.m === 1 && y.n === 0) { r.label = word(B, 'stepfather', 'stepmother', 'step-parent'); r.kind = 'step'; }
                else if (y.m === 2 && y.n === 0) { r.label = word(B, 'step-grandfather', 'step-grandmother', 'step-grandparent'); r.kind = 'step'; }
                else r.label = halfify(label(y.m, y.n, S2.sex), y) + "'s " + word(B, 'husband', 'wife', 'spouse');
                var p1 = bloodPath(a, hit.s, y) || path(a, hit.s);
                r.path = p1 ? p1.concat([{ id: b, type: 'spouse' }]) : path(a, b);
                r.weak = weakLinks(r.path);
                return r;
            }
            spousesOf(a).some(function (s) { var y = blood(s.id, b); if (y) { hit = { y: y, s: s.id }; return true; } return false; });
            if (hit) {
                var z = hit.y;
                r.kind = 'inlaw'; r.via = hit.s; r.commons = z.commons; r.m = z.m; r.n = z.n;
                if (isPartner(a, hit.s)) r.label = "partner's " + halfify(label(z.m, z.n, B.sex), z);
                else if (z.m === 1 && z.n === 0) r.label = word(B, 'father-in-law', 'mother-in-law', 'parent-in-law');
                else if (z.m === 1 && z.n === 1) r.label = word(B, 'brother-in-law', 'sister-in-law', 'sibling-in-law');
                else if (z.m === 0 && z.n === 1) { r.label = word(B, 'stepson', 'stepdaughter', 'stepchild'); r.kind = 'step'; }
                else if (z.m === 0 && z.n === 2) { r.label = word(B, 'step-grandson', 'step-granddaughter', 'step-grandchild'); r.kind = 'step'; }
                else r.label = halfify(label(z.m, z.n, B.sex), z) + ' by marriage';
                var p2 = bloodPath(hit.s, b, z) || path(hit.s, b);
                r.path = p2 ? [{ id: a, type: null }].concat(p2.map(function (s, i) { return i === 0 ? { id: s.id, type: 'spouse' } : s; })) : path(a, b);
                r.weak = weakLinks(r.path);
                return r;
            }
            r.path = path(a, b);
            r.kind = r.path ? 'marriage' : 'none';
            r.label = r.kind === 'marriage' ? 'related by marriage' : null;
            r.weak = weakLinks(r.path);
            return r;
        }

        // ---- lists
        function siblings(id) {
            var mine = parentsOf(id), out = {};
            mine.forEach(function (p) { childrenOf(p).forEach(function (c) { if (c !== id) (out[c] = out[c] || []).push(p); }); });
            return Object.keys(out).map(function (c) {
                var theirs = parentsOf(c);
                // half only when both sides list two parents and they share just one
                var half = mine.length > 1 && theirs.length > 1 && out[c].length === 1;
                return { id: c, shared: out[c], half: half };
            });
        }
        function ancestors(id, max) {
            var out = [], q = [{ id: id, gen: 0, path: [id], line: [] }], seen = {};
            while (q.length) {
                var c = q.shift();
                parentsOf(c.id).forEach(function (p) {
                    if (seen[p] || (max && c.gen + 1 > max)) return;
                    seen[p] = true;
                    var side = byId[p].sex === 'M' ? 'father' : byId[p].sex === 'F' ? 'mother' : 'parent';
                    var item = { id: p, gen: c.gen + 1, path: c.path.concat([p]), line: c.line.concat([side]) };
                    out.push(item); q.push(item);
                });
            }
            return out;
        }
        function descendants(id, max) {
            var out = [], q = [{ id: id, gen: 0, path: [id] }], seen = {};
            while (q.length) {
                var c = q.shift();
                childrenOf(c.id).forEach(function (k) {
                    if (seen[k] || (max && c.gen + 1 > max)) return;
                    seen[k] = true;
                    var item = { id: k, gen: c.gen + 1, path: c.path.concat([k]) };
                    out.push(item); q.push(item);
                });
            }
            return out;
        }
        // straight up through fathers (paternal) or mothers (maternal), as far as the records go
        function line(id, which) {
            var out = [], c = id, sex = which === 'maternal' ? 'F' : 'M', first = true;
            for (;;) {
                var ps = parentsOf(c);
                var next = first ? ps.filter(function (p) { return byId[p].sex === sex; })[0] : ps.filter(function (p) { return byId[p].sex === (which === 'maternal' ? 'F' : 'M'); })[0];
                if (!next) break;
                out.push(next); c = next; first = false;
                if (out.length > 40) break;
            }
            return out;
        }
        function ofRelation(id, rel) {
            switch (rel) {
                case 'parents': return parentsOf(id);
                case 'father': return parentsOf(id).filter(function (p) { return byId[p].sex === 'M'; });
                case 'mother': return parentsOf(id).filter(function (p) { return byId[p].sex === 'F'; });
                case 'children': return childrenOf(id);
                case 'sons': return childrenOf(id).filter(function (p) { return byId[p].sex === 'M'; });
                case 'daughters': return childrenOf(id).filter(function (p) { return byId[p].sex === 'F'; });
                case 'spouses': return spousesOf(id).map(function (s) { return s.id; });
                case 'husband': return spousesOf(id).map(function (s) { return s.id; }).filter(function (p) { return byId[p].sex === 'M'; });
                case 'wife': return spousesOf(id).map(function (s) { return s.id; }).filter(function (p) { return byId[p].sex === 'F'; });
                case 'siblings': return siblings(id).map(function (s) { return s.id; });
                case 'brothers': return siblings(id).map(function (s) { return s.id; }).filter(function (p) { return byId[p].sex === 'M'; });
                case 'sisters': return siblings(id).map(function (s) { return s.id; }).filter(function (p) { return byId[p].sex === 'F'; });
                case 'grandparents': return ancestors(id, 2).filter(function (x) { return x.gen === 2; }).map(function (x) { return x.id; });
                case 'grandfathers': return ofRelation(id, 'grandparents').filter(function (p) { return byId[p].sex === 'M'; });
                case 'grandmothers': return ofRelation(id, 'grandparents').filter(function (p) { return byId[p].sex === 'F'; });
                case 'great-grandparents': return ancestors(id, 3).filter(function (x) { return x.gen === 3; }).map(function (x) { return x.id; });
                case 'grandchildren': return descendants(id, 2).filter(function (x) { return x.gen === 2; }).map(function (x) { return x.id; });
                case 'great-grandchildren': return descendants(id, 3).filter(function (x) { return x.gen === 3; }).map(function (x) { return x.id; });
                case 'aunts-uncles': {
                    var out = [];
                    parentsOf(id).forEach(function (p) { siblings(p).forEach(function (s) { if (out.indexOf(s.id) < 0) out.push(s.id); }); });
                    return out;
                }
                case 'nieces-nephews': {
                    var out2 = [];
                    siblings(id).forEach(function (s) { childrenOf(s.id).forEach(function (c) { if (out2.indexOf(c) < 0) out2.push(c); }); });
                    return out2;
                }
                case 'cousins': return cousins(id, 1);
                case 'second-cousins': return cousins(id, 2);
                case 'in-laws': {
                    var out3 = [];
                    spousesOf(id).forEach(function (s) { parentsOf(s.id).concat(siblings(s.id).map(function (x) { return x.id; })).forEach(function (q) { if (out3.indexOf(q) < 0) out3.push(q); }); });
                    siblings(id).forEach(function (s) { spousesOf(s.id).forEach(function (q) { if (out3.indexOf(q.id) < 0) out3.push(q.id); }); });
                    return out3;
                }
                case 'ancestors': return ancestors(id).map(function (x) { return x.id; });
                case 'descendants': return descendants(id).map(function (x) { return x.id; });
            }
            return [];
        }
        // cousins of a given degree: the nearest common ancestors are degree + 1 generations up on both sides
        function cousins(id, degree) {
            var g = degree + 1, out = [];
            ancestors(id, g).filter(function (x) { return x.gen === g; }).forEach(function (anc) {
                descendants(anc.id, g).filter(function (d) { return d.gen === g; }).forEach(function (d) {
                    if (d.id === id || out.indexOf(d.id) >= 0) return;
                    var x = blood(id, d.id);
                    if (x && x.m === g && x.n === g) out.push(d.id);
                });
            });
            return out;
        }
        function generationGap(a, b) {
            var x = blood(a, b);
            if (x) return { gap: x.n - x.m, via: 'common ancestor', commons: x.commons, m: x.m, n: x.n };
            var A = byId[a], B = byId[b];
            if (A && B && A.generation != null && B.generation != null) return { gap: B.generation - A.generation, via: 'tree rows' };
            return null;
        }

        return {
            byId: byId, has: has, parents: parentsOf, children: childrenOf, spouses: spousesOf, siblings: siblings,
            ancestors: ancestors, descendants: descendants, line: line, ofRelation: ofRelation, cousins: cousins,
            relate: relate, path: path, blood: blood, label: label, generationGap: generationGap, word: word
        };
    }

    var api = { create: create };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ArchiveKin = api;
})(typeof self !== 'undefined' ? self : this);
