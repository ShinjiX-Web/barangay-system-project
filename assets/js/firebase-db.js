// Firebase Database Wrappers - Replaces localStorage
import { db, auth, COLLECTIONS } from './firebase-config.js';
import { collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp, onSnapshot, limit } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { getDownloadURL, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-storage.js';

// ===== USERS/STAFF =====
export async function getUsers() {
  try {
    const q = query(collection(db, COLLECTIONS.users), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const users = {};
    snapshot.forEach(doc => {
      users[doc.id] = { id: doc.id, ...doc.data() };
    });
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return {};
  }
}

export async function getUserByEmail(email) {
  try {
    const q = query(collection(db, COLLECTIONS.users), where('email', '==', email));
    const snapshot = await getDocs(q);
    return snapshot.docs.length > 0 ? { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } : null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

export async function addUser(userData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.users), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding user:', error);
    throw error;
  }
}

export async function updateUser(userId, updates) {
  try {
    const userRef = doc(db, COLLECTIONS.users, userId);
    await updateDoc(userRef, { ...updates, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error updating user:', error);
    return false;
  }
}

export async function deleteUser(userId) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.users, userId));
    return true;
  } catch (error) {
    console.error('Error deleting user:', error);
    return false;
  }
}

// ===== RESIDENTS =====
export async function getResidents() {
  try {
    const q = query(collection(db, COLLECTIONS.residents), orderBy('registrationDate', 'desc'));
    const snapshot = await getDocs(q);
    const residents = {};
    snapshot.forEach(doc => {
      residents[doc.id] = { id: doc.id, ...doc.data() };
    });
    return residents;
  } catch (error) {
    console.error('Error getting residents:', error);
    return {};
  }
}

export async function addResident(residentData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.residents), {
      ...residentData,
      registrationDate: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding resident:', error);
    throw error;
  }
}

export async function updateResident(residentId, updates) {
  try {
    const residentRef = doc(db, COLLECTIONS.residents, residentId);
    await updateDoc(residentRef, { ...updates, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error updating resident:', error);
    return false;
  }
}

export async function deleteResident(residentId) {
  try {
    await deleteDoc(doc(db, COLLECTIONS.residents, residentId));
    return true;
  } catch (error) {
    console.error('Error deleting resident:', error);
    return false;
  }
}

export async function searchResidents(query) {
  try {
    // Firestore full-text limited; client-side filter for prototype
    const residents = await getResidents();
    return Object.values(residents).filter(r =>
      `${r.firstName} ${r.lastName} ${r.address}`.toLowerCase().includes(query.toLowerCase())
    );
  } catch (error) {
    console.error('Error searching residents:', error);
    return [];
  }
}

// ===== CERTIFICATES =====
export async function getCertificates() {
  try {
    const q = query(collection(db, COLLECTIONS.certificates), orderBy('requestDate', 'desc'));
    const snapshot = await getDocs(q);
    const certs = {};
    snapshot.forEach(doc => {
      certs[doc.id] = { id: doc.id, ...doc.data() };
    });
    return certs;
  } catch (error) {
    console.error('Error getting certificates:', error);
    return {};
  }
}

export async function requestCertificate(certData) {
  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.certificates), {
      ...certData,
      requestDate: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error requesting certificate:', error);
    throw error;
  }
}

// ===== Real-time Listeners (use in components) =====
export function onUsersSnapshot(callback) {
  const q = query(collection(db, COLLECTIONS.users), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users = {};
    snapshot.forEach(doc => users[doc.id] = { id: doc.id, ...doc.data() });
    callback(users);
  });
}

export function onResidentsSnapshot(callback) {
  const q = query(collection(db, COLLECTIONS.residents), orderBy('registrationDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const residents = {};
    snapshot.forEach(doc => residents[doc.id] = { id: doc.id, ...doc.data() });
    callback(residents);
  });
}

// ===== UTILITIES =====
export async function uploadPhoto(file, path) {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return url;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return null;
  }
}

export async function getDashboardStats() {
  try {
    const [usersSnap, residentsSnap, certsSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.users)),
      getDocs(collection(db, COLLECTIONS.residents)),
      getDocs(collection(db, COLLECTIONS.certificates))
    ]);

    // Fix: use start of today as a JS Date — Firestore accepts Date objects
    // when compared against Timestamp fields via >= operator
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCerts = await getDocs(
      query(
        collection(db, COLLECTIONS.certificates),
        where('requestDate', '>=', todayStart),
        orderBy('requestDate', 'desc')
      )
    );

    // Count both 'pending' and 'processing' as active requests
    const pendingCerts = await getDocs(
      query(collection(db, COLLECTIONS.certificates), where('status', 'in', ['pending', 'processing']))
    );

    return {
      totalStaff: usersSnap.size,
      totalResidents: residentsSnap.size,
      todayCertificates: todayCerts.size,
      pendingRequests: pendingCerts.size
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { totalStaff: 0, totalResidents: 0, todayCertificates: 0, pendingRequests: 0 };
  }
}