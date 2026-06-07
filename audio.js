// audio.js — All audio concerns in one place.
// Uses AudioBuffer (sine bursts) — routes through media channel → headphones work.

let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

/**
 * Plays a single beep.
 * @param {number} freq      Hz
 * @param {number} duration  seconds
 * @param {number} volume    0–1
 */
export function playBeep(freq = 880, duration = 0.1, volume = 0.7) {
  const audioCtx = getCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const frameCount = Math.ceil(audioCtx.sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, frameCount, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < frameCount; i++) {
    const t = i / audioCtx.sampleRate;
    const envelope = 1 - i / frameCount; // linear fade-out
    data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * volume;
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start();
}

/**
 * 3-second preparation phase: short beep on s1 and s2, long beep on s3.
 * @param {function} onComplete  called when the 3 seconds are done
 */
export function playPreparationPhase(onComplete) {
  playBeep(660, 0.12, 0.7);                          // s1 — short
  setTimeout(() => playBeep(660, 0.12, 0.7), 1000);  // s2 — short
  setTimeout(() => {
    playBeep(880, 0.5, 0.9);                          // s3 — long
    setTimeout(onComplete, 1000);                     // start after s3 finishes
  }, 2000);
}

/**
 * Played at the START of every step (walk or jog).
 */
export function playStepStart() {
  playBeep(880, 0.12, 0.75);
}

/**
 * Played at the END of every step, just before the transition.
 */
export function playStepEnd() {
  playBeep(660, 0.18, 0.75);
}

/**
 * 3-second transition between steps: three evenly spaced ascending ticks.
 */
export function playTransitionCue() {
  playBeep(700, 0.09, 0.6);
  setTimeout(() => playBeep(780, 0.09, 0.65), 1000);
  setTimeout(() => playBeep(880, 0.09, 0.7),  2000);
}

/**
 * Final long sound when the whole session ends.
 */
export function playSessionEnd() {
  playBeep(660, 0.15, 0.8);
  setTimeout(() => playBeep(780, 0.15, 0.8), 200);
  setTimeout(() => playBeep(1050, 0.6, 0.9), 450);
}