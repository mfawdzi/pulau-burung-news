/* =========================================================
   Pulau Burung News — Koneksi ke Firebase
   File ini HARUS dimuat paling awal, sebelum data.js,
   karena data.js akan memakai variabel db & auth dari sini.
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCJZioGKLtwiZJdiSPAM9IPu5PIBVXB6eQ",
  authDomain: "pulau-burung-news.firebaseapp.com",
  projectId: "pulau-burung-news",
  storageBucket: "pulau-burung-news.firebasestorage.app",
  messagingSenderId: "675946486616",
  appId: "1:675946486616:web:4fdbf4d6146df679b4e32d"
};

firebase.initializeApp(firebaseConfig);

// Referensi global yang dipakai di seluruh file lain (data.js, main.js, admin.js)
const db = firebase.firestore();
const auth = firebase.auth();

console.log('[Firebase] Terhubung ke project:', firebaseConfig.projectId);