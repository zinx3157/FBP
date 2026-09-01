#!/usr/bin/env python3
"""Deterministically turn the supplied LUZ artwork into a thermal raster.

This intentionally does no vectorisation, OCR, redrawing, or AI generation.  It
selects only near-white source pixels as artwork, turns those pixels black, makes
the red field white, crops to the artwork bounds, and applies a one-pixel closing
strengthening after downsampling for a 1-bit thermal printer.
"""

from pathlib import Path
import sys

from PIL import Image, ImageFilter


MAX_WIDTH = 320
MAX_HEIGHT = 96
WHITE_THRESHOLD = 180


def process(source: Path, destination: Path) -> None:
    source_image = Image.open(source).convert("RGB")
    pixels = source_image.load()
    mask = Image.new("1", source_image.size, 0)
    mask_pixels = mask.load()
    for y in range(source_image.height):
        for x in range(source_image.width):
            red, green, blue = pixels[x, y]
            # The original artwork is near-white. Dark red and JPEG red noise are
            # deliberately background, never thermal ink.
            if min(red, green, blue) >= WHITE_THRESHOLD:
                mask_pixels[x, y] = 1
    bounds = mask.getbbox()
    if not bounds:
        raise ValueError("No near-white logo artwork was found")
    mask = mask.crop(bounds)
    scale = min(MAX_WIDTH / mask.width, MAX_HEIGHT / mask.height, 1)
    size = (max(1, round(mask.width * scale)), max(1, round(mask.height * scale)))
    mask = mask.resize(size, Image.Resampling.LANCZOS)
    # A one-pixel MinFilter expands black artwork only slightly; it protects thin
    # original strokes after the 1-bit threshold without changing proportions.
    ink = Image.new("L", size, 255)
    ink.paste(0, mask=mask.convert("L"))
    ink = ink.filter(ImageFilter.MinFilter(3)).point(lambda value: 0 if value < 192 else 255, "1")
    output = Image.new("1", size, 1)
    output.paste(ink)
    destination.parent.mkdir(parents=True, exist_ok=True)
    output.save(destination, "PNG", optimize=False)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: process-luz-thermal-logo.py SOURCE DESTINATION")
    process(Path(sys.argv[1]), Path(sys.argv[2]))
