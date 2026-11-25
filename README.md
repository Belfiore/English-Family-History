# The FitzMaurice & Andrews family history

Grandma Pat and Grandpa Ron, and the families they came from: a family tree, a family map, the branch pages, Ron's war in Egypt, the 1950 wedding album, and Stuart, the family archivist, who answers questions from the records on the site.

## How the site is built

The family tree, the family map, Stuart and the navigation bar come from the shared engine, [Belfiore/family-site-engine](https://github.com/Belfiore/family-site-engine). This repository holds only what belongs to this family:

| | |
| --- | --- |
| `site.config.json` | The site's settings: its name, pages and navigation, the two sides of the tree, the map's branches and keys, Stuart's anchors and story pages. See the engine's `docs/site-config.md` |
| `data/` | `people.json`, `sources.json` and `places.json`: the family, the records and the places. See the engine's `docs/data-format.md` |
| `*.html`, `styles.css`, `branch.css`, `script.js` | The home page and the story pages |
| `images/`, `photos/` | Photographs and records |
| `tests/` | This site's checks, run against every build before it is published |
| `docs/` | Research notes and audits for this site |

On every push to `main`, GitHub Actions checks the data, builds the site with the engine version this site's channel points to (`engine.channel`: `canary`, so this site gets new engine releases first), runs the checks in `tests/` against the build, and publishes it. If anything fails, nothing is published and the live site stays as it was. A pull request gets the same checks without publishing.

## Changing the site

- **The family**: edit `data/*.json`. The build checks every change: a broken link between people, an id used twice or a date that is not a date stops it, with a message saying what to fix.
- **A story page**: edit the page as usual. Give its headings `id`s, and add it to `stuart.pages` in `site.config.json` if Stuart should read it. The navigation bar on every page comes from `nav` in `site.config.json`; whatever bar a page has is replaced.
- **The navigation**: `nav` in `site.config.json`.

## Seeing it before it is published

With a copy of the engine next to this folder:

```sh
python3 ../family-site-engine/build/validate.py --site .                 # check the data
python3 ../family-site-engine/build/build_site.py --site . --out _site   # build
python3 -m http.server -d _site 8000                                      # open http://localhost:8000
```

The checks (they need Node and Playwright with Chromium, and test the build in `_site`):

```sh
node tests/verify-canvas.js      # the family tree
node tests/verify-map.js         # the family map
node tests/verify-archive.js     # Stuart, with the 177 test questions
```

## Rolling back

If an engine release breaks something here: **Actions > Build and publish the site > Run workflow**, with the engine version that last worked. To stay on it until a fix is out, set `"engine": { "version": "1.0.0" }` in `site.config.json`, and remove it afterwards.
