const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'Yudzxml/WebClientV1';
const FILEPATH = 'products.json';
const BRANCH = 'main';

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
        try {
          const json = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject({ statusCode: res.statusCode, body: json });
          }
        } catch (e) {
          reject({ statusCode: res.statusCode, body, error: 'JSON parse error' });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (!TOKEN) {
    return res.status(500).json({ error: 'Missing GitHub token' });
  }

  try {
    const fileData = await githubRequest(`/repos/${REPO}/contents/${FILEPATH}?ref=${BRANCH}`);
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    let produkList = JSON.parse(content);

    if (req.method === 'GET') {
      return res.status(200).json(produkList);
    }

    // Validasi method POST
    if (req.method === 'POST') {
      const produkBaru = req.body;
      if (!produkBaru || !produkBaru.nama || !produkBaru.img || 
        (produkBaru.harga === undefined && !Array.isArray(produkBaru.paket))) {
        return res.status(400).json({ error: 'Produk baru kurang lengkap' });
      }

      produkList.push(produkBaru);
    }

    // Validasi method PUT (edit)
    if (req.method === 'PUT') {
      const { index, produkEdit } = req.body;
      if (typeof index !== 'number' || !produkEdit) {
        return res.status(400).json({ error: 'Index dan produkEdit harus diberikan' });
      }
      if (index < 0 || index >= produkList.length) {
        return res.status(400).json({ error: 'Index produk tidak valid' });
      }

      produkList[index] = { ...produkList[index], ...produkEdit };
    }

    // Validasi method DELETE
    if (req.method === 'DELETE') {
      const { index } = req.body;
      if (typeof index !== 'number') {
        return res.status(400).json({ error: 'Index harus diberikan' });
      }
      if (index < 0 || index >= produkList.length) {
        return res.status(400).json({ error: 'Index produk tidak valid' });
      }

      produkList.splice(index, 1);
    }

    // Update file ke GitHub
    const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');
    const commitMessage = {
      POST: `Add produk: ${req.body.nama}`,
      PUT: `Edit produk index ${req.body.index}`,
      DELETE: `Delete produk index ${req.body.index}`
    }[req.method] || 'Update produk';

    await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', {
      message: commitMessage,
      content: updatedContent,
      sha: fileData.sha,
      branch: BRANCH,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      error: error.body || error.message || 'Unknown error',
    });
  }
};