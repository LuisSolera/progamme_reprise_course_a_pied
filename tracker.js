import { buildSteps, SESSIONS } from './session.js';

// ── Audio: tic tic tic via Web Audio API ─────────────────────────────────────
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTic() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

function playTicTicTic() {
  playTic();
  setTimeout(playTic, 350);
  setTimeout(playTic, 700);
}

// ── State ─────────────────────────────────────────────────────────────────────
let steps = [];
let currentStep = 0;
let remaining = 0;
let paused = false;
let intervalId = null;
let onSaveCallback = null;
let sessionId = null;
let countingDown = false;

// ── DOM references ────────────────────────────────────────────────────────────
const overlay = document.getElementById('tracker-overlay');
const stepLabel = document.getElementById('tracker-step-label');
const stepDetail = document.getElementById('tracker-step-detail');
const stepCounter = document.getElementById('tracker-step-counter');
const clock = document.getElementById('tracker-clock');
const progressBar = document.getElementById('tracker-progress-bar');
const progressFill = document.getElementById('tracker-progress-fill');
const btnPause = document.getElementById('tracker-pause');
const btnSkip = document.getElementById('tracker-skip');
const btnSave = document.getElementById('tracker-save');
const btnClose = document.getElementById('tracker-close');
const stepType = document.getElementById('tracker-step-type');

// ── Public API ────────────────────────────────────────────────────────────────
export function openTracker(sid, onSave) {
  const def = SESSIONS[sid];
  if (!def) return;
  
  sessionId = sid;
  onSaveCallback = onSave;
  steps = buildSteps(def);
  currentStep = 0;
  paused = false;
  btnSave.hidden = true;
  overlay.hidden = false;
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  startStep(0);
}

export function closeTracker() {
  stopTimer();
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// ── Internal ──────────────────────────────────────────────────────────────────
function startStep(index) {
  stopTimer();
  currentStep = index;
  const step = steps[index];
  remaining = step.duration;
  countingDown = false;

  stepLabel.textContent = step.label;
  stepDetail.textContent = step.detail;
  stepCounter.textContent = `Étape ${index + 1} sur ${steps.length}`;
  stepType.dataset.type = step.type;
  stepType.textContent = step.type === 'jog' ? '🏃 Course' : '🚶 Marche';
  btnSave.hidden = true;
  btnSkip.disabled = false;
  btnPause.textContent = 'Pause';
  paused = false;

  updateClock();
  updateProgressBar();
  runTimer();
}

function runTimer() {
  intervalId = setInterval(() => {
    if (paused) return;

    // 3-second countdown before advancing
    if (remaining <= 3 && !countingDown) {
      countingDown = true;
      playTicTicTic();
      clock.classList.add('countdown');
    }

    remaining--;
    updateClock();
    updateProgressBar();

    if (remaining <= 0) {
      stopTimer();
      clock.classList.remove('countdown');
      advance();
    }
  }, 1000);
}

function advance() {
  if (currentStep + 1 < steps.length) {
    startStep(currentStep + 1);
  } else {
    finishSession();
  }
}

function finishSession() {
  stopTimer();
  stepLabel.textContent = 'Séance terminée !';
  stepDetail.textContent = 'Bravo ! Vous avez complété toute la séance.';
  stepCounter.textContent = `${steps.length} étapes complétées`;
  stepType.textContent = '✅ Terminé';
  clock.textContent = '0:00';
  progressFill.style.width = '100%';
  btnPause.disabled = true;
  btnSkip.disabled = true;
  btnSave.hidden = false;
}

function stopTimer() {
  clearInterval(intervalId);
  intervalId = null;
}

function updateClock() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  clock.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

function updateProgressBar() {
  const step = steps[currentStep];
  const pct = ((step.duration - remaining) / step.duration) * 100;
  progressFill.style.width = `${pct}%`;
}

// ── Event listeners ───────────────────────────────────────────────────────────
btnPause.addEventListener('click', () => {
  paused = !paused;
  btnPause.textContent = paused ? 'Reprendre' : 'Pause';
});

btnSkip.addEventListener('click', () => {
  stopTimer();
  clock.classList.remove('countdown');
  advance();
});

btnSave.addEventListener('click', async () => {
  btnSave.disabled = true;
  btnSave.textContent = 'Sauvegarde…';
  await onSaveCallback(sessionId);
  closeTracker();
});

btnClose.addEventListener('click', closeTracker);

overlay.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeTracker();
});
