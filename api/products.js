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
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const json = JSON.parse(body || '{}');
            resolve(json);
          } catch (e) {
            reject({ statusCode: res.statusCode, body, error: 'JSON parse error' });
          }
        } else {
          reject({ statusCode: res.statusCode, body });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (!TOKEN) {
    res.status(500).json({ error: 'Missing GitHub token' });
    return;
  }

  try {
    const fileData = await githubRequest(`/repos/${REPO}/contents/${FILEPATH}?ref=${BRANCH}`);
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    let produkList = JSON.parse(content);

    if (req.method === 'GET') {
      res.status(200).json(produkList);

    } else if (req.method === 'POST') {
      const produkBaru = req.body;
      if (!produkBaru || !produkBaru.nama || !produkBaru.img || !(produkBaru.paket || produkBaru.harga)) {
        res.status(400).json({ error: 'Produk baru kurang lengkap' });
        return;
      }
      produkList.push(produkBaru);

      const commitMessage = `Add produk: ${produkBaru.nama}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');

      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', {
        message: commitMessage,
        content: updatedContent,
        sha: fileData.sha,
        branch: BRANCH,
      });

      res.status(200).json({ success: true, produkBaru });

    } else if (req.method === 'PUT') {
      // Edit produk berdasarkan index atau id (misal index)
      const { index, produkEdit } = req.body;
      if (typeof index !== 'number' || !produkEdit) {
        res.status(400).json({ error: 'Index dan produkEdit harus diberikan' });
        return;
      }
      if (index < 0 || index >= produkList.length) {
        res.status(400).json({ error: 'Index produk tidak valid' });
        return;
      }

      produkList[index] = { ...produkList[index], ...produkEdit };

      const commitMessage = `Edit produk index ${index}: ${produkList[index].nama || 'Unnamed'}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');

      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', {
        message: commitMessage,
        content: updatedContent,
        sha: fileData.sha,
        branch: BRANCH,
      });

      res.status(200).json({ success: true, produk: produkList[index] });

    } else if (req.method === 'DELETE') {
      // Hapus produk berdasarkan index
      const { index } = req.body;
      if (typeof index !== 'number') {
        res.status(400).json({ error: 'Index harus diberikan' });
        return;
      }
      if (index < 0 || index >= produkList.length) {
        res.status(400).json({ error: 'Index produk tidak valid' });
        return;
      }

      const removed = produkList.splice(index, 1)[0];

      const commitMessage = `Delete produk index ${index}: ${removed.nama || 'Unnamed'}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');

      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', {
        message: commitMessage,
        content: updatedContent,
        sha: fileData.sha,
        branch: BRANCH,
      });

      res.status(200).json({ success: true, removed });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.body || error.message || 'Unknown error' });
  }
};