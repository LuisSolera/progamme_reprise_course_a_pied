// config.js
import { initializeApp }  from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

const app = initializeApp({
  apiKey:            'AIzaSyDpiFOTQUwxRiMq6J_FIG_QO-jEUvZ78jo',
  authDomain:        'programme-course-fractionne.firebaseapp.com',
  projectId:         'programme-course-fractionne',
  storageBucket:     'programme-course-fractionne.firebasestorage.app',
  messagingSenderId: '761202118405',
  appId:             '1:761202118405:web:467735f2a8c1ba9fa4b16c'
});

export const auth = getAuth(app);
export const db   = getFirestore(app);