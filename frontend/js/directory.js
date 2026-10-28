/**
 * directory.js — Membership & Directory Subsystem
 * Fetches and displays club management, filtering, and announcements from Flask Backend API.
 */

const CATEGORY_BADGE = {
  Technical: 'badge-blue',
  Service:   'badge-green',
  Academic:  'badge-amber',
  Cultural:  'badge-neutral',
  Sports:    'badge-red',
};

// Global variable to keep track of fetched clubs
let globalClubs = [];

/* ── Fetch Clubs from Flask Backend ──────────────────────────── */
async function loadClubsFromBackend() {
  try {
      const [response, countsRes] = await Promise.all([
      fetch('http://localhost:5000/api/clubs'),
      fetch('http://localhost:5000/api/member-counts')
    ]);
    if (!response.ok) {
      throw new Error('Failed to fetch clubs from backend');
    }
    globalClubs = await response.json();

    // Attach the real membership count to each club (0 if it has no members)
    const counts = countsRes.ok ? await countsRes.json() : {};
    globalClubs.forEach(c => { c.member_count = counts[c.id] ?? 0; });
    
    // ── Update Grid View badge count dynamically ────────────────
    updateGridCountBadge(globalClubs.length);

    filterClubs(); // Render grid/table once data is loaded
  } catch (error) {
    console.error("Error loading clubs:", error);
    // Fallback or empty state if backend is down
    renderGrid([]);
    renderTable([]);
    updateGridCountBadge(0);
  }
}

/* ── Helper to safely update the Grid View count badge ──────── */
function updateGridCountBadge(count) {
  document.querySelectorAll('.tab, button, a').forEach(tab => {
    if (tab.textContent.includes('Grid View')) {
      const badge = tab.querySelector('.badge') || tab.querySelector('span');
      if (badge) {
        badge.textContent = count;
      }
    }
  });
}

/* ── Render Club Grid ────────────────────────────────────────── */
function renderGrid(data) {
  const container = document.getElementById('club-grid');
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <i data-lucide="search-x"></i>
        <div class="empty-state-title">No clubs found</div>
        <div class="empty-state-text">Try a different search term or category.</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }
  container.innerHTML = data.map(c => `
    <a href="club-profile.html?id=${c.id}" class="club-card" style="text-decoration:none;">
      <div class="club-card-head">
        <div class="club-logo">${(c.name || 'CO').substring(0,2).toUpperCase()}</div>
        <div class="club-meta">
          <div class="club-name">${c.name}</div>
          <div class="club-type">${c.contact_email || 'Organization'}</div>
        </div>
        <span class="badge badge-blue" style="flex-shrink:0;">Active</span>
      </div>
      <div class="club-desc">${c.description || 'No description provided.'}</div>
      <div class="club-stats">
        <div class="club-stat"><div class="club-stat-val">${c.member_count ?? 0}</div><div class="club-stat-lbl">Members</div></div>
        <div class="club-stat"><div class="club-stat-val">0</div><div class="club-stat-lbl">Events</div></div>
        <div class="club-stat" style="margin-left:auto;">
          <span class="badge badge-green">Active</span>
        </div>
      </div>
    </a>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

/* ── Render Club Table ───────────────────────────────────────── */
function renderTable(data) {
  const tbody = document.getElementById('club-table-body');
  if (!tbody) return;
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);">No organizations found.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr onclick="window.location.href='club-profile.html?id=${c.id}'" style="cursor: pointer;" title="Click to view club profile">
      <td>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div class="club-logo" style="width:32px;height:32px;font-size:12px;">${(c.name || 'CO').substring(0,2).toUpperCase()}</div>
          <div>
            <div style="font-weight:500;">${c.name}</div>
            <div style="font-size:11px;color:var(--color-text-muted);">${c.contact_email}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-blue">Active</span></td>
      <td>Student Lead</td>
      <td>${c.member_count ?? 0}</td>
      <td><span class="badge badge-green">Active</span></td>
    </tr>
  `).join('');
  if (window.lucide) lucide.createIcons();
}

/* ── Filter Logic ────────────────────────────────────────────── */
function filterClubs() {
  const q   = (document.getElementById('search-clubs')?.value || '').toLowerCase();
  const cat = (document.getElementById('filter-type')?.value || '');
  
  const filtered = globalClubs.filter(c =>
    (!q || c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)))
  );
  
  renderGrid(filtered);
  renderTable(filtered);

  // Update total badge
  const countEl = document.getElementById('stat-total-clubs');
  if (countEl) countEl.textContent = globalClubs.length;
}

/* ── Handle Add Club Form Submission ─────────────────────────── */
/* ── Auth Header Helper ──────────────────────────────────────── */
function withAuth(extra = {}) {
  let token = null;
  try { token = localStorage.getItem('token'); } catch (e) { /* storage unavailable */ }
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/* ── Handle Add Club Modal Submission ────────────────────────── */
function setupAddClubForm() {
  const saveBtn = document.getElementById('btn-save-club');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const name = (document.getElementById('input-club-name')?.value || '').trim();
    const category = document.getElementById('select-club-cat')?.value || 'Technical';
    const description = (document.getElementById('input-club-desc')?.value || '').trim();
    const acronym = name.substring(0, 4).toUpperCase();
    
    if (!name) {
      alert('Club name is required.');
      return;
    }

    const newClub = {
      name,
      acronym,
      category,
      description,
      contact_email: `${acronym.toLowerCase()}@qcu.edu.ph`
    };

    try {
      const response = await fetch('http://localhost:5000/api/clubs', {
        method: 'POST',
        headers: withAuth({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(newClub)
      });

      if (response.ok) {
        // Close modal and reset fields
        const modal = document.getElementById('modal-add-club');
        if (modal) modal.classList.remove('open');
        
        const nameInput = document.getElementById('input-club-name');
        if (nameInput) nameInput.value = '';
        const descInput = document.getElementById('input-club-desc');
        if (descInput) descInput.value = '';

        loadClubsFromBackend(); // Instantly refresh grid, table, and counts!
      } else {
        const data = await response.json().catch(() => ({}));
        alert(data.message || 'Failed to add club.');
      }
    } catch (error) {
      console.error('Error adding club:', error);
      alert('Could not connect to backend server.');
    }
  });
}

/* ── Form Modal Handlers ─────────────────────────────────────── */
function setupDirectoryForms() {
  // Search input live listener
  const searchInput = document.getElementById('search-clubs');
  if (searchInput) {
    searchInput.addEventListener('input', filterClubs);
  }
  const filterCat = document.getElementById('filter-type');
  if (filterCat) {
    filterCat.addEventListener('change', filterClubs);
  }
  setupAddClubForm();
}

/* ── Init ────────────────────────────────______________________ */
document.addEventListener('DOMContentLoaded', () => {
  loadClubsFromBackend();
  setupDirectoryForms();
});