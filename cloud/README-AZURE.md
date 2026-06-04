# 🚂 Panduan Deploy Backend RailSafe ke Azure (Untuk Pemula)

> **Estimasi waktu:** ~30 menit | **Tingkat kesulitan:** Menengah | **Tujuan:** Menjalankan backend di server cloud

Dokumen ini akan memandu Anda step-by-step menempatkan server RailSafe di Azure Cloud agar dapat diakses dari internet.

---

## ✅ Checklist Siap-siap Sebelum Mulai

Pastikan Anda sudah punya:

- ✅ **Azure VM** sudah dibuat di Azure Portal (Ubuntu 20.04)
  - Tipe: `Standard_B2s` atau lebih (2 vCPU, 4GB RAM)
  - Sudah bisa SSH masuk
  - IP address: dicatat (contoh: `20.189.74.35`)

- ✅ **Supabase credentials** (dari dashboard Supabase):
  - `DATABASE_URL` → Settings → Database → Connection strings
  - `SUPABASE_SERVICE_ROLE_KEY` → Settings → API

- ✅ **File project** sudah siap di folder `cloud/railsafe-project/`

---

## 🚀 Panduan Step-by-Step

### Step 1: Hubungkan ke Azure VM via SSH

**Apa ini:** Membuka terminal/command prompt untuk masuk ke server Azure.

**Di local machine Anda (Windows/Mac/Linux), buka terminal dan jalankan:**

```bash
ssh azureuser@20.189.74.35
```

Ganti `20.189.74.35` dengan **IP address Azure VM Anda**

**Output yang benar akan terlihat:**
```
Welcome to Ubuntu 20.04...
azureuser@vm-socket-server:~$
```

❌ **Jika error:** Pastikan:
- IP address benar
- Sudah setup SSH key di Azure
- Firewall Azure tidak block port 22

---

### Step 2: Update System & Install Docker

**Apa ini:** Menginstall Docker (tools untuk menjalankan aplikasi dalam container) dan Docker Compose.

**Copy-paste command ini satu per satu:**

```bash
# 1️⃣ Update paket (ini bisa butuh beberapa menit)
sudo apt-get update
sudo apt-get upgrade -y

# 2️⃣ Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# 3️⃣ Izinkan user akses Docker tanpa sudo
sudo usermod -aG docker $USER
newgrp docker

# 4️⃣ Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 5️⃣ Verifikasi - jalankan command ini untuk cek
docker --version
docker-compose --version
```

**Output yang benar:**
```
Docker version 24.0.0, build ...
Docker Compose version 2.x.x, build ...
```

⏳ **Catatan:** Step 1 bisa memakan waktu 5-10 menit.

❌ **Jika error "command not found":** 
- Tunggu sampai install selesai
- Logout dan login ulang: `exit` kemudian `ssh azureuser@...` lagi

---

### Step 3: Buat Folder untuk Aplikasi

**Apa ini:** Membuat folder tempat file aplikasi akan disimpan.

**Copy-paste command ini:**

```bash
# Buat folder
sudo mkdir -p /opt/railsafe
sudo mkdir -p /var/log/railsafe
sudo mkdir -p /data/railsafe/mosquitto_data
sudo mkdir -p /data/railsafe/mosquitto_log

# Set permission (izin akses)
sudo chmod -R 755 /opt/railsafe
sudo chmod -R 755 /var/log/railsafe
sudo chmod -R 755 /data/railsafe

# Berikan ownership ke user
sudo chown -R $USER:$USER /opt/railsafe
```

**Output yang benar:** Tidak ada output, hanya kembali ke prompt

✅ **Verifikasi:**
```bash
ls -la /opt/railsafe/
# Harusnya folder kosong
```

---

### Step 4: Setup Firewall

**Apa ini:** Mengatur firewall untuk mengizinkan traffic keluar masuk aplikasi.

**Copy-paste:**

