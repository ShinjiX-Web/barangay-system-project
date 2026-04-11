import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { collection, getDocs, getDoc, doc, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { logoutUser } from './auth-firebase.js';
import { applyRoleRestrictions } from './role-guard.js';

let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
const PAGE_SIZE = 10;

window.logout = async () => {
    const result = await Swal.fire({ icon: 'question', title: 'Sign Out?', text: 'Are you sure you want to sign out?', showCancelButton: true, confirmButtonColor: '#4e73df', cancelButtonColor: '#858796', confirmButtonText: 'Yes, sign out', cancelButtonText: 'Cancel' });
    if (!result.isConfirmed) return;
    window._loggingOut = true;
    await logoutUser();
    await Swal.fire({ icon: 'success', title: 'Signed Out', text: 'You have been successfully signed out.', timer: 2000, showConfirmButton: false });
    window.location.href = '/';
};

window.loadLogs    = loadLogs;
window.applyFilters = applyFilters;
window.clearLogs   = clearLogs;

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

                if (['admin', 'secretary'].includes(data.role)) {
                    const sidebarEl = document.getElementById('adminSidebarItems');
                    if (sidebarEl) sidebarEl.style.display = 'block';
                }
                applyRoleRestrictions(data.role || 'staff', data.linkedResidentId || null);
            }
            // Reveal topbar avatar and name, hide their skeletons
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarNameSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
            const un = document.getElementById('userName');
            if (un && un.textContent.trim()) un.style.display = 'inline';
        } catch(e) {
            console.warn(e.message);
            document.getElementById('topbarAvatarSkeleton').style.display = 'none';
            document.getElementById('topbarAvatar').style.display = '';
        }

        await loadLogs();
    });
});

async function loadLogs() {
    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3"><span class="spinner-border spinner-border-sm me-2"></span>Loading logs...</td></tr>';

    try {
        const q = query(collection(db, COLLECTIONS.activityLogs), orderBy('timestamp', 'desc'));
        const snap = await getDocs(q);
        allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        filteredLogs = allLogs;
        currentPage = 1;
        renderLogs();
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    }
}

function renderLogs() {
    const tbody   = document.getElementById('logTableBody');
    const countEl = document.getElementById('logCount');

    if (!filteredLogs.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No activity logs found.</td></tr>';
        if (countEl) countEl.textContent = '0 entries';
        document.getElementById('paginationInfo').textContent = '';
        document.getElementById('paginationControls').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
    if (currentPage > totalPages) currentPage = totalPages;

    const start    = (currentPage - 1) * PAGE_SIZE;
    const pageLogs = filteredLogs.slice(start, start + PAGE_SIZE);

    const actionBadge = {
        login:   'badge bg-success',
        logout:  'badge bg-secondary',
        create:  'badge bg-primary',
        update:  'badge bg-warning text-dark',
        delete:  'badge bg-danger',
    };

    tbody.innerHTML = pageLogs.map(log => {
        const ts = log.timestamp?.toDate
            ? log.timestamp.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';
        const badge = actionBadge[log.action] || 'badge bg-secondary';
        return `<tr>
            <td class="small text-muted" style="white-space:nowrap">${ts}</td>
            <td class="small">${log.userName || log.userEmail || '—'}</td>
            <td><span class="${badge}">${(log.action || '—').toUpperCase()}</span></td>
            <td class="small text-capitalize">${log.module || '—'}</td>
            <td class="small">${log.description || '—'}</td>
        </tr>`;
    }).join('');

    if (countEl) countEl.textContent = `${filteredLogs.length} entr${filteredLogs.length !== 1 ? 'ies' : 'y'}`;

    // Pagination info
    const end = Math.min(start + PAGE_SIZE, filteredLogs.length);
    document.getElementById('paginationInfo').textContent =
        `Showing ${start + 1}–${end} of ${filteredLogs.length} entries`;

    // Pagination controls
    const ul = document.getElementById('paginationControls');
    ul.innerHTML = '';

    const addPage = (label, page, disabled, active) => {
        ul.insertAdjacentHTML('beforeend',
            `<li class="page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${page}); return false;">${label}</a>
            </li>`);
    };

    addPage('&laquo;', currentPage - 1, currentPage === 1, false);

    const delta = 2;
    const rangeStart = Math.max(1, currentPage - delta);
    const rangeEnd   = Math.min(totalPages, currentPage + delta);
    if (rangeStart > 1) { addPage('1', 1, false, false); if (rangeStart > 2) ul.insertAdjacentHTML('beforeend', '<li class="page-item disabled"><span class="page-link">…</span></li>'); }
    for (let p = rangeStart; p <= rangeEnd; p++) addPage(p, p, false, p === currentPage);
    if (rangeEnd < totalPages) { if (rangeEnd < totalPages - 1) ul.insertAdjacentHTML('beforeend', '<li class="page-item disabled"><span class="page-link">…</span></li>'); addPage(totalPages, totalPages, false, false); }

    addPage('&raquo;', currentPage + 1, currentPage === totalPages, false);
}

window.goToPage = function(page) {
    const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderLogs();
    document.getElementById('logTableBody').closest('.card').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

function applyFilters() {
    const action = document.getElementById('filterAction').value;
    const module = document.getElementById('filterModule').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();

    filteredLogs = allLogs.filter(log =>
        (!action || log.action === action) &&
        (!module || log.module === module) &&
        (!search || (log.userName || '').toLowerCase().includes(search) ||
                    (log.description || '').toLowerCase().includes(search))
    );
    currentPage = 1;
    renderLogs();
}

async function clearLogs() {
    const result = await Swal.fire({
        title: 'Clear All Logs?', text: 'This will permanently delete all activity logs.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#d33', confirmButtonText: 'Yes, clear all'
    });
    if (!result.isConfirmed) return;

    try {
        const snap = await getDocs(collection(db, COLLECTIONS.activityLogs));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, COLLECTIONS.activityLogs, d.id))));
        allLogs = [];
        filteredLogs = [];
        currentPage = 1;
        renderLogs();
        Swal.fire({ icon: 'success', title: 'Cleared!', timer: 1500, showConfirmButton: false });
    } catch(err) {
        Swal.fire({ icon: 'error', title: 'Error', text: err.message });
    }
}
