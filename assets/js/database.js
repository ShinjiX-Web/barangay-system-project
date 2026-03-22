// Barangay Management System - Database Management

// Initialize database schema
function initializeDatabase() {
    // Check if database is already initialized
    if (!localStorage.getItem('dbInitialized')) {
        // Create admin account if doesn't exist
        const users = getUsers();
        if (Object.keys(users).length === 0) {
            createDefaultAdmin();
        }
        
        localStorage.setItem('dbInitialized', 'true');
        console.log('Database initialized successfully');
    }
}

// Create default admin account
function createDefaultAdmin() {
    const users = {};
    const adminEmail = 'admin@brgy14.gov.ph';
    
    users[adminEmail] = {
        id: 'USR-ADMIN-001',
        firstName: 'Barangay',
        lastName: 'Administrator',
        email: adminEmail,
        password: btoa('admin123'), // Default password: admin123
        role: 'admin',
        position: 'Barangay Captain',
        contactNumber: '',
        profilePhoto: 'assets/img/avatars/avatar1.jpeg',
        isActive: true,
        dateHired: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('users', JSON.stringify(users));
    console.log('Default admin account created');
    console.log('Email: admin@brgy14.gov.ph');
    console.log('Password: admin123');
}

// ===== USERS/STAFF MANAGEMENT =====

function getUsers() {
    const usersData = localStorage.getItem('users');
    return usersData ? JSON.parse(usersData) : {};
}

function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// ===== RESIDENTS MANAGEMENT =====

function getResidents() {
    const residentsData = localStorage.getItem('residents');
    return residentsData ? JSON.parse(residentsData) : {};
}

function addResident(residentData) {
    const residents = getResidents();
    const residentId = 'RES-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    residents[residentId] = {
        id: residentId,
        ...residentData,
        isActive: true,
        registrationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem('residents', JSON.stringify(residents));
    return residentId;
}

function updateResident(residentId, updates) {
    const residents = getResidents();
    if (residents[residentId]) {
        residents[residentId] = {
            ...residents[residentId],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem('residents', JSON.stringify(residents));
        return true;
    }
    return false;
}

function deleteResident(residentId) {
    const residents = getResidents();
    if (residents[residentId]) {
        delete residents[residentId];
        localStorage.setItem('residents', JSON.stringify(residents));
        return true;
    }
    return false;
}

function searchResidents(query) {
    const residents = getResidents();
    const results = [];
    
    Object.values(residents).forEach(resident => {
        const searchText = `${resident.firstName} ${resident.middleName} ${resident.lastName} ${resident.address}`.toLowerCase();
        if (searchText.includes(query.toLowerCase())) {
            results.push(resident);
        }
    });
    
    return results;
}

// ===== CERTIFICATES MANAGEMENT =====

function getCertificates() {
    const certificatesData = localStorage.getItem('certificates');
    return certificatesData ? JSON.parse(certificatesData) : {};
}

function requestCertificate(certificateData) {
    const certificates = getCertificates();
    const certId = 'CERT-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const queueNumber = generateQueueNumber();
    
    certificates[certId] = {
        id: certId,
        ...certificateData,
        queueNumber: queueNumber,
        certificateNumber: '', // Generated upon completion
        status: 'pending',
        requestDate: new Date().toISOString(),
        processedDate: null,
        processedBy: null,
        digitalSignature: null,
        remarks: ''
    };
    
    localStorage.setItem('certificates', JSON.stringify(certificates));
    return { certId, queueNumber };
}

function updateCertificateStatus(certId, status, processedBy = null) {
    const certificates = getCertificates();
    if (certificates[certId]) {
        certificates[certId].status = status;
        certificates[certId].updatedAt = new Date().toISOString();
        
        if (status === 'completed') {
            certificates[certId].processedDate = new Date().toISOString();
            certificates[certId].processedBy = processedBy;
            certificates[certId].certificateNumber = generateCertificateNumber(certificates[certId].certificateType);
        }
        
        localStorage.setItem('certificates', JSON.stringify(certificates));
        return true;
    }
    return false;
}

function generateQueueNumber() {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const certificates = Object.values(getCertificates());
    const todayCerts = certificates.filter(cert => 
        cert.requestDate.startsWith(new Date().toISOString().split('T')[0])
    );
    const queueNum = todayCerts.length + 1;
    return `Q-${today}-${String(queueNum).padStart(3, '0')}`;
}

function generateCertificateNumber(type) {
    const year = new Date().getFullYear();
    const typePrefix = {
        'clearance': 'BC',
        'residency': 'RC',
        'indigency': 'IC',
        'job_seeker': 'JS'
    };
    
    const prefix = typePrefix[type] || 'XX';
    const timestamp = Date.now().toString().slice(-6);
    
    return `${prefix}-${year}-${timestamp}`;
}

// ===== REPORTS MANAGEMENT =====

function getReports() {
    const reportsData = localStorage.getItem('reports');
    return reportsData ? JSON.parse(reportsData) : [];
}

function generateReport(reportType, period, dateFrom, dateTo, data) {
    const reports = getReports();
    const currentUser = getCurrentUser();
    
    const report = {
        id: 'RPT-' + Date.now(),
        reportType: reportType,
        reportPeriod: period,
        dateFrom: dateFrom,
        dateTo: dateTo,
        data: data,
        generatedBy: currentUser ? currentUser.id : null,
        generatedAt: new Date().toISOString()
    };
    
    reports.push(report);
    localStorage.setItem('reports', JSON.stringify(reports));
    return report;
}

// Daily certificate count report
function getDailyCertificateReport(date) {
    const certificates = Object.values(getCertificates());
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    const dailyCerts = certificates.filter(cert => 
        cert.requestDate.startsWith(targetDate)
    );
    
    const report = {
        date: targetDate,
        totalRequests: dailyCerts.length,
        byType: {},
        byStatus: {},
        completed: dailyCerts.filter(c => c.status === 'completed').length,
        pending: dailyCerts.filter(c => c.status === 'pending').length,
        processing: dailyCerts.filter(c => c.status === 'processing').length
    };
    
    // Count by type
    dailyCerts.forEach(cert => {
        report.byType[cert.certificateType] = (report.byType[cert.certificateType] || 0) + 1;
        report.byStatus[cert.status] = (report.byStatus[cert.status] || 0) + 1;
    });
    
    return report;
}

// Get statistics
function getDashboardStats() {
    const users = Object.values(getUsers());
    const residents = Object.values(getResidents());
    const certificates = Object.values(getCertificates());
    const today = new Date().toISOString().split('T')[0];
    
    return {
        totalStaff: users.filter(u => u.isActive).length,
        totalResidents: residents.filter(r => r.isActive).length,
        totalCertificates: certificates.length,
        todayCertificates: certificates.filter(c => c.requestDate.startsWith(today)).length,
        pendingRequests: certificates.filter(c => c.status === 'pending').length,
        activeStaff: users.filter(u => u.isActive && u.role === 'staff').length
    };
}

// ===== BACKUP & RESTORE =====

function backupDatabase() {
    const backup = {
        users: localStorage.getItem('users'),
        residents: localStorage.getItem('residents'),
        certificates: localStorage.getItem('certificates'),
        reports: localStorage.getItem('reports'),
        activityLogs: localStorage.getItem('activityLogs'),
        timestamp: new Date().toISOString()
    };
    
    const backupData = JSON.stringify(backup);
    const blob = new Blob([backupData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brgy14-backup-${Date.now()}.json`;
    a.click();
    
    // Log backup
    logActivity(getCurrentUser()?.id, 'backup', 'system', 'Database backup created');
    
    return true;
}

function restoreDatabase(backupData) {
    try {
        const backup = JSON.parse(backupData);
        
        if (backup.users) localStorage.setItem('users', backup.users);
        if (backup.residents) localStorage.setItem('residents', backup.residents);
        if (backup.certificates) localStorage.setItem('certificates', backup.certificates);
        if (backup.reports) localStorage.setItem('reports', backup.reports);
        if (backup.activityLogs) localStorage.setItem('activityLogs', backup.activityLogs);
        
        // Log restore
        logActivity(getCurrentUser()?.id, 'restore', 'system', 'Database restored from backup');
        
        return true;
    } catch (error) {
        console.error('Restore failed:', error);
        return false;
    }
}

// Initialize database on load
if (typeof window !== 'undefined') {
    initializeDatabase();
}
