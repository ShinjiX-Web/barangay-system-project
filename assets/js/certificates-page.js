import { auth, db, COLLECTIONS } from './firebase-config.js';
import { logActivity } from './auth-firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, query, orderBy, where, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { applyRoleRestrictions, isResidentRole } from './role-guard.js';

// ── globals ──────────────────────────────────────────────────────────
let allCertificates = [];
let filteredCerts   = [];
let currentCertPage = 1;
const CERT_PAGE_SIZE = 5;

window.logout = async () => {
    const result = await Swal.fire({ icon: 'question', title: 'Sign Out?', text: 'Are you sure you want to sign out?', showCancelButton: true, confirmButtonColor: '#4e73df', cancelButtonColor: '#858796', confirmButtonText: 'Yes, sign out', cancelButtonText: 'Cancel' });
    if (!result.isConfirmed) return;
    window._loggingOut = true;
    await signOut(auth);
    await Swal.fire({ icon: 'success', title: 'Signed Out', text: 'You have been successfully signed out.', timer: 2000, showConfirmButton: false });
    window.location.href = '/';
};

window.showRequestsForm   = showRequestForm;
window.cancelRequestForm  = cancelRequestForm;
window.submitRequest      = submitRequest;
window.loadCertificates   = loadCertificates;
window.filterCertificates = filterCertificates;
window.loadResidentInfo   = loadResidentInfo;
window.updateStatus       = updateStatus;
window.printCertificate   = printCertificate;
window.viewCertificate    = viewCertificate;
window.printFromPreview   = printFromPreview;

// ── boot ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) { if (!window._loggingOut) window.location.href = 'login.html'; return; }

        try {
            const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));
            if (userDoc.exists()) {
                const d = userDoc.data();
                let displayName = `${d.firstName || ''} ${d.lastName || ''}`.trim() || firebaseUser.email;
                // For residents, use the linked resident record as the source of truth for the name
                if (d.role === 'resident' && d.linkedResidentId) {
                    try {
                        const resSnap = await getDoc(doc(db, COLLECTIONS.residents, d.linkedResidentId));
                        if (resSnap.exists()) {
                            const resData = resSnap.data();
                            const resName = `${resData.firstName || ''} ${resData.lastName || ''}`.trim();
                            if (resName) displayName = resName;
                        }
                    } catch (e) { /* keep user doc name as fallback */ }
                }
                const el = document.getElementById('userName');
                if (el) el.textContent = displayName;
                document.querySelectorAll('.user-profile-img').forEach(img => {
                    img.src = d.profilePhoto || 'assets/img/avatars/avatar1.jpeg';
                });

                const role = d.role || 'staff';

                if (['admin', 'secretary'].includes(role)) {
                    const sidebarEl = document.getElementById('adminSidebarItems');
                    if (sidebarEl) sidebarEl.style.display = 'block';
                }

                applyRoleRestrictions(role, d.linkedResidentId || null);

                if (isResidentRole(role)) {
                    const linkedId = d.linkedResidentId;

                    // Pre-select and lock the resident selector to their own record
                    window._residentLockedId = linkedId;

                    // After the resident list loads, auto-select and disable the dropdown
                    const selectEl = document.getElementById('residentSelect');
                    if (selectEl && linkedId) {
                        // Poll until the select is populated (certs.js loads it async)
                        const tryLockSelect = () => {
                            if (selectEl.options.length > 1) {
                                // Check if their option exists
                                const opt = [...selectEl.options].find(o => o.value === linkedId);
                                if (opt) {
                                    selectEl.value = linkedId;
                                    selectEl.dispatchEvent(new Event('change'));
                                }
                                // Disable so resident can't pick someone else
                                selectEl.disabled = true;
                                // Hide other options visually
                                [...selectEl.options].forEach(o => {
                                    if (o.value && o.value !== linkedId) o.style.display = 'none';
                                });
                            } else {
                                setTimeout(tryLockSelect, 200);
                            }
                        };
                        setTimeout(tryLockSelect, 400);
                    }

                    // Filter the certificate list to only this resident's certs
                    window._filterResidentCerts = linkedId;
                }
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

        await loadCertificates();
        await updateStats();
        await populateResidentDropdown();
    });
});

