/**
 * events.js — Event Scheduler & QR Attendance Subsystem (Dynamic Calendar & Info Modal)
 */

let cachedEvents = [];
let activeQREvent = null;
let currentCalendarDate = new Date(2026, 10, 1); // Default November 2026



/**
 * Fetch events from Flask backend API
 */
async function loadEvents() {
  const container = document.getElementById('events-upcoming');
  if (!container) return;

  try {
    const res = await fetch('http://localhost:5000/api/events', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      cachedEvents = await res.json();
      renderUpcoming(cachedEvents);
      renderCalendar(cachedEvents);
      setupCalendarNavigation();
      return;
    }
  } catch (err) {
    console.warn('Backend fetch failed, falling back to AppState:', err);
  }

  if (window.AppState) {
    cachedEvents = AppState.getEvents();
    renderUpcoming(cachedEvents);
    renderCalendar(cachedEvents);
    setupCalendarNavigation();
  }
}

/* ── Render Upcoming Events ─────────────────────────────────── */
function renderUpcoming(data) {
  const container = document.getElementById('events-upcoming');
  if (!container) return;

  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8);text-align:center;color:var(--color-text-muted);">
        <i data-lucide="calendar-x" style="width:32px;height:32px;margin-bottom:8px;"></i>
        <div style="font-size:14px;font-weight:600;">No upcoming events</div>
        <div style="font-size:12px;">Create an event to get started.</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  const totalUpcomingEl = document.getElementById('stat-upcoming-count');
  if (totalUpcomingEl) totalUpcomingEl.textContent = data.length;
  const tabBadgeEl = document.getElementById('tab-upcoming-badge');
  if (tabBadgeEl) tabBadgeEl.textContent = data.length;

  container.innerHTML = data.map(e => {
    const pct = Math.min(100, Math.round(((e.registered || 0) / (e.capacity || 200)) * 100));
    return `
      <div class="event-row">
        <div class="event-date-block">
          <div class="day">${e.day || '3'}</div>
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
            <span style="font-size:11px;color:var(--color-text-muted);white-space:nowrap;">${e.registered || 0} / ${e.capacity || 200} seats</span>
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

/* ── Dynamic Calendar View & Clickable Event Dots ────────────── */
function renderCalendar(events) {
  const calGrid = document.querySelector('#tab-calendar .cal-grid');
  const calLabel = document.querySelector('#tab-calendar .card-header span');
  if (!calGrid) return;

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

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

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    daysHTML += `<div class="cal-day other-month"><div class="cal-day-num">${dayNum}</div></div>`;
  }

  for (let day = 1; day <= totalDays; day++) {
    const currDateObj = new Date(year, month, day);
    const monthShort = currDateObj.toLocaleString('en-US', { month: 'short' });
    
    const matchingEvents = events.filter(e => {
      return e.date.includes(`${monthShort} ${day},`) || e.date === `${monthShort} ${day}, ${year}`;
    });

    let eventsHTML = '';
    matchingEvents.forEach(e => {
      eventsHTML += `<div class="cal-event-dot blue" onclick="openEventInfo(${e.id})" title="Click to view info">${e.name}</div>`;
    });

    daysHTML += `
      <div class="cal-day">
        <div class="cal-day-num">${day}</div>
        ${eventsHTML}
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
  const cardHeader = document.querySelector('#tab-calendar .card-header div');
  if (!cardHeader) return;
  const prevBtn = cardHeader.querySelector('button:first-child');
  const nextBtn = cardHeader.querySelector('button:last-child');

  if (prevBtn) {
    prevBtn.onclick = () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar(cachedEvents);
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar(cachedEvents);
    };
  }
}

/**
 * Open Event Information Modal when clicked from Calendar
 */
window.openEventInfo = function(eventId) {
  const ev = cachedEvents.find(e => e.id === eventId);
  if (!ev) return;

  const modal = document.getElementById('modal-event-info');
  if (modal) {
    document.getElementById('info-evt-title').textContent = ev.name;
    document.getElementById('info-evt-club').textContent = ev.club;
    document.getElementById('info-evt-date').textContent = ev.date;
    document.getElementById('info-evt-venue').textContent = ev.venue;
    document.getElementById('info-evt-time').textContent = ev.time;
    document.getElementById('info-evt-capacity').textContent = `${ev.capacity || 200} seats (${ev.registered || 0} registered)`;

    const qrBtn = document.getElementById('btn-modal-qr-trigger');
    qrBtn.onclick = () => {
      closeModal('modal-event-info');
      openQR(ev.id);
    };

    modal.classList.add('open');
  }
};

