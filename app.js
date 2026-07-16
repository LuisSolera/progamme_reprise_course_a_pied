// app.js — PACE athletic UI
import { signIn, signOut, observeAuthState } from './auth.js';
import { loadCheckedSessions, saveSession, deleteSession, clearAllSessions } from './db.js';
import { TrackerComponent } from './tracker-component.js';
import { preloadSounds } from './audio.js';

const { createApp, ref, computed } = Vue;

const WEEKS = [
  { number: 1, label: 'Week 1', sessions: [
    { id: 'w1s1', label: "5'M + 3x (1'C / 1'M) + 5'M" },
    { id: 'w1s2', label: "5'M + 4x (1'C / 1'M) + 5'M" },
    { id: 'w1s3', label: "5'M + 5x (1'C / 1'M) + 5'M" },
    { id: 'w1s4', label: "5'M + 6x (1'C / 1'M) + 5'M" },
    { id: 'w1s5', label: "5'M + 7x (1'C / 1'M) + 5'M" },
  ]},
  { number: 2, label: 'Week 2', sessions: [
    { id: 'w2s1', label: "5'M + 8x (1'C / 1'M) + 5'M" },
    { id: 'w2s2', label: "5'M + 9x (1'C / 1'M) + 5'M" },
    { id: 'w2s3', label: "5'M + 10x (1'C / 1'M) + 5'M" },
    { id: 'w2s4', label: "5'M + 11x (1'C / 1'M) + 5'M" },
    { id: 'w2s5', label: "5'M + 12x (1'C / 1'M) + 5'M" },
  ]},
  { number: 3, label: 'Week 3', sessions: [
    { id: 'w3s1', label: "5'M + 13x (1'C / 1'M) + 5'M" },
    { id: 'w3s2', label: "5'M + 14x (1'C / 1'M) + 5'M" },
    { id: 'w3s3', label: "5'M + 15x (1'C / 1'M) + 5'M" },
    { id: 'w3s4', label: "5'M + 3x (2'C / 1'M) + 5'M" },
    { id: 'w3s5', label: "5'M + 4x (2'C / 1'M) + 5'M" },
  ]},
  { number: 4, label: 'Week 4', sessions: [
    { id: 'w4s1', label: "5'M + 5x (2'C / 1'M) + 5'M" },
    { id: 'w4s2', label: "5'M + 6x (2'C / 1'M) + 5'M" },
    { id: 'w4s3', label: "5'M + 7x (2'C / 1'M) + 5'M" },
    { id: 'w4s4', label: "5'M + 8x (2'C / 1'M) + 5'M" },
    { id: 'w4s5', label: "5'M + 9x (2'C / 1'M) + 5'M" },
  ]},
  { number: 5, label: 'Week 5', sessions: [
    { id: 'w5s1', label: "5'M + 10x (2'C / 1'M) + 5'M" },
    { id: 'w5s2', label: "5'M + 3x (3'C / 1'M) + 5'M" },
    { id: 'w5s3', label: "5'M + 4x (3'C / 1'M) + 5'M" },
    { id: 'w5s4', label: "5'M + 5x (3'C / 1'M) + 5'M" },
    { id: 'w5s5', label: "5'M + 6x (3'C / 1'M) + 5'M" },
  ]},
  { number: 6, label: 'Week 6', sessions: [
    { id: 'w6s1', label: "5'M + 7x (3'C / 1'M) + 5'M" },
    { id: 'w6s2', label: "5'M + 8x (3'C / 1'M) + 5'M" },
    { id: 'w6s3', label: "5'M + 2x (4'C / 1'M) + 5'M" },
    { id: 'w6s4', label: "5'M + 3x (4'C / 1'M) + 5'M" },
    { id: 'w6s5', label: "5'M + 4x (4'C / 1'M) + 5'M" },
  ]},
  { number: 7, label: 'Week 7', sessions: [
    { id: 'w7s1', label: "5'M + 5x (4'C / 1'M) + 5'M" },
    { id: 'w7s2', label: "5'M + 6x (4'C / 1'M) + 5'M" },
    { id: 'w7s3', label: "5'M + 1x (9'C / 1'M) + 5'M" },
    { id: 'w7s4', label: "5'M + 2x (9'C / 1'M) + 5'M" },
    { id: 'w7s5', label: "5'M + 3x (9'C / 1'M) + 5'M" },
  ]},
  { number: 8, label: 'Week 8', sessions: [
    { id: 'w8s1', label: "5'M + 1x (14'C / 1'M) + 5'M" },
    { id: 'w8s2', label: "5'M + 2x (14'C / 1'M) + 5'M" },
    { id: 'w8s3', label: "5'M + 1x 20'C + 5'M" },
    { id: 'w8s4', label: "5'M + 1x 25'C + 5'M" },
    { id: 'w8s5', label: "5'M + 1x 30'C + 5'M" },
  ]},
];

