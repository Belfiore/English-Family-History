# How the family map is built

`map.html` is the family map. It is a static page like the rest of the site: no build step, no server code. Everything it shows comes from the three data files the rest of the site already uses, so new research in `data/people.json`, `data/places.json` or `data/sources.json` appears on the map, in the timeline and in the list the next time the page loads.

This note is for whoever works on the page next. It explains how the page is put together, the step format the players use, and the plan for adding a guided tour later.

## The files

| File | What it does |
| --- | --- |
| `map.html` | The page: header, mode switcher, map stage, key, panels, timeline dock, Street View overlay, list and tray sheets. |
| `map.css` | All of the map's styling, in the site's palette and type. |
| `config.js` | The two optional keys: `MAPTILER_KEY` for the old Ordnance Survey maps and `GOOGLE_EMBED_KEY` for in-page Street View. Both are empty in the repo. |
| `vendor/maplibre-gl-5.24.1/` | MapLibre GL JS, pinned and kept in the repo so the page never depends on a CDN. |
| `map-glyphs.js` | `FM.glyph(type)`: the engraved line symbols for each kind of event, used on markers, in the key, on the timeline track and in cards. |
| `map-data.js` | `FM.data`: loads the three data files and builds the event index. Date rules, sentences, branches, the living-people guard. |
| `map-player.js` | `FM.Player` (the step player), `FM.Camera` (camera choreography) and `FM.geo` (distance and zoom helpers). Knows nothing about families or modes. |
| `map-ui.js` | Explore mode and everything shared: map styles, overlays, markers, peek, panels, key and filters, person search, Street View, list and tray, URL state, the mode registry and keyboard handling. |
| `map-steps.js` | `FM.eventCard` (one event drawn as a card) and `FM.stepStage` (plays any hand-made list of steps). Shared by Timeline now and by a tour later. |
| `map-timeline.js` | Timeline mode: turns the event index into steps and plays them, with the track, the event list, scrubbing, trails and voyage arcs. |
| `map-styles/` | `atlas.json` (the site's own map style over OpenFreeMap tiles) and `fallback.json` with its two GeoJSON files (a plain map drawn from the site's own files, used when the tiles do not load). |
| `fonts/` | Cormorant Garamond glyphs for map labels, built from the OFL fonts by `tools/build-glyphs.py`. |
| `tools/` | `build-glyphs.py`, `build-styles.py` and `streetview-viewpoints.mjs` (see below). |
| `tests/verify-map.js` | The map's checks, in the same style as `tests/verify-canvas.js`. |

