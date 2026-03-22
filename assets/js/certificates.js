// Certificate Management Functions

// Show request form
function showRequestForm() {
    document.getElementById('requestFormCard').style.display = 'block';
    document.getElementById('queueCard').style.display = 'none';
    loadResidentSelect();
    window.scrollTo(0, 0);
}

function cancelRequestForm() {
    document.getElementById('requestFormCard').style.display = 'none';
    document.getElementById('queueCard').style.display = 'block';
    document.getElementById('certRequestForm').reset();
    document.getElementById('residentInfo').innerHTML = 'No resident selected';
}

// Load residents into select dropdown
function loadResidentSelect() {
    const residents = getResidents();
    const residentsArray = Object.values(residents).filter(r => r.isActive);
    const select = document.getElementById('residentSelect');
    
    select.innerHTML = '<option value="">Choose resident...</option>';
    
    residentsArray.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
    
    residentsArray.forEach(resident => {
        const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
        const option = document.createElement('option');
        option.value = resident.id;
        option.textContent = fullName;
        select.appendChild(option);
    });
}

// Load resident info
function loadResidentInfo() {
    const residentId = document.getElementById('residentSelect').value;
    if (!residentId) {
        document.getElementById('residentInfo').innerHTML = 'No resident selected';
        return;
    }
    
    const residents = getResidents();
    const resident = residents[residentId];
    
    if (resident) {
        const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
        document.getElementById('residentInfo').innerHTML = `
            <strong>${fullName}</strong><br>
            Age: ${resident.age} | Gender: ${resident.gender}<br>
            Address: ${resident.address}
        `;
    }
}

// Submit certificate request
function submitRequest(event) {
    event.preventDefault();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        Swal.fire({
            icon: 'error',
            title: 'Not Authorized',
            text: 'You must be logged in to request certificates'
        });
        return;
    }
    
    const residentId = document.getElementById('residentSelect').value;
    const certificateType = document.getElementById('certificateType').value;
    const purpose = document.getElementById('purpose').value.trim();
    
    const requestData = {
        residentId: residentId,
        certificateType: certificateType,
        purpose: purpose
    };
    
    const result = requestCertificate(requestData);
    
    if (result) {
        const residents = getResidents();
        const resident = residents[residentId];
        const fullName = `${resident.firstName} ${resident.lastName}`;
        
        logActivity(currentUser.id, 'create', 'certificate', `Certificate requested for ${fullName} - ${certificateType}`);
        
        Swal.fire({
            icon: 'success',
            title: 'Request Submitted!',
            html: `
                <p>Certificate request has been added to queue</p>
                <p><strong>Queue Number:</strong> ${result.queueNumber}</p>
                <p class="text-muted">You will be notified when the certificate is ready</p>
            `,
            confirmButtonColor: '#4e73df'
        }).then(() => {
            cancelRequestForm();
            loadCertificates();
            updateStats();
        });
    }
}

// Load and display certificates
function loadCertificates() {
    const certificates = getCertificates();
    const certificatesArray = Object.values(certificates);
    const queueDiv = document.getElementById('certificateQueue');
    
    if (certificatesArray.length === 0) {
        queueDiv.innerHTML = '<p class="text-center text-muted">No certificate requests yet</p>';
        return;
    }
    
    // Sort by request date (newest first)
    certificatesArray.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));
    
    queueDiv.innerHTML = '';
    const residents = getResidents();
    
    certificatesArray.forEach(cert => {
        const resident = residents[cert.residentId];
        if (!resident) return;
        
        const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
        const requestDate = new Date(cert.requestDate).toLocaleString();
        
        const statusBadge = {
            'pending': '<span class="badge bg-primary">Pending</span>',
            'processing': '<span class="badge bg-warning">Processing</span>',
            'completed': '<span class="badge bg-success">Completed</span>'
        };
        
        const typeLabel = {
            'clearance': 'Barangay Clearance',
            'residency': 'Residency Certificate',
            'indigency': 'Indigency Certificate',
            'job_seeker': 'Job Seeker Certificate'
        };
        
        const statusClass = cert.status === 'completed' ? 'completed' : cert.status === 'processing' ? 'processing' : '';
        
        const card = document.createElement('div');
        card.className = `card queue-card ${statusClass} mb-3`;
        card.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="mb-1">${typeLabel[cert.certificateType]}</h6>
                        <p class="mb-1"><strong>Resident:</strong> ${fullName}</p>
                        <p class="mb-1"><strong>Purpose:</strong> ${cert.purpose}</p>
                        <p class="mb-1 text-muted"><small>Queue: ${cert.queueNumber} | Requested: ${requestDate}</small></p>
                        ${cert.certificateNumber ? `<p class="mb-0"><strong>Certificate No:</strong> ${cert.certificateNumber}</p>` : ''}
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">${statusBadge[cert.status]}</div>
                        ${cert.status === 'pending' ? `
                            <button class="btn btn-sm btn-warning mb-1" onclick="processRequest('${cert.id}')">
                                <i class="fas fa-cog"></i> Process
                            </button>
                        ` : ''}
                        ${cert.status === 'processing' ? `
                            <button class="btn btn-sm btn-success mb-1" onclick="completeRequest('${cert.id}')">
                                <i class="fas fa-check"></i> Complete
                            </button>
                        ` : ''}
                        ${cert.status === 'completed' ? `
                            <button class="btn btn-sm btn-primary mb-1" onclick="printCertificate('${cert.id}')">
                                <i class="fas fa-print"></i> Print
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-info mb-1" onclick="viewCertificate('${cert.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `;
        queueDiv.appendChild(card);
    });
}

