"use client";

import { useState, useEffect } from "react";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

import { withAuth } from "../../components/ui/withAuth";
import supabase from "../../lib/supabase";
import type { Crossing } from "../../lib/types";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0a0f18] border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">{title}</h3>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const EMPTY: Partial<Crossing> = {
  code: "",
  name: "",
  location: "",
  latitude: 0,
  longitude: 0,
  status: "active",
};

function AdminCrossings() {
  const [crossings, setCrossings] = useState<Crossing[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);

  const [form, setForm] = useState<Partial<Crossing>>(EMPTY);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
    onConfirm?: () => void | Promise<void>;
  }>({ open: false });

  async function fetchCrossings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("crossings")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) {
      setCrossings(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchCrossings();
  }, []);

  function openAdd() {
    setForm(EMPTY);
    setError("");
    setModal("add");
  }

  function openEdit(c: Crossing) {
    setForm(c);
    setError("");
    setModal("edit");
  }

  async function handleSave() {
    if (!form.code?.trim()) {
      setError("Kode perlintasan wajib diisi.");
      return;
    }

    if (!form.name?.trim()) {
      setError("Nama perlintasan wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    if (modal === "add") {
      const { error } = await supabase.from("crossings").insert([
        {
          code: form.code,
          name: form.name,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          status: form.status,
        },
      ]);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from("crossings")
        .update({
          code: form.code,
          name: form.name,
          location: form.location,
          latitude: form.latitude,
          longitude: form.longitude,
          status: form.status,
        })
        .eq("cross_id", form.cross_id);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    await fetchCrossings();

    setModal(null);

    setSaving(false);
  }

  async function handleDelete(id: string) {
    setConfirmState({
      open: true,
      title: 'Hapus perlintasan',
      message: 'Hapus perlintasan ini? Semua data terkait akan ikut terhapus.',
      confirmLabel: 'Hapus',
      onConfirm: async () => {
        setConfirmState((s) => ({ ...s, open: false }));
        setDeleting(id);

        const { error } = await supabase
          .from("crossings")
          .delete()
          .eq("cross_id", id);

        if (!error) {
          setCrossings((prev) => prev.filter((c) => c.cross_id !== id));
        }

        setDeleting(null);
      },
    });
  }

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-200 p-10 space-y-8">
      <header className="flex items-center justify-between border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/10 p-2 rounded-lg">
            <MapPin className="text-cyan-400 w-5 h-5" />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">
              Manage <span className="text-cyan-400">Crossings</span>
            </h1>

            <p className="text-slate-500 text-sm mt-0.5">
              CRUD data lokasi perlintasan kereta
            </p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Crossing
        </button>
      </header>

      <div className="bg-[#0a0f18] border border-slate-800 rounded-3xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50">
              {[
                "Code",
                "Name",
                "Location",
                "Coordinates",
                "Status",
                "Created",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-left border-b border-slate-800"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/50">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 bg-slate-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : crossings.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-16 text-center text-slate-600"
                >
                  Belum ada data perlintasan
                </td>
              </tr>
            ) : (
              crossings.map((c) => (
                <tr
                  key={c.cross_id}
                  className="hover:bg-slate-900/30 transition-colors"
                >
                  <td className="px-6 py-4 text-cyan-400 font-mono font-bold">
                    {c.code}
                  </td>

                  <td className="px-6 py-4 font-bold text-white">
                    {c.name}
                  </td>

                  <td className="px-6 py-4 text-sm text-slate-400 max-w-[200px] truncate">
                    {c.location || "—"}
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {c.latitude ?? "—"}, {c.longitude ?? "—"}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${
                        c.status === "active"
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                          : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleDateString("id-ID")}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(c.cross_id)}
                        disabled={deleting === c.cross_id}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all disabled:opacity-50"
                      >
                        {deleting === c.cross_id ? (
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

      {modal && (
        <Modal
          title={
            modal === "add"
              ? "Tambah Perlintasan"
              : "Edit Perlintasan"
          }
          onClose={() => setModal(null)}
        >
          <div className="space-y-4">
            {[
              {
                label: "Kode Perlintasan *",
                key: "code",
                type: "text",
              },
              {
                label: "Nama Perlintasan *",
                key: "name",
                type: "text",
              },
              {
                label: "Lokasi / Alamat",
                key: "location",
                type: "text",
              },
              {
                label: "Latitude",
                key: "latitude",
                type: "number",
              },
              {
                label: "Longitude",
                key: "longitude",
                type: "number",
              },
            ].map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {f.label}
                </label>

                <input
                  type={f.type}
                  value={(form as any)[f.key] ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      [f.key]:
                        f.type === "number"
                          ? parseFloat(e.target.value) || 0
                          : e.target.value,
                    }))
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Status
              </label>

              <select
                value={form.status || "active"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as any,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-all"
              >
                Batal
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}

                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        cancelLabel={confirmState.cancelLabel}
        loading={confirmState.loading}
        onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
        onConfirm={() => {
          if (confirmState.onConfirm) {
            void confirmState.onConfirm();
          }
        }}
      />
    </div>
  );
}

export default withAuth(AdminCrossings, {
  requiredRole: "Admin",
});