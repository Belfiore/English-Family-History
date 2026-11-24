"""Build the map styles in map-styles/ from OpenFreeMap's Positron style (MIT licence).

    python3 tools/build-styles.py <positron style.json>

atlas.json: the site's own "Atlas" look: parchment land, muted water, thin warm roads, Cormorant labels,
no shop or restaurant clutter. Tiles from OpenFreeMap (no key). Glyphs are the site's own (fonts/), so
the glyphs URL is a placeholder the page fills in.
fallback.json: used when OpenFreeMap does not answer. Natural Earth land and rivers shipped with the site.
"""
import json, sys, os, copy

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1]

INK = '#3d3328'
SEPIA = '#704214'
LAND = '#f4ecdb'
WATER = '#c9d5d3'
WATER_LINE = '#b3c4c3'
PARK = '#e6e3cc'
WOOD = '#e1dfc6'
RESID = '#efe6d3'
BUILD = '#e8dcc6'
ROAD_MINOR = '#e6d6ba'
ROAD_MAJOR = '#dcc6a0'
ROAD_CASE = '#cdb48a'
MOTORWAY = '#d4b98d'
RAIL = '#c9b79b'
BOUNDARY = '#b8a283'
HALO = 'rgba(244,236,219,0.92)'
TEXT = ['coalesce', ['get', 'name:latin'], ['get', 'name']]
FONT = {'Noto Sans Regular': 'Cormorant Garamond Medium', 'Noto Sans Bold': 'Cormorant Garamond Bold', 'Noto Sans Italic': 'Cormorant Garamond Italic'}

s = json.load(open(SRC))
s = json.loads(json.dumps(s).replace('__TILEJSON_DOMAIN__', 'tiles.openfreemap.org'))
s['name'] = 'Atlas'
s['glyphs'] = '{GLYPHS}'
s.pop('sprite', None)
s['sources'] = {'openmaptiles': s['sources']['openmaptiles']}
s['metadata'] = {'credit': 'Built from OpenFreeMap Positron (MIT) by tools/build-styles.py for the family map.'}
out = []
for l in s['layers']:
    lay = l.get('layout', {})
    if 'icon-image' in lay and l['id'] in ('highway-shield-non-us', 'highway-shield-us-interstate', 'road_shield_us', 'airport'):
        continue
    if l.get('source') not in (None, 'openmaptiles'):
        continue
    lay.pop('icon-image', None); lay.pop('icon-size', None); lay.pop('icon-offset', None)
    for k in list(lay):
        if k.startswith('icon-'):
            lay.pop(k)
    if 'text-font' in lay:
        lay['text-font'] = [FONT.get(f, 'Cormorant Garamond Medium') for f in lay['text-font']][:1]
    if 'text-field' in lay:
        lay['text-field'] = TEXT
    p = l.get('paint', {})
    i, t = l['id'], l['type']
    if i == 'background':
        p['background-color'] = LAND
    elif i == 'park':
        p['fill-color'] = PARK
    elif i == 'water':
        p['fill-color'] = WATER
    elif i.startswith('landcover_ice') or i.startswith('landcover_glacier'):
        p['fill-color'] = '#f7f2e6'
    elif i == 'landuse_residential':
        p['fill-color'] = RESID
    elif i == 'landcover_wood':
        p['fill-color'] = WOOD
    elif i == 'waterway':
        p['line-color'] = WATER_LINE
    elif i == 'building':
        p['fill-color'] = BUILD; p['fill-outline-color'] = '#dccdb2'
    elif i.startswith('aeroway'):
        if t == 'line':
            p['line-color'] = '#e9dfcb'
        else:
            p['fill-color'] = '#efe6d3'
    elif i in ('road_area_pier', 'road_pier'):
        p['fill-color' if t == 'fill' else 'line-color'] = LAND
    elif i == 'highway_path':
        p['line-color'] = '#e2d2b6'; p['line-opacity'] = 0.8
    elif i == 'highway_minor':
        p['line-color'] = ROAD_MINOR
    elif i.endswith('_casing'):
        p['line-color'] = ROAD_CASE
    elif i in ('highway_major_inner',):
        p['line-color'] = '#efe2c8'
    elif i.endswith('_subtle'):
        p['line-color'] = ROAD_MAJOR
    elif 'motorway' in i:
        p['line-color'] = MOTORWAY
    elif i.startswith('railway'):
        p['line-color'] = RAIL if not i.endswith('dashline') else LAND
    elif i.startswith('boundary'):
        p['line-color'] = BOUNDARY
    if t == 'symbol':
        if 'water' in i:
            p['text-color'] = '#5d7270'; p['text-halo-color'] = HALO
        elif i.startswith('highway-name'):
            p['text-color'] = '#7b6a55'; p['text-halo-color'] = HALO
        elif i.startswith('label_country'):
            p['text-color'] = SEPIA; p['text-halo-color'] = HALO
        else:
            p['text-color'] = INK; p['text-halo-color'] = HALO
        p['text-halo-width'] = 1.4
    l['paint'] = p
    l['layout'] = lay
    out.append(l)
s['layers'] = out
json.dump(s, open(os.path.join(ROOT, 'map-styles', 'atlas.json'), 'w'), indent=1)

fallback = {
    'version': 8, 'name': 'Atlas fallback', 'glyphs': '{GLYPHS}',
    'metadata': {'credit': 'Natural Earth land and rivers (public domain), shipped with the site for when OpenFreeMap does not answer.'},
    'sources': {
        'land': {'type': 'geojson', 'data': '{BASE}map-styles/fallback-land.geojson', 'attribution': 'Natural Earth'},
        'rivers': {'type': 'geojson', 'data': '{BASE}map-styles/fallback-rivers.geojson'},
    },
    'layers': [
        {'id': 'background', 'type': 'background', 'paint': {'background-color': WATER}},
        {'id': 'land', 'type': 'fill', 'source': 'land', 'paint': {'fill-color': LAND, 'fill-antialias': True}},
        {'id': 'coast', 'type': 'line', 'source': 'land', 'paint': {'line-color': '#b7a98f', 'line-width': 0.6}},
        {'id': 'rivers', 'type': 'line', 'source': 'rivers', 'paint': {'line-color': WATER_LINE, 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 12, 2.4]}},
    ],
}
json.dump(fallback, open(os.path.join(ROOT, 'map-styles', 'fallback.json'), 'w'), indent=1)
print('atlas layers', len(out))
