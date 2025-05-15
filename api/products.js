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

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body || '{}'));
        } else {
          reject({ statusCode: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (!TOKEN || !REPO || !FILEPATH) {
    res.status(500).json({ error: 'Missing GitHub env variables' });
    return;
  }

  try {
    // Ambil SHA file dulu untuk update
    const fileData = await githubRequest(`/repos/${REPO}/contents/${FILEPATH}?ref=${BRANCH}`);

    if (req.method === 'GET') {
      // Decode content base64 jadi JSON
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      const produk = JSON.parse(content);
      res.status(200).json(produk);

    } else if (req.method === 'POST') {
      const produkBaru = req.body;
      if (!produkBaru || !produkBaru.nama || !produkBaru.img || !(produkBaru.paket || produkBaru.harga)) {
        res.status(400).json({ error: 'Produk baru kurang lengkap' });
        return;
      }

      // Decode isi file sekarang
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      const produkList = JSON.parse(content);

      produkList.push(produkBaru);

      // Commit update ke GitHub
      const commitMessage = `Add produk: ${produkBaru.nama}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');

      const updateData = {
        message: commitMessage,
        content: updatedContent,
        sha: fileData.sha,
        branch: BRANCH,
      };

      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', updateData);

      res.status(200).json({ success: true, produkBaru });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.body || error.message || 'Unknown error' });
  }
};