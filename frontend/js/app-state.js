/**
 * app-state.js — Centralized State, Interactive Engine & Utilities
 * Provides working search, notifications, announcements, bookings, clubs, events, and toasts.
 */

const STORAGE_KEYS = {
  CLUBS: 'student_org_clubs_data',
  ANNOUNCEMENTS: 'student_org_announcements_data',
  BOOKINGS: 'student_org_bookings_data',
  EVENTS: 'student_org_events_data',
  NOTIFICATIONS: 'student_org_notifications_data',
};

/* ── Default Initial Datasets ───────────────────────────────── */
const DEFAULT_CLUBS = [
  { id: 1, abbr: 'CSSG', name: 'Computer Science Society of the Philippines', category: 'Technical',  president: 'Carlo Reyes',   members: 52, events: 6, status: 'Active',   desc: 'Premier org for CS/IT students. Hosts workshops, hackathons, and tech talks.' },
  { id: 2, abbr: 'IEEE', name: 'IEEE Student Branch',                          category: 'Technical',  president: 'Maria Santos',  members: 38, events: 4, status: 'Active',   desc: 'International student chapter for future engineers and technology leaders.' },
  { id: 3, abbr: 'RCY',  name: 'Red Cross Youth',                              category: 'Service',    president: 'Ana Cruz',      members: 90, events: 8, status: 'Active',   desc: 'Promoting humanitarian values and community service across the campus.' },
  { id: 4, abbr: 'JPIA', name: 'Junior Philippine Institute of Accountants',   category: 'Academic',   president: 'Lea Tan',       members: 65, events: 5, status: 'Active',   desc: 'Prepares future CPAs through review sessions, seminars, and industry talks.' },
  { id: 5, abbr: 'USC',  name: 'University Supreme Council',                   category: 'Academic',   president: 'Ron Dela Cruz', members: 24, events: 12,status: 'Active',   desc: 'The highest governing student body on campus representing all students.' },
  { id: 6, abbr: 'ROBO', name: 'Robotics Club',                                category: 'Technical',  president: 'Jun Park',      members: 30, events: 3, status: 'Active',   desc: 'Building, programming, and competing with robots at inter-school competitions.' },
  { id: 7, abbr: 'DMSF', name: 'Dance and Music Society',                      category: 'Cultural',   president: 'Lia Flores',    members: 45, events: 7, status: 'Active',   desc: 'Creative outlet for student artists in dance, music, and performing arts.' },
  { id: 8, abbr: 'SOC',  name: 'Sociology Circle',                             category: 'Academic',   president: 'Mark Bautista', members: 20, events: 2, status: 'Inactive', desc: 'Discussion group exploring social issues, culture, and community dynamics.' },
];

const DEFAULT_ANNOUNCEMENTS = [
  { id: 'ann-1', club: 'USC',  author: 'Ron Dela Cruz', role: 'President', date: 'Oct 24, 2026', audience: 'All Students', title: 'General Assembly — Q4 Schedule', body: 'The Q4 General Assembly will be held on November 17 at Auditorium A. All students are requested to attend. Attendance is checked through official QR event passes.' },
  { id: 'ann-2', club: 'CSSG', author: 'Carlo Reyes',   role: 'President', date: 'Oct 22, 2026', audience: 'CSSG Members', title: 'Tech Summit 2026 — Final Delegate Call', body: 'Registration for Tech Summit 2026 will close in 3 days. All attendees must present their digital QR pass at the entrance scanner.' },
  { id: 'ann-3', club: 'RCY',  author: 'Ana Cruz',      role: 'President', date: 'Oct 18, 2026', audience: 'All Students', title: 'Blood Donation Drive — Nov 10', body: 'Red Cross Youth is hosting our semi-annual Blood Donation Drive on November 10, 9 AM – 3 PM at the Gymnasium. Pre-register online or visit the lobby booth.' },
  { id: 'ann-4', club: 'IEEE', author: 'Maria Santos',  role: 'VP External', date: 'Oct 15, 2026', audience: 'IEEE Members', title: 'PCB Design Workshop Registration', body: 'Seats for our hands-on hardware workshop in MPH Room C are filling up rapidly. Certificate and workshop kits will be provided upon door check-in.' },
  { id: 'ann-5', club: 'JPIA', author: 'Lea Tan',       role: 'President', date: 'Oct 12, 2026', audience: 'JPIA Members', title: 'CPA Board Exam Review Series', body: 'Our review sessions commence next week in the AVR Room. Schedule packets have been dispatched via institutional mail.' }
];

