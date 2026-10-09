// Jump In web server: serves the app in public/ and one API route that asks OpenAI
// for phrase suggestions. The API key stays on the server (OPENAI_API_KEY).
// No dependencies; needs Node 20+.
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY || '';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const QUICK_MODEL = process.env.OPENAI_QUICK_MODEL || MODEL;
const HOURLY_LIMIT = Number(process.env.SUGGEST_LIMIT_PER_HOUR || 40);
const PUBLIC = path.join(__dirname, 'public');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json'
};

// Simple per-visitor cap so a public link can't run up the API bill.
const hits = new Map();
function allowed(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 3600000);
  if (list.length >= HOURLY_LIMIT) { hits.set(ip, list); return false; }
  list.push(now); hits.set(ip, list);
  return true;
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseJsonReply(text) {
  const t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (e) {}
  const m = t.match(/[\[{][\s\S]*[\]}]/);
  if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
  return null;
}

async function suggest(req, res) {
  if (!API_KEY) return send(res, 503, { code: 'not_granted', error: 'Suggestions are not set up on this server.' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!allowed(ip)) return send(res, 429, { code: 'rate_limited', error: 'Too many suggestions this hour.' });
  let input;
  try { input = JSON.parse(await readBody(req, 6 * 1024 * 1024)); } catch (e) { return send(res, 400, { code: 'invalid_argument', error: 'Bad request.' }); }
  const prompt = String(input.prompt || '').slice(0, 6000);
  if (!prompt) return send(res, 400, { code: 'invalid_argument', error: 'Missing prompt.' });
  const images = (Array.isArray(input.images) ? input.images : []).slice(0, 1)
    .filter(i => i && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type) && typeof i.data === 'string');
  const content = [{ type: 'text', text: prompt }]
    .concat(images.map(i => ({ type: 'image_url', image_url: { url: `data:${i.media_type};base64,${i.data}` } })));
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: input.tier === 'quick' ? QUICK_MODEL : MODEL, max_tokens: 600, messages: [{ role: 'user', content }] })
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('OpenAI API error', r.status, data && data.error && data.error.message);
      return send(res, r.status === 429 ? 429 : 502, { code: r.status === 429 ? 'rate_limited' : 'unavailable', error: 'Suggestions are not working right now.' });
    }
    const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    const json = parseJsonReply(text);
    if (json === null) return send(res, 502, { code: 'unavailable', error: 'Could not read the answer.' });
    send(res, 200, { json });
  } catch (e) {
    console.error('suggest failed', e);
    send(res, 502, { code: 'unavailable', error: 'Suggestions are not working right now.' });
  }
}

function serveStatic(req, res) {
  let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return send(res, 404, 'Not found', 'text/plain');
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    const ext = path.extname(file);
    const cache = ext === '.png' ? 'public, max-age=604800' : 'no-cache';
    res.writeHead(200, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': cache });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  const url = req.url || '/';
  if (url === '/api/status') return send(res, 200, { ai: !!API_KEY, images: !!API_KEY });
  if (url === '/healthz') return send(res, 200, { ok: true });
  if (url === '/api/suggest' && req.method === 'POST') return suggest(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
  serveStatic(req, res);
}).listen(PORT, () => console.log(`Jump In is running on port ${PORT}${API_KEY ? '' : ' (no OPENAI_API_KEY: suggestions off)'}`));
