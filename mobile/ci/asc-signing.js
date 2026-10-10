// Makes a short-lived App Store signing certificate and profile through the
// App Store Connect API for one CI build, then removes them afterwards.
//   node asc-signing.js setup <work dir>    creates dist.cer + jumpin.mobileprovision
//   node asc-signing.js cleanup <work dir>  revokes the certificate, deletes the profile
// Needs ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH and BUNDLE_ID; setup also needs dist.csr in <work dir>.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_PATH, BUNDLE_ID } = process.env;
const [cmd, dir] = process.argv.slice(2);

function token() {
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64({ alg: 'ES256', kid: ASC_KEY_ID, typ: 'JWT' })}.${b64({ iss: ASC_ISSUER_ID, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' })}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: fs.readFileSync(ASC_KEY_PATH, 'utf8'), dsaEncoding: 'ieee-p1363' });
  return `${data}.${sig.toString('base64url')}`;
}

async function api(method, url, body) {
  const r = await fetch(`https://api.appstoreconnect.apple.com${url}`, {
    method,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body)
  });
  const text = await r.text();
  if (!r.ok) {
    let detail = text;
    try { detail = JSON.parse(text).errors.map(e => `${e.title}: ${e.detail}`).join('; '); } catch (e) {}
    const hint = r.status === 401 ? ' (the API key, Key ID or Issuer ID is wrong)'
      : r.status === 403 ? ' (the API key needs the Admin role)' : '';
    throw new Error(`${method} ${url} failed with ${r.status}${hint}: ${detail}`);
  }
  return text ? JSON.parse(text) : null;
}

async function setup() {
  const ids = await api('GET', `/v1/bundleIds?filter[identifier]=${encodeURIComponent(BUNDLE_ID)}&limit=5`);
  const bundle = ids.data.find(b => b.attributes.identifier === BUNDLE_ID);
  if (!bundle) throw new Error(`App ID ${BUNDLE_ID} is not registered at developer.apple.com > Identifiers`);

  const csr = fs.readFileSync(path.join(dir, 'dist.csr'), 'utf8');
  const cert = await api('POST', '/v1/certificates', {
    data: { type: 'certificates', attributes: { certificateType: 'DISTRIBUTION', csrContent: csr } }
  });
  fs.writeFileSync(path.join(dir, 'cert-id'), cert.data.id);
  fs.writeFileSync(path.join(dir, 'dist.cer'), Buffer.from(cert.data.attributes.certificateContent, 'base64'));

  const name = `Jump In CI ${Date.now()}`;
  const profile = await api('POST', '/v1/profiles', {
    data: {
      type: 'profiles',
      attributes: { name, profileType: 'IOS_APP_STORE' },
      relationships: {
        bundleId: { data: { type: 'bundleIds', id: bundle.id } },
        certificates: { data: [{ type: 'certificates', id: cert.data.id }] }
      }
    }
  });
  fs.writeFileSync(path.join(dir, 'profile-id'), profile.data.id);
  fs.writeFileSync(path.join(dir, 'profile-name'), name);
  fs.writeFileSync(path.join(dir, 'profile-uuid'), profile.data.attributes.uuid);
  fs.writeFileSync(path.join(dir, 'jumpin.mobileprovision'), Buffer.from(profile.data.attributes.profileContent, 'base64'));
  console.log(`Created certificate ${cert.data.id} and profile "${name}"`);
}

async function cleanup() {
  const read = f => { try { return fs.readFileSync(path.join(dir, f), 'utf8').trim(); } catch (e) { return ''; } };
  const profileId = read('profile-id'), certId = read('cert-id');
  if (profileId) await api('DELETE', `/v1/profiles/${profileId}`).then(() => console.log('Deleted profile'), e => console.log(e.message));
  if (certId) await api('DELETE', `/v1/certificates/${certId}`).then(() => console.log('Revoked certificate'), e => console.log(e.message));
}

({ setup, cleanup })[cmd]().catch(e => { console.error(`::error::${e.message}`); process.exit(1); });
