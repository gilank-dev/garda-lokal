'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, ShieldAlert, Volume2, VolumeX } from 'lucide-react';
import {
  playSuccessChime,
  playWarningTone,
  playEmergencySiren,
  playTacticalClick,
  isAudioMuted,
  setAudioMuted,
} from '@/lib/audio-feedback';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isMuted, setIsMutedState] = useState<boolean>(false);

  useEffect(() => {
    setIsMutedState(isAudioMuted());

    const handleAudioToggle = (e: any) => {
      setIsMutedState(Boolean(e.detail?.muted));
    };

    window.addEventListener('garda-audio-toggle', handleAudioToggle);
    return () => window.removeEventListener('garda-audio-toggle', handleAudioToggle);
  }, []);

  const toggleMute = useCallback(() => {
    const nextState = !isAudioMuted();
    setAudioMuted(nextState);
    setIsMutedState(nextState);
    if (!nextState) {
      playTacticalClick();
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-3), newToast]); // Keep max 4 toasts to prevent screen clutter

      // Play tactical audio based on type
      if (type === 'success') {
        playSuccessChime();
      } else if (type === 'error') {
        playEmergencySiren();
      } else if (type === 'warning') {
        playWarningTone();
      } else {
        playTacticalClick();
      }

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, title?: string) => {
      addToast({ type: 'success', title: title || 'BERHASIL', message });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string) => {
      addToast({ type: 'error', title: title || 'PERINGATAN', message });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string) => {
      addToast({ type: 'warning', title: title || 'PERHATIAN', message });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string) => {
      addToast({ type: 'info', title: title || 'INFORMASI', message });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
        isMuted,
        toggleMute,
      }}
    >
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[9999] pointer-events-none flex flex-col space-y-2"
      >
        {toasts.map((toast) => {
          const typeStyles = {
            success: 'border-emerald-600/80 bg-[#111827] text-emerald-400 shadow-emerald-950/40',
            error: 'border-red-600/90 bg-[#111827] text-red-400 shadow-red-950/50',
            warning: 'border-amber-600/80 bg-[#111827] text-amber-400 shadow-amber-950/40',
            info: 'border-blue-600/80 bg-[#111827] text-blue-400 shadow-blue-950/40',
          }[toast.type];

          const IconComponent = {
            success: CheckCircle2,
            error: ShieldAlert,
            warning: AlertTriangle,
            info: Info,
          }[toast.type];

          return (
            <div
              key={toast.id}
              role="alert"
              className={`pointer-events-auto border rounded-lg p-3.5 shadow-xl transition-all transform animate-in slide-in-from-top-2 duration-200 flex items-start gap-3 backdrop-blur-md ${typeStyles}`}
            >
              <div className="shrink-0 mt-0.5">
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4 className="text-[11px] font-mono font-bold tracking-wider uppercase text-white mb-0.5">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-zinc-200 leading-snug break-words font-sans">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => {
                  playTacticalClick();
                  removeToast(toast.id);
                }}
                className="shrink-0 text-zinc-400 hover:text-white p-1.5 -mr-1 -mt-1 rounded focus:outline-none focus:ring-1 focus:ring-zinc-600 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
