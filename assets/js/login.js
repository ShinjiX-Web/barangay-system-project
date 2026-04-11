import { loginUser, loginWithGoogle, logActivity } from './auth-firebase.js';
import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const RECAPTCHA_SITE_KEY = '6Le2bLIsAAAAAJ2XNNBRT6GwOvE1yrn40z9H2kc9';
const RECAPTCHA_API_KEY  = 'AIzaSyAAMgLqMnsRgovpgV6dRcW459feF_AOd6w';
const RECAPTCHA_PROJECT  = 'barangay-system-701b9';

function getRecaptchaToken() {
    const token = grecaptcha.enterprise.getResponse();
    if (!token) return null;
    return token;
}

async function verifyRecaptchaToken(token) {
    const res = await fetch(
        `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT}/assessments?key=${RECAPTCHA_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: {
                    token,
                    expectedAction: 'LOGIN',
                    siteKey: RECAPTCHA_SITE_KEY,
                }
            })
        }
    );
    if (!res.ok) throw new Error('reCAPTCHA assessment request failed');
    const data = await res.json();
    // Score ranges 0.0 (bot) to 1.0 (human); reject below 0.5
    return data?.riskAnalysis?.score ?? data?.score ?? 0;
}

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, COLLECTIONS.users, user.uid));
            if (userDoc.exists() && userDoc.data().status === 'approved') {
                window.location.href = 'dashboard.html';
            }
        }
    });

    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<span class="spinner"></span>Connecting…';
            try {
                const { status, role } = await loginWithGoogle();
                if (status === 'pending') {
                    Swal.fire({
                        icon: 'info',
                        title: 'Account Pending Approval',
                        text: 'Your account is awaiting approval from the Barangay Captain. Please check back later.',
                        confirmButtonColor: '#4e73df'
                    });
                    return;
                }
                if (status === 'rejected') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Account Rejected',
                        text: 'Your account was not approved. Please contact the barangay office.',
                        confirmButtonColor: '#e74a3b'
                    });
                    return;
                }
                window.location.href = role === 'resident' ? 'residents.html' : 'dashboard.html';
            } catch (error) {
                if (error.code !== 'auth/popup-closed-by-user') {
                    Swal.fire('Error', 'Google sign-in failed. Please try again.', 'error');
                }
            } finally {
                googleBtn.disabled = false;
                googleBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg> Continue with Google`;
            }
        });
    }

    const form = document.querySelector('form.user');
    const btn  = document.getElementById('loginBtn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email    = document.getElementById('exampleInputEmail').value.trim();
            const password = document.getElementById('exampleInputPassword').value;

            if (!email || !password) {
                Swal.fire('Error', 'Email and password are required.', 'warning');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>Logging in…';

            try {
                const token = getRecaptchaToken();
                if (!token) {
                    btn.disabled = false;
                    btn.textContent = 'Login';
                    Swal.fire('Verification Required', 'Please complete the reCAPTCHA before logging in.', 'warning');
                    return;
                }
                const score = await verifyRecaptchaToken(token);
                if (score < 0.5) {
                    grecaptcha.enterprise.reset();
                    Swal.fire('Blocked', 'Suspicious activity detected. Please try again.', 'warning');
                    return;
                }

                const firebaseUser = await loginUser(email, password);
                const userDoc = await getDoc(doc(db, COLLECTIONS.users, firebaseUser.uid));

                if (!userDoc.exists()) {
                    await signOut(auth);
                    Swal.fire('Error', 'Account not found. Please contact the administrator.', 'error');
                    return;
                }

                const userData = userDoc.data();

                if (userData.status === 'pending') {
                    await signOut(auth);
                    Swal.fire({
                        icon: 'info',
                        title: 'Account Pending Approval',
                        html: `Hi <strong>${userData.firstName}</strong>, your account is awaiting approval from the Barangay Captain.<br><br>Please check back later or contact the barangay office.`,
                        confirmButtonColor: '#4e73df',
                        confirmButtonText: 'OK'
                    });
                    return;
                }

                if (userData.status === 'rejected') {
                    await signOut(auth);
                    Swal.fire({
                        icon: 'error',
                        title: 'Account Rejected',
                        text: 'Your account registration was not approved. Please contact the barangay office for more information.',
                        confirmButtonColor: '#e74a3b'
                    });
                    return;
                }

                await logActivity('login', 'auth', `User logged in: ${email}`);
                window.location.href = userData.role === 'resident' ? 'residents.html' : 'dashboard.html';

            } catch (error) {
                let msg = 'Login failed. Please check your credentials.';
                if (error.code === 'auth/user-not-found'    ) msg = 'No account found with this email.';
                if (error.code === 'auth/wrong-password'    ) msg = 'Incorrect password.';
                if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
                grecaptcha.enterprise.reset();
                Swal.fire('Login Failed', msg, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Login';
            }
        });
    }
});
