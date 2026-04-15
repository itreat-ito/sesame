import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICON_DIR = resolve(__dirname, '../public/icons');
const SIZES = [16, 48, 128];

const BG_COLOR = [68, 118, 226];
const FG_COLOR = [255, 255, 255];

mkdirSync(ICON_DIR, { recursive: true });

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const tp = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tp, data])));
  return Buffer.concat([len, tp, data, crcBuf]);
}

function createIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const radius = size * 0.18;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const inside = isInsideRoundedRect(x, y, size, size, radius);
      if (inside) {
        pixels[i] = BG_COLOR[0];
        pixels[i + 1] = BG_COLOR[1];
        pixels[i + 2] = BG_COLOR[2];
        pixels[i + 3] = 255;
      } else {
        pixels[i + 3] = 0;
      }
    }
  }

  drawKey(pixels, size);

  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(size * rowSize);
  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    pixels.copy(raw, y * rowSize + 1, y * size * 4, (y + 1) * size * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function isInsideRoundedRect(x, y, w, h, r) {
  if (x < r && y < r) return dist(x, y, r, r) <= r;
  if (x >= w - r && y < r) return dist(x, y, w - r - 1, r) <= r;
  if (x < r && y >= h - r) return dist(x, y, r, h - r - 1) <= r;
  if (x >= w - r && y >= h - r) return dist(x, y, w - r - 1, h - r - 1) <= r;
  return true;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function drawKey(pixels, size) {
  const cx = size / 2;
  const cy = size * 0.38;
  const headR = size * 0.17;
  const holeR = size * 0.07;
  const shaftW = size * 0.08;
  const shaftBottom = size * 0.82;
  const toothW = size * 0.1;
  const toothH = size * 0.06;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      if (pixels[i + 3] === 0) continue;

      let isKey = false;
      const dx = x - cx;
      const dy = y - cy;

      if (dx * dx + dy * dy <= headR * headR) {
        if (dx * dx + dy * dy >= holeR * holeR) {
          isKey = true;
        }
      }

      if (
        x >= cx - shaftW / 2 &&
        x <= cx + shaftW / 2 &&
        y >= cy + headR * 0.6 &&
        y <= shaftBottom
      ) {
        isKey = true;
      }

      const tooth1Y = shaftBottom - size * 0.08;
      const tooth2Y = shaftBottom - size * 0.22;
      if (
        y >= tooth1Y &&
        y <= tooth1Y + toothH &&
        x >= cx + shaftW / 2 &&
        x <= cx + shaftW / 2 + toothW
      ) {
        isKey = true;
      }
      if (
        y >= tooth2Y &&
        y <= tooth2Y + toothH &&
        x >= cx + shaftW / 2 &&
        x <= cx + shaftW / 2 + toothW * 0.7
      ) {
        isKey = true;
      }

      if (isKey) {
        pixels[i] = FG_COLOR[0];
        pixels[i + 1] = FG_COLOR[1];
        pixels[i + 2] = FG_COLOR[2];
      }
    }
  }
}

SIZES.forEach((size) => {
  const png = createIcon(size);
  writeFileSync(resolve(ICON_DIR, `icon${size}.png`), png);
  console.log(`Generated icon${size}.png`);
});
