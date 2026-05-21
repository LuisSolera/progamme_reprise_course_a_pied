import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { app } from './config.js';

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

function signIn() {
  return signInWithPopup(auth, provider);
}

function signOut() {
  return firebaseSignOut(auth);
}

function observeAuthState(callback) {
  return onAuthStateChanged(auth, user => {
    if (!user) {
      callback(null);
      return;
    }
    callback({ userId: user.uid, email: user.email ?? '' });
  });
}

export { signIn, signOut, observeAuthState };