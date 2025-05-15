const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = process.env.GITHUB_REPO;
const FILEPATH = process.env.GITHUB_FILEPATH;
const BRANCH = process.env.GITHUB_BRANCH || 'main';

function githubRequest(path, method = 'GET', data = null) {
  const options = {
    hostname: 'api.github.com',
    path,
    method,
    headers: {
      'User-Agent': 'Vercel-App',
      Authorization: `token ${TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  };

  console.log(`[githubRequest] ${method} ${path} with data:`, data);

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`[githubRequest] Response status: ${res.statusCode}`);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(body || '{}');
            resolve(json);
          } catch (e) {
            console.error('[githubRequest] JSON parse error:', e);
            reject({ statusCode: res.statusCode, body, error: 'JSON parse error' });
          }
        } else {
          console.error(`[githubRequest] Error response: ${body}`);
          reject({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', (e) => {
      console.error('[githubRequest] Request error:', e);
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

module.exports = async function handler(req, res) {
  console.log(`[handler] Incoming request method: ${req.method}`);

  if (!TOKEN || !REPO || !FILEPATH) {
    console.error('[handler] Missing GitHub env variables');
    res.status(500).json({ error: 'Missing GitHub env variables' });
    return;
  }

  try {
    console.log('[handler] Fetching file data from GitHub...');
    const fileData = await githubRequest(`/repos/${REPO}/contents/${FILEPATH}?ref=${BRANCH}`);
    console.log('[handler] File data fetched, SHA:', fileData.sha);

    if (req.method === 'GET') {
      console.log('[handler] Processing GET request');
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      const produk = JSON.parse(content);
      res.status(200).json(produk);

    } else if (req.method === 'POST') {
      console.log('[handler] Processing POST request with body:', req.body);
      const produkBaru = req.body;

      if (!produkBaru || !produkBaru.nama || !produkBaru.img || !(produkBaru.paket || produkBaru.harga)) {
        console.warn('[handler] Produk baru kurang lengkap');
        res.status(400).json({ error: 'Produk baru kurang lengkap' });
        return;
      }

      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      const produkList = JSON.parse(content);

      produkList.push(produkBaru);
      console.log('[handler] Produk list updated, new length:', produkList.length);

      const commitMessage = `Add produk: ${produkBaru.nama}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');

      const updateData = {
        message: commitMessage,
        content: updatedContent,
        sha: fileData.sha,
        branch: BRANCH,
      };

      console.log('[handler] Sending update commit to GitHub...');
      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', updateData);
      console.log('[handler] Commit successful');

      res.status(200).json({ success: true, produkBaru });

    } else {
      console.warn('[handler] Method not allowed:', req.method);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[handler] Error caught:', error);
    res.status(error.statusCode || 500).json({ error: error.body || error.message || 'Unknown error' });
  }
};