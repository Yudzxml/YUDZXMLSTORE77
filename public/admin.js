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
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <img src="${item.img}" alt="${item.nama}">
      <h3>${item.nama}</h3>
      <p><strong>Harga:</strong> ${item.harga}</p>
      ${item.paket ? `<p><strong>Paket:</strong> ${item.paket}</p>` : ''}
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
  document.getElementById('harga').value = p.harga;
  document.getElementById('paket').value = p.paket || '';
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
  const payload = {
    nama: document.getElementById('nama').value,
    img: document.getElementById('img').value,
    harga: document.getElementById('harga').value,
    paket: document.getElementById('paket').value
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