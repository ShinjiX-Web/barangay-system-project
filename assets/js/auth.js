// Authentication functionality for Barangay Management System

// Register new staff/user
function registerUser(event) {
    event.preventDefault();
    
    const firstName = document.getElementById('exampleFirstName').value.trim();
    const lastName = document.getElementById('exampleLastName').value.trim();
    const email = document.getElementById('exampleInputEmail').value.trim();
    const password = document.getElementById('examplePasswordInput').value;
    const confirmPassword = document.getElementById('exampleRepeatPasswordInput').value;
    
    // Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Please fill in all fields',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    if (!isValidEmail(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Email',
            text: 'Please enter a valid email address',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    if (password.length < 6) {
        Swal.fire({
            icon: 'warning',
            title: 'Weak Password',
            text: 'Password must be at least 6 characters long',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    if (password !== confirmPassword) {
        Swal.fire({
            icon: 'error',
            title: 'Password Mismatch',
            text: 'Passwords do not match',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    // Check if user already exists
    const users = getUsers();
    if (users[email]) {
        Swal.fire({
            icon: 'error',
            title: 'Account Exists',
            text: 'An account with this email already exists',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    // Save user with role
    users[email] = {
        id: generateUserId(),
        firstName,
        lastName,
        email,
        password: btoa(password), // Simple encoding (not secure for production)
        role: 'staff', // Default role: admin, secretary, staff
        position: '',
        contactNumber: '',
        profilePhoto: 'assets/img/avatars/avatar1.jpeg',
        isActive: true,
        dateHired: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('users', JSON.stringify(users));
    
    // Log activity
    logActivity(null, 'register', 'user', `New user registered: ${firstName} ${lastName}`);
    
    Swal.fire({
        icon: 'success',
        title: 'Account Created!',
        text: 'Your account has been created successfully. Please login.',
        confirmButtonColor: '#4e73df',
        confirmButtonText: 'Go to Login'
    }).then(() => {
        window.location.href = 'login.html';
    });
}

// Login user
function loginUser(event) {
    event.preventDefault();
    
    const email = document.getElementById('exampleInputEmail').value.trim();
    const password = document.getElementById('exampleInputPassword').value;
    const rememberMe = document.getElementById('formCheck-1').checked;
    
    // Validation
    if (!email || !password) {
        Swal.fire({
            icon: 'warning',
            title: 'Missing Information',
            text: 'Please enter both email and password',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    if (!isValidEmail(email)) {
        Swal.fire({
            icon: 'error',
            title: 'Invalid Email',
            text: 'Please enter a valid email address',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    // Check credentials
    const users = getUsers();
    const user = users[email];
    
    if (!user) {
        Swal.fire({
            icon: 'error',
            title: 'Account Not Found',
            text: 'No account found with this email',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    if (atob(user.password) !== password) {
        Swal.fire({
            icon: 'error',
            title: 'Incorrect Password',
            text: 'The password you entered is incorrect',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    // Login successful
    const sessionData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'staff',
        position: user.position || '',
        profilePhoto: user.profilePhoto || 'assets/img/avatars/avatar1.jpeg',
        loginTime: new Date().toISOString()
    };
    
    if (rememberMe) {
        localStorage.setItem('currentUser', JSON.stringify(sessionData));
    } else {
        sessionStorage.setItem('currentUser', JSON.stringify(sessionData));
    }
    
    // Log activity
    logActivity(user.id, 'login', 'auth', `User logged in: ${user.firstName} ${user.lastName}`);
    
    Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back, ${user.firstName}!`,
        confirmButtonColor: '#4e73df',
        timer: 1500,
        showConfirmButton: false
    }).then(() => {
        window.location.href = 'index.html';
    });
}

// Helper functions
function getUsers() {
    const usersData = localStorage.getItem('users');
    return usersData ? JSON.parse(usersData) : {};
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function getCurrentUser() {
    const sessionUser = sessionStorage.getItem('currentUser');
    const localUser = localStorage.getItem('currentUser');
    
    if (sessionUser) return JSON.parse(sessionUser);
    if (localUser) return JSON.parse(localUser);
    return null;
}

function logout() {
    const user = getCurrentUser();
    
    Swal.fire({
        icon: 'question',
        title: 'Sign Out?',
        text: 'Are you sure you want to sign out?',
        showCancelButton: true,
        confirmButtonColor: '#4e73df',
        cancelButtonColor: '#858796',
        confirmButtonText: 'Yes, sign out',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            // Log activity
            if (user) {
                logActivity(user.id, 'logout', 'auth', `User logged out: ${user.firstName} ${user.lastName}`);
            }
            
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('currentUser');
            
            Swal.fire({
                icon: 'success',
                title: 'Signed Out',
                text: 'You have been successfully signed out.',
                confirmButtonColor: '#4e73df',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'login.html';
            });
        }
    });
}

function checkAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
    }
    return user;
}

function updateProfilePhoto(photoUrl) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Update in users storage
    const users = getUsers();
    if (users[user.email]) {
        users[user.email].profilePhoto = photoUrl;
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Update in current session
    user.profilePhoto = photoUrl;
    if (sessionStorage.getItem('currentUser')) {
        sessionStorage.setItem('currentUser', JSON.stringify(user));
    }
    if (localStorage.getItem('currentUser')) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    }
    
    // Update all profile images on current page
    updateProfileImages();
    
    return true;
}

function updateProfileImages() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Update all profile images with class 'user-profile-img'
    const profileImages = document.querySelectorAll('.user-profile-img');
    profileImages.forEach(img => {
        img.src = user.profilePhoto || 'assets/img/avatars/avatar1.jpeg';
    });
}

// Helper function: Generate unique user ID
function generateUserId() {
    return 'USR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Helper function: Activity logging
function logActivity(userId, action, module, details) {
    const logs = getActivityLogs();
    const log = {
        id: 'LOG-' + Date.now(),
        userId: userId,
        action: action,
        module: module,
        details: details,
        timestamp: new Date().toISOString(),
        ipAddress: 'N/A' // Client-side limitation
    };
    
    logs.push(log);
    localStorage.setItem('activityLogs', JSON.stringify(logs));
}

// Helper function: Get activity logs
function getActivityLogs() {
    const logsData = localStorage.getItem('activityLogs');
    return logsData ? JSON.parse(logsData) : [];
}

// Helper function: Check user role
function hasRole(requiredRole) {
    const user = getCurrentUser();
    if (!user) return false;
    
    const roleHierarchy = {
        'admin': 3,
        'secretary': 2,
        'staff': 1
    };
    
    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
}

// Helper function: Check if user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Helper function: Check if user is secretary or admin
function isSecretary() {
    const user = getCurrentUser();
    return user && (user.role === 'secretary' || user.role === 'admin');
}
