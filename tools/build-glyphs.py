"""Build MapLibre glyph files (signed distance fields, 24 px, 3 px buffer) for the site's fonts.

    python3 tools/build-glyphs.py <folder with the .ttf files>

Writes fonts/<font stack>/<start>-<end>.pbf for the Atlas map style, so map labels use the site's
Cormorant Garamond. The fonts are under the SIL Open Font License (fonts/OFL.txt).
Needs: pip install freetype-py numpy scipy
"""
import os, sys
import numpy as np
import freetype
from scipy.ndimage import distance_transform_edt

SIZE, BUFFER, RADIUS, CUTOFF, SCALE = 24, 3, 8.0, 0.25, 4
RANGES = [(0, 255), (256, 511), (512, 767), (768, 1023), (7680, 7935), (8192, 8447), (8448, 8703)]
STACKS = [
    ('Cormorant Garamond Medium', 'CormorantGaramond[wght].ttf', 'Medium'),
    ('Cormorant Garamond SemiBold', 'CormorantGaramond[wght].ttf', 'SemiBold'),
    ('Cormorant Garamond Bold', 'CormorantGaramond[wght].ttf', 'Bold'),
    ('Cormorant Garamond Italic', 'CormorantGaramond-Italic[wght].ttf', 'Medium Italic'),
]


def varint(n):
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def zigzag(n):
    return (n << 1) ^ (n >> 31)


def field(num, wire, payload):
    return varint((num << 3) | wire) + payload


def f_uint(num, v):
    return field(num, 0, varint(v))


def f_sint(num, v):
    return field(num, 0, varint(zigzag(v) & 0xFFFFFFFF))


def f_bytes(num, b):
    return field(num, 2, varint(len(b)) + b)


def open_face(path, instance):
    face = freetype.Face(path)
    names = [n.name if isinstance(n.name, str) else n.name.decode() for n in face.get_variation_info().instances] if face.has_multiple_masters else []
    try:
        face.set_var_named_instance(instance)
    except Exception:
        # pick the instance whose name contains the wanted words
        for i, n in enumerate(names):
            if all(w.lower() in n.lower() for w in instance.split()):
                face.set_var_named_instance(n)
                break
    return face


def sdf_for(face, code):
    gi = face.get_char_index(code)
    if gi == 0 and code != 32:
        return None
    # metrics at the base size
    face.set_pixel_sizes(0, SIZE)
    face.load_char(chr(code), freetype.FT_LOAD_DEFAULT | freetype.FT_LOAD_NO_HINTING)
    adv = int(round(face.glyph.advance.x / 64.0))
    # render big for an accurate distance field
    face.set_pixel_sizes(0, SIZE * SCALE)
    face.load_char(chr(code), freetype.FT_LOAD_RENDER | freetype.FT_LOAD_NO_HINTING)
    g = face.glyph
    bm = g.bitmap
    w_big, h_big = bm.width, bm.rows
    if w_big == 0 or h_big == 0:
        return dict(id=code, bitmap=b'', width=0, height=0, left=0, top=0, advance=adv)
    a = np.array(bm.buffer, dtype=np.uint8).reshape(h_big, bm.pitch)[:, :w_big].astype(np.float32) / 255.0
    left_big, top_big = g.bitmap_left, g.bitmap_top
    # glyph box at base size
    left = int(np.floor(left_big / SCALE))
    top = int(np.ceil(top_big / SCALE))
    w = int(np.ceil((left_big + w_big) / SCALE)) - left
    h = top - int(np.floor((top_big - h_big) / SCALE))
    W, H = w + 2 * BUFFER, h + 2 * BUFFER
    pad = BUFFER * SCALE + SCALE * 2
    big = np.zeros((H * SCALE + 2 * pad, W * SCALE + 2 * pad), dtype=np.float32)
    ox = (left_big - left * SCALE) + BUFFER * SCALE + pad
    oy = (top * SCALE - top_big) + BUFFER * SCALE + pad
    big[oy:oy + h_big, ox:ox + w_big] = a
    inside = big >= 0.5
    d_out = distance_transform_edt(~inside)
    d_in = distance_transform_edt(inside)
    dist = (d_out - d_in) / SCALE  # positive outside, in base pixels
    # sample at the centre of each base pixel
    ys = pad + np.arange(H) * SCALE + SCALE // 2
    xs = pad + np.arange(W) * SCALE + SCALE // 2
    d = dist[np.ix_(ys, xs)]
    val = np.clip(np.round(255 - 255 * (d / RADIUS + CUTOFF)), 0, 255).astype(np.uint8)
    return dict(id=code, bitmap=val.tobytes(), width=w, height=h, left=left, top=top - SIZE - BUFFER, advance=adv)


def encode_glyph(g):
    b = f_uint(1, g['id'])
    if g['bitmap']:
        b += f_bytes(2, g['bitmap'])
    b += f_uint(3, g['width']) + f_uint(4, g['height']) + f_sint(5, g['left']) + f_sint(6, g['top']) + f_uint(7, g['advance'])
    return b


def build(src, out_root):
    for name, file, inst in STACKS:
        face = open_face(os.path.join(src, file), inst)
        d = os.path.join(out_root, name)
        os.makedirs(d, exist_ok=True)
        for a, z in RANGES:
            glyphs = []
            for code in range(a, z + 1):
                if code < 32:
                    continue
                g = sdf_for(face, code)
                if g:
                    glyphs.append(f_bytes(3, encode_glyph(g)))
            stack = f_bytes(1, name.encode()) + f_bytes(2, f'{a}-{z}'.encode()) + b''.join(glyphs)
            with open(os.path.join(d, f'{a}-{z}.pbf'), 'wb') as fh:
                fh.write(f_bytes(1, stack))
        print(name, 'done')


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else '.'
    build(src, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'fonts'))
