/**
 * role-guard.js — Shared role-based access enforcement
 * Import and call applyRoleRestrictions(role, linkedResidentId) after auth resolves.
 *
 * Roles: admin > secretary > staff > resident
 * Residents are linked to a Firestore resident record via user.linkedResidentId
 */

export const ROLE = {
  ADMIN:     'admin',
  SECRETARY: 'secretary',
  STAFF:     'staff',
  RESIDENT:  'resident',
};

function _hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/** Returns true if the given role is a staff-level role (not a resident). */
export function isStaffRole(role) {
  return [ROLE.ADMIN, ROLE.SECRETARY, ROLE.STAFF].includes(role);
}

export function isResidentRole(role) {
  return role === ROLE.RESIDENT;
}

/**
 * Apply UI restrictions based on role.
 * Call this once the user's Firestore doc is loaded.
 *
 * @param {string} role               - e.g. 'resident', 'staff', 'admin'
 * @param {string|null} linkedResidentId - Firestore resident doc ID linked to this account
 */
export function applyRoleRestrictions(role, linkedResidentId = null) {
  // Cache role so the next page load can apply it synchronously
  localStorage.setItem('brgy14_role', role);

  // Update data-role on <html> — CSS rules in app-theme.css handle sidebar
  // visibility instantly with no inline style mutations (no repaint if role unchanged).
  document.documentElement.setAttribute('data-role', role);

  // Expose globally so inline scripts can read it
  window._userRole            = role;
  window._linkedResidentId    = linkedResidentId;

  if (!isResidentRole(role)) {
    // Sidebar items are shown via CSS data-role rules — nothing to do here.
    return;
  }

  // ── Resident: hide staff-only top-bar links ──────────────────────────
  _hideEl('topbarActivityLink');
  _hideEl('topbarSettingsLink');

  // ── Page-level: add resident nav class to body for CSS hooks ─────────
  document.body.classList.add('role-resident');

  // ── Hide "Register New Resident" / "New Resident" action buttons ─────
  document.querySelectorAll('[data-staff-only]').forEach(el => el.remove());
}
