# The family map on this site

`map.html` shows where the FitzMaurice and Andrews families were born, lived, married, worked, served, sailed, died and were buried, on a map, a timeline and a list. It is built from `data/people.json`, `data/places.json` and `data/sources.json` every time the site is built.

How the map works (the event index, drawing places, map styles, filters, modes, the step player and the plan for a guided tour, Street View) is now part of the shared engine and documented there: `docs/map.md` in [Belfiore/family-site-engine](https://github.com/Belfiore/family-site-engine). This note keeps what is particular to this site.

## This site's settings

In `site.config.json`, under `map`:

- **Home region**: England. The map frames England first; places elsewhere (South Africa, Australia, Egypt) are on the "Beyond England" chip.
- **Then**: the National Library of Scotland's Ordnance Survey maps (`historicMaps: "uk-os"`), which need the MapTiler key.
- **Keys**: `maptilerKey` and `googleEmbedKey`, restricted to this site's address. How to make or change them is in `docs/map-keys.md`.
- **Branches**: Ron and Pat (the default), Falcke and FitzMaurice, Reg's brother and sisters, Bennett of Bodmin, and the others, each tied to its story pages.
- **Families**: Ron's family, Pat's family, or both, for the Family filter.
- **The timeline** relates people to Pat and Ron ("Pat's father").

The Hamiltons and the Earls of Orkney are left off the map (`tree.hiddenRegions`), except Cecil O'Bryen FitzMaurice, who is kept and marked as having no proven link (`tree.suspectedRelatives`).

## Street View viewpoints

The viewpoint for each place in `data/places.json` (where to stand, which way to face) was filled in with the engine's `tools/streetview-viewpoints.mjs` and checked by eye on 24 November 2026; `docs/map-audit.md` records the checks. No Google imagery is saved in this repository.

## Testing

`node tests/verify-map.js` checks the built map against this site's data: place links and sources, PR #3's held-back list, dates no more precise than the records, approximate places drawn as dashed pins, the Orkney line left off (except Cecil), the family filter, the key, person scopes, the peek, the modes, the step player, the timeline, Street View links, URL state, the list view and the fallback without WebGL. It blocks every outside host, so it runs on the fallback map. `SHOTS=1` writes screenshots to `tests/screenshots/`.
