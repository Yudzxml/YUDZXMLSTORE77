let produkList = [];

const produkContainer = document.getElementById("produkContainer");
const checkoutSection = document.getElementById("checkoutSection");
const produkDipilihInput = document.getElementById("produkDipilih");
const hargaProdukInput = document.getElementById("hargaProduk");
const paketPilihanSelect = document.getElementById("paketPilihan");
const labelPaket = document.getElementById("labelPaket");
const namaPembeliInput = document.getElementById("namaPembeli");
const closeFormBtn = document.getElementById("closeFormBtn");
const addProductFormSection = document.getElementById("addProductForm");
const checkoutForm = document.getElementById("checkoutForm");

// Referensi tombol submenu
const floatingBtn = document.getElementById("mainFloatingBtn");

// Buat elemen submenu
const submenu = document.createElement("div");
submenu.id = "floatingSubmenu";
submenu.style.position = "fixed";
submenu.style.bottom = "80px";
submenu.style.right = "20px";
submenu.style.display = "none";
submenu.style.flexDirection = "column";
submenu.style.gap = "10px";
submenu.style.zIndex = "1000";
document.body.appendChild(submenu);

// Buat tombol submenu: Hapus, Tambah, Edit
const btnHapus = document.createElement("button");
btnHapus.textContent = "Hapus Produk";
btnHapus.title = "Hapus Produk";
btnHapus.onclick = bukaDeleteProdukForm;

const btnTambah = document.createElement("button");
btnTambah.textContent = "Tambah Produk";
btnTambah.title = "Tambah Produk";
btnTambah.onclick = bukaAddProduk;

const btnEdit = document.createElement("button");
btnEdit.textContent = "Edit Produk";
btnEdit.title = "Edit Produk";
btnEdit.onclick = bukaEditProdukForm;

submenu.appendChild(btnHapus);
submenu.appendChild(btnTambah);
submenu.appendChild(btnEdit);

// Toggle submenu saat tombol utama diklik
floatingBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  submenu.style.display = submenu.style.display === "none" ? "flex" : "none";
});

// Tutup submenu jika klik di luar tombol/submenu
document.addEventListener("click", () => {
  submenu.style.display = "none";
});

