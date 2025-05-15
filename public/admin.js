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
    if (Array.isArray(item.paket)) {
      paketText = item.paket
        .map(p => `${p.name} - Rp ${p.harga.toLocaleString()}`)
        .join('<br>');
    } else if (typeof item.paket === 'string') {
      paketText = item.paket;
    }

    const hargaText = item.harga !== undefined ? `Rp ${item.harga.toLocaleString()}` : '-';

    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <img src="${item.img}" alt="${item.nama}">
      <h3>${item.nama}</h3>
      ${item.harga !== undefined && !item.paket ? `<p><strong>Harga:</strong> ${hargaText}</p>` : ''}
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
  document.getElementById('nama').value = p.nama;
  document.getElementById('img').value = p.img;
  document.getElementById('harga').value = p.harga || '';

  if (Array.isArray(p.paket)) {
    document.getElementById('paket').value = p.paket
      .map(x => `${x.name} - ${x.harga}`)
      .join('\n');
  } else if (typeof p.paket === 'string') {
    document.getElementById('paket').value = p.paket;
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

  const paketRaw = document.getElementById('paket').value;
  const paketArr = paketRaw
    ? paketRaw.split('\n').map(p => {
        let [name, harga] = p.split('-');
        if (!name || !harga) return null;
        name = name.trim();
        harga = harga.replace(/\D/g, '');
        harga = parseInt(harga);
        if (!name || isNaN(harga)) return null;
        return { name, harga };
      }).filter(p => p !== null)
    : [];

  const hargaInput = document.getElementById('harga').value;
  const harga = hargaInput ? parseInt(hargaInput.replace(/\D/g, '')) : undefined;

  const payload = {
    nama: document.getElementById('nama').value,
    img: document.getElementById('img').value,
    harga: harga,
    paket: paketArr.length > 0 ? paketArr : undefined
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