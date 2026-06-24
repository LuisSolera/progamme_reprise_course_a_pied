import { doc, setDoc, deleteDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { db } from './config.js';

function sessionsCollection(userId) {
  return collection(db, 'users', userId, 'sessions');
}

function sessionDocument(userId, sessionId) {
  return doc(db, 'users', userId, 'sessions', sessionId);
}

async function loadCheckedSessions(userId) {
  const snapshot = await getDocs(sessionsCollection(userId));
  const counts = new Map();
  snapshot.forEach(doc => counts.set(doc.id, doc.data().count ?? 1));
  return counts;
}

async function saveSession(userId, sessionId) {
  const ref = sessionDocument(userId, sessionId);
  await setDoc(ref, { count: increment(1) }, { merge: true });  
}

async function deleteSession(userId, sessionId) {
  await deleteDoc(sessionDocument(userId, sessionId));
}

async function clearAllSessions(userId) {
  const snapshot = await getDocs(sessionsCollection(userId));
  await Promise.all(snapshot.docs.map(document => deleteDoc(document.ref)));
}

export { loadCheckedSessions, saveSession, deleteSession, clearAllSessions };