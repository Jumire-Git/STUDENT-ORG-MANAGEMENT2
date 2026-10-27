/**
 * announcements.js — Handles fetching, rendering, and posting announcements
 * Time-ordered (newest first, like a social feed), supports Public vs Members-Only visibility.
 */

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

/* ── Fetch and Render Club Announcements ──────────────────────── */
async function loadClubAnnouncements(targetClubId) {
  const container = document.getElementById('tab-announcements');
  if (!container) return;

  try {
    const res = await fetch(`http://localhost:5000/api/clubs/${targetClubId}/announcements`, {
      headers: typeof withAuth === 'function' ? withAuth() : {}
    });
    
    if (!res.ok) throw new Error('Failed to fetch announcements');
    const announcements = await res.json();

    const badge = document.getElementById('ann-tab-count');
    if (badge) badge.textContent = announcements.length;

    renderAnnouncementFeed(announcements, container);
  } catch (err) {
    console.error("Error loading announcements:", err);
  }
}

/* ── Fetch and Render All Public Announcements (for Directory) ── */
async function loadAllPublicAnnouncements() {
  const container = document.getElementById('announcements-list');
  if (!container) return;

  try {
    const res = await fetch('http://localhost:5000/api/announcements', {
      headers: typeof withAuth === 'function' ? withAuth() : {}
    });
    if (!res.ok) throw new Error('Failed to fetch public announcements');
    const announcements = await res.json();

    const badge = document.getElementById('ann-tab-count');
    if (badge) badge.textContent = announcements.length;

    renderAnnouncementFeed(announcements, container);
  } catch (err) {
    console.error("Error loading public announcements:", err);
  }
}

/* ── Fetch and Render Public Announcements for Dashboard ──────── */
async function loadDashboardAnnouncements() {
  const container = document.getElementById('dashboard-announcements-list');
  if (!container) return;

  try {
    const res = await fetch('http://localhost:5000/api/announcements', {
      headers: typeof withAuth === 'function' ? withAuth() : {}
    });
    if (!res.ok) throw new Error('Failed to fetch dashboard announcements');
    const announcements = await res.json();

    if (announcements.length === 0) {
      container.innerHTML = `<div style="padding:var(--space-2 0);color:var(--color-text-muted);font-size:13px;">No public announcements at this time.</div>`;
      return;
    }

    container.innerHTML = announcements.slice(0, 3).map(ann => {
      const dateStr = ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent';
      return `
        <div style="padding:var(--space-3) 0;border-bottom:1px solid var(--color-border);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;">
            <span style="font-weight:600;font-size:13px;color:var(--color-text-primary);">${escapeHtml(ann.title)}</span>
            <span style="font-size:11px;color:var(--color-text-muted);">${escapeHtml(dateStr)}</span>
          </div>
          <div style="font-size:12px;color:var(--color-text-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${escapeHtml(ann.content)}
          </div>
          <div style="font-size:11px;color:var(--color-accent);margin-top:4px;font-weight:500;">
            ${escapeHtml(ann.club_name || 'Campus Wide')} · ${escapeHtml(ann.author_name || 'Admin')}
          </div>
        </div>
      `;
    }).join('');
    if (window.lucide) lucide.createIcons();
  } catch (err) {
    console.error("Error loading dashboard announcements:", err);
  }
}

/* ── Render Announcement Cards (Newest First / Feed Style) ─────── */
function renderAnnouncementFeed(announcements, container) {
  if (!announcements || announcements.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-8);color:var(--color-text-muted);">
        <i data-lucide="megaphone" style="width:32px;height:32px;margin-bottom:8px;opacity:0.5;"></i>
        <div style="font-weight:600;font-size:14px;">No announcements yet</div>
        <div style="font-size:12px;">Announcements posted by officers will appear here.</div>
      </div>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4);">
      ${announcements.map(ann => {
        const initials = (ann.author_name || 'Admin').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        const dateStr = ann.created_at ? new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
        const roleLabel = ann.author_club_role || ann.author_global_role || 'Officer';
        const isPublic = ann.visibility === 'public';
        const badgeClass = isPublic ? 'badge-neutral' : 'badge-blue';
        const badgeText = isPublic ? 'Public / All Students' : 'Members Only';
        const clubSub = ann.club_name ? ` · ${ann.club_name}` : '';

        return `
          <div class="announcement-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);">
            <div class="announcement-header" style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3);">
              <div class="officer-avatar" style="width:32px;height:32px;font-size:11px;background:var(--color-accent);color:#fff;border-radius:var(--radius-full);display:flex;align-items:center;justify-content:center;font-weight:600;">${escapeHtml(initials)}</div>
              <div>
                <div style="font-size:13px;font-weight:600;">${escapeHtml(ann.author_name || 'System Admin')}</div>
                <div style="font-size:11px;color:var(--color-text-muted);">${escapeHtml(roleLabel)}${escapeHtml(clubSub)} · ${escapeHtml(dateStr)}</div>
              </div>
              <span class="badge ${badgeClass}" style="margin-left:auto;">${escapeHtml(badgeText)}</span>
            </div>
            <div style="font-size:14px;font-weight:600;margin-bottom:var(--space-2);">${escapeHtml(ann.title)}</div>
            <p style="font-size:13px;color:var(--color-text-secondary);line-height:1.7;white-space:pre-line;">
              ${escapeHtml(ann.content)}
            </p>
          </div>
        `;
      }).join('')}
    </div>
  `;
  if (window.lucide) lucide.createIcons();
}

/* ── Setup Post Announcement Form Submission ───────────────────── */
function setupAnnouncementForm(targetClubId) {
  const postBtn = document.getElementById('btn-club-post-ann') || document.getElementById('btn-post-announcement');
  if (!postBtn) return;

  if (postBtn.dataset.listenerAttached) return;
  postBtn.dataset.listenerAttached = "true";

  postBtn.addEventListener('click', async () => {
    const audSelect = document.getElementById('select-club-ann-aud') || document.getElementById('select-ann-aud');
    const titleInput = document.getElementById('input-club-ann-title') || document.getElementById('input-ann-title');
    const bodyInput = document.getElementById('input-club-ann-body') || document.getElementById('input-ann-body');

    const title = titleInput?.value?.trim() || '';
    const content = bodyInput?.value?.trim() || '';
    const audValue = audSelect?.value || '';

    let visibility = 'members_only';
    if (audValue.includes('All Students') || audValue.includes('Public') || audValue.includes('Campus')) {
      visibility = 'public';
    }

    if (!title || !content) {
      alert('Please fill in both the subject and message fields.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/clubs/${targetClubId}/announcements`, {
        method: 'POST',
        headers: typeof withAuth === 'function' ? withAuth({ 'Content-Type': 'application/json' }) : { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, visibility })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        if (titleInput) titleInput.value = '';
        if (bodyInput) bodyInput.value = '';

        if (typeof loadClubAnnouncements === 'function' && targetClubId) loadClubAnnouncements(targetClubId);
        if (typeof loadAllPublicAnnouncements === 'function') loadAllPublicAnnouncements();
        if (typeof loadDashboardAnnouncements === 'function') loadDashboardAnnouncements();
      } else {
        alert('Failed to post announcement: ' + (data.message || 'Unauthorized or server error'));
      }
    } catch (err) {
      console.error('Network error posting announcement:', err);
      alert('Could not connect to the backend server.');
    }
  });
}