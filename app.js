import { signIn, signOut, observeAuthState } from './auth.js';
import { loadCheckedSessions, saveSession, deleteSession, clearAllSessions } from './db.js';
import { elements, applyCheckedState, clearAllCheckboxes, setAuthStatus, setAuthButtonLabel, updateCounters } from './ui.js';
import { openTracker, closeTracker } from './tracker.js';
import { SESSIONS } from './session.js';

let currentUserId = null;

async function handleSignedInUser(user) {
  currentUserId = user.userId;
  setAuthButtonLabel('Se déconnecter');
  setAuthStatus('Chargement…');

  try {
    const checkedSessions = await loadCheckedSessions(user.userId);
    applyCheckedState(checkedSessions);
    setAuthStatus(`Connecté : ${user.email}`);
  } catch (error) {
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

function attachListeners() {
  elements.checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', async () => {
      if (!currentUserId) return;
      if (checkbox.checked) await saveSession(currentUserId, checkbox.dataset.id);
      else await deleteSession(currentUserId, checkbox.dataset.id);
      updateCounters();
    });
  });

  elements.resetButton.addEventListener('click', async () => {
    if (!currentUserId) return;
    if (!confirm('Effacer toutes les coches du programme ?')) return;
    await clearAllSessions(currentUserId);
    clearAllCheckboxes();
  });

  // Start session buttons
  document.querySelectorAll('.btn-start-session').forEach(btn => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.session;
      if (!SESSIONS[sid]) return;
      
      openTracker(sid, async (completedId) => {
        // Mark checkbox checked and save to Firestore
        const checkbox = elements.checkboxes.find(cb => cb.dataset.id === completedId);
        if (checkbox && !checkbox.checked) {
          checkbox.checked = true;
          if (currentUserId) await saveSession(currentUserId, completedId);
          updateCounters();
        }
      });
    });
  });
}

function bindAuthButton() {
  elements.authButton.addEventListener('click', async () => {
    if (currentUserId) {
      await signOut();
      return;
    }
    try {
      await signIn();
    } catch (error) {
      setAuthStatus('Erreur de connexion : ' + error.message);
    }
  });
}

function init() {
  attachListeners();
  bindAuthButton();
  observeAuthState(async user => {
    if (user) await handleSignedInUser(user);
    else handleSignedOutUser();
  });
}

init();