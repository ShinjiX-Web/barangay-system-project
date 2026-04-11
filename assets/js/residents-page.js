import { auth, db, COLLECTIONS } from './firebase-config.js';
import { logActivity } from './auth-firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getDoc, doc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { loadResidentsFirebase } from './residents-firebase.js';
import { applyRoleRestrictions, isResidentRole } from './role-guard.js';

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
                let displayName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || firebaseUser.email;
                // For residents, use the linked resident record as the source of truth for the name
                if (data.role === 'resident' && data.linkedResidentId) {
                    try {
                        const resSnap = await getDoc(doc(db, COLLECTIONS.residents, data.linkedResidentId));
                        if (resSnap.exists()) {
                            const resData = resSnap.data();
                            const resName = `${resData.firstName || ''} ${resData.lastName || ''}`.trim();
                            if (resName) displayName = resName;
                        }
                    } catch (e) { /* keep user doc name as fallback */ }
                }
                const el = document.getElementById('userName');
                if (el) el.textContent = displayName;
                if (data.profilePhoto) {
                    document.querySelectorAll('.user-profile-img, .img-profile').forEach(img => {
                        img.src = data.profilePhoto;
                    });
                }

                const role = data.role || 'staff';

                // Show admin sidebar for admin/secretary
                if (['admin', 'secretary'].includes(role)) {
                    const sidebarEl = document.getElementById('adminSidebarItems');
                    if (sidebarEl) sidebarEl.style.display = 'block';
                }

                applyRoleRestrictions(role, data.linkedResidentId || null);

                // Reveal page heading
                document.getElementById('residentsHeadingSkeleton').style.display = 'none';
                document.getElementById('residentsHeading').style.display = '';

                if (isResidentRole(role)) {
                    // Change heading (button + skeleton already removed by applyRoleRestrictions)
                    document.getElementById('residentsHeading').textContent = 'My Resident Profile';
                    // Hide search/filter row — resident only sees their own record
                    const searchRow = document.getElementById('searchResident')?.closest('.row');
                    if (searchRow) searchRow.style.display = 'none';
                    // Store linked ID so loadResidentsFirebase can filter
                    window._linkedResidentId = data.linkedResidentId || null;
                } else {
                    // Staff: reveal add button, hide its skeleton
                    const btnSkel = document.getElementById('addResidentBtnSkeleton');
                    if (btnSkel) btnSkel.style.display = 'none';
                    const btn = document.getElementById('addResidentBtn');
                    if (btn) btn.style.display = '';
                }
            }
            // Reveal topbar avatar and name, hide their skeletons
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarNameSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
            const un = document.getElementById('userName');
            if (un && un.textContent.trim()) un.style.display = 'inline';
        } catch (e) {
            console.warn('Could not load user profile:', e.message);
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
        }

        await loadResidentsFirebase();
    });
});
