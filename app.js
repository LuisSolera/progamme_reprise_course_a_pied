// app.js — Main application entry point
// Vue 3 mounts the TrackerComponent as a reactive island.
// All Firebase auth + Firestore calls are unchanged.

import { signIn, signOut, observeAuthState } from './auth.js';
import { loadCheckedSessions, saveSession, deleteSession, clearAllSessions } from './db.js';
import { elements, applyCheckedState, clearAllCheckboxes, setAuthStatus, setAuthButtonLabel, updateCounters } from './ui.js';
import { TrackerComponent } from './tracker-component.js';
import { preloadSounds } from './audio.js';

const { createApp, ref } = Vue;

// ── Vue tracker island ───────────────────────────────────────────────────────
// A minimal Vue app is mounted to a dedicated <div id="tracker-mount">.
// It only manages tracker open/close state — the rest of the page is untouched.

const trackerApp = createApp({
  components: { TrackerComponent },

  setup() {
    const activeSessionId = ref(null);

    function openTracker(sessionId) {
      activeSessionId.value = sessionId;
    }

    function closeTracker() {
      activeSessionId.value = null;
    }

    async function onSessionSaved(sessionId) {
      const checkbox = elements.checkboxes.find(cb => cb.dataset.id === sessionId);
      if (checkbox && !checkbox.checked) {
        checkbox.checked = true;
        if (currentUserId) await saveSession(currentUserId, sessionId);
        updateCounters();
      }
    }

    return { activeSessionId, openTracker, closeTracker, onSessionSaved };
  },

  template: `
    <TrackerComponent
      v-if="activeSessionId"
      :session-id="activeSessionId"
      @close="closeTracker"
      @saved="onSessionSaved"
    />
  `,
});

const trackerInstance = trackerApp.mount('#tracker-mount');

// ── Auth state ───────────────────────────────────────────────────────────────
let currentUserId = null;

async function handleSignedInUser(user) {
  currentUserId = user.userId;
  setAuthButtonLabel('Se déconnecter');
  setAuthStatus('Chargement…');
  try {
    const checkedSessions = await loadCheckedSessions(user.userId);
    applyCheckedState(checkedSessions);
    setAuthStatus(`Connecté : ${user.email}`);
  } catch {
    await signOut();
    setAuthStatus('Accès refusé. Ce compte n\'est pas autorisé.');
  }
}

function handleSignedOutUser() {
  currentUserId = null;
  setAuthButtonLabel('Se connecter avec Google');
  setAuthStatus('Non connecté — les coches ne seront pas sauvegardées.');
  clearAllCheckboxes();
}

// ── DOM event listeners (programme page — unchanged) ─────────────────────────
function attachCheckboxListeners() {
  elements.checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      if (!currentUserId) return;
      if (checkbox.checked) await saveSession(currentUserId, checkbox.dataset.id);
      else await deleteSession(currentUserId, checkbox.dataset.id);
      updateCounters();
    });
  });
}

function attachResetListener() {
  elements.resetButton.addEventListener('click', async () => {
    if (!currentUserId) return;
    if (!confirm('Effacer toutes les coches du programme ?')) return;
    await clearAllSessions(currentUserId);
    clearAllCheckboxes();
  });
}

function attachStartButtonListeners() {
  document.querySelectorAll('.btn-start-session').forEach(btn => {
    btn.addEventListener('click', () => {
      // Unlock AudioContext on user gesture (required on mobile)
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) { const c = new AudioCtx(); c.close(); }

      trackerInstance.openTracker(btn.dataset.session);
    });
  });
}

function bindAuthButton() {
  elements.authButton.addEventListener('click', async () => {
    if (currentUserId) { await signOut(); return; }
    try { await signIn(); }
    catch (error) { setAuthStatus('Erreur de connexion : ' + error.message); }
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────
function init() {
  preloadSounds(); 
  attachCheckboxListeners();
  attachResetListener();
  attachStartButtonListeners();
  bindAuthButton();
  observeAuthState(async user => {
    if (user) await handleSignedInUser(user);
    else handleSignedOutUser();
  });
}

init();