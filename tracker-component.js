// tracker-component.js
// Vue 3 Tracker component.
// Emits: 'close', 'saved' (with sessionId)

import { buildSteps, formatClock, SESSIONS } from './session.js';
import {
  playPreparationPhase,
  playStepEnd,
  playTransitionCue,
  cancelTransition,
  playSessionEnd,
} from './audio.js';

const { defineComponent, ref, computed, onUnmounted } = Vue;

const Phase = Object.freeze({
  PREP:     'prep',
  RUNNING:  'running',
  FINISHED: 'finished',
});

export const TrackerComponent = defineComponent({
  name: 'TrackerComponent',
  props: { sessionId: { type: String, required: true } },
  emits: ['close', 'saved'],

  setup(props, { emit }) {
    const steps      = buildSteps(SESSIONS[props.sessionId]);
    const totalSteps = steps.length;

    const phase           = ref(Phase.PREP);
    const currentIndex    = ref(0);
    const remaining       = ref(steps[0].duration);
    const paused          = ref(false);
    const waitingForSound = ref(false);
    let timerId           = null;

    const currentStep  = computed(() => steps[currentIndex.value]);
    const stepLabel    = computed(() => `Étape ${currentIndex.value + 1} sur ${totalSteps}`);
    const isFinished   = computed(() => phase.value === Phase.FINISHED);
    const isPrep       = computed(() => phase.value === Phase.PREP);
    const isRunning    = computed(() => phase.value === Phase.RUNNING);
    const clockDisplay = computed(() => formatClock(remaining.value));
    const progressPct  = computed(() => {
      if (!isRunning.value || waitingForSound.value) return 0;
      return ((currentStep.value.duration - remaining.value) / currentStep.value.duration) * 100;
    });

    let wakeLock = null;
    async function acquireWakeLock() {
      if ('wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
      }
    }
    function releaseWakeLock() { wakeLock?.release(); wakeLock = null; }
    acquireWakeLock();

    function startTick() {
      clearInterval(timerId);
      timerId = setInterval(tick, 1000);
    }

    function tick() {
      if (paused.value || waitingForSound.value || !isRunning.value) return;
      remaining.value -= 1;
      if (remaining.value <= 0) endStep();
    }

    function startSession() {
      phase.value = Phase.RUNNING;
      startTick();
    }

    function endStep() {
      clearInterval(timerId);
      playStepEnd();
      if (currentIndex.value >= totalSteps - 1) { finishSession(); return; }

      // Advance display to next step immediately
      currentIndex.value += 1;
      remaining.value = steps[currentIndex.value].duration;

      // Freeze countdown until transition sound ends
      waitingForSound.value = true;
      playTransitionCue(() => {
        waitingForSound.value = false;
        startTick();
      });
    }

    function finishSession() {
      phase.value = Phase.FINISHED;
      playSessionEnd();
      releaseWakeLock();
    }

    function togglePause() {
      if (!isRunning.value) return;
      paused.value = !paused.value;
    }

    function skipStep() {
      if (isFinished.value || isPrep.value) return;
      if (waitingForSound.value) {
        cancelTransition();
        waitingForSound.value = false;
        startTick();
        return;
      }
      clearInterval(timerId);
      endStep();
    }

    function saveSession() { emit('saved', props.sessionId); emit('close'); }
    function close() { clearInterval(timerId); releaseWakeLock(); emit('close'); }

    playPreparationPhase(startSession);
    onUnmounted(() => { clearInterval(timerId); releaseWakeLock(); });

    return {
      steps, totalSteps, phase, Phase,
      currentIndex, remaining, paused, waitingForSound,
      currentStep, stepLabel, clockDisplay, progressPct,
      isFinished, isPrep, isRunning,
      togglePause, skipStep, saveSession, close,
    };
  },

  template: `
    <div class="tracker-overlay" @click.self="close" role="dialog" aria-modal="true" aria-labelledby="tracker-heading">
      <div class="tracker-card">

        <div class="tracker-header">
          <span class="tracker-step-counter">{{ stepLabel }}</span>
          <button class="tracker-close-btn" @click="close" aria-label="Fermer">✕</button>
        </div>

        <div>
          <span v-if="isPrep" class="tracker-type-badge" data-type="prep">⏱ Préparation</span>
          <span v-else class="tracker-type-badge" :data-type="currentStep.type">
            {{ currentStep.type === 'jog' ? '🏃 Course' : '🚶 Marche' }}
          </span>
        </div>

        <div
          id="tracker-heading"
          class="tracker-clock"
          :class="{ 'is-jog': !isPrep && currentStep.type === 'jog' }"
          aria-live="polite"
        >
          <template v-if="!isPrep && !isFinished">{{ clockDisplay }}</template>
        </div>

        <div class="tracker-step-info">
          <p class="tracker-step-label">
            <template v-if="isPrep">Préparez-vous…</template>
            <template v-else-if="isFinished">Séance terminée !</template>
            <template v-else>{{ currentStep.label }}</template>
          </p>
          <p class="tracker-step-detail">
            <template v-if="isPrep || isFinished">&nbsp;</template>
            <template v-else>{{ currentStep.detail }}</template>
          </p>
        </div>

        <div
          class="tracker-progress-track"
          role="progressbar"
          :aria-valuenow="Math.round(progressPct)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="tracker-progress-fill" :style="{ width: progressPct + '%' }" :data-type="currentStep.type"></div>
        </div>

        <div class="tracker-dots" aria-hidden="true">
          <span
            v-for="(step, i) in steps" :key="i"
            class="tracker-dot"
            :class="{ 'is-done': i < currentIndex, 'is-current': i === currentIndex && !isPrep, 'is-jog': step.type === 'jog' }"
          ></span>
        </div>

        <div class="tracker-controls" v-if="!isFinished && !isPrep">
          <button class="btn-pause" @click="togglePause" :disabled="waitingForSound">
            {{ paused ? '▶ Reprendre' : '⏸ Pause' }}
          </button>
          <button class="btn-skip" @click="skipStep">Passer →</button>
        </div>

        <button v-if="isFinished" class="btn-save" @click="saveSession">
          ✅ Terminer et sauvegarder
        </button>

      </div>
    </div>
  `,
});