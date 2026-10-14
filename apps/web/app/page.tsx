'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  PlusCircle,
  Clock,
  MapPin,
  MessageSquare,
  Lock,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Radio,
  FileText,
  AlertTriangle,
  UserCheck,
  Volume2,
  VolumeX,
  PhoneCall,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { getLocalTickets, updateLocalTicket } from '@/lib/storage';
import { LocalReportTicket, ReportMessage } from '@/lib/types';
import { formatDate, getCategoryBadge, getStatusBadge } from '@/lib/utils';
import {
  playTacticalClick,
  playSuccessChime,
  playWarningTone,
} from '@/lib/audio-feedback';
import { useToast } from '@/components/Toast';
import {
  EmergencyHotlineModal,
  EmergencyFloatingButton,
} from '@/components/EmergencyHotlineModal';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';

export default function ReporterHomePage() {
  const { success, warning, isMuted, toggleMute } = useToast();
  const [tickets, setTickets] = useState<LocalReportTicket[]>([]);
  const [activeTicket, setActiveTicket] = useState<LocalReportTicket | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHotlineOpen, setIsHotlineOpen] = useState(false);
  const [copiedTicketId, setCopiedTicketId] = useState<string | null>(null);

  // Load local tickets on mount
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsRefreshing(true);
    const local = getLocalTickets();
    setTickets(local);

    // Refresh statuses from server for each local ticket
    if (local.length > 0) {
      try {
        const updatedTickets = await Promise.all(
          local.map(async (t) => {
            try {
              const res = await fetch(`/api/reports/${t.id}`, {
                headers: { 'x-reporter-token': t.token },
              });
              if (res.ok) {
                const data = await res.json();
                if (data.report) {
                  const updated: LocalReportTicket = {
                    ...t,
                    status: data.report.status || t.status,
                    publicSummary: data.report.public_masked_summary || t.publicSummary,
                  };
                  updateLocalTicket(t.id, updated);
                  return updated;
                }
              }
            } catch (e) {
              console.warn('Sync failed for ticket', t.id);
            }
            return t;
          })
        );
        setTickets(updatedTickets);
      } catch (err) {
        console.error('Failed to sync tickets:', err);
      }
    }
    setIsRefreshing(false);
  };

  const openTicketDiscussion = async (ticket: LocalReportTicket) => {
    playTacticalClick();
    setActiveTicket(ticket);
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/reports/${ticket.id}/messages`, {
        headers: { 'x-reporter-token': ticket.token },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeTicket || !replyText.trim()) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/reports/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-reporter-token': activeTicket.token,
        },
        body: JSON.stringify({ messageText: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setReplyText('');
        playSuccessChime();
        success('Pesan tanggapan berhasil dikirim ke petugas piket.', 'TERKIRIM');
      } else {
        const err = await res.json();
        playWarningTone();
        warning(err.error || 'Gagal mengirim pesan', 'GAGAL');
      }
    } catch (e: any) {
      playWarningTone();
      warning('Terjadi kendala koneksi jaringan.', 'KONEKSI');
    } finally {
      setIsSendingReply(false);
    }
  };

  const copyTicketNumber = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playTacticalClick();
    navigator.clipboard.writeText(id);
    setCopiedTicketId(id);
    success(`Nomor tiket #${id.substring(0, 8)} berhasil disalin.`, 'DISALIN');
    setTimeout(() => setCopiedTicketId(null), 2500);
  };

  return (
    <>
      <NetworkStatusIndicator />
      <main className="min-h-screen bg-background text-tactical-bright px-4 py-5 max-w-md mx-auto flex flex-col justify-between pb-24">
        <div>
          {/* Tactical Header */}
          <header className="border-b border-border pb-4 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded bg-red-950/80 border border-red-700 flex items-center justify-center text-red-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-base font-bold tracking-wider font-mono text-white flex items-center gap-1.5">
                    GARDA-LOKAL
                    <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded border border-red-700/60">
                      PAI
                    </span>
                  </h1>
                  <p className="text-[11px] text-tactical-muted tracking-tight font-mono">
                    Komando & Pelaporan Insiden Cepat
                  </p>
                </div>
              </div>

              {/* Action Tools Header */}
              <div className="flex items-center space-x-2">
                {/* Audio Mute/Unmute Toggle */}
                <button
                  type="button"
                  onClick={toggleMute}
                  className={`p-2 rounded border text-xs font-mono flex items-center justify-center min-w-[40px] min-h-[40px] transition-colors ${
                    !isMuted
                      ? 'bg-surface border-border text-emerald-400 hover:text-white'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                  title={isMuted ? 'Nyalakan Audio Taktis' : 'Matikan Audio Taktis (Mute)'}
                  aria-label={isMuted ? 'Nyalakan Audio Taktis' : 'Matikan Audio Taktis (Mute)'}
                >
                  {!isMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <Link
                  href="/admin/login"
                  onClick={() => playTacticalClick()}
                  className="text-[11px] font-mono text-zinc-300 hover:text-white border border-border px-2.5 py-1.5 rounded bg-surface hover:bg-surface-hover transition-colors flex items-center gap-1 min-h-[40px]"
                >
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Petugas</span>
                </Link>
              </div>
            </div>

            {/* Status bar & Emergency Hotline Quick Bar */}
            <div className="mt-3 flex items-center justify-between text-[11px] bg-surface/70 border border-border/80 px-3 py-2 rounded">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-mono">
                <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-500" />
                <span>SIAGA NASIONAL</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTacticalClick();
                  setIsHotlineOpen(true);
                }}
                className="text-red-400 hover:text-red-300 font-mono font-bold flex items-center gap-1 text-[11px] min-h-[30px]"
              >
                <PhoneCall className="w-3 h-3 text-red-500" />
                <span>Hotline 110/118/113</span>
              </button>
            </div>
          </header>

          {/* Primary Action Button (Huge Tactical CTA) */}
          <section className="mb-6">
            <Link
              href="/report"
              onClick={() => playTacticalClick()}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold py-4 px-5 rounded-xl flex items-center justify-center space-x-3 shadow-xl shadow-red-950/60 border border-red-500 transition-all transform active:scale-[0.98] min-h-[56px]"
            >
              <PlusCircle className="w-6 h-6 shrink-0" />
              <span className="text-sm tracking-wide uppercase font-mono">
                + Buat Laporan Kejadian Baru
              </span>
            </Link>
            <p className="text-[11px] text-zinc-400 text-center mt-2 font-mono">
              Tanpa registrasi akun. Identitas disamarkan demi keselamatan Anda.
            </p>
          </section>

          {/* Security & Pseudonymity Assurance Banner */}
          <section className="mb-6 p-3 bg-surface border border-border rounded-lg">
            <div className="flex items-start space-x-2.5">
              <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-zinc-300 leading-relaxed">
                <span className="font-semibold text-white">Anonimitas Asimetris: </span>
                Nama Anda dan pihak terkait otomatis disamarkan di tampilan publik. Hanya petugas
                resmi berwenang yang menerima verifikasi utuh untuk tindak lanjut lapangan.
              </div>
            </div>
          </section>

          {/* My Reports History Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider font-mono text-zinc-200">
                  Riwayat Laporan Saya ({tickets.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTacticalClick();
                  loadTickets();
                }}
                disabled={isRefreshing}
                className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 transition-colors min-h-[36px] px-2"
                title="Sinkronisasi status terkini"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {tickets.length === 0 ? (
              <div className="border border-dashed border-border rounded-lg p-6 text-center bg-surface/30">
                <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-medium">Belum ada laporan yang Anda buat.</p>
                <p className="text-[11px] text-zinc-500 mt-1 leading-normal">
                  Setiap laporan yang Anda kirim akan otomatis tersimpan di peramban ini menggunakan token
                  kriptografi aman.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => {
                  const catBadge = getCategoryBadge(ticket.category);
                  const statBadge = getStatusBadge(ticket.status);
                  const isNeedInfo = ticket.status === 'BUTUH_INFO_PELAPOR';
                  const isCopied = copiedTicketId === ticket.id;

                  return (
                    <div
                      key={ticket.id}
                      onClick={() => openTicketDiscussion(ticket)}
                      className="p-3.5 bg-surface hover:bg-surface-hover border border-border hover:border-zinc-700 rounded-lg cursor-pointer transition-all space-y-2.5 shadow-tactical"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${catBadge.className}`}
                        >
                          {catBadge.label}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => copyTicketNumber(ticket.id, e)}
                            className="text-[10px] font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded border border-zinc-700 flex items-center gap-1"
                            title="Salin nomor tiket"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>#{ticket.id.substring(0, 6)}</span>
                          </button>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded ${statBadge.className}`}
                          >
                            {statBadge.label}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed">
                        {ticket.publicSummary || 'Laporan dalam proses penanganan.'}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-zinc-500 font-mono">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(ticket.createdAt)}</span>
                        </div>

                        <div className="flex items-center space-x-1.5 text-zinc-300 hover:text-white">
                          {isNeedInfo && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-600/40 px-1.5 py-0.5 rounded animate-pulse font-mono mr-1">
                              Pesan Petugas
                            </span>
                          )}
                          <Link
                            href={`/ticket/${ticket.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              playTacticalClick();
                            }}
                            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 mr-2 text-[10px]"
                          >
                            <span>Lembar Tiket</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <span>Diskusi</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-10 pt-4 border-t border-border/60 text-center text-[10px] font-mono text-zinc-600">
          GARDA-LOKAL INDONESIA &bull; PROTOKOL KEAMANAN TERVERIFIKASI
        </footer>

        {/* Two-Way Ticket Discussion Modal Drawer */}
        {activeTicket && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-surface border border-border rounded-t-xl sm:rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
              {/* Modal Header */}
              <div className="p-4 border-b border-border flex items-center justify-between bg-[#0B0F17]">
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        getCategoryBadge(activeTicket.category).className
                      }`}
                    >
                      {activeTicket.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        getStatusBadge(activeTicket.status).className
                      }`}
                    >
                      {getStatusBadge(activeTicket.status).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-[11px] font-mono text-zinc-400">
                      ID: #{activeTicket.id.substring(0, 12)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => copyTicketNumber(activeTicket.id, e)}
                      className="text-[10px] font-mono text-blue-400 hover:text-blue-300"
                    >
                      [Salin]
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playTacticalClick();
                    setActiveTicket(null);
                  }}
                  className="text-xs font-mono text-zinc-400 hover:text-white px-2.5 py-1.5 rounded bg-surface-elevated border border-border min-h-[40px] min-w-[40px] flex items-center justify-center"
                >
                  Tutup [X]
                </button>
              </div>

              {/* Public Summary Box */}
              <div className="p-3.5 bg-surface-elevated/40 border-b border-border text-xs text-zinc-300">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">
                  Ringkasan Disamarkan (Publik):
                </span>
                <p className="leading-relaxed">{activeTicket.publicSummary}</p>
                <div className="mt-2 pt-2 border-t border-border/40 flex justify-end">
                  <Link
                    href={`/ticket/${activeTicket.id}`}
                    onClick={() => playTacticalClick()}
                    className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>Buka Lembar Lengkap Tiket Mandiri</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[220px]">
                <div className="text-center">
                  <span className="text-[10px] font-mono bg-surface-elevated px-2 py-1 rounded text-zinc-400 border border-border">
                    Jalur Komunikasi Langsung Petugas Lapangan
                  </span>
                </div>

                {isLoadingMessages ? (
                  <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                    Memuat percakapan tiket...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs font-mono leading-relaxed">
                    Belum ada pesan tambahan. Jika petugas memerlukan klarifikasi, pertanyaan akan
                    tampil di sini.
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
                          <span>{isAdmin ? 'PETUGAS PIKET' : 'ANDA (PELAPOR)'}</span>
                          <span>&bull;</span>
                          <span>{formatDate(m.created_at)}</span>
                        </div>
                        <div
                          className={`p-3 rounded-lg max-w-[85%] text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-blue-950/70 border border-blue-700/60 text-blue-100'
                              : 'bg-zinc-800 border border-zinc-700 text-zinc-100'
                          }`}
                        >
                          {m.message_text}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Input Box */}
              <div className="p-3 border-t border-border bg-surface-elevated flex items-center space-x-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                  placeholder="Balas pesan petugas lapangan..."
                  className="flex-1 bg-surface border border-border px-3 py-2 text-xs rounded text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={isSendingReply || !replyText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono text-xs px-4 py-2 rounded-lg border border-blue-500 disabled:border-zinc-700 transition-colors shrink-0 min-h-[44px] flex items-center justify-center font-bold"
                >
                  {isSendingReply ? '...' : 'Kirim'}
                </button>
              </div>
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
