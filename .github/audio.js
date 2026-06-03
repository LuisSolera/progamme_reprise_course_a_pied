// audio.js — All audio concerns in one place.
// Uses a real AudioBuffer (short sine burst) so the OS routes through
// the media channel → headphones work, volume is full.

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

/**
 * Plays a single short beep.
 * @param {number} freq   — Hz, default 880
 * @param {number} duration — seconds, default 0.08
 * @param {number} volume  — 0–1, default 0.6
 */
export function playBeep(freq = 880, duration = 0.08, volume = 0.6) {
  const audioCtx = getCtx();

  // Resume context if suspended (required after user gesture on mobile)
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const frameCount = Math.ceil(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, frameCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    // Sine wave with linear fade-out envelope
    const t = i / audioCtx.sampleRate;
    const envelope = 1 - i / frameCount;
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}

/**
 * Plays three spaced beeps — the "tic tic tic" countdown cue.
 */
export function playCountdownCue() {
  playBeep(880, 0.09, 0.7);
  setTimeout(() => playBeep(880, 0.09, 0.7), 320);
  setTimeout(() => playBeep(1100, 0.12, 0.8), 640);
}

/**
 * Plays a completion chime — two ascending tones.
 */
export function playCompletionChime() {
  playBeep(660, 0.15, 0.7);
  setTimeout(() => playBeep(880, 0.25, 0.8), 200);
}