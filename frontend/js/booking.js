/**
 * booking.js — Resource & Facility Booking Subsystem
 * Handles booking form submission, status updates, and calendar rendering.
 */

/* ── Mock data (replace with BookingAPI calls when backend is ready) ── */
const BOOKINGS = [
  { ref:'#BK-042', club:'CSSG',          requester:'Carlo Reyes',   venue:'Auditorium A',    date:'Nov 3, 2026',  time:'1:00–5:00 PM', purpose:'Tech Summit Keynote',   status:'Pending'  },
  { ref:'#BK-041', club:'IEEE',          requester:'Maria Santos',  venue:'MPH Room C',      date:'Nov 5, 2026',  time:'3:00–6:00 PM', purpose:'PCB Design Workshop',   status:'Pending'  },
  { ref:'#BK-040', club:'Red Cross Youth',requester:'Ana Cruz',     venue:'Projector Set',   date:'Nov 8, 2026',  time:'8:00 AM–12 PM',purpose:'First Aid Seminar',     status:'Pending'  },
  { ref:'#BK-039', club:'JPIA',          requester:'Lea Tan',       venue:'AVR Room',        date:'Nov 22, 2026', time:'1:00–4:00 PM', purpose:'CPA Review Webinar',    status:'Approved' },
  { ref:'#BK-038', club:'Robotics Club', requester:'Jun Park',      venue:'Computer Lab 3',  date:'Nov 15, 2026', time:'9:00 AM–5:00 PM',purpose:'Robot Programming Sprint', status:'Approved' },
  { ref:'#BK-037', club:'JPIA',          requester:'Lea Tan',       venue:'Audio Equipment', date:'Oct 30, 2026', time:'2:00–4:00 PM', purpose:'Webinar Audio',         status:'Denied'   },
];

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

/**
 * Render bookings table.
 * @param {string} filterStatus - 'All' | 'Pending' | 'Approved' | 'Denied'
 */
function renderBookings(filterStatus = 'All') {
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;
  const data = filterStatus === 'All' ? BOOKINGS : BOOKINGS.filter(b => b.status === filterStatus);
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);padding:var(--space-8);">No bookings found.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((b, i) => `
    <tr>
      <td style="color:var(--color-text-muted);font-size:12px;font-family:monospace;">${b.ref}</td>
      <td>
        <div style="font-weight:500;">${b.club}</div>
        <div style="font-size:11px;color:var(--color-text-muted);">${b.requester}</div>
      </td>
      <td>${b.venue}</td>
      <td>
        <div>${b.date}</div>
        <div style="font-size:11px;color:var(--color-text-muted);">${b.time}</div>
      </td>
      <td>${b.purpose}</td>
      <td>
        <span class="badge ${STATUS_BADGE[b.status]}">
          <i data-lucide="${STATUS_ICON[b.status]}"></i> ${b.status}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:4px;">
          ${b.status === 'Pending' ? `
            <button class="btn btn-sm btn-primary"   onclick="updateStatus(${i},'Approved')"><i data-lucide="check"></i></button>
            <button class="btn btn-sm btn-danger"    onclick="updateStatus(${i},'Denied')"><i data-lucide="x"></i></button>
          ` : `
            <button class="btn btn-sm btn-secondary"><i data-lucide="eye"></i></button>
          `}
        </div>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

/**
 * Update booking status (mock — replace with BookingAPI.updateStatus(id, status) call).
 */
function updateStatus(index, newStatus) {
  BOOKINGS[index].status = newStatus;
  renderBookings();
  // BookingAPI.updateStatus(BOOKINGS[index].ref, newStatus).catch(console.error);
}

/* ── Booking form submit ────────────────────────────────────── */
function submitBooking(formData) {
  console.log('[Booking] Submitting:', formData);
  // BookingAPI.createBooking(formData).then(() => { ... }).catch(console.error);
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderBookings();
});
