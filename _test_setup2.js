const { createServer } = require('http');
const fs = require('fs');
const path = require('path');
const publicDir = path.resolve(__dirname, 'public');

const s = createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(publicDir, urlPath);
  if (!filePath.startsWith(publicDir)) { res.writeHead(403); return res.end('Forbidden'); }
  let statResult;
  try { statResult = fs.statSync(filePath); } catch { res.writeHead(404); return res.end('Not Found'); }
  if (statResult.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    filePath = indexPath;
    try { fs.statSync(filePath); } catch { res.writeHead(404); return res.end('Not Found'); }
  }
  const data = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.css':'text/css; charset=utf-8' }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
});

console.log('server created, starting listen...');
const p = new Promise((resolve, reject) => {
  s.on('error', (err) => reject(err));
  s.listen(0, () => {
    const { port } = s.address();
    resolve({ url: 'http://localhost:' + port, server: s });
  });
  setTimeout(() => reject(new Error('Static server did not start in time')), 15000);
});
p.then(ctx => {
  console.log('SETUP OK', ctx.url);
  ctx.server?.close(() => { console.log('closed'); process.exit(0); });
}).catch(e => { console.log('FAIL', e.message); process.exit(1); });
