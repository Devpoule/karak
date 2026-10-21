import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const artifactDirectory = path.resolve(process.argv[2] ?? path.join(projectDirectory, 'dist/karak/browser'));
const portArgumentIndex = process.argv.indexOf('--port');
const port = Number(process.argv[portArgumentIndex + 1] ?? 4300);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function isAssetRequest(requestPath) {
  return requestPath.startsWith('/assets/') || requestPath.startsWith('/icons/') || requestPath === '/manifest.webmanifest' || requestPath === '/ngsw.json';
}

function resolveRequestPath(requestPath) {
  const decodedPath = decodeURIComponent(requestPath.split('?')[0]);
  const relativePath = decodedPath.replace(/^\/+/, '');
  const candidatePath = path.resolve(artifactDirectory, relativePath);

  if (candidatePath !== artifactDirectory && !candidatePath.startsWith(`${artifactDirectory}${path.sep}`)) {
    return null;
  }

  return candidatePath;
}

async function findFile(requestPath) {
  const candidatePath = resolveRequestPath(requestPath);
  if (!candidatePath) return null;

  try {
    const stats = await fs.stat(candidatePath);
    return stats.isFile() ? candidatePath : null;
  } catch {
    return null;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    const requestPath = requestUrl.pathname;
    let filePath = await findFile(requestPath);

    if (!filePath && !isAssetRequest(requestPath)) {
      filePath = await findFile('/index.html');
    }

    if (!filePath) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'cache-control': 'no-cache',
      'content-type': contentTypes[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Production artifact server listening on http://127.0.0.1:${port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
