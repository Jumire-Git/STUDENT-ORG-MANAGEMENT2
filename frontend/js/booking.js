/**
 * booking.js — Resource & Facility Booking Subsystem (Connected to SQLite Database)
 */

const STATUS_BADGE = {
  Pending:  'badge-amber',
  Approved: 'badge-green',
  Denied:   'badge-red',
  Rejected: 'badge-red',
};

const STATUS_ICON = {
  Pending:  'clock',
  Approved: 'check-circle',
  Denied:   'x-circle',
  Rejected: 'x-circle',
};

let currentStatusFilter = 'All';
let cachedBookings = [];
let cachedVenues = [];

/**
 * Fetch Venues from Backend and Render
 */
async function loadVenues() {
  const grid = document.getElementById('venues-grid');
  if (!grid) return;

  try {
    const res = await fetch('http://localhost:5000/api/venues');
    if (res.ok) {
      cachedVenues = await res.json();
      grid.innerHTML = cachedVenues.map(v => `
        <div class="venue-card">
          <div class="venue-card-img"><i data-lucide="${v.type === 'Equipment' ? 'projector' : v.type === 'Space' ? 'map' : 'presentation'}"></i></div>
          <div class="venue-card-body">
            <div class="venue-name">${v.name}</div>
            <div class="venue-meta">
              <i data-lucide="users"></i> Cap. ${v.capacity || 'N/A'} &nbsp;&nbsp; 
              <span class="badge badge-green" style="margin-left:auto;">Available</span>
            </div>
          </div>
        </div>
      `).join('');
      if (window.lucide) lucide.createIcons();
    }
  } catch (err) {
    console.error('Error loading venues:', err);
  }
}

/**
 * Render Dynamic Availability Calendar from Database Bookings
 */
function renderCalendar(bookings) {
  const dayCells = document.querySelectorAll('.cal-day:not(.other-month)');
  
  // Clear any existing dynamically injected dots first
  document.querySelectorAll('.cal-event-dot').forEach(dot => {
    if (!dot.dataset.static) dot.remove();
  });

  dayCells.forEach(cell => {
    const numEl = cell.querySelector('.cal-day-num');
    if (!numEl) return;
    const dayNum = numEl.textContent.trim();

    // Find bookings matching November and this day number
    const matchingBookings = bookings.filter(b => {
      // b.date is e.g. "Nov 3, 2026"
      return b.date.includes('Nov') && b.date.includes(` ${dayNum},`) || b.date === `Nov ${dayNum}, 2026`;
    });

    matchingBookings.forEach(b => {
      const dot = document.createElement('div');
      // Use blue for Approved, amber for Pending
      const dotClass = b.status === 'Approved' ? 'blue' : 'amber';
      dot.className = `cal-event-dot ${dotClass}`;
      dot.textContent = `${b.club} — ${b.venue}`;
      cell.appendChild(dot);
    });
  });
}

/**
 * Fetch Bookings from Backend and Render Table + Calendar
 */
async function renderBookings(filterStatus = currentStatusFilter) {
  currentStatusFilter = filterStatus;
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('http://localhost:5000/api/bookings');
    if (res.ok) {
      cachedBookings = await res.json();
    }
  } catch (err) {
    console.error('Error loading bookings:', err);
    cachedBookings = [];
  }

  // Render the calendar with the fetched database bookings
  renderCalendar(cachedBookings);

  const data = filterStatus === 'All' ? cachedBookings : cachedBookings.filter(b => b.status === filterStatus);

  // Update counters
  const pendingCount = cachedBookings.filter(b => b.status === 'Pending').length;
  const approvedCount = cachedBookings.filter(b => b.status === 'Approved').length;
  const deniedCount = cachedBookings.filter(b => b.status === 'Denied' || b.status === 'Rejected').length;

  document.querySelectorAll('.tab-count-pending').forEach(el => el.textContent = pendingCount);
  document.querySelectorAll('.tab-count-approved').forEach(el => el.textContent = approvedCount);
  document.querySelectorAll('.tab-count-denied').forEach(el => el.textContent = deniedCount);
  document.querySelectorAll('.tab-count-all').forEach(el => el.textContent = cachedBookings.length);

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
          <button class="btn btn-sm btn-secondary" onclick="viewBookingDetails('${b.ref}')" title="View Details">
            <i data-lucide="eye"></i> View
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

window.viewBookingDetails = function(ref) {
  const b = cachedBookings.find(x => x.ref === ref);
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
    });
  }
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadVenues();
  renderBookings();
  setupBookingForm();
});