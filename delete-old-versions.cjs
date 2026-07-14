const fs = require('fs');
const https = require('https');

const SITE_ID = 'storysaadrnd';

// Read token
const config = JSON.parse(fs.readFileSync(require('os').homedir() + '/.config/configstore/firebase-tools.json', 'utf8'));
const token = config.tokens.access_token;

function request(method, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'firebasehosting.googleapis.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Fetching versions...');
  const res = await request('GET', `/v1beta1/sites/${SITE_ID}/versions?pageSize=200`);
  const versions = res.versions || [];
  
  console.log(`Found ${versions.length} versions.`);
  
  if (versions.length <= 5) {
    console.log('5 or fewer versions exist. Nothing to delete.');
    return;
  }
  
  // Keep the 5 most recent versions (they are returned sorted by createTime desc usually, but let's sort them to be sure)
  versions.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
  
  const toDelete = versions.slice(5);
  console.log(`Deleting ${toDelete.length} old versions...`);
  
  let deleted = 0;
  for (const v of toDelete) {
    try {
      await request('DELETE', `/v1beta1/${v.name}`);
      console.log(`Deleted ${v.name}`);
      deleted++;
    } catch (e) {
      console.log(`Failed to delete ${v.name}: ${e.message}`);
    }
  }
  console.log(`Cleanup complete! Deleted ${deleted} versions.`);
}

run().catch(console.error);
