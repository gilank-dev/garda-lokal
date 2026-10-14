'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Locate, Compass, Layers } from 'lucide-react';
import { playTacticalClick, playRadarPing } from '@/lib/audio-feedback';

interface TacticalMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  interactive?: boolean;
  onLocationSelect?: (lat: number, lng: number) => void;
  exifLatitude?: number | null;
  exifLongitude?: number | null;
  gpsAccuracyMeters?: number | null;
  onResetGps?: () => void;
  showReticle?: boolean;
  className?: string;
}

export default function TacticalMap({
  latitude,
  longitude,
  zoom = 15,
  interactive = true,
  onLocationSelect,
  exifLatitude,
  exifLongitude,
  gpsAccuracyMeters,
  onResetGps,
  showReticle = true,
  className = 'h-64 w-full rounded-md border border-border',
}: TacticalMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const primaryMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const exifMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const [hudActive, setHudActive] = useState(showReticle);

  // Custom Tactical Red Pin with pulsing targeting ring
  const createTacticalPinIcon = () => {
    return L.divIcon({
      className: 'tactical-marker',
      html: `
        <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%);">
          <!-- Outer Pulsing Radar Ring -->
          <div style="position: absolute; top: 0; left: 0; width: 36px; height: 36px; border: 1.5px solid rgba(220, 38, 38, 0.8); border-radius: 50%; animation: radar-pulse 2s infinite;"></div>
          <!-- Tactical Pin SVG -->
          <svg viewBox="0 0 24 24" width="36" height="36" fill="#DC2626" stroke="#FFFFFF" stroke-width="1.5" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.8" fill="#FFFFFF"/>
          </svg>
          <div style="position: absolute; bottom: -3px; left: 18px; transform: translateX(-50%); width: 12px; height: 4px; background: rgba(0,0,0,0.6); border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    });
  };

  // Custom Tactical Blue Pin for EXIF Camera GPS Location
  const createExifPinIcon = () => {
    return L.divIcon({
      className: 'exif-marker',
      html: `
        <div style="position: relative; width: 32px; height: 32px; transform: translate(-50%, -100%);">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.5">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            <circle cx="12" cy="9" r="2.5" fill="#FFFFFF"/>
          </svg>
          <div style="font-size: 9px; font-weight: bold; background: #1E3A8A; color: #93C5FD; padding: 1px 5px; border-radius: 3px; border: 1px solid #3B82F6; white-space: nowrap; margin-top: -8px; font-family: monospace;">EXIF GPS</div>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom,
      zoomControl: false, // We'll add subtle custom control
      dragging: interactive,
      scrollWheelZoom: interactive ? 'center' : false,
      doubleClickZoom: interactive,
      attributionControl: false,
    });

    // Dark cartographic tiles for tactical theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // Subtle attribution
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '© OSM © CARTO',
      })
      .addTo(map);

    // Primary Marker
    const primaryMarker = L.marker([latitude, longitude], {
      icon: createTacticalPinIcon(),
      draggable: interactive,
    }).addTo(map);

    if (interactive) {
      primaryMarker.on('dragend', () => {
        playTacticalClick();
        const pos = primaryMarker.getLatLng();
        onLocationSelect?.(pos.lat, pos.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        playTacticalClick();
        primaryMarker.setLatLng(e.latlng);
        onLocationSelect?.(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;
    primaryMarkerRef.current = primaryMarker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync changes in coordinates
  useEffect(() => {
    if (!mapInstanceRef.current || !primaryMarkerRef.current) return;

    primaryMarkerRef.current.setLatLng([latitude, longitude]);
    mapInstanceRef.current.panTo([latitude, longitude], { animate: true });

    // Handle Accuracy Perimeter Circle
    if (gpsAccuracyMeters && gpsAccuracyMeters > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle([latitude, longitude], {
          radius: gpsAccuracyMeters,
          color: '#10B981',
          weight: 1.5,
          opacity: 0.8,
          fillColor: '#059669',
          fillOpacity: 0.12,
          dashArray: '3, 6',
        }).addTo(mapInstanceRef.current);
      } else {
        accuracyCircleRef.current.setLatLng([latitude, longitude]);
        accuracyCircleRef.current.setRadius(gpsAccuracyMeters);
      }
    } else if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }

    // Handle EXIF GPS Marker & Polyline if provided
    if (exifLatitude != null && exifLongitude != null) {
      if (!exifMarkerRef.current) {
        exifMarkerRef.current = L.marker([exifLatitude, exifLongitude], {
          icon: createExifPinIcon(),
        }).addTo(mapInstanceRef.current);
      } else {
        exifMarkerRef.current.setLatLng([exifLatitude, exifLongitude]);
      }

      // Draw connection line
      const latlngs: [number, number][] = [
        [latitude, longitude],
        [exifLatitude, exifLongitude],
      ];

      if (!polylineRef.current) {
        polylineRef.current = L.polyline(latlngs, {
          color: '#F59E0B',
          dashArray: '4, 8',
          weight: 2,
        }).addTo(mapInstanceRef.current);
      } else {
        polylineRef.current.setLatLngs(latlngs);
      }

      // Fit bounds if distance between points is significant
      const bounds = L.latLngBounds(latlngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else {
      if (exifMarkerRef.current) {
        exifMarkerRef.current.remove();
        exifMarkerRef.current = null;
      }
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }
    }
  }, [latitude, longitude, exifLatitude, exifLongitude, gpsAccuracyMeters]);

  const handleRecenter = () => {
    playRadarPing();
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latitude, longitude], zoom, { animate: true });
    }
    if (onResetGps) {
      onResetGps();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Map Leaflet Canvas */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Reticle HUD Tactical Target Overlay */}
      {hudActive && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          {/* Outer Crosshair HUD Ring */}
          <div className="w-28 h-28 border border-red-500/20 rounded-full flex items-center justify-center relative">
            <div className="w-16 h-16 border border-dashed border-red-500/35 rounded-full"></div>
            {/* Crosshair Tick Marks */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-red-500/50"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-red-500/50"></div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-red-500/50"></div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-3 bg-red-500/50"></div>
          </div>
          {/* Tactical Corner Brackets */}
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-red-500/60"></div>
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-red-500/60"></div>
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-red-500/60"></div>
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-red-500/60"></div>
        </div>
      )}

      {/* HUD Telemetry Coordinates Badge (Top Left) */}
      <div className="absolute top-2.5 left-2.5 z-30 pointer-events-none flex flex-col gap-1">
        <div className="bg-[#0B0F17]/90 backdrop-blur-md border border-[#1F2937] px-2 py-1 rounded text-[10px] font-mono text-zinc-300 flex items-center gap-1.5 shadow-md">
          <Crosshair className="w-3 h-3 text-red-500 shrink-0" />
          <span>
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
        </div>

        {gpsAccuracyMeters != null && (
          <div className="bg-emerald-950/80 backdrop-blur-md border border-emerald-700/80 px-2 py-0.5 rounded text-[9px] font-mono text-emerald-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Akurasi GPS: &plusmn;{Math.round(gpsAccuracyMeters)} meter</span>
          </div>
        )}
      </div>

      {/* HUD Tactical Controls (Top Right - Min 44x44px Targets) */}
      {interactive && (
        <div className="absolute top-2.5 right-2.5 z-30 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleRecenter}
            className="w-10 h-10 rounded bg-[#111827]/90 hover:bg-[#1F2937] active:bg-[#374151] border border-[#1F2937] text-zinc-200 hover:text-white flex items-center justify-center shadow-lg transition-colors"
            title="Reset ke Titik Koordinat Pelapor"
            aria-label="Pusatkan kembali ke titik koordinat"
          >
            <Locate className="w-4 h-4 text-red-400" />
          </button>

          <button
            type="button"
            onClick={() => {
              playTacticalClick();
              setHudActive(!hudActive);
            }}
            className={`w-10 h-10 rounded border flex items-center justify-center shadow-lg transition-colors ${
              hudActive
                ? 'bg-red-950/70 border-red-600/80 text-red-300'
                : 'bg-[#111827]/90 border-[#1F2937] text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Reticle Bidik HUD"
            aria-label="Nyalakan/matikan reticle bidik"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