// ── load certificates ─────────────────────────────────────────────────
async function loadCertificates() {
    const container = document.getElementById('certificateQueue');
    container.innerHTML = '<p class="text-center text-muted py-3"><span class="spinner-border spinner-border-sm me-2"></span>Loading...</p>';
    try {
        // If resident role: only load their own certificates
        const lockedResidentId = window._filterResidentCerts;
        let q;
        if (lockedResidentId) {
            q = query(
                collection(db, COLLECTIONS.certificates),
                where('residentId', '==', lockedResidentId),
                orderBy('requestDate', 'desc')
            );
        } else {
            q = query(collection(db, COLLECTIONS.certificates), orderBy('requestDate', 'desc'));
        }
        const snap = await getDocs(q);
        allCertificates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        filteredCerts   = allCertificates;
        currentCertPage = 1;
        renderCertificates();
    } catch(err) {
        container.innerHTML = `<p class="text-center text-danger">Error: ${err.message}</p>`;
    }
}

function renderCertificates() {
    const container = document.getElementById('certificateQueue');

    if (!filteredCerts.length) {
        container.innerHTML = '<p class="text-center text-muted py-4">No certificates found.</p>';
        document.getElementById('certPaginationInfo').textContent = '';
        document.getElementById('certPaginationControls').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(filteredCerts.length / CERT_PAGE_SIZE);
    if (currentCertPage > totalPages) currentCertPage = totalPages;

    const start    = (currentCertPage - 1) * CERT_PAGE_SIZE;
    const pageCerts = filteredCerts.slice(start, start + CERT_PAGE_SIZE);

    const typeLabels  = { clearance:'Barangay Clearance', residency:'Certificate of Residency', indigency:'Certificate of Indigency', job_seeker:'First-time Job Seeker', business:'Business Clearance', blotter_id:'Barangay ID / Blotter Records', solo_parent:'Solo Parent Certificate', good_moral:'Good Moral Certificate', other:'Other Official Certifications' };
    const statusClass = { pending:'primary', processing:'warning', completed:'success', rejected:'danger' };

    container.innerHTML = pageCerts.map(c => {
        const date  = c.requestDate?.toDate ? c.requestDate.toDate().toLocaleDateString() : '—';
        const badge = statusClass[c.status] || 'secondary';
        return `
        <div class="card queue-card ${c.status} mb-3">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="mb-1 fw-bold">${c.residentName || '—'}</h6>
                        <p class="mb-1 text-muted small">${typeLabels[c.certificateType] || c.certificateType}</p>
                        <p class="mb-1 small"><strong>Purpose:</strong> ${c.purpose || '—'}</p>
                        <p class="mb-0 small text-muted">${date}</p>
                    </div>
                    <div class="text-end">
                        <span class="badge bg-${badge} mb-2">${c.status?.toUpperCase()}</span><br>
                        ${window._filterResidentCerts ? '' : `
                        <select class="form-select form-select-sm mb-1" onchange="updateStatus('${c.id}', this.value)" style="width:140px">
                            <option value="pending"   ${c.status==='pending'   ?'selected':''}>Pending</option>
                            <option value="processing"${c.status==='processing'?'selected':''}>Processing</option>
                            <option value="completed" ${c.status==='completed' ?'selected':''}>Completed</option>
                            <option value="rejected"  ${c.status==='rejected'  ?'selected':''}>Rejected</option>
                        </select>`}
                        <div class="d-flex gap-1 mt-1">
                            <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="viewCertificate('${c.id}')"><i class="fas fa-eye"></i> View</button>
                            <button class="btn btn-sm btn-outline-success flex-grow-1" onclick="printCertificate('${c.id}')"><i class="fas fa-print"></i> Print</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Pagination info
    const end = Math.min(start + CERT_PAGE_SIZE, filteredCerts.length);
    document.getElementById('certPaginationInfo').textContent =
        `Showing ${start + 1}–${end} of ${filteredCerts.length} entries`;

    // Pagination controls
    const ul = document.getElementById('certPaginationControls');
    ul.innerHTML = '';
    const addPage = (label, page, disabled, active) => {
        ul.insertAdjacentHTML('beforeend',
            `<li class="page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}">
                <a class="page-link" href="#" onclick="goToCertPage(${page}); return false;">${label}</a>
            </li>`);
    };
    addPage('&laquo;', currentCertPage - 1, currentCertPage === 1, false);
    const delta = 2;
    const rangeStart = Math.max(1, currentCertPage - delta);
    const rangeEnd   = Math.min(totalPages, currentCertPage + delta);
    if (rangeStart > 1) { addPage('1', 1, false, false); if (rangeStart > 2) ul.insertAdjacentHTML('beforeend', '<li class="page-item disabled"><span class="page-link">…</span></li>'); }
    for (let p = rangeStart; p <= rangeEnd; p++) addPage(p, p, false, p === currentCertPage);
    if (rangeEnd < totalPages) { if (rangeEnd < totalPages - 1) ul.insertAdjacentHTML('beforeend', '<li class="page-item disabled"><span class="page-link">…</span></li>'); addPage(totalPages, totalPages, false, false); }
    addPage('&raquo;', currentCertPage + 1, currentCertPage === totalPages, false);
}

window.goToCertPage = function(page) {
    const totalPages = Math.ceil(filteredCerts.length / CERT_PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    currentCertPage = page;
    renderCertificates();
    document.getElementById('certificateQueue').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ── stats ─────────────────────────────────────────────────────────────
async function updateStats() {
    const today = new Date(); today.setHours(0,0,0,0);
    const counts = { pending:0, processing:0, completed:0, today:0 };
    allCertificates.forEach(c => {
        if (counts[c.status] !== undefined) counts[c.status]++;
        const d = c.requestDate?.toDate ? c.requestDate.toDate() : new Date(c.requestDate);
        if (d >= today) counts.today++;
    });
    document.getElementById('statPending').textContent    = counts.pending;
    document.getElementById('statProcessing').textContent = counts.processing;
    document.getElementById('statCompleted').textContent  = counts.completed;
    document.getElementById('statToday').textContent      = counts.today;
}

// ── filter ────────────────────────────────────────────────────────────
function filterCertificates() {
    const status = document.getElementById('filterStatus').value;
    const type   = document.getElementById('filterType').value;
    filteredCerts   = allCertificates.filter(c =>
        (!status || c.status === status) && (!type || c.certificateType === type)
    );
    currentCertPage = 1;
    renderCertificates();
}

// ── download all certificates (CSV / PDF / Word) ──────────────────────
window.downloadAllCertificates = function(format) {
    if (!allCertificates.length) {
        Swal.fire({ icon: 'info', title: 'No Data', text: 'There are no certificates to download.', timer: 2000, showConfirmButton: false });
        return;
    }

    const typeLabels = { clearance: 'Barangay Clearance', residency: 'Certificate of Residency', indigency: 'Certificate of Indigency', job_seeker: 'First-time Job Seeker' };
    const now        = new Date().toISOString().slice(0, 10);

    const rows = allCertificates.map((c, i) => {
        const date = c.requestDate?.toDate
            ? c.requestDate.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : '—';
        return [
            i + 1,
            c.residentName || '—',
            typeLabels[c.certificateType] || c.certificateType || '—',
            c.purpose || '—',
            (c.status || '—').toUpperCase(),
            date,
        ];
    });

    const headers = ['#', 'Resident Name', 'Certificate Type', 'Purpose', 'Status', 'Request Date'];

    if (format === 'csv') {
        const escape = val => `"${String(val).replace(/"/g, '""')}"`;
        const csv    = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\r\n');
        triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `certificates_${now}.csv`);
    }

    else if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const docPdf = new jsPDF({ orientation: 'landscape' });

        docPdf.setFontSize(14);
        docPdf.text('Barangay 14 — Certificate Records', 14, 15);
        docPdf.setFontSize(9);
        docPdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);

        docPdf.autoTable({
            startY: 26,
            head: [headers],
            body: rows,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [78, 115, 223], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 247, 255] },
            columnStyles: { 0: { cellWidth: 10 }, 3: { cellWidth: 50 } },
        });

        docPdf.save(`certificates_${now}.pdf`);
    }

    else if (format === 'word') {
        const tdStyle = 'border:1px solid #ccc;padding:6px 10px;font-size:11pt;';
        const thStyle = 'background:#4e73df;color:#fff;padding:7px 10px;font-size:11pt;text-align:left;border:1px solid #4e73df;';

        const headerRow = '<tr>' + headers.map(h => '<th style="' + thStyle + '">' + h + '</th>').join('') + '</tr>';
        const bodyRows  = rows.map(r => '<tr>' + r.map(cell => '<td style="' + tdStyle + '">' + cell + '</td>').join('') + '</tr>').join('');

        const html = '<html><head><meta charset="utf-8"><title>Certificate Records</title>'
            + '<style>body{font-family:Calibri,Arial,sans-serif;margin:20mm;}'
            + 'h2{color:#4e73df;margin-bottom:4px;}p{font-size:10pt;color:#555;margin:0 0 12px;}'
            + 'table{border-collapse:collapse;width:100%;}</style></head><body>'
            + '<h2>Barangay 14 &mdash; Certificate Records</h2>'
            + '<p>Generated: ' + new Date().toLocaleString() + '</p>'
            + '<table><thead>' + headerRow + '</thead><tbody>' + bodyRows + '</tbody></table>'
            + '</' + 'body></' + 'html>';

        triggerDownload(new Blob(['\ufeff' + html], { type: 'application/msword' }), `certificates_${now}.doc`);
    }
};

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
}

