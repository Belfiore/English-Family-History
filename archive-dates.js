/* Stuart: date and age arithmetic.
 *
 * Every date in the knowledge base carries a range ({from, to, precision, qualifier}) built from what the record
 * actually says. Ages are worked out from both ends of both ranges, so a birth known only as "about 1866 to 1869"
 * gives "between 59 and 63", never a single number the records cannot support.
 */
(function (root) {
    'use strict';
    function parse(s) {
        if (!s) return null;
        var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
        return m ? { y: +m[1], m: +m[2], d: +m[3] } : null;
    }
    // whole years from a to b
    function years(a, b) {
        var A = parse(a), B = parse(b);
        if (!A || !B) return null;
        var n = B.y - A.y;
        if (B.m < A.m || (B.m === A.m && B.d < A.d)) n--;
        return n;
    }
    function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

    // age at an event, from a birth range and an event range
    function age(birth, event) {
        if (!birth || !event) return null;
        var bFrom = birth.from, bTo = birth.to, eFrom = event.from, eTo = event.to;
        if (!bTo || !eFrom) return null;
        var min = years(bTo, eFrom);
        var max = bFrom && eTo ? years(bFrom, eTo) : null;
        if (min == null) return null;
        if (min < 0) min = 0;
        return { min: min, max: max, exact: max === min && birth.precision === 'day' && event.precision === 'day' };
    }
    function ageText(a) {
        if (!a) return null;
        if (a.max == null) return 'at least ' + a.min;
        if (a.min === a.max) return (a.exact ? '' : 'about ') + a.min;
        return 'between ' + a.min + ' and ' + a.max;
    }
    function year(r) { return r && (r.from || r.to) ? +String(r.from || r.to).slice(0, 4) : null; }
    function midYear(r) {
        if (!r) return null;
        var a = r.from ? +r.from.slice(0, 4) : null, b = r.to ? +r.to.slice(0, 4) : null;
        if (a == null) return b; if (b == null) return a;
        return Math.round((a + b) / 2);
    }
    // does a range fall (wholly or partly) inside a period [y1, y2]?
    function within(r, y1, y2) {
        if (!r) return false;
        var a = r.from ? +r.from.slice(0, 4) : -Infinity, b = r.to ? +r.to.slice(0, 4) : Infinity;
        return a <= y2 && b >= y1;
    }
    function sortKey(r) { return r ? (r.from || r.to || '9999') : '9999'; }
    function precise(r) { return !!r && r.precision === 'day' && !r.qualifier; }

    // periods a visitor may name
    var NAMED = {
        'first world war': [1914, 1918], 'great war': [1914, 1918], 'ww1': [1914, 1918], 'wwi': [1914, 1918],
        'second world war': [1939, 1945], 'ww2': [1939, 1945], 'wwii': [1939, 1945], 'the blitz': [1940, 1941], 'blitz': [1940, 1941],
        'korean war': [1950, 1953], 'victorian': [1837, 1901], 'edwardian': [1901, 1910], 'the war': [1939, 1945]
    };
    var WORDS = { twenties: 20, thirties: 30, forties: 40, fifties: 50, sixties: 60, seventies: 70, eighties: 80, nineties: 90 };
    function period(text) {
        var t = String(text || '').toLowerCase().replace(/[‘’]/g, "'");
        var m;
        if ((m = /\bbetween\s+(1[5-9]\d\d|20\d\d)\s+and\s+(1[5-9]\d\d|20\d\d)\b/.exec(t))) return { from: +m[1], to: +m[2], text: m[0] };
        if ((m = /\b(1[5-9]\d\d|20\d\d)\s*(?:to|-|until|till)\s*(1[5-9]\d\d|20\d\d)\b/.exec(t))) return { from: +m[1], to: +m[2], text: m[0] };
        if ((m = /\b(?:the\s+)?(1[5-9]\d0|20\d0)'?s\b/.exec(t))) return { from: +m[1], to: +m[1] + 9, text: m[0] };
        if ((m = /\b(?:the\s+)?(?:(18|19)(?:00)?'?s?\s+)?(twenties|thirties|forties|fifties|sixties|seventies|eighties|nineties)\b/.exec(t))) { var c = m[1] ? +m[1] * 100 : 1900; return { from: c + WORDS[m[2]], to: c + WORDS[m[2]] + 9, text: m[0] }; }
        if ((m = /\b(\d{1,2})(?:st|nd|rd|th)\s+century\b/.exec(t))) { var s = (+m[1] - 1) * 100; return { from: s, to: s + 99, text: m[0] }; }
        if ((m = /\b(before|after)\s+(1[5-9]\d\d|20\d\d)\b/.exec(t))) return m[1] === 'before' ? { from: 1000, to: +m[2] - 1, text: m[0] } : { from: +m[2] + 1, to: 2100, text: m[0] };
        var keys = Object.keys(NAMED).sort(function (a, b) { return b.length - a.length; });
        for (var i = 0; i < keys.length; i++) if (t.indexOf(keys[i]) >= 0) return { from: NAMED[keys[i]][0], to: NAMED[keys[i]][1], text: keys[i], named: true };
        if ((m = /\b(?:in|during|of|around|about)\s+(1[5-9]\d\d|20\d\d)\b/.exec(t)) || (m = /\b(1[5-9]\d\d|20\d\d)\b/.exec(t))) return { from: +m[1], to: +m[1], text: m[1], year: true };
        return null;
    }

    var api = { years: years, age: age, ageText: ageText, year: year, midYear: midYear, within: within, sortKey: sortKey, precise: precise, period: period, cmp: cmp };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.ArchiveDates = api;
})(typeof self !== 'undefined' ? self : this);
