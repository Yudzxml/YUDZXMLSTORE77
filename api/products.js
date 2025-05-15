const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN;
const REPO = 'Yudzxml/WebClientV1';   // repo GitHub kamu
const FILEPATH = 'products.json';      // path file JSON di repo
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

  if (!TOKEN) {
    console.error('[handler] Missing GITHUB_TOKEN env variable');
    res.status(500).json({ error: 'Missing GitHub token' });
    return;
  }

  try {
    const fileData = await githubRequest(`/repos/${REPO}/contents/${FILEPATH}?ref=${BRANCH}`);
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    let produkList = JSON.parse(content);

    if (req.method === 'GET') {
      // Ambil daftar produk
      res.status(200).json(produkList);

    } else if (req.method === 'POST') {
      // Tambah produk baru
      const produkBaru = req.body;

      if (!produkBaru || !produkBaru.nama || !produkBaru.img || !(produkBaru.paket || produkBaru.harga)) {
        return res.status(400).json({ error: 'Produk baru kurang lengkap' });
      }

      produkList.push(produkBaru);

      const commitMessage = `Add produk: ${produkBaru.nama}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');
      const updateData = { message: commitMessage, content: updatedContent, sha: fileData.sha, branch: BRANCH };
      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', updateData);

      res.status(200).json({ success: true, produkBaru });

    } else if (req.method === 'PUT') {
      // Update produk berdasarkan index
      const updateProduk = req.body;

      if (!updateProduk || typeof updateProduk.index !== 'number' || !updateProduk.data) {
        return res.status(400).json({ error: 'Data produk update kurang lengkap atau index tidak valid' });
      }

      const idx = updateProduk.index;
      if (idx < 0 || idx >= produkList.length) {
        return res.status(400).json({ error: 'Index produk tidak ditemukan' });
      }

      produkList[idx] = { ...produkList[idx], ...updateProduk.data };

      const commitMessage = `Update produk: ${produkList[idx].nama}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');
      const updateData = { message: commitMessage, content: updatedContent, sha: fileData.sha, branch: BRANCH };
      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', updateData);

      res.status(200).json({ success: true, produk: produkList[idx] });

    } else if (req.method === 'DELETE') {
      // Hapus produk berdasarkan index
      const { index } = req.body;

      if (typeof index !== 'number' || index < 0 || index >= produkList.length) {
        return res.status(400).json({ error: 'Index produk tidak valid' });
      }

      const produkHapus = produkList.splice(index, 1)[0];

      const commitMessage = `Delete produk: ${produkHapus.nama}`;
      const updatedContent = Buffer.from(JSON.stringify(produkList, null, 2)).toString('base64');
      const updateData = { message: commitMessage, content: updatedContent, sha: fileData.sha, branch: BRANCH };
      await githubRequest(`/repos/${REPO}/contents/${FILEPATH}`, 'PUT', updateData);

      res.status(200).json({ success: true, produkHapus });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[handler] Error caught:', error);
    res.status(error.statusCode || 500).json({ error: error.body || error.message || 'Unknown error' });
  }
};