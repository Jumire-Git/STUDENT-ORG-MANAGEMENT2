/**
 * directory.js — Membership & Directory Subsystem
 * Handles club grid/list rendering, filtering, and announcements.
 */

/* ── Mock Data (replace with DirectoryAPI calls when backend is ready) ── */
const CLUBS = [
  { id:1, abbr:'CSSG', name:'Computer Science Society of the Philippines', category:'Technical',  president:'Carlo Reyes',   members:52, events:6, status:'Active',   desc:'Premier org for CS/IT students. Hosts workshops, hackathons, and tech talks.' },
  { id:2, abbr:'IEEE', name:'IEEE Student Branch',                          category:'Technical',  president:'Maria Santos',  members:38, events:4, status:'Active',   desc:'International student chapter for future engineers and technology leaders.' },
  { id:3, abbr:'RCY',  name:'Red Cross Youth',                              category:'Service',    president:'Ana Cruz',      members:90, events:8, status:'Active',   desc:'Promoting humanitarian values and community service across the campus.' },
  { id:4, abbr:'JPIA', name:'Junior Philippine Institute of Accountants',   category:'Academic',   president:'Lea Tan',       members:65, events:5, status:'Active',   desc:'Prepares future CPAs through review sessions, seminars, and industry talks.' },
  { id:5, abbr:'USC',  name:'University Supreme Council',                   category:'Academic',   president:'Ron Dela Cruz', members:24, events:12,status:'Active',   desc:'The highest governing student body on campus representing all students.' },
  { id:6, abbr:'ROBO', name:'Robotics Club',                                category:'Technical',  president:'Jun Park',      members:30, events:3, status:'Active',   desc:'Building, programming, and competing with robots at inter-school competitions.' },
  { id:7, abbr:'DMSF', name:'Dance and Music Society',                      category:'Cultural',   president:'Lia Flores',    members:45, events:7, status:'Active',   desc:'Creative outlet for student artists in dance, music, and performing arts.' },
  { id:8, abbr:'SOC',  name:'Sociology Circle',                             category:'Academic',   president:'Mark Bautista', members:20, events:2, status:'Inactive',  desc:'Discussion group exploring social issues, culture, and community dynamics.' },
];

const ANNOUNCEMENTS = [
  { club:'USC',  author:'Ron Dela Cruz', role:'President', date:'Oct 24, 2026', audience:'All Students', title:'General Assembly — Q4', body:'The Q4 General Assembly will be held on November 17 at the Auditorium. All students are expected to attend. Attendance will be checked via QR pass.' },
  { club:'CSSG', author:'Carlo Reyes',   role:'President', date:'Oct 22, 2026', audience:'CSSG Members', title:'Tech Summit 2026 — Final Call', body:'Last reminder: Tech Summit 2026 is on November 3. All committee heads must submit final rundowns by October 30. QR passes will be emailed.' },
  { club:'RCY',  author:'Ana Cruz',      role:'President', date:'Oct 18, 2026', audience:'All Students', title:'Blood Donation Drive — Nov 10', body:'Red Cross Youth is hosting a Blood Donation Drive on November 10, 9 AM – 3 PM at the Gymnasium. Sign up at the RCY table in the lobby.' },
  { club:'JPIA', author:'Lea Tan',       role:'President', date:'Oct 15, 2026', audience:'JPIA Members', title:'CPA Board Exam Review Series Begins', body:'Our intensive review series starts November 5. All 4th-year accountancy students are encouraged to join. Check your email for the schedule.' },
  { club:'IEEE', author:'Maria Santos',  role:'President', date:'Oct 10, 2026', audience:'IEEE Members', title:'PCB Workshop — Register Now', body:'IEEE is hosting a PCB Design Workshop on November 5. Limited slots (80 only). Register by scanning the QR code on our bulletin board.' },
];

/* ── Category Badge Color Map ────────────────────────────────── */
const CATEGORY_BADGE = {
  Technical: 'badge-blue',
  Service:   'badge-green',
  Academic:  'badge-amber',
  Cultural:  'badge-neutral',
  Sports:    'badge-red',
};

