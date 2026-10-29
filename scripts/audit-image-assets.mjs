import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const ASSETS_ROOT = resolve('public/assets');
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

function readUInt16BE(buffer, offset) {
  return buffer[offset] * 256 + buffer[offset + 1];
}

function readUInt32BE(buffer, offset) {
  return (
    buffer[offset] * 16_777_216 +
    buffer[offset + 1] * 65_536 +
    buffer[offset + 2] * 256 +
    buffer[offset + 3]
  );
}

function jpegDimensions(buffer) {
  let offset = 2;

  while (offset < buffer.length - 9) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 1 >= buffer.length) break;

    const segmentLength = readUInt16BE(buffer, offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;

    const isStartOfFrame =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isStartOfFrame) {
      return {
        width: readUInt16BE(buffer, offset + 5),
        height: readUInt16BE(buffer, offset + 3),
      };
    }

    offset += segmentLength;
  }

  return { width: null, height: null };
}

function detectImage(buffer) {
  if (
    buffer.length >= 24 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return {
      format: 'PNG',
      width: readUInt32BE(buffer, 16),
      height: readUInt32BE(buffer, 20),
    };
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { format: 'JPEG', ...jpegDimensions(buffer) };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { format: 'WebP', width: null, height: null };
  }

  if (
    buffer.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
  ) {
    return {
      format: 'GIF',
      width: buffer.readUInt16LE(6),
      height: buffer.readUInt16LE(8),
    };
  }

  return { format: 'unknown', width: null, height: null };
}

function expectedFormat(extension) {
  if (extension === '.png') return 'PNG';
  if (extension === '.jpg' || extension === '.jpeg') return 'JPEG';
  if (extension === '.webp') return 'WebP';
  if (extension === '.gif') return 'GIF';
  return null;
}

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

const records = collectFiles(ASSETS_ROOT)
  .filter((path) => IMAGE_EXTENSIONS.has(extname(path).toLowerCase()))
  .map((path) => {
    const extension = extname(path).toLowerCase();
    const relativePath = relative(ASSETS_ROOT, path).replaceAll('\\', '/');
    const info = detectImage(readFileSync(path));

    return {
      path: relativePath,
      family: relativePath.split('/')[0],
      extension,
      expectedFormat: expectedFormat(extension),
      ...info,
      bytes: statSync(path).size,
    };
  });

const mismatches = records.filter(({ expectedFormat: expected, format }) => expected !== format);

console.log(`Image assets: ${records.length}`);
console.log(
  `Total: ${(records.reduce((total, record) => total + record.bytes, 0) / 1024 / 1024).toFixed(3)} MiB`,
);

for (const family of [...new Set(records.map((record) => record.family))].sort()) {
  const familyRecords = records.filter((record) => record.family === family);
  const bytes = familyRecords.reduce((total, record) => total + record.bytes, 0);
  console.log(
    `${family}: ${familyRecords.length} files, ${(bytes / 1024 / 1024).toFixed(3)} MiB`,
  );
}

if (mismatches.length > 0) {
  console.error('\nExtension/format mismatches:');
  for (const mismatch of mismatches) {
    console.error(
      `- ${mismatch.path}: extension ${mismatch.extension}, detected ${mismatch.format}`,
    );
  }
  process.exitCode = 1;
}
