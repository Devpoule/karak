import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, '..');
const publicDirectory = path.join(projectDirectory, 'public');
const provenanceMarkers = [
  'c2pa.claim.v2',
  'OpenAI Media Service',
  'trainedAlgorithmicMedia',
  'Copyright',
  'license',
  'author',
];

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

function inspectBuffer(buffer) {
  const content = buffer.toString('latin1');
  return provenanceMarkers.filter((marker) =>
    content.toLowerCase().includes(marker.toLowerCase()),
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}

const files = (await collectFiles(publicDirectory)).sort();
const records = [];

for (const filePath of files) {
  const buffer = await fs.readFile(filePath);
  const relativePath = path.relative(projectDirectory, filePath).replaceAll(path.sep, '/');
  records.push({
    hash: createHash('sha256').update(buffer).digest('hex'),
    markers: inspectBuffer(buffer),
    path: relativePath,
    size: buffer.length,
  });
}

const markedRecords = records.filter(({ markers }) => markers.length > 0);
const c2paRecords = records.filter(({ markers }) =>
  markers.some((marker) =>
    ['c2pa.claim.v2', 'OpenAI Media Service', 'trainedAlgorithmicMedia'].includes(marker),
  ),
);
const copyrightRecords = records.filter(({ markers }) => markers.includes('Copyright'));
const totalBytes = records.reduce((total, { size }) => total + size, 0);

console.log(`Fichiers publics analysés : ${records.length}`);
console.log(`Taille totale : ${formatBytes(totalBytes)}`);
console.log(`Fichiers avec marqueur de provenance ou de droits : ${markedRecords.length}`);
console.log(`Fichiers avec marqueur C2PA/OpenAI : ${c2paRecords.length}`);
console.log(`Fichiers avec marqueur Copyright : ${copyrightRecords.length}`);
console.log(`Fichiers sans marqueur détecté : ${records.length - markedRecords.length}`);

if (markedRecords.length > 0) {
  console.log('\nMarqueurs détectés :');
  for (const { hash, markers, path: relativePath } of markedRecords) {
    console.log(`- ${relativePath} [${markers.join(', ')}] sha256=${hash}`);
  }
}

console.log(
  '\nAudit technique terminé : les marqueurs binaires ne constituent pas une preuve de licence ou d\'autorisation de diffusion.',
);
