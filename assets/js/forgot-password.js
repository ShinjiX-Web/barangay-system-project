import { auth } from './firebase-config.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';

let lastEmail = '';
let countdownInterval = null;

async function sendReset(email) {
    await sendPasswordResetEmail(auth, email);
}

function startCountdown() {
    const resendRow = document.getElementById('resendRow');
    const resendBtn = document.getElementById('resendBtn');
    const countdown = document.getElementById('countdown');

    resendRow.classList.add('visible');
    resendBtn.disabled = true;

    let seconds = 60;
    countdown.textContent = seconds;

    clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        seconds--;
        countdown.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(countdownInterval);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend email';
        }
    }, 1000);
}

function showSuccess(email) {
    const box = document.getElementById('successBox');
    document.getElementById('successMsg').textContent =
        'We sent a reset link to ' + email + '. Check your inbox (and spam folder).';
    box.classList.add('visible');
}

// Expose resend globally (onclick in HTML)
window.resendEmail = async function () {
    if (!lastEmail) return;
    const btn = document.getElementById('resendBtn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
        await sendReset(lastEmail);
        startCountdown();
        Swal.fire({
            icon: 'success',
            title: 'Email resent',
            text: 'Another reset link has been sent to ' + lastEmail,
            timer: 3000,
            showConfirmButton: false
        });
    } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Resend email';
        Swal.fire('Error', 'Failed to resend. Please try again.', 'error');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('resetForm');
    const submitBtn = document.getElementById('submitBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('resetEmail').value.trim();

        if (!email) {
            Swal.fire('Error', 'Please enter your email address.', 'warning');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span>Sending…';

        try {
            await sendReset(email);
            lastEmail = email;

            // Hide the form, show success + resend
            form.style.display = 'none';
            showSuccess(email);
            startCountdown();

        } catch (err) {
            let msg = 'Failed to send reset email. Please try again.';
            // Firebase returns the same error for both found/not-found to prevent enumeration
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
                // Show success anyway to prevent email enumeration attacks
                lastEmail = email;
                form.style.display = 'none';
                showSuccess(email);
                startCountdown();
                return;
            }
            if (err.code === 'auth/too-many-requests') {
                msg = 'Too many requests. Please wait a moment before trying again.';
            }
            Swal.fire('Error', msg, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send reset link';
        }
    });
});
