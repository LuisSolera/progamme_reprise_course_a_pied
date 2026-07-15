// app.js
import { signIn, signOut, observeAuthState } from './auth.js';
import { loadCheckedSessions, saveSession, deleteSession, clearAllSessions } from './db.js';
import { TrackerComponent } from './tracker-component.js';
import { preloadSounds } from './audio.js';

const { createApp, ref, computed } = Vue;

// ── Programme data ────────────────────────────────────────────────────────────
const WEEKS = [
  { number: 1, label: 'Semaine 1', sessions: [
    { id: 'w1s1', label: "5'M + 3x (1'C / 1'M) + 5'M" },
    { id: 'w1s2', label: "5'M + 4x (1'C / 1'M) + 5'M" },
    { id: 'w1s3', label: "5'M + 5x (1'C / 1'M) + 5'M" },
    { id: 'w1s4', label: "5'M + 6x (1'C / 1'M) + 5'M" },
    { id: 'w1s5', label: "5'M + 7x (1'C / 1'M) + 5'M" },
  ]},
  { number: 2, label: 'Semaine 2', sessions: [
    { id: 'w2s1', label: "5'M + 8x (1'C / 1'M) + 5'M" },
    { id: 'w2s2', label: "5'M + 9x (1'C / 1'M) + 5'M" },
    { id: 'w2s3', label: "5'M + 10x (1'C / 1'M) + 5'M" },
    { id: 'w2s4', label: "5'M + 11x (1'C / 1'M) + 5'M" },
    { id: 'w2s5', label: "5'M + 12x (1'C / 1'M) + 5'M" },
  ]},
  { number: 3, label: 'Semaine 3', sessions: [
    { id: 'w3s1', label: "5'M + 13x (1'C / 1'M) + 5'M" },
    { id: 'w3s2', label: "5'M + 14x (1'C / 1'M) + 5'M" },
    { id: 'w3s3', label: "5'M + 15x (1'C / 1'M) + 5'M" },
    { id: 'w3s4', label: "5'M + 3x (2'C / 1'M) + 5'M" },
    { id: 'w3s5', label: "5'M + 4x (2'C / 1'M) + 5'M" },
  ]},
  { number: 4, label: 'Semaine 4', sessions: [
    { id: 'w4s1', label: "5'M + 5x (2'C / 1'M) + 5'M" },
    { id: 'w4s2', label: "5'M + 6x (2'C / 1'M) + 5'M" },
    { id: 'w4s3', label: "5'M + 7x (2'C / 1'M) + 5'M" },
    { id: 'w4s4', label: "5'M + 8x (2'C / 1'M) + 5'M" },
    { id: 'w4s5', label: "5'M + 9x (2'C / 1'M) + 5'M" },
  ]},
  { number: 5, label: 'Semaine 5', sessions: [
    { id: 'w5s1', label: "5'M + 10x (2'C / 1'M) + 5'M" },
    { id: 'w5s2', label: "5'M + 3x (3'C / 1'M) + 5'M" },
    { id: 'w5s3', label: "5'M + 4x (3'C / 1'M) + 5'M" },
    { id: 'w5s4', label: "5'M + 5x (3'C / 1'M) + 5'M" },
    { id: 'w5s5', label: "5'M + 6x (3'C / 1'M) + 5'M" },
  ]},
  { number: 6, label: 'Semaine 6', sessions: [
    { id: 'w6s1', label: "5'M + 7x (3'C / 1'M) + 5'M" },
    { id: 'w6s2', label: "5'M + 8x (3'C / 1'M) + 5'M" },
    { id: 'w6s3', label: "5'M + 2x (4'C / 1'M) + 5'M" },
    { id: 'w6s4', label: "5'M + 3x (4'C / 1'M) + 5'M" },
    { id: 'w6s5', label: "5'M + 4x (4'C / 1'M) + 5'M" },
  ]},
  { number: 7, label: 'Semaine 7', sessions: [
    { id: 'w7s1', label: "5'M + 5x (4'C / 1'M) + 5'M" },
    { id: 'w7s2', label: "5'M + 6x (4'C / 1'M) + 5'M" },
    { id: 'w7s3', label: "5'M + 1x (9'C / 1'M) + 5'M" },
    { id: 'w7s4', label: "5'M + 2x (9'C / 1'M) + 5'M" },
    { id: 'w7s5', label: "5'M + 3x (9'C / 1'M) + 5'M" },
  ]},
  { number: 8, label: 'Semaine 8', sessions: [
    { id: 'w8s1', label: "5'M + 1x (14'C / 1'M) + 5'M" },
    { id: 'w8s2', label: "5'M + 2x (14'C / 1'M) + 5'M" },
    { id: 'w8s3', label: "5'M + 1x 20'C + 5'M" },
    { id: 'w8s4', label: "5'M + 1x 25'C + 5'M" },
    { id: 'w8s5', label: "5'M + 1x 30'C + 5'M" },
  ]},
];

const TOTAL_SESSIONS = WEEKS.reduce((sum, week) => sum + week.sessions.length, 0);

