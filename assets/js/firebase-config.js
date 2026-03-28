// Firebase Configuration for Barangay Management System
// Project: barangay-system-701b9 (brgy-employee-mgmt)

// Import Firebase SDKs (CDN loaded in HTML)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyAAMgLqMnsRgovpgV6dRcW459feF_AOd6w",
  authDomain: "barangay-system-701b9.firebaseapp.com",
  projectId: "barangay-system-701b9",
  storageBucket: "barangay-system-701b9.firebasestorage.app",
  messagingSenderId: "595188953117",
  appId: "1:595188953117:web:4371ec5d47b6d18da6d6f4"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Collections
export const COLLECTIONS = {
  users: 'users',
  residents: 'residents',
  certificates: 'certificates',
  activityLogs: 'activityLogs'
};

console.log('Firebase initialized for Barangay System');

