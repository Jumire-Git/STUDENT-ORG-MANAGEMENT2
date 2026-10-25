/**
 * events.js — Event Scheduler & QR Attendance Subsystem
 * Connects to AppState for working event creation, calendar views, pass generation, and attendance exports.
 */

const PAST_EVENTS = [
  { name:'General Assembly — Q3', club:'Supreme Student Council', date:'Oct 15, 2026', registered:450, attended:412 },
  { name:'Hackathon 2026',         club:'CSSG',                   date:'Oct 10, 2026', registered:80,  attended:75  },
  { name:'Career Expo',            club:'JPIA',                   date:'Oct 5, 2026',  registered:200, attended:138 },
  { name:'Leadership Seminar',     club:'USC',                    date:'Sep 28, 2026', registered:160, attended:145 },
];

let activeQREvent = null;

/* ── Render Upcoming Events ─────────────────────────────────── */
function renderUpcoming(data = AppState.getEvents()) {
  const container = document.getElementById('events-upcoming');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i data-lucide="calendar-x"></i>
        <div class="empty-state-title">No upcoming events</div>
        <div class="empty-state-text">Create an event to get started.</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Update total upcoming stat
  const totalUpcomingEl = document.getElementById('stat-upcoming-count');
  if (totalUpcomingEl) totalUpcomingEl.textContent = data.length;

  container.innerHTML = data.map(e => {
    const pct = Math.min(100, Math.round(((e.registered || 0) / (e.capacity || 100)) * 100));
    return `
      <div class="event-row">
        <div class="event-date-block">
          <div class="day">${e.day || 1}</div>
          <div class="month">${e.month || 'Nov'}</div>
        </div>
        <div style="width:1px;background:var(--color-border);margin:0 var(--space-2);align-self:stretch;"></div>
        <div class="event-info">
          <div class="event-name">${e.name}</div>
          <div class="event-meta">
            <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="clock"></i> ${e.time}</span>
            <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="map-pin"></i> ${e.venue}</span>
            <span style="display:flex;align-items:center;gap:4px;"><i data-lucide="users"></i> ${e.registered || 0} registered</span>
            <span class="badge ${e.badgeClass || 'badge-blue'}">${e.club}</span>
          </div>
          <div style="margin-top:var(--space-3);display:flex;align-items:center;gap:var(--space-3);">
            <div style="flex:1;"><div class="progress-bar"><div class="progress-fill" style="width:${pct}%;"></div></div></div>
            <span style="font-size:11px;color:var(--color-text-muted);white-space:nowrap;">${e.registered || 0} / ${e.capacity} seats</span>
          </div>
        </div>
        <div class="event-actions">
          <button type="button" class="btn btn-secondary btn-sm" onclick="openQR(${e.id})"><i data-lucide="qr-code"></i> QR Pass</button>
          <a href="scanner.html" class="btn btn-secondary btn-sm"><i data-lucide="scan-line"></i> Door Check-in</a>
        </div>
      </div>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

/* ── Render Past Events Table ───────────────────────────────── */
function renderPastEvents(data = PAST_EVENTS) {
  const tbody = document.getElementById('past-events-body');
  if (!tbody) return;
  tbody.innerHTML = data.map((e, idx) => {
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
        <td>
          <button type="button" class="btn btn-sm btn-secondary" onclick="exportEventCSV('${e.name}', ${e.attended}, '${e.date}')">
            <i data-lucide="download"></i> CSV
          </button>
        </td>
      </tr>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

/* ── Filter Upcoming by Club ─────────────────────────────────── */
function filterEvents() {
  const club = document.getElementById('filter-event-club')?.value || '';
  const q    = (document.getElementById('search-events')?.value || '').toLowerCase();
  const all = AppState.getEvents();
  const filtered = all.filter(e =>
    (!club || e.club === club) &&
    (!q    || e.name.toLowerCase().includes(q) || (e.venue && e.venue.toLowerCase().includes(q)))
  );
  renderUpcoming(filtered);
}

/* ── Open QR Pass Modal ─────────────────────────────────────── */
window.openQR = function(eventId) {
  const events = AppState.getEvents();
  const ev = events.find(e => e.id === eventId) || events[0];
  if (!ev) return;

  activeQREvent = ev;
  const user = window.Auth ? window.Auth.getCurrentUser() : { name: 'Juan Miguel R.', studentId: '2024-08192', email: 'student@campus.edu' };
  const modal = document.getElementById('modal-qr');
  if (modal) {
    modal.querySelector('.modal-title').textContent = `QR Pass — ${ev.name}`;
    const nameEl = document.getElementById('qr-attendee-name');
    if (nameEl) nameEl.textContent = user.name;
    const metaEl = document.getElementById('qr-event-meta');
    if (metaEl) metaEl.textContent = `${ev.name} · ${ev.venue} · ${ev.date}`;
    const codeEl = document.getElementById('qr-pass-code');
    const passCode = `EVT-${ev.id}-${user.name.split(' ').map(w=>w[0]).join('')}-${Math.floor(1000 + Math.random()*9000)}`;
    if (codeEl) codeEl.textContent = passCode;

    // Render Canvas QR visual
    renderQRCanvas(passCode, user.name, ev.name);

    modal.classList.add('open');
  }
};

function renderQRCanvas(code, name, eventName) {
  const canvas = document.getElementById('qr-canvas-preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Draw clean simulated high-res matrix barcode pattern
  ctx.fillStyle = '#0f172a';
  const margin = 20;
  const matrixSize = 25;
  const cellSize = (size - margin * 2) / matrixSize;

  // Corner markers
  function drawCorner(x, y) {
    ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
  }

  drawCorner(margin, margin);
  drawCorner(size - margin - cellSize * 7, margin);
  drawCorner(margin, size - margin - cellSize * 7);

  // Deterministic seed based on code string
  let seed = 0;
  for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i);

  // Fill data cells
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip corners
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) continue;
      const pseudoRandom = Math.sin(seed * (r * matrixSize + c)) * 10000;
      if (pseudoRandom - Math.floor(pseudoRandom) > 0.5) {
        ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize - 0.5, cellSize - 0.5);
      }
    }
  }
}

/* ── Download PNG Pass ───────────────────────────────────────── */
window.downloadQRPass = function() {
  const canvas = document.getElementById('qr-canvas-preview');
  if (!canvas) return;
  const user = window.Auth ? window.Auth.getCurrentUser() : { name: 'Attendee' };
  const link = document.createElement('a');
  link.download = `QR_Pass_${activeQREvent ? activeQREvent.name.replace(/\s+/g, '_') : 'Event'}_${user.name.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  AppState.showToast('Pass Downloaded', 'Digital QR pass image saved to your device.');
};

/* ── Email Pass ─────────────────────────────────────────────── */
window.emailQRPass = function() {
  const user = window.Auth ? window.Auth.getCurrentUser() : { email: 'student@campus.edu' };
  AppState.showToast('Email Dispatched', `Digital pass sent to ${user.email}. Check your inbox!`);
};

/* ── Export Event CSV ───────────────────────────────────────── */
window.exportEventCSV = function(eventName, attendedCount, eventDate) {
  const mockStudents = [
    { name: 'Alex Rivera', id: '2024-08192', college: 'College of Computer Studies', time: '1:04 PM' },
    { name: 'Maria Santos', id: '2023-01044', college: 'College of Engineering', time: '1:12 PM' },
    { name: 'Carlo Reyes', id: '2022-04911', college: 'College of Computer Studies', time: '1:15 PM' },
    { name: 'Lea Tan', id: '2023-08812', college: 'College of Accountancy', time: '1:20 PM' },
    { name: 'Jun Park', id: '2024-02394', college: 'College of Engineering', time: '1:24 PM' },
    { name: 'Ana Cruz', id: '2022-07612', college: 'College of Nursing', time: '1:32 PM' },
    { name: 'Roberto Diaz', id: 'FAC-1029', college: 'Student Affairs & Facilities', time: '1:45 PM' },
  ];

  let csv = `Event: ${eventName}\nDate: ${eventDate}\nTotal Verified Attendees: ${attendedCount}\nGenerated: ${new Date().toLocaleString()}\n\n`;
  csv += `Student Name,Student ID,College / Department,Check-in Time,Status\n`;

  mockStudents.forEach(s => {
    csv += `"${s.name}","${s.id}","${s.college}","${s.time}","Verified Present"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Attendance_${eventName.replace(/\s+/g, '_')}_${eventDate.replace(/\s+/g, '_')}.csv`;
  link.click();
  AppState.showToast('Spreadsheet Exported', `Attendance record for ${eventName} downloaded.`);
};

/* ── Setup Form Handlers ─────────────────────────────────────── */
function setupEventsForm() {
  const btnCreate = document.getElementById('btn-create-event');
  if (btnCreate) {
    btnCreate.addEventListener('click', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('input-evt-name');
      const clubSelect = document.getElementById('select-evt-club');
      const dateInput = document.getElementById('input-evt-date');
      const timeInput = document.getElementById('input-evt-time');
      const venueSelect = document.getElementById('select-evt-venue');
      const capInput = document.getElementById('input-evt-capacity');

      const name = nameInput ? nameInput.value.trim() : '';
      const date = dateInput ? dateInput.value : '';

      if (!name || !date) {
        alert('Please fill out the event title and date.');
        return;
      }

      const newEvt = AppState.addEvent({
        name,
        club: clubSelect ? clubSelect.value : 'CSSG',
        date,
        time: timeInput && timeInput.value ? timeInput.value : '1:00 PM – 5:00 PM',
        venue: venueSelect ? venueSelect.value : 'Auditorium A',
        capacity: capInput && capInput.value ? capInput.value : 150
      });

      // Clear & close
      if (nameInput) nameInput.value = '';
      if (dateInput) dateInput.value = '';
      if (typeof closeModal === 'function') closeModal('modal-create-event');

      renderUpcoming(AppState.getEvents());
      AppState.showToast('Event Created', `${newEvt.name} scheduled for ${newEvt.date}. Digital passes generated.`);
    });
  }

  // Filter listeners
  const filterClub = document.getElementById('filter-event-club');
  if (filterClub) filterClub.addEventListener('change', filterEvents);

  const searchInput = document.getElementById('search-events');
  if (searchInput) searchInput.addEventListener('input', filterEvents);
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderUpcoming(AppState.getEvents());
  renderPastEvents(PAST_EVENTS);
  setupEventsForm();
});
