#!/usr/bin/env python3
"""Compose App Store screenshots with brand caption bands.

Takes the live store screenshot set (downloaded at accepted dimensions),
adds a Fidelis brand band (purple-strong canvas, EB Garamond caption in
warm white, gold hairline) and emits store-ready images at the exact
accepted sizes Apple requires.

Brand tokens (src/styles.css, light block):
  --purple-strong: #4A2F74  (canvas)
  --bg-1:          #FCFBF8  (caption text)
  --gold:          #A8862C  (hairline — sacred mark)

Usage:
  python3 scripts/caption-screenshots.py \
    --src appstore/screenshots-live/iphone \
    --out appstore/screenshots-captioned/iphone \
    --size 1284x2778 \
    --captions appstore/screenshot-captions.json --set iphone

Dependencies: Pillow (pip install pillow). Font: appstore/fonts/EBGaramond-Regular.ttf
(converted from the bundled SIL OFL woff2 in src/fonts/).

NOTE: the appstore/ tree is gitignored by repo convention — sources, captions
JSON, font, and composed outputs all live there as local release assets. This
script is tracked so the composition is reproducible; run it from the repo root
where the appstore/ tree exists.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

PURPLE_STRONG = (0x4A, 0x2F, 0x74)
WARM_WHITE = (0xFC, 0xFB, 0xF8)
GOLD = (0xA8, 0x86, 0x2C)

CAPTION_ZONE_RATIO = 0.16  # top band height as a fraction of canvas height
FONT_RATIO = 0.055         # caption font size as a fraction of caption zone... set per-device below
HAIRLINE_WIDTH_RATIO = 0.11
JPEG_QUALITY = 95


def wrap_caption(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    """Wrap text into at most two lines that each fit max_width. Prefers a
    break at the em-dash; otherwise greedy word wrap. Returns [line] or [l1, l2]."""
    if draw.textlength(text, font=font) <= max_width:
        return [text]
    if " — " in text:
        head, tail = text.split(" — ", 1)
        if draw.textlength(head, font=font) <= max_width and draw.textlength(tail, font=font) <= max_width:
            return [head, tail]
    words = text.split()
    lines: list[str] = []
    cur = ""
    for w in words:
        trial = f"{cur} {w}".strip()
        if draw.textlength(trial, font=font) <= max_width:
            cur = trial
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    if len(lines) > 2:
        raise SystemExit(f"caption wraps to {len(lines)} lines, too long: {text!r}")
    return lines


def compose(src: Path, out: Path, caption: str, size: tuple[int, int], font_path: Path) -> None:
    W, H = size
    zone_h = int(H * CAPTION_ZONE_RATIO)
    font_size = max(40, int(H * 0.024))
    font = ImageFont.truetype(str(font_path), font_size)

    canvas = Image.new("RGB", (W, H), PURPLE_STRONG)
    draw = ImageDraw.Draw(canvas)

    margin_x = int(W * 0.06)
    lines = wrap_caption(draw, caption, font, W - 2 * margin_x)
    line_h = int(font_size * 1.28)

    # Vertical rhythm inside the caption zone: text block, gap, gold hairline.
    hairline_w = int(W * HAIRLINE_WIDTH_RATIO)
    hairline_h = max(3, H // 700)
    gap = int(zone_h * 0.14)
    text_block = line_h * len(lines)
    total = text_block + gap + hairline_h
    y = (zone_h - total) // 2 + int(zone_h * 0.06)

    for line in lines:
        lw = draw.textlength(line, font=font)
        draw.text(((W - lw) / 2, y), line, font=font, fill=WARM_WHITE)
        y += line_h
    y += gap
    draw.rectangle([(W - hairline_w) / 2, y, (W + hairline_w) / 2, y + hairline_h], fill=GOLD)

    # Screenshot below the band, scaled to fit the remaining height.
    shot = Image.open(src).convert("RGB")
    avail_h = H - zone_h
    scale = avail_h / shot.height
    new_w = int(shot.width * scale)
    shot = shot.resize((new_w, avail_h), Image.LANCZOS)
    canvas.paste(shot, ((W - new_w) // 2, zone_h))

    out.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(out, quality=JPEG_QUALITY)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", required=True, type=Path, help="directory of source screenshots (store order filenames)")
    ap.add_argument("--out", required=True, type=Path, help="output directory")
    ap.add_argument("--size", required=True, help="canvas WxH, e.g. 1284x2778")
    ap.add_argument("--captions", required=True, type=Path, help="JSON file with per-set caption map")
    ap.add_argument("--set", required=True, dest="set_name", help="key inside the captions JSON (e.g. iphone, ipad)")
    ap.add_argument("--font", type=Path, default=Path("appstore/fonts/EBGaramond-Regular.ttf"))
    args = ap.parse_args()

    W, H = (int(x) for x in args.size.lower().split("x"))
    captions = json.loads(args.captions.read_text())[args.set_name]

    sources = sorted(p for p in args.src.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    if not sources:
        raise SystemExit(f"no source images in {args.src}")

    missing = [p.name for p in sources if p.name not in captions]
    if missing:
        raise SystemExit(f"missing captions for: {missing}")

    for p in sources:
        out = args.out / f"{p.stem}.jpg"
        compose(p, out, captions[p.name], (W, H), args.font)
        print(f"{out} ({out.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
