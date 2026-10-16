"""Process the character renders that were added to the Drive folder after
`process-character-art.py` last ran: the four new fairy expressions and the
faded blue flame.

The Drive `ภูติน้อย` folder was renumbered since the original run, so this
script maps by the CURRENT file names. The faded flame is aligned to the
already-published `blue-flame-normal` so the pair shares one framing.

Usage: python scripts/process-new-character-art.py <drive images dir> <public characters dir>
"""
import importlib.util
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = sys.argv[1]  # .../__nurse-projects/images (contains ตัวละคร/)
OUT = sys.argv[2]  # frontend/public/images/characters


def _import(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# The helper modules use dash-separated file names, so import them by path.
cutout = _import("character_cutout", os.path.join(os.path.dirname(__file__), "character-cutout.py"))
remove_checker = cutout.remove_checker

FAIRY_CANVAS = (560, 720)
FAIRY_BODY_H = 660
FAIRY_BOTTOM_MARGIN = 20


def load(folder, name):
    return Image.open(os.path.join(SRC, "ตัวละคร", folder, name)).convert("RGBA")


def body_box(img):
    alpha = np.asarray(img.getchannel("A")) > 40
    lab, n = ndimage.label(ndimage.binary_closing(alpha, iterations=3))
    sizes = ndimage.sum(alpha, lab, range(1, n + 1))
    ys, xs = np.nonzero(lab == int(np.argmax(sizes)) + 1)
    return xs.min(), ys.min(), xs.max(), ys.max()


def place(img, scale, src_anchor, dst_anchor, canvas):
    """Scale `img` and paste so src_anchor lands on dst_anchor."""
    w, h = img.size
    scaled = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    ox = round(dst_anchor[0] - src_anchor[0] * scale)
    oy = round(dst_anchor[1] - src_anchor[1] * scale)
    out.paste(scaled, (ox, oy), scaled)
    return out


def fairy(img):
    x0, y0, x1, y1 = body_box(img)
    scale = FAIRY_BODY_H / (y1 - y0)
    cw, ch = FAIRY_CANVAS
    return place(img, scale, ((x0 + x1) / 2, y1), (cw / 2, ch - FAIRY_BOTTOM_MARGIN), FAIRY_CANVAS)


def save(img, slug):
    path = os.path.join(OUT, f"{slug}-{img.width}x{img.height}.png")
    img.save(path, optimize=True)
    print(f"{os.path.basename(path):40s} {os.path.getsize(path) // 1024:4d} KB")


# ── Fairy: the four expressions added to the Drive set (current numbering) ──
fairy_files = [
    ("03-ภูติ - สงสัย.png", "curious"),
    ("07-ภูติ - ตื่นเต้น.png", "excited"),
    ("09-ภูติ - กลัว.png", "scared"),
    ("10-ภูติ - ร้องไห้.png", "crying"),
]
for name, slug in fairy_files:
    save(fairy(remove_checker(load("ภูติน้อย", name), pockets=True)), f"fairy-{slug}")

# ── Blue flame: faded variant framed to match the published normal art ──
normal = Image.open(os.path.join(OUT, "blue-flame-normal-478x720.png")).convert("RGBA")
nx0, ny0, nx1, ny1 = body_box(normal)
faded = remove_checker(load("ลูกไฟสีฟ้า", "ลูกไฟจาง.png"))
fx0, fy0, fx1, fy1 = body_box(faded)
scale = (ny1 - ny0) / (fy1 - fy0)
out = place(faded, scale, ((fx0 + fx1) / 2, fy1), ((nx0 + nx1) / 2, ny1), normal.size)
save(out, "blue-flame-faded")