```bash
# Enable firewall
sudo ufw --force enable

# Izinkan SSH (penting! jangan sampai terkunci)
sudo ufw allow 22/tcp

# Izinkan HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Izinkan Backend API (port 3001)
sudo ufw allow 3001/tcp

# Izinkan MQTT (port 1883)
sudo ufw allow 1883/tcp

# Lihat status
sudo ufw status
```

**Output yang benar:**
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
3001/tcp                   ALLOW       Anywhere
1883/tcp                   ALLOW       Anywhere
```

⚠️ **PENTING:** Jangan matikan sebelum allow port 22, atau Anda akan terkunci!

---

### Step 5: Upload File Aplikasi ke Azure

**Apa ini:** Mengirim file project dari komputer lokal ke server Azure.

**Di local machine Anda (BUKAN di Azure), buka terminal dan jalankan:**

```bash
# Pastikan Anda di folder project
cd "D:\TUGAS KULIAH RIFQI\Semester 6\Proyek Teknologi Terintegrasi\PBL-Semester-6"

# Upload semua file ke Azure
scp -r ./cloud/railsafe-project/* azureuser@20.189.74.35:/opt/railsafe/

# Ganti "20.189.74.35" dengan IP Azure VM Anda
```

⏳ **Ini bisa butuh 1-2 menit**

**Output yang benar:**
```
Dockerfile               100%    1.2KB
docker-compose.yml      100%    2.1KB
...
[semua file selesai ter-upload]
```

❌ **Jika error "Permission denied":**
- Pastikan folder `/opt/railsafe/` sudah dibuat di step 3
- Di Azure terminal, jalankan: `sudo chown -R $USER:$USER /opt/railsafe`

**Verifikasi di Azure terminal:**
```bash
ls -la /opt/railsafe/
# Harusnya keluar file: Dockerfile, docker-compose.yml, backend/, mosquitto/, dll
```

---

### Step 6: Konfigurasi Environment Variables (.env)

**Apa ini:** File berisi credentials (username/password/API keys) yang tidak boleh di-commit ke GitHub.

**Di Azure terminal, buat file .env:**

```bash
cd /opt/railsafe
nano .env
```

**Copy-paste text berikut dan sesuaikan dengan nilai Anda:**

```env
# DATABASE - Copy dari Supabase Settings → Database → Connection strings (URI)
DATABASE_URL=postgresql://postgres:PASSWORD_ANDA@db.xxxxx.supabase.co:6543/postgres

# SUPABASE - Copy dari Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI...

# MQTT (gunakan local Mosquitto di Docker)
MQTT_HOST=mosquitto
MQTT_PORT=1883
MQTT_USER=
MQTT_PASSWORD=

# SERVER
PORT=3001
NODE_ENV=production
TZ=Asia/Jakarta
```

⚠️ **PENTING SESUAIKAN:**
- `PASSWORD_ANDA` → ganti dengan password dari Supabase
- `xxxxx` → ganti dengan project ID Supabase
- `eyJhbGc...` → ganti dengan service role key

**Untuk simpan di nano:**
1. Tekan `Ctrl+O` (save)
2. Tekan `Enter`
3. Tekan `Ctrl+X` (exit)

✅ **Verifikasi:**
```bash
cat .env
# Harus keluar isi file yang barusan diketik
```

---

### Step 7: Atur Permission File .env (Keamanan)

**Apa ini:** Membuat file .env hanya bisa dibaca oleh user (tidak boleh transparan untuk orang lain).

**Di Azure terminal:**

```bash
cd /opt/railsafe

# Set permission - hanya owner yang bisa baca
chmod 600 .env

# Verifikasi
ls -la .env
# Harusnya: -rw------- (bukan -rw-r--r--)
```

---

### Step 8: Jalankan Docker Containers

**Apa ini:** Menjalankan aplikasi backend dan MQTT broker dalam Docker.

**Di Azure terminal:**

```bash
cd /opt/railsafe

# Jalankan containers
docker-compose up -d

# Tunggu 2-3 menit untuk startup
```

⏳ **Tunggu sampai selesai download image (bisa 200-300MB)**

**Cek status containers:**

```bash
docker-compose ps
```

**Output yang benar - dua container "Up":**
```
NAME                  STATUS
railsafe_mosquitto    Up 2 minutes
railsafe_backend      Up 1 minute
```

❌ **Jika status "Restarting" atau "Exited":**
- Lihat error: `docker-compose logs`
- Paling sering: DATABASE_URL salah atau network issue
- Coba lagi: `docker-compose restart`

---

### Step 9: Test Aplikasi Berjalan

**Apa ini:** Memastikan backend API benar-benar aktif dan siap menerima request.

**Test dari Azure terminal:**

```bash
# Test 1: Health check
curl http://localhost:3001/health

# Harusnya output:
# {"status":"OK","service":"railsafe-backend",...}

# Test 2: Readiness (database terhubung?)
curl http://localhost:3001/ready

# Harusnya output:
# {"ready":true,"database":"connected",...}
```

**Lihat log detail jika ada masalah:**

```bash
docker-compose logs backend
# atau untuk live log:
docker-compose logs -f backend
# Tekan Ctrl+C untuk exit
```

❌ **Jika health check gagal:**
- Pastikan DATABASE_URL di .env benar
- Pastikan firewall port 3001 sudah allow
- Check logs: `docker-compose logs backend`

---

### Step 10: Auto-Start saat Server Reboot

**Apa ini:** Membuat services otomatis jalankan ulang jika server restart.

**Di Azure terminal:**

```bash
# Buat service file
sudo nano /etc/systemd/system/railsafe-docker.service
```

**Copy-paste isi berikut:**

```ini
[Unit]
Description=RailSafe Docker Services
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/railsafe
User=$USER
ExecStart=/usr/local/bin/docker-compose up
ExecStop=/usr/local/bin/docker-compose down
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Simpan:** `Ctrl+O` → `Enter` → `Ctrl+X`

**Aktifkan service:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable railsafe-docker

# Cek status
sudo systemctl status railsafe-docker

# Harusnya output:
# ● railsafe-docker.service - RailSafe Docker Services
#   Loaded: loaded (...; enabled; ...)
#   Active: active (running) since ...
```

✅ **Sekarang aplikasi akan otomatis jalan saat server menyala!**

---

## 🏗️ Bagaimana Cara Kerjanya?

### Simple Explanation (Untuk Pemula)

Aplikasi RailSafe bekerja dengan 3 komponen utama:

1. **Backend API** (Port 3001)
   - Tempat program utama berjalan
   - Menerima request dari frontend (UI yang user lihat)
   - Menyimpan/mengambil data dari Supabase
   - Menghubungkan dengan sensor kereta via MQTT

2. **Mosquitto MQTT** (Port 1883)
   - Server untuk sensor IoT / kereta mengirim data
   - Seperti "telegram group" untuk sensor
   - Backend "mendengarkan" pesan dari sensor

3. **Supabase Database** (External - Cloud)
   - Tempat penyimpanan data (database)
   - Bisa diakses dari mana saja

### Diagram (Simplified)

```
Sensor Kereta ──→ Mosquitto (Port 1883) ──→ Backend API (Port 3001) ──→ Database
                       ↓
                  Disimpan di
                   memory
                   
User (Frontend) ──→ Backend API (Port 3001) ──→ Ambil data dari Database
```

### Dua Cara Menjalankan

**Opsi 1: Docker Compose** ✅ (Recommended - kita pakai ini)
- Pro: Mudah setup, production-ready
- Cons: Butuh Docker

**Opsi 2: Direct Install** (Jika Docker error)
- Pro: Lebih simple
- Cons: Lebih banyak dependencies

Untuk sekarang, gunakan **Docker Compose** (Step 1-10 sudah menggunakan ini).

---

## 🔒 Keamanan Dasar

### ⚠️ IMPORTANT - Jangan Lupa!

Setelah deployment berhasil, lakukan ini:

**1️⃣ Jangan expose file `.env`**
```bash
# Pastikan sudah done di Step 7
ls -la /opt/railsafe/.env
# Harus permission: -rw------- (600)
```

**2️⃣ Ganti default SSH key**
- Azure sudah provide SSH key saat VM creation
- Jangan gunakan username/password
- Simpan SSH key di tempat aman

**3️⃣ Jangan commit `.env` ke GitHub**
```bash
# Verify .gitignore sudah ada
cat /opt/railsafe/.gitignore | grep ".env"
# Harusnya ada: .env
```

**4️⃣ Setup SSL untuk production** (Opsional)
- Jika mau HTTPS, perlu setup Let's Encrypt (lebih kompleks)
- Untuk sekarang, gunakan HTTP (port 3001 sudah aman di firewall)

✅ **Untuk deployment pertama, yang di atas sudah cukup!**

---

## 📊 Monitor Aplikasi - Command Cheat Sheet

### Check Status

```bash
# Lihat container running/stop
cd /opt/railsafe
docker-compose ps

# Output harusnya:
# NAME              STATUS
# railsafe_backend    Up X minutes
# railsafe_mosquitto  Up X minutes
```

### Lihat Error / Logs

```bash
# Lihat log backend terbaru (20 baris)
cd /opt/railsafe
docker-compose logs backend --tail 20

# Untuk live log (auto-update):
docker-compose logs -f backend
# Tekan Ctrl+C untuk exit
```

### Test Aplikasi Masih OK

```bash
# Test dari local machine Anda
curl http://20.189.74.35:3001/health

# Output harusnya:
# {"status":"OK",...}
```

### Jika Ada Error

**❌ Error: "Stuck di 'Starting railsafe_mosquitto'"**
```bash
# Stop dan clean
docker-compose down
docker system prune -a

# Start lagi
docker-compose up -d
```

**❌ Error: "DATABASE_URL invalid" (di logs)**
```bash
# Buka file .env
nano /opt/railsafe/.env

# Verifikasi DATABASE_URL dari Supabase:
# https://app.supabase.com → Your Project → Settings → Database → Connection strings
# Copy URI string dan update di .env
```

**❌ Error: "Cannot connect to MQTT"**
```bash
# Pastikan mosquitto container running
docker-compose ps mosquitto

# Lihat logs mosquitto
docker-compose logs mosquitto --tail 20
```

**❌ Container keep restarting**
```bash
# Lihat status detil
docker-compose ps

# Lihat log lengkap
docker-compose logs

# Mungkin butuh restart Docker daemon
sudo systemctl restart docker
```

---

## ✅ Selesai! Apa Selanjutnya?

Selamat! Backend RailSafe sudah berjalan di Azure. Berikut hal yang bisa dilakukan:

### 1️⃣ Test Dari Frontend

Sekarang hubungkan frontend Anda ke backend Azure ini:

**Di folder `frontend/`**, update `.env.local`:

```
NEXT_PUBLIC_BACKEND_URL=http://20.189.74.35:3001
NEXT_PUBLIC_SOCKET_URL=http://20.189.74.35:3001
```

Ganti `20.189.74.35` dengan IP Azure VM Anda.

### 2️⃣ Hubungkan Sensor IoT

Sensor kereta bisa mengirim data ke MQTT broker:

```bash
# IP MQTT: 20.189.74.35
# Port: 1883
# Topic: kereta/[nama_kereta]/event atau kereta/[nama_kereta]/sensor
```

### 3️⃣ Setup Domain & HTTPS (Optional)

Jika ingin custom domain (misal: railsafe.com):
- Register domain
- Setup DNS pointing ke IP Azure (20.189.74.35)
- Setup Let's Encrypt SSL (lebih kompleks - tanya mentor)

Untuk sekarang, gunakan IP address saja sudah OK.

### 4️⃣ Monitor Terus-Menerus

Setiap hari, check:

```bash
# SSH ke Azure
ssh azureuser@20.189.74.35

# Check status
docker-compose ps

# Jika ada yang down/restarting, check logs
docker-compose logs backend --tail 50
```

---

## 🎓 Quick Reference - Command Paling Sering Dipakai

**Ketika SSH sudah masuk ke Azure:**

```bash
# Masuk folder project
cd /opt/railsafe

# Lihat status (2 container harus "Up")
docker-compose ps

# Lihat log error terbaru
docker-compose logs backend

# Start/Stop services
docker-compose start      # Resume yang pause
docker-compose stop       # Pause (tidak delete)
docker-compose down       # Stop + cleanup (hati-hati!)
docker-compose up -d      # Start

# Edit .env (update credentials)
nano .env
# Tekan Ctrl+O → Enter → Ctrl+X

# Lihat permission file (security check)
ls -la /opt/railsafe/.env  # Harus: -rw------- (600)

# Restart services (jika ada perubahan)
docker-compose restart backend
docker-compose restart mosquitto
```

---

## 📚 Materi Belajar Lebih Lanjut

Jika ingin belajar lebih dalam:

**Docker:**
- Apa itu container? → [Docker Tutorial](https://docs.docker.com/get-started/)
- Bagaimana Docker Compose bekerja? → [Docker Compose Docs](https://docs.docker.com/compose/)

**MQTT:**
- Protocol messaging untuk IoT → [MQTT Basics](https://mosquitto.org/documentation/)
- Publish-Subscribe pattern → Google "MQTT publish subscribe"

**Supabase:**
- Cloud database PostgreSQL → [Supabase Docs](https://supabase.com/docs)
- Koneksi dari backend → Lihat file `backend/src/config/database.js`

**Azure:**
- Virtual Machine di cloud → [Azure VM Docs](https://learn.microsoft.com/en-us/azure/virtual-machines/)
- Firewall & security → [Azure Security](https://learn.microsoft.com/en-us/azure/security/)

---

## ❓ Jika Masih Kebingungan

**Hubungi yang ini (urutan prioritas):**

1. **Mentor teknis** - Tanyakan konsep yang tidak paham
2. **Teman sekelompok** - Sharing experience & troubleshooting
3. **Documentation** - Baca doc yang linked di atas
4. **Trial & Error** - Coba command kecil, lihat hasilnya
   - ⚠️ Tapi jangan hapus folder penting!

---

## 📞 Quick Help

| Problem | Solusi Cepat |
|---------|-------------|
| "Permission denied" | Run: `sudo chmod -R 755 /opt/railsafe` |
| Container tidak start | Check: `docker-compose logs backend` |
| .env error | Verify: `cat /opt/railsafe/.env` (check credentials) |
| Lupa IP Azure | Login Azure Portal → VMs → lihat IP address |
| Backend tidak bisa diakses | Check firewall: `sudo ufw status` (port 3001 harus ALLOW) |
| Database tidak connect | Check: `MQTT_HOST=mosquitto` di .env (bukan localhost) |

---

## 🎉 Selamat Anda Sudah Berhasil!

✅ Backend running di Azure
✅ Database terhubung (Supabase)
✅ MQTT broker aktif
✅ Auto-restart saat server reboot

**Berikutnya:** Hubungkan frontend dan sensor IoT, kemudian deploy ke production!

---

**Created:** 2024 | **Untuk:** Tim RailSafe Students
**Pertanyaan?** Tanya mentor atau baca file lain di folder ini (QUICK-REFERENCE.md, FILES-TO-UPLOAD.md)
