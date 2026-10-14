// Synthetic Tactical Audio & Haptic Feedback using Web Audio API
// Zero external MP3/audio assets - 100% offline-ready & data-saving

const AUDIO_STORAGE_KEY = 'garda_tactical_audio_muted';

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(AUDIO_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, muted ? 'true' : 'false');
    // Dispatch custom event so all components update in real-time
    window.dispatchEvent(new CustomEvent('garda-audio-toggle', { detail: { muted } }));
  } catch (e) {
    console.warn('Failed to save audio muted preference:', e);
  }
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    return new AudioContextClass();
  } catch {
    return null;
  }
}

/**
 * Tactical click: snappy transient click for button taps
 */
export function playTacticalClick(): void {
  if (isAudioMuted()) return;
  triggerHaptic(20);

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch (e) {
    console.warn('Audio click error:', e);
  }
}

/**
 * Radar ping: subtle sonar chirp for radar/map and updates
 */
export function playRadarPing(): void {
  if (isAudioMuted()) return;
  triggerHaptic([25, 40, 25]);

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 note
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.warn('Radar ping error:', e);
  }
}

/**
 * Tactical Success: confirmation tone (two-tone alert)
 */
export function playSuccessChime(): void {
  if (isAudioMuted()) return;
  triggerHaptic([30, 60, 40]);

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.07); // E5

    osc2.frequency.setValueAtTime(659.25, ctx.currentTime);
    osc2.frequency.setValueAtTime(783.99, ctx.currentTime + 0.07); // G5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.22);
    osc2.stop(ctx.currentTime + 0.22);
  } catch (e) {
    console.warn('Success chime error:', e);
  }
}

/**
 * Warning / Caution beep: for validation error or alert
 */
export function playWarningTone(): void {
  if (isAudioMuted()) return;
  triggerHaptic([50, 40, 50]);

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, ctx.currentTime);
    osc.frequency.setValueAtTime(320, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {
    console.warn('Warning tone error:', e);
  }
}

/**
 * Emergency Siren: synthesized urgent warble when Urgency >= 80
 */
export function playEmergencySiren(): void {
  if (isAudioMuted()) return;
  triggerHaptic([80, 50, 80, 50, 120]);

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    // Frequency warble (880Hz down to 550Hz, then back to 780Hz)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(550, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(820, ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.warn('Emergency siren error:', e);
  }
}

/**
 * Haptic feedback trigger for mobile devices
 */
export function triggerHaptic(pattern: number | number[] = 30): void {
  if (typeof window === 'undefined') return;
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Haptics not allowed or unsupported
    }
  }
}
