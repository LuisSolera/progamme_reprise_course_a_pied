import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getAuth }       from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';
import { FIREBASE }      from './config.js';

const app = initializeApp(FIREBASE);

export const auth = getAuth(app);
export const db   = getFirestore(app);