"""Convert the named (non-numbered) background renders from the project's
Drive folder (`__nurse-projects/images/BG/`) into web-ready WebP backgrounds,
continuing the bg-NN numbering after the 18 numbered ones.

Usage: python scripts/process-background-art.py <drive BG dir> <public backgrounds dir>
"""
import os
import sys

from PIL import Image

SRC = sys.argv[1]
OUT = sys.argv[2]

START_NUMBER = 19

# (source file, URL slug, Thai picker label)
FILES = [
    ("คู่มือ.png", "guide", "คู่มือ"),
    ("ภูติน้อย.png", "fairy", "ภูติน้อย"),
    ("สมุดโน๊ต.png", "notebook", "สมุดโน๊ต"),
    ("สมุดโน๊ตในหมู่บ้าน.png", "notebook-village", "สมุดโน๊ตในหมู่บ้าน"),
    ("เทพีดี.png", "goddess-good", "เทพีดี"),
    ("เทพีดีก่อนหมอกลง.png", "goddess-good-pre-mist", "เทพีดี (ก่อนหมอกลง)"),
    ("เทพีดีเจ็บปวด.png", "goddess-good-hurt", "เทพีดี (เจ็บปวด)"),
    ("เทพีร้าย.png", "goddess-evil", "เทพีร้าย"),
]

for i, (name, slug, label) in enumerate(FILES):
    img = Image.open(os.path.join(SRC, name)).convert("RGB")
    filename = f"bg-{START_NUMBER + i:02d}-{slug}-{img.width}x{img.height}.webp"
    path = os.path.join(OUT, filename)
    img.save(path, quality=80, method=4)
    print(f"{filename:48s} {label}")
