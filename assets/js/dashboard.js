import { getDashboardStats } from './firebase-db.js';
import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getDoc, getDocs, doc, collection, query, orderBy, limit, where } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
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
    // Wait for Firebase Auth to confirm the session BEFORE touching Firestore.
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
            if (!window._loggingOut) window.location.href = 'login.html';
            return;
        }

        // Auth is confirmed. Now safe to read Firestore.
        try {
            // Load the staff profile for display name
            const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                let displayName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || firebaseUser.email;
                // For residents, use the linked resident record as the source of truth for the name
                if (userData.role === 'resident' && userData.linkedResidentId) {
                    try {
                        const resSnap = await getDoc(doc(db, COLLECTIONS.residents, userData.linkedResidentId));
                        if (resSnap.exists()) {
                            const resData = resSnap.data();
                            const resName = `${resData.firstName || ''} ${resData.lastName || ''}`.trim();
                            if (resName) displayName = resName;
                        }
                    } catch (e) { /* keep user doc name as fallback */ }
                }
                const userNameElement = document.getElementById('userName');
                if (userNameElement) userNameElement.textContent = displayName;
                // Update topbar avatar with saved profile photo
                if (userData.profilePhoto) {
                    document.querySelectorAll('.user-profile-img, .img-profile').forEach(img => {
                        img.src = userData.profilePhoto;
                    });
                }

                const role = userData.role || 'staff';

                // Apply role restrictions (shows/hides sidebar items based on role)
                applyRoleRestrictions(role, userData.linkedResidentId || null);

                // Reveal page heading
                document.getElementById('dashHeadingSkeleton').style.display = 'none';
                document.getElementById('dashHeading').style.display = '';

                if (isResidentRole(role)) {
                    // Switch to resident dashboard view
                    document.getElementById('dashSkeleton').style.display = 'none';
                    document.getElementById('residentDashWidgets').style.display = 'block';
                    document.getElementById('dashHeading').textContent = 'My Dashboard';

                    // Remove "New Resident" header button
                    document.querySelectorAll('[data-staff-only]').forEach(el => el.remove());

                    const linkedId = userData.linkedResidentId;
                    if (!linkedId) return;

                    // Load this resident's certificates only
                    try {
                        const certsSnap = await getDocs(
                            query(collection(db, COLLECTIONS.certificates), where('residentId', '==', linkedId))
                        );
                        const all = [];
                        certsSnap.forEach(d => all.push({ id: d.id, ...d.data() }));

                        // Stats
                        document.getElementById('resTotalRequests').textContent      = all.length;
                        document.getElementById('resPendingRequests').textContent    = all.filter(c => c.status === 'pending').length;
                        document.getElementById('resCompletedRequests').textContent  = all.filter(c => c.status === 'completed').length;
                        document.getElementById('resProcessingRequests').textContent = all.filter(c => c.status === 'processing').length;

                        // Recent certs table
                        const typeLabels = { clearance:'Brgy Clearance', residency:'Residency', indigency:'Indigency', job_seeker:'Job Seeker', business:'Business Clearance', blotter_id:'Brgy ID / Blotter', solo_parent:'Solo Parent', good_moral:'Good Moral', other:'Other Certifications' };
                        const statusBadge = { pending:'badge bg-warning text-dark', processing:'badge bg-primary', completed:'badge bg-success', rejected:'badge bg-danger' };

                        if (all.length === 0) {
                            document.getElementById('resMyCerts').innerHTML = '<tr><td colspan="5" class="text-center text-muted">No requests yet. <a href="certificates.html">Make your first request.</a></td></tr>';
                        } else {
                            const sorted = all.sort((a, b) => (b.requestDate?.seconds || 0) - (a.requestDate?.seconds || 0));
                            let rows = '';
                            sorted.slice(0, 8).forEach((c, i) => {
                                const date = c.requestDate?.toDate ? c.requestDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                                rows += `<tr>
                                    <td class="fw-bold">${i + 1}</td>
                                    <td>${typeLabels[c.certificateType] || c.certificateType || '—'}</td>
                                    <td>${c.purpose || '—'}</td>
                                    <td><span class="${statusBadge[c.status] || 'badge bg-secondary'}">${(c.status || '—').toUpperCase()}</span></td>
                                    <td>${date}</td>
                                </tr>`;
                            });
                            document.getElementById('resMyCerts').innerHTML = rows;
                        }
                    } catch (e) {
                        console.error('Resident certs load failed:', e.message);
                    }
                } else {
                    // Show staff-only elements after role is confirmed
                    document.getElementById('dashSkeleton').style.display = 'none';
                    document.getElementById('staffDashWidgets').style.display = '';
                    document.querySelectorAll('[data-staff-only]').forEach(el => el.style.display = '');
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

        // Load dashboard stats now that auth token is active
        try {
            const stats = await getDashboardStats();
            document.getElementById('dashTotalStaff').textContent      = stats.totalStaff;
            document.getElementById('dashTotalResidents').textContent   = stats.totalResidents;
            document.getElementById('dashTodayCerts').textContent       = stats.todayCertificates;
            document.getElementById('dashPendingCerts').textContent     = stats.pendingRequests;
        } catch (e) {
            console.error('Dashboard stats failed:', e.message);
            document.getElementById('dashTotalStaff').textContent      = '—';
            document.getElementById('dashTotalResidents').textContent   = '—';
            document.getElementById('dashTodayCerts').textContent       = '—';
            document.getElementById('dashPendingCerts').textContent     = '—';
        }

        // Load recent certificate requests from Firestore
        try {
            const certsSnap = await getDocs(
                query(collection(db, COLLECTIONS.certificates), orderBy('requestDate', 'desc'), limit(5))
            );

            const typeLabels = {
                clearance:   'Brgy Clearance',
                residency:   'Residency',
                indigency:   'Indigency',
                job_seeker:  'Job Seeker',
                business:    'Business Clearance',
                blotter_id:  'Brgy ID / Blotter',
                solo_parent: 'Solo Parent',
                good_moral:  'Good Moral',
                other:       'Other Certifications'
            };
            const statusBadge = {
                pending:    'badge bg-warning text-dark',
                processing: 'badge bg-primary',
                completed:  'badge bg-success',
                rejected:   'badge bg-danger'
            };

            if (certsSnap.empty) {
                document.getElementById('dashRecentCerts').innerHTML =
                    '<tr><td colspan="5" class="text-center text-muted">No recent requests.</td></tr>';
            } else {
                let rows = '';
                let queue = 1;
                certsSnap.forEach(d => {
                    const c = d.data();
                    const date = c.requestDate?.toDate
                        ? c.requestDate.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—';
                    const type   = typeLabels[c.certificateType] || c.certificateType || '—';
                    const badge  = statusBadge[c.status] || 'badge bg-secondary';
                    rows += `
                        <tr>
                            <td class="text-center fw-bold">#${queue++}</td>
                            <td>${c.residentName || '—'}</td>
                            <td>${type}</td>
                            <td><span class="${badge}">${(c.status || '—').toUpperCase()}</span></td>
                            <td>${date}</td>
                        </tr>`;
                });
                document.getElementById('dashRecentCerts').innerHTML = rows;
            }
        } catch (e) {
            console.error('Recent certs failed:', e.message);
            document.getElementById('dashRecentCerts').innerHTML =
                '<tr><td colspan="5" class="text-center text-danger">Could not load certificates.</td></tr>';
        }

        // Load Certificate Statistics widget (all certs, count by type)
        try {
            const allCertsSnap = await getDocs(collection(db, COLLECTIONS.certificates));
            const counts = { clearance: 0, residency: 0, indigency: 0, job_seeker: 0 };
            allCertsSnap.forEach(d => {
                const t = d.data().certificateType;
                if (counts[t] !== undefined) counts[t]++;
            });

            const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

            const types = [
                { key: 'clearance',  stat: 'statClearance',  prog: 'progClearance'  },
                { key: 'residency',  stat: 'statResidency',  prog: 'progResidency'  },
                { key: 'indigency',  stat: 'statIndigency',  prog: 'progIndigency'  },
                { key: 'job_seeker', stat: 'statJobSeeker',  prog: 'progJobSeeker'  },
            ];

            types.forEach(({ key, stat, prog }) => {
                const count = counts[key];
                const pct   = Math.round((count / total) * 100);
                const statEl = document.getElementById(stat);
                const progEl = document.getElementById(prog);
                if (statEl) statEl.textContent = count;
                if (progEl) {
                    progEl.style.width        = `${pct}%`;
                    progEl.setAttribute('aria-valuenow', pct);
                }
            });
        } catch (e) {
            console.error('Certificate stats failed:', e.message);
        }
    });
});
