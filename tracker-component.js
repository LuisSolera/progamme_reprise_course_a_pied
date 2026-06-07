// tracker-component.js
// Vue 3 Tracker component.
// Emits: 'close', 'saved' (with sessionId)

import { buildSteps, formatClock, SESSIONS } from './session.js';
import {
  playPreparationPhase,
  playStepEnd,
  playTransitionCue,
  playSessionEnd,
} from './audio.js';

const { defineComponent, ref, computed, onUnmounted } = Vue;

// ── Phase constants ────────────────────────────────────────────────────────
const Phase = Object.freeze({
  PREP:       'prep',       // 3-second preparation before session starts
  RUNNING:    'running',    // step countdown active
  TRANSITION: 'transition', // 3-second gap between steps
  FINISHED:   'finished',   // all steps done
});

const TRANSITION_SECONDS = 3;

export const TrackerComponent = defineComponent({
  name: 'TrackerComponent',

  props: {
    sessionId: { type: String, required: true },
  },

  emits: ['close', 'saved'],

  setup(props, { emit }) {
    // ── Steps ──────────────────────────────────────────────────────────────
    const steps = buildSteps(SESSIONS[props.sessionId]);
    const totalSteps = steps.length;

    // ── State ──────────────────────────────────────────────────────────────
    const phase = ref(Phase.PREP);
    const currentIndex = ref(0);
    const remaining = ref(steps[0].duration);
    const transitionRemaining = ref(TRANSITION_SECONDS);
    const paused = ref(false);
    let timerId = null;

    // ── Computed ───────────────────────────────────────────────────────────
    const currentStep    = computed(() => steps[currentIndex.value]);
    const stepLabel      = computed(() => `Étape ${currentIndex.value + 1} sur ${totalSteps}`);
    const isFinished     = computed(() => phase.value === Phase.FINISHED);
    const isPrep         = computed(() => phase.value === Phase.PREP);
    const isTransition   = computed(() => phase.value === Phase.TRANSITION);
    const isRunning      = computed(() => phase.value === Phase.RUNNING);

    const clockDisplay = computed(() => {
      if (isPrep.value)        return formatClock(3);
      if (isTransition.value)  return formatClock(transitionRemaining.value);
      if (isFinished.value)    return '0:00';
      return formatClock(remaining.value);
    });

    const progressPct = computed(() => {
      if (!isRunning.value) return 0;
      return ((currentStep.value.duration - remaining.value) / currentStep.value.duration) * 100;
    });

    // ── Wake Lock ──────────────────────────────────────────────────────────
    let wakeLock = null;
    async function acquireWakeLock() {
      if ('wakeLock' in navigator) {
        try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
      }
    }
    function releaseWakeLock() { wakeLock?.release(); wakeLock = null; }
    acquireWakeLock();

    // ── Timer ──────────────────────────────────────────────────────────────
    function startTick() {
      clearInterval(timerId);
      timerId = setInterval(tick, 1000);
    }

    function tick() {
      if (paused.value) return;

      if (isTransition.value) {
        transitionRemaining.value -= 1;
        if (transitionRemaining.value <= 0) startStep();
        return;
      }

      if (isRunning.value) {
        remaining.value -= 1;
        if (remaining.value <= 0) endStep();
      }
    }

    // ── Session flow ───────────────────────────────────────────────────────

    /** Called once the preparation phase completes. */
    function startSession() {
      phase.value = Phase.RUNNING;
      startTick();
    }

    /** Step countdown hits zero — play end sound, begin transition. */
    function endStep() {
      playStepEnd();
      if (currentIndex.value >= totalSteps - 1) {
        finishSession();
        return;
      }
      beginTransition();
    }

    /** 3-second gap between steps. */
    function beginTransition() {
      phase.value = Phase.TRANSITION;
      transitionRemaining.value = TRANSITION_SECONDS;
      playTransitionCue();
    }

    /** Transition ends — move to next step and start its countdown. */
    function startStep() {
      currentIndex.value += 1;
      remaining.value = steps[currentIndex.value].duration;
      phase.value = Phase.RUNNING;
    }

    /** All steps done. */
    function finishSession() {
      clearInterval(timerId);
      phase.value = Phase.FINISHED;
      playSessionEnd();
      releaseWakeLock();
    }

    // ── Controls ───────────────────────────────────────────────────────────
    function togglePause() {
      if (isFinished.value || isPrep.value) return;
      paused.value = !paused.value;
    }

    function skipStep() {
      if (isFinished.value || isPrep.value) return;
      clearInterval(timerId);
      // If in transition, skip directly to next step start
      if (isTransition.value) {
        startStep();
        startTick();
        return;
      }
      // If running, treat as step end
      endStep();
      if (!isFinished.value) startTick();
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

    // ── Start — 3-second preparation phase ────────────────────────────────
    playPreparationPhase(startSession);

    onUnmounted(() => { clearInterval(timerId); releaseWakeLock(); });

    return {
      steps, totalSteps,
      phase, Phase,
      currentIndex, remaining, transitionRemaining, paused,
      currentStep, stepLabel, clockDisplay, progressPct,
      isFinished, isPrep, isTransition, isRunning,
      togglePause, skipStep, saveSession, close,
    };
  },

  template: `
    <div class="tracker-overlay" @click.self="close" role="dialog" aria-modal="true" aria-labelledby="tracker-heading">
      <div class="tracker-card">

        <!-- Header -->
        <div class="tracker-header">
          <span class="tracker-step-counter">{{ stepLabel }}</span>
          <button class="tracker-close-btn" @click="close" aria-label="Fermer">✕</button>
        </div>

        <!-- Phase label / type badge -->
        <div>
          <span v-if="isPrep" class="tracker-type-badge" data-type="prep">⏱ Préparation</span>
          <span v-else-if="isTransition" class="tracker-type-badge" data-type="transition">↔ Transition</span>
          <span v-else class="tracker-type-badge" :data-type="currentStep.type">
            {{ currentStep.type === 'jog' ? '🏃 Course' : '🚶 Marche' }}
          </span>
        </div>

        <!-- Clock -->
        <div
          id="tracker-heading"
          class="tracker-clock"
          :class="{
            'is-jog':        isRunning && currentStep.type === 'jog',
            'is-transition': isTransition || isPrep,
            'is-finished':   isFinished
          }"
          aria-live="polite"
        >
          {{ clockDisplay }}
        </div>

        <!-- Step info -->
        <div class="tracker-step-info">
          <p class="tracker-step-label">
            <template v-if="isPrep">Préparez-vous…</template>
            <template v-else-if="isTransition">Prochaine étape dans…</template>
            <template v-else>{{ currentStep.label }}</template>
          </p>
          <p class="tracker-step-detail">
            <template v-if="isPrep || isTransition">&nbsp;</template>
            <template v-else>{{ currentStep.detail }}</template>
          </p>
        </div>

        <!-- Progress bar (only during active step) -->
        <div
          class="tracker-progress-track"
          role="progressbar"
          :aria-valuenow="Math.round(progressPct)"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="tracker-progress-fill"
            :style="{ width: progressPct + '%' }"
            :data-type="currentStep.type"
          ></div>
        </div>

        <!-- Step dots -->
        <div class="tracker-dots" aria-hidden="true">
          <span
            v-for="(step, i) in steps"
            :key="i"
            class="tracker-dot"
            :class="{
              'is-done':    i < currentIndex,
              'is-current': i === currentIndex && !isPrep,
              'is-jog':     step.type === 'jog'
            }"
          ></span>
        </div>

        <!-- Controls -->
        <div class="tracker-controls" v-if="!isFinished && !isPrep">
          <button class="btn-pause" @click="togglePause">
            {{ paused ? '▶ Reprendre' : '⏸ Pause' }}
          </button>
          <button class="btn-skip" @click="skipStep">
            Passer →
          </button>
        </div>

        <!-- Save (only when finished) -->
        <button v-if="isFinished" class="btn-save" @click="saveSession">
          ✅ Terminer et sauvegarder
        </button>

      </div>
    </div>
  `,
});