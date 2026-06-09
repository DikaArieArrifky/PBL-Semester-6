import { CheckCircle, XCircle } from 'lucide-react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
}

export function Toast({ message, type }: ToastProps) {
  return (
    <div className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl border font-bold shadow-2xl transition-all z-[100] flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
      type === 'success' 
        ? 'bg-[#0f172a] border-emerald-500/50 text-emerald-400 shadow-emerald-500/20' 
        : 'bg-[#0f172a] border-red-500/50 text-red-400 shadow-red-500/20'
    }`}>
      {type === 'success' ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
      {message}
    </div>
  );
}
