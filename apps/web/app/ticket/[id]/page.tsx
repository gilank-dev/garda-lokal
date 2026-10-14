'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock,
  ShieldCheck,
  Send,
  MessageSquare,
  Copy,
  Check,
  Download,
  Share2,
  Bookmark,
  Radio,
  MapPin,
  RefreshCw,
  PhoneCall,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Report, ReportMessage } from '@/lib/types';
import { formatDate, getCategoryBadge, getStatusBadge, getTemporalBadge, formatCoordinates } from '@/lib/utils';
import { getLocalTickets } from '@/lib/storage';
import { playTacticalClick, playSuccessChime, playWarningTone } from '@/lib/audio-feedback';
import { useToast } from '@/components/Toast';
import { EmergencyFloatingButton, EmergencyHotlineModal } from '@/components/EmergencyHotlineModal';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';

const QUICK_REPLIES = [
  'Saya sudah berada di tempat aman.',
  'Massa bertambah di sekitar lokasi.',
  'Petugas patroli sudah tiba di lokasi.',
  'Situasi di lapangan mulai mereda.',
];

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const reportId = params.id;
  const { success, warning } = useToast();

  const [report, setReport] = useState<Report | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [reporterToken, setReporterToken] = useState<string | null>(null);
  const [copiedTicket, setCopiedTicket] = useState(false);
  const [isPwaModalOpen, setIsPwaModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Catch PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Find local ticket to get token
      const local = getLocalTickets();
      const matched = local.find((t) => t.id === reportId);
      const token = matched?.token || null;
      setReporterToken(token);

      const headers: Record<string, string> = {};
      if (token) headers['x-reporter-token'] = token;

      const res = await fetch(`/api/reports/${reportId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
      }

      const msgRes = await fetch(`/api/reports/${reportId}/messages`, { headers });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const incomingMessages: ReportMessage[] = msgData.messages || [];
        setMessages(incomingMessages);
      }
    } catch (e) {
      console.error('Failed to load ticket:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Poll for replies every 8 seconds
    const interval = setInterval(() => {
      loadData(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [reportId]);

  const handleCopyTicket = () => {
    playTacticalClick();
    navigator.clipboard.writeText(reportId);
    setCopiedTicket(true);
    success(`Nomor tiket #${reportId} berhasil disalin ke papan klip.`, 'DISALIN');
    setTimeout(() => setCopiedTicket(false), 2500);
  };

  const handleInstallPwa = async () => {
    playTacticalClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        success('Aplikasi GARDA-LOKAL berhasil ditambahkan ke Layar Utama!', 'PWA TERPASANG');
      }
      setDeferredPrompt(null);
    } else {
      setIsPwaModalOpen(true);
    }
  };

  const handleQuickReply = (text: string) => {
    playTacticalClick();
    setReplyText(text);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim()) return;

    setIsSending(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (reporterToken) headers['x-reporter-token'] = reporterToken;

      const res = await fetch(`/api/reports/${reportId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ messageText: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReplyText('');
        playSuccessChime();
        success('Pesan Anda telah diteruskan ke petugas.', 'TERKIRIM');
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        const err = await res.json();
        playWarningTone();
        warning(err.error || 'Gagal mengirim pesan', 'GAGAL');
      }
    } catch (e: any) {
      playWarningTone();
      warning('Terjadi gangguan transmisi koneksi.', 'KONEKSI');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background text-tactical-bright p-6 max-w-md mx-auto font-mono text-xs text-zinc-500 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
          <span>Memuat status lembar tiket mandiri...</span>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-background text-tactical-bright p-6 max-w-md mx-auto space-y-4">
        <Link
          href="/"
          className="text-xs font-mono text-zinc-400 hover:text-white flex items-center gap-1 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
        <div className="p-6 text-center text-zinc-400 font-mono text-xs border border-border bg-surface rounded-xl">
          Tiket #{reportId} tidak ditemukan atau masa berlaku telah berakhir.
        </div>
      </main>
    );
  }

  return (
    <>
      <NetworkStatusIndicator />
      <main className="min-h-screen bg-background text-tactical-bright px-4 py-5 max-w-md mx-auto flex flex-col justify-between pb-24">
        <div className="space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-border pb-3">
            <Link
              href="/"
              onClick={() => playTacticalClick()}
              className="flex items-center space-x-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors min-h-[44px] pr-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Beranda</span>
            </Link>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  playTacticalClick();
                  loadData(true);
                }}
                disabled={isRefreshing}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1 border border-border bg-surface px-2.5 py-1.5 rounded min-h-[36px]"
                title="Perbarui percakapan"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playTacticalClick();
                  setIsHotlineOpen(true);
                }}
                className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 border border-red-900/60 bg-red-950/40 px-2.5 py-1.5 rounded min-h-[36px]"
              >
                <PhoneCall className="w-3 h-3" />
                <span>110</span>
              </button>
            </div>
          </div>

          {/* Ticket Header Card */}
          <div className="p-4 bg-surface border border-border rounded-xl space-y-3.5 shadow-tactical">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    getCategoryBadge(report.category).className
                  }`}
                >
                  {getCategoryBadge(report.category).label}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    getStatusBadge(report.status).className
                  }`}
                >
                  {getStatusBadge(report.status).label}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    getTemporalBadge(report.temporal_context).className
                  }`}
                >
                  {getTemporalBadge(report.temporal_context).label}
                </span>
              </div>

              <div className="text-[11px] font-mono text-zinc-400">
                Skor: <span className="font-bold text-white">{report.urgency_score}/100</span>
              </div>
            </div>

            {/* Ticket ID & Copy Action Button */}
            <div className="p-2.5 bg-surface-elevated border border-border rounded-lg flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block">
                  Nomor Tiket Kriptografi:
                </span>
                <span className="text-xs font-mono font-bold text-white truncate block">
                  #{report.id}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyTicket}
                className="min-h-[40px] px-3 rounded bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-zinc-200 text-xs font-mono flex items-center gap-1.5 border border-zinc-600 transition-colors shrink-0"
              >
                {copiedTicket ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedTicket ? 'Tersalin' : 'Salin Tiket'}</span>
              </button>
            </div>

            {/* Public Masked Summary */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block">
                Ringkasan Penyamaran Publik:
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed font-sans">
                {report.public_masked_summary || 'Laporan dalam proses verifikasi tim taktis.'}
              </p>
            </div>

            {/* Location & Time Footer */}
            <div className="pt-2 border-t border-border/40 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 font-mono gap-2">
              <div className="flex items-center space-x-1 text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span>
                  {report.address_city || report.address_district || 'Wilayah Terlapor'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDate(report.created_at)}</span>
              </div>
            </div>

            {/* PWA Bookmark Button */}
            <button
              type="button"
              onClick={handleInstallPwa}
              className="w-full bg-surface-hover hover:bg-zinc-800 border border-border hover:border-zinc-600 text-zinc-300 font-mono text-xs py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition-colors min-h-[44px]"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Simpan Tiket ke Layar Utama (PWA)</span>
            </button>
          </div>

          {/* Two-Way Chat Thread to Duty Officer */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3.5 shadow-tactical">
            <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                <h2 className="text-xs font-bold font-mono uppercase text-white">
                  Jalur Komunikasi Langsung Petugas Lapangan
                </h2>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                ENKRIPSI AKTIF
              </span>
            </div>

            {/* Message bubbles */}
            <div className="max-h-80 overflow-y-auto space-y-3 pr-1 min-h-[160px]">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs font-mono leading-relaxed space-y-1">
                  <p>Belum ada pesan klarifikasi dari petugas piket.</p>
                  <p className="text-[10px] text-zinc-600">
                    Gunakan tombol respon cepat di bawah jika situasi di sekitar Anda berubah.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isAdmin = m.sender_role === 'ADMIN';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center space-x-1 text-[10px] text-zinc-500 font-mono mb-1">
                        <span>{isAdmin ? 'PETUGAS PIKET KOMANDO' : 'ANDA (PELAPOR)'}</span>
                        <span>&bull;</span>
                        <span>{formatDate(m.created_at)}</span>
                      </div>
                      <div
                        className={`p-3 rounded-xl max-w-[88%] text-xs leading-relaxed shadow-sm ${
                          isAdmin
                            ? 'bg-blue-950/80 border border-blue-700/70 text-blue-100 rounded-tl-none'
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-tr-none'
                        }`}
                      >
                        {m.message_text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Response Buttons */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <span className="text-[10px] font-mono text-zinc-500 block">
                Respon Cepat Situasi Lapangan:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REPLIES.map((reply, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickReply(reply)}
                    className="text-[11px] font-mono bg-surface-elevated hover:bg-zinc-700 border border-border text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-lg transition-colors min-h-[36px]"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendMessage} className="pt-2 border-t border-border/60 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis informasi tambahan untuk petugas..."
                className="flex-1 bg-surface-elevated border border-border px-3 py-2 text-xs rounded-lg text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans min-h-[44px]"
              />
              <button
                type="submit"
                disabled={isSending || !replyText.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-xs font-bold px-4 py-2 rounded-lg border border-blue-500 disabled:border-zinc-700 transition-colors shrink-0 min-h-[44px] flex items-center justify-center"
              >
                {isSending ? '...' : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        <footer className="mt-8 text-center text-[10px] font-mono text-zinc-600">
          GARDA-LOKAL &bull; TIKET ANONIMITAS ASIMETRIS KEMENTERIAN / POLRI
        </footer>

        {/* PWA Instruction Modal */}
        {isPwaModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
              <div className="flex items-center space-x-2 text-emerald-400 font-mono text-xs font-bold">
                <Bookmark className="w-4 h-4" />
                <span>CARA MENYIMPAN KE LAYAR UTAMA (PWA)</span>
              </div>
              <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
                <p>
                  <strong>Android (Chrome):</strong> Tekan tombol menu titik tiga (⋮) di pojok kanan atas, lalu pilih <strong>&quot;Tambahkan ke Layar Utama&quot;</strong> atau <strong>&quot;Instal Aplikasi&quot;</strong>.
                </p>
                <p>
                  <strong>iOS (Safari):</strong> Tekan tombol <strong>Bagikan (Share / kotak bertanda panah ke atas)</strong> di bilah navigasi bawah, lalu pilih <strong>&quot;Add to Home Screen&quot; (+)</strong>.
                </p>
                <p className="text-[11px] text-zinc-500">
                  Tiket dan riwayat laporan Anda akan dapat diakses kapan saja meski layar tertutup.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTacticalClick();
                  setIsPwaModalOpen(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold py-2.5 rounded-lg border border-blue-500 uppercase"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        )}

        {/* Emergency Speed Dial Modal */}
        <EmergencyHotlineModal
          isOpen={isHotlineOpen}
          onClose={() => setIsHotlineOpen(false)}
        />

        {/* Floating Emergency SOS Button */}
        <EmergencyFloatingButton />
      </main>
    </>
  );
}
