import { getFirestore, doc, setDoc, deleteDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { app } from './config.js';

const db = getFirestore(app);

function sessionsCollection(userId) {
  return collection(db, 'users', userId, 'sessions');
}

function sessionDocument(userId, sessionId) {
  return doc(db, 'users', userId, 'sessions', sessionId);
}

async function loadCheckedSessions(userId) {
  const snapshot = await getDocs(sessionsCollection(userId));
  const checked = new Set();
  snapshot.forEach(document => {
    if (document.data().checked) checked.add(document.id);
  });
  return checked;
}

async function saveSession(userId, sessionId) {
  await setDoc(sessionDocument(userId, sessionId), { checked: true });
}

async function deleteSession(userId, sessionId) {
  await deleteDoc(sessionDocument(userId, sessionId));
}

async function clearAllSessions(userId) {
  const snapshot = await getDocs(sessionsCollection(userId));
  await Promise.all(snapshot.docs.map(document => deleteDoc(document.ref)));
}

export { loadCheckedSessions, saveSession, deleteSession, clearAllSessions };
