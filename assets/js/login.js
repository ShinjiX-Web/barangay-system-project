import { loginUser, logActivity } from './auth-firebase.js';
import { auth, db, COLLECTIONS } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, COLLECTIONS.users, user.uid));
            if (userDoc.exists() && userDoc.data().status === 'approved') {
                window.location.href = 'dashboard.html';
            }
        }
    });

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
                Swal.fire('Login Failed', msg, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Login';
            }
        });
    }
});
