// Builds public/index.html from src/app.html by inlining every pictograph SVG,
// so the app is one file that works offline once loaded.
// Run: node build.js
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pictographs');
const icons = {};
for (const f of fs.readdirSync(dir).sort()) {
  if (!f.endsWith('.svg')) continue;
  icons[f.slice(0, -4)] = fs.readFileSync(path.join(dir, f), 'utf8').trim()
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
    .replace(/\s+/g, ' ').replace(/> </g, '><');
}
const app = fs.readFileSync(path.join(__dirname, 'src', 'app.html'), 'utf8');
if (!app.includes('/*__ICONS__*/{}')) throw new Error('icon placeholder missing from src/app.html');
const body = app.replace('/*__ICONS__*/{}', JSON.stringify(icons).replace(/<\//g, '<\\/'));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0E1214">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Jump In">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="apple-touch-icon" href="/icons/app-180.png">
<link rel="icon" type="image/png" href="/icons/app-192.png">
<style>*{margin:0;padding:0}</style>
</head>
<body>
${body}
<script>
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'public', 'index.html'), html);
console.log(`Built public/index.html with ${Object.keys(icons).length} pictographs`);
