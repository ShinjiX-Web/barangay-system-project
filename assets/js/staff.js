// Staff Management - Firebase CRUD
import { getUsers, addUser, updateUser, deleteUser } from './firebase-db.js';
import { getCurrentUser, isAdmin, logActivity } from './auth-firebase.js';
import Swal from 'https://cdn.jsdelivr.net/npm/sweetalert2@11';

// Load staff table
let staffDataTable;
export async function loadStaffTable() {
  const tbody = document.getElementById('staffTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';
  
  try {
    const users = await getUsers();
    const usersArray = Object.values(users);
    
    tbody.innerHTML = '';
    
    if (usersArray.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No staff registered</td></tr>';
      return;
    }
    
    usersArray.forEach(user => {
      const row = document.createElement('tr');
      const roleBadge = getRoleBadge(user.role);
      const statusBadge = user.isActive ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-warning">Inactive</span>';
      const photo = user.profilePhoto || 'assets/img/avatars/avatar1.jpeg';
      
      row.innerHTML = `
        <td><img src="${photo}" class="rounded-circle" width="40" height="40"></td>
        <td>${user.firstName} ${user.lastName}</td>
        <td>${user.email}</td>
        <td>${roleBadge}</td>
        <td>${user.position || 'N/A'}</td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1" onclick="editStaff('${user.id}')" title="Edit">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteStaff('${user.id}')" title="Delete">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // Init DataTable
    if (staffDataTable) staffDataTable.destroy();
    staffDataTable = $('#staffTable').DataTable({
      responsive: true,
      pageLength: 10,
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "All"]]
    });
    
  } catch (error) {
    Swal.fire('Error', 'Failed to load staff: ' + error.message, 'error');
  }
}

// Add/Edit staff
export async function saveStaff() {
  const id = document.getElementById('staffId').value;
  const firstName = document.getElementById('staffFirstName').value.trim();
  const lastName = document.getElementById('staffLastName').value.trim();
  const email = document.getElementById('staffEmail').value.trim();
  const role = document.getElementById('staffRole').value;
  const position = document.getElementById('staffPosition').value.trim();
  const phone = document.getElementById('staffPhone').value.trim();
  
  if (!firstName || !lastName || !email) {
    Swal.fire('Error', 'Please fill required fields', 'warning');
    return;
  }
  
  if (!isValidEmail(email)) {
    Swal.fire('Error', 'Invalid email', 'warning');
    return;
  }
  
  const userData = {
    firstName, lastName, email, role, position, phone,
    updatedAt: new Date().toISOString()
  };
  
  try {
    let result;
    if (id) {
      result = await updateUser(id, userData);
      Swal.fire('Success', 'Staff updated!', 'success');
      logActivity('update', 'staff', `${firstName} ${lastName}`);
    } else {
      result = await addUser(userData);
      Swal.fire('Success', 'Staff added!', 'success');
      logActivity('create', 'staff', `${firstName} ${lastName}`);
    }
    
    if (result) {
      document.getElementById('staffForm').reset();
      document.getElementById('staffId').value = '';
      loadStaffTable();
    }
  } catch (error) {
    Swal.fire('Error', error.message, 'error');
  }
}

// Edit staff
window.editStaff = async function(staffId) {
  try {
    const users = await getUsers();
    const staff = users[staffId];
    if (!staff) return;
    
    document.getElementById('staffId').value = staff.id;
    document.getElementById('staffFirstName').value = staff.firstName;
    document.getElementById('staffLastName').value = staff.lastName;
    document.getElementById('staffEmail').value = staff.email;
    document.getElementById('staffRole').value = staff.role;
    document.getElementById('staffPosition').value = staff.position || '';
    document.getElementById('staffPhone').value = staff.phone || '';
  } catch (error) {
    Swal.fire('Error', 'Failed to load staff', 'error');
  }
};

// Delete staff
window.deleteStaff = async function(staffId) {
  const users = await getUsers();
  const staff = users[staffId];
  if (!staff) return;
  
  Swal.fire({
    title: 'Delete Staff?',
    text: `Delete ${staff.firstName} ${staff.lastName}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete'
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await deleteUser(staffId);
        Swal.fire('Deleted', 'Staff removed', 'success');
        logActivity('delete', 'staff', `${staff.firstName} ${staff.lastName}`);
        loadStaffTable();
      } catch (error) {
        Swal.fire('Error', error.message, 'error');
      }
    }
  });
};

// Export CSV
window.exportStaffCSV = async function() {
  try {
    const users = await getUsers();
    const csv = convertToCSV(Object.values(users));
    downloadCSV(csv, 'staff-directory.csv');
  } catch (error) {
    Swal.fire('Error', 'Export failed', 'error');
  }
};

function convertToCSV(users) {
  const headers = ['Name', 'Email', 'Role', 'Position', 'Phone', 'Status'];
  const rows = users.map(u => [
    `${u.firstName} ${u.lastName}`,
    u.email,
    u.role,
    u.position || '',
    u.phone || '',
    u.isActive ? 'Active' : 'Inactive'
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

function getRoleBadge(role) {
  const badges = {
    superadmin: '<span class="badge bg-danger">SUPER ADMIN</span>',
    admin: '<span class="badge bg-warning">ADMIN</span>',
    secretary: '<span class="badge bg-primary">SECRETARY</span>',
    staff: '<span class="badge bg-secondary">STAFF</span>'
  };
  return badges[role] || '<span class="badge bg-secondary">STAFF</span>';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('staffForm');
  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    saveStaff();
  });
  
  if (!isAdmin()) {
    document.querySelectorAll('button[onclick*="Staff"]').forEach(btn => btn.disabled = true);
    document.getElementById('staffForm')?.remove();
  }
  
  loadStaffTable();
});

