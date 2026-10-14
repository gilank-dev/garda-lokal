'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, KeyRound, Lock, ArrowLeft, AlertCircle, Radio } from 'lucide-react';
import { playTacticalClick, playWarningTone, playSuccessChime } from '@/lib/audio-feedback';
import { useToast } from '@/components/Toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const { error, success } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    playTacticalClick();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          accessCode: accessCode.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Autentikasi gagal');
      }

      playSuccessChime();
      success('Otorisasi berhasil. Membuka terminal komando...', 'TERVERIFIKASI');
      router.push('/admin/dashboard');
    } catch (err: any) {
      playWarningTone();
      setErrorMsg(err.message);
      error(err.message, 'AKSES DITOLAK');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background text-tactical-bright flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-1 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda Pelapor</span>
        </Link>

        {/* Tactical Command Banner */}
        <div className="border border-border bg-surface rounded-xl p-6 shadow-2xl space-y-5">
          <div className="text-center space-y-2 border-b border-border/80 pb-4">
            <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-700/80 text-red-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold font-mono tracking-wider text-white">
                PORTAL KOMANDO PETUGAS
              </h1>
              <p className="text-[11px] font-mono text-zinc-400">
                GARDA-LOKAL / PAI COMMAND CENTER
              </p>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-surface-elevated border border-border text-[10px] font-mono text-emerald-400">
              <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
              <span>TERMINAL PETUGAS TEROTORISASI</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-700/80 rounded text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-mono font-medium text-zinc-300">Email Petugas</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="petugas@garda-lokal.id"
                className="w-full bg-surface-elevated border border-border px-3 py-2 text-xs rounded text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-medium text-zinc-300">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-elevated border border-border px-3 py-2 text-xs rounded text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans"
              />
            </div>

            <div className="space-y-1 pt-1 border-t border-border/60">
              <label className="text-xs font-mono font-medium text-amber-300 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" />
                Kode Otorisasi Admin (Access Code)
              </label>
              <input
                type="password"
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Masukkan kode otorisasi rahasia"
                className="w-full bg-surface-elevated border border-amber-800/80 px-3 py-2 text-xs rounded text-amber-200 focus:outline-none focus:border-amber-500 placeholder:text-zinc-600 font-mono"
              />
              <p className="text-[10px] text-zinc-500 font-mono">
                Wajib untuk otentikasi berlapis komando lapangan.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-xs font-bold py-3 rounded-lg border border-red-500 disabled:border-zinc-700 transition-all uppercase tracking-wider shadow-lg shadow-red-950/40"
            >
              {isLoading ? 'Memverifikasi Akses...' : 'Masuk Terminal Komando'}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-border/60">
            <p className="text-[10px] text-zinc-600 font-mono leading-normal">
              Akses terbatas untuk aparatur penegak hukum & tim satgas resmi. Segala aktivitas login
              dan penelusuran data tercatat secara permanen.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
