'use client';

import React from 'react';
import {
  FileText,
  Printer,
  X,
  ShieldAlert,
  MapPin,
  Clock,
  Camera,
  CheckCircle2,
  Lock,
  Download,
} from 'lucide-react';
import { Report, ReportForensics } from '@/lib/types';
import { formatDate, formatCoordinates, formatDistance } from '@/lib/utils';
import { playTacticalClick } from '@/lib/audio-feedback';

interface TacticalDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: Report;
  forensics?: ReportForensics | null;
}

export function TacticalDossierModal({
  isOpen,
  onClose,
  report,
  forensics,
}: TacticalDossierModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    playTacticalClick();
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dossier-title"
      className="fixed inset-0 z-[9990] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:fixed print:inset-0"
    >
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl w-full max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden print:max-h-none print:max-w-none print:w-full print:border-none print:rounded-none print:bg-white print:text-black">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-3.5 border-b border-[#1F2937] flex items-center justify-between bg-[#0B0F17] print:hidden">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h2 id="dossier-title" className="text-xs font-bold font-mono text-white uppercase tracking-wider">
              BERITA ACARA &amp; DOSSIER INTELIJEN TAKTIS
            </h2>
            <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">
              SIAP CETAK / PDF
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-mono text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 border border-emerald-500 shadow min-h-[40px]"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playTacticalClick();
                onClose();
              }}
              className="text-zinc-400 hover:text-white p-2 rounded-lg bg-surface border border-border min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Document Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-zinc-100 print:text-black print:bg-white print:p-8 font-sans">
          {/* Header Kop Surat Dinas / Militer */}
          <div className="border-b-2 border-zinc-700 pb-4 text-center space-y-1 print:border-black">
            <div className="flex items-center justify-center space-x-2 mb-1">
              <ShieldAlert className="w-6 h-6 text-red-500 print:text-black" />
              <span className="font-mono font-bold tracking-widest text-sm uppercase">
                GARDA-LOKAL / PAI &bull; SENTRA KOMANDO INSIDEN LAPANGAN
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-bold font-mono tracking-wider uppercase text-white print:text-black">
              BERITA ACARA INTELIJEN &amp; DISPOSISI LAPORAN TAKTIS (BAP-TL)
            </h1>
            <p className="text-xs text-zinc-400 print:text-zinc-600 font-mono">
              Nomor Registrasi Kriptografi: #{report.id} &bull; Klasifikasi: RAHASIA / PETUGAS RESMI
            </p>
          </div>

          {/* Section 1: Data Ringkas & Klasifikasi Insiden */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold uppercase tracking-wider text-zinc-300 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1">
              I. IDENTIFIKASI &amp; SKOR TINGKAT URGENSI
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0F17] print:bg-zinc-100 p-3 rounded-lg border border-zinc-800 print:border-zinc-300 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500 print:text-zinc-600 block text-[10px]">Kategori:</span>
                <span className="font-bold text-white print:text-black">{report.category}</span>
              </div>
              <div>
                <span className="text-zinc-500 print:text-zinc-600 block text-[10px]">Waktu Kejadian:</span>
                <span className="font-bold text-white print:text-black">{report.temporal_context}</span>
              </div>
              <div>
                <span className="text-zinc-500 print:text-zinc-600 block text-[10px]">Skor Urgensi:</span>
                <span className="font-bold text-red-400 print:text-red-700">{report.urgency_score}/100</span>
              </div>
              <div>
                <span className="text-zinc-500 print:text-zinc-600 block text-[10px]">Kredibilitas:</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700">{report.credibility_score}%</span>
              </div>
            </div>
          </div>

          {/* Section 2: Data Geospasial & Forensik */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold uppercase tracking-wider text-zinc-300 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1">
              II. KOORDINAT GEOSPASIAL &amp; FORENSIK DIGITAL
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#0B0F17] print:bg-zinc-100 rounded-lg border border-zinc-800 print:border-zinc-300 space-y-1">
                <span className="font-mono font-bold text-zinc-400 print:text-zinc-700 text-[10px] uppercase block">
                  Titik Pin Koordinat Pelapor:
                </span>
                <p className="font-mono text-white print:text-black font-semibold">
                  {formatCoordinates(report.latitude, report.longitude)}
                </p>
                <p className="text-zinc-300 print:text-zinc-700 text-[11px]">
                  {report.address_road ? `${report.address_road}, ` : ''}
                  {report.address_subdistrict ? `Kec. ${report.address_subdistrict}, ` : ''}
                  {report.address_city || 'Wilayah Terlapor'}
                </p>
                {report.location_landmark && (
                  <p className="text-zinc-400 print:text-zinc-600 text-[11px]">
                    <strong>Patokan Lokasi:</strong> {report.location_landmark}
                  </p>
                )}
              </div>

              <div className="p-3 bg-[#0B0F17] print:bg-zinc-100 rounded-lg border border-zinc-800 print:border-zinc-300 space-y-1 text-[11px] font-mono">
                <span className="font-mono font-bold text-zinc-400 print:text-zinc-700 text-[10px] uppercase block">
                  Autentikasi Bukti Gambar &amp; Sensor:
                </span>
                <p>
                  <span className="text-zinc-500 print:text-zinc-600">Model Kamera: </span>
                  <span className="text-white print:text-black">
                    {forensics?.exif_metadata?.Model || forensics?.exif_metadata?.Make || 'Tidak terdeteksi'}
                  </span>
                </p>
                <p>
                  <span className="text-zinc-500 print:text-zinc-600">GPS EXIF Asli: </span>
                  <span className="text-white print:text-black">
                    {forensics?.exif_gps_latitude
                      ? formatCoordinates(forensics.exif_gps_latitude, forensics.exif_gps_longitude)
                      : 'Tidak terpasang'}
                  </span>
                </p>
                <p>
                  <span className="text-zinc-500 print:text-zinc-600">Selisih Jarak Pin vs EXIF: </span>
                  <span className="text-white print:text-black font-bold">
                    {formatDistance(forensics?.distance_pin_vs_exif_meters)} (
                    {forensics?.is_metadata_consistent ? 'KONSISTEN / VALID' : 'TIDAK KONSISTEN'})
                  </span>
                </p>
                <p className="truncate text-[10px] text-zinc-400 print:text-zinc-600">
                  SHA-256 Asli: {forensics?.original_file_sha256 || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Entitas Pelaku, Korban, Senjata */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold uppercase tracking-wider text-zinc-300 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1">
              III. ENTITAS TERLIBAT &amp; BARANG BUKTI TERIDENTIFIKASI
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#0B0F17] print:bg-zinc-100 rounded-lg border border-zinc-800 print:border-zinc-300">
                <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-600 block mb-1">
                  Nama Lengkap Pihak Terlibat / Terduga Pelaku / Korban:
                </span>
                <p className="font-semibold text-white print:text-black">
                  {report.extracted_entities?.involved_persons_full_names?.length
                    ? report.extracted_entities.involved_persons_full_names.join(', ')
                    : 'Tidak ada nama spesifik tercatat'}
                </p>
              </div>
              <div className="p-3 bg-[#0B0F17] print:bg-zinc-100 rounded-lg border border-zinc-800 print:border-zinc-300">
                <span className="text-[10px] font-mono text-zinc-500 print:text-zinc-600 block mb-1">
                  Senjata / Zat Berbahaya Terdeteksi:
                </span>
                <p className="font-semibold text-amber-300 print:text-red-700">
                  {report.extracted_entities?.weapons_or_substances?.length
                    ? report.extracted_entities.weapons_or_substances.join(', ')
                    : 'Tidak ada senjata terlapor'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 4: Kronologi Lengkap & Rekomendasi Taktis */}
          <div className="space-y-2 text-xs">
            <h3 className="font-mono font-bold uppercase tracking-wider text-zinc-300 print:text-black border-b border-zinc-800 print:border-zinc-300 pb-1">
              IV. NARASI UTUH KRONOLOGI LAPANGAN
            </h3>
            <div className="p-3.5 bg-[#0B0F17] print:bg-zinc-100 rounded-lg border border-zinc-800 print:border-zinc-300 text-xs leading-relaxed text-zinc-200 print:text-black whitespace-pre-wrap">
              {report.admin_full_narrative || report.raw_reporter_input}
            </div>

            {report.tactical_recommendation && (
              <div className="p-3 bg-amber-950/20 print:bg-zinc-100 rounded-lg border border-amber-800/60 print:border-zinc-300 text-xs text-amber-200 print:text-black leading-relaxed">
                <strong className="font-mono uppercase block mb-1 text-[10px] text-amber-400 print:text-black">
                  Rekomendasi Tindakan Taktis Lapangan:
                </strong>
                {report.tactical_recommendation}
              </div>
            )}
          </div>

          {/* Section 5: Lembar Pengesahan & Tanda Tangan */}
          <div className="pt-6 border-t border-zinc-700 print:border-black text-xs space-y-8">
            <div className="flex justify-between items-center text-[11px] font-mono text-zinc-400 print:text-zinc-600">
              <span>Dicetak pada: {formatDate(new Date().toISOString())}</span>
              <span>Dokumen Resmi Koordinasi Sektor Wilayah</span>
            </div>

            <div className="grid grid-cols-2 gap-8 text-center pt-4">
              <div className="space-y-16">
                <p className="font-mono font-semibold text-zinc-300 print:text-black">
                  Petugas Piket Komando GARDA-LOKAL
                </p>
                <div className="border-t border-zinc-600 print:border-black w-48 mx-auto pt-1 font-mono text-[11px] text-zinc-400 print:text-black">
                  ( .................................................. )<br />
                  NRP / ID Petugas
                </div>
              </div>

              <div className="space-y-16">
                <p className="font-mono font-semibold text-zinc-300 print:text-black">
                  Aparat Penerima Laporan (Polsek / Babinsa)
                </p>
                <div className="border-t border-zinc-600 print:border-black w-48 mx-auto pt-1 font-mono text-[11px] text-zinc-400 print:text-black">
                  ( .................................................. )<br />
                  Pangkat / Kesatuan Wilayah
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-[#0B0F17] border-t border-[#1F2937] flex items-center justify-between text-[11px] font-mono text-zinc-500 print:hidden">
          <span>GARDA-LOKAL INTEL DOSSIER GENERATOR</span>
          <button
            type="button"
            onClick={() => {
              playTacticalClick();
              onClose();
            }}
            className="text-zinc-400 hover:text-white px-3 py-1.5 rounded bg-surface border border-border"
          >
            Tutup Pratinjau
          </button>
        </div>
      </div>
    </div>
  );
}