/* ── Render Club Grid ────────────────────────────────────────── */
function renderGrid(data) {
  const container = document.getElementById('club-grid');
  if (!container) return;
  if (data.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <i data-lucide="search-x"></i>
        <div class="empty-state-title">No clubs found</div>
        <div class="empty-state-text">Try a different search term or category.</div>
      </div>`;
    lucide.createIcons();
    return;
  }
  container.innerHTML = data.map(c => `
    <a href="club-profile.html?id=${c.id}" class="club-card" style="text-decoration:none;">
      <div class="club-card-head">
        <div class="club-logo">${c.abbr.substring(0,2)}</div>
        <div class="club-meta">
          <div class="club-name">${c.name}</div>
          <div class="club-type">${c.abbr}</div>
        </div>
        <span class="badge ${CATEGORY_BADGE[c.category] || 'badge-neutral'}" style="flex-shrink:0;">${c.category}</span>
      </div>
      <div class="club-desc">${c.desc}</div>
      <div class="club-stats">
        <div class="club-stat"><div class="club-stat-val">${c.members}</div><div class="club-stat-lbl">Members</div></div>
        <div class="club-stat"><div class="club-stat-val">${c.events}</div><div class="club-stat-lbl">Events</div></div>
        <div class="club-stat" style="margin-left:auto;">
          <span class="badge ${c.status === 'Active' ? 'badge-green' : 'badge-neutral'}">${c.status}</span>
        </div>
      </div>
    </a>
  `).join('');
  lucide.createIcons();
}

/* ── Render Club Table ───────────────────────────────────────── */
function renderTable(data) {
  const tbody = document.getElementById('club-table-body');
  if (!tbody) return;
  tbody.innerHTML = data.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div class="club-logo" style="width:32px;height:32px;font-size:12px;">${c.abbr.substring(0,2)}</div>
          <div>
            <div style="font-weight:500;">${c.name}</div>
            <div style="font-size:11px;color:var(--color-text-muted);">${c.abbr}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${CATEGORY_BADGE[c.category] || 'badge-neutral'}">${c.category}</span></td>
      <td>${c.president}</td>
      <td>${c.members}</td>
      <td><span class="badge ${c.status === 'Active' ? 'badge-green' : 'badge-neutral'}">${c.status}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <a href="club-profile.html?id=${c.id}" class="btn btn-sm btn-secondary"><i data-lucide="eye"></i> View</a>
          <button class="icon-btn"><i data-lucide="pencil"></i></button>
          <button class="icon-btn"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
  lucide.createIcons();
}

/* ── Render Announcements ────────────────────────────────────── */
function renderAnnouncements(data) {
  const container = document.getElementById('announcements-list');
  if (!container) return;
  container.innerHTML = data.map(a => `
    <div class="card">
      <div class="card-body" style="padding:var(--space-5);">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
          <div class="avatar" style="width:32px;height:32px;font-size:11px;">${a.author.split(' ').map(w=>w[0]).join('').substring(0,2)}</div>
          <div>
            <div style="font-size:13px;font-weight:600;">${a.author}</div>
            <div style="font-size:11px;color:var(--color-text-muted);">${a.role} · ${a.club} · ${a.date}</div>
          </div>
          <span class="badge badge-blue" style="margin-left:auto;">${a.audience}</span>
        </div>
        <div style="font-size:14px;font-weight:600;margin-bottom:var(--space-2);">${a.title}</div>
        <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;">${a.body}</p>
      </div>
    </div>
  `).join('');
}

/* ── Filter Logic ────────────────────────────────────────────── */
function filterClubs() {
  const q   = (document.getElementById('search-clubs')?.value || '').toLowerCase();
  const cat = (document.getElementById('filter-type')?.value || '');
  const filtered = CLUBS.filter(c =>
    (!q   || c.name.toLowerCase().includes(q) || c.abbr.toLowerCase().includes(q) || c.president.toLowerCase().includes(q)) &&
    (!cat || c.category === cat)
  );
  renderGrid(filtered);
  renderTable(filtered);
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderGrid(CLUBS);
  renderTable(CLUBS);
  renderAnnouncements(ANNOUNCEMENTS);
});
