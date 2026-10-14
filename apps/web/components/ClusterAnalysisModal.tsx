'use client';

import React from 'react';
import Link from 'next/link';
import {
  Layers,
  MapPin,
  Clock,
  Flame,
  ChevronRight,
  X,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { Report } from '@/lib/types';
import { formatDate, getCategoryBadge, getStatusBadge, formatCoordinates } from '@/lib/utils';
import { playTacticalClick } from '@/lib/audio-feedback';

interface ClusterAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  primaryReport: Report;
  allReports: Report[];
}

export function ClusterAnalysisModal({
  isOpen,
  onClose,
  primaryReport,
  allReports,
}: ClusterAnalysisModalProps) {
  if (!isOpen) return null;

  // Haversine calculation to find reports within 1.5 km
  const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Find clustered reports (same cluster_parent_id, or within 1.2km)
  const clusteredList = allReports.filter((r) => {
    if (r.id === primaryReport.id) return true;
    if (primaryReport.cluster_parent_id && r.cluster_parent_id === primaryReport.cluster_parent_id) {
      return true;
    }
    const dist = getDistanceMeters(
      primaryReport.latitude,
      primaryReport.longitude,
      r.latitude,
      r.longitude
    );
    return dist <= 1200; // Within 1.2 km
  });

  const avgUrgency = Math.round(
    clusteredList.reduce((acc, curr) => acc + curr.urgency_score, 0) / (clusteredList.length || 1)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cluster-modal-title"
      className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#1F2937] flex items-center justify-between bg-[#0B0F17]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-amber-950/80 border border-amber-700 flex items-center justify-center text-amber-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2
                id="cluster-modal-title"
                className="text-sm font-bold font-mono tracking-wider text-white uppercase"
              >
                ANALISIS KLASTER INSIDEN RADIUS &lt; 1.2 KM
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono">
                Pusat Klaster: {formatCoordinates(primaryReport.latitude, primaryReport.longitude)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTacticalClick();
              onClose();
            }}
            className="text-zinc-400 hover:text-white p-2 rounded-lg bg-surface border border-border min-w-[40px] min-h-[40px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telemetry Summary Cards */}
        <div className="p-4 grid grid-cols-3 gap-2.5 bg-[#0B0F17]/60 border-b border-[#1F2937]">
          <div className="p-2.5 bg-surface border border-border rounded-lg text-center">
            <span className="text-[10px] font-mono text-zinc-500 uppercase block">Total Laporan</span>
            <span className="text-lg font-mono font-bold text-white">{clusteredList.length} Kasus</span>
          </div>
          <div className="p-2.5 bg-surface border border-red-900/60 rounded-lg text-center">
            <span className="text-[10px] font-mono text-red-400 uppercase block">Rata-rata Urgensi</span>
            <span className="text-lg font-mono font-bold text-red-400">{avgUrgency}/100</span>
          </div>
          <div className="p-2.5 bg-surface border border-amber-900/60 rounded-lg text-center">
            <span className="text-[10px] font-mono text-amber-400 uppercase block">Status Area</span>
            <span className="text-xs font-mono font-bold text-amber-300 block mt-1">
              {clusteredList.length > 2 ? 'ESKALASI TINGGI' : 'MONITORING'}
            </span>
          </div>
        </div>

        {/* List of Reports in Cluster */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1">
            <span>DAFTAR LAPORAN DALAM KLASTER INI ({clusteredList.length})</span>
            <span className="text-[10px] text-zinc-500">Radius Titik Terdekat</span>
          </div>

          {clusteredList.map((item) => {
            const isSelf = item.id === primaryReport.id;
            const catBadge = getCategoryBadge(item.category);
            const statBadge = getStatusBadge(item.status);
            const distMeters = Math.round(
              getDistanceMeters(
                primaryReport.latitude,
                primaryReport.longitude,
                item.latitude,
                item.longitude
              )
            );

            return (
              <div
                key={item.id}
                className={`p-3 rounded-lg border text-xs font-mono transition-all ${
                  isSelf
                    ? 'bg-red-950/20 border-red-700/80'
                    : 'bg-[#0B0F17] border-border hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${catBadge.className}`}>
                      {catBadge.label}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded ${statBadge.className}`}>
                      {statBadge.label}
                    </span>
                    {isSelf && (
                      <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">
                        LAPORAN INI
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-[11px]">
                    <span className="text-zinc-400">Jarak: &plusmn;{distMeters}m</span>
                    <span className="font-bold text-red-400">Urgensi: {item.urgency_score}</span>
                  </div>
                </div>

                <p className="text-xs text-zinc-300 font-sans line-clamp-2 leading-relaxed mb-2">
                  {item.admin_full_narrative || item.raw_reporter_input}
                </p>

                <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1.5 border-t border-border/50">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.created_at)}
                    </span>
                    <span>&bull;</span>
                    <span>ID: #{item.id.substring(0, 8)}</span>
                  </div>

                  {!isSelf ? (
                    <Link
                      href={`/admin/reports/${item.id}`}
                      onClick={() => playTacticalClick()}
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
                    >
                      <span>Buka Laporan Terkait</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-zinc-500 italic">Sedang Ditampilkan</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0B0F17] border-t border-[#1F2937] flex items-center justify-between text-[11px] font-mono text-zinc-500">
          <span>GARDA-LOKAL KLASTERING SPASIAL &bull; ALGORITMA HAVERSINE &lt; 1.2 KM</span>
          <button
            type="button"
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
