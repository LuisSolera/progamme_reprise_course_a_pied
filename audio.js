// audio.js — Real audio file playback.
// All sounds route through the media channel → headphones work, full volume.

// ── Sound file paths ────────────────────────────────────────────────────────
const SOUNDS = {
  preparation: './sounds/mixkit-start-match-countdown-1954.mp3',
  transition:  './sounds/universfield-error-011-352286.mp3',
  stepEnd:     './sounds/freesound_community-whistle-84607.mp3',
  sessionEnd:  './sounds/mixkit-police-whistle-614.mp3',
};

// ── Preload all sounds at startup ───────────────────────────────────────────
// Preloading ensures instant playback with no delay on mobile.
const audioCache = {};

export function preloadSounds() {
  for (const [key, src] of Object.entries(SOUNDS)) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioCache[key] = audio;
  }
}

/**
 * Plays a preloaded sound by key.
 * Resets to start so rapid consecutive calls always fire.
 * @param {string} key
 */
function play(key) {
  const audio = audioCache[key];
  if (!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Autoplay blocked — silently ignore (user hasn't interacted yet)
  });
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * 3-second preparation phase sound.
 * The file itself contains the countdown — play it once and let it run.
 * @param {function} onComplete  called after 3 seconds
 */
export function playPreparationPhase(onComplete) {
  play('preparation');
  setTimeout(onComplete, 3000);
}

/**
 * Played at the END of every step, just before the transition.
 */
export function playStepEnd() {
  play('stepEnd');
}

/**
 * Played during the 3-second transition between steps.
 */
export function playTransitionCue() {
  play('transition');
}

/**
 * Final sound when the whole session ends.
 */
export function playSessionEnd() {
  play('sessionEnd');
}