/* ── Render Past Events Table (Connected to Database) ──────── */
/* ── Load Past Events from Database ────────────────────────── */
async function loadPastEvents() {
  const tbody = document.getElementById('past-events-body');
  if (!tbody) return;

  try {
    const res = await fetch('http://localhost:5000/api/events/past', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      const data = await res.json();
      renderPastEventsTable(data);
      return;
    }
  } catch (err) {
    console.warn('Failed to fetch past events from backend:', err);
  }
}

function renderPastEventsTable(data) {
  const tbody = document.getElementById('past-events-body');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--color-text-muted);">No past events recorded.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map((e) => {
    const rate = Math.round(((e.attended || 0) / (e.registered || 1)) * 100);
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

function renderPastEventsTable(data) {
  const tbody = document.getElementById('past-events-body');
  if (!tbody) return;

  tbody.innerHTML = data.map((e) => {
    const rate = Math.round(((e.attended || 0) / (e.registered || 1)) * 100);
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

/* ── Open QR Pass Modal ─────────────────────────────────────── */
window.openQR = function(eventId) {
  const ev = cachedEvents.find(e => e.id === eventId) || cachedEvents[0];
  if (!ev) return;

  activeQREvent = ev;
  const user = window.Auth ? window.Auth.getCurrentUser() : { name: 'Juan Miguel Repas', studentId: '2024-08192', email: 'admin@qcu.edu.ph' };
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

    renderQRCanvas(passCode, user.name, ev.name);
    modal.classList.add('open');
  }
};

function renderQRCanvas(code, name, eventName) {
  const canvas = document.getElementById('qr-canvas-preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = canvas.width;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#0f172a';
  const margin = 20;
  const matrixSize = 25;
  const cellSize = (size - margin * 2) / matrixSize;

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

  let seed = 0;
  for (let i = 0; i < code.length; i++) seed += code.charCodeAt(i);

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if ((r < 8 && c < 8) || (r < 8 && c >= matrixSize - 8) || (r >= matrixSize - 8 && c < 8)) continue;
      const pseudoRandom = Math.sin(seed * (r * matrixSize + c)) * 10000;
      if (pseudoRandom - Math.floor(pseudoRandom) > 0.5) {
        ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize - 0.5, cellSize - 0.5);
      }
    }
  }
}

window.downloadQRPass = function() {
  const canvas = document.getElementById('qr-canvas-preview');
  if (!canvas) return;
  const user = window.Auth ? window.Auth.getCurrentUser() : { name: 'Attendee' };
  const link = document.createElement('a');
  link.download = `QR_Pass_${activeQREvent ? activeQREvent.name.replace(/\s+/g, '_') : 'Event'}_${user.name.replace(/\s+/g, '_')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  if (window.AppState) AppState.showToast('Pass Downloaded', 'Digital QR pass image saved to your device.');
};

window.emailQRPass = function() {
  const user = window.Auth ? window.Auth.getCurrentUser() : { email: 'admin@qcu.edu.ph' };
  if (window.AppState) AppState.showToast('Email Dispatched', `Digital pass sent to ${user.email}. Check your inbox!`);
};

window.exportEventCSV = function(eventName, attendedCount, eventDate) {
  window.location.href = `http://localhost:5000/api/events/1/attendance/csv`;
};

/* ── Setup Form Handlers ─────────────────────────────────────── */
function setupEventsForm() {
  const btnCreate = document.getElementById('btn-create-event');
  if (btnCreate) {
    btnCreate.addEventListener('click', async (e) => {
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

      const payload = {
        name,
        club: clubSelect ? clubSelect.value : 'CSSG',
        date,
        time: (timeInput && timeInput.value ? timeInput.value : '13:00') + ' – 5:00 PM',
        venue: venueSelect ? venueSelect.value : 'Auditorium A',
        capacity: capInput && capInput.value ? parseInt(capInput.value, 10) : 200
      };

      try {
        const res = await fetch('http://localhost:5000/api/events', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          if (nameInput) nameInput.value = '';
          if (dateInput) dateInput.value = '';
          if (typeof closeModal === 'function') closeModal('modal-create-event');

          loadEvents();
          if (window.AppState) AppState.showToast('Event Created', `${name} scheduled successfully and saved to database.`);
        } else {
          alert('Failed to create event.');
        }
      } catch (err) {
        console.error('Error creating event:', err);
        alert('Network error while creating event.');
      }
    });
  }
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadEvents();
  renderPastEvents(PAST_EVENTS);
  setupEventsForm();
  renderPastEventsTable(PAST_EVENTS);
});