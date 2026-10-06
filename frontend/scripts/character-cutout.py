"""Remove a baked-in (painted) checkerboard background from character art.

Background pixels are low-saturation and connected to the top/left/right
edges; the character's outlines stop the fill, so interior whites (shirt,
hair highlights) survive. The bottom edge is not seeded because bust
portraits are cropped through the torso there.
"""
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage


def _local_std(val: np.ndarray, size: int = 5) -> np.ndarray:
    """Fast local standard deviation via box filters."""
    v = val.astype(np.float32)
    mean = ndimage.uniform_filter(v, size)
    mean_sq = ndimage.uniform_filter(v * v, size)
    return np.sqrt(np.maximum(mean_sq - mean * mean, 0))


def remove_checker(img: Image.Image, max_sat=24, min_val=110, pockets=False) -> Image.Image:
    """`pockets`: also clear enclosed checker pockets (needed for the fairy art;
    harmful on art with striped/textured whites such as the hero's shirt)."""
    rgba = img.convert("RGBA")
    a = np.asarray(rgba).astype(np.int16)
    rgb = a[..., :3]
    sat = rgb.max(-1) - rgb.min(-1)
    val = rgb.mean(-1)
    candidate = (sat <= max_sat) & (val >= min_val)
    # Close 1px gaps in the checker texture (JPEG-ish noise) before labelling.
    candidate = ndimage.binary_closing(candidate, iterations=1, border_value=1) & (val >= min_val - 10)
    labels, _ = ndimage.label(candidate)
    h, w = candidate.shape
    edge = np.concatenate([labels[0, :], labels[:, 0], labels[:, w - 1]])
    bg_ids = np.unique(edge[edge > 0])
    bg = np.isin(labels, bg_ids)
    # Enclosed pockets (e.g. between hair and neck) can't be reached from the
    # edges. Only drop a pocket when it is made almost entirely of the
    # checker's two exact tones (sampled from this image's own top edge) —
    # faces and line art never are.
    band = val[: max(8, h // 40)].ravel()
    hist, edges = np.histogram(band, bins=32, range=(0, 256))
    order = np.argsort(hist)[::-1]
    tone_a = (edges[order[0]] + edges[order[0] + 1]) / 2
    tone_b = next((edges[i] + edges[i + 1]) / 2 for i in order[1:] if abs((edges[i] + edges[i + 1]) / 2 - tone_a) > 20)
    if pockets:
        # Pockets hold a smaller, blurred checker (values spread ~130–215), so
        # match "rough mid-grey": unsaturated, darker than the white art, and
        # textured. White hair is lighter, its shading is smooth, and eyes/lines
        # are saturated or dark — none of them pass.
        rough = _local_std(val) > 12
        pocket_px = (sat <= 40) & (val >= 120) & (val <= 222) & rough
        pockets = ndimage.binary_closing(pocket_px, iterations=1)
        # Line art is thin (1–3 px); pockets are solid blobs. Opening removes
        # anything thinner than ~8 px, so outlines survive.
        pockets = ndimage.binary_opening(pockets, iterations=3)
        p_labels, p_count = ndimage.label(pockets)
        sizes = ndimage.sum(np.ones_like(val), p_labels, index=np.arange(1, p_count + 1))
        fill = ndimage.mean(pocket_px.astype(np.float32), p_labels, index=np.arange(1, p_count + 1))
        # Pocket blobs (thin line art already excluded by the opening) are added
        # as-is — no dilation, so the outline beside the outer background stays.
        # The big outer region is already handled by the edge fill; re-adding it
        # would take the outline next to it. Small blobs touching it (e.g. the
        # hole inside a hair curl, partly reached by the fill) are pockets.
        touches_bg = ndimage.maximum(bg.astype(np.uint8), p_labels, index=np.arange(1, p_count + 1))
        keep = [
            i + 1
            for i in range(p_count)
            if sizes[i] >= 60 and fill[i] > 0.6 and (not touches_bg[i] or sizes[i] < 20000)
        ]
        if keep:
            bg |= np.isin(p_labels, keep)
    # Also take the bottom-row corners if they connect to the side regions
    # (already covered by side seeds). Soften the cut edge by 1px.
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = rgba.copy()
    existing = np.asarray(rgba.getchannel("A"))
    out.putalpha(Image.fromarray(np.minimum(np.asarray(alpha_img), existing)))
    return out
