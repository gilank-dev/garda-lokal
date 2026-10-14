'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, AlertTriangle } from 'lucide-react';
import { playWarningTone, playSuccessChime } from '@/lib/audio-feedback';

export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showRestoredNotice, setShowRestoredNotice] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      setShowRestoredNotice(true);
      playSuccessChime();
      const timer = setTimeout(() => {
        setShowRestoredNotice(false);
      }, 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestoredNotice(false);
      playWarningTone();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showRestoredNotice) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="bg-amber-950/90 border-b border-amber-600/80 px-4 py-2 text-xs font-mono text-amber-200 flex items-center justify-between sticky top-0 z-[100] backdrop-blur-md shadow-md animate-in slide-in-from-top-1"
      >
        <div className="flex items-center space-x-2">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
          <span>
            <strong className="font-bold text-amber-300">KONEKSI TERPUTUS (OFFLINE): </strong>
            Data input Anda tetap aman di memori peramban lokal.
          </span>
        </div>
        <span className="text-[10px] bg-amber-900/60 border border-amber-700 px-2 py-0.5 rounded text-amber-300 shrink-0 ml-2">
          MODE LOKAL
        </span>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="bg-emerald-950/90 border-b border-emerald-600/80 px-4 py-2 text-xs font-mono text-emerald-200 flex items-center justify-between sticky top-0 z-[100] backdrop-blur-md shadow-md animate-in slide-in-from-top-1"
    >
      <div className="flex items-center space-x-2">
        <Wifi className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>KONEKSI PULIH - Jalur transmisi data taktis kembali aktif.</span>
      </div>
      <span className="text-[10px] bg-emerald-900/60 border border-emerald-700 px-2 py-0.5 rounded text-emerald-300 shrink-0 ml-2">
        ONLINE
      </span>
    </div>
  );
}
