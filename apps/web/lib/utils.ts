import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { IncidentCategory, ReportStatus, TemporalStatus } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta',
    }).format(d) + ' WIB';
  } catch {
    return dateString;
  }
}

export function formatCoordinates(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat == null || lng == null) return '-';
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '-';
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

export async function computeSha256(input: ArrayBuffer | Uint8Array | string): Promise<string> {
  let data: Uint8Array;
  if (typeof input === 'string') {
    data = new TextEncoder().encode(input);
  } else if (input instanceof Uint8Array) {
    data = input;
  } else {
    data = new Uint8Array(input);
  }

  // Universal Web Crypto API (supported natively in all modern browsers and Node 18+)
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
  if (cryptoObj && cryptoObj.subtle) {
    const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data as unknown as BufferSource);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Web Crypto API tidak tersedia pada lingkungan ini');
}

export function generateReporterToken(): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function getStatusBadge(status: ReportStatus) {
  switch (status) {
    case 'BARU':
      return {
        label: 'BARU MASUK',
        className: 'bg-red-950/80 text-red-400 border border-red-700/80 font-mono text-xs',
      };
    case 'DITINDAKLANJUTI':
      return {
        label: 'DITINDAKLANJUTI',
        className: 'bg-blue-950/80 text-blue-400 border border-blue-700/80 font-mono text-xs',
      };
    case 'BUTUH_INFO_PELAPOR':
      return {
        label: 'BUTUH INFO PELAPOR',
        className: 'bg-amber-950/80 text-amber-400 border border-amber-700/80 font-mono text-xs',
      };
    case 'SELESAI':
      return {
        label: 'SELESAI',
        className: 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/80 font-mono text-xs',
      };
    case 'INDIKASI_PALSU':
      return {
        label: 'INDIKASI PALSU',
        className: 'bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-xs line-through',
      };
    case 'RAW_UNPROCESSED':
      return {
        label: 'RAW (BELUM DIPROSES)',
        className: 'bg-yellow-950/80 text-yellow-400 border border-yellow-700/80 font-mono text-xs',
      };
    default:
      return {
        label: status,
        className: 'bg-zinc-900 text-zinc-300 border border-zinc-700 font-mono text-xs',
      };
  }
}

export function getCategoryBadge(category: IncidentCategory) {
  switch (category) {
    case 'BENTROK':
      return {
        label: 'BENTROK / TAWURAN',
        className: 'bg-red-950/60 text-red-300 border border-red-800/80',
      };
    case 'PERUNDUNGAN':
      return {
        label: 'PERUNDUNGAN / BULLYING',
        className: 'bg-amber-950/60 text-amber-300 border border-amber-800/80',
      };
    case 'MIRAS_NARKOBA':
      return {
        label: 'MIRAS / NARKOBA / OBAT',
        className: 'bg-orange-950/60 text-orange-300 border border-orange-800/80',
      };
    case 'LAINNYA':
      return {
        label: 'LAINNYA',
        className: 'bg-slate-800 text-slate-300 border border-slate-700',
      };
  }
}

export function getTemporalBadge(context: TemporalStatus) {
  switch (context) {
    case 'SEDANG_BERLANGSUNG':
      return {
        label: 'SEDANG BERLANGSUNG',
        className: 'text-red-400 border border-red-700/60 bg-red-950/40',
      };
    case 'RENCANA_MENDATANG':
      return {
        label: 'RENCANA / AKAN TERJADI',
        className: 'text-amber-400 border border-amber-700/60 bg-amber-950/40',
      };
    case 'KEJADIAN_LAMPAU':
      return {
        label: 'SUDAH TERJADI',
        className: 'text-zinc-400 border border-zinc-700/60 bg-zinc-900/60',
      };
  }
}
