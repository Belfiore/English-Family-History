/* Where things are, for this site's tests. The tests run against the built site (DIST, made by the engine's
 * build: python3 <engine>/build/build_site.py --site . --out _site), read the family's data from the site's own
 * source (ROOT), and find the engine's scripts inside the built site under engine/<version>/ (ENGINE). */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const DIST = path.resolve(process.env.DIST || path.join(ROOT, '_site'));
if (!fs.existsSync(path.join(DIST, 'engine-build.json'))) {
    console.error('No built site at ' + DIST + '. Build it first: python3 <engine>/build/build_site.py --site . --out _site (or set DIST).');
    process.exit(2);
}
const BUILD = JSON.parse(fs.readFileSync(path.join(DIST, 'engine-build.json'), 'utf8'));
const ENGINE = path.join(DIST, 'engine', BUILD.engine);
module.exports = { ROOT, DIST, ENGINE, BUILD };
