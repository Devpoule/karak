import { chromium } from '@playwright/test';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith('--'));
const root = resolve(rootArgument ?? 'public/assets');
const quality = Number(process.env.KARAK_WEBP_QUALITY ?? '0.95');
const dryRun = process.argv.includes('--dry-run');
const smallVariants = process.argv.includes('--small');
const excludedFamilies = new Set(['rules', 'tiles']);

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(path) : [path];
  });
}

function toDataUrl(buffer, extension) {
  const mimeByExtension = {
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const mime = mimeByExtension[extension] ?? 'application/octet-stream';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

const allFiles = collectFiles(root);
const files = allFiles.filter((path) => {
  const extension = extname(path).toLowerCase();
  const relativePath = relative(root, path).replaceAll('\\', '/');
  const family = relativePath.split('/')[0];

  if (!smallVariants) {
    return extension === '.png' && !excludedFamilies.has(family);
  }

  if (/-small\.webp$/i.test(relativePath)) return false;

  const equivalentWebp = path.replace(/\.png$/i, '.webp');
  return (family === 'heroes' && /\/character-transparent\.png$/i.test(relativePath))
    || (family === 'tokens' && extension === '.webp')
    || (family === 'tokens' && /-transparent\.png$/i.test(relativePath) && !allFiles.includes(equivalentWebp));
});

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];

for (const sourcePath of files) {
  console.error(`Processing ${relative(root, sourcePath)}`);
  const source = readFileSync(sourcePath);
  const dataUrl = toDataUrl(source, extname(sourcePath).toLowerCase());
  const encoded = await Promise.race([
    page.evaluate(async ({ dataUrl: sourceDataUrl, quality: encodeQuality, shouldCreateSmallVariant }) => {
      const image = new Image();
      image.src = sourceDataUrl;
      await image.decode();

      const maxDimension = shouldCreateSmallVariant ? 384 : Math.max(image.naturalWidth, image.naturalHeight);
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

      return {
        data: canvas.toDataURL('image/webp', encodeQuality).split(',', 2)[1],
        width: canvas.width,
        height: canvas.height,
      };
    }, { dataUrl, quality, shouldCreateSmallVariant: smallVariants }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Image conversion timed out after 30 seconds')), 30_000)),
  ]);

  const outputPath = smallVariants
    ? sourcePath.replace(/\.(png|jpe?g|webp)$/i, '-small.webp')
    : sourcePath.replace(/\.png$/i, '.webp');
  const output = Buffer.from(encoded.data, 'base64');
  const saving = source.length - output.length;
  const result = {
    path: relative(root, sourcePath).replaceAll('\\', '/'),
    width: encoded.width,
    height: encoded.height,
    sourceBytes: source.length,
    outputBytes: output.length,
    savingBytes: saving,
    savingPercent: (saving / source.length) * 100,
  };

  results.push(result);

  if (!dryRun && saving > 0 && output.length < source.length * 0.9) {
    writeFileSync(outputPath, output);
    result.written = true;
  }
}

await browser.close();

const eligible = results.filter((result) => result.savingBytes > 0 && result.outputBytes < result.sourceBytes * 0.9);
const measured = dryRun ? eligible : results.filter((result) => result.written);
const sourceBytes = measured.reduce((total, result) => total + result.sourceBytes, 0);
const outputBytes = measured.reduce((total, result) => total + result.outputBytes, 0);

console.log(`Candidates: ${results.length}`);
console.log(`Eligible: ${eligible.length}`);
console.log(`Written: ${results.filter((result) => result.written).length}`);
console.log(`Source weight: ${(sourceBytes / 1024 / 1024).toFixed(3)} MiB`);
console.log(`WebP weight: ${(outputBytes / 1024 / 1024).toFixed(3)} MiB`);
console.log(`Gain: ${((sourceBytes - outputBytes) / 1024 / 1024).toFixed(3)} MiB (${sourceBytes ? (((sourceBytes - outputBytes) / sourceBytes) * 100).toFixed(1) : '0.0'}%)`);

for (const result of results.sort((left, right) => right.savingBytes - left.savingBytes).slice(0, 40)) {
  console.log(`${result.path}: ${(result.sourceBytes / 1024 / 1024).toFixed(3)} -> ${(result.outputBytes / 1024 / 1024).toFixed(3)} MiB (${result.savingPercent.toFixed(1)}%)${result.written ? ' [written]' : ''}`);
}
