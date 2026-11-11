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
let cachedHolidays = {};
let currentUser = null;

// Calendar navigation state (defaults to January 2027)
let currentCalendarDate = new Date(2027, 0, 1); 

function getAuthHeaders(includeContentType = false) {
  const token = localStorage.getItem('token');
  const headers = {};
  if (token && token !== 'null' && token !== 'undefined') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

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
  return { id: 1, name: 'Juan Miguel Repas', role: 'admin' };
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
      headers: getAuthHeaders()
    });
    if (res.ok) {
      cachedVenues = await res.json();
      
      // Update Total Venues Stat Card dynamically
      const venuesStatEl = document.getElementById('stat-total-venues');
      if (venuesStatEl) venuesStatEl.textContent = cachedVenues.length || 8;

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

async function loadHolidays() {
  try {
    const res = await fetch('http://localhost:5000/api/holidays', {
      headers: getAuthHeaders()
    });
    if (res.ok) {
      cachedHolidays = await res.json();
    }
  } catch (err) {
    console.error('Error loading holidays:', err);
  }
}

/**
 * Fully Dynamic Calendar Grid Renderer maintaining exact design and dimensions
 */
function renderCalendar(bookings) {
  const calGrid = document.querySelector('.cal-grid');
  const calLabel = document.getElementById('cal-label');
  const venueFilterSelect = document.getElementById('cal-venue-filter');
  if (!calGrid) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth(); // 0-11
  const selectedVenue = venueFilterSelect ? venueFilterSelect.value : 'all';

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (calLabel) {
    calLabel.textContent = `${monthNames[month]} ${year}`;
  }

  const headersHTML = `
    <div class="cal-day-header">Sun</div>
    <div class="cal-day-header">Mon</div>
    <div class="cal-day-header">Tue</div>
    <div class="cal-day-header">Wed</div>
    <div class="cal-day-header">Thu</div>
    <div class="cal-day-header">Fri</div>
    <div class="cal-day-header">Sat</div>
  `;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  let daysHTML = headersHTML;

  // Previous month spillover days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    daysHTML += `<div class="cal-day other-month"><div class="cal-day-num">${dayNum}</div></div>`;
  }

  let relevantBookings = bookings;
  if (selectedVenue && selectedVenue !== 'all') {
    relevantBookings = bookings.filter(b => b.venue === selectedVenue);
  }

  // Current month days
  for (let day = 1; day <= totalDays; day++) {
    const currDateObj = new Date(year, month, day);
    const monthShort = currDateObj.toLocaleString('en-US', { month: 'short' });
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const dateKey = `${year}-${mm}-${dd}`;

    const holiday = cachedHolidays[dateKey];
    const dayBookings = relevantBookings.filter(b => {
      return b.date.includes(`${monthShort} ${day},`) || b.date === `${monthShort} ${day}, ${year}`;
    });

    const approvedBooking = dayBookings.find(b => b.status === 'Approved');
    const pendingBooking = dayBookings.find(b => b.status === 'Pending');

    let statusClass = 'status-available';
    let badgeHTML = '<span class="cal-status-badge available">Available</span>';
    let eventPillHTML = '';

    if (holiday) {
      statusClass = 'status-holiday';
      badgeHTML = `<span class="cal-status-badge" style="background:#dbeafe;color:#1e40af;" title="${holiday.type}">Holiday</span>`;
      eventPillHTML = `<span class="cal-event-pill" style="background:#dbeafe;color:#1e40af;font-size:10px;" title="${holiday.name}">${holiday.name}</span>`;
    } else if (approvedBooking) {
      statusClass = 'status-booked';
      badgeHTML = '<span class="cal-status-badge booked">Booked</span>';
      eventPillHTML = `<span class="cal-event-pill booked" onclick="openBookingInfo(${approvedBooking.id})" style="cursor:pointer;" title="View details">${approvedBooking.club} · ${approvedBooking.venue}</span>`;
    } else if (pendingBooking) {
      statusClass = 'status-pending';
      badgeHTML = '<span class="cal-status-badge pending">Pending</span>';
      eventPillHTML = `<span class="cal-event-pill pending" onclick="openBookingInfo(${pendingBooking.id})" style="cursor:pointer;" title="View details">${pendingBooking.club} · ${pendingBooking.venue}</span>`;
    }

    daysHTML += `
      <div class="cal-day ${statusClass}">
        <div class="cal-day-num">${day}</div>
        ${badgeHTML}
        ${eventPillHTML}
      </div>
    `;
  }

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
  const todayBtn = document.getElementById('cal-today');

  if (prevBtn) {
    prevBtn.onclick = () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar(cachedBookings);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar(cachedBookings);
    };
  }

  if (todayBtn) {
    todayBtn.onclick = () => {
      currentCalendarDate = new Date(); // Syncs to today's real-time date
      renderCalendar(cachedBookings);
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
      headers: getAuthHeaders()
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

  // ── UPDATE STAT CARDS DYNAMICALLY ──
  const venuesStatEl = document.getElementById('stat-total-venues');
  if (venuesStatEl) venuesStatEl.textContent = cachedVenues.length || 8;

  const pendingStatEl = document.getElementById('stat-pending-count');
  if (pendingStatEl) pendingStatEl.textContent = pendingCount;

  const approvedStatEl = document.getElementById('stat-approved-count');
  if (approvedStatEl) approvedStatEl.textContent = approvedCount;

  const deniedStatEl = document.getElementById('stat-denied-count');
  if (deniedStatEl) deniedStatEl.textContent = deniedCount;
  // ────────────────────────────────────

  document.querySelectorAll('.tab-count-pending').forEach(el => el.textContent = pendingCount);
  document.querySelectorAll('.tab-count-approved').forEach(el => el.textContent = approvedCount);
  document.querySelectorAll('.tab-count-denied').forEach(el => el.textContent = deniedCount);
  document.querySelectorAll('.tab-count-all, .tab-count').forEach(el => el.textContent = cachedBookings.length);
  
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:var(--space-8);">No bookings found for "${filterStatus}".</td></tr>`;
    return;
  }

  currentUser = getActiveUser();
  const role = currentUser && currentUser.role ? currentUser.role.toLowerCase() : 'admin';
  const isAdmin = role === 'admin';

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
          <button class="btn btn-sm btn-secondary" onclick="viewBookingDetails(${b.id})" title="View Details">
            <i data-lucide="eye"></i> View
          </button>
          ${isAdmin && b.status === 'Pending' ? `
            <button class="btn btn-sm" style="background:#10b981;color:white;padding:2px 8px;border-radius:4px;cursor:pointer;" onclick="updateBookingStatus(${b.id}, 'Approved')" title="Approve Request">
              Approve
            </button>
            <button class="btn btn-sm" style="background:#ef4444;color:white;padding:2px 8px;border-radius:4px;cursor:pointer;" onclick="updateBookingStatus(${b.id}, 'Rejected')" title="Reject Request">
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
      headers: getAuthHeaders(true),
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

window.viewBookingDetails = function(bookingIdOrRef) {
  let b = null;
  if (typeof bookingIdOrRef === 'number') {
    b = cachedBookings.find(x => x.id === bookingIdOrRef);
  } else {
    b = cachedBookings.find(x => x.ref === bookingIdOrRef || `#BK-0${x.id + 40}` === bookingIdOrRef);
  }
  
  if (b) {
    openBookingInfo(b.id);
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
          headers: getAuthHeaders(true),
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

/**
 * Open Centered CSS Modal for Booking / Calendar Event Details
 */
window.openBookingInfo = function(bookingId) {
  const b = cachedBookings.find(x => x.id === bookingId);
  if (!b) return;

  document.getElementById('info-bk-title').textContent = b.purpose || 'Reservation Details';
  document.getElementById('info-bk-club').textContent = b.club || 'Campus Organization';
  document.getElementById('info-bk-ref').textContent = b.ref || `#BK-0${b.id + 40}`;
  document.getElementById('info-bk-venue').textContent = b.venue || 'Auditorium A';
  document.getElementById('info-bk-datetime').textContent = `${b.date} (${b.time})`;
  document.getElementById('info-bk-purpose').textContent = b.purpose || 'N/A';
  document.getElementById('info-bk-equip').textContent = b.equipment || 'Standard Setup';

  const statusEl = document.getElementById('info-bk-status');
  if (statusEl) {
    statusEl.textContent = b.status;
    statusEl.className = `badge ${STATUS_BADGE[b.status] || 'badge-neutral'}`;
  }

  const modal = document.getElementById('modal-booking-info');
  if (modal) {
    modal.classList.add('open');
  }
};

/* ── Init ────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  enforceRoleAccess();
  await loadHolidays();
  loadVenues();
  setupCalendarNavigation();
  
  const venueFilterSelect = document.getElementById('cal-venue-filter');
  if (venueFilterSelect) {
    venueFilterSelect.onchange = () => renderBookings(currentStatusFilter);
  }

  renderBookings();
  setupBookingForm();
});