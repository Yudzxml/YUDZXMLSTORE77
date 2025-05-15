let produk = [];

async function fetchProduk() {
  const res = await fetch('/api/products.js');
  produk = await res.json();
  renderProduk();
}

function renderProduk() {
  const container = document.getElementById('productList');
  container.innerHTML = '';

  produk.forEach((item, index) => {
    let paketText = '';
    if (Array.isArray(item.paket) && item.paket.length > 0) {
      paketText = item.paket
        .map(p => {
          const hargaNum = typeof p.harga === 'number' ? p.harga : parseInt(p.harga) || 0;
          return `${p.name} - Rp ${hargaNum.toLocaleString('id-ID')}`;
        })
        .join('<br>');
    }

    const hargaNum = (item.harga !== undefined && item.harga !== '') 
      ? (typeof item.harga === 'number' ? item.harga : parseInt(item.harga)) 
      : null;
    const hargaText = hargaNum !== null ? `Rp ${hargaNum.toLocaleString('id-ID')}` : '-';

    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <img src="${item.img}" alt="${item.nama}">
      <h3>${item.nama}</h3>
      ${hargaNum !== null && (!item.paket || item.paket.length === 0) ? `<p><strong>Harga:</strong> ${hargaText}</p>` : ''}
      ${paketText ? `<p><strong>Paket:</strong><br>${paketText}</p>` : ''}
      <button onclick="editProduk(${index})">Edit</button>
      <button onclick="hapusProduk(${index})" style="margin-left:10px; background:#cc3344">Hapus</button>
    `;
    container.appendChild(el);
  });
}

function openForm(isEdit = false) {
  document.getElementById('productForm').style.display = 'flex';
  document.body.classList.add('form-active');
  if (!isEdit) {
    document.getElementById('formTitle').textContent = 'Tambah Produk';
    document.getElementById('editIndex').value = '';
    document.getElementById('nama').value = '';
    document.getElementById('img').value = '';
    document.getElementById('harga').value = '';
    document.getElementById('paket').value = '';
  }
}

function closeForm() {
  document.getElementById('productForm').style.display = 'none';
  document.body.classList.remove('form-active');
}

function editProduk(index) {
  const p = produk[index];
  openForm(true);
  document.getElementById('formTitle').textContent = 'Edit Produk';
  document.getElementById('editIndex').value = index;
  document.getElementById('nama').value = p.nama || '';
  document.getElementById('img').value = p.img || '';
  document.getElementById('harga').value = (p.harga !== undefined && p.harga !== '') ? p.harga : '';

  if (Array.isArray(p.paket) && p.paket.length > 0) {
    document.getElementById('paket').value = p.paket
      .map(x => `${x.name} - ${x.harga}`)
      .join('\n');
  } else {
    document.getElementById('paket').value = '';
  }
}

async function hapusProduk(index) {
  if (!confirm('Yakin ingin menghapus produk ini?')) return;
  const res = await fetch('/api/products.js', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index })
  });
  const data = await res.json();
  if (data.success) {
    alert('Produk dihapus!');
    fetchProduk();
  } else {
    alert('Gagal menghapus produk');
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const index = document.getElementById('editIndex').value;

  const paketRaw = document.getElementById('paket').value.trim();
  const paketArr = paketRaw
    ? paketRaw.split('\n').map(p => {
        const parts = p.split('-');
        if (parts.length < 2) return null;

        const name = parts[0].trim();
        const hargaStr = parts.slice(1).join('-').replace(/\D/g, '');
        const harga = parseInt(hargaStr);

        if (!name || isNaN(harga)) return null;
        return { name, harga };
      }).filter(p => p !== null)
    : [];

  const hargaInput = document.getElementById('harga').value.trim();
  const harga = hargaInput === '' ? '' : parseInt(hargaInput.replace(/\D/g, ''));

  const payload = {
    nama: document.getElementById('nama').value.trim(),
    img: document.getElementById('img').value.trim(),
    harga: harga,
    paket: paketArr
  };

  const method = index === '' ? 'POST' : 'PUT';
  const body = index === '' ? payload : { index: parseInt(index), produkEdit: payload };

  const res = await fetch('/api/products.js', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (data.success || res.ok) {
    alert(index === '' ? 'Produk ditambahkan!' : 'Produk diperbarui!');
    closeForm();
    fetchProduk();
  } else {
    alert('Terjadi kesalahan saat menyimpan');
  }
}

fetchProduk();