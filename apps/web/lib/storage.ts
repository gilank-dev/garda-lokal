import { LocalReportTicket } from './types';

const STORAGE_KEY = 'garda_reporter_tickets_v1';

export function getLocalTickets(): LocalReportTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse local tickets from storage:', err);
    return [];
  }
}

export function saveLocalTicket(ticket: LocalReportTicket): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const filtered = existing.filter((t) => t.id !== ticket.id);
    const updated = [ticket, ...filtered];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save local ticket:', err);
  }
}

export function updateLocalTicket(id: string, updates: Partial<LocalReportTicket>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const updated = existing.map((t) => (t.id === id ? { ...t, ...updates } : t));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to update local ticket:', err);
  }
}

export function removeLocalTicket(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getLocalTickets();
    const updated = existing.filter((t) => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove local ticket:', err);
  }
}
