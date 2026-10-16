"""Re-export the character sets the artist redrew in the 2026-10-16 art pass
(new fairy design, new male hero, new villager B) OVER the published files.

The published file names — including their `WxH` suffixes — are referenced by
stored scenes and `lib/character.ts`, so they are kept as-is; only the pixels
change. The reader sizes figures by height, so a set's real width may differ
from its legacy name.

Framing follows the art that is already published from the same templates:
- Fairy, villager B: crop to the set's shared figure box (union across the
  expressions, so the framing never jumps between them), scale to 720 tall.
- Male hero: the exact transform of the published female set (same 2800×1867
  template), so both heroes keep the size the artist drew them at.

Usage: python scripts/process-art-refresh.py <images dir> <public characters dir>
"""
import os
import sys

from PIL import Image

SRC = sys.argv[1]  # contains ตัวละคร/
OUT = sys.argv[2]  # frontend/public/images/characters

HEIGHT = 720
# Female hero framing: source rows 110..1867 → published 0..720.
HERO_TOP, HERO_BOTTOM = 110, 1867


def load(folder, name):
    return Image.open(os.path.join(SRC, "ตัวละคร", folder, name)).convert("RGBA")


def union_box(images):
    boxes = [im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox() for im in images]
    return (min(b[0] for b in boxes), min(b[1] for b in boxes),
            max(b[2] for b in boxes), max(b[3] for b in boxes))


def export(images, box, published):
    x0, y0, x1, y1 = box
    scale = HEIGHT / (y1 - y0)
    size = (round((x1 - x0) * scale), HEIGHT)
    for im, name in zip(images, published):
        out = im.crop(box).resize(size, Image.LANCZOS)
        path = os.path.join(OUT, name)
        if not os.path.exists(path):
            sys.exit(f"refusing to create {name}: only published files are overwritten")
        out.save(path, optimize=True)
        print(f"{name:36s} {out.width}x{out.height}  {os.path.getsize(path) // 1024:4d} KB")


def refresh(folder, files, published, box=None):
    images = [load(folder, f) for f in files]
    if box is None:
        box = union_box(images)
    elif callable(box):
        box = box(union_box(images))
    export(images, box, published)


# ── Fairy (new design), Drive numbering → published slugs ──
fairy = [
    ("01-ภูติ ปกติ.png", "normal"), ("02-ภูติ - สับสน.png", "confused"),
    ("03-ภูติ - สงสัย.png", "curious"), ("04-ภูติ - มุ่งมั่น.png", "determined"),
    ("05-ภุติ - ยิ้ม.png", "happy"), ("06-ภูติ - เป็นห่วง.png", "worried"),
    ("07-ภูติ - ตื่นเต้น.png", "excited"), ("08-ภูติ ตกใจ.png", "shocked"),
    ("09-ภูติ - กลัว.png", "scared"), ("10-ภูติ - ร้องไห้.png", "crying"),
]
refresh("ภูติน้อย", [f for f, _ in fairy], [f"fairy-{s}-560x720.png" for _, s in fairy])

# ── Male hero (new design) ──
male = [
    ("01-ผู้กล้า ปกติ.png", "normal"), ("02-ผู้กล้า ป่วยๆ.png", "sick"),
    ("03-ผู้กล้า สงสัย.png", "curious"), ("04-ผู้กล้า ยิ้ม.png", "smile"),
    ("05-ผู้กล้า ตื่นเต้น.png", "excited"), ("06-ผู้กล้า มุ่งมั่น.png", "determined"),
    ("07-ผู้กล้า ตกใจ.png", "shocked"),
]
refresh("ผู้กล้า-ชาย", [f for f, _ in male], [f"main-male-{s}-593x720.png" for _, s in male],
        box=lambda b: (b[0], HERO_TOP, b[2], HERO_BOTTOM))

# ── Villager B (new design) ──
refresh("ชาวบ้าน B", ["01-ชาวบ้าน - ปกติ.png", "02-ชาวบ้าน - ป่วยๆ.png"],
        ["villager-b-normal-540x720.png", "villager-b-sick-540x720.png"])
