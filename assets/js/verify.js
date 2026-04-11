import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAAMgLqMnsRgovpgV6dRcW459feF_AOd6w",
    authDomain: "barangay-system-701b9.firebaseapp.com",
    projectId: "barangay-system-701b9",
    storageBucket: "barangay-system-701b9.firebasestorage.app",
    messagingSenderId: "595188953117",
    appId: "1:595188953117:web:4371ec5d47b6d18da6d6f4"
};

// Avoid duplicate app if page ever reloads mid-session
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db  = getFirestore(app);

const CERTIFICATES_COLLECTION = 'certificates';

// ── helpers ────────────────────────────────────────────────────────
const typeLabels = {
    clearance  : 'Barangay Clearance',
    residency  : 'Certificate of Residency',
    indigency  : 'Certificate of Indigency',
    job_seeker : 'First-time Job Seeker'
};

const statusLabels = {
    pending    : 'Pending',
    processing : 'Processing',
    completed  : 'Completed / Released',
    rejected   : 'Rejected'
};

function fmt(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
}

function showVerified(cert, id) {
    const isRejected = cert.status === 'rejected';
    const box = document.getElementById('statusBox');

    if (isRejected) {
        box.className = 'status-box rejected';
        box.innerHTML = `
            <div class="status-icon"><i class="fas fa-times-circle"></i></div>
            <p class="status-title">✔ Verified – Rejected Document</p>
            <p class="status-sub">This document exists in our records but has been <strong style="color:#c0392b;">rejected</strong>.<br>Please contact the barangay office for any concern.</p>`;
    } else {
        box.className = 'status-box verified';
        box.innerHTML = `
            <div class="status-icon"><i class="fas fa-check-circle"></i></div>
            <p class="status-title">✔ Verified – Authentic Document</p>
            <p class="status-sub">This certificate was officially issued by Barangay 14.</p>`;
    }

    const rows = [
        ['Document Type',  typeLabels[cert.certificateType] || cert.certificateType || '—'],
        ['Issued To',      cert.residentName || '—'],
        ['Purpose',        cert.purpose       || '—'],
        ['Date Issued',    fmt(cert.requestDate)],
        ['Document Status',statusLabels[cert.status] || cert.status || '—'],
        ['Reference No.',  id],
    ];

    document.getElementById('detailRows').innerHTML = rows
        .map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`)
        .join('');

    document.getElementById('certDetails').style.display = 'block';
}

function showInvalid(reason) {
    const box = document.getElementById('statusBox');
    box.className = 'status-box invalid';
    box.innerHTML = `
        <div class="status-icon"><i class="fas fa-times-circle"></i></div>
        <p class="status-title">⚠ Not Verified</p>
        <p class="status-sub">${reason}</p>`;
}

// ── main ───────────────────────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
const certId = params.get('id');

if (!certId) {
    showInvalid('No certificate ID was provided in this QR code. The document may be invalid or tampered with.');
} else {
    (async () => {
        try {
            const snap = await getDoc(doc(db, CERTIFICATES_COLLECTION, certId));
            if (snap.exists()) {
                showVerified(snap.data(), certId);
            } else {
                showInvalid('No matching certificate was found in our records. This document may be fraudulent or has not been issued by Barangay 14.');
            }
        } catch (err) {
            showInvalid(`Could not connect to the verification server. Please try again later. (${err.message})`);
        }
    })();
}
