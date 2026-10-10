// Copies the built web app (../public) into www/ for the iPhone app.
// Inside the app, pages load from capacitor://localhost, so suggestions are pointed
// at the hosted server instead (JUMPIN_API_URL overrides it). The service worker is
// left out: the app already has every file on the phone.
// Run: node prepare-web.js   (run `node build.js` in the repo root first)
const fs = require('fs');
const path = require('path');

const API = process.env.JUMPIN_API_URL || 'https://jump-in.onrender.com';
const from = path.join(__dirname, '..', 'public');
const to = path.join(__dirname, 'www');

fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true, filter: src => path.basename(src) !== 'sw.js' });

const file = path.join(to, 'index.html');
const html = fs.readFileSync(file, 'utf8');
if (!html.includes('<head>')) throw new Error('public/index.html has no <head>; run node build.js first');
fs.writeFileSync(file, html.replace('<head>', `<head>\n<script>window.JUMPIN_API = ${JSON.stringify(API)};</script>`));
console.log(`Copied public/ to mobile/www (suggestions from ${API})`);
