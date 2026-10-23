#!/usr/bin/env python3
"""Generate PWA icons from the PromptDock Mini brand mark (app/icon.svg).

Outputs:
  public/icons/icon-192.png        any purpose
  public/icons/icon-512.png        any purpose
  public/icons/icon-maskable-512.png  maskable (safe-zone padded)

Run once; the PNGs are committed. Requires Pillow.
"""

from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
BG = (24, 40, 36)       # #182824
LIME = (199, 244, 100)  # #c7f464

def draw_mark(size: int, pad_ratio: float) -> Image.Image:
    """Draw the speech-bubble mark. pad_ratio shrinks the glyph into the
    maskable safe zone (0.62 => glyph within the central 62% circle)."""
    img = Image.new("RGB", (size, size), BG)
    d = ImageDraw.Draw(img)

    # Glyph bounding box, centered.
    glyph = size * pad_ratio
    x0 = (size - glyph) / 2
    y0 = (size - glyph) / 2

    # Speech bubble: rounded rect with a tail on the lower left.
    bubble_w = glyph * 0.78
    bubble_h = glyph * 0.46
    bx0 = x0 + glyph * 0.06
    by0 = y0 + glyph * 0.10
    bx1 = bx0 + bubble_w
    by1 = by0 + bubble_h
    radius = glyph * 0.14
    d.rounded_rectangle([bx0, by0, bx1, by1], radius=radius, fill=LIME)
    # Tail (triangle) hanging off the bottom-left of the bubble.
    tail = [
        (bx0 + glyph * 0.08, by1 - radius * 0.4),
        (bx0 + glyph * 0.22, by1 - radius * 0.4),
        (bx0 + glyph * 0.08, by1 + glyph * 0.16),
    ]
    d.polygon(tail, fill=LIME)

    # Two "eyes" in background color, centered in the bubble.
    eye_r = glyph * 0.05
    eye_y = by0 + bubble_h * 0.42
    eye1_x = bx0 + bubble_w * 0.38
    eye2_x = bx0 + bubble_w * 0.62
    for ex in (eye1_x, eye2_x):
        d.ellipse([ex - eye_r, eye_y - eye_r, ex + eye_r, eye_y + eye_r], fill=BG)

    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    draw_mark(192, 0.78).save(OUT / "icon-192.png", "PNG")
    draw_mark(512, 0.78).save(OUT / "icon-512.png", "PNG")
    draw_mark(512, 0.60).save(OUT / "icon-maskable-512.png", "PNG")
    print(f"icons written to {OUT}")


if __name__ == "__main__":
    main()
