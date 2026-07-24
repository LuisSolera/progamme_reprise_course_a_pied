import { buildSteps, formatClock, SESSIONS } from './session.js';
import { playBeginSound, playTransitionCue, cancelTransition, playSessionEnd, resumeAudioContext} from './audio.js';

const { defineComponent, ref, computed, onUnmounted } = Vue;

const Phase = Object.freeze({ RUNNING: 'running', FINISHED: 'finished' });

export const TrackerComponent = defineComponent({
  name: 'TrackerComponent',
  props: { sessionId: { type: String, required: true } },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const steps = buildSteps(SESSIONS[props.sessionId]);
    const totalSteps = steps.length;

    const phase = ref(null);
    const currentIndex = ref(0);
    const remaining = ref(steps[0].duration);
    const paused = ref(false);
    const waitingForSound = ref(false);
    let timerId = null;

    const currentStep = computed(() => steps[currentIndex.value]);
    const nextStep = computed(() => steps[currentIndex.value + 1] || null);
    const isFinished = computed(() => phase.value === Phase.FINISHED);
    const isRunning = computed(() => phase.value === Phase.RUNNING);
    const clockDisplay = computed(() => formatClock(remaining.value));
    const phaseType = computed(() => currentStep.value?.type === 'jog' ? 'run' : 'walk');
    const phaseLabel = computed(() => {
      if (!currentStep.value) return '';
      if (currentStep.value.label?.toLowerCase().includes('warm')) return 'WARM UP';
      return currentStep.value.type === 'jog' ? 'RUN' : 'WALK';
    });

    let wakeLock = null;
    async function acquireWakeLock() {
      if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {} }
    }

    function releaseWakeLock() { wakeLock?.release(); wakeLock = null; }
    acquireWakeLock();

    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && isRunning.value) {
        await acquireWakeLock();
        resumeAudioContext();
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    function startTick() { clearInterval(timerId); timerId = setInterval(tick, 1000); }

    let stepEndTime = Date.now() + currentStep.value.duration * 1000;
    function tick() {
      if (paused.value || waitingForSound.value || !isRunning.value) return;
      const secondsLeft = Math.round((stepEndTime - Date.now()) / 1000);
      remaining.value = Math.max(0, secondsLeft);
      if (remaining.value <= 0) endStep();
    }

    function startSession() { phase.value = Phase.RUNNING; startTick(); }

    function endStep() {
      clearInterval(timerId);
      if (currentIndex.value >= totalSteps - 1) { finishSession(); return; }
      currentIndex.value += 1;
      remaining.value = steps[currentIndex.value].duration;
      waitingForSound.value = true;
      playTransitionCue(() => {
        waitingForSound.value = false;
        startTick();
      });
    }

    function finishSession() { phase.value = Phase.FINISHED; playSessionEnd(); releaseWakeLock(); }

    function togglePause() { if (!isRunning.value) return; paused.value = !paused.value; }
    function skipStep() {
      if (isFinished.value || phase.value === null) return;
      if (waitingForSound.value) { cancelTransition(); waitingForSound.value = false; startTick(); return; }
      clearInterval(timerId);
      endStep();
    }

    function saveSession() { emit('saved', props.sessionId); emit('close'); }
    
    function close() { clearInterval(timerId); releaseWakeLock(); emit('close'); }

    playBeginSound(startSession);

    onUnmounted(() => {
      clearInterval(timerId);
      releaseWakeLock();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });

    return {
      steps, totalSteps, phase, currentIndex, remaining, paused, waitingForSound,
      currentStep, nextStep, clockDisplay, phaseType, phaseLabel, isFinished, isRunning,
      togglePause, skipStep, saveSession, close,
    };
  },
  template: `
    <div class="tracker-screen">
      <div class="tracker-topbar">
        <button class="tracker-back" @click="close">← Back</button>
        <span class="tracker-meta">WK · S{{ currentIndex + 1 }}</span>
      </div>

      <div class="tracker-top-progress">
        <div
          class="tracker-top-progress-fill"
          :class="{ walk: phaseType === 'walk' }"
          :style="{ width: ((currentIndex) / totalSteps * 100) + '%' }"
        ></div>
      </div>

      <div class="tracker-center">
        <template v-if="!isFinished">
          <p class="tracker-phase-label" :class="phaseType">{{ phaseLabel }}</p>
          <div class="tracker-clock">{{ clockDisplay }}</div>
          <p class="tracker-step-count">Step {{ currentIndex + 1 }} of {{ totalSteps }}</p>
          <div class="tracker-dots-row">
            <span
              v-for="(step, i) in steps" :key="i"
              class="tracker-dot"
              :class="[step.type === 'jog' ? 'run' : 'walk', { 'is-done': i < currentIndex, 'is-current': i === currentIndex }]"
            ></span>
          </div>
          <p class="tracker-next-line" v-if="nextStep">
            Next: <b :class="nextStep.type === 'jog' ? 'run' : 'walk'">{{ nextStep.type === 'jog' ? 'RUN' : 'WALK' }}</b>
            · {{ Math.round(nextStep.duration / 60) }} min
          </p>
        </template>
        <template v-else>
          <p class="tracker-phase-label">DONE</p>
          <div class="tracker-clock">🏁</div>
          <p class="tracker-step-count">Session complete</p>
        </template>
      </div>

      <div class="tracker-controls" v-if="!isFinished">
        <button @click="skipStep" :disabled="currentIndex >= totalSteps - 1 && !waitingForSound">Skip →</button>
        <button class="btn-tracker-primary" @click="togglePause" :disabled="waitingForSound">
          {{ paused ? '▶ Start' : '⏸ Pause' }}
        </button>
      </div>

      <button v-else class="btn-save" @click="saveSession">Save Session</button>
    </div>
  `,
});