// Render produk dari API
async function renderProduk() {
  try {
    produkContainer.innerHTML = "<p>Memuat produk...</p>";
    const res = await fetch('/api/products');
    if (!res.ok) throw new Error("Gagal memuat produk");
    produkList = await res.json();

    produkContainer.innerHTML = "";
    produkList.forEach((produk, index) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${produk.img}" alt="${produk.nama}" />
        <h3>${produk.nama}</h3>
        <button onclick="bukaFormCheckout(${index})">Order</button>
      `;
      produkContainer.appendChild(card);
    });
  } catch (e) {
    produkContainer.innerHTML = "<p>Gagal memuat produk.</p>";
    console.error(e);
  }
}

renderProduk();

// Buka form checkout produk
function bukaFormCheckout(index) {
  const produk = produkList[index];
  checkoutSection.classList.remove("hidden");
  document.body.classList.add("form-active");

  produkDipilihInput.value = produk.nama;
  namaPembeliInput.value = "";

  if (produk.paket && produk.paket.length > 0) {
    labelPaket.classList.remove("hidden");
    paketPilihanSelect.classList.remove("hidden");
    paketPilihanSelect.innerHTML = "";
    produk.paket.forEach(p => {
      const option = document.createElement("option");
      option.value = p.harga;
      option.textContent = `${p.name} - Rp${p.harga.toLocaleString()}`;
      paketPilihanSelect.appendChild(option);
    });
    hargaProdukInput.value = "Rp" + produk.paket[0].harga.toLocaleString();
  } else if (produk.harga) {
    labelPaket.classList.add("hidden");
    paketPilihanSelect.classList.add("hidden");
    hargaProdukInput.value = "Rp" + produk.harga.toLocaleString();
  } else {
    labelPaket.classList.add("hidden");
    paketPilihanSelect.classList.add("hidden");
    hargaProdukInput.value = "Rp0";
  }
}

// Update harga saat paket dipilih berubah
paketPilihanSelect.addEventListener("change", () => {
  hargaProdukInput.value = "Rp" + Number(paketPilihanSelect.value).toLocaleString();
});

// Tutup form checkout
closeFormBtn.addEventListener("click", () => {
  checkoutSection.classList.add("hidden");
  document.body.classList.remove("form-active");
});

// Buka form tambah produk
function bukaAddProduk() {
  addProductFormSection.classList.remove("hidden");
  document.body.classList.add("form-active");
  submenu.style.display = "none";
}

// Tutup form tambah produk
function tutupAddProduk() {
  addProductFormSection.classList.add("hidden");
  document.body.classList.remove("form-active");
}

// Reset form tambah produk
function resetAddProductForm() {
  document.getElementById("namaProdukBaru").value = '';
  document.getElementById("imgProdukBaru").value = '';
  document.getElementById("paketProdukBaru").value = '';
  document.getElementById("hargaProdukBaru").value = '';
  document.getElementById("formPassword").value = '';
}

// Tambah produk baru
async function tambahProdukBaru(event) {
  event.preventDefault();

  const nama = document.getElementById("namaProdukBaru").value.trim();
  const img = document.getElementById("imgProdukBaru").value.trim();
  const paketText = document.getElementById("paketProdukBaru").value.trim();
  const harga = document.getElementById("hargaProdukBaru").value.trim();
  const password = document.getElementById("formPassword").value;
  const ADMIN_PASSWORD = "ADMINYUDZXML";

  if (password !== ADMIN_PASSWORD) {
    alert("Password salah!");
    return;
  }

  if (!nama || !img || (!paketText && !harga)) {
    alert("Isi semua field produk dengan benar!");
    return;
  }

  const produkBaru = { nama, img };

  if (paketText) {
    const paketLines = paketText.split("\n").filter(line => line.trim());
    produkBaru.paket = paketLines.map(line => {
      const [name, hargaStr] = line.split(" - ");
      return {
        name: name?.trim(),
        harga: parseInt(hargaStr?.trim())
      };
    }).filter(p => p.name && !isNaN(p.harga));
  } else if (harga) {
    produkBaru.harga = parseInt(harga);
  }

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produkBaru)
    });

    const data = await res.json();

    if (res.ok) {
      alert('Produk berhasil ditambahkan!');
      await renderProduk();
      tutupAddProduk();
      resetAddProductForm();
    } else {
      alert('Gagal menambahkan produk: ' + (data.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Error saat mengirim produk: ' + error.message);
  }
}

// Kirim order ke WhatsApp
function sendToWhatsApp(event) {
  event.preventDefault();

  const nama = namaPembeliInput.value.trim();
  const produk = produkDipilihInput.value;
  const harga = hargaProdukInput.value;
  const paket = !paketPilihanSelect.classList.contains("hidden") ?
    paketPilihanSelect.options[paketPilihanSelect.selectedIndex].text : "";

  if (!nama) {
    alert("Isi nama pembeli!");
    return;
  }

  let pesan = `Halo Admin, saya ingin order:\n\nNama: ${nama}\nProduk: ${produk}`;
  if (paket) pesan += `\nPaket/Spesifikasi: ${paket}`;
  pesan += `\nHarga: ${harga}`;

  const waUrl = `https://wa.me/6283872031397?text=${encodeURIComponent(pesan)}`;
  window.open(waUrl, "_blank");
}

// Submit form checkout
checkoutForm.addEventListener('submit', sendToWhatsApp);

// Buka form edit produk dengan input visual (form baru)
const editProductFormSection = document.getElementById("editProductForm");
const editNamaInput = document.getElementById("editNamaProduk");
const editImgInput = document.getElementById("editImgProduk");
const editHargaInput = document.getElementById("editHargaProduk");
const editPaketInput = document.getElementById("editPaketProduk");
const editPasswordInput = document.getElementById("editFormPassword");
const editFormCloseBtn = document.getElementById("editFormCloseBtn");
const editFormSaveBtn = document.getElementById("editFormSaveBtn");

let currentEditIndex = null;

function bukaEditProdukForm() {
  submenu.style.display = "none";

  if (produkList.length === 0) {
    alert("Belum ada produk untuk diedit.");
    return;
  }

  const namaEdit = prompt("Masukkan nama produk yang ingin diedit:");
  if (!namaEdit) return;

  const index = produkList.findIndex(p => p.nama.toLowerCase() === namaEdit.toLowerCase());
  if (index === -1) {
    alert("Produk tidak ditemukan.");
    return;
  }

  currentEditIndex = index;
  const produk = produkList[index];

  // Isi form edit
  editNamaInput.value = produk.nama;
  editImgInput.value = produk.img || "";
  editHargaInput.value = produk.harga || "";
  if (produk.paket && produk.paket.length > 0) {
    editPaketInput.value = produk.paket.map(p => `${p.name} - ${p.harga}`).join("\n");
  } else {
    editPaketInput.value = "";
  }

  editPasswordInput.value = "";
  editProductFormSection.classList.remove("hidden");
  document.body.classList.add("form-active");
}

// Tutup form edit produk
function tutupEditProduk() {
  editProductFormSection.classList.add("hidden");
  document.body.classList.remove("form-active");
  currentEditIndex = null;
}

// Simpan perubahan edit produk
async function simpanEditProduk(event) {
  event.preventDefault();
  const ADMIN_PASSWORD = "ADMINYUDZXML";

  const password = editPasswordInput.value;
  if (password !== ADMIN_PASSWORD) {
    alert("Password salah!");
    return;
  }

  const newNama = editNamaInput.value.trim();
  const newImg = editImgInput.value.trim();
  const newHargaStr = editHargaInput.value.trim();
  const newPaketText = editPaketInput.value.trim();

  if (!newNama || !newImg || (!newHargaStr && !newPaketText)) {
    alert("Isi semua field dengan benar!");
    return;
  }

  const produkUpdate = { nama: newNama, img: newImg };

  if (newPaketText) {
    const paketLines = newPaketText.split("\n").filter(line => line.trim());
    produkUpdate.paket = paketLines.map(line => {
      const [name, hargaStr] = line.split(" - ");
      return {
        name: name?.trim(),
        harga: parseInt(hargaStr?.trim())
      };
    }).filter(p => p.name && !isNaN(p.harga));
    delete produkUpdate.harga;
  } else if (newHargaStr) {
    const hargaNum = parseInt(newHargaStr);
    if (isNaN(hargaNum)) {
      alert("Harga harus angka!");
      return;
    }
    produkUpdate.harga = hargaNum;
    delete produkUpdate.paket;
  }

  const originalNama = produkList[currentEditIndex].nama;

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(originalNama)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produkUpdate)
    });

    if (res.ok) {
      alert('Produk berhasil diperbarui!');
      await renderProduk();
      tutupEditProduk();
    } else {
      const data = await res.json();
      alert('Gagal memperbarui produk: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Terjadi kesalahan saat mengupdate produk.');
  }
}