// ── Root app ──────────────────────────────────────────────────────────────────
createApp({
  components: { TrackerComponent },
  setup() {
    // Auth
    const user = ref(null); // { userId, email } or null
    const authStatus = ref('Chargement…');
    const authLoading = ref(false);

    // Programme
    const checked = ref(new Map()); // Map<sessionId, count>
    const activeSession = ref(null);

    // ── Computed ────────────────────────────────────────────────────────────
    const totalChecked = computed(() => checked.value.size);
    function weekCheckedCount(week) {
      return week.sessions.filter(s => checked.value.has(s.id)).length;
    }
    const isLoggedIn = computed(() => user.value !== null);

    // ── Auth ────────────────────────────────────────────────────────────────
    async function handleSignIn() {
      if (authLoading.value) return;
      authLoading.value = true;
      try {
        await signIn();
      } catch (e) {
        authStatus.value = 'Erreur de connexion : ' + e.message;
      } finally {
        authLoading.value = false;
      }
    }

    async function handleSignOut() {
      await signOut();
    }

    function sessionCount(id) {
      return checked.value.get(id) ?? 0;
    }

    // ── Checkbox ────────────────────────────────────────────────────────────
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
      const newCount = (next.get(sessionId) ?? 1) + 1;
      next.set(sessionId, newCount);
      await saveSession(user.value.userId, sessionId);
      checked.value = next;
    }

    async function resetAll() {
      if (!user.value) return;
      if (!confirm('Effacer toutes les coches du programme ?')) return;
      await clearAllSessions(user.value.userId);
      checked.value = new Map();
    }

    // ── Tracker ─────────────────────────────────────────────────────────────
    function openTracker(sessionId) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const c = new AudioCtx();
        c.close();
      }
      activeSession.value = sessionId;
    }

    function closeTracker() {
      activeSession.value = null;
    }

    async function onSessionSaved(sessionId) {
      if (!checked.value.has(sessionId)) {
        await toggleSession(sessionId);
      } else {
        await repeatSession(sessionId);
      }
    }

    // ── Firebase auth observer ────────────────────────────────────────────────
    observeAuthState(async u => {
      if (u) {
        user.value = u;
        authStatus.value = 'Chargement…';
        try {
          const loaded = await loadCheckedSessions(u.userId);
          checked.value = loaded;
          authStatus.value = `Connecté : ${u.email}`;
        } catch {
          await signOut();
          authStatus.value = "Accès refusé. Ce compte n'est pas autorisé.";
        }
      } else {
        user.value = null;
        checked.value = new Map();
        authStatus.value = 'Non connecté — les coches ne seront pas sauvegardées.';
      }
    });

    preloadSounds();

    return {
      WEEKS,
      TOTAL_SESSIONS,
      user,
      authStatus,
      authLoading,
      isLoggedIn,
      checked,
      totalChecked,
      activeSession,
      weekCheckedCount,
      sessionCount,
      handleSignIn,
      handleSignOut,
      toggleSession,
      repeatSession,
      resetAll,
      openTracker,
      closeTracker,
      onSessionSaved,
    };
  },
  template: `
    <div class="app">
      <header>
        <h1>Programme course à pied fractionné</h1>
        <p class="subtitle">8 semaines pour progresser du fractionné court au 30 minutes en continu.</p>
        <p class="info">Coche chaque séance une fois réalisée. Relance une séance pour incrémenter son compteur de répétitions.</p>

        <div class="auth-bar">
          <button v-if="!isLoggedIn" @click="handleSignIn" :disabled="authLoading">
            {{ authLoading ? 'Connexion…' : 'Se connecter avec Google' }}
          </button>
          <button v-else @click="handleSignOut">Se déconnecter</button>
          <span id="auth-status">{{ authStatus }}</span>
        </div>
      </header>

      <main class="weeks">
        <section v-for="week in WEEKS" :key="week.number" class="week">
          <div class="week-header">
            <span class="week-title">{{ week.label }}</span>
            <span class="week-counter">{{ weekCheckedCount(week) }} / {{ week.sessions.length }}</span>
          </div>

          <ul>
            <li v-for="session in week.sessions" :key="session.id">
              <input
                type="checkbox"
                :id="session.id"
                :checked="checked.has(session.id)"
                @change="toggleSession(session.id)"
              />
              <label :for="session.id">{{ session.label }}</label>
              <span
                v-if="sessionCount(session.id) > 1"
                class="repeat-badge"
                :title="sessionCount(session.id) + ' répétitions'"
              >
                {{ sessionCount(session.id) }}
              </span>
              <button
                class="btn-start-session"
                @click="openTracker(session.id)"
              >
                Démarrer la séance
              </button>
            </li>
          </ul>
        </section>
      </main>

      <footer class="footer">
        <span class="small-text">{{ totalChecked }} / {{ TOTAL_SESSIONS }} séances complétées au total.</span>
        <button v-if="isLoggedIn" @click="resetAll">Réinitialiser</button>
      </footer>

      <tracker-component
        v-if="activeSession"
        :session-id="activeSession"
        @close="closeTracker"
        @saved="onSessionSaved"
      />
    </div>
  `,
}).mount('#app');