// Update statistics
function updateStats() {
    const certificates = Object.values(getCertificates());
    const today = new Date().toISOString().split('T')[0];
    
    document.getElementById('statPending').textContent = certificates.filter(c => c.status === 'pending').length;
    document.getElementById('statProcessing').textContent = certificates.filter(c => c.status === 'processing').length;
    document.getElementById('statCompleted').textContent = certificates.filter(c => c.status === 'completed').length;
    document.getElementById('statToday').textContent = certificates.filter(c => c.requestDate.startsWith(today)).length;
}

// Process request
function processRequest(certId) {
    const currentUser = getCurrentUser();
    
    Swal.fire({
        icon: 'question',
        title: 'Start Processing?',
        text: 'Mark this certificate request as processing?',
        showCancelButton: true,
        confirmButtonColor: '#f6c23e',
        confirmButtonText: 'Yes, start processing'
    }).then((result) => {
        if (result.isConfirmed) {
            if (updateCertificateStatus(certId, 'processing', currentUser?.id)) {
                logActivity(currentUser?.id, 'update', 'certificate', `Started processing certificate ${certId}`);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Processing',
                    text: 'Certificate is now being processed',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                loadCertificates();
                updateStats();
            }
        }
    });
}

// Complete request
function completeRequest(certId) {
    const currentUser = getCurrentUser();
    
    Swal.fire({
        icon: 'success',
        title: 'Mark as Completed?',
        text: 'This will generate the certificate number and mark it as ready',
        showCancelButton: true,
        confirmButtonColor: '#1cc88a',
        confirmButtonText: 'Yes, complete'
    }).then((result) => {
        if (result.isConfirmed) {
            if (updateCertificateStatus(certId, 'completed', currentUser?.id)) {
                logActivity(currentUser?.id, 'update', 'certificate', `Completed certificate ${certId}`);
                
                const cert = getCertificates()[certId];
                Swal.fire({
                    icon: 'success',
                    title: 'Completed!',
                    html: `
                        <p>Certificate is now ready</p>
                        <p><strong>Certificate No:</strong> ${cert.certificateNumber}</p>
                    `,
                    confirmButtonColor: '#4e73df'
                });
                
                loadCertificates();
                updateStats();
            }
        }
    });
}

// View certificate details
function viewCertificate(certId) {
    const cert = getCertificates()[certId];
    const resident = getResidents()[cert.residentId];
    
    if (!cert || !resident) return;
    
    const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
    const typeLabel = {
        'clearance': 'Barangay Clearance',
        'residency': 'Residency Certificate',
        'indigency': 'Indigency Certificate',
        'job_seeker': 'Job Seeker Certificate'
    };
    
    Swal.fire({
        title: typeLabel[cert.certificateType],
        html: `
            <div class="text-start">
                <p><strong>Queue Number:</strong> ${cert.queueNumber}</p>
                ${cert.certificateNumber ? `<p><strong>Certificate No:</strong> ${cert.certificateNumber}</p>` : ''}
                <p><strong>Status:</strong> ${cert.status.toUpperCase()}</p>
                <hr>
                <p><strong>Resident:</strong> ${fullName}</p>
                <p><strong>Address:</strong> ${resident.address}</p>
                <p><strong>Age:</strong> ${resident.age}</p>
                <p><strong>Gender:</strong> ${resident.gender}</p>
                <hr>
                <p><strong>Purpose:</strong> ${cert.purpose}</p>
                <p><strong>Requested:</strong> ${new Date(cert.requestDate).toLocaleString()}</p>
                ${cert.processedDate ? `<p><strong>Completed:</strong> ${new Date(cert.processedDate).toLocaleString()}</p>` : ''}
            </div>
        `,
        width: 600,
        confirmButtonColor: '#4e73df'
    });
}

