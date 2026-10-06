"""Turn the ChatGPT character renders into web-ready art for Story Diary.

- Hero (male set + new female "scared"): align by the light-blue hair so the
  head size/position matches the existing female set exactly (593×720,
  hair width 384, top 42, centre x 292) — no size jump between expressions.
- Fairy: align by the body (largest opaque component), fixed canvas.
- Villager B: both renders share framing; scale to a 540×720 canvas.
- "???" silhouette: derived from the fairy's normal pose.
"""
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

sys.path.insert(0, os.path.dirname(__file__))
from character_cutout import remove_checker  # noqa: E402
from character_hairmetrics import hair_box  # noqa: E402

SRC = sys.argv[1]
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)

HERO_CANVAS = (593, 720)
HERO_HAIR_W, HERO_HAIR_TOP, HERO_HAIR_CX = 384, 42, 292

FAIRY_CANVAS = (560, 720)
FAIRY_BODY_H = 660  # fairy body height inside the canvas
FAIRY_BOTTOM_MARGIN = 20


def load(folder, name):
    return Image.open(os.path.join(SRC, folder, name)).convert("RGBA")


def place(img, scale, src_anchor, dst_anchor, canvas):
    """Scale `img` and paste so src_anchor lands on dst_anchor."""
    w, h = img.size
    scaled = img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    out = Image.new("RGBA", canvas, (0, 0, 0, 0))
    ox = round(dst_anchor[0] - src_anchor[0] * scale)
    oy = round(dst_anchor[1] - src_anchor[1] * scale)
    out.alpha_composite(scaled, (0, 0)) if False else out.paste(scaled, (ox, oy), scaled)
    return out


def hero(img):
    x0, y0, x1, y1 = hair_box(img)
    scale = HERO_HAIR_W / (x1 - x0)
    return place(img, scale, ((x0 + x1) / 2, y0), (HERO_HAIR_CX, HERO_HAIR_TOP), HERO_CANVAS)


def body_box(img):
    alpha = np.asarray(img.getchannel("A")) > 40
    lab, n = ndimage.label(ndimage.binary_closing(alpha, iterations=3))
    sizes = ndimage.sum(alpha, lab, range(1, n + 1))
    ys, xs = np.nonzero(lab == int(np.argmax(sizes)) + 1)
    return xs.min(), ys.min(), xs.max(), ys.max()


def fairy(img):
    x0, y0, x1, y1 = body_box(img)
    scale = FAIRY_BODY_H / (y1 - y0)
    cw, ch = FAIRY_CANVAS
    return place(img, scale, ((x0 + x1) / 2, y1), (cw / 2, ch - FAIRY_BOTTOM_MARGIN), FAIRY_CANVAS)


def silhouette(img):
    """Mist-veiled shadow of the fairy for the unnamed '???' scenes."""
    alpha = img.getchannel("A")
    shape = Image.new("RGBA", img.size, (58, 52, 92, 0))
    shape.putalpha(alpha.point(lambda v: int(v * 0.92)))
    shape = shape.filter(ImageFilter.GaussianBlur(2.5))
    glow_alpha = alpha.filter(ImageFilter.MaxFilter(15)).filter(ImageFilter.GaussianBlur(18)).point(lambda v: int(v * 0.55))
    glow = Image.new("RGBA", img.size, (232, 228, 245, 0))
    glow.putalpha(glow_alpha)
    rng = np.random.default_rng(7)
    noise = Image.fromarray((rng.random((img.height // 8, img.width // 8)) * 255).astype(np.uint8)).resize(img.size, Image.BICUBIC).filter(ImageFilter.GaussianBlur(10))
    mist_alpha = Image.fromarray((np.asarray(noise).astype(np.float32) / 255 * np.asarray(alpha).astype(np.float32) * 0.35).astype(np.uint8))
    mist = Image.new("RGBA", img.size, (220, 216, 236, 0))
    mist.putalpha(mist_alpha)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    for layer in (glow, shape, mist):
        out.alpha_composite(layer)
    return out


def save(img, slug):
    path = os.path.join(OUT, f"{slug}-{img.width}x{img.height}.png")
    img.save(path, optimize=True)
    print(f"{os.path.basename(path):45s} {os.path.getsize(path) // 1024:4d} KB")


# ── Hero (male, 8) ──
male = [
    ("01-ปกติ.png", "normal", True), ("02-ป่วย.png", "sick", True), ("03-สงสัย.png", "curious", True),
    ("04-ยิ้ม.png", "smile", False), ("05-ตื่นเต้น.png", "excited", False), ("06-มุ่งมั่น.png", "determined", False),
    ("07-ตกใจ.png", "shocked", False), ("08-กลัว.png", "scared", False),
]
for name, slug, baked_checker in male:
    img = load("ผู้กล้า-ชาย", name)
    if baked_checker:
        img = remove_checker(img)
    save(hero(img), f"main-male-{slug}")

# ── Hero (female, new "scared") ──
save(hero(load("ผู้กล้า-หญิง", "08-กลัว.png")), "main-female-scared")

# ── Fairy (6) + silhouette ──
fairy_files = [("01-ปกติ.png", "normal"), ("02-ตกใจ.png", "shocked"), ("03-สับสน.png", "confused"),
               ("04-กังวล.png", "worried"), ("05-มุ่งมั่น.png", "determined"), ("06-ดีใจ.png", "happy")]
fairy_normal = None
for name, slug in fairy_files:
    img = fairy(remove_checker(load("ภูติน้อย", name), pockets=True))
    if slug == "normal":
        fairy_normal = img
    save(img, f"fairy-{slug}")
save(silhouette(fairy_normal), "fairy-unknown")

# ── Villager B (2): shared framing → one transform for both ──
for name, slug in [("01-ปกติ.png", "normal"), ("02-ป่วย.png", "sick")]:
    img = load("ชาวบ้าน B", name)
    save(img.resize((540, 720), Image.LANCZOS), f"villager-b-{slug}")