editFormCloseBtn.addEventListener("click", tutupEditProduk);
editFormSaveBtn.addEventListener("click", simpanEditProduk);

const deleteProductFormSection = document.getElementById("deleteProductForm");
const deleteProdukSelect = document.getElementById("deleteProdukSelect");
const deleteFormPassword = document.getElementById("deleteFormPassword");
const deleteFormConfirmBtn = document.getElementById("deleteFormConfirmBtn");
const deleteFormCloseBtn = document.getElementById("deleteFormCloseBtn");

// Fungsi buka form hapus produk
function bukaDeleteProdukForm() {
  submenu.style.display = "none";
  if (produkList.length === 0) {
    alert("Belum ada produk untuk dihapus.");
    return;
  }
  // Isi dropdown produk dengan nama produk
  deleteProdukSelect.innerHTML = "";
  produkList.forEach(p => {
    const option = document.createElement("option");
    option.value = p.nama;
    option.textContent = p.nama;
    deleteProdukSelect.appendChild(option);
  });

  deleteFormPassword.value = "";
  deleteProductFormSection.classList.remove("hidden");
  document.body.classList.add("form-active");
}

// Tutup form hapus produk
function tutupDeleteProduk() {
  deleteProductFormSection.classList.add("hidden");
  document.body.classList.remove("form-active");
}

// Konfirmasi dan hapus produk
async function konfirmasiHapusProduk() {
  const nama = deleteProdukSelect.value;
  const password = deleteFormPassword.value;
  const ADMIN_PASSWORD = "ADMINYUDZXML";

  if (password !== ADMIN_PASSWORD) {
    alert("Password salah!");
    return;
  }

  const konfirmasi = confirm(`Yakin ingin menghapus produk "${nama}"?`);
  if (!konfirmasi) return;

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(nama)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      alert("Produk berhasil dihapus!");
      await renderProduk();
      tutupDeleteProduk();
    } else {
      alert("Gagal menghapus produk.");
    }
  } catch {
    alert("Terjadi kesalahan saat menghapus produk.");
  }
}

// Event listener tombol form hapus
deleteFormConfirmBtn.addEventListener("click", konfirmasiHapusProduk);
deleteFormCloseBtn.addEventListener("click", tutupDeleteProduk);

// Ganti fungsi hapusProduk di submenu jadi buka form hapus produk:
btnHapus.onclick = bukaDeleteProdukForm;