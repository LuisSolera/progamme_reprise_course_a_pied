const SOUNDS = {
  begin:      './sounds/mixkit-start-match-countdown-1954.mp3',
  transition: './sounds/universfield-error-011-352286.mp3',
  sessionEnd: './sounds/mixkit-police-whistle-614.mp3',
};

const audioCache = {};

export function preloadSounds() {
  for (const [key, src] of Object.entries(SOUNDS)) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioCache[key] = audio;
  }
}

function play(key, onEnded) {
  const audio = audioCache[key];
  if (!audio) { onEnded?.(); return; }
  audio.currentTime = 0;
  audio.onended = onEnded ? () => onEnded() : null;
  audio.play().catch(() => onEnded?.());
}

export function playBeginSound(onComplete) {
  play('begin', onComplete);
}

export function playTransitionCue(onEnded) {
  play('transition', onEnded);
}

export function cancelTransition() {
  const audio = audioCache['transition'];
  if (!audio) return;
  audio.onended = null;
  audio.pause();
  audio.currentTime = 0;
}

export function playSessionEnd() {
  play('sessionEnd');
}