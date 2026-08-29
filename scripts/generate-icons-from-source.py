#!/usr/bin/env python3
"""
Regenerates icons/*.png from the real app-icon artwork (assets/app_icon.png
-- a 1254x1254 squircle-shaped PNG with transparent rounded corners) using
Pillow. Supersedes the old hand-drawn scripts/generate-icons.mjs (kept for
history -- it predates Pillow being available in this environment, so it
drew the mountain/flag glyph pixel-by-pixel from scratch instead of
resizing a real source image).

Produces the same four files the app has always shipped, at the same
paths/sizes/purposes, so no changes are needed to manifest.json or
index.html -- only the icon bytes change:

- icons/icon-192.png, icons/icon-512.png ("any" purpose + favicon):
  the source already has its own transparent rounded corners baked in,
  so these are a straight resize -- no flattening.
- icons/icon-512-maskable.png ("maskable" purpose): Android applies its
  OWN mask shape (circle, squircle, ...) on top and can crop up to the
  outer 20% on any side, so this must be a fully OPAQUE, full-bleed
  square with the artwork confined to the inner 80% "safe zone" (W3C
  spec) -- otherwise the mountain/flag can get clipped or show a
  transparent ring through the mask.
- icons/apple-touch-icon-180.png: iOS renders any transparent pixel as
  solid black and applies its own rounded-corner mask, so this must also
  be a fully opaque, full-bleed square with no pre-baked rounding.

Run: python3 scripts/generate-icons-from-source.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "app_icon.png"
OUT_DIR = ROOT / "icons"
OUT_DIR.mkdir(exist_ok=True)

src = Image.open(SRC).convert("RGBA")
if src.width != src.height:
    raise SystemExit(f"{SRC} is {src.width}x{src.height} -- expected a square source image.")

# Sampled just inside the left edge, vertically centered: past the
# rounded-corner curve (only the four corners are rounded) so this is the
# artwork's own flat background green, not the mountain/cloud/tree scene.
bg_color = src.getpixel((20, src.height // 2))[:3]


def flatten(im):
    """Composite onto an opaque background of bg_color, dropping alpha --
    turns the transparent rounded corners back into a plain filled square."""
    bg = Image.new("RGBA", im.size, bg_color + (255,))
    return Image.alpha_composite(bg, im).convert("RGB")


flattened = flatten(src)


def save_any(size, name):
    resized = src.resize((size, size), Image.LANCZOS)
    resized.save(OUT_DIR / name)
    print(f"Wrote {name} ({size}x{size}, transparent corners preserved)")


def save_full_bleed(size, name, safe_zone_ratio=1.0):
    canvas = Image.new("RGB", (size, size), bg_color)
    inner = round(size * safe_zone_ratio)
    art = flattened.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(art, (offset, offset))
    canvas.save(OUT_DIR / name)
    print(f"Wrote {name} ({size}x{size}, safe zone {safe_zone_ratio:.0%})")


save_any(192, "icon-192.png")
save_any(512, "icon-512.png")
save_full_bleed(512, "icon-512-maskable.png", safe_zone_ratio=0.8)  # W3C maskable safe zone: inner 80%
save_full_bleed(180, "apple-touch-icon-180.png", safe_zone_ratio=1.0)  # iOS wants full bleed; it rounds the corners itself

print("Done.")
