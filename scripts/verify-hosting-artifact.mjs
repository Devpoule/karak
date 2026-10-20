import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const artifactPath = resolve(process.argv[2] ?? 'dist/karak/browser');

function fail(message) {
  console.error(`Hosting artifact validation failed: ${message}`);
  process.exitCode = 1;
}

function collectFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const entryPath = join(directory, entry);
    const stats = lstatSync(entryPath);

    if (stats.isDirectory()) {
      files.push(...collectFiles(entryPath));
    } else if (stats.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

if (!existsSync(artifactPath) || !lstatSync(artifactPath).isDirectory()) {
  fail(`missing artifact directory: ${artifactPath}`);
} else {
  const requiredEntries = ['index.html', '.htaccess', 'assets'];

  for (const entry of requiredEntries) {
    if (!existsSync(join(artifactPath, entry))) {
      fail(`missing required entry: ${entry}`);
    }
  }

  const indexPath = join(artifactPath, 'index.html');
  const htaccessPath = join(artifactPath, '.htaccess');

  if (existsSync(indexPath)) {
    const indexHtml = readFileSync(indexPath, 'utf8');

    if (!indexHtml.includes('<base href="/">')) {
      fail('index.html must target the root of a domain or subdomain with <base href="/">');
    }
  }

  if (existsSync(htaccessPath)) {
    const htaccess = readFileSync(htaccessPath, 'utf8');

    if (!/RewriteRule\s+\^\s+index\.html\s+\[L\]/.test(htaccess)) {
      fail('.htaccess must route unknown paths to index.html');
    }
  }

  const assetDirectory = join(artifactPath, 'assets');

  if (existsSync(assetDirectory) && lstatSync(assetDirectory).isDirectory()) {
    const assetFiles = collectFiles(assetDirectory);

    if (assetFiles.length === 0) {
      fail('assets directory is empty');
    } else {
      console.log(`Asset files: ${assetFiles.length}`);
    }
  }

  const artifactFiles = collectFiles(artifactPath);
  const sourceMaps = artifactFiles.filter((file) => file.endsWith('.map'));

  if (sourceMaps.length > 0) {
    fail(`source maps must not be published (${sourceMaps.length} found)`);
  }

  for (const forbiddenEntry of ['node_modules', '.angular', 'src', 'package.json']) {
    if (existsSync(join(artifactPath, forbiddenEntry))) {
      fail(`development entry must not be published: ${forbiddenEntry}`);
    }
  }

  if (!process.exitCode) {
    console.log(`Hosting artifact is valid: ${artifactPath}`);
  }
}
