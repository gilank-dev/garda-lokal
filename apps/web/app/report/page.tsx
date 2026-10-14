'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Locate,
  Upload,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  ShieldAlert,
  Send,
  Camera,
  Layers,
  FileCheck,
  Check,
  Copy,
  Plus,
  Radio,
  Sparkles,
  Zap,
} from 'lucide-react';
import { IncidentCategory, TemporalStatus } from '@/lib/types';
import {
  processEvidenceImage,
  ForensicProcessingResult,
} from '@/lib/media-forensics';
import { formatCoordinates, formatDistance, generateReporterToken } from '@/lib/utils';
import { saveLocalTicket } from '@/lib/storage';
import { playTacticalClick, playSuccessChime, playWarningTone } from '@/lib/audio-feedback';
import { useToast } from '@/components/Toast';
import { EmergencyFloatingButton } from '@/components/EmergencyHotlineModal';
import { NetworkStatusIndicator } from '@/components/NetworkStatusIndicator';

// Dynamically import Leaflet TacticalMap with SSR disabled
const TacticalMap = dynamic(() => import('@/components/TacticalMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-md border border-border bg-surface flex items-center justify-center font-mono text-xs text-zinc-500">
      Menginisialisasi Peta Taktis OpenStreetMap...
    </div>
  ),
});

const QUICK_CHIPS = [
  { id: 'sajam', label: '+ Membawa Celurit/Sajam', phrase: '[Membawa Celurit/Sajam]' },
  { id: 'tawuran', label: '+ Tawuran Pelajar', phrase: '[Tawuran Pelajar]' },
  { id: 'kerumunan', label: '+ Kerumunan >20 Orang', phrase: '[Kerumunan >20 Orang]' },
  { id: 'stasiun', label: '+ Dekat Rel / Stasiun', phrase: '[Dekat Rel / Stasiun]' },
  { id: 'medis', label: '+ Butuh Medis Segera', phrase: '[Butuh Medis Segera]' },
  { id: 'pungli', label: '+ Pungli / Pemalakan', phrase: '[Pungli / Pemalakan]' },
];

