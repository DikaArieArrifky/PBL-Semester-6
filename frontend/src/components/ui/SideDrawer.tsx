import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SideDrawer({ isOpen, onClose, title, subtitle, children, footer }: SideDrawerProps) {
  const [shouldRender, setShouldRender] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsClosing(false);
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300); // Matches duration-300
      return () => clearTimeout(timer);
    }
  }, [isOpen, shouldRender]);

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm duration-300 ${isClosing ? 'animate-out fade-out' : 'animate-in fade-in'}`}
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        className={`relative w-full max-w-md h-full bg-[#05070a]/70 backdrop-blur-2xl border-l border-white/10 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] flex flex-col duration-300 ${isClosing ? 'animate-out slide-out-to-right-8 fade-out' : 'animate-in slide-in-from-right-8 fade-in'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0 bg-white/5">
          <div className="flex-1 min-w-0">
            {typeof title === 'string' ? (
              <h3 className="text-xl font-black tracking-tight text-white drop-shadow-md">{title}</h3>
            ) : title}
            {subtitle && (
              <div className="text-slate-500 text-xs truncate mt-0.5">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 p-2 rounded-xl transition-all flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-4">
          <style>{`
            .custom-scrollbar {
              scrollbar-width: none;
              -ms-overflow-style: none;
            }
            .custom-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 p-6 border-t border-white/5 bg-white/5 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
