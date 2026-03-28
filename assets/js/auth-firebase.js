// Firebase Authentication - Migrated from auth.js
import { auth, db, COLLECTIONS } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, getDocs, query, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// Current user (cached)
let currentUserData = null;

// Listen for auth state changes
export function onAuthStateChangedCallback(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, COLLECTIONS.users, user.uid));
      if (userDoc.exists()) {
        currentUserData = { uid: user.uid, ...userDoc.data() };
      }
      callback(currentUserData);
    } else {
      currentUserData = null;
      callback(null);
    }
  });
}

// ─── Register new staff ────────────────────────────────────────────────────────
// Uses a secondary Firebase app instance so the currently logged-in admin
// session is NOT interrupted when creating a new user account.
export async function registerUser(firstName, lastName, email, password, role = 'staff', extraFields = {}) {
  try {
    // Check existing user count BEFORE creating (first user becomes admin)
    const usersSnap = await getDocs(query(collection(db, COLLECTIONS.users), limit(1)));
    const isFirstUser = usersSnap.empty;

    // Create secondary app instance so admin stays signed in
    const { initializeApp }                          = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js');
    const { getAuth, createUserWithEmailAndPassword: _createUser }
                                                     = await import('https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js');

    const secondaryApp  = initializeApp(auth.app.options, `reg-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    const cred = await _createUser(secondaryAuth, email, password);
    const uid  = cred.user.uid;
    await secondaryAuth.signOut();

    // First user = auto-approved admin (the barangay captain bootstrapping the system)
    // All subsequent users = pending approval
    const assignedRole = isFirstUser ? 'admin' : role;
    const status       = isFirstUser ? 'approved' : 'pending';

    await setDoc(doc(db, COLLECTIONS.users, uid), {
      firstName,
      lastName,
      email,
      username:     email,
      role:         assignedRole,
      position:     isFirstUser ? 'Barangay Captain' : '',
      profilePhoto: role === 'resident' ? 'assets/img/avatars/user-avatar.png' : 'assets/img/avatars/avatar1.jpeg',
      isActive:     isFirstUser,   // first user active immediately, others wait
      status,                      // 'pending' | 'approved' | 'rejected'
      dateHired:    serverTimestamp(),
      createdAt:    serverTimestamp(),
      updatedAt:    serverTimestamp(),
      ...extraFields
    });

    console.log(`User registered (${assignedRole}, ${status}):`, uid);
    return uid;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
}

// Login user
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Logout
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
}

// Get current user (from cache)
export function getCurrentUser() {
  return currentUserData;
}

// Update profile photo
export async function updateProfilePhoto(photoUrl) {
  if (!currentUserData) return false;
  try {
    await updateDoc(doc(db, COLLECTIONS.users, currentUserData.uid), {
      profilePhoto: photoUrl,
      updatedAt:    serverTimestamp()
    });
    currentUserData.profilePhoto = photoUrl;
    updateProfileImages();
    return true;
  } catch (error) {
    console.error('Update photo error:', error);
    return false;
  }
}

// Update profile images (UI)
export function updateProfileImages() {
  const user = getCurrentUser();
  if (!user) return;
  document.querySelectorAll('.user-profile-img').forEach(img => {
    img.src = user.profilePhoto || 'assets/img/avatars/avatar1.jpeg';
  });
}

// Role checks
export function hasRole(requiredRole) {
  const user = getCurrentUser();
  if (!user) return false;
  const hierarchy = { superadmin: 4, admin: 3, secretary: 2, staff: 1 };
  return (hierarchy[user.role] || 0) >= (hierarchy[requiredRole] || 0);
}

export function isAdmin()      { return getCurrentUser()?.role === 'admin'; }
export function isSuperAdmin() { return getCurrentUser()?.role === 'superadmin'; }

// Activity log
export async function logActivity(action, module, description) {
  let user = getCurrentUser();

  // If currentUserData isn't cached yet, fetch it directly from Firebase Auth + Firestore
  if (!user) {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
      if (snap.exists()) {
        user = { uid: firebaseUser.uid, ...snap.data() };
      } else {
        user = { uid: firebaseUser.uid, email: firebaseUser.email };
      }
    } catch (e) {
      return;
    }
  }

  try {
    await addDoc(collection(db, COLLECTIONS.activityLogs), {
      userId:      user.uid,
      userName:    `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      userEmail:   user.email,
      action,
      module,
      description,
      timestamp:   serverTimestamp()
    });
  } catch (error) {
    console.error('Log error:', error);
  }
}

// Init - call in HTML pages that need auth guard
export function initAuth() {
  onAuthStateChanged(auth, async (user) => {
    const path = window.location.pathname;
    const isPublic = path.includes('login.html') || path.includes('register.html');
    if (!user) {
      if (!isPublic) window.location.href = 'login.html';
      return;
    }
    // Check approval status — pending/rejected users can't access protected pages
    try {
      const snap = await getDoc(doc(db, COLLECTIONS.users, user.uid));
      if (snap.exists()) {
        const status = snap.data().status;
        if (status === 'pending' || status === 'rejected') {
          await signOut(auth);
          window.location.href = 'login.html';
        }
      }
    } catch(e) { console.warn('initAuth check failed:', e.message); }
  });
}

// Validation
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Global exports for backward compat
window.getCurrentUser    = getCurrentUser;
window.updateProfileImages = updateProfileImages;
window.logout            = logoutUser;
window.isValidEmail      = isValidEmail;
window.isAdmin           = isAdmin;
window.hasRole           = hasRole;