const DEFAULT_BOOKINGS = [
  { id: 'bk-1', ref: '#BK-042', club: 'CSSG',           requester: 'Carlo Reyes',   venue: 'Auditorium A',    date: 'Nov 3, 2026',  time: '1:00–5:00 PM', purpose: 'Tech Summit Keynote',   status: 'Pending',  equipment: '2 Wireless Mics, Main Screen' },
  { id: 'bk-2', ref: '#BK-041', club: 'IEEE',           requester: 'Maria Santos',  venue: 'MPH Room C',      date: 'Nov 5, 2026',  time: '3:00–6:00 PM', purpose: 'Workshop: PCB Design',   status: 'Pending',  equipment: 'Soldering Kits, Projector' },
  { id: 'bk-3', ref: '#BK-040', club: 'Red Cross Youth', requester: 'Ana Cruz',      venue: 'Projector Set',   date: 'Nov 8, 2026',  time: '8:00 AM–12 PM',purpose: 'First Aid Seminar',     status: 'Pending',  equipment: 'Projector Set (2x)' },
  { id: 'bk-4', ref: '#BK-039', club: 'JPIA',           requester: 'Lea Tan',       venue: 'AVR Room',        date: 'Nov 22, 2026', time: '1:00–4:00 PM', purpose: 'CPA Review Webinar',    status: 'Approved', equipment: 'Audio System' },
  { id: 'bk-5', ref: '#BK-038', club: 'Robotics Club',  requester: 'Jun Park',      venue: 'Computer Lab 3',  date: 'Nov 15, 2026', time: '9:00 AM–5:00 PM',purpose: 'Robot Sprint',        status: 'Approved', equipment: '30 Power Outlets' },
  { id: 'bk-6', ref: '#BK-037', club: 'JPIA',           requester: 'Lea Tan',       venue: 'Audio Equipment', date: 'Oct 30, 2026', time: '2:00–4:00 PM', purpose: 'Webinar Audio',         status: 'Denied',   equipment: 'Lapel Mic' }
];

const DEFAULT_EVENTS = [
  { id: 1, name: 'Tech Summit 2026',               club: 'CSSG',           date: 'Nov 3, 2026',  day: 3, month: 'Nov', time: '1:00 PM – 6:00 PM', venue: 'Auditorium A',    capacity: 200, registered: 200, status: 'Upcoming', badgeClass: 'badge-blue' },
  { id: 2, name: 'PCB Design & IoT Workshop',      club: 'IEEE',           date: 'Nov 5, 2026',  day: 5, month: 'Nov', time: '3:00 PM – 6:00 PM', venue: 'MPH Room C',      capacity: 80,  registered: 45,  status: 'Upcoming', badgeClass: 'badge-green' },
  { id: 3, name: 'First Aid & Emergency Seminar',  club: 'Red Cross Youth', date: 'Nov 8, 2026',  day: 8, month: 'Nov', time: '8:00 AM – 12:00 PM',venue: 'AVR Room',        capacity: 100, registered: 95,  status: 'Upcoming', badgeClass: 'badge-red' },
  { id: 4, name: 'CPA Review Series — Session 1',  club: 'JPIA',           date: 'Nov 5, 2026',  day: 5, month: 'Nov', time: '2:00 PM – 5:00 PM', venue: 'AVR Room',        capacity: 120, registered: 88,  status: 'Upcoming', badgeClass: 'badge-amber' },
  { id: 5, name: 'Annual Campus General Assembly', club: 'USC',            date: 'Nov 17, 2026', day: 17, month: 'Nov',time: '9:00 AM – 12:00 PM',venue: 'Auditorium A',    capacity: 350, registered: 180, status: 'Upcoming', badgeClass: 'badge-purple' }
];

