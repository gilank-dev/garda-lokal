'use client';

import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  Phone,
  Copy,
  Check,
  X,
  ShieldAlert,
  Flame,
  HeartPulse,
  Radio,
  ExternalLink,
  Info,
} from 'lucide-react';
import { playTacticalClick, playWarningTone } from '@/lib/audio-feedback';
import { useToast } from './Toast';

export interface HotlineEntry {
  number: string;
  name: string;
  agency: string;
  description: string;
  color: string;
  border: string;
  badgeBg: string;
  icon: React.ElementType;
}

export const EMERGENCY_HOTLINES: HotlineEntry[] = [
  {
    number: '110',
    name: 'Kepolisian Negara RI',
    agency: 'POLRI (Polsek / Polres)',
    description: 'Bentrokan massa, tawuran sajam, premanisme, tindak pidana kekerasan aktif.',
    color: 'text-red-400',
    border: 'border-red-600/70',
    badgeBg: 'bg-red-950/80',
    icon: ShieldAlert,
  },
  {
    number: '118',
    name: 'Ambulans Gawat Darurat',
    agency: 'IGD & Medis Darurat',
    description: 'Korban luka berat, pendarahan, trauma fisik, henti jantung, evakuasi medis.',
    color: 'text-amber-400',
    border: 'border-amber-600/70',
    badgeBg: 'bg-amber-950/80',
    icon: HeartPulse,
  },
  {
    number: '113',
    name: 'Pemadam Kebakaran',
    agency: 'Damkar & Penyelamatan',
    description: 'Ledakan molotov, kebakaran rumah/kendaraan, evakuasi reruntuhan & gas beracun.',
    color: 'text-orange-400',
    border: 'border-orange-600/70',
    badgeBg: 'bg-orange-950/80',
    icon: Flame,
  },
  {
    number: '119',
    name: 'Siaga Bencana & Krisis Kesehatan',
    agency: 'SPGDT / Kemenkes RI',
    description: 'Layanan terpadu siaga bencana nasional dan koordinasi fasilitas rujukan kesehatan.',
    color: 'text-blue-400',
    border: 'border-blue-600/70',
    badgeBg: 'bg-blue-950/80',
    icon: Radio,
  },
  {
    number: '112',
    name: 'Layanan Darurat Nasional (NTPD)',
    agency: 'Panggilan Bebas Pulsa Nasional',
    description: 'Sentra respon cepat tunggal pemerintah daerah untuk segala situasi darurat.',
    color: 'text-emerald-400',
    border: 'border-emerald-600/70',
    badgeBg: 'bg-emerald-950/80',
    icon: PhoneCall,
  },
];

interface EmergencyHotlineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmergencyHotlineModal({ isOpen, onClose }: EmergencyHotlineModalProps) {
  const { success } = useToast();
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = (num: string, agency: string) => {
    playTacticalClick();
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    success(`Nomor darurat ${agency} (${num}) berhasil disalin ke papan klip.`, 'DISALIN');
    setTimeout(() => {
      setCopiedNumber(null);
    }, 2500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hotline-modal-title"
      className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Tactical Header */}
        <div className="p-4 border-b border-[#1F2937] flex items-center justify-between bg-[#0B0F17]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-red-950/80 border border-red-700 flex items-center justify-center text-red-400 shrink-0">
              <PhoneCall className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2
                id="hotline-modal-title"
                className="text-sm font-bold font-mono tracking-wider text-white uppercase"
              >
                SPEED-DIAL HOTLINE DARURAT NASIONAL
              </h2>
              <p className="text-[11px] text-zinc-400">
                Panggilan darurat instan langsung ke instansi resmi berwenang
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              playTacticalClick();
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-2 rounded-lg bg-surface-elevated border border-border min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            aria-label="Tutup jendela hotline darurat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hotlines List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {EMERGENCY_HOTLINES.map((hotline) => {
            const Icon = hotline.icon;
            const isCopied = copiedNumber === hotline.number;

            return (
              <div
                key={hotline.number}
                className={`p-3.5 bg-[#0B0F17] border ${hotline.border} rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-tactical transition-all`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded ${hotline.badgeBg} border ${hotline.border} flex items-center justify-center ${hotline.color} shrink-0 mt-0.5`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold font-mono text-white tracking-wider">
                        {hotline.number}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {hotline.name}
                      </span>
                      <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded border border-zinc-700">
                        {hotline.agency}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug mt-1">
                      {hotline.description}
                    </p>
                  </div>
                </div>

                {/* Tactical Actions (Min 44x44px Touch Targets) */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => handleCopy(hotline.number, hotline.agency)}
                    className="min-h-[44px] px-3 rounded bg-[#182234] hover:bg-[#1F2937] border border-[#1F2937] text-zinc-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-colors"
                    title={`Salin nomor ${hotline.number}`}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{isCopied ? 'Tersalin' : 'Salin'}</span>
                  </button>

                  <a
                    href={`tel:${hotline.number}`}
                    onClick={() => playTacticalClick()}
                    className="min-h-[44px] px-4 rounded bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-mono text-xs font-bold flex items-center gap-2 border border-red-500 shadow-md shadow-red-950/60 transition-transform active:scale-95"
                  >
                    <Phone className="w-4 h-4" />
                    <span>PANGGIL SEKARANG</span>
                  </a>
                </div>
              </div>
            );
          })}

          {/* Tactical Advisory Notice */}
          <div className="p-3 bg-[#0B0F17]/70 border border-[#1F2937] rounded-lg flex items-start space-x-2.5 text-xs text-zinc-400 mt-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-white">Panduan Berbicara di Telepon Darurat: </span>
              Tarik napas, tetap tenang, sebutkan patokan lokasi spesifik (contoh: persimpangan, gang samping mini market),
              serta jumlah massa atau kondisi korban secara lugas. Jangan menghampiri sumber bahaya.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0B0F17] border-t border-[#1F2937] flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>GARDA-LOKAL INDONESIA</span>
          <button
            onClick={() => {
              playTacticalClick();
              onClose();
            }}
            className="text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-surface border border-border"
          >
            Tutup Dialog
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Floating Emergency Speed-Dial Trigger Button
 * Mobile-first, fixed on lower-right or header
 */
export function EmergencyFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          playWarningTone();
          setIsOpen(true);
        }}
        aria-label="Buka speed-dial panggilan darurat (110/118/113/119)"
        className="fixed bottom-6 right-4 sm:bottom-8 sm:right-8 z-40 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-3.5 rounded-full shadow-2xl border-2 border-red-400 flex items-center justify-center min-w-[52px] min-h-[52px] transition-transform hover:scale-105 active:scale-95 animate-radar-urgent group"
        title="SOS Speed-Dial Darurat Resmi (110/118/113)"
      >
        <PhoneCall className="w-6 h-6 animate-pulse" />
        <span className="sr-only">Hotline Darurat</span>
        <span className="hidden md:inline-block font-mono font-bold text-xs ml-2 pr-1 uppercase tracking-wider">
          SOS HOTLINE
        </span>
      </button>

      <EmergencyHotlineModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
