# Migrasi Login Pulau Burung News ke Firebase Authentication

Versi ini mengubah sistem login dari `password` di Firestore menjadi Firebase Authentication.

## 1. Aktifkan Email/Password

Firebase Console → Authentication → Sign-in method → Email/Password → Enable.

## 2. Buat akun Super Admin pertama

Karena akun lama memakai sistem password sendiri, buat akun pertama secara manual:

1. Firebase Console → Authentication → Users → Add user.
2. Masukkan email dan password Super Admin.
3. Salin **User UID**.
4. Firebase Console → Firestore Database → collection `users`.
5. Buat document dengan **Document ID = UID** tadi.
6. Isi field:

```text
uid       = UID Firebase
username  = superadmin
role      = superadmin
name      = Admin Super PBN
phone     = nomor WA (opsional)
email     = email akun
avatar    = null
```

7. Buat collection `usernames` dan document:

```text
Document ID = superadmin
uid         = UID Firebase
```

## 3. Migrasi akun lama

Akun lama seperti `superadmin`, `admin`, `reporter`, dan `pengunjung` tidak otomatis dipakai lagi karena password lamanya sengaja tidak dibaca oleh aplikasi baru.

Untuk setiap akun yang ingin dipertahankan:

- buat akun email/password di Firebase Authentication;
- buat document `users/{UID}`;
- isi `uid`, `username`, `role`, `name`, `phone`, `email`, `avatar`;
- buat document `usernames/{username}` dengan field `uid`.

Setelah semua akun penting berhasil dipindahkan dan diuji, **hapus document pengguna lama yang masih berisi field `password`**.

> Jangan mengunggah atau membagikan file export/database yang masih berisi password lama.

## 4. Pasang Firestore Rules

Isi Firebase Console → Firestore Database → Rules dengan isi file `firestore.rules` dari paket ini, lalu Publish.

Sebelum Publish, pastikan Super Admin pertama sudah dibuat karena rules membutuhkan dokumen `users/{UID}` untuk menentukan role.

## 5. Uji

Uji minimal:

- daftar akun baru;
- login;
- logout;
- lupa password melalui email;
- komentar;
- like;
- admin menambah berita;
- reporter mengelola berita sendiri;
- Super Admin mengubah role pengguna.

## Catatan foto

Versi ini **belum memindahkan foto lama dari Base64/Data URL ke Firebase Storage**. Foto yang ada tetap mengikuti mekanisme proyek lama. Pemindahan foto ke Firebase Storage sebaiknya menjadi tahap berikutnya karena lebih hemat dan tidak membebani ukuran dokumen Firestore.