// Print certificate
function printCertificate(certId) {
    const cert = getCertificates()[certId];
    const resident = getResidents()[cert.residentId];
    
    if (!cert || !resident || cert.status !== 'completed') {
        Swal.fire({
            icon: 'error',
            title: 'Cannot Print',
            text: 'Certificate must be completed before printing'
        });
        return;
    }
    
    const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const typeTitle = {
        'clearance': 'BARANGAY CLEARANCE',
        'residency': 'CERTIFICATE OF RESIDENCY',
        'indigency': 'CERTIFICATE OF INDIGENCY',
        'job_seeker': 'FIRST TIME JOB SEEKER CERTIFICATION'
    };
    
    const printArea = document.getElementById('printArea');
    printArea.innerHTML = `
        <div style="padding: 50px; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2>REPUBLIC OF THE PHILIPPINES</h2>
                <h3>CITY OF CALOOCAN</h3>
                <h3>BARANGAY 14 ZONE 2 DISTRICT 2</h3>
            </div>
            <hr>
            <h2 style="text-align: center; margin: 30px 0;">${typeTitle[cert.certificateType]}</h2>
            <p style="margin: 20px 0; line-height: 1.8; text-align: justify;">
                TO WHOM IT MAY CONCERN:
            </p>
            <p style="margin: 20px 0; line-height: 1.8; text-align: justify; text-indent: 50px;">
                This is to certify that <strong>${fullName}</strong>, 
                ${resident.age} years old, ${resident.gender}, ${resident.civilStatus}, 
                is a bonafide resident of ${resident.address}, Barangay 14 Zone 2 District 2, Caloocan City.
            </p>
            <p style="margin: 20px 0; line-height: 1.8; text-align: justify; text-indent: 50px;">
                This certification is issued upon the request of the above-named person for 
                <strong>${cert.purpose}</strong>.
            </p>
            <p style="margin: 30px 0;">
                Issued this ${today} at Barangay 14, Caloocan City, Philippines.
            </p>
            <p style="margin: 10px 0;">
                <strong>Certificate No:</strong> ${cert.certificateNumber}
            </p>
            <div style="margin-top: 80px; text-align: right;">
                <div style="display: inline-block; text-align: center;">
                    <p style="margin-bottom: 50px;">_________________________</p>
                    <p><strong>Barangay Captain</strong></p>
                    <p>Barangay 14 Zone 2 District 2</p>
                </div>
            </div>
        </div>
    `;
    
    window.print();
}

// Filter certificates
function filterCertificates() {
    const statusFilter = document.getElementById('filterStatus').value;
    const typeFilter = document.getElementById('filterType').value;
    
    const certificates = getCertificates();
    let filtered = Object.values(certificates);
    
    if (statusFilter) {
        filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    if (typeFilter) {
        filtered = filtered.filter(c => c.certificateType === typeFilter);
    }
    
    const queueDiv = document.getElementById('certificateQueue');
    
    if (filtered.length === 0) {
        queueDiv.innerHTML = '<p class="text-center text-muted">No certificates match the selected filters</p>';
        return;
    }
    
    // Re-display filtered results
    queueDiv.innerHTML = '';
    const residents = getResidents();
    
    filtered.forEach(cert => {
        const resident = residents[cert.residentId];
        if (!resident) return;
        
        const fullName = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.suffix}`.trim();
        const requestDate = new Date(cert.requestDate).toLocaleString();
        
        const statusBadge = {
            'pending': '<span class="badge bg-primary">Pending</span>',
            'processing': '<span class="badge bg-warning">Processing</span>',
            'completed': '<span class="badge bg-success">Completed</span>'
        };
        
        const typeLabel = {
            'clearance': 'Barangay Clearance',
            'residency': 'Residency Certificate',
            'indigency': 'Indigency Certificate',
            'job_seeker': 'Job Seeker Certificate'
        };
        
        const statusClass = cert.status === 'completed' ? 'completed' : cert.status === 'processing' ? 'processing' : '';
        
        const card = document.createElement('div');
        card.className = `card queue-card ${statusClass} mb-3`;
        card.innerHTML = `
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="mb-1">${typeLabel[cert.certificateType]}</h6>
                        <p class="mb-1"><strong>Resident:</strong> ${fullName}</p>
                        <p class="mb-1"><strong>Purpose:</strong> ${cert.purpose}</p>
                        <p class="mb-1 text-muted"><small>Queue: ${cert.queueNumber} | Requested: ${requestDate}</small></p>
                        ${cert.certificateNumber ? `<p class="mb-0"><strong>Certificate No:</strong> ${cert.certificateNumber}</p>` : ''}
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="mb-2">${statusBadge[cert.status]}</div>
                        ${cert.status === 'pending' ? `
                            <button class="btn btn-sm btn-warning mb-1" onclick="processRequest('${cert.id}')">
                                <i class="fas fa-cog"></i> Process
                            </button>
                        ` : ''}
                        ${cert.status === 'processing' ? `
                            <button class="btn btn-sm btn-success mb-1" onclick="completeRequest('${cert.id}')">
                                <i class="fas fa-check"></i> Complete
                            </button>
                        ` : ''}
                        ${cert.status === 'completed' ? `
                            <button class="btn btn-sm btn-primary mb-1" onclick="printCertificate('${cert.id}')">
                                <i class="fas fa-print"></i> Print
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-info mb-1" onclick="viewCertificate('${cert.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `;
        queueDiv.appendChild(card);
    });
}
