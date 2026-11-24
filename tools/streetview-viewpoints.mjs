#!/usr/bin/env node
// Fills in the Street View viewpoints in data/places.json from Google's Street View Image
// Metadata endpoint, which returns where the nearest panorama is and when it was taken. It
// never downloads or saves any imagery.
//
//   GOOGLE_STREETVIEW_KEY=... node tools/streetview-viewpoints.mjs           write data/places.json
//   GOOGLE_STREETVIEW_KEY=... node tools/streetview-viewpoints.mjs --dry     print what would change
//   options: --only id,id   --radius 50 (metres)   --force (redo places that already have a panorama)
//
// The key comes from the environment and must never be committed. Use a key of its own,
// restricted to the Street View Static API, not the browser key in config.js.
// For each place it records panoLat and panoLng (the panorama), captureDate (its month), and
// heading (from the panorama to the place). Every viewpoint stays checked: false until someone
// has looked at the view and confirmed it shows the right building.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'data', 'places.json');
const KEY = process.env.GOOGLE_STREETVIEW_KEY;
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE = args.includes('--force');
const arg = (name, dflt) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : dflt; };
const ONLY = arg('--only', '') ? new Set(arg('--only', '').split(',')) : null;
const RADIUS = +arg('--radius', 50);

if (!KEY) {
    console.error('Set GOOGLE_STREETVIEW_KEY to a Google key with the Street View Static API enabled. It is read from the environment and never written anywhere.');
    process.exit(1);
}

const toRad = (d) => d * Math.PI / 180;
// initial bearing from a to b, degrees clockwise from north
function bearing(a, b) {
    const f1 = toRad(a.lat), f2 = toRad(b.lat), dl = toRad(b.lng - a.lng);
    const y = Math.sin(dl) * Math.cos(f2), x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function metres(a, b) {
    const R = 6371008.8, f1 = toRad(a.lat), f2 = toRad(b.lat), df = toRad(b.lat - a.lat), dl = toRad(b.lng - a.lng);
    const h = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}
const round = (n, d) => Math.round(n * 10 ** d) / 10 ** d;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function metadata(lat, lng) {
    const u = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
    u.searchParams.set('location', lat + ',' + lng);
    u.searchParams.set('radius', String(RADIUS));
    u.searchParams.set('source', 'outdoor');
    u.searchParams.set('key', KEY);
    const r = await fetch(u);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
}

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const report = { set: [], none: [], skipped: [], errors: [] };

for (const p of data.places) {
    const sv = p.streetView;
    if (!sv) continue;
    if (ONLY && !ONLY.has(p.id)) continue;
    if (sv.panoLat != null && !FORCE) { report.skipped.push(p.id); continue; }
    const target = { lat: sv.targetLat ?? p.lat, lng: sv.targetLng ?? p.lng };
    let m;
    try { m = await metadata(target.lat, target.lng); } catch (e) { report.errors.push(p.id + ': ' + e.message); continue; }
    await sleep(120);
    if (m.status !== 'OK' || !m.location) { report.none.push(`${p.id}: ${m.status}`); continue; }
    const pano = { lat: m.location.lat, lng: m.location.lng };
    const away = metres(pano, target);
    const change = {
        panoLat: round(pano.lat, 6), panoLng: round(pano.lng, 6),
        heading: away < 3 ? null : Math.round(bearing(pano, target)),
        captureDate: m.date || null,
        checked: false,
        method: `Street View metadata, ${today}: the nearest outdoor panorama within ${RADIUS} m, ${Math.round(away)} m from the place; heading from the panorama to the place. Not yet checked by eye.`
    };
    report.set.push(`${p.id}: panorama ${Math.round(away)} m away, ${change.captureDate || 'date unknown'}, heading ${change.heading ?? 'none'}`);
    if (!DRY) Object.assign(sv, change);
}

if (!DRY) fs.writeFileSync(FILE, JSON.stringify(data, null, 1) + '\n');
console.log(`${DRY ? 'Would set' : 'Set'} ${report.set.length} viewpoint(s):`);
report.set.forEach((l) => console.log('  ' + l));
if (report.none.length) { console.log(`No panorama within ${RADIUS} m (left as they were):`); report.none.forEach((l) => console.log('  ' + l)); }
if (report.errors.length) { console.log('Errors:'); report.errors.forEach((l) => console.log('  ' + l)); }
if (report.skipped.length) console.log(`${report.skipped.length} already had a panorama (use --force to redo them).`);
console.log('Every viewpoint is still checked: false. Look at each one before marking it checked.');
