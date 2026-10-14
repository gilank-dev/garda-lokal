import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 1. PUBLIC CLIENT (For client components and public reads)
let publicClientInstance: SupabaseClient | null = null;

export function getSupabasePublicClient(): SupabaseClient {
  if (publicClientInstance) return publicClientInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-garda.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  publicClientInstance = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return publicClientInstance;
}

// 2. SERVER ADMIN CLIENT (For Server Actions and API routes with Service Role Key)
export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder-garda.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-service-key';

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// 3. HMAC-SHA256 SIGNING UTILITY FOR VPS WEBHOOK
export interface SignedWebhookPayload {
  headers: {
    'Content-Type': string;
    'X-Garda-Timestamp': string;
    'X-Garda-Signature': string;
  };
  rawBody: string;
}

export function signVpsWebhookPayload(payload: any, secret?: string): SignedWebhookPayload {
  const sharedSecret = secret || process.env.SHARED_VPS_SECRET || 'garda_secret_2026_dev';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = JSON.stringify(payload);

  const signature = crypto
    .createHmac('sha256', sharedSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  return {
    headers: {
      'Content-Type': 'application/json',
      'X-Garda-Timestamp': timestamp,
      'X-Garda-Signature': signature,
    },
    rawBody,
  };
}

// 4. DISPATCH REPORT TO VPS QUEUE WORKER
export async function dispatchReportToVpsQueue(jobData: {
  reportId: string;
  rawReporterInput: string;
  category: string;
  temporalContext: string;
  latitude: number;
  longitude: number;
  addressRoad?: string | null;
  addressSubdistrict?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressProvince?: string | null;
  locationLandmark?: string | null;
  reporterTokenHash?: string | null;
  status?: string;
  forensics?: any;
}): Promise<{ success: boolean; status: number; message: string; data?: any }> {
  const webhookUrl = process.env.VPS_QUEUE_WEBHOOK_URL || 'http://5.22.209.52:4000/api/queue-report';
  const { headers, rawBody } = signVpsWebhookPayload(jobData);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for queue submission

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: rawBody,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json().catch(() => ({}));

    if (res.status === 202 || res.status === 200) {
      return {
        success: true,
        status: res.status,
        message: json.message || 'Laporan berhasil masuk antrean intelijen VPS.',
        data: json,
      };
    }

    return {
      success: false,
      status: res.status,
      message: json.error || `VPS responded with status ${res.status}`,
    };
  } catch (err: any) {
    console.warn('[VPS Webhook] Could not reach VPS Queue worker:', err.message);
    return {
      success: false,
      status: 503,
      message: `VPS tidak dapat dijangkau (${err.name || 'Connection Error'}). Laporan tetap tersimpan di database lokal.`,
    };
  }
}

// 5. FETCH SINGLE REPORT FROM VPS PERSISTENT REPOSITORY
export async function fetchReportFromVps(reportId: string): Promise<{ report: any; forensics: any } | null> {
  const webhookUrl = process.env.VPS_QUEUE_WEBHOOK_URL || 'http://5.22.209.52:4000/api/queue-report';
  const baseUrl = webhookUrl.replace(/\/api\/queue-report\/?$/, '');
  const url = `${baseUrl}/api/reports/${reportId}`;

  const sharedSecret = process.env.SHARED_VPS_SECRET || 'garda_secret_2026_dev';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = crypto
    .createHmac('sha256', sharedSecret)
    .update(`${timestamp}.`)
    .digest('hex');

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Garda-Timestamp': timestamp,
        'X-Garda-Signature': signature,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
    return null;
  } catch (err: any) {
    console.warn(`[VPS Fetch Error] Could not fetch report ${reportId} from VPS:`, err.message);
    return null;
  }
}

// 6. FETCH ALL REPORTS FROM VPS PERSISTENT REPOSITORY
export async function fetchReportsFromVps(): Promise<any[] | null> {
  const webhookUrl = process.env.VPS_QUEUE_WEBHOOK_URL || 'http://5.22.209.52:4000/api/queue-report';
  const baseUrl = webhookUrl.replace(/\/api\/queue-report\/?$/, '');
  const url = `${baseUrl}/api/reports`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      return data.reports || null;
    }
    return null;
  } catch (err: any) {
    console.warn('[VPS Fetch All Error] Could not fetch reports list from VPS:', err.message);
    return null;
  }
}

