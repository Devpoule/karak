import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docs = path.join(root, 'docs');
const markdownFiles = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (entry.name.endsWith('.md')) markdownFiles.push(file);
  }
}

visit(docs);
const errors = [];
const rulesIndex = fs.readFileSync(path.join(docs, 'RULES.md'), 'utf8');
const ruleIds = [...rulesIndex.matchAll(/`((?!CONFORME|DIVERGENCE|INCERTAINE|ADAPTATION|NON|TESTEE|PARTIELLEMENT|VERIFIER)[A-Z][A-Z0-9-]+)`/g)].map((match) => match[1]);
const matrixStart = rulesIndex.indexOf('## Matrice règle');
const matrixEnd = rulesIndex.indexOf('## Vérification automatisée');
const matrix = matrixStart >= 0 && matrixEnd > matrixStart ? rulesIndex.slice(matrixStart, matrixEnd) : '';
const matrixIds = [...matrix.matchAll(/\| `(\w[\w-]+)` \|/g)].map((match) => match[1]);
if (new Set(ruleIds).size !== 24 || new Set(matrixIds).size !== 24 || matrixIds.some((id) => !ruleIds.includes(id))) {
  errors.push(`RULES.md: expected 24 unique rule identifiers in the inventory and matrix (found ${new Set(ruleIds).size}/${new Set(matrixIds).size})`);
}
const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
const symbolPattern = /^(.*?)(?:#([^#]+))?$/;

for (const file of markdownFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const [, relative, symbol] = target.match(symbolPattern);
    const targetPath = path.resolve(path.dirname(file), relative);
    if (!fs.existsSync(targetPath)) {
      errors.push(`${path.relative(root, file)}: missing path ${relative}`);
      continue;
    }
    if (symbol && /^L\d+$/.test(symbol)) {
      const line = Number(symbol.slice(1));
      const lineCount = fs.readFileSync(targetPath, 'utf8').split(/\r?\n/).length;
      if (line < 1 || line > lineCount) errors.push(`${path.relative(root, file)}: line ${line} out of range in ${relative}`);
      continue;
    }
    if (symbol && /\.(ts|js|mjs)$/.test(targetPath)) {
      const source = fs.readFileSync(targetPath, 'utf8');
      if (!source.includes(symbol)) {
        errors.push(`${path.relative(root, file)}: missing symbol ${symbol} in ${relative}`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Checked ${markdownFiles.length} Markdown files: all local references are valid.`);
}
