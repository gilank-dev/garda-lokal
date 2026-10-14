export type IncidentCategory = 'BENTROK' | 'PERUNDUNGAN' | 'MIRAS_NARKOBA' | 'LAINNYA';

export type TemporalStatus = 'SEDANG_BERLANGSUNG' | 'RENCANA_MENDATANG' | 'KEJADIAN_LAMPAU';

export type ReportStatus =
  | 'BARU'
  | 'DITINDAKLANJUTI'
  | 'BUTUH_INFO_PELAPOR'
  | 'SELESAI'
  | 'INDIKASI_PALSU'
  | 'RAW_UNPROCESSED';

export type AuditActionType =
  | 'READ_DETAIL'
  | 'CHANGE_STATUS'
  | 'ADD_NOTE'
  | 'SEND_MESSAGE_TO_REPORTER';

export interface ExtractedEntities {
  involved_persons_full_names: string[];
  weapons_or_substances: string[];
  specific_landmarks: string[];
  estimated_headcount: string | null;
}

export interface Report {
  id: string;
  cluster_parent_id: string | null;
  reporter_token_hash: string;
  category: IncidentCategory;
  temporal_context: TemporalStatus;
  status: ReportStatus;
  urgency_score: number;
  credibility_score: number;
  is_potential_hoax: boolean;
  hoax_reason: string | null;
  raw_reporter_input: string;
  public_masked_summary: string;
  admin_full_narrative: string | null;
  extracted_entities: ExtractedEntities | null;
  tactical_recommendation: string | null;
  latitude: number;
  longitude: number;
  address_road: string | null;
  address_subdistrict: string | null;
  address_district: string | null;
  address_city: string | null;
  address_province: string | null;
  location_landmark: string | null;
  cluster_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReportForensics {
  id: string;
  report_id: string;
  reporter_ip: string | null;
  user_agent: string | null;
  device_platform: string | null;
  compressed_image_path: string | null;
  original_file_sha256: string | null;
  compressed_file_sha256: string | null;
  exif_metadata: Record<string, any>;
  exif_gps_latitude: number | null;
  exif_gps_longitude: number | null;
  exif_captured_at: string | null;
  distance_pin_vs_exif_meters: number | null;
  is_metadata_consistent: boolean;
  media_purged_at: string | null;
  created_at: string;
}

export interface ReportMessage {
  id: string;
  report_id: string;
  sender_role: 'ADMIN' | 'REPORTER';
  admin_email: string | null;
  message_text: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  report_id: string;
  admin_user_id: string;
  admin_email: string;
  action_type: AuditActionType;
  previous_status: ReportStatus | null;
  new_status: ReportStatus | null;
  mandatory_note: string;
  client_ip: string | null;
  created_at: string;
}

export interface LocalReportTicket {
  id: string;
  token: string;
  tokenHash: string;
  category: IncidentCategory;
  createdAt: string;
  publicSummary: string;
  status: ReportStatus;
  hasUnreadAdminMessage?: boolean;
}

export interface NominatimAddress {
  road?: string;
  village?: string;
  suburb?: string;
  quarter?: string;
  neighbourhood?: string;
  subdistrict?: string;
  district?: string;
  city?: string;
  town?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface NominatimReverseResult {
  place_id?: number;
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
}

export interface ReportFilter {
  status?: string;
  category?: string;
  sortBy?: 'urgency' | 'created_at';
}

export interface CreateReportInput {
  category: IncidentCategory;
  temporalContext: TemporalStatus;
  rawReporterInput: string;
  locationLandmark?: string | null;
  latitude: number;
  longitude: number;
  addressRoad?: string | null;
  addressSubdistrict?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  reporterToken: string;
  imageWebpBase64?: string | null;
  originalFileSha256?: string | null;
  compressedFileSha256?: string | null;
  exifMetadata?: Record<string, any>;
  exifGpsLatitude?: number | null;
  exifGpsLongitude?: number | null;
  exifCapturedAt?: string | null;
  distancePinVsExifMeters?: number | null;
  isMetadataConsistent?: boolean;
  clientIp?: string;
  userAgent?: string;
  devicePlatform?: string;
}

