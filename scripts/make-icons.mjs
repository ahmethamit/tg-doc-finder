// Generates the PWA icons as PNG files with no extra dependencies
// (Node's built-in zlib is enough). Run: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [0x22, 0x9e, 0xd9]; // Telegram-like blue
const FG = [0xff, 0xff, 0xff];
const LINE = [0x22, 0x9e, 0xd9];

// CRC32 is required by the PNG format for every chunk.
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

// Draws a white "document" with three text lines on a blue square.
// `scale` < 1 shrinks the drawing (used for the maskable icon safe zone).
function makeIcon(size, scale = 1) {
  const rows = [];
  const inRect = (x, y, x0, y0, x1, y1) => x >= x0 && x < x1 && y >= y0 && y < y1;
  const s = size;
  const c = s / 2;
  const w = s * 0.46 * scale; // page half-width... full width = w
  const h = s * 0.58 * scale;
  const x0 = c - w / 2, x1 = c + w / 2;
  const y0 = c - h / 2, y1 = c + h / 2;
  const fold = w * 0.3;
  for (let y = 0; y < s; y++) {
    const row = Buffer.alloc(1 + s * 3); // filter byte 0 + RGB pixels
    for (let x = 0; x < s; x++) {
      let col = BG;
      if (inRect(x, y, x0, y0, x1, y1)) {
        col = FG;
        // cut the top-right corner (diagonal) to look like a folded page
        if (x >= x1 - fold && y < y0 + fold && x - (x1 - fold) > y - y0) col = BG;
        // text lines
        for (let i = 0; i < 3; i++) {
          const ly = y0 + h * (0.45 + i * 0.15);
          const lw = i === 2 ? w * 0.4 : w * 0.64;
          if (inRect(x, y, x0 + w * 0.18, ly, x0 + w * 0.18 + lw, ly + h * 0.05)) col = LINE;
        }
      }
      row[1 + x * 3] = col[0];
      row[2 + x * 3] = col[1];
      row[3 + x * 3] = col[2];
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(s, 0);
  ihdr.writeUInt32BE(s, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/apple-touch-icon.png', makeIcon(180));
writeFileSync('public/icons/icon-192.png', makeIcon(192));
writeFileSync('public/icons/icon-512.png', makeIcon(512));
// Maskable: content kept inside the central safe zone.
writeFileSync('public/icons/icon-maskable-512.png', makeIcon(512, 0.75));
console.log('icons written to public/icons');
