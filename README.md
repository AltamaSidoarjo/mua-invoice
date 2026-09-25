# 💄 MUA Invoice & Booking System

Aplikasi manajemen dan pembuatan invoice profesional khusus usaha **Make Up Artist (MUA)**. Siap langsung di-deploy ke **Vercel** dengan database SQLite serverless **Turso (libSQL)**.

Dilengkapi otentikasi kuat tahan bobol (Scrypt hashing, proteksi brute-force, timing-safe equality, auto-lockout), manajemen rincian layanan riasan, kalkulasi DP/Pelunasan otomatis, cetak/download PDF presisi A4, dan tombol kirim ringkasan via WhatsApp langsung ke klien.

---

## ✨ Fitur Utama

1. **Keamanan & Otentikasi Kuat (Anti-Bobol)**
   - **Password Hashing:** Scrypt memory-hard (standar OWASP, kebal serangan GPU brute-force) dengan salt kriptografis acak 16-byte.
   - **Timing-Safe Comparison:** Menggunakan `crypto.timingSafeEqual` untuk mencegah *side-channel timing attack*.
   - **Proteksi Brute-Force & Lockout:** Akun otomatis dikunci selama 15 menit jika terdeteksi 5 kali percobaan login gagal berturut-turut.
   - **Manajemen Sesi Kriptografis:** Token acak 256-bit disimpan dalam bentuk SHA-256 hash di database. Token asli dikirim via cookie `httpOnly`, `SameSite=Lax`, dan `Secure` (kebal XSS dan pencurian token).
   - **Auto Lock Registration:** Pendaftaran publik otomatis dikunci permanen setelah akun admin MUA pertama berhasil didaftarkan.

2. **Manajemen Invoice & Finansial MUA**
   - Nomor Invoice otomatis harian berurutan (`INV-YYYYMMDD-001`, `INV-YYYYMMDD-002`, dst).
   - Jadwal & Lokasi Acara lengkap: Jenis Acara (Wedding, Lamaran, Wisuda, Photoshoot, dll), Tanggal, Jam, dan Alamat/Gedung Venue.
   - Tabel layanan dinamis: Pilihan cepat paket populer (Make Up Bride, Ibu Pengantin, Bridesmaid, Retouch, Sewa Aksesoris, dll).
   - Perhitungan otomatis Subtotal, Diskon, Uang Muka (DP), dan Sisa Pelunasan.
   - Status invoice: *Draft*, *DP Terbayar*, *Lunas*, *Dibatalkan*.

3. **Sistem Pencatatan Pembayaran & Riwayat Transaksi (Fitur Baru)**
   - **Modal Catat Pembayaran:** Tombol nominal cepat (*Lunaskan Sisa*, *DP 30%*, *DP 50%*), pilihan metode transfer/QRIS/tunai, tanggal dan catatan bukti transfer.
   - **Kalkulasi Saldo Otomatis:** Saldo tagihan langsung terpotong, status otomatis beralih menjadi DP Terbayar atau Lunas.
   - **Riwayat Pembayaran Transparan:** Menampilkan daftar tiap pembayaran yang sudah diterima lengkap dengan tanggal dan metodenya di invoice.
   - **Aksi Cepat Klien:** Tombol 1-klik *Salin No. Rekening* dan *Konfirmasi Bukti Transfer via WhatsApp*.

4. **Cetak & Ekspor PDF Elegan**
   - **Cetak / Simpan PDF (A4 Native):** Tata letak presisi A4 bebas header/footer browser yang mengganggu, font vektor tajam, stempel status lunas.
   - **Download PDF Langsung:** Tombol download file `.pdf` langsung di browser menggunakan `html2canvas` dan `jsPDF`.
   - **Link Publik Invoice Klien:** Tautan invoice dapat dibagikan langsung ke pengantin/klien secara aman tanpa memerlukan login admin.

4. **Integrasi WhatsApp Otomatis**
   - Tombol 1-klik untuk mengirim pesan invoice sopan dan terformat rapi ke WhatsApp klien beserta rincian biaya, jadwal acara, dan nomor rekening transfer.

5. **Pengaturan Profil & Rekening Bank**
   - Kustomisasi identitas brand MUA, nama lead artist, WhatsApp, Instagram, alamat studio, dan rekening bank pembayaran.
   - Template Syarat & Ketentuan (T&C) serta Catatan Khusus otomatis teraplikasikan ke setiap invoice baru.

