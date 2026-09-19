PULAU BURUNG NEWS — Web App Berita Daerah
==========================================

STRUKTUR FILE
-------------
index.html        -> Situs berita publik (beranda)
admin.html         -> Login & dashboard redaksi (reporter/admin)
css/style.css       -> Desain situs publik
css/admin.css       -> Desain tambahan untuk dashboard redaksi
js/data.js          -> Data berita + fungsi simpan/ambil (localStorage)
js/main.js          -> Logika situs publik (render berita, ticker, modal baca)
js/admin.js         -> Logika login & CRUD berita di dashboard

CARA MENJALANKAN
-----------------
1. Ekstrak semua file, jaga strukturnya (jangan pisahkan folder css/ dan js/).
2. Buka file index.html langsung di browser (double click), ATAU
   jalankan lewat local server untuk hasil paling stabil, misalnya:
     - VS Code: klik kanan index.html -> "Open with Live Server"
     - atau jalankan `python -m http.server` di folder ini lalu buka
       http://localhost:8000

AKUN DEMO REDAKSI (admin.html)
-------------------------------
Admin     : admin / admin123     (kelola semua berita, bisa set Hero & hapus milik siapa saja)
Reporter  : reporter / reporter123 (kelola berita miliknya sendiri)

Anda bisa mengganti/menambah akun lewat js/data.js (PBN_DEFAULT_USERS)
sebelum berita pertama kali dibuka di browser.

CATATAN PENTING
----------------
- Semua data berita disimpan di localStorage browser (bukan server/database
  sungguhan). Artinya data hanya tersimpan di browser & perangkat yang
  dipakai untuk mengelola berita — jika dibuka di HP/komputer lain, datanya
  akan mulai dari data contoh (seed) lagi.
- Untuk penggunaan produksi sungguhan (banyak reporter, banyak perangkat,
  data tersimpan terpusat), aplikasi ini perlu dihubungkan ke backend/API
  dan database sungguhan (mis. Node.js + PostgreSQL/MySQL, atau Firebase).
  Struktur kode saat ini sudah dipisah rapi (data.js sebagai "lapisan data")
  sehingga nantinya tinggal diganti agar memanggil API, tanpa mengubah
  banyak bagian tampilan.
- Ada 2 slot ruang iklan siap pakai di beranda (banner atas & slot kecil)
  yang tinggal diisi gambar/kode iklan sungguhan.
