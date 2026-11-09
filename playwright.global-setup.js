const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 47319;

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

let server = null;

function startStaticServer() {
  const publicDir = path.resolve(__dirname, 'public');

  const s = createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(publicDir, urlPath);

    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    let statResult;
    try {
      statResult = fs.statSync(filePath);
    } catch {
      res.writeHead(404);
      return res.end('Not Found');
    }

    if (statResult.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      filePath = indexPath;
      try {
        fs.statSync(filePath);
      } catch {
        res.writeHead(404);
        return res.end('Not Found');
      }
    }

    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });

  return new Promise((resolve, reject) => {
    s.on('error', (err) => reject(err));
    s.listen(PORT, () => {
      resolve({ url: 'http://localhost:' + PORT, server: s });
    });
    setTimeout(() => reject(new Error('Static server did not start in time')), 15000);
  });
}

module.exports = async function () {
  const { url, server: s } = await startStaticServer();
  server = s;
  return { baseUrl: url };
};
