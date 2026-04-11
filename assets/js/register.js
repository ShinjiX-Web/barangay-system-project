import { registerUser } from './auth-firebase.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form.user');
    const btn  = document.getElementById('registerBtn');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const firstName = document.getElementById('exampleFirstName').value.trim();
            const lastName  = document.getElementById('exampleLastName').value.trim();
            const username  = document.getElementById('exampleUsername').value.trim();
            const email     = document.getElementById('exampleInputEmail').value.trim();
            const role      = document.getElementById('exampleRole').value;
            const password  = document.getElementById('examplePasswordInput').value;
            const repeat    = document.getElementById('exampleRepeatPasswordInput').value;
            const gender    = document.getElementById('exampleGender').value;
            const age       = document.getElementById('exampleAge').value.trim();
            const address   = document.getElementById('exampleAddress').value.trim();
            const contact   = document.getElementById('exampleContact').value.trim();

            if (!firstName || !lastName || !email || !role || !password) {
                Swal.fire('Error', 'Please fill all required fields including role.', 'warning');
                return;
            }
            if (password.length < 6) {
                Swal.fire('Error', 'Password must be at least 6 characters.', 'warning');
                return;
            }
            if (password !== repeat) {
                Swal.fire('Error', 'Passwords do not match.', 'warning');
                return;
            }

            btn.disabled = true;
            btn.innerHTML = '<span class="spinner"></span>Creating account…';

            try {
                const extraFields = { username: username || email };
                if (role === 'resident') {
                    if (gender)  extraFields.gender        = gender;
                    if (age)     extraFields.age           = parseInt(age);
                    if (address) extraFields.address       = address;
                    if (contact) extraFields.contactNumber = contact;
                }

                await registerUser(firstName, lastName, email, password, role, extraFields);

                Swal.fire({
                    icon: 'success',
                    title: 'Registration Successful!',
                    html: 'Welcome, <strong>' + firstName + ' ' + lastName + '</strong>!<br><br>' +
                          'Your account is <strong>pending approval</strong> from the Barangay Captain.<br>' +
                          'You will receive a notification once your account is activated.',
                    confirmButtonText: 'Back to Homepage',
                    confirmButtonColor: '#4e73df',
                    allowOutsideClick: false
                }).then(() => { window.location.href = '/'; });

            } catch (error) {
                const msg = error.code === 'auth/email-already-in-use'
                    ? 'This email is already registered.'
                    : error.message;
                Swal.fire('Registration Failed', msg, 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }
});
