import exifr from 'exifr';
import { computeSha256 } from './utils';

export interface ExtractedExifData {
  latitude: number | null;
  longitude: number | null;
  capturedAt: string | null;
  deviceMake: string | null;
  deviceModel: string | null;
  rawMetadata: Record<string, any>;
}

export interface ForensicProcessingResult {
  originalFileSha256: string;
  originalFileSize: number;
  compressedFileSha256: string;
  compressedFileSize: number;
  compressedBlob: Blob;
  compressedDataUrl: string;
  exif: ExtractedExifData;
  distancePinVsExifMeters: number | null;
  isMetadataConsistent: boolean;
  consistencyReason: string;
}

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Extracts EXIF metadata, GPS, and timestamp from raw image file
 */
export async function extractExifMetadata(file: File): Promise<ExtractedExifData> {
  try {
    const rawParsed = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      reviveValues: true,
      translateKeys: true,
      translateValues: true,
    });

    if (!rawParsed) {
      return {
        latitude: null,
        longitude: null,
        capturedAt: null,
        deviceMake: null,
        deviceModel: null,
        rawMetadata: {},
      };
    }

    const lat = typeof rawParsed.latitude === 'number' ? rawParsed.latitude : null;
    const lng = typeof rawParsed.longitude === 'number' ? rawParsed.longitude : null;

    let capturedAtIso: string | null = null;
    const rawDate = rawParsed.DateTimeOriginal || rawParsed.CreateDate || rawParsed.ModifyDate;
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      capturedAtIso = rawDate.toISOString();
    } else if (typeof rawDate === 'string') {
      try {
        capturedAtIso = new Date(rawDate).toISOString();
      } catch {
        capturedAtIso = rawDate;
      }
    }

    const make = rawParsed.Make ? String(rawParsed.Make).trim() : null;
    const model = rawParsed.Model ? String(rawParsed.Model).trim() : null;

    // Filter out huge binary arrays or non-serializable fields from rawMetadata
    const sanitizedMeta: Record<string, any> = {};
    for (const [key, val] of Object.entries(rawParsed)) {
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        sanitizedMeta[key] = val;
      } else if (val instanceof Date) {
        sanitizedMeta[key] = val.toISOString();
      }
    }

    return {
      latitude: lat,
      longitude: lng,
      capturedAt: capturedAtIso,
      deviceMake: make,
      deviceModel: model,
      rawMetadata: sanitizedMeta,
    };
  } catch (err) {
    console.warn('[Forensics] EXIF extraction error or no EXIF present:', err);
    return {
      latitude: null,
      longitude: null,
      capturedAt: null,
      deviceMake: null,
      deviceModel: null,
      rawMetadata: {},
    };
  }
}

/**
 * Compresses an image file down to WebP (< 80 KB) with max dimension 1280px
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1280,
  targetMaxBytes = 80 * 1024
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Calculate initial resize ratio
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D context not available'));
      }

      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Iterative compression starting at quality 0.85
      let quality = 0.85;
      let currentBlob: Blob | null = null;

      const attemptCompression = async (): Promise<Blob> => {
        return new Promise((resBlob, rejBlob) => {
          canvas.toBlob(
            (b) => {
              if (b) resBlob(b);
              else rejBlob(new Error('Canvas toBlob failed'));
            },
            'image/webp',
            quality
          );
        });
      };

      try {
        currentBlob = await attemptCompression();

        while (currentBlob.size > targetMaxBytes && quality > 0.3) {
          quality -= 0.12;
          currentBlob = await attemptCompression();
        }

        // If still over 80KB, downscale canvas dimensions
        if (currentBlob.size > targetMaxBytes) {
          let scaleFactor = 0.8;
          while (currentBlob.size > targetMaxBytes && scaleFactor >= 0.4) {
            canvas.width = Math.round(width * scaleFactor);
            canvas.height = Math.round(height * scaleFactor);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            currentBlob = await attemptCompression();
            scaleFactor -= 0.15;
          }
        }

        // Generate data URL for preview
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            blob: currentBlob!,
            dataUrl: reader.result as string,
          });
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(currentBlob);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal memuat berkas gambar'));
    };

    img.src = objectUrl;
  });
}

/**
 * End-to-end Forensic Processing:
 * 1. Computes original SHA-256
 * 2. Extracts EXIF GPS & metadata
 * 3. Compresses image to WebP < 80 KB
 * 4. Computes compressed WebP SHA-256
 * 5. Compares OSM pin coordinates against EXIF GPS coordinates
 */
export async function processEvidenceImage(
  file: File,
  pinLat: number,
  pinLng: number
): Promise<ForensicProcessingResult> {
  // 1. Original SHA-256 & Size
  const originalArrayBuffer = await file.arrayBuffer();
  const originalFileSha256 = await computeSha256(originalArrayBuffer);
  const originalFileSize = file.size;

  // 2. EXIF Metadata Extraction
  const exif = await extractExifMetadata(file);

  // 3. Compress to WebP < 80KB
  const { blob: compressedBlob, dataUrl: compressedDataUrl } = await compressImageToWebP(
    file,
    1280,
    80 * 1024
  );
  const compressedArrayBuffer = await compressedBlob.arrayBuffer();
  const compressedFileSha256 = await computeSha256(compressedArrayBuffer);
  const compressedFileSize = compressedBlob.size;

  // 4. Geospatial and Temporal Consistency Check
  let distancePinVsExifMeters: number | null = null;
  let isMetadataConsistent = true;
  let consistencyReason = 'Metadata konsisten atau tidak ada geolokasi kamera tertanam.';

  if (exif.latitude != null && exif.longitude != null) {
    distancePinVsExifMeters = calculateHaversineDistance(
      pinLat,
      pinLng,
      exif.latitude,
      exif.longitude
    );

    if (distancePinVsExifMeters > 500) {
      isMetadataConsistent = false;
      consistencyReason = `Selisih jarak titik peta vs EXIF GPS foto melebihi 500m (${Math.round(
        distancePinVsExifMeters
      )} meter).`;
    }
  }

  // Check temporal consistency if capture time exists
  if (exif.capturedAt) {
    const captureTime = new Date(exif.capturedAt).getTime();
    const now = Date.now();
    const diffDays = Math.abs(now - captureTime) / (1000 * 60 * 60 * 24);

    if (diffDays > 30) {
      isMetadataConsistent = false;
      consistencyReason = `Foto diambil lebih dari 30 hari yang lalu (${exif.capturedAt}). Potensi bukti kedaluwarsa.`;
    }
  }

  return {
    originalFileSha256,
    originalFileSize,
    compressedFileSha256,
    compressedFileSize,
    compressedBlob,
    compressedDataUrl,
    exif,
    distancePinVsExifMeters,
    isMetadataConsistent,
    consistencyReason,
  };
}
