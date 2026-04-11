import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { collection, getDocs, getDoc, doc, updateDoc, orderBy, query, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { applyRoleRestrictions } from './role-guard.js';

window.logout = async () => {
    const result = await Swal.fire({ icon: 'question', title: 'Sign Out?', text: 'Are you sure you want to sign out?', showCancelButton: true, confirmButtonColor: '#4e73df', cancelButtonColor: '#858796', confirmButtonText: 'Yes, sign out', cancelButtonText: 'Cancel' });
    if (!result.isConfirmed) return;
    window._loggingOut = true;
    await signOut(auth);
    await Swal.fire({ icon: 'success', title: 'Signed Out', text: 'You have been successfully signed out.', timer: 2000, showConfirmButton: false });
    window.location.href = '/';
};

window.approveUser = approveUser;
window.rejectUser  = rejectUser;
window.changeRole  = changeRole;

let currentUserRole = 'staff';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) { if (!window._loggingOut) window.location.href = 'login.html'; return; }

        // Load current user profile
        try {
            const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                currentUserRole = data.role || 'staff';
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

                // Show pending approvals card only for admin
                if (currentUserRole === 'admin') {
                    document.getElementById('pendingCard').style.display = 'block';
                    await loadPendingUsers();
                }
                // Show admin sidebar items for admin and secretary
                if (['admin', 'secretary'].includes(currentUserRole)) {
                    const sidebarEl = document.getElementById('adminSidebarItems');
                    if (sidebarEl) sidebarEl.style.display = 'block';
                }
                applyRoleRestrictions(currentUserRole, data.linkedResidentId || null);
            }
        } catch(e) {
            console.warn(e.message);
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
        }

        await loadUsersTable();
    });
});

// ── Pending approvals (admin only) ───────────────────────────────────
async function loadPendingUsers() {
    const tbody = document.getElementById('pendingTableBody');
    try {
        const snap = await getDocs(query(
            collection(db, COLLECTIONS.users),
            where('status', '==', 'pending'),
        ));

        document.getElementById('pendingCount').textContent = snap.size;

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No pending approvals.</td></tr>';
            return;
        }

        tbody.innerHTML = snap.docs.map(d => {
            const u = d.data();
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            const date = u.createdAt?.toDate ? u.createdAt.toDate().toLocaleDateString() : '—';
            return `<tr>
                <td>${name}</td>
                <td>${u.email || '—'}</td>
                <td><span class="badge bg-secondary text-capitalize">${u.role || 'staff'}</span></td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-success me-1" onclick="approveUser('${d.id}')"><i class="fas fa-check me-1"></i>Approve</button>
                    <button class="btn btn-sm btn-danger" onclick="rejectUser('${d.id}')"><i class="fas fa-times me-1"></i>Reject</button>
                </td>
            </tr>`;
        }).join('');
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
    }
}

async function approveUser(uid) {
    const result = await Swal.fire({
        title: 'Approve this account?',
        text: 'The user will be able to log in after approval.',
        icon: 'question', showCancelButton: true,
        confirmButtonColor: '#1cc88a', confirmButtonText: 'Yes, Approve'
    });
    if (!result.isConfirmed) return;
    try {
        await updateDoc(doc(db, COLLECTIONS.users, uid), {
            status: 'approved', isActive: true, updatedAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'Approved!', timer: 1500, showConfirmButton: false });
        await loadPendingUsers();
        await loadUsersTable();
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}

async function rejectUser(uid) {
    const result = await Swal.fire({
        title: 'Reject this account?',
        text: 'The user will be notified their account was not approved.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#e74a3b', confirmButtonText: 'Yes, Reject'
    });
    if (!result.isConfirmed) return;
    try {
        await updateDoc(doc(db, COLLECTIONS.users, uid), {
            status: 'rejected', isActive: false, updatedAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'Rejected', timer: 1500, showConfirmButton: false });
        await loadPendingUsers();
        await loadUsersTable();
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}

async function changeRole(uid, newRole) {
    try {
        await updateDoc(doc(db, COLLECTIONS.users, uid), {
            role: newRole, updatedAt: serverTimestamp()
        });
        Swal.fire({ icon: 'success', title: 'Role Updated!', timer: 1200, showConfirmButton: false });
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}

// ── Staff table ───────────────────────────────────────────────────────
async function loadUsersTable() {
    const tbody  = document.getElementById('userTableBody');
    const infoEl = document.getElementById('dataTable_info');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3"><span class="spinner-border spinner-border-sm me-2"></span>Loading staff...</td></tr>';

    try {
        const snap = await getDocs(query(
            collection(db, COLLECTIONS.users),
            where('status', '==', 'approved'),
            where('role', 'in', ['admin', 'staff', 'secretary']),
            orderBy('createdAt', 'desc')
        ));

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No approved staff yet.</td></tr>';
            if (infoEl) infoEl.textContent = 'Showing 0 to 0 of 0';
            return;
        }

        const roleBadge = { admin:'badge bg-danger', secretary:'badge bg-primary', staff:'badge bg-secondary', resident:'badge bg-info' };
        const isAdmin   = currentUserRole === 'admin';

        tbody.innerHTML = '';
        let count = 0;
        snap.forEach(docSnap => {
            const u = docSnap.data();
            count++;
            let formattedDate = '—';
            const rawDate = u.dateHired || u.createdAt;
            if (rawDate) {
                const d = rawDate.toDate ? rawDate.toDate() : new Date(rawDate);
                if (!isNaN(d)) formattedDate = d.toLocaleDateString('en-US', { year:'numeric', month:'2-digit', day:'2-digit' });
            }
            const roleClass   = roleBadge[u.role] || 'badge bg-secondary';
            const statusBadge = u.isActive !== false ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-warning text-dark">Inactive</span>';
            const photo       = u.profilePhoto || 'assets/img/avatars/avatar1.jpeg';
            const name        = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

            // Role selector — only admin can change roles
            const roleCell = isAdmin
                ? `<select class="form-select form-select-sm" style="width:120px" onchange="changeRole('${docSnap.id}', this.value)">
                        <option value="staff"     ${u.role==='staff'     ?'selected':''}>Staff</option>
                        <option value="secretary" ${u.role==='secretary' ?'selected':''}>Secretary</option>
                        <option value="admin"     ${u.role==='admin'     ?'selected':''}>Admin</option>
                        <option value="resident"  ${u.role==='resident'  ?'selected':''}>Resident</option>
                   </select>`
                : `<span class="${roleClass}">${(u.role||'staff').toUpperCase()}</span>`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img class="rounded-circle me-2" width="30" height="30" src="${photo}" style="object-fit:cover;" onerror="this.src='assets/img/avatars/avatar1.jpeg'">${name}</td>
                <td>${roleCell}</td>
                <td>${u.position || '—'}</td>
                <td>${statusBadge}</td>
                <td>${formattedDate}</td>
                <td>${u.email || '—'}</td>
            `;
            tbody.appendChild(tr);
        });

        if (infoEl) infoEl.textContent = `Showing 1 to ${count} of ${count}`;
    } catch(err) {
        console.error('Error loading staff:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    }
}