---

## 🚀 Panduan Deploy ke Vercel (Gratis)

### Langkah 1: Buat Database SQLite Gratis di Turso
1. Buka [https://turso.tech](https://turso.tech) dan login / daftar (gratis permanen hingga 500 database & 9 GB).
2. Buat database baru:
   - **Via Web Dashboard:** Klik **Create Database**, beri nama `mua-invoice`.
   - **Via Turso CLI (opsional):**
     ```bash
     turso db create mua-invoice
     ```
3. Dapatkan **Database URL** dan **Auth Token**:
   - URL: Berbentuk `libsql://mua-invoice-[username].turso.io`
   - Auth Token: Buat token akses di tab *Tokens* atau jalankan `turso db tokens create mua-invoice`.

---

### Langkah 2: Deploy ke Vercel
1. Upload/Push folder proyek ini ke repositori **GitHub** Anda:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit MUA invoice app"
   git branch -M main
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git push -u origin main
   ```

2. Buka [https://vercel.com](https://vercel.com) dan klik **Add New** &rarr; **Project**.
3. Import repositori GitHub yang baru saja Anda buat.
4. Pada bagian **Environment Variables**, tambahkan dua variabel berikut:
   - `TURSO_DATABASE_URL` = `libsql://mua-invoice-xxxx.turso.io`
   - `TURSO_AUTH_TOKEN` = `eyJh...token_anda...`
5. Klik **Deploy**.
6. Vercel akan selesai build dalam ~1 menit dan memberikan domain publik gratis (contoh: `https://mua-invoice.vercel.app`).

---

### Langkah 3: Setup Akun Admin Pertama
1. Buka URL aplikasi Vercel Anda di browser.
2. Aplikasi akan otomatis mengarahkan ke halaman `/register` untuk pendaftaran akun pemilik MUA pertama.
3. Masukkan Nama Usaha, Username, Email, dan Password yang kuat (minimal 8 karakter dengan huruf besar, huruf kecil, dan angka).
4. Setelah terdaftar, pendaftaran publik akan **otomatis dikunci** demi keamanan.
5. Lengkapi nomor rekening bank dan identitas MUA Anda di menu **Pengaturan & Profil**.

---

## 💻 Menjalankan di Lokal (Development)

Aplikasi memiliki fallback SQLite lokal (`file:mua_invoice.db`). Jika variabel `TURSO_DATABASE_URL` tidak diisi, aplikasi otomatis memakai SQLite lokal:

```bash
# 1. Masuk ke folder proyek
cd mua-invoice

# 2. Install dependencies
npm install

# 3. Jalankan development server
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) di browser Anda.

---

## 📂 Struktur Proyek

```
mua-invoice/
├── app/
│   ├── api/
│   │   ├── auth/           # Login, Register, Logout, Me, Ganti Password
│   │   ├── invoices/       # CRUD Invoice & Statistik Omset
│   │   └── profile/        # Pengaturan Profil MUA & Bank
│   ├── dashboard/          # Dashboard ringkasan & daftar invoice
│   ├── invoices/
│   │   ├── new/            # Form pembuatan invoice baru
│   │   └── [id]/           # Tampilan invoice elegan & cetak/download PDF
│   ├── login/              # Halaman login aman
│   ├── register/           # Setup awal admin MUA
│   ├── settings/           # Pengaturan profil, rekening, & ganti password
│   ├── globals.css         # Styling Tailwind v4 & stylesheet print A4
│   └── layout.tsx
├── components/
│   ├── Navbar.tsx          # Navigasi utama
│   └── InvoiceForm.tsx     # Form multi-row layanan & kalkulasi keuangan
├── lib/
│   ├── auth.ts             # Scrypt hashing, timing-safe eq, brute force lockout
│   ├── db.ts               # Inisialisasi Turso / LibSQL client & auto-migration
│   ├── invoice.ts          # Query & mutasi invoice database
│   ├── profile.ts          # Query & mutasi profil MUA
│   ├── types.ts            # Definisi TypeScript
│   └── utils.ts            # Format Rupiah, Tanggal Indo, WhatsApp generator
└── README.md
```
