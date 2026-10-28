/**
 * booking.js — Resource & Facility Booking Subsystem (Dynamic Calendar & Real-Time Sync)
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
let currentUser = null;

// Calendar navigation state (defaults to November 2026 as seeded)
let currentCalendarDate = new Date(2026, 10, 1); // Month 10 = November

/**
 * Get active user session directly from auth.js local storage sync
 */
function getActiveUser() {
  try {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error parsing currentUser from localStorage:', err);
  }
  return { id: 1, name: 'Admin', role: 'admin' };
}

/**
 * Enforce role access control strictly using auth session data
 */
function enforceRoleAccess() {
  currentUser = getActiveUser();
  const role = currentUser && currentUser.role ? currentUser.role.toLowerCase() : 'admin';
  const isStudent = role === 'student' || role === 'member';

  if (isStudent) {
    document.querySelectorAll('button, a').forEach(el => {
      if (el.textContent.includes('New Booking Request') || el.textContent.includes('All Requests')) {
        el.style.display = 'none';
      }
    });
    const requestsPanel = document.getElementById('tab-requests');
    if (requestsPanel) requestsPanel.style.display = 'none';

    const venuesTabBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Venues & Equipment') || el.textContent.includes('Venues'));
    if (venuesTabBtn) venuesTabBtn.click();
  } else {
    document.querySelectorAll('button, a').forEach(el => {
      if (el.textContent.includes('New Booking Request') || el.textContent.includes('All Requests')) {
        el.style.display = '';
      }
    });
    const requestsPanel = document.getElementById('tab-requests');
    if (requestsPanel) requestsPanel.style.display = '';
  }
}

/**
 * Fetch Venues from Backend and Render Cards
 */
async function loadVenues() {
  const grid = document.getElementById('venues-grid');
  if (!grid) return;

  try {
    const res = await fetch('http://localhost:5000/api/venues', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
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
 * Fully Dynamic Calendar Grid Renderer maintaining exact design and dimensions
 */
function renderCalendar(bookings) {
  const calGrid = document.querySelector('.cal-grid');
  const calLabel = document.getElementById('cal-label');
  if (!calGrid) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth(); // 0-11

  // Update Month/Year Header Label
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (calLabel) {
    calLabel.textContent = `${monthNames[month]} ${year}`;
  }

  // Preserve day headers (Sun - Sat)
  const headersHTML = `
    <div class="cal-day-header">Sun</div>
    <div class="cal-day-header">Mon</div>
    <div class="cal-day-header">Tue</div>
    <div class="cal-day-header">Wed</div>
    <div class="cal-day-header">Thu</div>
    <div class="cal-day-header">Fri</div>
    <div class="cal-day-header">Sat</div>
  `;

  const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week of 1st
  const totalDays = new Date(year, month + 1, 0).getDate(); // Total days in current month
  const prevMonthDays = new Date(year, month, 0).getDate(); // Days in previous month

  let daysHTML = headersHTML;

  // 1. Previous month spillover days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    daysHTML += `<div class="cal-day other-month"><div class="cal-day-num">${dayNum}</div></div>`;
  }

  // Filter ONLY Approved bookings for real-time calendar display
  const approvedBookings = bookings.filter(b => b.status === 'Approved');

  // 2. Current month days
  for (let day = 1; day <= totalDays; day++) {
    const currDateObj = new Date(year, month, day);
    const monthShort = currDateObj.toLocaleString('en-US', { month: 'short' });
    
    const matchingBookings = approvedBookings.filter(b => {
      return b.date.includes(`${monthShort} ${day},`) || b.date === `${monthShort} ${day}, ${year}`;
    });

    let eventsHTML = '';
    matchingBookings.forEach(b => {
      eventsHTML += `<div class="cal-event-dot blue" title="${b.club} — ${b.venue}">${b.club} — ${b.venue}</div>`;
    });

    daysHTML += `
      <div class="cal-day">
        <div class="cal-day-num">${day}</div>
        ${eventsHTML}
      </div>
    `;
  }

  // 3. Next month spillover days to complete the standard grid layout
  const totalCellsSoFar = firstDayIndex + totalDays;
  const remainingCells = totalCellsSoFar % 7 === 0 ? 0 : 7 - (totalCellsSoFar % 7);
  for (let day = 1; day <= remainingCells; day++) {
    daysHTML += `<div class="cal-day other-month"><div class="cal-day-num">${day}</div></div>`;
  }

  calGrid.innerHTML = daysHTML;
  if (window.lucide) lucide.createIcons();
}

/**
 * Setup Calendar Navigation Buttons
 */
function setupCalendarNavigation() {
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');

  if (prevBtn) {
    prevBtn.onclick = () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderBookings(currentStatusFilter);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderBookings(currentStatusFilter);
    };
  }
}

/**
 * Fetch Bookings and Render Table + Calendar in Real Time
 */
async function renderBookings(filterStatus = currentStatusFilter) {
  currentStatusFilter = filterStatus;
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;

  try {
    const res = await fetch('http://localhost:5000/api/bookings', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      cachedBookings = await res.json();
    }
  } catch (err) {
    console.error('Error loading bookings:', err);
    cachedBookings = [];
  }

  renderCalendar(cachedBookings);

  const data = filterStatus === 'All' ? cachedBookings : cachedBookings.filter(b => b.status === filterStatus);

  const pendingCount = cachedBookings.filter(b => b.status === 'Pending').length;
  const approvedCount = cachedBookings.filter(b => b.status === 'Approved').length;
  const deniedCount = cachedBookings.filter(b => b.status === 'Denied' || b.status === 'Rejected').length;

  document.querySelectorAll('.tab-count-pending').forEach(el => el.textContent = pendingCount);
  document.querySelectorAll('.tab-count-approved').forEach(el => el.textContent = approvedCount);
  document.querySelectorAll('.tab-count-denied').forEach(el => el.textContent = deniedCount);
  document.querySelectorAll('.tab-count-all').forEach(el => el.textContent = cachedBookings.length);
  document.querySelectorAll('.tab-count-all, .tab-count').forEach(el => el.textContent = cachedBookings.length);
  
  const pendingStatEl = document.getElementById('stat-pending-bookings');
  if (pendingStatEl) pendingStatEl.textContent = pendingCount;

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:var(--space-8);">No bookings found for "${filterStatus}".</td></tr>`;
    return;
  }

  currentUser = getActiveUser();
  const role = currentUser && currentUser.role ? currentUser.role.toLowerCase() : 'admin';
  const isStudent = role === 'student' || role === 'member';
  const isAdmin = role === 'admin'; // Properly define isAdmin here

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
        <div style="display:flex;gap:4px;align-items:center;">
          <button class="btn btn-sm btn-secondary" onclick="viewBookingDetails('${b.ref}')" title="View Details">
            <i data-lucide="eye"></i> View
          </button>
          ${isAdmin && b.status === 'Pending' ? `
            <button class="btn btn-sm" style="background:#10b981;color:white;padding:2px 8px;border-radius:4px;cursor:pointer;" onclick="updateBookingStatus(${b.id}, 'Approved')" title="Approve Request">
              Approve
            </button>
            <button class="btn btn-sm" style="background:#ef4444;color:white;padding:2px 8px;border-radius:4px;cursor:pointer;" onclick="updateBookingStatus(${b.id}, 'Denied')" title="Reject Request">
              Reject
            </button>
          ` : ''}
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
};

