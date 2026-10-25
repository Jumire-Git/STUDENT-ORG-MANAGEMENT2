/**
 * booking.js — Resource & Facility Booking Subsystem
 * Connects to AppState for real-time booking requests, faculty approvals, and stats.
 */

const STATUS_BADGE = {
  Pending:  'badge-amber',
  Approved: 'badge-green',
  Denied:   'badge-red',
};

const STATUS_ICON = {
  Pending:  'clock',
  Approved: 'check-circle',
  Denied:   'x-circle',
};

let currentStatusFilter = 'All';

/**
 * Render bookings table.
 * @param {string} filterStatus - 'All' | 'Pending' | 'Approved' | 'Denied'
 */
function renderBookings(filterStatus = currentStatusFilter) {
  currentStatusFilter = filterStatus;
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;

  const allBookings = AppState.getBookings();
  const data = filterStatus === 'All' ? allBookings : allBookings.filter(b => b.status === filterStatus);

  // Update tab counters if present
  const pendingCount = allBookings.filter(b => b.status === 'Pending').length;
  const approvedCount = allBookings.filter(b => b.status === 'Approved').length;
  const deniedCount = allBookings.filter(b => b.status === 'Denied').length;

  document.querySelectorAll('.tab-count-pending').forEach(el => el.textContent = pendingCount);
  document.querySelectorAll('.tab-count-approved').forEach(el => el.textContent = approvedCount);
  document.querySelectorAll('.tab-count-denied').forEach(el => el.textContent = deniedCount);
  document.querySelectorAll('.tab-count-all').forEach(el => el.textContent = allBookings.length);

  // Update stat cards
  const pendingStatEl = document.getElementById('stat-pending-bookings');
  if (pendingStatEl) pendingStatEl.textContent = pendingCount;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:var(--space-8);">No bookings found for "${filterStatus}".</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((b) => `
    <tr>
      <td style="color:var(--color-text-muted);font-size:12px;font-family:monospace;">${b.ref}</td>
      <td>
        <div style="font-weight:500;">${b.club}</div>
        <div style="font-size:11px;color:var(--color-text-muted);">${b.requester}</div>
      </td>
      <td>
        <div style="font-weight:500;">${b.venue}</div>
        ${b.equipment ? `<div style="font-size:11px;color:var(--color-text-muted);">${b.equipment}</div>` : ''}
      </td>
      <td>
        <div>${b.date}</div>
        <div style="font-size:11px;color:var(--color-text-muted);">${b.time}</div>
      </td>
      <td>${b.purpose}</td>
      <td>
        <span class="badge ${STATUS_BADGE[b.status] || 'badge-neutral'}">
          <i data-lucide="${STATUS_ICON[b.status] || 'info'}"></i> ${b.status}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px;">
          ${b.status === 'Pending' ? `
            <button class="btn btn-sm btn-primary" onclick="handleBookingAction('${b.ref}', 'Approved')" title="Approve Request">
              <i data-lucide="check"></i> Approve
            </button>
            <button class="btn btn-sm btn-danger" onclick="handleBookingAction('${b.ref}', 'Denied')" title="Deny Request">
              <i data-lucide="x"></i> Deny
            </button>
          ` : `
            <button class="btn btn-sm btn-secondary" onclick="viewBookingDetails('${b.ref}')" title="View Details">
              <i data-lucide="eye"></i> View
            </button>
          `}
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

/**
 * Handle Approve or Deny action on booking
 */
window.handleBookingAction = function(ref, newStatus) {
  const updated = AppState.updateBookingStatus(ref, newStatus);
  if (updated) {
    renderBookings();
    const actionWord = newStatus === 'Approved' ? 'Approved' : 'Denied';
    AppState.showToast(`Booking ${actionWord}`, `Reservation ${ref} for ${updated.venue} was marked ${actionWord.toLowerCase()}. Requester notified via institutional email.`);
  }
};

window.viewBookingDetails = function(ref) {
  const b = AppState.getBookings().find(x => x.ref === ref);
  if (b) {
    alert(`Booking Reference: ${b.ref}\nOrganization: ${b.club}\nVenue: ${b.venue}\nDate & Time: ${b.date} (${b.time})\nStatus: ${b.status}\nPurpose: ${b.purpose}\nEquipment: ${b.equipment || 'None'}`);
  }
};

/**
 * Setup form submit handlers
 */
function setupBookingForm() {
  const submitBtn = document.getElementById('btn-submit-booking');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const clubSelect = document.getElementById('select-booking-club');
      const venueSelect = document.getElementById('select-booking-venue');
      const dateInput = document.getElementById('input-booking-date');
      const startInput = document.getElementById('input-booking-start');
      const endInput = document.getElementById('input-booking-end');
      const purposeInput = document.getElementById('input-booking-purpose');
      const equipInput = document.getElementById('input-booking-equip');

      const venue = venueSelect ? venueSelect.value : 'Auditorium A';
      const date = dateInput ? dateInput.value : '';
      const purpose = purposeInput ? purposeInput.value.trim() : '';

      if (!date || !purpose) {
        alert('Please fill out the booking date and purpose.');
        return;
      }

      const user = window.Auth ? window.Auth.getCurrentUser() : null;
      const newBooking = AppState.addBooking({
        club: clubSelect ? clubSelect.value : (user && user.organization ? user.organization : 'Campus Club'),
        venue: venue,
        date: date,
        startTime: startInput && startInput.value ? startInput.value : '1:00 PM',
        endTime: endInput && endInput.value ? endInput.value : '5:00 PM',
        purpose: purpose,
        equipment: equipInput ? equipInput.value.trim() : '',
        requester: user ? user.name : 'Student Officer'
      });

      // Clear & Close
      if (purposeInput) purposeInput.value = '';
      if (equipInput) equipInput.value = '';
      if (typeof closeModal === 'function') closeModal('modal-booking');

      renderBookings();
      AppState.showToast('Request Submitted', `Booking ${newBooking.ref} for ${newBooking.venue} submitted and routed to Faculty for review!`);
    });
  }
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderBookings();
  setupBookingForm();
});
