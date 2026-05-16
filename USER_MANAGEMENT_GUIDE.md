# 📋 User Management & Profile System

Dokumentasi lengkap sistem manajemen user dan profil untuk aplikasi RailSafe.

## 🎯 Fitur yang Tersedia

### 1. **User Management (Admin)**
Admin dapat mengelola user melalui halaman `/admin/users` dengan fitur:
- ✅ Menambah user baru (dengan email, nama, username, password, role, perlintasan)
- ✅ Mengubah data user (nama, username, role, perlintasan)
- ✅ Menghapus user
- ✅ Melihat daftar semua user

**File:** [`frontend/src/pages/admin/users.tsx`](./frontend/src/pages/admin/users.tsx)

### 2. **User Profile (Personal)**
User dapat mengelola profil pribadi mereka melalui halaman `/profile` dengan fitur:
- ✅ Lihat informasi profil lengkap
- ✅ Edit nama dan username
- ✅ Upload avatar/foto profil
- ✅ Ubah password
- ✅ Logout

**File:** [`frontend/src/pages/profile/index.tsx`](./frontend/src/pages/profile/index.tsx)

### 3. **Public User Profile**
User dapat melihat profil publik user lain di halaman `/user/[id]` dengan menampilkan:
- Avatar
- Nama dan username
- Email
- Role (Admin/Staff)
- Perlintasan (jika staff)
- Tanggal bergabung

**File:** [`frontend/src/pages/user/[id].tsx`](./frontend/src/pages/user/[id].tsx)

## 📁 File-file yang Dibuat

### Pages
```
frontend/src/pages/
├── profile/
│   └── index.tsx          # Halaman profil pribadi user
└── user/
    └── [id].tsx           # Halaman detail profil user lain
```

### Components
```
frontend/src/components/profile/
├── UserProfileCard.tsx    # Komponen kartu profil user
└── UserList.tsx           # Komponen daftar user
```

### Hooks
```
frontend/src/hooks/
├── useAuth.ts            # (Sudah ada) Hook autentikasi
└── useUserProfile.ts     # Hook manajemen profil user
```

## 🔧 API & Database

### Database Tables (Supabase)
- `profiles` - Menyimpan data user (id, email, name, username, role, avatar_url, cross_id, created_at, updated_at)
- Storage bucket: `avatars` - Menyimpan file avatar user

### Backend API Routes (Requirement)
Pastikan backend memiliki endpoints berikut:

#### POST `/api/admin/users`
Membuat user baru (admin only)
```json
{
  "email": "user@email.com",
  "name": "Nama User",
  "username": "username",
  "password": "password123",
  "role": "staff",
  "cross_id": "CROSSING_001"
}
```

#### DELETE `/api/admin/users/:userId`
Menghapus user (admin only)

---

## 📚 Component API

### UserProfileCard
```tsx
import { UserProfileCard } from '@/components/profile/UserProfileCard';

// Full card
<UserProfileCard 
  profile={profile}
  isCurrentUser={true}
/>

// Compact version
<UserProfileCard 
  profile={profile}
  compact={true}
/>
```

**Props:**
- `profile: Profile` - Data profil user
- `isCurrentUser?: boolean` - Menampilkan tombol edit jika true
- `compact?: boolean` - Tampilan compact (baris tunggal)

### UserList
```tsx
import { UserList } from '@/components/profile/UserList';

<UserList 
  users={userArray}
  loading={isLoading}
  onSelectUser={(user) => console.log(user)}
  showLink={true}
/>
```

**Props:**
- `users: Profile[]` - Array user
- `loading?: boolean` - Loading state
- `onSelectUser?: (user: Profile) => void` - Callback saat user dipilih
- `showLink?: boolean` - Menampilkan link ke detail profil

---

## 🎣 Hook API

### useUserProfile
```tsx
import { useUserProfile } from '@/hooks/useUserProfile';

const {
  profile,
  loading,
  error,
  fetchProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  getAllUsers,
} = useUserProfile();
```