// ── resident dropdown ─────────────────────────────────────────────────
async function populateResidentDropdown() {
    try {
        const sel = document.getElementById('residentSelect');
        const residents = [];

        // 1. From dedicated residents collection
        const residentsSnap = await getDocs(query(collection(db, COLLECTIONS.residents), orderBy('lastName')));
        residentsSnap.forEach(d => {
            const r = d.data();
            residents.push({ id: d.id, firstName: r.firstName || '', lastName: r.lastName || '', address: r.address || '', age: r.age || '' });
        });

        // 2. From users collection — approved residents
        const usersSnap = await getDocs(query(
            collection(db, COLLECTIONS.users),
            where('role', '==', 'resident'),
            where('status', '==', 'approved')
        ));
        usersSnap.forEach(d => {
            const r = d.data();
            residents.push({ id: 'user_' + d.id, firstName: r.firstName || '', lastName: r.lastName || '', address: r.address || '', age: r.age || '' });
        });

        residents.sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`));

        residents.forEach(r => {
            const name = `${r.firstName} ${r.lastName}`.trim();
            const opt = document.createElement('option');
            opt.value = r.id;
            opt.textContent = name;
            opt.dataset.address = r.address;
            opt.dataset.age = r.age;
            sel.appendChild(opt);
        });
    } catch(e) { console.warn('Could not load residents:', e.message); }
}

function loadResidentInfo() {
    const sel = document.getElementById('residentSelect');
    const opt = sel.options[sel.selectedIndex];
    document.getElementById('residentInfo').innerHTML = opt.value
        ? `<strong>${opt.textContent}</strong> — ${opt.dataset.address || 'No address'}, Age: ${opt.dataset.age || '—'}`
        : 'No resident selected';
}

// ── form ──────────────────────────────────────────────────────────────
function showRequestForm() {
    document.getElementById('requestFormCard').style.display = 'block';
    document.getElementById('queueCard').style.display = 'none';
    document.getElementById('requestFormCard').scrollIntoView({ behavior: 'smooth' });
}

function cancelRequestForm() {
    document.getElementById('requestFormCard').style.display = 'none';
    document.getElementById('queueCard').style.display = 'block';
    document.getElementById('certRequestForm').reset();
    document.getElementById('residentInfo').textContent = 'No resident selected';
}

async function submitRequest(e) {
    e.preventDefault();
    const sel = document.getElementById('residentSelect');
    const residentId      = sel.value;
    const residentName    = sel.options[sel.selectedIndex].textContent;
    const residentAddress = sel.options[sel.selectedIndex].dataset.address || '';
    const certType        = document.getElementById('certificateType').value;
    const purpose         = document.getElementById('purpose').value.trim();

    try {
        await addDoc(collection(db, COLLECTIONS.certificates), {
            residentId, residentName, residentAddress, certificateType: certType,
            purpose, status: 'pending',
            requestDate: serverTimestamp(), updatedAt: serverTimestamp()
        });

        // Log activity
        await logActivity('create', 'certificates', `Created ${certType} certificate request for ${residentName}`);

        Swal.fire({ icon:'success', title:'Request Submitted!', text:'Certificate request added to queue.', timer:2000, showConfirmButton:false });
        cancelRequestForm();
        await loadCertificates();
        await updateStats();
    } catch(err) {
        Swal.fire({ icon:'error', title:'Error', text: err.message });
    }
}

// ── status update ─────────────────────────────────────────────────────
async function updateStatus(id, status) {
    try {
        const cert = allCertificates.find(c => c.id === id);
        await updateDoc(doc(db, COLLECTIONS.certificates, id), { status, updatedAt: serverTimestamp() });

        // Log activity
        await logActivity('update', 'certificates', `Updated certificate ${cert?.residentName || id} status to ${status}`);

        await loadCertificates();
        await updateStats();
    } catch(err) {
        Swal.fire({ icon:'error', title:'Error', text: err.message });
    }
}

// ── certificate HTML builder ──────────────────────────────────────────
function buildCertHTML(cert) {
    const typeLabels = { clearance:'Barangay Clearance', residency:'Certificate of Residency', indigency:'Certificate of Indigency', job_seeker:'First-time Job Seeker', business:'Business Clearance', blotter_id:'Barangay ID / Blotter Records', solo_parent:'Solo Parent Certificate', good_moral:'Good Moral Certificate', other:'Other Official Certifications' };
    const certType = typeLabels[cert.certificateType] || cert.certificateType || '—';
    const date = cert.requestDate?.toDate
        ? cert.requestDate.toDate().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'})
        : new Date().toLocaleDateString('en-US', {year:'numeric', month:'long', day:'numeric'});
    const qrId = `qr-${cert.id}`;
    const qrData = `${window.location.origin}${window.location.pathname.replace('certificates.html','verify.html')}?id=${cert.id || ''}`;

    const html = `
        <div style="
            padding: 60px 80px;
            font-family: 'Times New Roman', serif;
            max-width: 750px;
            margin: auto;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color: #000;
            position: relative;
        ">
            <img
                src="assets/img/Seal_of_Angeles_City.png"
                class="cert-watermark-img"
                alt=""
                aria-hidden="true"
                style="
                    position: absolute;
                    top: 55%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 420px;
                    height: 420px;
                    object-fit: contain;
                    opacity: 0.13;
                    pointer-events: none;
                    z-index: 0;
                    display: block;
                    filter: none;
                    -webkit-filter: none;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                "
            >

            <div style="position: relative; z-index: 1;">

                <div style="text-align: center; margin-bottom: 12px;">
                    <img src="assets/img/Seal_of_Angeles_City.png"
                         style="width: 100px; height: 100px; object-fit: contain; display: block; margin: 0 auto;"
                         onerror="this.style.display='none'">
                </div>

                <div style="text-align: center; margin-bottom: 24px;">
                    <p style="margin: 0; font-size: 15px;">Republic of the Philippines</p>
                    <p style="margin: 0; font-size: 15px;">City of Angeles</p>
                    <p style="margin: 0; font-size: 15px;">Barangay 14, Zone 2, District 2</p>
                </div>

                <div style="text-align: center; margin-bottom: 32px;">
                    <h2 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase;">${certType}</h2>
                </div>

                <p style="text-align: justify; font-size: 15px; line-height: 2; margin-bottom: 16px; text-indent: 48px;">
                    This is to certify that <u><strong>${cert.residentName || '—'}</strong></u> is a bonafide resident of ${cert.residentAddress || 'Barangay 14, Zone 2, District 2, Angeles City, Pampanga'} and that the purpose of this certificate is for <strong>${cert.purpose || '—'}</strong>.
                </p>
                <p style="text-align: justify; font-size: 15px; line-height: 2; margin-bottom: 48px; text-indent: 48px;">
                    This certificate is issued upon the request of the above-named person for whatever legal purpose it may serve.
                </p>

                <p style="text-align: right; font-size: 14px; margin-bottom: 24px;">
                    <strong>Issued on:</strong> ${date}
                </p>

                <div style="display: table; width: 100%; margin-bottom: 0;">
                    <div style="display: table-cell; width: 30%; vertical-align: bottom; padding-bottom: 4px;">
                        <div id="${qrId}" style="width: 80px; height: 80px;"></div>
                        <p style="margin: 4px 0 0; font-size: 10px; color: #666;">Scan to verify</p>
                    </div>
                    <div style="display: table-cell; width: 10%; text-align: center; vertical-align: bottom;">
                        <img src="assets/img/signature.png"
                             style="height: 60px; max-width: 180px; object-fit: contain; display: block; margin: 0 auto;"
                             onerror="this.style.display='none'">
                        <div style="border-top: 2px solid #000; padding-top: 4px; margin-top: 2px;">
                            <p style="margin: 0; font-weight: bold; font-size: 14px;">${cert.captainName || 'Nathaniel Castro Panares'}</p>
                            <p style="margin: 0; font-weight: bold; font-size: 13px;">Barangay Captain</p>
                            <p style="margin: 0; font-size: 13px;">Barangay 14, Zone 2, District 2</p>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 11px; color: #666; text-align: center;">
                    Doc Ref: ${cert.id || 'N/A'} &nbsp;|&nbsp; Issued: ${date}
                </div>

            </div>
        </div>`;

    return { html, qrId, qrData };
}

// Generates QR code into a specific container element
function generateQR(qrId, qrData) {
    return new Promise((resolve) => {
        const qrEl = document.getElementById(qrId);
        if (qrEl && typeof QRCode !== 'undefined') {
            qrEl.innerHTML = '';
            new QRCode(qrEl, {
                text: qrData,
                width: 80, height: 80,
                colorDark: '#000000', colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
            setTimeout(resolve, 150);
        } else {
            resolve();
        }
    });
}

function viewCertificate(id) {
    const cert = allCertificates.find(c => c.id === id);
    if (!cert) return;
    const { html, qrId, qrData } = buildCertHTML(cert);
    document.getElementById('certPreviewContent').innerHTML = html;
    generateQR(qrId, qrData);
    const modal = new bootstrap.Modal(document.getElementById('certPreviewModal'));
    modal.show();
}

function printFromPreview() {
    const qrDiv = document.querySelector('#certPreviewContent [id^="qr-"]');
    const certId = qrDiv ? qrDiv.id.replace('qr-', '') : null;
    const cert = certId ? allCertificates.find(c => c.id === certId) : null;
    if (!cert) {
        const content = document.getElementById('certPreviewContent').innerHTML;
        document.getElementById('printArea').innerHTML = content;
        setTimeout(() => window.print(), 400);
        return;
    }
    const { html, qrId, qrData } = buildCertHTML(cert);
    document.getElementById('printArea').innerHTML = html;
    generateQR(qrId, qrData).then(() => window.print());
}

async function printCertificate(id) {
    const cert = allCertificates.find(c => c.id === id);
    if (!cert) return;
    const { html, qrId, qrData } = buildCertHTML(cert);
    document.getElementById('printArea').innerHTML = html;
    await generateQR(qrId, qrData);
    window.print();
}