export default function ReportFormPage() {
  const router = useRouter();
  const { success, warning, error } = useToast();

  // Location State (Default center Jakarta, Indonesia)
  const [latitude, setLatitude] = useState(-6.2088);
  const [longitude, setLongitude] = useState(106.8456);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationName, setLocationName] = useState('Pusat Wilayah');
  const [addressDetails, setAddressDetails] = useState<{
    road?: string;
    subdistrict?: string;
    district?: string;
    city?: string;
    province?: string;
  }>({});
  const [landmark, setLandmark] = useState('');

  // Form Fields
  const [category, setCategory] = useState<IncidentCategory>('BENTROK');
  const [temporalContext, setTemporalContext] = useState<TemporalStatus>('SEDANG_BERLANGSUNG');
  const [chronology, setChronology] = useState('');

  // Forensic Photo Proof State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [forensicResult, setForensicResult] = useState<ForensicProcessingResult | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);

  // Auto Reverse Geocode when coordinates change
  useEffect(() => {
    const fetchAddress = async () => {
      setIsGeocoding(true);
      try {
        const res = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`);
        if (res.ok) {
          const data = await res.json();
          setLocationName(data.displayName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          setAddressDetails({
            road: data.road,
            subdistrict: data.subdistrict,
            district: data.district,
            city: data.city,
            province: data.province,
          });
        }
      } catch (e) {
        console.warn('Geocoding fetch failed:', e);
      } finally {
        setIsGeocoding(false);
      }
    };

    const timeout = setTimeout(fetchAddress, 400);
    return () => clearTimeout(timeout);
  }, [latitude, longitude]);

  // Use GPS Location of Device
  const handleUseMyLocation = () => {
    playTacticalClick();
    if (!navigator.geolocation) {
      warning('Perangkat Anda tidak mendukung geolokasi browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setGpsAccuracy(pos.coords.accuracy || 5);
        setIsLocating(false);
        playSuccessChime();
        success(
          `GPS Akurat didapatkan (Akurasi: ±${Math.round(pos.coords.accuracy || 5)}m).`,
          'GPS TERKUNCI'
        );
      },
      (err) => {
        setIsLocating(false);
        playWarningTone();
        warning('Gagal mendeteksi sinyal GPS: ' + err.message, 'GPS ERROR');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Quick Chips Handler
  const handleToggleChip = (phrase: string) => {
    playTacticalClick();
    if (chronology.includes(phrase)) {
      // Remove cleanly
      setChronology((prev) => prev.replace(phrase, '').replace(/\s+/g, ' ').trim());
    } else {
      // Append cleanly
      setChronology((prev) => (prev ? `${phrase} ${prev}` : phrase));
    }
  };

  // Process Evidence Photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoError('Format berkas tidak didukung. Harap pilih gambar/foto.');
      playWarningTone();
      return;
    }

    setSelectedFile(file);
    setPhotoError(null);
    setIsProcessingPhoto(true);

    try {
      const result = await processEvidenceImage(file, latitude, longitude);
      setForensicResult(result);
      playSuccessChime();
      success(
        `Foto berhasil dikompresi ke ${Math.round(
          result.compressedFileSize / 1024
        )} KB (<80 KB) dengan SHA-256 fingerprint.`,
        'FORENSIK SELESAI'
      );
    } catch (err: any) {
      console.error('Forensic processing error:', err);
      setPhotoError('Gagal memproses forensik foto: ' + err.message);
      playWarningTone();
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const copyHash = (hash: string, label: string) => {
    playTacticalClick();
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    success(`${label} fingerprint disalin ke clipboard`, 'DISALIN');
    setTimeout(() => setCopiedHash(null), 2500);
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!chronology.trim()) {
      playWarningTone();
      warning('Kronologi kejadian wajib diisi sebelum mengirim laporan.', 'DATA KURANG');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate or retrieve persistent reporter token
      const reporterToken = generateReporterToken();

      const payload = {
        category,
        temporalContext,
        rawReporterInput: chronology.trim(),
        locationLandmark: landmark.trim() || null,
        latitude,
        longitude,
        addressRoad: addressDetails.road || null,
        addressSubdistrict: addressDetails.subdistrict || null,
        addressDistrict: addressDetails.district || null,
        addressCity: addressDetails.city || null,
        addressProvince: addressDetails.province || null,
        reporterToken,
        imageWebpBase64: forensicResult?.compressedDataUrl || null,
        originalFileSha256: forensicResult?.originalFileSha256 || null,
        compressedFileSha256: forensicResult?.compressedFileSha256 || null,
        exifMetadata: forensicResult?.exif?.rawMetadata || {},
        exifGpsLatitude: forensicResult?.exif?.latitude ?? null,
        exifGpsLongitude: forensicResult?.exif?.longitude ?? null,
        exifCapturedAt: forensicResult?.exif?.capturedAt ?? null,
        distancePinVsExifMeters: forensicResult?.distancePinVsExifMeters ?? null,
        isMetadataConsistent: forensicResult?.isMetadataConsistent ?? true,
      };

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();

      if (!res.ok) {
        throw new Error(resJson.error || 'Gagal mengirim laporan');
      }

      const reportId = resJson.reportId;
      setSubmittedReportId(reportId);

      // Save to local tickets for user tracking
      saveLocalTicket({
        id: reportId,
        token: reporterToken,
        tokenHash: '',
        category,
        createdAt: new Date().toISOString(),
        publicSummary: 'Laporan telah diterima dan masuk ke antrean verifikasi petugas.',
        status: 'BARU',
      });

      playSuccessChime();
      success('Laporan berhasil dikirim dan diamankan!', 'TERKIRIM');
      setSubmitSuccess(true);
    } catch (err: any) {
      playWarningTone();
      error('Terjadi kesalahan: ' + err.message, 'GAGAL KIRIM');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <NetworkStatusIndicator />
      <main className="min-h-screen bg-background text-tactical-bright px-4 py-5 max-w-md mx-auto pb-24">
        {/* Navigation Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
          <Link
            href="/"
            onClick={() => playTacticalClick()}
            className="flex items-center space-x-1.5 text-xs font-mono text-zinc-400 hover:text-white transition-colors min-h-[44px] pr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Beranda</span>
          </Link>
          <span className="text-xs font-mono text-red-400 font-bold tracking-wider">
            PELAPORAN LAPANGAN
          </span>
        </div>

        <form onSubmit={handleSubmitReport} className="space-y-6">
          {/* Step 1: Tactical Map Pinpoint */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-zinc-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-red-500" />
                1. LOKASI KEJADIAN (PINPOINT OSM)
              </label>
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={isLocating}
                className="text-[11px] font-mono text-blue-400 hover:text-blue-300 flex items-center gap-1.5 bg-surface-elevated px-2.5 py-1.5 rounded border border-border transition-colors min-h-[36px]"
              >
                <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'Mencari GPS...' : 'GPS Saya'}
              </button>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-border shadow-tactical">
              <TacticalMap
                latitude={latitude}
                longitude={longitude}
                gpsAccuracyMeters={gpsAccuracy}
                interactive={true}
                showReticle={true}
                onResetGps={handleUseMyLocation}
                onLocationSelect={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                exifLatitude={forensicResult?.exif?.latitude}
                exifLongitude={forensicResult?.exif?.longitude}
                className="h-60 w-full"
              />

              <div className="absolute bottom-2 left-2 z-20 bg-background/90 backdrop-blur-sm border border-border px-2 py-1 rounded text-[10px] font-mono text-zinc-400">
                Geser pin merah atau sentuh peta untuk titik akurat
              </div>
            </div>

            {/* Location Breakdown Box */}
            <div className="bg-surface p-3 rounded-lg border border-border text-[11px] space-y-1.5">
              <div className="text-zinc-400 font-mono flex items-center justify-between">
                <span>Koordinat Taktis:</span>
                <span className="text-white font-mono font-bold">
                  {formatCoordinates(latitude, longitude)}
                </span>
              </div>
              <div className="text-zinc-300 leading-relaxed">
                <span className="text-zinc-500 font-mono mr-1">Alamat Terdeteksi:</span>
                {isGeocoding ? (
                  <span className="italic text-zinc-500">Mendeteksi alamat geospasial...</span>
                ) : (
                  locationName
                )}
              </div>
            </div>

            <input
              type="text"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="Patokan spesifik (contoh: Gang samping Indomaret, bawah flyover, pos ronda RT 04)"
              className="w-full bg-surface border border-border px-3 py-2.5 text-xs rounded text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 font-sans"
            />
          </div>

          {/* Step 2: Kategori Kejadian */}
          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-zinc-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-amber-500" />
              2. KATEGORI INSIDEN
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { id: 'BENTROK', label: 'BENTROK / TAWURAN', color: 'border-red-600 text-red-300 bg-red-950/40' },
                { id: 'PERUNDUNGAN', label: 'PERUNDUNGAN', color: 'border-amber-600 text-amber-300 bg-amber-950/40' },
                { id: 'MIRAS_NARKOBA', label: 'MIRAS / NARKOBA', color: 'border-orange-600 text-orange-300 bg-orange-950/40' },
                { id: 'LAINNYA', label: 'LAINNYA', color: 'border-zinc-500 text-zinc-200 bg-zinc-900/60' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playTacticalClick();
                    setCategory(cat.id as IncidentCategory);
                  }}
                  className={`min-h-[44px] p-2.5 rounded-lg border text-center transition-all ${
                    category === cat.id
                      ? `${cat.color} ring-1 ring-white/40 font-bold`
                      : 'border-border bg-surface text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Status Waktu Kejadian */}
          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-zinc-200">
              3. WAKTU STATUS KEJADIAN
            </label>
            <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
              {[
                { id: 'SEDANG_BERLANGSUNG', label: 'BERLANGSUNG', activeColor: 'bg-red-600 text-white border-red-500 font-bold shadow-md shadow-red-950/50' },
                { id: 'RENCANA_MENDATANG', label: 'RENCANA', activeColor: 'bg-amber-600 text-white border-amber-500 font-bold' },
                { id: 'KEJADIAN_LAMPAU', label: 'SUDAH LEWAT', activeColor: 'bg-zinc-700 text-white border-zinc-600 font-bold' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    playTacticalClick();
                    setTemporalContext(t.id as TemporalStatus);
                  }}
                  className={`min-h-[44px] py-2 px-1 rounded-lg border text-center transition-all flex items-center justify-center ${
                    temporalContext === t.id
                      ? t.activeColor
                      : 'border-border bg-surface text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 4: Quick Chips Penanda Situasi Cepat */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-zinc-200 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                4. PENANDA SITUASI CEPAT (QUICK CHIPS)
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Sentuh untuk menambah</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_CHIPS.map((chip) => {
                const isActive = chronology.includes(chip.phrase);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleToggleChip(chip.phrase)}
                    className={`min-h-[38px] px-3 py-1.5 rounded-full text-xs font-mono border transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-surface border-border text-zinc-300 hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    {isActive ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5 text-zinc-500" />}
                    <span>{chip.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 5: Kronologi & Detail Kejadian */}
          <div className="space-y-2">
            <label className="text-xs font-bold font-mono text-zinc-200 flex items-center justify-between">
              <span>5. KRONOLOGI LENGKAP KEJADIAN</span>
              <span className="text-[10px] text-red-400 font-mono">* Wajib diisi</span>
            </label>
            <textarea
              required
              rows={4}
              value={chronology}
              onChange={(e) => setChronology(e.target.value)}
              placeholder="Tuliskan runtutan kejadian, nama atau panggilan pelaku/korban, ciri pakaian, motor yang digunakan, dan jenis senjata... (Nama utuh terlindungi untuk verifikasi petugas, dan otomatis disamarkan di publik)."
              className="w-full bg-surface border border-border p-3 text-xs rounded-lg text-white focus:outline-none focus:border-red-600 placeholder:text-zinc-600 leading-relaxed font-sans"
            />
          </div>

          {/* Step 6: Bukti Foto & Visual Bar Kompresi Forensik */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold font-mono text-zinc-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-400" />
                6. BUKTI FOTO (FORENSIK WEBP &lt;80 KB)
              </span>
              <span className="text-[10px] text-zinc-500 font-normal">Opsional</span>
            </label>

            <div className="border border-dashed border-border rounded-lg p-3.5 bg-surface/50 text-center hover:bg-surface transition-colors">
              <input
                type="file"
                accept="image/*"
                id="evidence-file"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="evidence-file"
                className="cursor-pointer flex flex-col items-center justify-center space-y-1.5 py-2 min-h-[50px]"
              >
                <Upload className="w-6 h-6 text-zinc-400 mb-0.5" />
                <span className="text-xs font-mono text-zinc-300 font-bold">
                  {selectedFile ? 'Ganti Foto Bukti Kejadian' : 'Pilih Foto dari Galeri / Kamera'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  Kompresi WebP otomatis &lt;80 KB, ekstraksi EXIF kamera & SHA-256 fingerprint
                </span>
              </label>
            </div>

            {isProcessingPhoto && (
              <div className="p-3 bg-surface border border-border rounded text-center text-xs font-mono text-amber-400 animate-pulse">
                Mengekstrak metadata EXIF & mengompresi gambar ke WebP...
              </div>
            )}

            {photoError && (
              <div className="p-3 bg-red-950/60 border border-red-700/80 rounded text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{photoError}</span>
              </div>
            )}

            {/* Visual Bar Kompresi Forensik */}
            {forensicResult && (
              <div className="bg-surface border border-border rounded-lg p-3.5 space-y-3 text-[11px] font-mono shadow-tactical">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                    <FileCheck className="w-4 h-4" />
                    Forensik Kompresi Berhasil
                  </span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded">
                    STANDAR WEBP &lt;80 KB
                  </span>
                </div>

                {/* Compression Visual Bar Gauge */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-zinc-400">
                      Asli: {(forensicResult.originalFileSize / 1024).toFixed(1)} KB &rarr; WebP:{' '}
                      <strong className="text-emerald-400 font-bold">
                        {(forensicResult.compressedFileSize / 1024).toFixed(1)} KB
                      </strong>
                    </span>
                    <span className="text-emerald-400 font-bold">
                      {Math.max(
                        0,
                        Math.round(
                          ((forensicResult.originalFileSize - forensicResult.compressedFileSize) /
                            forensicResult.originalFileSize) *
                            100
                        )
                      )}
                      % Lebih Ringan
                    </span>
                  </div>

                  {/* Progress visual bar */}
                  <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden flex border border-zinc-700">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (forensicResult.compressedFileSize / (80 * 1024)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>0 KB</span>
                    <span>Batas Maksimum 80 KB</span>
                  </div>
                </div>

                {/* Fingerprint SHA-256 Badges */}
                <div className="space-y-1.5 pt-1 border-t border-border/50">
                  <div className="flex items-center justify-between bg-surface-elevated p-2 rounded border border-border">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-zinc-500 block">SHA-256 Asli:</span>
                      <span className="text-zinc-300 text-[10px] truncate block font-mono">
                        {forensicResult.originalFileSha256}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyHash(forensicResult.originalFileSha256, 'SHA-256 Berkas Asli')
                      }
                      className="text-zinc-400 hover:text-white p-1 rounded shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Salin Hash SHA-256 Asli"
                    >
                      {copiedHash === forensicResult.originalFileSha256 ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between bg-surface-elevated p-2 rounded border border-border">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] text-zinc-500 block">SHA-256 WebP:</span>
                      <span className="text-emerald-400 text-[10px] truncate block font-mono">
                        {forensicResult.compressedFileSha256}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyHash(forensicResult.compressedFileSha256, 'SHA-256 WebP')
                      }
                      className="text-zinc-400 hover:text-white p-1 rounded shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Salin Hash SHA-256 WebP"
                    >
                      {copiedHash === forensicResult.compressedFileSha256 ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* EXIF Metadata Telemetry */}
                <div className="grid grid-cols-2 gap-2 text-zinc-300 pt-1 border-t border-border/40">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Kamera / Device:</span>
                    <span className="text-white">
                      {forensicResult.exif.deviceModel ||
                        forensicResult.exif.deviceMake ||
                        'Tidak terdeteksi'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">EXIF GPS:</span>
                    <span
                      className={
                        forensicResult.exif.latitude ? 'text-blue-400 font-bold' : 'text-zinc-500'
                      }
                    >
                      {forensicResult.exif.latitude
                        ? `${forensicResult.exif.latitude.toFixed(4)}, ${forensicResult.exif.longitude?.toFixed(4)}`
                        : 'Tidak tertanam'}
                    </span>
                  </div>
                </div>

                {forensicResult.distancePinVsExifMeters != null && (
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-zinc-400">Selisih Titik Peta vs Kamera:</span>
                    <span
                      className={`font-bold ${
                        forensicResult.isMetadataConsistent ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {formatDistance(forensicResult.distancePinVsExifMeters)}{' '}
                      {forensicResult.isMetadataConsistent ? '(COCOK)' : '(TIDAK COCOK)'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 7: Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || isProcessingPhoto}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-mono font-bold py-4 px-4 rounded-xl flex items-center justify-center space-x-2 border border-red-500 disabled:border-zinc-700 shadow-xl shadow-red-950/70 transition-all uppercase tracking-wider text-sm min-h-[52px]"
            >
              <Send className="w-5 h-5" />
              <span>{isSubmitting ? 'Mengirim Data Terverifikasi...' : 'Kirim Laporan Sekarang'}</span>
            </button>
            <p className="text-[11px] text-zinc-500 text-center mt-2 font-mono">
              Data dienkripsi secara asimetris. Tanpa akun, identitas aman terlindungi.
            </p>
          </div>
        </form>

        {/* Confirmation Modal */}
        {submitSuccess && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-surface border border-border rounded-xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-600 flex items-center justify-center text-emerald-400 mx-auto">
                <Check className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold font-mono text-white">Laporan Berhasil Diterima</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Laporan Anda telah tercatat dan masuk ke antrean komando tanggap darurat petugas.
                </p>
              </div>

              <div className="p-3 bg-surface-elevated border border-border rounded font-mono text-[11px] text-zinc-400 text-left space-y-1">
                <div>
                  <span className="text-zinc-500">ID Laporan:</span>
                  <span className="text-white block truncate font-bold">{submittedReportId}</span>
                </div>
                <div className="text-[10px] text-zinc-500 pt-1">
                  Token kriptografi telah disimpan di peramban ini agar Anda dapat memantau status secara anonim.
                </div>
              </div>

              <div className="space-y-2">
                {submittedReportId && (
                  <Link
                    href={`/ticket/${submittedReportId}`}
                    onClick={() => playTacticalClick()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-bold py-3 px-4 rounded-lg border border-blue-500 transition-colors uppercase block text-center min-h-[44px] flex items-center justify-center"
                  >
                    Buka Lembar Tiket Mandiri
                  </Link>
                )}
                <button
                  onClick={() => {
                    playTacticalClick();
                    router.push('/');
                  }}
                  className="w-full bg-surface-elevated hover:bg-zinc-800 text-zinc-300 font-mono text-xs py-3 px-4 rounded-lg border border-border transition-colors uppercase min-h-[44px]"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Emergency Speed-Dial */}
      <EmergencyFloatingButton />
    </>
  );
}