const TOTAL_SESSIONS = WEEKS.reduce((sum, week) => sum + week.sessions.length, 0);

createApp({
  components: { TrackerComponent },
  setup() {
    const user = ref(null);
    const authStatus = ref('Loading…');
    const authLoading = ref(false);
    const checked = ref(new Map());
    const activeSession = ref(null);
    const expandedWeek = ref(1);

    const totalChecked = computed(() => checked.value.size);
    const progressPct = computed(() => Math.round((totalChecked.value / TOTAL_SESSIONS) * 100));

    function weekCheckedCount(week) {
      return week.sessions.filter(s => checked.value.has(s.id)).length;
    }
    function isWeekComplete(week) {
      return weekCheckedCount(week) === week.sessions.length;
    }
    const isLoggedIn = computed(() => user.value !== null);

    const nextSession = computed(() => {
      for (const week of WEEKS) {
        for (const session of week.sessions) {
          if (!checked.value.has(session.id)) return { week, session };
        }
      }
      return null;
    });

    const currentWeekNumber = computed(() =>
      nextSession.value ? nextSession.value.week.number : WEEKS[WEEKS.length - 1].number
    );

    function toggleWeek(weekNumber) {
      expandedWeek.value = expandedWeek.value === weekNumber ? null : weekNumber;
    }
    function isWeekExpanded(weekNumber) {
      return expandedWeek.value === weekNumber;
    }
    function isCurrentWeek(weekNumber) {
      return weekNumber === currentWeekNumber.value;
    }

    async function handleSignIn() {
      if (authLoading.value) return;
      authLoading.value = true;
      try { await signIn(); }
      catch (e) { authStatus.value = 'Sign-in error: ' + e.message; }
      finally { authLoading.value = false; }
    }
    async function handleSignOut() { await signOut(); }

    function sessionCount(id) { return checked.value.get(id) ?? 0; }

    async function toggleSession(sessionId) {
      if (!user.value) return;
      const next = new Map(checked.value);
      if (next.has(sessionId)) {
        next.delete(sessionId);
        await deleteSession(user.value.userId, sessionId);
      } else {
        next.set(sessionId, 1);
        await saveSession(user.value.userId, sessionId);
      }
      checked.value = next;
    }

    async function repeatSession(sessionId) {
      if (!user.value || !checked.value.has(sessionId)) return;
      const next = new Map(checked.value);
      next.set(sessionId, (next.get(sessionId) ?? 1) + 1);
      await saveSession(user.value.userId, sessionId);
      checked.value = next;
    }

    async function resetAll() {
      if (!user.value) return;
      if (!confirm('Clear all progress?')) return;
      await clearAllSessions(user.value.userId);
      checked.value = new Map();
    }

    function openTracker(sessionId) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) { const c = new AudioCtx(); c.close(); }
      activeSession.value = sessionId;
    }
    function closeTracker() { activeSession.value = null; }

    async function onSessionSaved(sessionId) {
      if (!checked.value.has(sessionId)) await toggleSession(sessionId);
      else await repeatSession(sessionId);
      expandedWeek.value = currentWeekNumber.value;
    }

    function startNextSession() {
      if (!nextSession.value) return;
      expandedWeek.value = nextSession.value.week.number;
      openTracker(nextSession.value.session.id);
    }

    observeAuthState(async u => {
      if (u) {
        user.value = u;
        authStatus.value = 'Loading…';
        try {
          checked.value = await loadCheckedSessions(u.userId);
          authStatus.value = `Signed in: ${u.email}`;
          expandedWeek.value = currentWeekNumber.value;
        } catch {
          await signOut();
          authStatus.value = 'Access denied.';
        }
      } else {
        user.value = null;
        checked.value = new Map();
        authStatus.value = 'Not signed in.';
      }
    });

    preloadSounds();

    return {
      WEEKS, TOTAL_SESSIONS, user, authStatus, authLoading, isLoggedIn,
      checked, totalChecked, progressPct, activeSession, nextSession,
      expandedWeek, weekCheckedCount, isWeekComplete, isWeekExpanded,
      isCurrentWeek, toggleWeek, sessionCount, handleSignIn, handleSignOut,
      toggleSession, repeatSession, resetAll, openTracker, closeTracker,
      onSessionSaved, startNextSession,
    };
  },
  template: `
    <div v-if="!isLoggedIn" class="signin-screen">
      <div>
        <p class="signin-eyebrow">8-Week Program</p>
        <h1 class="signin-title">PACE</h1>
        <div class="signin-rule"></div>
        <p class="signin-tagline">Progressive interval training. Eight weeks to continuous running.</p>
      </div>
      <div>
        <button class="btn-google" @click="handleSignIn" :disabled="authLoading">
          {{ authLoading ? 'Signing in…' : 'Continue with Google' }}
        </button>
        <p class="signin-note">Your progress syncs across devices</p>
      </div>
    </div>

    <div v-else class="app">
      <div class="top-bar">
        <span class="brand">PACE</span>
        <button class="signout-link" @click="handleSignOut">Sign out</button>
      </div>

      <div class="hero-progress">
        <div class="hero-progress-row">
          <span class="hero-percent">{{ progressPct }}</span>
          <span class="hero-percent-sign">%</span>
        </div>
        <div class="hero-sub-row">
          <span>{{ totalChecked }} of {{ TOTAL_SESSIONS }} sessions done</span>
          <span>Week {{ currentWeekNumber }} / 8</span>
        </div>
        <div class="hero-bar-track"><div class="hero-bar-fill" :style="{ width: progressPct + '%' }"></div></div>
      </div>

      <template v-if="nextSession">
        <p class="section-label">Up Next</p>
        <div class="up-next-card">
          <span class="up-next-meta">Wk {{ nextSession.week.number }} · Session {{ nextSession.week.sessions.indexOf(nextSession.session) + 1 }}</span>
          <div class="up-next-head">
            <h2 class="up-next-title">{{ nextSession.session.label }}</h2>
            <span>
              <span class="up-next-duration">~31 min</span>
              <span class="up-next-runs">interval session</span>
            </span>
          </div>
          <div class="interval-bar">
            <span v-for="n in 12" :key="n" :class="n % 2 === 0 ? 'run' : 'walk'"></span>
          </div>
          <button class="btn-start-session" @click="startNextSession">Start Session →</button>
        </div>
      </template>
      <template v-else>
        <p class="section-label">Program Complete</p>
        <div class="up-next-card"><h2 class="up-next-title">All sessions completed 🎉</h2></div>
      </template>

      <p class="section-label">Program</p>
      <div class="program-list">
        <section v-for="week in WEEKS" :key="week.number" class="week" :class="{ 'is-current': isCurrentWeek(week.number) }">
          <button class="week-header" @click="toggleWeek(week.number)">
            <span>
              {{ week.label }}
              <span v-if="isCurrentWeek(week.number)" class="week-now-badge">NOW</span>
            </span>
            <span class="week-header-right">
              <span class="week-dots">
                <span v-for="s in week.sessions" :key="s.id" class="is-dot" :class="{ 'is-done': checked.has(s.id) }"></span>
              </span>
              <span class="week-chevron" :class="{ 'is-open': isWeekExpanded(week.number) }">›</span>
            </span>
          </button>

          <ul v-show="isWeekExpanded(week.number)">
            <li v-for="session in week.sessions" :key="session.id">
              <span class="session-check" :class="{ 'is-checked': checked.has(session.id) }" @click="toggleSession(session.id)">
                <span v-if="checked.has(session.id)">✓</span>
              </span>
              <span class="session-label">
                {{ session.label }}
                <span v-if="sessionCount(session.id) > 1" class="session-meta">×{{ sessionCount(session.id) }}</span>
              </span>
              <button
                v-if="checked.has(session.id)"
                class="btn-session-action is-repeat"
                @click="openTracker(session.id)"
              >Repeat</button>
              <button v-else class="btn-session-action" @click="openTracker(session.id)">Start</button>
            </li>
          </ul>
        </section>
      </div>

      <button v-if="isLoggedIn" @click="resetAll" class="signout-link" style="margin-top:1.2rem;">Reset progress</button>

      <tracker-component
        v-if="activeSession"
        :session-id="activeSession"
        @close="closeTracker"
        @saved="onSessionSaved"
      />
    </div>
  `,
}).mount('#app');
