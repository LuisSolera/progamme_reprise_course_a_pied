// tracker-component.js
// Self-contained Vue 3 Tracker component.
// Emits: 'close', 'saved' (with sessionId)

import { buildSteps, formatClock, SESSIONS } from './session.js';
import { playCountdownCue, playCompletionChime } from './audio.js';

const { defineComponent, ref, computed, watch, onUnmounted } = Vue;

export const TrackerComponent = defineComponent({
  name: 'TrackerComponent',

  props: {
    sessionId: { type: String, required: true },
  },

  emits: ['close', 'saved'],

  setup(props, { emit }) {
    // ── State ───────────────────────────────────────────────────────────────
    const steps = buildSteps(SESSIONS[props.sessionId]);
    const totalSteps = steps.length;

    const currentIndex = ref(0);
    const remaining = ref(steps[0].duration);
    const paused = ref(false);
    const transitioning = ref(false); // true during 3-sec countdown
    const finished = ref(false);
    let timerId = null;

    // ── Computed ────────────────────────────────────────────────────────────
    const currentStep = computed(() => steps[currentIndex.value]);
    const stepLabel = computed(() => `Étape ${currentIndex.value + 1} sur ${totalSteps}`);
    const clockDisplay = computed(() => formatClock(remaining.value));
    const progressPct = computed(() =>
      ((currentStep.value.duration - remaining.value) / currentStep.value.duration) * 100
    );

    // ── Wake Lock ───────────────────────────────────────────────────────────
    let wakeLock = null;
    async function acquireWakeLock() {
      if ('wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
      }
    }
    
    function releaseWakeLock() { wakeLock?.release(); wakeLock = null; }
    acquireWakeLock();

    // ── Timer logic ─────────────────────────────────────────────────────────
    function startTick() {
      clearInterval(timerId);
      timerId = setInterval(tick, 1000);
    }

    function tick() {
      if (paused.value || transitioning.value) return;
      remaining.value -= 1;

      // 3 seconds left → trigger countdown cue and transition state
      if (remaining.value === 3 && !finished.value) {
        transitioning.value = true;
        playCountdownCue();
        setTimeout(advanceStep, 3000);
      }
    }

    function advanceStep() {
      transitioning.value = false;
      if (currentIndex.value >= totalSteps - 1) {
        finishSession();
        return;
      }
      currentIndex.value += 1;
      remaining.value = steps[currentIndex.value].duration;
    }

    function finishSession() {
      clearInterval(timerId);
      finished.value = true;
      playCompletionChime();
      releaseWakeLock();
    }

    // ── Controls ─────────────────────────────────────────────────────────────
    function togglePause() { paused.value = !paused.value; }

    function skipStep() {
      if (finished.value || transitioning.value) return;
      clearTimeout(timerId); // cancel any pending advance
      transitioning.value = false;
      advanceStep();
    }

    function saveSession() {
      emit('saved', props.sessionId);
      emit('close');
    }

    function close() {
      clearInterval(timerId);
      releaseWakeLock();
      emit('close');
    }

    // ── Start ────────────────────────────────────────────────────────────────
    startTick();
    onUnmounted(() => { clearInterval(timerId); releaseWakeLock(); });

    return {
      steps, totalSteps,
      currentIndex, remaining, paused, transitioning, finished,
      currentStep, stepLabel, clockDisplay, progressPct,
      togglePause, skipStep, saveSession, close,
    };
  },

  template: `
    <div class="tracker-overlay" @click.self="close" role="dialog" aria-modal="true" :aria-labelledby="'tracker-heading'">
      <div class="tracker-card">

        <!-- Header -->
        <div class="tracker-header">
          <span class="tracker-step-counter">{{ stepLabel }}</span>
          <button class="tracker-close-btn" @click="close" aria-label="Fermer">✕</button>
        </div>

        <!-- Step type badge -->
        <div>
          <span class="tracker-type-badge" :data-type="currentStep.type">
            {{ currentStep.type === 'jog' ? '🏃 Course' : '🚶 Marche' }}
          </span>
        </div>

        <!-- Clock -->
        <div
          class="tracker-clock"
          :class="{ 'is-transitioning': transitioning, 'is-jog': currentStep.type === 'jog' }"
          aria-live="polite"
          :id="'tracker-heading'"
        >
          {{ clockDisplay }}
        </div>

        <!-- Step labels -->
        <div class="tracker-step-info">
          <p class="tracker-step-label">{{ currentStep.label }}</p>
          <p class="tracker-step-detail">{{ currentStep.detail }}</p>
        </div>

        <!-- Progress bar -->
        <div class="tracker-progress-track" role="progressbar" :aria-valuenow="Math.round(progressPct)" aria-valuemin="0" aria-valuemax="100">
          <div class="tracker-progress-fill" :style="{ width: progressPct + '%' }" :data-type="currentStep.type"></div>
        </div>

        <!-- Step dots -->
        <div class="tracker-dots" aria-hidden="true">
          <span
            v-for="(step, i) in steps"
            :key="i"
            class="tracker-dot"
            :class="{
              'is-done': i < currentIndex,
              'is-current': i === currentIndex,
              'is-jog': step.type === 'jog'
            }"
          ></span>
        </div>

        <!-- Controls -->
        <div class="tracker-controls" v-if="!finished">
          <button class="btn-pause" @click="togglePause">
            {{ paused ? '▶ Reprendre' : '⏸ Pause' }}
          </button>
          <button class="btn-skip" @click="skipStep" :disabled="transitioning">
            Passer →
          </button>
        </div>

        <!-- Save button (only when finished) -->
        <button v-if="finished" class="btn-save" @click="saveSession">
          ✅ Terminer et sauvegarder
        </button>

      </div>
    </div>
  `,
});