/**
 * Admin Action: Approve or Reject Booking
 */
window.updateBookingStatus = async function(id, status) {
  try {
    const res = await fetch(`http://localhost:5000/api/bookings/${id}/status`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      renderBookings();
      alert(`Booking request has been successfully ${status === 'Approved' ? 'approved' : 'rejected'}`);
    } else {
      alert('Failed to update booking status.');
    }
  } catch (err) {
    console.error('Error updating status:', err);
    alert('Network error while updating status.');
  }
};

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
  currentUser = getActiveUser();
  const role = currentUser && currentUser.role ? currentUser.role.toLowerCase() : 'admin';
  if (role === 'student' || role === 'member') {
    return;
  }

  let submitBtn = document.getElementById('btn-submit-booking');
  if (!submitBtn) {
    const buttons = document.querySelectorAll('.modal button, button');
    submitBtn = Array.from(buttons).find(b => b.textContent.includes('Submit'));
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const clubSelect = document.getElementById('select-booking-club') || document.querySelector('select');
      const venueSelect = document.getElementById('select-booking-venue') || document.querySelectorAll('select')[1];
      const dateInput = document.getElementById('input-booking-date') || document.querySelector('input[type="date"]');
      const startInput = document.getElementById('input-booking-start');
      const endInput = document.getElementById('input-booking-end');
      const purposeInput = document.getElementById('input-booking-purpose') || document.querySelector('textarea');
      const equipInput = document.getElementById('input-booking-equip');

      const venue = venueSelect ? venueSelect.value : 'Auditorium A';
      const dateVal = dateInput ? dateInput.value : '';
      const purpose = purposeInput ? purposeInput.value.trim() : '';

      if (!dateVal || !purpose) {
        alert('Please fill out the booking date and purpose.');
        return;
      }

      let formattedDate = dateVal;
      try {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      } catch (err) {
        console.warn('Date parsing fallback used:', err);
      }

      currentUser = getActiveUser();
      const payload = {
        club: clubSelect ? clubSelect.value : 'CSSG',
        venue: venue,
        date: formattedDate,
        startTime: startInput ? startInput.value : '1:00 PM',
        endTime: endInput ? endInput.value : '5:00 PM',
        purpose: purpose,
        equipment: equipInput ? equipInput.value.trim() : '',
        userId: currentUser ? currentUser.id : 1
      };

      try {
        const res = await fetch('http://localhost:5000/api/bookings', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
          if (purposeInput) purposeInput.value = '';
          if (equipInput) equipInput.value = '';
          
          if (typeof closeModal === 'function') {
            closeModal('modal-booking');
          } else {
            const modal = document.getElementById('modal-booking');
            if (modal) modal.style.display = 'none';
          }

          renderBookings();
          alert('Your booking request has been queued and routed to Admin for approval. Please wait for an email confirmation before it appears on the availability calendar.');
        } else {
          alert('Failed to submit booking: ' + (result.error || 'Unknown error'));
        }
      } catch (err) {
        console.error('Error submitting booking:', err);
        alert('Network error while submitting booking.');
      }
    });
  }
}

/* ── Init ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  enforceRoleAccess();
  loadVenues();
  setupCalendarNavigation();
  renderBookings();
  setupBookingForm();
});