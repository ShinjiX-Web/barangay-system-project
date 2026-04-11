import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getDoc, getDocs, doc, collection, query, where, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { applyRoleRestrictions } from './role-guard.js';

let currentUserId = null;
let _linkedResidentId = null;

window.logout = async () => {
    const result = await Swal.fire({ icon: 'question', title: 'Sign Out?', text: 'Are you sure you want to sign out?', showCancelButton: true, confirmButtonColor: '#4e73df', cancelButtonColor: '#858796', confirmButtonText: 'Yes, sign out', cancelButtonText: 'Cancel' });
    if (!result.isConfirmed) return;
    window._loggingOut = true;
    await signOut(auth);
    await Swal.fire({ icon: 'success', title: 'Signed Out', text: 'You have been successfully signed out.', timer: 2000, showConfirmButton: false });
    window.location.href = '/';
};

window.changeProfilePhoto  = changeProfilePhoto;
window.selectAvatar        = selectAvatar;
window.uploadProfilePhoto  = uploadProfilePhoto;

// ── Compress image → base64 (no Firebase Storage needed) ─────────────
function compressImageToBase64(file, maxSize = 300, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = e => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;
                if (width > height) {
                    if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
                } else {
                    if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
                }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function uploadProfilePhoto(input) {
    const file = input.files[0];
    if (!file || !currentUserId) return;
    if (file.size > 5 * 1024 * 1024) {
        Swal.fire({ icon: 'error', title: 'File too large', text: 'Please choose an image under 5MB.' });
        return;
    }
    Swal.fire({ title: 'Processing photo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        const base64 = await compressImageToBase64(file);
        await updateDoc(doc(db, COLLECTIONS.users, currentUserId), {
            profilePhoto: base64, updatedAt: serverTimestamp()
        });
        setProfilePhoto(base64);
        Swal.fire({ icon: 'success', title: 'Photo Updated!', timer: 1500, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Failed', text: err.message });
    }
    input.value = '';
}

// ── Helper: set photo on all img targets and make visible ─────────────
function setProfilePhoto(src) {
    const fallback = 'assets/img/avatars/avatar1.jpeg';
    const url = src || fallback;
    document.querySelectorAll('.user-profile-img, .img-profile').forEach(img => img.src = url);
    const main = document.getElementById('mainProfilePhoto');
    if (main) { main.src = url; main.style.visibility = 'visible'; }
}

// ── Boot ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) { if (!window._loggingOut) window.location.href = 'login.html'; return; }
        currentUserId = firebaseUser.uid;

        try {
            const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();

                // For residents, use the linked resident record as the source of truth for the name
                let residentData = null;
                _linkedResidentId = (data.role === 'resident' && data.linkedResidentId) ? data.linkedResidentId : null;
                if (_linkedResidentId) {
                    try {
                        const resSnap = await getDoc(doc(db, COLLECTIONS.residents, _linkedResidentId));
                        if (resSnap.exists()) residentData = resSnap.data();
                    } catch (e) { /* keep user doc as fallback */ }
                }
                const sourceData = residentData || data;

                // Topbar name
                const displayName = `${sourceData.firstName || ''} ${sourceData.lastName || ''}`.trim() || firebaseUser.email;
                const el = document.getElementById('userName');
                if (el) el.textContent = displayName;

                // Profile photo — visible only once real src is set (no flash)
                setProfilePhoto(data.profilePhoto);

                // Pre-fill User Settings form — use resident record for residents
                document.getElementById('username').value   = data.username       || '';
                document.getElementById('email').value      = data.email          || firebaseUser.email;
                document.getElementById('first_name').value = sourceData.firstName || '';
                document.getElementById('last_name').value  = sourceData.lastName  || '';

                // ── Account Overview ──────────────────────────────────
                const roleEl   = document.getElementById('profileRole');
                const statusEl = document.getElementById('profileStatus');
                const sinceEl  = document.getElementById('profileMemberSince');

                const roleLabels = { admin: 'Admin', secretary: 'Secretary', staff: 'Staff', resident: 'Resident' };
                const roleColors = { admin: 'bg-danger', secretary: 'bg-warning text-dark', staff: 'bg-primary', resident: 'bg-success' };
                const role = data.role || 'staff';
                if (roleEl) { roleEl.textContent = roleLabels[role] || role; roleEl.className = `badge rounded-pill ${roleColors[role] || 'bg-secondary'}`; }

                const status = data.status || 'approved';
                if (statusEl) {
                    statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                    statusEl.className = `badge rounded-pill ${status === 'approved' ? 'bg-success' : status === 'pending' ? 'bg-warning text-dark' : 'bg-danger'}`;
                }

                if (sinceEl) {
                    const since = data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null);
                    sinceEl.textContent = since ? since.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
                }

                // ── Certificate Summary ───────────────────────────────
                try {
                    let certsQuery;
                    if (role === 'resident' && data.linkedResidentId) {
                        certsQuery = query(collection(db, COLLECTIONS.certificates), where('residentId', '==', data.linkedResidentId));
                    } else {
                        certsQuery = query(collection(db, COLLECTIONS.certificates));
                    }
                    const snap = await getDocs(certsQuery);
                    let total = 0, pending = 0, completed = 0;
                    snap.forEach(d => {
                        total++;
                        const s = d.data().status;
                        if (s === 'pending' || s === 'processing') pending++;
                        if (s === 'completed') completed++;
                    });
                    document.getElementById('certTotal').textContent     = total;
                    document.getElementById('certPending').textContent   = pending;
                    document.getElementById('certCompleted').textContent = completed;
                } catch (e) {
                    document.getElementById('certTotal').textContent     = '—';
                    document.getElementById('certPending').textContent   = '—';
                    document.getElementById('certCompleted').textContent = '—';
                }

                // ── Sidebar role visibility ──────────────────────────
                if (['admin', 'secretary'].includes(role)) {
                    const sidebarEl = document.getElementById('adminSidebarItems');
                    if (sidebarEl) sidebarEl.style.display = 'block';
                }
                applyRoleRestrictions(role, data.linkedResidentId || null);
            }
            // Reveal topbar avatar and name, hide their skeletons
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarNameSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
            const un = document.getElementById('userName');
            if (un && un.textContent.trim()) un.style.display = 'inline';
        } catch (e) {
            console.warn('Could not load user profile:', e.message);
            setProfilePhoto(null);
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
        }

        // ── Save User Settings ────────────────────────────────────────
        const settingsForm = document.getElementById('profileSettingsForm');
        if (settingsForm) {
            settingsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username  = document.getElementById('username').value.trim();
                const firstName = document.getElementById('first_name').value.trim();
                const lastName  = document.getElementById('last_name').value.trim();

                if (!firstName || !lastName) {
                    Swal.fire({ icon: 'warning', title: 'Required', text: 'First and last name are required.' });
                    return;
                }

                try {
                    await updateDoc(doc(db, COLLECTIONS.users, currentUserId), {
                        username:  username || firebaseUser.email,
                        firstName, lastName,
                        updatedAt: serverTimestamp()
                    });
                    // If resident, also sync name to the linked resident record
                    if (_linkedResidentId) {
                        await updateDoc(doc(db, COLLECTIONS.residents, _linkedResidentId), {
                            firstName, lastName,
                            updatedAt: serverTimestamp()
                        });
                    }
                    // Update topbar name immediately
                    const el = document.getElementById('userName');
                    if (el) el.textContent = `${firstName} ${lastName}`.trim();
                    Swal.fire({ icon: 'success', title: 'Settings Saved!', timer: 1500, showConfirmButton: false });
                } catch (err) {
                    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
                }
            });
        }
    });
});

