/**
 * directory.js — Membership & Directory Subsystem
 * Connects to AppState for working club management, filtering, and announcements.
 */

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
        <div class="club-logo">${(c.abbr || 'CO').substring(0,2)}</div>
        <div class="club-meta">
          <div class="club-name">${c.name}</div>
          <div class="club-type">${c.abbr}</div>
        </div>
        <span class="badge ${CATEGORY_BADGE[c.category] || 'badge-neutral'}" style="flex-shrink:0;">${c.category}</span>
      </div>
      <div class="club-desc">${c.desc}</div>
      <div class="club-stats">
        <div class="club-stat"><div class="club-stat-val">${c.members || 1}</div><div class="club-stat-lbl">Members</div></div>
        <div class="club-stat"><div class="club-stat-val">${c.events || 0}</div><div class="club-stat-lbl">Events</div></div>
        <div class="club-stat" style="margin-left:auto;">
          <span class="badge ${c.status === 'Active' ? 'badge-green' : 'badge-neutral'}">${c.status}</span>
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
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);">No organizations found.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:var(--space-3);">
          <div class="club-logo" style="width:32px;height:32px;font-size:12px;">${(c.abbr || 'CO').substring(0,2)}</div>
          <div>
            <div style="font-weight:500;">${c.name}</div>
            <div style="font-size:11px;color:var(--color-text-muted);">${c.abbr}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${CATEGORY_BADGE[c.category] || 'badge-neutral'}">${c.category}</span></td>
      <td>${c.president}</td>
      <td>${c.members || 1}</td>
      <td><span class="badge ${c.status === 'Active' ? 'badge-green' : 'badge-neutral'}">${c.status}</span></td>
      <td>
        <div style="display:flex;gap:4px;">
          <a href="club-profile.html?id=${c.id}" class="btn btn-sm btn-secondary"><i data-lucide="eye"></i> View</a>
          <button type="button" class="icon-btn btn-delete-club" data-id="${c.id}" title="Remove club"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
  if (window.lucide) lucide.createIcons();

  // Attach delete handlers
  tbody.querySelectorAll('.btn-delete-club').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const clubId = parseInt(btn.getAttribute('data-id'), 10);
      if (confirm('Are you sure you want to remove this organization from the directory?')) {
        const clubs = AppState.getClubs().filter(c => c.id !== clubId);
        localStorage.setItem(STORAGE_KEYS.CLUBS, JSON.stringify(clubs));
        filterClubs();
        AppState.showToast('Organization Removed', 'The organization has been removed from the directory.');
      }
    });
  });
}

/* ── Render Announcements ────────────────────────────────────── */
function renderAnnouncements(data) {
  const container = document.getElementById('announcements-list');
  if (!container) return;
  if (!data || data.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">No announcements yet</div><div class="empty-state-text">Club officers and admins can post updates above.</div></div>`;
    return;
  }
  container.innerHTML = data.map(a => `
    <div class="card" style="margin-bottom:var(--space-4);">
      <div class="card-body" style="padding:var(--space-5);">
        <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
          <div class="avatar" style="width:32px;height:32px;font-size:11px;">${(a.author || 'JM').split(' ').map(w=>w[0]).join('').substring(0,2)}</div>
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
  const allClubs = AppState.getClubs();
  const filtered = allClubs.filter(c =>
    (!q   || c.name.toLowerCase().includes(q) || c.abbr.toLowerCase().includes(q) || (c.president && c.president.toLowerCase().includes(q))) &&
    (!cat || c.category === cat)
  );
  renderGrid(filtered);
  renderTable(filtered);

  // Update total badge
  const countEl = document.getElementById('stat-total-clubs');
  if (countEl) countEl.textContent = allClubs.length;
}

/* ── Form Modal Handlers ─────────────────────────────────────── */
function setupDirectoryForms() {
  // 1. Add Club Form
  const addClubBtn = document.getElementById('btn-save-club');
  if (addClubBtn) {
    addClubBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('input-club-name');
      const catSelect = document.getElementById('select-club-cat');
      const presInput = document.getElementById('input-club-pres');
      const descInput = document.getElementById('input-club-desc');

      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        alert('Please enter a club or organization name.');
        return;
      }

      const newClub = AppState.addClub({
        name,
        category: catSelect ? catSelect.value : 'Academic',
        president: presInput ? presInput.value.trim() || 'Student Lead' : 'Student Lead',
        desc: descInput ? descInput.value.trim() : ''
      });

      // Clear & close
      if (nameInput) nameInput.value = '';
      if (presInput) presInput.value = '';
      if (descInput) descInput.value = '';
      if (typeof closeModal === 'function') closeModal('modal-add-club');

      filterClubs();
      AppState.showToast('Club Created', `Successfully added ${newClub.name} to the directory!`);
    });
  }

  // 2. Post Announcement Form
  const postAnnBtn = document.getElementById('btn-post-announcement');
  if (postAnnBtn) {
    postAnnBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const audSelect = document.getElementById('select-ann-aud');
      const titleInput = document.getElementById('input-ann-title');
      const bodyInput = document.getElementById('input-ann-body');

      const title = titleInput ? titleInput.value.trim() : '';
      const body = bodyInput ? bodyInput.value.trim() : '';

      if (!title || !body) {
        alert('Please fill out both the announcement subject and message.');
        return;
      }

      const user = window.Auth ? window.Auth.getCurrentUser() : null;
      const newAnn = AppState.addAnnouncement({
        audience: audSelect ? audSelect.value : 'All Students',
        title,
        body,
        club: user && user.organization ? user.organization : 'Campus Org'
      });

      // Clear & close
      if (titleInput) titleInput.value = '';
      if (bodyInput) bodyInput.value = '';
      if (typeof closeModal === 'function') closeModal('modal-announce');

      renderAnnouncements(AppState.getAnnouncements());
      AppState.showToast('Announcement Published', `"${newAnn.title}" is now visible to ${newAnn.audience}.`);
    });
  }

  // Search input live listener
  const searchInput = document.getElementById('search-clubs');
  if (searchInput) {
    searchInput.addEventListener('input', filterClubs);
  }
  const filterCat = document.getElementById('filter-type');
  if (filterCat) {
    filterCat.addEventListener('change', filterClubs);
  }
}

/* ── Init ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  filterClubs();
  renderAnnouncements(AppState.getAnnouncements());
  setupDirectoryForms();
});
