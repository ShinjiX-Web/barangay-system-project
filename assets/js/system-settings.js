import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { collection, getDocs, getDoc, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { applyRoleRestrictions } from './role-guard.js';

window.logout = async () => {
    const result = await Swal.fire({ icon: 'question', title: 'Sign Out?', text: 'Are you sure you want to sign out?', showCancelButton: true, confirmButtonColor: '#4e73df', cancelButtonColor: '#858796', confirmButtonText: 'Yes, sign out', cancelButtonText: 'Cancel' });
    if (!result.isConfirmed) return;
    window._loggingOut = true;
    await signOut(auth);
    await Swal.fire({ icon: 'success', title: 'Signed Out', text: 'You have been successfully signed out.', timer: 2000, showConfirmButton: false });
    window.location.href = '/';
};

window.checkStatus = checkStatus;

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) { if (!window._loggingOut) window.location.href = 'login.html'; return; }

        try {
            const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                const el = document.getElementById('userName');
                if (el) el.textContent = `${data.firstName || ''} ${data.lastName || ''}`.trim() || firebaseUser.email;
                if (data.profilePhoto) {
                    document.querySelectorAll('.user-profile-img, .img-profile').forEach(img => img.src = data.profilePhoto);
                }
                // Reveal topbar avatar and name, hide their skeletons
                document.getElementById('topbarAvatarSkeleton').style.display = 'none';
                document.getElementById('topbarNameSkeleton').style.display = 'none';
                document.getElementById('topbarAvatar').style.display = '';
                const un = document.getElementById('userName');
                if (un && un.textContent.trim()) un.style.display = 'inline';

                // Only admins should access this page
                if (data.role !== 'admin') {
                    Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Admin access required.' })
                        .then(() => window.location.href = 'dashboard.html');
                    return;
                }

                // ── Sidebar role visibility ──────────────────────────
                if (['admin', 'secretary'].includes(data.role)) {
                    const sidebarEl = document.getElementById('adminSidebarItems');
                    if (sidebarEl) sidebarEl.style.display = 'block';
                }
                applyRoleRestrictions(data.role || 'staff', data.linkedResidentId || null);
            }
        } catch(e) {
            console.warn(e.message);
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
        }

        // Load saved settings
        await loadSettings();
        await checkStatus();
    });
});

async function loadSettings() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'barangay'));
        if (snap.exists()) {
            const d = snap.data();
            document.getElementById('brgyName').value        = d.name        || 'Barangay 14';
            document.getElementById('brgyZone').value        = d.zone        || 'Zone 2, District 2';
            document.getElementById('brgyCity').value        = d.city        || 'Manila';
            document.getElementById('brgyProvince').value    = d.province    || 'Metro Manila';
            document.getElementById('brgyContact').value     = d.contact     || '';
            document.getElementById('brgyEmail').value       = d.email       || '';
            document.getElementById('captainName').value     = d.captainName || '';
            document.getElementById('captainTermStart').value= d.termStart   || '';
            document.getElementById('captainTermEnd').value  = d.termEnd     || '';
        }
    } catch(e) { console.warn('Could not load settings:', e.message); }
}

// Save Barangay Info
document.getElementById('barangayInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, 'settings', 'barangay'), {
            name:     document.getElementById('brgyName').value.trim(),
            zone:     document.getElementById('brgyZone').value.trim(),
            city:     document.getElementById('brgyCity').value.trim(),
            province: document.getElementById('brgyProvince').value.trim(),
            contact:  document.getElementById('brgyContact').value.trim(),
            email:    document.getElementById('brgyEmail').value.trim(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false });
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
});

// Save Captain Info
document.getElementById('captainInfoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await setDoc(doc(db, 'settings', 'barangay'), {
            captainName: document.getElementById('captainName').value.trim(),
            termStart:   document.getElementById('captainTermStart').value,
            termEnd:     document.getElementById('captainTermEnd').value,
            updatedAt:   serverTimestamp()
        }, { merge: true });
        Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false });
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
});

async function checkStatus() {
    const authEl    = document.getElementById('statusAuth');
    const dbEl      = document.getElementById('statusDB');
    const recordsEl = document.getElementById('statusRecords');

    // Auth status
    authEl.className = auth.currentUser ? 'badge bg-success' : 'badge bg-danger';
    authEl.textContent = auth.currentUser ? 'Connected' : 'Disconnected';

    // Firestore status + record counts
    try {
        const [users, residents, certs] = await Promise.all([
            getDocs(collection(db, COLLECTIONS.users)),
            getDocs(collection(db, COLLECTIONS.residents)),
            getDocs(collection(db, COLLECTIONS.certificates))
        ]);
        dbEl.className   = 'badge bg-success';
        dbEl.textContent = 'Connected';
        const total = users.size + residents.size + certs.size;
        recordsEl.textContent = `${total} (${users.size} staff, ${residents.size} residents, ${certs.size} certs)`;
    } catch(err) {
        dbEl.className   = 'badge bg-danger';
        dbEl.textContent = 'Error';
        recordsEl.textContent = '—';
    }
}