Scripts load in this order, and each one only uses what loaded before it: `config.js`, MapLibre, `records.js` (the site's lightbox), `map-glyphs.js`, `map-data.js`, `map-player.js`, `map-ui.js`, `map-steps.js`, `map-timeline.js`. Leaving `map-timeline.js` out still gives a working page with Explore only; the tests check this.

## The event index

`FM.data.build()` turns the three files into one list of events. Every marker, card, list row and timeline beat is drawn from it.

- An event in `places.json` that mirrors a fact in `people.json` (its `factRef`) takes its date, wording and confidence from `people.json`, so the map never says more than the tree does.
- An event that only a page records (`factRef` empty) comes from `places.json` as written.
- Any placed fact in `people.json` that `places.json` does not list yet is added automatically.
- Voyages come from each person's `voyages` in `people.json`.
- A sentence from a person's timeline is borrowed when it fits the event, unless it names a living person, in which case a plain sentence is generated instead.
- A dated fact with no place yet goes to the "Not yet on the map" tray and gets a "Place not known" beat in the timeline.
- Living people, and anyone the site shows by name and relationship only, are dropped from every event before anything is drawn.

Dates: an exact day or month is kept as it is; a season becomes its quarter (early, spring, summer, late); "about", "probably" and "likely" mark a date as approximate; ranges and decades keep both ends. The timeline plays an approximate or ranged date at its earliest possible point and lights its range bar while the playhead is inside it.

## Drawing places

Each place has a `drawAs` in `places.json`:

- `pin`: a known address or building. A teardrop pin, which can open Street View.
- `halo`: a place known only roughly. A dashed pin; while it is in focus a soft circle shows its uncertainty.
- `area`: a district, parish, county or country. A dashed pin in the middle of the area; while it is in focus a dashed circle shows roughly how far it reaches.

Every marker is named by who and what ("Edward FitzMaurice's home", "Annie Cousins' death"): `FM.data.headline()` builds the phrase from the event's people and type. From zoom 13 the name appears under each pin; the peek lists the events by the same phrases, and a cluster's peek lists its places that way.

Markers are HTML elements on top of the map, clustered in screen space (closer than 34 pixels share a marker; no clustering from zoom 15.5). They are ordered in the document by first date, so Tab walks the family's places in date order. Areas, soft circles, trails, voyage arcs and the person path are GeoJSON layers drawn under the map's labels.

Progressive disclosure in Explore: level 0 is the map with its markers; level 1 the peek on hover, focus or first tap; level 2 the place or person panel; level 3 the record, photo or Street View from the panel; level 4 the person's full profile in the family tree.

## Map styles

- Today (default): OpenFreeMap's Liberty style.
- Atlas: `map-styles/atlas.json` over OpenFreeMap vector tiles, in the site's palette with Cormorant labels.
- Then: the National Library of Scotland's Ordnance Survey maps through MapTiler, the edition chosen by year (`FM.editionFor`). Needs `MAPTILER_KEY`.
- If the tiles fail or take more than eight seconds, the page switches to `fallback.json` and says so.

`FM.setThenEdition(year)` crossfades between editions; Timeline's "Period map follows the year" uses it, and a tour can too.

## Filters

- Family: Everyone, Ron's family, Pat's family, or both, back a chosen number of generations (parents to 3x great-grandparents, or every generation), with or without their brothers and sisters. `FM.familySet()` returns the people; the URL keeps `family`, `gen` and `siblings`.
- The key (kinds of event), the year range and a person with a scope (just them, with spouse, parents and children, ancestors, descendants) work on top of the family.
- The Hamiltons and the Earls of Orkney are left out of the index entirely; only Cecil O'Bryen FitzMaurice is kept, marked as no proven link (`KEEP_ORKNEY` in `map-data.js`).

## Modes

A mode is registered with:

```js
FM.registerMode('timeline', {
    label: 'Timeline',
    enter: function (state) { /* show your controls; state holds this mode's URL values */ },
    leave: function () { /* hide them and stop anything running */ },
    urlState: function () { return { event: 'some-event-id', speed: null }; },  // null values are left out of the URL
    applyState: function (state) { /* move to the state a URL or the back button asks for */ }
});
```

The switcher, the URL router and the keyboard read the registry, so a new mode appears in the switcher, gets its own URL values and its own keys without changes elsewhere. A URL naming a mode that is not registered (today, `mode=tour`) opens Explore and drops the unknown value. Filters, the person, the scope, the map style and the Orkney setting belong to the page, not the mode, and survive switching.

## The step player and the step format

`FM.Player` plays an ordered list of steps. It does not know what a step means; it emits events and a mode decides what to draw.

```js
var player = new FM.Player({
    speed: 1,
    dwellFor: function (step) { return step.dwell; },              // milliseconds at 1x
    transitionFor: function (from, to) { return 1200; }           // milliseconds at 1x between steps
});
player.on('enter', function (step, index, context) { /* draw the card, frame the map */ });
player.on('transition', function (progress, from, to) { /* 0 to 1 between two steps */ });
player.on('state', function (s) { /* s.index, s.playing, s.count */ });
player.on('end', function () {});
player.setSteps(steps, 0);
player.play(); player.pause(); player.next(); player.prev(); player.goTo(5); player.setSpeed(2);
```

A step:

```json
{
  "id": "plaistow-1941",
  "places": ["23-sutton-court-road"],
  "events": ["mr-hg-andrews-death", "mrs-hg-andrews-death", "sidney-andrews-death"],
  "camera": { "center": [0.0335, 51.5257], "zoom": 16, "pitch": 0, "bearing": 0 },
  "card": { "title": "Plaistow, 19 April 1941", "text": "A short narration written for this stop." },
  "dwell": 8000,
  "waitForNext": true
}
```

- `places` and `events` are ids from `places.json` and the event index. The card shows each event with `FM.eventCard`, and the map highlights the places.
- `camera` is optional. Without it, `FM.Camera` frames the step's places for their precision (an address close, a town wider, a district to its extent, a long journey zoomed out first). With it, the map flies to exactly that view.
- `card` is optional narration above the event cards.
- `dwell` is how long the step stays at 1x; `waitForNext` holds the step until the visitor presses Next.

`FM.Camera` handles every movement: gentle flights, zooming out to show both ends of a long journey, never rotating, cuts and short crossfades when the visitor prefers reduced motion, and stopping when the visitor pans or zooms by hand (the page then shows a "Follow again" chip).

`FM.stepStage.run(steps, { autoplay: false })` plays a hand-made list with the shared card, Previous, Next, Finish, Esc and focus handling. It is all a tour needs to play its stops. The test suite runs it with three made-up steps and `map-timeline.js` left out.

Timeline builds its steps from the event index: one step per beat, where a beat is the events of one day (or one year when only the year is known), or one voyage. Its dwell is four to eight seconds at 1x, scaled to the length of the sentences.

## The proposed `data/tours.json`

Not built yet. The suggested shape:

```json
{
  "tours": [
    {
      "id": "england",
      "title": "A tour through the family's England",
      "intro": "One or two sentences shown before the first stop.",
      "stops": [
        {
          "id": "battersea-1817",
          "places": ["st-marys-battersea"],
          "events": ["pe--st-marys-battersea--married--1817-10-15--william-gottlob-falcke"],
          "camera": { "center": [-0.1737, 51.4789], "zoom": 15.5 },
          "period": 1894,
          "card": { "title": "Battersea, 1817", "text": "Narration for this stop, sourced like everything else on the site." },
          "media": [{ "file": "images/records/example.jpg", "alt": "What the record shows" }],
          "sourceIds": ["parish-battersea-falcke-marriages"],
          "waitForNext": true
        }
      ]
    }
  ]
}
```

- `period` (optional) asks for the Then map nearest that year, through `FM.setThenEdition`.
- `media` (optional) adds a record or photo to the card, opening in the site's lightbox.
- Every stop cites `sourceIds` from `data/sources.json`, and the tour's tests check them like the rest of the map.

## Adding a tour

1. Write `data/tours.json` in the shape above, ten to fourteen stops, each with its sources.
2. Add `map-tour.js`, loaded after `map-steps.js`. It loads `data/tours.json`, maps each stop to a step (`places`, `events`, `camera`, `card`, `waitForNext: true`) and registers the mode:

    ```js
    FM.registerMode('tour', {
        label: 'Tour',
        enter: function (st) { /* fetch tours.json, then */ FM.stepStage.run(steps, { autoplay: false }); /* go to st.stop if given */ },
        leave: function () { FM.stepStage.stop(); },
        urlState: function () { var p = FM.stepStage.player(); return { stop: p ? p.current().id : null }; },
        applyState: function (st) { /* go to st.stop */ }
    });
    ```

3. Add a "Take the tour" button where the design wants it (the header beside the switcher, or the Explore landing state) that calls `FM.setMode('tour')`.
4. If a stop has `period`, call `FM.setThenEdition(stop.period)` in an `enter` listener on `FM.stepStage.player()`.
5. Add checks to `tests/verify-map.js`: every stop's places, events and sources exist; `mode=tour` opens the tour at the first stop and `mode=tour&stop=...` at that stop; Next, Previous and Esc; reduced motion cuts.
6. Remove the `mode=tour` fallback check from the tests, since the mode now exists.

Nothing in Explore or Timeline needs to change.

## Street View

`FM.sv` builds both kinds of link from a place's `streetView` entry:

- Without a key, the button is a Google Maps link that opens in a new tab: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=LAT,LNG&heading=H&pitch=P&fov=F`. Heading is left out while a viewpoint has not been checked, so Google faces the camera at the viewpoint itself.
- With `GOOGLE_EMBED_KEY`, the button opens an overlay with the Maps Embed API (`https://www.google.com/maps/embed/v1/streetview?key=...&location=LAT,LNG&heading=H&pitch=P&fov=F&language=en-GB`), the place's old photo or record beside it, and an honest caption. Opening it pauses the timeline and closing it resumes.

No Google imagery is ever saved into the repo. `tools/streetview-viewpoints.mjs` can fill in `panoLat`, `panoLng`, `heading` and `captureDate` from Google's Street View metadata endpoint, with a key read from the environment (never committed):

```sh
GOOGLE_STREETVIEW_KEY=... node tools/streetview-viewpoints.mjs          # writes data/places.json
GOOGLE_STREETVIEW_KEY=... node tools/streetview-viewpoints.mjs --dry    # prints what it would change
```

It records each viewpoint as unchecked; `checked` becomes true only once someone has looked at the view.

## Keys

`config.js` holds the two browser keys. Both are restricted to the site's address in their own consoles, which is what keeps them safe in a public repo:

- MapTiler: allowed HTTP origins `https://belfiore.github.io`.
- Google: Maps Embed API only, HTTP referrer `https://belfiore.github.io/*`.

The build-time Street View key is a different key and never goes in the repo.

## Rebuilding the fonts and styles

```sh
python3 tools/build-glyphs.py /path/to/cormorant-garamond-ttf-files    # writes fonts/{fontstack}/{range}.pbf
python3 tools/build-styles.py /path/to/positron.json                   # writes map-styles/atlas.json and fallback.json
```

## Tests

```sh
node tests/verify-map.js            # needs Playwright with Chromium
SHOTS=1 node tests/verify-map.js    # also writes the screenshots in tests/screenshots/
node tests/verify-canvas.js         # the family tree's checks, which must keep passing
```

The map test blocks every outside host, so it runs on the fallback map and a stand-in for Google's Street View page.
