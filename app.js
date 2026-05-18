import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDpiFOTQUwxRiMq6J_FIG_QO-jEUvZ78jo",
  authDomain: "programme-course-fractionne.firebaseapp.com",
  projectId: "programme-course-fractionne",
  storageBucket: "programme-course-fractionne.firebasestorage.app",
  messagingSenderId: "761202118405",
  appId: "1:761202118405:web:467735f2a8c1ba9fa4b16c"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const checkboxes     = Array.from(document.querySelectorAll('input[type="checkbox"][data-id]'));
const weekCounters   = document.querySelectorAll('[data-week-count]');
const globalProgress = document.getElementById('global-progress');
const resetBtn       = document.getElementById('reset');
const authBtn        = document.getElementById('auth-btn');
const authStatus     = document.getElementById('auth-status');

function sessionsCol(uid)       { return collection(db, 'users', uid, 'sessions'); }
function sessionDoc(uid, id)    { return doc(db, 'users', uid, 'sessions', id); }

async function loadChecked(uid) {
  const snap = await getDocs(sessionsCol(uid));
  const set = new Set();
  snap.forEach(d => { if (d.data().checked) set.add(d.id); });
  return set;
}

function updateCounters() {
  weekCounters.forEach(span => {
    const w = span.getAttribute('data-week-count');
    const boxes = checkboxes.filter(cb => cb.dataset.id.startsWith('w' + w));
    span.textContent = boxes.filter(cb => cb.checked).length + ' / ' + boxes.length;
  });
  const done = checkboxes.filter(cb => cb.checked).length;
  globalProgress.textContent = done + ' / ' + checkboxes.length + ' séances complétées au total.';
}

// Keep track of listeners so we don't attach them twice
let listenersAttached = false;

function attachListeners(uid) {
  if (listenersAttached) return;
  listenersAttached = true;

  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        setDoc(sessionDoc(uid, cb.dataset.id), { checked: true });
      } else {
        deleteDoc(sessionDoc(uid, cb.dataset.id));
      }
      updateCounters();
    });
  });

  resetBtn.addEventListener('click', async () => {
    if (!confirm('Effacer toutes les coches du programme ?')) return;
    const snap = await getDocs(sessionsCol(uid));
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    checkboxes.forEach(cb => { cb.checked = false; });
    updateCounters();
  });
}

onAuthStateChanged(auth, async user => {
  if (user) {
    authStatus.textContent = 'Chargement…';
    authBtn.textContent = 'Se déconnecter';
    const checked = await loadChecked(user.uid);
    checkboxes.forEach(cb => { cb.checked = checked.has(cb.dataset.id); });
    updateCounters();
    attachListeners(user.uid);
    authStatus.textContent = 'Connecté : ' + user.email;
  } else {
    listenersAttached = false;
    authBtn.textContent = 'Se connecter avec Google';
    authStatus.textContent = 'Non connecté — les coches ne seront pas sauvegardées.';
    checkboxes.forEach(cb => { cb.checked = false; });
    updateCounters();
  }
});

authBtn.addEventListener('click', async () => {
  if (auth.currentUser) {
    await signOut(auth);
  } else {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      authStatus.textContent = 'Erreur : ' + e.message;
    }
  }
});