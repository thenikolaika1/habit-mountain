#!/usr/bin/env node
// Generates the PWA app icons (192, 512, 512 maskable, 180 apple-touch-icon)
// as plain PNGs, drawn pixel-by-pixel and hand-encoded — no npm dependencies
// (no canvas/sharp/imagemagick available in this environment), only Node's
// built-in zlib for DEFLATE compression of the IDAT chunk.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "icons");
mkdirSync(outDir, { recursive: true });

// ---------- colors ----------
const ACCENT = [47, 158, 110, 255]; // #2f9e6e
const ACCENT_DARK = [31, 122, 83, 255]; // #1f7a53
const SNOW = [244, 249, 255, 255]; // #f4f9ff
const FOREST_DARK = [32, 74, 52, 255]; // #204a34
const FLAG_RED = [201, 79, 79, 255]; // #c94f4f
const POLE = [255, 255, 255, 255];

// ---------- CRC32 (needed for PNG chunk checksums) ----------
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(6, 9); // color type: RGBA
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type "None"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idatData = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", idatData),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- geometry helpers ----------
function sign(p1x, p1y, p2x, p2y, p3x, p3y) {
  return (p1x - p3x) * (p2y - p3y) - (p2x - p3x) * (p1y - p3y);
}

function pointInTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function setPixel(buf, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const idx = (y * size + x) * 4;
  buf[idx] = color[0];
  buf[idx + 1] = color[1];
  buf[idx + 2] = color[2];
  buf[idx + 3] = color[3];
}

/**
 * Draws the Habit Mountain glyph (mountain + flag) into a size x size RGBA
 * buffer. `inset` (0..0.5) shrinks the design toward the center, leaving a
 * full-bleed background — used for the maskable icon's safe zone.
 */
function drawIcon(size, { inset = 0, rounded = true } = {}) {
  const buf = Buffer.alloc(size * size * 4);

  // Design-space -> pixel-space mapping (design space is the unit square).
  const span = size * (1 - inset * 2);
  const origin = size * inset;
  const X = (u) => origin + u * span;
  const Y = (v) => origin + v * span;

  const cornerRadius = rounded ? size * 0.22 : 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Background: solid accent, optionally rounded corners.
      if (rounded && !insideRoundedSquare(x, y, size, cornerRadius)) {
        continue; // leave fully transparent outside the rounded corners
      }
      const t = (x + y) / (2 * size);
      const bg = lerpColor(ACCENT, ACCENT_DARK, t);
      setPixel(buf, size, x, y, bg);
    }
  }

  // Back (taller) peak — snow-white silhouette.
  drawTriangle(buf, size, X(0.58), Y(0.2), X(0.16), Y(0.78), X(0.86), Y(0.78), SNOW);
  // Front (shorter) peak, overlapping bottom-left — darker forest silhouette.
  drawTriangle(buf, size, X(0.33), Y(0.42), X(0.06), Y(0.78), X(0.58), Y(0.78), FOREST_DARK);
  // Flagpole.
  drawRect(buf, size, X(0.565), Y(0.06), X(0.595), Y(0.22), POLE);
  // Flag.
  drawTriangle(buf, size, X(0.595), Y(0.06), X(0.78), Y(0.12), X(0.595), Y(0.18), FLAG_RED);

  return buf;
}

function insideRoundedSquare(x, y, size, r) {
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r + 1;
}

function lerpColor(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    255,
  ];
}

function drawTriangle(buf, size, ax, ay, bx, by, cx, cy, color) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(ay, by, cy)));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (pointInTriangle(x + 0.5, y + 0.5, ax, ay, bx, by, cx, cy)) {
        setPixel(buf, size, x, y, color);
      }
    }
  }
}

function drawRect(buf, size, x1, y1, x2, y2, color) {
  const minX = Math.max(0, Math.floor(Math.min(x1, x2)));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(x1, x2)));
  const minY = Math.max(0, Math.floor(Math.min(y1, y2)));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(y1, y2)));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      setPixel(buf, size, x, y, color);
    }
  }
}

function generate(size, filename, opts) {
  const rgba = drawIcon(size, opts);
  const png = encodePng(size, size, rgba);
  const outPath = join(outDir, filename);
  writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${png.length} bytes)`);
}

generate(192, "icon-192.png", { inset: 0, rounded: true });
generate(512, "icon-512.png", { inset: 0, rounded: true });
generate(512, "icon-512-maskable.png", { inset: 0.1, rounded: false });
generate(180, "apple-touch-icon-180.png", { inset: 0, rounded: false });

console.log("Done.");
