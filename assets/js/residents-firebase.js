// residents-firebase.js
// Resident management — photos stored as compressed base64 in Firestore (no Storage needed)

import { db, COLLECTIONS } from './firebase-config.js';
import { logActivity } from './auth-firebase.js';
import {
  collection, doc, addDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// ─── State ────────────────────────────────────────────────────────────────────
let allResidents = [];

// ─── Expose functions globally for onclick attributes ─────────────────────────
window.showResidentForm    = showResidentForm;
window.cancelForm          = cancelForm;
window.saveResident        = saveResident;
window.editResident        = editResident;
window.deleteResident      = deleteResident;
window.loadResidents       = loadResidents;
window.searchResidentTable = searchResidentTable;
window.filterResidents     = filterResidents;
window.calculateAge        = calculateAge;
window.previewPhoto        = previewPhoto;
window.triggerPhotoUpdate  = triggerPhotoUpdate;
window.updateResidentPhoto = updateResidentPhoto;

// Called by residents.html after DOM is ready
export async function loadResidentsFirebase() {
  await loadResidents();
}

// ─── Image compression → base64 ───────────────────────────────────────────────
// Resizes to max 200x200 and compresses to JPEG 70% quality (~20-40KB)
function compressImageToBase64(file, maxSize = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
        } else {
          if (height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
        }
        canvas.width  = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Load & render ────────────────────────────────────────────────────────────
async function loadResidents() {
  const tbody = document.getElementById('residentTableBody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center"><span class="spinner-border spinner-border-sm me-2"></span>Loading residents...</td></tr>';

  try {
    allResidents = [];

    // 1. Load from dedicated residents collection
    const residentsSnap = await getDocs(query(collection(db, COLLECTIONS.residents), orderBy('lastName')));
    residentsSnap.forEach(d => allResidents.push({ id: d.id, ...d.data() }));

    // 2. Also load approved users with role 'resident' from the users collection
    const usersSnap = await getDocs(query(
      collection(db, COLLECTIONS.users),
      where('role', '==', 'resident'),
      where('status', '==', 'approved')
    ));
    usersSnap.forEach(d => {
      const data = d.data();
      allResidents.push({
        id: 'user_' + d.id,
        firstName:     data.firstName     || '',
        middleName:    data.middleName     || '',
        lastName:      data.lastName      || '',
        suffix:        data.suffix        || '',
        gender:        data.gender        || '',
        age:           data.age           || '',
        civilStatus:   data.civilStatus   || '',
        address:       data.address       || '',
        contactNumber: data.contactNumber || '',
        email:         data.email         || '',
        // profilePhoto is the field name in the users collection
        photoURL:      data.profilePhoto  || data.photoURL || '',
      });
    });

    // Sort combined list by lastName
    allResidents.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    renderResidents(allResidents);
  } catch (err) {
    console.error('Error loading residents:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${err.message}</td></tr>`;
  }
}

function renderResidents(residents) {
  const tbody   = document.getElementById('residentTableBody');
  const counter = document.getElementById('residentCount');

  if (residents.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No residents found.</td></tr>';
    counter.textContent = 'Total: 0 residents';
    return;
  }

  tbody.innerHTML = residents.map(r => {
    const fullName = [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(' ');
    const photo    = r.photoURL || 'assets/img/avatars/user-avatar.png';
    return `
      <tr>
        <td>
          <div style="position:relative;display:inline-block;cursor:pointer;" title="Click to update photo" onclick="triggerPhotoUpdate('${r.id}')">
            <img id="resident-photo-${r.id}" src="${photo}" style="width:45px;height:45px;object-fit:cover;border-radius:50%;" onerror="this.src='assets/img/avatars/user-avatar.png'">
            <div style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.55);border-radius:50%;width:16px;height:16px;display:flex;align-items:center;justify-content:center;">
              <i class="fas fa-camera" style="color:white;font-size:7px;"></i>
            </div>
          </div>
          <input type="file" id="photo-input-${r.id}" accept="image/*" style="display:none;" onchange="updateResidentPhoto('${r.id}', this)">
        </td>
        <td>${fullName}</td>
        <td>${r.gender || '—'}</td>
        <td>${r.age || '—'}</td>
        <td>${r.address || '—'}</td>
        <td>${r.contactNumber || '—'}</td>
        <td>
          <button class="btn btn-sm btn-warning me-1" onclick="editResident('${r.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm btn-danger" onclick="deleteResident('${r.id}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
  }).join('');

  counter.textContent = `Total: ${residents.length} resident${residents.length !== 1 ? 's' : ''}`;
}

// ─── Inline photo update from list ───────────────────────────────────────────
function triggerPhotoUpdate(id) {
  const input = document.getElementById(`photo-input-${id}`);
  if (input) input.click();
}

async function updateResidentPhoto(id, input) {
  const file = input.files[0];
  if (!file) return;

  try {
    Swal.fire({ title: 'Updating photo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    const photoURL = await compressImageToBase64(file);

    const isUser  = id.startsWith('user_');
    const realId  = isUser ? id.slice(5) : id;
    const colName = isUser ? COLLECTIONS.users : COLLECTIONS.residents;

    // Users collection stores photo as 'profilePhoto'; residents collection uses 'photoURL'
    const updateData = isUser
      ? { profilePhoto: photoURL, updatedAt: serverTimestamp() }
      : { photoURL,               updatedAt: serverTimestamp() };

    await updateDoc(doc(db, colName, realId), updateData);

    // Update in-memory cache and the image element immediately
    const resident = allResidents.find(r => r.id === id);
    if (resident) resident.photoURL = photoURL;
    const img = document.getElementById(`resident-photo-${id}`);
    if (img) img.src = photoURL;

    // Reset the file input so the same file can be re-selected later
    input.value = '';

    await logActivity('update', 'residents', `Updated photo for resident: ${resident?.firstName || ''} ${resident?.lastName || ''}`);
    Swal.fire({ icon: 'success', title: 'Photo updated!', timer: 1500, showConfirmButton: false });
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

// ─── Search & filter ──────────────────────────────────────────────────────────
function searchResidentTable() { applyFilters(); }
function filterResidents()     { applyFilters(); }

function applyFilters() {
  const search = (document.getElementById('searchResident')?.value || '').toLowerCase();
  const gender = document.getElementById('filterGender')?.value || '';
  renderResidents(allResidents.filter(r => {
    const fullName = [r.firstName, r.middleName, r.lastName, r.suffix].filter(Boolean).join(' ').toLowerCase();
    const address  = (r.address || '').toLowerCase();
    return (!search || fullName.includes(search) || address.includes(search))
        && (!gender || r.gender === gender);
  }));
}

// ─── Form helpers ─────────────────────────────────────────────────────────────
function showResidentForm(data = null) {
  document.getElementById('residentFormCard').style.display = 'block';
  document.getElementById('residentListCard').style.display = 'none';
  document.getElementById('residentForm').reset();
  document.getElementById('residentId').value = '';
  document.getElementById('photoPreview').src = 'assets/img/avatars/avatar1.jpeg';

  if (data) {
    document.getElementById('residentId').value    = data.id;
    document.getElementById('firstName').value     = data.firstName     || '';
    document.getElementById('middleName').value    = data.middleName    || '';
    document.getElementById('lastName').value      = data.lastName      || '';
    document.getElementById('suffix').value        = data.suffix        || '';
    document.getElementById('gender').value        = data.gender        || '';
    document.getElementById('dateOfBirth').value   = data.dateOfBirth   || '';
    document.getElementById('age').value           = data.age           || '';
    document.getElementById('civilStatus').value   = data.civilStatus   || '';
    document.getElementById('address').value       = data.address       || '';
    document.getElementById('contactNumber').value = data.contactNumber || '';
    document.getElementById('email').value         = data.email         || '';
    if (data.photoURL) document.getElementById('photoPreview').src = data.photoURL;
  }

  document.getElementById('residentFormCard').scrollIntoView({ behavior: 'smooth' });
}

function cancelForm() {
  document.getElementById('residentFormCard').style.display = 'none';
  document.getElementById('residentListCard').style.display = 'block';
  document.getElementById('residentForm').reset();
}

function calculateAge() {
  const dob = document.getElementById('dateOfBirth').value;
  if (!dob) return;
  const today = new Date(), birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  document.getElementById('age').value = age >= 0 ? age : '';
}

function previewPhoto() {
  const file = document.getElementById('photoUpload').files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => { document.getElementById('photoPreview').src = e.target.result; };
  reader.readAsDataURL(file);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
async function saveResident(event) {
  event.preventDefault();

  const id        = document.getElementById('residentId').value;
  const photoFile = document.getElementById('photoUpload').files[0];

  const residentData = {
    firstName:     document.getElementById('firstName').value.trim(),
    middleName:    document.getElementById('middleName').value.trim(),
    lastName:      document.getElementById('lastName').value.trim(),
    suffix:        document.getElementById('suffix').value.trim(),
    gender:        document.getElementById('gender').value,
    dateOfBirth:   document.getElementById('dateOfBirth').value,
    age:           parseInt(document.getElementById('age').value) || 0,
    civilStatus:   document.getElementById('civilStatus').value,
    address:       document.getElementById('address').value.trim(),
    contactNumber: document.getElementById('contactNumber').value.trim(),
    email:         document.getElementById('email').value.trim(),
    updatedAt:     serverTimestamp(),
  };

  try {
    // Compress photo to base64 — no Firebase Storage / no CORS needed
    if (photoFile) {
      Swal.fire({ title: 'Processing photo...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      residentData.photoURL = await compressImageToBase64(photoFile);
      Swal.close();
    }

    if (id) {
      const isUser  = id.startsWith('user_');
      const realId  = isUser ? id.slice(5) : id;
      const colName = isUser ? COLLECTIONS.users : COLLECTIONS.residents;

      // Users collection stores photo as 'profilePhoto'; map accordingly
      const dataToSave = { ...residentData };
      if (isUser && dataToSave.photoURL) {
        dataToSave.profilePhoto = dataToSave.photoURL;
        delete dataToSave.photoURL;
      }

      await updateDoc(doc(db, colName, realId), dataToSave);
      await logActivity('update', 'residents', `Updated resident: ${residentData.firstName} ${residentData.lastName}`);
      Swal.fire({ icon: 'success', title: 'Updated!', text: 'Resident updated successfully.', timer: 2000, showConfirmButton: false });
    } else {
      residentData.createdAt = serverTimestamp();
      await addDoc(collection(db, COLLECTIONS.residents), residentData);
      await logActivity('create', 'residents', `Registered new resident: ${residentData.firstName} ${residentData.lastName}`);
      Swal.fire({ icon: 'success', title: 'Saved!', text: 'Resident registered successfully.', timer: 2000, showConfirmButton: false });
    }

    cancelForm();
    await loadResidents();
  } catch (err) {
    console.error('Error saving resident:', err);
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

async function editResident(id) {
  try {
    const isUser   = id.startsWith('user_');
    const realId   = isUser ? id.slice(5) : id;
    const colName  = isUser ? COLLECTIONS.users : COLLECTIONS.residents;
    const snap     = await getDoc(doc(db, colName, realId));
    if (snap.exists()) {
      const data = snap.data();
      showResidentForm({
        id,
        firstName:     data.firstName     || '',
        middleName:    data.middleName     || '',
        lastName:      data.lastName      || '',
        suffix:        data.suffix        || '',
        gender:        data.gender        || '',
        dateOfBirth:   data.dateOfBirth   || '',
        age:           data.age           || '',
        civilStatus:   data.civilStatus   || '',
        address:       data.address       || '',
        contactNumber: data.contactNumber || '',
        email:         data.email         || '',
        // For users, photo is stored as profilePhoto; for residents, as photoURL
        photoURL:      isUser ? (data.profilePhoto || data.photoURL || '') : (data.photoURL || ''),
      });
    } else {
      Swal.fire({ icon: 'error', title: 'Not Found', text: 'Resident record not found.' });
    }
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}

async function deleteResident(id) {
  const result = await Swal.fire({
    title: 'Delete Resident?', text: 'This action cannot be undone.',
    icon: 'warning', showCancelButton: true,
    confirmButtonColor: '#d33', confirmButtonText: 'Yes, delete',
  });
  if (!result.isConfirmed) return;

  try {
    const resident = allResidents.find(r => r.id === id);
    const isUser   = id.startsWith('user_');
    const realId   = isUser ? id.slice(5) : id;
    const colName  = isUser ? COLLECTIONS.users : COLLECTIONS.residents;
    await deleteDoc(doc(db, colName, realId));
    await logActivity('delete', 'residents', `Deleted resident: ${resident?.firstName || ''} ${resident?.lastName || ''}`);
    Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Resident removed.', timer: 1800, showConfirmButton: false });
    await loadResidents();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Error', text: err.message });
  }
}
