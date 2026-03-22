// Resident Management Functions

// Show/hide resident form
function showResidentForm() {
    document.getElementById('residentFormCard').style.display = 'block';
    document.getElementById('residentListCard').style.display = 'none';
    document.getElementById('residentForm').reset();
    document.getElementById('residentId').value = '';
    document.getElementById('photoPreview').src = 'assets/img/avatars/avatar1.jpeg';
    window.scrollTo(0, 0);
}

function cancelForm() {
    document.getElementById('residentFormCard').style.display = 'none';
    document.getElementById('residentListCard').style.display = 'block';
    document.getElementById('residentForm').reset();
}

// Calculate age from date of birth
function calculateAge() {
    const dob = document.getElementById('dateOfBirth').value;
    if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        document.getElementById('age').value = age;
    }
}

// Preview photo before upload
function previewPhoto() {
    const file = document.getElementById('photoUpload').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('photoPreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Save resident
function saveResident(event) {
    event.preventDefault();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        Swal.fire({
            icon: 'error',
            title: 'Not Authorized',
            text: 'You must be logged in to register residents'
        });
        return;
    }
    
    const residentId = document.getElementById('residentId').value;
    const photoFile = document.getElementById('photoUpload').files[0];
    
    // Get form data
    const residentData = {
        firstName: document.getElementById('firstName').value.trim(),
        middleName: document.getElementById('middleName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        suffix: document.getElementById('suffix').value.trim(),
        gender: document.getElementById('gender').value,
        dateOfBirth: document.getElementById('dateOfBirth').value,
        age: parseInt(document.getElementById('age').value),
        civilStatus: document.getElementById('civilStatus').value,
        address: document.getElementById('address').value.trim(),
        contactNumber: document.getElementById('contactNumber').value.trim(),
        email: document.getElementById('email').value.trim(),
        photo: document.getElementById('photoPreview').src,
        registeredBy: currentUser.id
    };
    
    // Check for duplicate
    const residents = getResidents();
    const duplicate = Object.values(residents).find(r => 
        r.firstName.toLowerCase() === residentData.firstName.toLowerCase() &&
        r.lastName.toLowerCase() === residentData.lastName.toLowerCase() &&
        r.dateOfBirth === residentData.dateOfBirth &&
        r.id !== residentId
    );
    
    if (duplicate) {
        Swal.fire({
            icon: 'warning',
            title: 'Duplicate Found',
            text: 'A resident with the same name and birth date already exists',
            confirmButtonColor: '#4e73df'
        });
        return;
    }
    
    if (residentId) {
        // Update existing
        if (updateResident(residentId, residentData)) {
            logActivity(currentUser.id, 'update', 'resident', `Updated resident: ${residentData.firstName} ${residentData.lastName}`);
            Swal.fire({
                icon: 'success',
                title: 'Updated!',
                text: 'Resident information updated successfully',
                confirmButtonColor: '#4e73df',
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                cancelForm();
                loadResidents();
            });
        }
    } else {
        // Add new
        const newId = addResident(residentData);
        logActivity(currentUser.id, 'create', 'resident', `Registered new resident: ${residentData.firstName} ${residentData.lastName}`);
        
        Swal.fire({
            icon: 'success',
            title: 'Registered!',
            text: 'Resident registered successfully',
            confirmButtonColor: '#4e73df',
            timer: 1500,
            showConfirmButton: false
        }).then(() => {
            cancelForm();
            loadResidents();
        });
    }
}

// Load and display residents
function loadResidents() {
    const residents = getResidents();
    const residentsArray = Object.values(residents);
    const tbody = document.getElementById('residentTableBody');
    
    if (residentsArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No residents registered yet</td></tr>';
        document.getElementById('residentCount').textContent = 'Total: 0 residents';
        return;
    }
    
    // Sort by registration date (newest first)
    residentsArray.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
    
    tbody.innerHTML = '';
    
    residentsArray.forEach(resident => {
        const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
        const photo = resident.photo || 'assets/img/avatars/avatar1.jpeg';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${photo}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;"></td>
            <td>${fullName}</td>
            <td>${resident.gender}</td>
            <td>${resident.age}</td>
            <td>${resident.address}</td>
            <td>${resident.contactNumber || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewResident('${resident.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="editResident('${resident.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteResident('${resident.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('residentCount').textContent = `Total: ${residentsArray.length} resident${residentsArray.length !== 1 ? 's' : ''}`;
}

// View resident details
function viewResident(residentId) {
    const residents = getResidents();
    const resident = residents[residentId];
    
    if (!resident) return;
    
    const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
    const photo = resident.photo || 'assets/img/avatars/avatar1.jpeg';
    const regDate = new Date(resident.registrationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    Swal.fire({
        title: fullName,
        html: `
            <div class="text-start">
                <div class="text-center mb-3">
                    <img src="${photo}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 50%;">
                </div>
                <p><strong>Gender:</strong> ${resident.gender}</p>
                <p><strong>Age:</strong> ${resident.age} years old</p>
                <p><strong>Date of Birth:</strong> ${new Date(resident.dateOfBirth).toLocaleDateString()}</p>
                <p><strong>Civil Status:</strong> ${resident.civilStatus}</p>
                <p><strong>Address:</strong> ${resident.address}</p>
                <p><strong>Contact:</strong> ${resident.contactNumber || 'N/A'}</p>
                <p><strong>Email:</strong> ${resident.email || 'N/A'}</p>
                <p><strong>Registered:</strong> ${regDate}</p>
            </div>
        `,
        width: 600,
        confirmButtonColor: '#4e73df',
        confirmButtonText: 'Close'
    });
}

// Edit resident
function editResident(residentId) {
    const residents = getResidents();
    const resident = residents[residentId];
    
    if (!resident) return;
    
    // Populate form
    document.getElementById('residentId').value = resident.id;
    document.getElementById('firstName').value = resident.firstName;
    document.getElementById('middleName').value = resident.middleName || '';
    document.getElementById('lastName').value = resident.lastName;
    document.getElementById('suffix').value = resident.suffix || '';
    document.getElementById('gender').value = resident.gender;
    document.getElementById('dateOfBirth').value = resident.dateOfBirth;
    document.getElementById('age').value = resident.age;
    document.getElementById('civilStatus').value = resident.civilStatus;
    document.getElementById('address').value = resident.address;
    document.getElementById('contactNumber').value = resident.contactNumber || '';
    document.getElementById('email').value = resident.email || '';
    document.getElementById('photoPreview').src = resident.photo || 'assets/img/avatars/avatar1.jpeg';
    
    showResidentForm();
}

// Delete resident
function confirmDeleteResident(residentId) {
    const residents = getResidents();
    const resident = residents[residentId];
    
    if (!resident) return;
    
    const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
    
    Swal.fire({
        icon: 'warning',
        title: 'Delete Resident?',
        text: `Are you sure you want to delete ${fullName}? This action cannot be undone.`,
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#858796',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel'
    }).then((result) => {
        if (result.isConfirmed) {
            const currentUser = getCurrentUser();
            if (deleteResident(residentId)) {
                logActivity(currentUser?.id, 'delete', 'resident', `Deleted resident: ${fullName}`);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Resident has been deleted',
                    confirmButtonColor: '#4e73df',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                loadResidents();
            }
        }
    });
}

// Search residents
function searchResidentTable() {
    const searchTerm = document.getElementById('searchResident').value.toLowerCase();
    const rows = document.querySelectorAll('#residentTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Filter by gender
function filterResidents() {
    const gender = document.getElementById('filterGender').value;
    const residents = getResidents();
    const residentsArray = Object.values(residents);
    
    const filtered = gender ? residentsArray.filter(r => r.gender === gender) : residentsArray;
    
    const tbody = document.getElementById('residentTableBody');
    tbody.innerHTML = '';
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No residents found</td></tr>';
        return;
    }
    
    filtered.forEach(resident => {
        const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
        const photo = resident.photo || 'assets/img/avatars/avatar1.jpeg';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${photo}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 50%;"></td>
            <td>${fullName}</td>
            <td>${resident.gender}</td>
            <td>${resident.age}</td>
            <td>${resident.address}</td>
            <td>${resident.contactNumber || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewResident('${resident.id}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-warning" onclick="editResident('${resident.id}')" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteResident('${resident.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}
