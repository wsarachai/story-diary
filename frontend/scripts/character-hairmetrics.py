import numpy as np
from PIL import Image
from scipy import ndimage

def hair_box(img):
    """Bounding box of the hero's light-blue hair (largest blue component)."""
    a = np.asarray(img.convert("RGBA")).astype(np.float32) / 255
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / np.maximum(mx, 1e-6)
    blue = (b >= g) & (g >= r) & (b - r > 0.12) & (sat > 0.18) & (mx > 0.5) & (al > 0.5)
    lab, n = ndimage.label(ndimage.binary_opening(blue, iterations=2))
    if n == 0:
        return None
    sizes = ndimage.sum(blue, lab, range(1, n + 1))
    ys, xs = np.nonzero(lab == (int(np.argmax(sizes)) + 1))
    return xs.min(), ys.min(), xs.max(), ys.max()