// ── Avatar picker ─────────────────────────────────────────────────────
function changeProfilePhoto() {
    const avatars = [
        'assets/img/avatars/avatar1.jpeg', 'assets/img/avatars/avatar2.jpeg',
        'assets/img/avatars/avatar3.jpeg', 'assets/img/avatars/avatar4.jpeg',
        'assets/img/avatars/avatar5.jpeg', 'assets/img/dogs/image1.jpeg',
        'assets/img/dogs/image2.jpeg',     'assets/img/dogs/image3.jpeg'
    ];
    Swal.fire({
        title: 'Choose Your Profile Photo',
        html: `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;padding:20px;">
            ${avatars.map(a => `
                <div style="text-align:center;cursor:pointer;" onclick="selectAvatar('${a}')">
                    <img src="${a}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #ddd;"
                         onmouseover="this.style.borderColor='#4e73df'"
                         onmouseout="this.style.borderColor='#ddd'">
                </div>`).join('')}
        </div>`,
        showConfirmButton: false, showCancelButton: true, cancelButtonText: 'Close', width: 600
    });
}

async function selectAvatar(avatarPath) {
    Swal.close();
    if (!currentUserId) return;
    try {
        await updateDoc(doc(db, COLLECTIONS.users, currentUserId), {
            profilePhoto: avatarPath, updatedAt: serverTimestamp()
        });
        setProfilePhoto(avatarPath);
        Swal.fire({ icon: 'success', title: 'Photo Updated!', timer: 1500, showConfirmButton: false });
    } catch (err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}
