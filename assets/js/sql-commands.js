import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getDoc, getDocs, doc, collection } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { applyRoleRestrictions } from './role-guard.js';

async function fetchFirebaseData() {
    const convertValue = (val) => {
        if (val && typeof val.toDate === 'function') {
            const d = val.toDate();
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        }
        return val;
    };

    const processDoc = (docSnap) => {
        const data = docSnap.data();
        const processed = { document_id: docSnap.id };
        for (const [key, val] of Object.entries(data)) {
            processed[key] = convertValue(val);
        }
        return processed;
    };

    const fetchColl = async (collName) => {
        const snapshot = await getDocs(collection(db, collName));
        return snapshot.docs.map(processDoc);
    };

    const [residents, certificates, users, activitylogs, settings] = await Promise.all([
        fetchColl(COLLECTIONS.residents),
        fetchColl(COLLECTIONS.certificates),
        fetchColl(COLLECTIONS.users),
        fetchColl(COLLECTIONS.activityLogs),
        fetchColl('settings')
    ]);

    return { residents, certificates, users, activitylogs, settings };
}

window.fetchFirebaseData = fetchFirebaseData;

window.logout = async () => {
    const result = await Swal.fire({ icon: 'question', title: 'Sign Out?', text: 'Are you sure you want to sign out?', showCancelButton: true, confirmButtonColor: '#4e73df', cancelButtonColor: '#858796', confirmButtonText: 'Yes, sign out', cancelButtonText: 'Cancel' });
    if (!result.isConfirmed) return;
    window._loggingOut = true;
    await signOut(auth);
    await Swal.fire({ icon: 'success', title: 'Signed Out', text: 'You have been successfully signed out.', timer: 2000, showConfirmButton: false });
    window.location.href = '/';
};

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
                document.getElementById('topbarAvatarSkeleton').style.display = 'none';
                document.getElementById('topbarNameSkeleton').style.display = 'none';
                document.getElementById('topbarAvatar').style.display = '';
                const un = document.getElementById('userName');
                if (un && un.textContent.trim()) un.style.display = 'inline';

                if (data.role !== 'admin') {
                    Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Admin access required.' })
                        .then(() => window.location.href = 'dashboard.html');
                    return;
                }

                if (['admin', 'secretary'].includes(data.role)) {
                    const sidebarEl = document.getElementById('adminSidebarItems');
                    if (sidebarEl) sidebarEl.style.display = 'block';
                }
                applyRoleRestrictions(data.role || 'staff', data.linkedResidentId || null);

                fetchFirebaseData().then(fbData => {
                    if (typeof window.initDbWithFirebaseData === 'function') {
                        window.initDbWithFirebaseData(fbData);
                    }
                }).catch(e => console.error('Failed to load Firebase data for SQL playground:', e));
            }
        } catch(e) {
            console.warn(e.message);
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
        }
    });
});
