import { Trash2 } from 'lucide-react';
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: React.ReactNode;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  onConfirm,
  onCancel,
  icon = <Trash2 className="w-8 h-8 text-red-500" />
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200" onClick={onCancel}>
      <div className="bg-[#0a0f18] border border-slate-700 rounded-3xl w-full max-w-md p-6 md:p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6">
          {icon}
        </div>
        <h3 className="text-xl font-black text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 w-full">
          <button 
            onClick={onCancel}
            className="flex-1 py-3.5 px-4 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 py-3.5 px-4 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
