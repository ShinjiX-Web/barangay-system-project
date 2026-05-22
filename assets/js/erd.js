import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { applyRoleRestrictions } from './role-guard.js';

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
            }
        } catch(e) {
            console.warn(e.message);
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
        }
    });
});