const DEFAULT_NOTIFICATIONS = [
  { id: 'notif-1', title: 'New Facility Request', text: 'CSSG requested Auditorium A for Tech Summit 2026.', time: '12m ago', unread: true, type: 'booking', icon: 'calendar-check' },
  { id: 'notif-2', title: 'Announcement Published', text: 'Ron Dela Cruz posted Q4 General Assembly schedule.', time: '1h ago', unread: true, type: 'announcement', icon: 'megaphone' },
  { id: 'notif-3', title: 'QR Pass Confirmed', text: 'Your digital pass for Tech Summit 2026 is ready.', time: '3h ago', unread: true, type: 'event', icon: 'qr-code' },
  { id: 'notif-4', title: 'Booking Approved', text: 'JPIA reservation for AVR Room has been confirmed by Faculty.', time: '1d ago', unread: false, type: 'booking', icon: 'check-circle' }
];

/* ── App State Manager ───────────────────────────────────────── */
const AppState = {
  // --- CLUBS ---
  getClubs() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLUBS);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    localStorage.setItem(STORAGE_KEYS.CLUBS, JSON.stringify(DEFAULT_CLUBS));
    return DEFAULT_CLUBS;
  },

  addClub(clubData) {
    const clubs = this.getClubs();
    const newId = clubs.length > 0 ? Math.max(...clubs.map(c => c.id || 0)) + 1 : 1;
    const newClub = {
      id: newId,
      abbr: clubData.abbr || clubData.name.split(' ').map(w => w[0]).join('').substring(0, 4).toUpperCase(),
      name: clubData.name,
      category: clubData.category || 'Academic',
      president: clubData.president || 'Student Officer',
      members: 1,
      events: 0,
      status: 'Active',
      desc: clubData.desc || 'Newly established campus student organization.'
    };
    clubs.unshift(newClub);
    localStorage.setItem(STORAGE_KEYS.CLUBS, JSON.stringify(clubs));
    this.addNotification({
      title: 'New Organization Added',
      text: `${newClub.name} (${newClub.abbr}) was registered into the Directory.`,
      type: 'club',
      icon: 'users'
    });
    return newClub;
  },

  // --- ANNOUNCEMENTS ---
  getAnnouncements() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(DEFAULT_ANNOUNCEMENTS));
    return DEFAULT_ANNOUNCEMENTS;
  },

  addAnnouncement(data) {
    const user = window.Auth ? window.Auth.getCurrentUser() : { name: 'Juan Miguel R.', roleTitle: 'Admin', organization: 'Campus Admin' };
    const list = this.getAnnouncements();
    const newAnn = {
      id: 'ann-' + Date.now(),
      club: data.club || (user.organization && user.organization !== 'General Student Body' ? user.organization : 'Campus Admin'),
      author: user.name,
      role: user.roleBadge || 'Officer',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      audience: data.audience || 'All Students',
      title: data.title,
      body: data.body
    };
    list.unshift(newAnn);
    localStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(list));
    this.addNotification({
      title: 'New Announcement: ' + newAnn.title,
      text: `${newAnn.author} posted: "${newAnn.title}" for ${newAnn.audience}.`,
      type: 'announcement',
      icon: 'megaphone'
    });
    return newAnn;
  },

  // --- BOOKINGS ---
  getBookings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(DEFAULT_BOOKINGS));
    return DEFAULT_BOOKINGS;
  },

  addBooking(data) {
    const bookings = this.getBookings();
    const user = window.Auth ? window.Auth.getCurrentUser() : { name: 'Student Requester' };
    const nextRefNumber = 43 + (bookings.length - DEFAULT_BOOKINGS.length);
    const newBooking = {
      id: 'bk-' + Date.now(),
      ref: '#BK-0' + nextRefNumber,
      club: data.club || 'CSSG',
      requester: data.requester || user.name,
      venue: data.venue || 'Auditorium A',
      date: data.date ? new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Nov 12, 2026',
      time: data.startTime && data.endTime ? `${data.startTime}–${data.endTime}` : '1:00–5:00 PM',
      purpose: data.purpose || 'Organization Activity',
      status: 'Pending',
      equipment: data.equipment || 'Standard Venue Setup'
    };
    bookings.unshift(newBooking);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    this.addNotification({
      title: 'Booking Request Submitted',
      text: `${newBooking.club} requested ${newBooking.venue} for ${newBooking.date} (${newBooking.ref}).`,
      type: 'booking',
      icon: 'calendar-check'
    });
    return newBooking;
  },

  updateBookingStatus(idOrRef, newStatus) {
    const bookings = this.getBookings();
    const target = bookings.find(b => b.id === idOrRef || b.ref === idOrRef);
    if (target) {
      target.status = newStatus;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      this.addNotification({
        title: `Booking ${newStatus}`,
        text: `Reservation ${target.ref} for ${target.venue} (${target.club}) was ${newStatus.toLowerCase()}.`,
        type: 'booking',
        icon: newStatus === 'Approved' ? 'check-circle' : 'x-circle'
      });
      return target;
    }
    return null;
  },

  // --- EVENTS ---
  getEvents() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EVENTS);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(DEFAULT_EVENTS));
    return DEFAULT_EVENTS;
  },

  addEvent(eventData) {
    const events = this.getEvents();
    const newId = events.length > 0 ? Math.max(...events.map(e => e.id || 0)) + 1 : 1;
    const dateObj = eventData.date ? new Date(eventData.date) : new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const newEvt = {
      id: newId,
      name: eventData.name,
      club: eventData.club || 'Campus Organization',
      date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      day: dateObj.getDate() || 1,
      month: months[dateObj.getMonth()] || 'Nov',
      time: eventData.time || '1:00 PM – 5:00 PM',
      venue: eventData.venue || 'Auditorium A',
      capacity: parseInt(eventData.capacity, 10) || 150,
      registered: 0,
      status: 'Upcoming',
      badgeClass: 'badge-blue'
    };
    events.unshift(newEvt);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.addNotification({
      title: 'New Campus Event',
      text: `${newEvt.name} scheduled for ${newEvt.date} at ${newEvt.venue}.`,
      type: 'event',
      icon: 'ticket'
    });
    return newEvt;
  },

  // --- NOTIFICATIONS ---
  getNotifications() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) return JSON.parse(stored);
    } catch (e) { console.error(e); }
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(DEFAULT_NOTIFICATIONS));
    return DEFAULT_NOTIFICATIONS;
  },

  addNotification(notif) {
    const list = this.getNotifications();
    const item = {
      id: 'notif-' + Date.now(),
      title: notif.title || 'System Notice',
      text: notif.text || '',
      time: 'Just now',
      unread: true,
      type: notif.type || 'system',
      icon: notif.icon || 'bell'
    };
    list.unshift(item);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    this.updateNotificationBadge();
    return item;
  },

  markAllNotificationsRead() {
    const list = this.getNotifications();
    list.forEach(n => n.unread = false);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    this.updateNotificationBadge();
  },

  updateNotificationBadge() {
    const list = this.getNotifications();
    const unreadCount = list.filter(n => n.unread).length;
    document.querySelectorAll('#btn-notifications').forEach(btn => {
      let badge = btn.querySelector('.notif-badge');
      if (unreadCount > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'notif-badge';
          btn.style.position = 'relative';
          btn.appendChild(badge);
        }
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      } else if (badge) {
        badge.remove();
      }
    });
  },

  // --- TOAST NOTIFICATIONS ---
  showToast(title, message, type = 'success') {
    let container = document.getElementById('global-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="toast-icon"></i>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button type="button" class="toast-close" aria-label="Close">&times;</button>
    `;

    container.appendChild(toast);
    if (window.lucide && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-fadeout');
      setTimeout(() => toast.remove(), 200);
    };
    closeBtn.addEventListener('click', dismiss);
    setTimeout(dismiss, 4000);
  },

  // --- SPOTLIGHT SEARCH & NOTIFICATION DROPDOWN MOUNTING ---
  initGlobalComponents() {
    this.mountSearchModal();
    this.mountNotificationsDropdown();
    this.bindGlobalHandlers();
    this.updateNotificationBadge();
  },

  mountSearchModal() {
    if (document.getElementById('spotlight-search-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'spotlight-search-modal';
    modal.className = 'spotlight-overlay';
    modal.innerHTML = `
      <div class="spotlight-card">
        <div class="spotlight-header">
          <i data-lucide="search" class="spotlight-search-icon"></i>
          <input type="text" id="spotlight-input" placeholder="Search clubs, bookings, events, or announcements… (Esc to exit)" autocomplete="off" />
          <span class="spotlight-badge">ESC</span>
        </div>
        <div class="spotlight-results" id="spotlight-results">
          <div class="spotlight-empty">Type keywords to search across all campus subsystems…</div>
        </div>
        <div class="spotlight-footer">
          <span>Tip: Press <strong>Ctrl + K</strong> or <strong>⌘ + K</strong> to search anytime</span>
          <span>Quick actions &amp; instant navigation</span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Search logic
    const input = modal.querySelector('#spotlight-input');
    const resultsContainer = modal.querySelector('#spotlight-results');

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        resultsContainer.innerHTML = `<div class="spotlight-empty">Type keywords to search across all campus subsystems…</div>`;
        return;
      }

      const clubs = this.getClubs().filter(c => c.name.toLowerCase().includes(q) || c.abbr.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
      const events = this.getEvents().filter(e => e.name.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || e.club.toLowerCase().includes(q));
      const bookings = this.getBookings().filter(b => b.venue.toLowerCase().includes(q) || b.purpose.toLowerCase().includes(q) || b.club.toLowerCase().includes(q) || b.ref.toLowerCase().includes(q));
      const announcements = this.getAnnouncements().filter(a => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.club.toLowerCase().includes(q));

      const totalFound = clubs.length + events.length + bookings.length + announcements.length;
      if (totalFound === 0) {
        resultsContainer.innerHTML = `
          <div class="spotlight-empty">
            <i data-lucide="search-x" style="width:24px;height:24px;margin-bottom:6px;opacity:0.5;"></i>
            <div>No matching results for "<strong>${input.value}</strong>"</div>
          </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
      }

      const basePath = window.location.pathname.includes('/pages/') ? '' : 'pages/';

      let html = '';
      if (clubs.length > 0) {
        html += `<div class="spotlight-group-title">Clubs & Organizations (${clubs.length})</div>`;
        clubs.slice(0, 3).forEach(c => {
          html += `
            <a href="${basePath}club-profile.html?id=${c.id}" class="spotlight-item">
              <div class="spotlight-icon-box" style="background:#eff6ff;color:#1d4ed8;"><i data-lucide="users"></i></div>
              <div class="spotlight-info">
                <div class="spotlight-title">${c.name} <span class="badge badge-neutral" style="font-size:10px;">${c.abbr}</span></div>
                <div class="spotlight-meta">${c.category} · ${c.members} members · President: ${c.president}</div>
              </div>
              <i data-lucide="arrow-right" class="spotlight-arrow"></i>
            </a>
          `;
        });
      }

      if (events.length > 0) {
        html += `<div class="spotlight-group-title">Campus Events (${events.length})</div>`;
        events.slice(0, 3).forEach(e => {
          html += `
            <a href="${basePath}events.html" class="spotlight-item">
              <div class="spotlight-icon-box" style="background:#f0fdf4;color:#166534;"><i data-lucide="ticket"></i></div>
              <div class="spotlight-info">
                <div class="spotlight-title">${e.name}</div>
                <div class="spotlight-meta">${e.date} · ${e.venue} · Host: ${e.club}</div>
              </div>
              <i data-lucide="arrow-right" class="spotlight-arrow"></i>
            </a>
          `;
        });
      }

      if (bookings.length > 0) {
        html += `<div class="spotlight-group-title">Facility Bookings (${bookings.length})</div>`;
        bookings.slice(0, 3).forEach(b => {
          html += `
            <a href="${basePath}booking.html" class="spotlight-item">
              <div class="spotlight-icon-box" style="background:#fffbeb;color:#92400e;"><i data-lucide="calendar-check"></i></div>
              <div class="spotlight-info">
                <div class="spotlight-title">${b.venue} — ${b.purpose}</div>
                <div class="spotlight-meta">${b.ref} · ${b.club} · ${b.date} · <span class="badge ${b.status === 'Approved' ? 'badge-green' : b.status === 'Pending' ? 'badge-amber' : 'badge-red'}" style="font-size:10px;">${b.status}</span></div>
              </div>
              <i data-lucide="arrow-right" class="spotlight-arrow"></i>
            </a>
          `;
        });
      }

      if (announcements.length > 0) {
        html += `<div class="spotlight-group-title">Announcements (${announcements.length})</div>`;
        announcements.slice(0, 2).forEach(a => {
          html += `
            <a href="${basePath}directory.html" class="spotlight-item">
              <div class="spotlight-icon-box" style="background:#f3e8ff;color:#7e22ce;"><i data-lucide="megaphone"></i></div>
              <div class="spotlight-info">
                <div class="spotlight-title">${a.title}</div>
                <div class="spotlight-meta">${a.club} · ${a.date} · For: ${a.audience}</div>
              </div>
              <i data-lucide="arrow-right" class="spotlight-arrow"></i>
            </a>
          `;
        });
      }

      resultsContainer.innerHTML = html;
      if (window.lucide) lucide.createIcons();
    });

    // Close on overlay click or Escape
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeSearchModal();
    });
  },

  openSearchModal() {
    const modal = document.getElementById('spotlight-search-modal');
    if (modal) {
      modal.classList.add('open');
      const input = modal.querySelector('#spotlight-input');
      if (input) {
        input.value = '';
        input.focus();
        modal.querySelector('#spotlight-results').innerHTML = `<div class="spotlight-empty">Type keywords to search across all campus subsystems…</div>`;
      }
    }
  },

  closeSearchModal() {
    const modal = document.getElementById('spotlight-search-modal');
    if (modal) modal.classList.remove('open');
  },

  mountNotificationsDropdown() {
    if (document.getElementById('global-notifications-dropdown')) return;

    const dropdown = document.createElement('div');
    dropdown.id = 'global-notifications-dropdown';
    dropdown.className = 'notif-dropdown';
    dropdown.innerHTML = `
      <div class="notif-header">
        <div class="notif-header-title">Notifications</div>
        <button type="button" id="btn-mark-all-read" class="notif-mark-btn">Mark all read</button>
      </div>
      <div class="notif-list" id="notif-items-list"></div>
      <div class="notif-footer">
        <span style="font-size:11px;color:var(--color-text-muted);">Real-time campus alert sync</span>
      </div>
    `;
    document.body.appendChild(dropdown);

    dropdown.querySelector('#btn-mark-all-read').addEventListener('click', () => {
      this.markAllNotificationsRead();
      this.renderNotificationList();
      this.showToast('Notifications Updated', 'All notifications marked as read.');
    });
  },

  renderNotificationList() {
    const list = this.getNotifications();
    const container = document.getElementById('notif-items-list');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<div style="padding:var(--space-6);text-align:center;color:var(--color-text-muted);font-size:12px;">No notifications yet.</div>`;
      return;
    }

    container.innerHTML = list.map(n => `
      <div class="notif-item ${n.unread ? 'unread' : ''}">
        <div class="notif-icon-circle ${n.unread ? 'unread-icon' : ''}">
          <i data-lucide="${n.icon || 'bell'}" style="width:14px;height:14px;"></i>
        </div>
        <div class="notif-text-area">
          <div class="notif-item-title">${n.title}</div>
          <div class="notif-item-desc">${n.text}</div>
          <div class="notif-item-time">${n.time}</div>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  },

  toggleNotificationsDropdown(triggerBtn) {
    const dropdown = document.getElementById('global-notifications-dropdown');
    if (!dropdown) return;

    const isOpen = dropdown.classList.contains('show');
    if (isOpen) {
      dropdown.classList.remove('show');
    } else {
      this.renderNotificationList();
      const rect = triggerBtn.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + 8}px`;
      dropdown.style.right = `${window.innerWidth - rect.right}px`;
      dropdown.classList.add('show');
    }
  },

  bindGlobalHandlers() {
    // 1. Search buttons
    document.querySelectorAll('#btn-search, [data-action="open-search"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openSearchModal();
      });
    });

    // 2. Notification buttons
    document.querySelectorAll('#btn-notifications').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleNotificationsDropdown(btn);
      });
    });

    // Close notifications on click outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('global-notifications-dropdown');
      if (dropdown && dropdown.classList.contains('show')) {
        const isNotifBtn = e.target.closest('#btn-notifications');
        if (!dropdown.contains(e.target) && !isNotifBtn) {
          dropdown.classList.remove('show');
        }
      }
    });

    // Keyboard Shortcuts (Ctrl+K / Cmd+K and Esc)
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.openSearchModal();
      }
      if (e.key === 'Escape') {
        this.closeSearchModal();
        const notifDropdown = document.getElementById('global-notifications-dropdown');
        if (notifDropdown) notifDropdown.classList.remove('show');
      }
    });
  }
};

window.AppState = AppState;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  AppState.initGlobalComponents();
});
