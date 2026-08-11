const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Minimal PNG generator in pure Node.js (no external canvas/sharp native dependencies required)
function createPng(width, height, r, g, b) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // Bit depth: 8
  ihdr.writeUInt8(2, 9); // Color type: Truecolor (RGB)
  ihdr.writeUInt8(0, 10); // Compression method
  ihdr.writeUInt8(0, 11); // Filter method
  ihdr.writeUInt8(0, 12); // Interlace method

  const ihdrChunk = createChunk('IHDR', ihdr);

  // Raw image data: height rows, each with 1 filter byte (0) + width * 3 bytes (RGB)
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize;
    rawData[rowStart] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pStart = rowStart + 1 + x * 3;
      // Draw sticky note shape with warm cork border
      const isMargin = x < 12 || y < 12 || x > width - 12 || y > height - 12;
      if (isMargin) {
        rawData[pStart] = 215;     // Cork border R
        rawData[pStart + 1] = 161; // G
        rawData[pStart + 2] = 92;  // B
      } else {
        rawData[pStart] = r;       // Yellow note body R (255)
        rawData[pStart + 1] = g;   // G (235)
        rawData[pStart + 2] = b;   // B (59)
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBuf, data]);

  // CRC32
  const crc = Buffer.alloc(4);
  crc.writeUInt3232BE ? crc.writeUInt3232BE(crc32(payload), 0) : crc.writeUInt32BE(crc32(payload), 0);

  return Buffer.concat([len, payload, crc]);
}

// Standard CRC32 lookup table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(__dirname, '../public/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate valid PNG icons
const icon192 = createPng(192, 192, 255, 235, 59);
const icon512 = createPng(512, 512, 255, 235, 59);

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);

console.log('PNG Icons 192x192 and 512x512 generated successfully!');
