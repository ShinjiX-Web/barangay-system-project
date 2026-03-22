// Firebase Authentication - Migrated from auth.js
import { auth, db, COLLECTIONS } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { getUsers } from './firebase-db.js';

// Super Admin UID (set manually in Firebase Console)
const SUPER_ADMIN_UID = 'superadmin@example.com'; // Update after first user

// Current user (cached)
let currentUserData = null;

// Listen for auth state changes
export function onAuthStateChangedCallback(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Get profile from Firestore
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

// Register new staff (creates Firebase Auth + Firestore profile)
export async function registerUser(firstName, lastName, email, password, position = 'Staff') {
  try {
    // Create Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create Firestore profile
    await setDoc(doc(db, COLLECTIONS.users, user.uid), {
      firstName,
      lastName,
      email,
      role: 'staff',
      position,
      profilePhoto: 'assets/img/avatars/avatar1.jpeg',
      isActive: true,
      dateHired: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('User registered:', user.uid);
    return user.uid;
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
}

// Login user
export async function loginUser(email, password, rememberMe = false) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged will handle profile load
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

// Get current user (from cache or Firestore)
export function getCurrentUser() {
  return currentUserData;
}

// Update profile photo
export async function updateProfilePhoto(photoUrl) {
  if (!currentUserData) return false;
  
  try {
    await updateDoc(doc(db, COLLECTIONS.users, currentUserData.uid), {
      profilePhoto: photoUrl,
      updatedAt: new Date().toISOString()
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
  return hierarchy[user.role] >= hierarchy[requiredRole];
}

export function isAdmin() {
  return getCurrentUser()?.role === 'admin';
}

export function isSuperAdmin() {
  return getCurrentUser()?.role === 'superadmin';
}

// Activity log (Firestore)
export async function logActivity(action, module, details) {
  const user = getCurrentUser();
  if (!user) return;
  
  try {
    await addDoc(collection(db, COLLECTIONS.activityLogs), {
      userId: user.uid,
      action,
      module,
      details,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Log error:', error);
  }
}

// Validation
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Init - call in HTML
export function initAuth() {
  // Auto-check auth on load
  onAuthStateChangedCallback((user) => {
    if (!user && window.location.pathname !== '/login.html' && window.location.pathname !== '/register.html') {
      window.location.href = 'login.html';
    }
  });
}

// Global exports for backward compat
window.getCurrentUser = getCurrentUser;
window.updateProfileImages = updateProfileImages;
window.logout = logoutUser; // Wrapper
window.isValidEmail = isValidEmail;
window.isAdmin = isAdmin;
window.hasRole = hasRole;

