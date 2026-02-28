from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image


def detect_diff_bbox(
    design_image_bytes: bytes,
    tested_image_bytes: bytes,
    *,
    threshold: int = 28,
    min_pixels: int = 20,
    padding: int = 6,
) -> dict | None:
    template = Image.open(BytesIO(design_image_bytes)).convert("L")
    tested = Image.open(BytesIO(tested_image_bytes)).convert("L")

    if template.size != tested.size:
        tested = tested.resize(template.size)

    arr_a = np.array(template, dtype=np.int16)
    arr_b = np.array(tested, dtype=np.int16)

    diff = np.abs(arr_b - arr_a)
    mask = diff >= threshold

    if int(mask.sum()) < min_pixels:
        return None

    ys, xs = np.where(mask)
    x1 = max(0, int(xs.min()) - padding)
    y1 = max(0, int(ys.min()) - padding)
    x2 = min(template.width - 1, int(xs.max()) + padding)
    y2 = min(template.height - 1, int(ys.max()) + padding)

    confidence = min(0.99, max(0.1, float(diff[mask].mean() / 255.0) + 0.25))

    return {
        "label": "diff_hotspot",
        "x1": x1,
        "y1": y1,
        "x2": x2,
        "y2": y2,
        "confidence": round(confidence, 3),
    }
