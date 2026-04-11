import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

window.checkDatabase = checkDatabase;

onAuthStateChanged(auth, (user) => {
    const el = document.getElementById('authStatus');
    if (user) {
        el.className = 'alert alert-success';
        el.innerHTML = `<strong>Logged in as:</strong> ${user.email}`;
    } else {
        el.className = 'alert alert-warning';
        el.innerHTML = '<strong>Not logged in.</strong> <a href="login.html">Login here</a>';
    }
});

async function checkDatabase() {
    const el = document.getElementById('dbStatus');
    el.className = 'alert alert-info';
    el.textContent = 'Checking...';
    try {
        const [usersSnap, residentsSnap, certsSnap] = await Promise.all([
            getDocs(collection(db, COLLECTIONS.users)),
            getDocs(collection(db, COLLECTIONS.residents)),
            getDocs(collection(db, COLLECTIONS.certificates))
        ]);
        el.className = 'alert alert-success';
        el.innerHTML = `
            <strong>Firestore connected</strong><br>
            Users: ${usersSnap.size}<br>
            Residents: ${residentsSnap.size}<br>
            Certificates: ${certsSnap.size}
        `;
    } catch (err) {
        el.className = 'alert alert-danger';
        el.innerHTML = `<strong>Error:</strong> ${err.message}`;
    }
}

// Auto-check on load
document.addEventListener('DOMContentLoaded', checkDatabase);
