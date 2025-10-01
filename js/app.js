const app = document.getElementById('app');
const API_URL = "https://script.google.com/macros/s/AKfycbw4-QDfkRc588zg0zIIGCfq8nlg6qjwwlS3uFnDeMfi0MjnSXl19b4_5s3nlvQv9WmK/exec";

let PoSoal = '';

async function loadPage(page) {
  showLoading();
  try {
    const res = await fetch(`pages/${page}.html`);
    if (!res.ok) throw new Error(res.statusText);
    const html = await res.text();
    app.innerHTML = html;

    if (page === 'login') attachLoginEvents();
    if (page === 'ujian') attachUjianEvents();
    if (page === 'logout') attachLogoutEvents();
  } catch (err) {
    app.innerHTML = `<div class="alert alert-danger">Gagal memuat halaman.</div>`;
    console.error(err);
  }
  hideLoading();
}

// ============ LOGIN ============
function attachLoginEvents() {
  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = document.getElementById("user").value.trim();
    const password = document.getElementById("pass").value.trim();

    if (!username || !password) {
      alert("Isi username dan password!");
      return;
    }
    const uri = `${API_URL}?aksi=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
	
    showLoading();
    fetch(uri)
      .then(res => res.json())
      .then(data => {
        hideLoading();
        if (data.success) {
          // simpan data login & soal
          localStorage.setItem("user", JSON.stringify({
            user: data.username,
            nama: data.nama,
            kelas: data.kelas
          }));
          localStorage.setItem("soal", JSON.stringify(data.soal));
          localStorage.setItem("statusMapel", JSON.stringify(data.statusMapel));
          localStorage.setItem("loggedIn", "login");
          localStorage.setItem("stat", "mapel");
          loadPage("ujian");
        } else {
          alert(data.message || "Login gagal");
        }
      })
      .catch(err => {
        hideLoading();
        console.error("Fetch error:", err);
        alert("Terjadi kesalahan koneksi");
      });
  });
}

// ============ UJIAN ============
function attachUjianEvents() {
  toggleMenu();
  const user = JSON.parse(localStorage.getItem("user"));
  const statusMapel = JSON.parse(localStorage.getItem("statusMapel"));
  const soal = JSON.parse(localStorage.getItem("soal"));
  const stat = localStorage.getItem("stat");

  // tampilkan nama user
  const enama = document.getElementsByClassName("user-nama");
  for (let i = 0; i < enama.length; i++) {
    enama[i].innerHTML = user.nama;
  }

  if (stat == "mapel") {
    // daftar mapel
    const wadah = document.getElementById("t-ujian");
    wadah.innerHTML = '';
    tampilUjian(stat);
    statusMapel.forEach(item => {
      const card = document.createElement("div");
      card.className = "card bg-info mb-3";
      card.innerHTML = `
        <div class="card-body">
          <h3 class="card-title">Ujian Matapelajaran ${item.mapel}</h3>
          <p>Status: <strong>${item.status}</strong></p>
          <button class="float-end btn btn-light btn-sm mulai-btn" onclick="ujian('${item.mapel}')">Mulai Ujian</button>
        </div>
      `;
      wadah.appendChild(card);
    });

  } else if (stat == "soal") {
    tampilUjian(stat);
    const mapel = localStorage.getItem("mapel");
    const DaSoal = document.getElementById("e-dasoal");
    const idSoalArr = [];

    soal.forEach(dsoal => {
      if (dsoal.mapel == mapel) {
        idSoalArr.push(dsoal.id);
      }
    });

    // ambil atau buat StatusUjian
    let StatusUjian = JSON.parse(localStorage.getItem("StatusUjian")) || {};
    if (!StatusUjian.idSoal || StatusUjian.idSoal.toString() !== idSoalArr.toString()) {
      StatusUjian = { idSoal: idSoalArr, jwb: {} };
    }
    localStorage.setItem("StatusUjian", JSON.stringify(StatusUjian));

    // render tombol nomor soal
    DaSoal.innerHTML = '';
    idSoalArr.forEach((iS, idx) => {
      const butn = document.createElement("button");
      butn.className = "no-soal btn px-3 py-2 m-1 btn-outline-primary";
      butn.dataset.index = idx;
      butn.dataset.id = iS;
      butn.innerHTML = `${idx + 1} <span class='jwb'></span>`;
      butn.addEventListener("click", () => renderQuestionByIndex(idx));
      DaSoal.appendChild(butn);
    });

    // render soal pertama
    renderQuestionByIndex(0);
  }

  hideLoading();
}

// ============ RENDER SOAL ============
function renderQuestionByIndex(index) {
  const status = JSON.parse(localStorage.getItem('StatusUjian') || 'null');
  const allSoal = JSON.parse(localStorage.getItem('soal') || '[]');
  if (!status || !status.idSoal) return;

  const id = status.idSoal[index];
  if (!id) return;
  const q = allSoal.find(s => String(s.id) === String(id));
  if (!q) return;

  // elemen soal & opsi
  const E_soal = document.getElementById('e-soal');
  const opsiMap = {
    A: { wrap: document.getElementById('opsia'), text: document.getElementById('e-opsia') },
    B: { wrap: document.getElementById('opsib'), text: document.getElementById('e-opsib') },
    C: { wrap: document.getElementById('opsic'), text: document.getElementById('e-opsic') },
    D: { wrap: document.getElementById('opsid'), text: document.getElementById('e-opsid') },
    E: { wrap: document.getElementById('opsie'), text: document.getElementById('e-opsie') }
  };

  if (E_soal) {
    E_soal.setAttribute('no-soal', id);
    E_soal.innerHTML = q.soal_teks || '';
  }

  // reset opsi
  Object.keys(opsiMap).forEach(letter => {
    const o = opsiMap[letter];
    if (!o.wrap) return;
    o.wrap.classList.add('d-none');
    o.text.textContent = '';
    const r = o.wrap.querySelector('input[type="radio"]');
    if (r) r.checked = false;
  });

  // render opsi aktif
  const keyMap = { A: "opsia", B: "opsib", C: "opsic", D: "opsid", E: "opsie" };
  Object.keys(keyMap).forEach(letter => {
    const field = keyMap[letter];
    const o = opsiMap[letter];
    if (q[field]) {
      o.text.textContent = q[field];
      o.wrap.classList.remove('d-none');
      const r = o.wrap.querySelector('input[type="radio"]');
      if (r) {
        r.value = letter;
        r.checked = (status.jwb && status.jwb[id] === letter);
        r.onchange = () => saveAnswer(id, letter);
      }
    }
  });

  // update status soal aktif
  status.nosoal = index + 1;
  status.id_soal = id;
  localStorage.setItem('StatusUjian', JSON.stringify(status));

  // update tampilan nomor soal
  document.querySelectorAll('.no-soal').forEach(btn => {
    btn.classList.remove('btn-primary', 'btn-success');
    const btnIdx = Number(btn.dataset.index);
    const btnId = btn.dataset.id;
    if (btnIdx === index) btn.classList.add('btn-primary');
    if (status.jwb && status.jwb[btnId]) {
      btn.classList.add('btn-success');
      btn.querySelector('.jwb').textContent = status.jwb[btnId];
    } else {
      btn.querySelector('.jwb').textContent = '';
    }
  });

  // tombol selesai hanya muncul di soal terakhir
  const btnSelesai = document.getElementById('btnSelesai');
  if (btnSelesai) {
    const lastIndex = status.idSoal.length - 1;
    if (index === lastIndex) btnSelesai.classList.remove('d-none');
    else btnSelesai.classList.add('d-none');

    btnSelesai.onclick = () => {
      // kumpulkan jawaban
      const status = JSON.parse(localStorage.getItem("StatusUjian") || "{}");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const mapel = localStorage.getItem("mapel") || "";

  if (!status.jwb || Object.keys(status.jwb).length === 0) {
    alert("Belum ada jawaban yang tersimpan.");
    return;
  }

  // format jawaban jadi id:A,id:B,id:C
  const jwbString = Object.entries(status.jwb)
    .map(([id, ans]) => `${id}:${ans}`)
    .join(",");

  const uri = `${API_URL}?aksi=selesai&username=${encodeURIComponent(user.user)}&mapel=${encodeURIComponent(mapel)}&jwb=${encodeURIComponent(jwbString)}`;
console.log(uri);
  showLoading();
      fetch(uri)
        .then(res => res.json())
        .then(data => {
          hideLoading();
          if (data.success) {
            alert("Jawaban berhasil dikirim!");
          } else {
            alert("Gagal mengirim jawaban.");
          }
          // kembali ke daftar ujian
          localStorage.setItem("stat", "mapel");
          loadPage("ujian");
        })
        .catch(err => {
          hideLoading();
          console.error("Error kirim jawaban:", err);
          alert("Terjadi kesalahan saat mengirim jawaban");
          localStorage.setItem("stat", "mapel");
          loadPage("ujian");
        });
	};
  }
}

// ============ SIMPAN JAWABAN ============
function saveAnswer(idSoal, letter) {
  let status = JSON.parse(localStorage.getItem('StatusUjian')) || {};
  status.jwb = status.jwb || {};
  status.jwb[idSoal] = letter;
  localStorage.setItem('StatusUjian', JSON.stringify(status));

  document.querySelectorAll('.no-soal').forEach(btn => {
    if (btn.dataset.id === String(idSoal)) {
      btn.classList.add('btn-success');
      btn.querySelector('.jwb').textContent = letter;
    }
  });
}

// ============ LOGOUT ============
function attachLogoutEvents() {
  // reset semua localStorage yang dipakai
  ["user", "soal", "statusMapel", "StatusUjian", "loggedIn", "stat", "mapel"]
    .forEach(k => localStorage.removeItem(k));
  setTimeout(() => location.reload(), 1500);
}

// ============ NAVIGASI ============
document.addEventListener('click', (e) => {
  if (e.target.matches('#btnLogout')) {
    loadPage('logout');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem("loggedIn")) {
    loadPage('ujian');
  } else {
    loadPage('login');
  }
});

function toggleMenu() {
  const MeNu = document.getElementById('nav-menu');
  if (!MeNu) return;
  if (localStorage.getItem("loggedIn") == "login") {
    MeNu.classList.remove('d-none');
  } else {
    MeNu.classList.add('d-none');
  }
}

function tampilUjian(st) {
  const tmp = document.getElementById('t-ujian');
  const tsl = document.getElementById('t-soal');
  if (st == "mapel") {
    tsl.classList.add('d-none');
    tmp.classList.remove('d-none');
  } else if (st == "soal") {
    tmp.classList.add('d-none');
    tsl.classList.remove('d-none');
  }
}

function ujian(m) {
  tampilUjian("soal");
  localStorage.setItem("stat", "soal");
  localStorage.setItem("mapel", m);
  window.location.reload();
}

// ============ LOADING ============
const overlay = document.getElementById('loadingOverlay');
function showLoading() {
  overlay.classList.remove('d-none');
  overlay.classList.add('d-flex');
}
function hideLoading() {
  overlay.classList.remove('d-flex');
  overlay.classList.add('d-none');
}
