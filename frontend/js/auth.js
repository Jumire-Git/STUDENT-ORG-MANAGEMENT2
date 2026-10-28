/**
 * Authentication helper connecting the frontend to the Flask backend database
 * and automatically synchronizing user sessions and permissions across all pages.
 */
const Auth = {
  async login(email, password) {
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.error || 'Invalid email or password.' };
      }
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, message: 'Could not connect to the backend server.' };
    }
  },

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    
    // Handle redirect depending on whether we are in root or /pages/
    const isInsidePages = window.location.pathname.includes('/pages/');
    window.location.href = isInsidePages ? 'login.html' : 'pages/login.html';
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem('currentUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  async fetchCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const res = await fetch('http://localhost:5000/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          return data.user;
        }
      }
    } catch (err) {
      console.error('Session check error:', err);
    }
    return null;
  }
};

window.Auth = Auth;

// ==========================================
// GLOBAL AUTO-SYNC ACROSS ALL PAGES
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // Skip session check if we are on the login page
  if (window.location.pathname.includes('login.html')) return;

  let user = JSON.parse(localStorage.getItem('currentUser'));

  if (window.Auth) {
    const verifiedUser = await Auth.fetchCurrentUser();
    if (verifiedUser) {
      user = verifiedUser;
    }
  }

  if (user) {
    // 1. Update all sidebar user names across any page
    document.querySelectorAll('.auth-user-name, .user-name').forEach(el => {
      el.textContent = user.name;
    });

    // 2. Update all sidebar roles across any page
    document.querySelectorAll('.auth-user-role, .user-role').forEach(el => {
      el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    });

    // 3. Update avatar initials across any page
    document.querySelectorAll('.auth-user-avatar').forEach(el => {
      const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      el.textContent = initials;
    });

    // 4. Update dashboard greeting name if present
    const welcomeName = document.getElementById('welcome-user-name');
    if (welcomeName) {
      welcomeName.textContent = user.name.split(' ')[0];
    }

    // 5. Enforce Student Viewer Mode (Hide action buttons globally)
    if (user.role === 'student') {
      document.querySelectorAll('.admin-only, .officer-only, #btn-add-club, #btn-create-announcement').forEach(el => {
        el.style.display = 'none';
      });
    }

    // 6. Wire up user-card logout dropdown
    _attachUserCardDropdown();

  } else {
    // Not logged in, redirect to login page safely
    const isInsidePages = window.location.pathname.includes('/pages/');
    window.location.href = isInsidePages ? 'login.html' : 'pages/login.html';
  }
});

// ==========================================
// USER-CARD LOGOUT DROPDOWN
// ==========================================
function _attachUserCardDropdown() {
  const userCard = document.querySelector('.user-card');
  if (!userCard) return;

  // Remove the stale "switch roles" title
  userCard.removeAttribute('title');

  const footer = userCard.closest('.sidebar-footer');
  if (footer) footer.style.position = 'relative';

  // Build dropdown (once)
  let dropdown = document.getElementById('user-card-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'user-card-dropdown';
    dropdown.style.cssText = [
      'position:absolute', 'bottom:calc(100% + 8px)', 'left:var(--space-4)',
      'right:var(--space-4)', 'background:var(--color-surface)',
      'border:1px solid var(--color-border)', 'border-radius:var(--radius-md)',
      'box-shadow:0 8px 24px rgba(0,0,0,0.4)', 'padding:var(--space-2)',
      'display:none', 'z-index:200'
    ].join(';');
    dropdown.innerHTML = `
      <button id="btn-user-logout" type="button" style="
        width:100%; display:flex; align-items:center; gap:var(--space-2);
        padding:var(--space-2) var(--space-3); border-radius:var(--radius-sm);
        background:none; border:none; color:#f87171; font-size:13px;
        font-weight:500; cursor:pointer; transition:background 0.15s;
      " onmouseover="this.style.background='rgba(248,113,113,0.1)'"
         onmouseout="this.style.background='none'">
        <i data-lucide="log-out" style="width:14px;height:14px;"></i> Log Out
      </button>
    `;
    if (footer) footer.appendChild(dropdown);
    else document.body.appendChild(dropdown);
  }

  // Re-render lucide icons inside dropdown
  if (window.lucide) lucide.createIcons({ nodes: [dropdown] });

  // Toggle dropdown on user-card click
  userCard.addEventListener('click', (e) => {
    e.stopPropagation();
    const visible = dropdown.style.display === 'block';
    dropdown.style.display = visible ? 'none' : 'block';
  });

  // Logout button
  dropdown.querySelector('#btn-user-logout')?.addEventListener('click', (e) => {
    e.stopPropagation();
    Auth.logout();
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!dropdown.contains(e.target) && !userCard.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  });
}