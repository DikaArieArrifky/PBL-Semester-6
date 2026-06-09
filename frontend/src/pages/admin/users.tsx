"use client";
import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, X, Save, Loader2, AlertCircle, ShieldCheck, } from "lucide-react";
import { withAuth } from "@/components/ui/withAuth";
import supabase from "@/lib/supabase";
import supabaseAdmin from "@/lib/supabaseAdmin";
import type { Profile, Crossing } from "@/lib/types";
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Toast } from '@/components/ui/Toast';
import { SideDrawer } from '@/components/ui/SideDrawer';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";



function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "Staff",
    cross_id: "",
  });

  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Profile | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    userData?: { name?: string; email?: string; role?: string; crossing_name?: string };
    verificationText?: string;
    verificationInputValue?: string;
    onVerificationChange?: (value: string) => void;
    onConfirm?: () => void | Promise<void>;
  }>({ open: false });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [deleteVerificationText, setDeleteVerificationText] = useState("");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchData() {
    setLoading(true);

    const [{ data: profiles }, { data: cross }] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("crossings")
        .select("*")
        .eq("status", "active")
        .order("name"),
    ]);

    setUsers(profiles || []);
    setCrossings(cross || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openAdd() {
    setForm({
      email: "",
      name: "",
      password: "",
      role: "Staff",
      cross_id: "",
    });
    setError("");
    setShowModal(true);
  }

  function openEdit(user: Profile) {
    setEditForm(user);
    setEditError("");
    setEditModal(true);
  }

  function handleSave() {
    if (!form.email || !form.name || !form.password) {
      setError("Semua field wajib diisi.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("Format email tidak valid.");
      return;
    }

    // Password validation
    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setConfirmState({
      open: true,
      title: 'Konfirmasi Penyimpanan',
      message: 'Apakah Anda yakin ingin menambahkan user ini?',
      confirmLabel: 'Tambah User',
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        await performSave();
      },
    });
  }

  async function performSave() {
    setSaving(true);
    setError("");

    try {
      console.log('Creating user via backend API with service role key:', { email: form.email, name: form.name, role: form.role, cross_id: form.cross_id });

      // Use backend API with service role key
      const res = await fetch(`${BACKEND_URL}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email,
          name: form.name,
          password: form.password,
          role: form.role,
          cross_id: form.cross_id
        }),
      });

      const json = await res.json();
      console.log('Backend API response:', { status: res.status, data: json });

      if (!res.ok) {
        throw new Error(json.error || `Backend error (status: ${res.status})`);
      }

      console.log('User created successfully via service role key');

      // Refresh data to show the new user
      await fetchData();
      setShowModal(false);

      // Reset form
      setForm({
        email: "",
        name: "",
        password: "",
        role: "Staff",
        cross_id: "",
      });

      showToast(`User ${form.name} berhasil ditambahkan!`, 'success');

    } catch (err: any) {
      console.error('Create user error:', err);

      // If backend fails, provide clear manual instructions with debug info
      setError(`❌ Service Role Key Error: ${err.message}

🔧 Debug Info:
- Backend URL: ${BACKEND_URL}
- Error: ${err.message}

💡 Solusi:
1. Pastikan backend .env memiliki:
   - NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

2. Restart backend setelah update .env

3. Atau gunakan manual creation:
   - Buka Supabase Dashboard → Authentication → Users
   - Add user dengan data di atas
   - Refresh halaman ini`);
    } finally {
      setSaving(false);
    }
  }

  // Helper function to create profile manually
  async function createProfileManually(userId: string) {
    try {
      console.log('Creating profile manually for user:', userId);

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: form.email.toLowerCase(),
          name: form.name.trim(),
          role: form.role === 'staff' ? 'Staff' : 'Admin',
          cross_id: form.cross_id || null
        }]);

      if (profileError) {
        console.error('Manual profile creation failed:', profileError);
        // Don't throw error, user is still created
        console.warn('User created but profile creation failed');
      } else {
        console.log('Profile created successfully');
      }
    } catch (error) {
      console.error('Error in createProfileManually:', error);
    }
  }

  async function handleEdit() {
    if (!editForm) return;

    if (!editForm.name?.trim()) {
      setEditError("Nama wajib diisi.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      // Normalkan role agar selalu berawalan kapital (Admin / Staff) sesuai database constraint
      const normalizedRole = editForm.role.toLowerCase() === 'staff' ? 'Staff' : 'Admin';

      const res = await fetch(`${BACKEND_URL}/api/admin/users/${editForm.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name.trim(),
          role: normalizedRole,
          cross_id: normalizedRole === "Staff" ? editForm.cross_id || null : null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Gagal mengupdate user");
      }

      await fetchData();
      setEditModal(false);
      showToast("Pembaruan user berhasil disimpan!", "success");
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setEditError(
          "Tidak dapat terhubung ke server. Pastikan backend sudah berjalan."
        );
      } else {
        setEditError(err.message);
      }
    } finally {
      setEditSaving(false);
    }
  }

  function openEditConfirm() {
    if (!editForm) return;

    if (!editForm.name?.trim()) {
      setEditError("Nama wajib diisi.");
      return;
    }

    const normalizedRole = editForm.role.toLowerCase() === 'staff' ? 'Staff' : 'Admin';
    const crossingName = normalizedRole === 'Staff' ? getCrossingName(editForm.cross_id) : undefined;

    setConfirmState({
      open: true,
      title: 'Konfirmasi Perubahan',
      message: 'Simpan perubahan untuk user ini?',
      confirmLabel: 'Simpan',
      userData: {
        name: editForm.name,
        email: editForm.email,
        role: normalizedRole,
        crossing_name: crossingName,
      },
      loading: editSaving,
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, loading: true }));
        await handleEdit();
        setConfirmState((s) => ({ ...s, open: false, loading: false }));
      },
    });
  }

  async function handleDelete(userId: string) {
    const userToDelete = users.find((u) => u.id === userId);
    if (!userToDelete) return;

    const verificationPhrase = `Hapus ${userToDelete.email}`;

    setDeleteVerificationText("");
    setConfirmState({
      open: true,
      title: 'Hapus User',
      message: 'Tindakan ini tidak bisa dibatalkan. User akan dihapus permanen.',
      confirmLabel: 'Hapus',
      userData: {
        name: userToDelete.name,
        email: userToDelete.email,
        role: userToDelete.role,
        crossing_name: getCrossingName(userToDelete.cross_id),
      },
      verificationText: verificationPhrase,
      verificationInputValue: deleteVerificationText,
      onVerificationChange: (value) => setDeleteVerificationText(value),
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, loading: true }));
        setDeleting(userId);

        try {
          const res = await fetch(
            `${BACKEND_URL}/api/admin/users/${userId}`,
            {
              method: "DELETE",
            }
          );

          if (!res.ok) {
            const json = await res.json();
            throw new Error(json.error);
          }

          setUsers((prev) => prev.filter((u) => u.id !== userId));
          setConfirmState((s) => ({ ...s, open: false, loading: false }));
          showToast(`User ${userToDelete.email} berhasil dihapus!`);
        } catch (err: any) {
          if (err.message === "Failed to fetch") {
            alert(
              "Tidak dapat terhubung ke server. Pastikan backend sudah berjalan."
            );
          } else {
            alert(`Gagal hapus user: ${err.message}`);
          }
          setConfirmState((s) => ({ ...s, loading: false }));
        } finally {
          setDeleting(null);
        }
      },
    });
  }

  function getCrossingName(crossId: string | null) {
    if (!crossId) return "—";

    return (
      crossings.find((c) => c.cross_id === crossId)?.name ||
      crossId.slice(0, 8) + "..."
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800/50 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2 rounded-lg">
              <Users className="text-cyan-400 w-5 h-5" />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
                User <span className="text-cyan-400">Management</span>
              </h1>

              <p className="text-slate-500 text-sm mt-0.5">
                Kelola akun admin dan staff
              </p>
            </div>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all"
          >
            <Plus className="w-4 h-4" />
            Tambah User
          </button>
        </header>

        <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900/50">
                {[
                  "Nama",
                  "Email",
                  "Role",
                  "Perlintasan",
                  "Dibuat",
                  "Aksi",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left border-b border-slate-800 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3 bg-slate-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-slate-600"
                  >
                    Belum ada user
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-900/30 transition-colors"
                  >
                    <td className="px-6 py-4 max-w-[150px]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 shrink-0">
                          {user.name?.[0]?.toUpperCase() ?? "?"}
                        </div>

                        <p className="font-bold text-white text-sm truncate">
                          {user.name}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-400 max-w-[180px] truncate">
                      {user.email}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border flex items-center gap-1 w-fit ${user.role === "Admin"
                            ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                            : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                          }`}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />

                        {user.role === "Admin" ? "Admin" : "Staff"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-cyan-400/80 max-w-[150px] truncate">
                      {getCrossingName(user.cross_id)}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString("id-ID")}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={deleting === user.id}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                        >
                          {deleting === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SideDrawer
        isOpen={showModal}
        title="Tambah User Baru"
        onClose={() => setShowModal(false)}
        footer={
          <>
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-bold transition-all"
            >
              Batal
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {[
            {
              label: "Nama Lengkap *",
              key: "name",
              type: "text",
              placeholder: "John Doe",
            },

            {
              label: "Email *",
              key: "email",
              type: "email",
              placeholder: "john@example.com",
            },

            {
              label: "Password *",
              key: "password",
              type: "password",
              placeholder: "••••••••",
            },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                {f.label}
              </label>

              <input
                type={f.type}
                value={(form as any)[f.key]}
                placeholder={f.placeholder}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    [f.key]: e.target.value,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Role
            </label>

            <select
              value={form.role}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  role: e.target.value,
                }))
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="Staff">Staff</option>
              <option value="Admin">Super Admin</option>
            </select>
          </div>

          {form.role === "Staff" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Perlintasan (untuk Staff)
              </label>

              <select
                value={form.cross_id}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    cross_id: e.target.value,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              >
                <option value="">— Pilih Perlintasan —</option>

                {crossings.map((c) => (
                  <option key={c.cross_id} value={c.cross_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>
      </SideDrawer>

      {/* MODAL EDIT */}
      <SideDrawer
        isOpen={editModal && !!editForm}
        title="Edit User"
        onClose={() => setEditModal(false)}
        footer={
          <>
            <button
              onClick={() => setEditModal(false)}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-bold transition-all"
            >
              Batal
            </button>

            <button
              onClick={openEditConfirm}
              disabled={editSaving}
              className="flex-1 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {editSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" /> Simpan
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Nama Lengkap
            </label>

            <input
              type="text"
              value={editForm?.name ?? ""}
              onChange={(e) =>
                setEditForm((prev) =>
                  prev
                    ? {
                      ...prev,
                      name: e.target.value,
                    }
                    : prev
                )
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Role
            </label>

            <select
              value={editForm?.role}
              onChange={(e) =>
                setEditForm((prev) =>
                  prev
                    ? {
                      ...prev,
                      role: e.target.value as "Staff" | "Admin",
                    }
                    : prev
                )
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
            >
              <option value="Staff">Staff</option>
              <option value="Admin">Super Admin</option>
            </select>
          </div>

          {editForm?.role === "Staff" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Perlintasan
              </label>

              <select
                value={editForm?.cross_id || ""}
                onChange={(e) =>
                  setEditForm((prev) =>
                    prev
                      ? {
                        ...prev,
                        cross_id: e.target.value,
                      }
                      : prev
                  )
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              >
                <option value="">— Pilih Perlintasan —</option>

                {crossings.map((c) => (
                  <option key={c.cross_id} value={c.cross_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {editError && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {editError}
            </div>
          )}
        </div>
      </SideDrawer>
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        loading={confirmState.loading}
        userData={confirmState.userData}
        verificationText={confirmState.verificationText}
        verificationInputValue={confirmState.verificationInputValue}
        onVerificationChange={confirmState.onVerificationChange}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={() => {
          if (confirmState.onConfirm) {
            void confirmState.onConfirm();
          }
        }}
      />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}

export default withAuth(AdminUsers, {
  requiredRole: "Admin",
});