**Methods:**
- `fetchProfile(userId: string)` - Fetch profil user berdasarkan ID
- `updateProfile(userId: string, data: UpdateProfileData)` - Update profil (nama, username, avatar)
- `changePassword(data: ChangePasswordData)` - Ubah password
- `uploadAvatar(userId: string, file: File)` - Upload avatar baru
- `getAllUsers()` - Ambil daftar semua user

---

## 🔐 Security Considerations

1. **Password Change Verification**
   - User harus verifikasi password lama sebelum ubah password baru
   - Validasi password minimal 8 karakter

2. **Username Uniqueness**
   - Sistem cek otomatis username sudah digunakan atau belum
   - Tidak bisa ada 2 user dengan username sama

3. **Avatar Upload**
   - Validasi file size maksimal 5MB
   - Validasi file type (image only)
   - File disimpan di Supabase Storage dengan nama unik (userId-timestamp)

4. **Access Control**
   - Admin management page: hanya untuk `super_admin`
   - Profile page: hanya untuk authenticated user
   - User detail page: terbuka untuk siapa saja (public profile)

---

## 🚀 Cara Menggunakan

### Untuk Admin: Mengelola User
1. Buka menu **Management → Users**
2. Klik **Add User** untuk tambah user baru
3. Isi form: email, nama, username, password, role, perlintasan
4. Klik **Buat User**

Untuk edit/hapus:
- Klik ikon **Pencil** untuk edit
- Klik ikon **Trash** untuk hapus

### Untuk User: Kelola Profil Pribadi
1. Klik nama user di **sidebar footer**
2. Pergi ke halaman `/profile`
3. Pilih tab: **Profil**, **Avatar**, atau **Password**
4. Edit data sesuai kebutuhan
5. Simpan perubahan

### Untuk Lihat Profil User Lain
- Klik user di daftar → otomatis redirect ke `/user/[id]`
- Atau akses langsung: `/user/{userId}`

---

## 📝 Data Types (types.ts)

```tsx
export type UserRole = 'super_admin' | 'staff';

export interface Profile {
  id: string;              // User ID dari Supabase Auth
  email: string;           // Email user
  username: string;        // Username unik
  name: string;            // Nama lengkap
  role: UserRole;          // Role user
  avatar_url: string | null; // URL avatar
  cross_id: string | null; // ID perlintasan (null = super admin)
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}
```

---

## 🎨 UI Components Used

Menggunakan Lucide React icons:
- `User` - Icon user
- `Mail` - Icon email
- `Lock` - Icon password
- `Upload` - Icon upload
- `Pencil` - Icon edit
- `Trash2` - Icon delete
- `Shield` - Icon role/permission
- `MapPin` - Icon lokasi
- `Calendar` - Icon tanggal
- `LogOut` - Icon logout
- `CheckCircle` - Icon success
- `AlertCircle` - Icon error
- `Eye` / `EyeOff` - Icon show/hide password
- `Loader2` - Icon loading

---

## 📋 Checklist Setup

- [ ] Database Supabase sudah setup dengan table `profiles`
- [ ] Storage bucket `avatars` sudah dibuat di Supabase
- [ ] Backend API endpoints sudah siap (`/api/admin/users`, `DELETE /api/admin/users/:id`)
- [ ] Frontend sudah ter-install semua dependencies
- [ ] Environment variables sudah diset (`.env.local`)
- [ ] Pages sudah terintegrasi dengan sidebar

---

## 🐛 Troubleshooting

### Avatar tidak bisa diupload
- Pastikan bucket `avatars` sudah dibuat di Supabase Storage
- Pastikan RLS policy sudah diset untuk allow upload

### Password change tidak bekerja
- Pastikan Supabase Auth sudah enable
- Cek apakah password lama yang di-input benar

### User tidak muncul di daftar
- Refresh halaman atau coba logout-login kembali
- Cek apakah user sudah di-create di database dengan benar

---

## 📞 Support

Untuk pertanyaan atau issue, hubungi team development.

---

**Last Updated:** May 13, 2026  
**Version:** 2.4.0
