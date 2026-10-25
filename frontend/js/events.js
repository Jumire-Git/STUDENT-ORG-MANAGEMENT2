/**
 * events.js — Event Scheduler & QR Attendance Subsystem
 * Handles event list rendering, calendar view, and attendance stats.
 */

/* ── Mock Data ───────────────────────────────────────────────── */
const EVENTS = [
  {
    id: 1,
    name: 'Tech Summit 2026',
    club: 'CSSG',
    date: 'Nov 3, 2026',
    day: 3, month: 'Nov',
    time: '1:00 PM – 6:00 PM',
    venue: 'Auditorium A',
    capacity: 200,
    registered: 200,
    status: 'Upcoming',
    badgeClass: 'badge-blue',
  },
  {
    id: 2,
    name: 'PCB Design Workshop',
    club: 'IEEE',
    date: 'Nov 5, 2026',
    day: 5, month: 'Nov',
    time: '3:00 PM – 6:00 PM',
    venue: 'MPH Room C',
    capacity: 80,
    registered: 45,
    status: 'Upcoming',
    badgeClass: 'badge-green',
  },
  {
    id: 3,
    name: 'First Aid Seminar',
    club: 'Red Cross Youth',
    date: 'Nov 8, 2026',
    day: 8, month: 'Nov',
    time: '8:00 AM – 12:00 PM',
    venue: 'AVR Room',
    capacity: 100,
    registered: 95,
    status: 'Upcoming',
    badgeClass: 'badge-red',
  },
  {
    id: 4,
    name: 'CPA Review Series — Session 1',
    club: 'JPIA',
    date: 'Nov 5, 2026',
    day: 5, month: 'Nov',
    time: '2:00 PM – 5:00 PM',
    venue: 'AVR Room',
    capacity: 120,
    registered: 88,
    status: 'Upcoming',
    badgeClass: 'badge-amber',
  },
];

const PAST_EVENTS = [
  { name:'General Assembly — Q3', club:'Supreme Student Council', date:'Oct 15, 2026', registered:450, attended:412 },
  { name:'Hackathon 2026',         club:'CSSG',                   date:'Oct 10, 2026', registered:80,  attended:75  },
  { name:'Career Expo',            club:'JPIA',                   date:'Oct 5, 2026',  registered:200, attended:138 },
  { name:'Leadership Seminar',     club:'USC',                    date:'Sep 28, 2026', registered:160, attended:145 },
];

/* ── Render Upcoming Events ─────────────────────────────────── */
function renderUpcoming(data) {
  const container = document.getElementById('events-upcoming');
  if (!container) return;
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="calendar-x"></i>
        <div class="empty-state-title">No upcoming events</div>
        <div class="empty-state-text">Create an event to get started.</div>
      </div>`;
    lucide.createIcons();
    return;
  }
  container.innerHTML = data.map(e => {
    const pct = Math.round((e.registered / e.capacity) * 100);
    return `
      <div class="event-row">
        <div class="event-date-block">
          <div class="day">${e.day}</div>
          <div class="month">${e.month}</div>
        </div>
        <div style="width:1px;background:var(--color-border);margin:0 var(--space-2);align-self:stretch;"></div>
        <div class="event-info">
          <div class="event-name">${e.name}</div>
          <div class="event-meta">
            <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="clock"></i> ${e.time}</span>
            <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="map-pin"></i> ${e.venue}</span>
            <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="users"></i> ${e.registered} registered</span>
            <span class="badge ${e.badgeClass}">${e.club}</span>
          </div>
          <div style="margin-top:var(--space-3);display:flex;align-items:center;gap:var(--space-3);">
            <div style="flex:1;"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;"></div></div></div>
            <span style="font-size:11px;color:var(--color-text-muted);white-space:nowrap;">${e.registered} / ${e.capacity} seats</span>
          </div>
        </div>
        <div class="event-actions">
          <button class="btn btn-secondary btn-sm" onclick="openQR(${e.id})"><i data-lucide="qr-code"></i> QR Pass</button>
          <button class="btn btn-secondary btn-sm"><i data-lucide="bar-chart-2"></i> Attendance</button>
          <button class="icon-btn"><i data-lucide="more-horizontal"></i></button>
        </div>
      </div>
    `;
  }).join('');
  lucide.createIcons();
}

/* ── Render Past Events Table ───────────────────────────────── */
function renderPastEvents(data) {
  const tbody = document.getElementById('past-events-body');
  if (!tbody) return;
  tbody.innerHTML = data.map(e => {
    const rate = Math.round((e.attended / e.registered) * 100);
    const badgeClass = rate >= 85 ? 'badge-green' : rate >= 65 ? 'badge-amber' : 'badge-red';
    return `
      <tr>
        <td><div style="font-weight:500;">${e.name}</div></td>
        <td>${e.club}</td>
        <td>${e.date}</td>
        <td>${e.registered}</td>
        <td>${e.attended}</td>
        <td><span class="badge ${badgeClass}">${rate}%</span></td>
        <td><button class="btn btn-sm btn-secondary"><i data-lucide="download"></i> CSV</button></td>
      </tr>
    `;
  }).join('');
  lucide.createIcons();
}

/* ── Filter Upcoming by Club ─────────────────────────────────── */
function filterEvents() {
  const club = document.getElementById('filter-event-club')?.value || '';
  const q    = document.getElementById('search-events')?.value.toLowerCase() || '';
  const filtered = EVENTS.filter(e =>
    (!club || e.club === club) &&
    (!q    || e.name.toLowerCase().includes(q))
  );
  renderUpcoming(filtered);
}

/* ── Open QR Pass Modal ─────────────────────────────────────── */
function openQR(eventId) {
  const ev = EVENTS.find(e => e.id === eventId);
  if (!ev) return;
  const modal = document.getElementById('modal-qr');
  if (modal) {
    modal.querySelector('.modal-title').textContent = `QR Pass — ${ev.name}`;
    modal.classList.add('open');
  }
}

/* ── Create Event (stub) ─────────────────────────────────────── */
function createEvent(formData) {
  console.log('[Events] Creating event:', formData);
  // EventsAPI.createEvent(formData).then(res => { ... }).catch(console.error);
}

/* ── Export Attendance ───────────────────────────────────────── */
function exportAttendance(eventId) {
  const url = EventsAPI?.exportAttendance(eventId);
  if (url) window.open(url, '_blank');
  else alert('Attendance export requires the backend to be running at localhost:5000.');
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderUpcoming(EVENTS);
  renderPastEvents(PAST_EVENTS);
});
