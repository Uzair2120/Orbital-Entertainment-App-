'use client';

import React, { useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'info' | 'error' | 'success';
}

interface ToastProviderProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

const ToastProvider: React.FC<ToastProviderProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex flex-col items-center justify-center p-4 gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
        >
          <div className="bg-surface/90 backdrop-blur-xl border border-white/10 px-8 py-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center min-w-[320px] max-w-[90vw] text-center border-b-accent/50 border-b-2">
            <div className="text-3xl mb-3">
              {toast.type === 'error' ? '❌' : toast.type === 'success' ? '✅' : '🔔'}
            </div>
            <p className="font-dm text-sm md:text-base text-text-custom leading-relaxed mb-4">
              {toast.message}
            </p>
            <button
              onClick={() => onRemove(toast.id)}
              className="bg-accent text-bg font-bebas text-sm tracking-widest px-6 py-2 rounded-full hover:bg-[#f5c85a] transition-all active:scale-95"
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastProvider;
