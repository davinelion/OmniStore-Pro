#!/usr/bin/env python3
"""
Generates the OmniStore icon set without any third-party dependency.

Rasterises signed distance fields (rounded square, stroked rounded square,
circle) with 3x3 supersampling and writes PNGs directly via zlib.

    python3 scripts/generate-icons.py

Re-run after changing the palette or geometry below.
"""

from __future__ import annotations

import math
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "icons")
SIZE = 512
SS = 3  # supersampling factor per axis

BG_START = (0x0D, 0x8A, 0x74)  # teal 600
BG_END = (0x2D, 0xD4, 0xBF)  # teal 400
GLYPH = (255, 255, 255)


def rounded_rect_sd(x: float, y: float, cx: float, cy: float, hw: float, hh: float, r: float) -> float:
    dx = abs(x - cx) - (hw - r)
    dy = abs(y - cy) - (hh - r)
    return math.hypot(max(dx, 0.0), max(dy, 0.0)) + min(max(dx, dy), 0.0) - r


def circle_sd(x: float, y: float, cx: float, cy: float, radius: float) -> float:
    return math.hypot(x - cx, y - cy) - radius


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def coverage(sd: float) -> float:
    """Antialiased coverage from a signed distance (1px transition)."""
    return max(0.0, min(1.0, 0.5 - sd))


def render(size: int, safe_zone: float = 1.0) -> list[tuple[int, int, int, int]]:
    """safe_zone < 1 scales the mark down (maskable icons need an 80% safe area)."""
    scale = size / SIZE
    pixels: list[tuple[int, int, int, int]] = []
    step = 1.0 / SS
    offset = (1.0 / (2 * SS)) - 0.5

    for py in range(size):
        for px in range(size):
            r_acc = g_acc = b_acc = 0.0
            a_acc = 0.0

            for sy in range(SS):
                for sx in range(SS):
                    # Work in 512-space, then map down.
                    x = ((px + offset + sy * 0 + sx * step + step / 2) / scale) / safe_zone
                    y = ((py + offset + sy * step + step / 2) / scale) / safe_zone
                    if safe_zone != 1.0:
                        # Centre the shrunken mark on the canvas.
                        shift = (SIZE - SIZE * safe_zone) / 2
                        x = (px + offset + sx * step + step / 2) / scale - shift / safe_zone + shift
                        y = (py + offset + sy * step + step / 2) / scale - shift / safe_zone + shift

                    t = max(0.0, min(1.0, (x / SIZE + y / SIZE) / 2))
                    bg = mix(BG_START, BG_END, t)

                    # Background plate, inset for the non-maskable variant.
                    plate = rounded_rect_sd(x, y, SIZE / 2, SIZE / 2, SIZE / 2 - 8, SIZE / 2 - 8, 112)
                    alpha = coverage(plate)

                    colour = list(bg)

                    # Two nested stroked squares, plus the centre dot.
                    for half, radius, width, opacity in (
                        (136, 72, 30, 0.55),
                        (92, 52, 30, 0.8),
                    ):
                        sd = abs(rounded_rect_sd(x, y, SIZE / 2, SIZE / 2, half, half, radius)) - width / 2
                        cov = coverage(sd) * opacity
                        if cov > 0:
                            for i in range(3):
                                colour[i] = colour[i] * (1 - cov) + GLYPH[i] * cov

                    dot = coverage(circle_sd(x, y, SIZE / 2, SIZE / 2, 52))
                    if dot > 0:
                        for i in range(3):
                            colour[i] = colour[i] * (1 - dot) + GLYPH[i] * dot

                    r_acc += colour[0] * alpha
                    g_acc += colour[1] * alpha
                    b_acc += colour[2] * alpha
                    a_acc += alpha

            samples = SS * SS
            pixels.append(
                (
                    round(r_acc / samples),
                    round(g_acc / samples),
                    round(b_acc / samples),
                    round(255 * (a_acc / samples)),
                )
            )
    return pixels


def write_png(path: str, pixels: list[tuple[int, int, int, int]], size: int) -> None:
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0
        for x in range(size):
            raw.extend(pixels[y * size + x])

    def chunk(tag: bytes, data: bytes) -> bytes:
        payload = tag + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")

    with open(path, "wb") as handle:
        handle.write(png)


def resize(pixels: list[tuple[int, int, int, int]], src: int, dst: int) -> list[tuple[int, int, int, int]]:
    out: list[tuple[int, int, int, int]] = []
    ratio = src / dst
    for y in range(dst):
        for x in range(dst):
            # Box filter over the source footprint.
            r = g = b = a = count = 0
            for sy in range(int(y * ratio), max(int(y * ratio) + 1, int((y + 1) * ratio))):
                for sx in range(int(x * ratio), max(int(x * ratio) + 1, int((x + 1) * ratio))):
                    if sy >= src or sx >= src:
                        continue
                    pr, pg, pb, pa = pixels[sy * src + sx]
                    r += pr
                    g += pg
                    b += pb
                    a += pa
                    count += 1
            if count == 0:
                out.append((0, 0, 0, 0))
            else:
                out.append((round(r / count), round(g / count), round(b / count), round(a / count)))
    return out


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    base = render(SIZE)
    write_png(os.path.join(OUT_DIR, "icon-512.png"), base, SIZE)

    for size in (192, 180, 32):
        write_png(os.path.join(OUT_DIR, f"icon-{size}.png"), resize(base, SIZE, size), size)

    # Maskable: full-bleed teal plate with the mark inside the 80% safe zone.
    maskable = render(SIZE, safe_zone=0.8)
    plate: list[tuple[int, int, int, int]] = []
    for y in range(SIZE):
        for x in range(SIZE):
            plate.append((*BG_START, 255))
    for i, (r, g, b, a) in enumerate(maskable):
        if a == 0:
            continue
        pr, pg, pb, _ = plate[i]
        plate[i] = (
            round(pr * (1 - a / 255) + r * (a / 255)),
            round(pg * (1 - a / 255) + g * (a / 255)),
            round(pb * (1 - a / 255) + b * (a / 255)),
            255,
        )
    write_png(os.path.join(OUT_DIR, "maskable-512.png"), plate, SIZE)

    for name in ("icon-512.png", "icon-192.png", "maskable-512.png", "icon-180.png", "icon-32.png"):
        path = os.path.join(OUT_DIR, name)
        print(f"  ✓ {name} ({os.path.getsize(path):,} bytes)")


if __name__ == "__main__":
    main()
