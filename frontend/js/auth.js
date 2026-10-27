/**
 * auth.js — Role-based Authentication & Session Management
 * Real login against the Flask API (token saved in localStorage) with persona profiles for the UI.
 */

const MOCK_USERS = {
  // Each persona is a real account created by backend/seed.py. DEV ONLY: remove the
  // passwords (and the persona switcher) before deploying anywhere real.
  admin: {
    key: 'admin',
    name: 'Juan Miguel R.',
    email: 'admin@qcu.edu.ph',
    password: 'admin123',
    role: 'admin',
    roleTitle: 'System Administrator',
    roleBadge: 'Admin',
    badgeClass: 'badge-purple',
    avatar: 'JM',
    organization: 'Campus Administration',
    department: 'Office of Student Affairs',
    description: 'Full system privileges across all 3 subsystems.',
    allowedPages: ['dashboard', 'directory', 'booking', 'events', 'scanner']
  },
  officer: {
    key: 'officer',
    name: 'Carlo Reyes',
    email: 'carlo@qcu.edu.ph',
    password: 'password123',
    role: 'officer',
    roleTitle: 'President · CSSG',
    roleBadge: 'Club President',
    badgeClass: 'badge-blue',
    avatar: 'CR',
    organization: 'Computer Science Society of the Philippines',
    department: 'College of Computer Studies',
    description: 'President of CSSG: can manage CSSG members and assign officer roles.',
    allowedPages: ['dashboard', 'directory', 'booking', 'events']
  },
  secretary: {
    key: 'secretary',
    name: 'Ana Santos',
    email: 'ana@qcu.edu.ph',
    password: 'password123',
    role: 'officer',
    roleTitle: 'Secretary · CSSG',
    roleBadge: 'Club Secretary',
    badgeClass: 'badge-blue',
    avatar: 'AS',
    organization: 'Computer Science Society of the Philippines',
    department: 'College of Computer Studies',
    description: 'Secretary of CSSG: can manage regular CSSG members, but not officers or roles.',
    allowedPages: ['dashboard', 'directory', 'booking', 'events']
  },
  faculty: {
    key: 'faculty',
    name: 'Dr. Roberto Diaz',
    email: 'faculty@qcu.edu.ph',
    password: 'password123',
    role: 'faculty',
    roleTitle: 'Facility Director & Faculty Advisor',
    roleBadge: 'Faculty Approver',
    badgeClass: 'badge-amber',
    avatar: 'RD',
    organization: 'Campus Facilities Board',
    department: 'Facilities & Resource Planning',
    description: 'Reviews and approves/denies venue and equipment reservations across campus.',
    allowedPages: ['dashboard', 'booking']
  },
  student: {
    key: 'student',
    name: 'Paolo Dizon',
    email: 'paolo@qcu.edu.ph',
    password: 'password123',
    role: 'student',
    roleTitle: 'Computer Science · 2nd Year',
    roleBadge: 'Student',
    badgeClass: 'badge-green',
    avatar: 'PD',
    studentId: '2024-0311',
    organization: 'General Student Body',
    department: 'College of Computer Studies',
    description: 'Can browse organizations, view public announcements, register for events, and download QR passes.',
    allowedPages: ['dashboard', 'directory', 'events']
  }
};

// Distinctive names on purpose, so they can't clash with constants in api.js / app-state.js
const AUTH_API_URL = 'http://localhost:5000';
const AUTH_TOKEN_KEY = 'token';   // club-profile.html reads this same key

const AUTH_STORAGE_KEY = 'student_org_auth_user';

const Auth = {
  getMockUsers() {
    return MOCK_USERS;
  },

  getCurrentUser() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (MOCK_USERS[parsed.key]) {
          return MOCK_USERS[parsed.key];
        }
      }
    } catch (e) {
      console.warn('Error reading auth state:', e);
    }
    // Default to admin if nothing is saved
    return MOCK_USERS.admin;
  },

  setCurrentUser(userKey) {
    const user = MOCK_USERS[userKey];
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  getToken() {
    try { return localStorage.getItem(AUTH_TOKEN_KEY); } catch (e) { return null; }
  },

  hasToken() {
    return !!this.getToken();
  },

  // Real sign-in: the backend checks the password and returns a signed token.
  async login(email, password) {
    try {
      const res = await fetch(`${AUTH_API_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: (email || '').trim(), password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, message: data.error || 'Invalid email or password.' };
      }

      // The UI needs a profile (name, badge, allowed pages) for this account
      const persona = Object.values(MOCK_USERS).find(
        u => u.email.toLowerCase() === data.user.email.toLowerCase()
      );
      if (!persona) {
        return { success: false, message: 'This account has no profile in MOCK_USERS (auth.js) yet.' };
      }

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      this.setCurrentUser(persona.key);
      return { success: true, user: persona };
    } catch (e) {
      console.error('Login failed:', e);
      return { success: false, message: 'Cannot reach the server. Is the backend running on port 5000?' };
    }
  },

  // Persona switcher: signs in as that persona's real account, so the backend agrees with the UI
  async switchRole(roleKey) {
    const persona = MOCK_USERS[roleKey];
    if (!persona) return;
    const result = await this.login(persona.email, persona.password);
    if (result.success) {
      window.location.reload();
    } else {
      alert(result.message);
    }
  },

  // Send anyone who isn't signed in to the login page
  requireLogin() {
    const onLoginPage = window.location.pathname.endsWith('login.html');
    if (onLoginPage || this.hasToken()) return true;
    const isInPages = window.location.pathname.includes('/pages/');
    window.location.replace(isInPages ? '../pages/login.html' : 'pages/login.html');
    return false;
  },

  // If the saved token expired (12 h) or is invalid, sign out instead of showing a half-working page
  async verifySession() {
    if (window.location.pathname.endsWith('login.html') || !this.hasToken()) return;
    try {
      const res = await fetch(`${AUTH_API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      if (res.status === 401) this.logout();
    } catch (e) {
      /* backend offline: leave the session alone */
    }
  },

  logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    // Determine path to login.html depending on whether we are in /pages or root
    const isInPages = window.location.pathname.includes('/pages/');
    const loginUrl = isInPages ? '../pages/login.html' : 'pages/login.html';
    window.location.href = loginUrl;
  },

  initUI() {
    const user = this.getCurrentUser();
    if (!user) return;

    // 1. Update text elements
    document.querySelectorAll('.auth-user-name').forEach(el => el.textContent = user.name);
    document.querySelectorAll('.auth-user-role').forEach(el => el.textContent = user.roleBadge);
    document.querySelectorAll('.auth-user-title').forEach(el => el.textContent = user.roleTitle);
    document.querySelectorAll('.auth-user-email').forEach(el => el.textContent = user.email);
    document.querySelectorAll('.auth-user-avatar').forEach(el => el.textContent = user.avatar);
    
    // Dynamic welcome headers
    const welcomeName = document.getElementById('welcome-user-name');
    if (welcomeName) {
      welcomeName.textContent = user.name;
    }
    const welcomeRoleDesc = document.getElementById('welcome-role-desc');
    if (welcomeRoleDesc) {
      welcomeRoleDesc.textContent = user.description;
    }

    // 2. Apply role visibility guards: [data-roles="admin,officer"]
    document.querySelectorAll('[data-roles]').forEach(el => {
      const allowedRoles = el.getAttribute('data-roles').split(',').map(s => s.trim().toLowerCase());
      if (allowedRoles.includes(user.role.toLowerCase())) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });

    // 3. Attach interactive Role Switcher modal/menu to sidebar user card
    this.attachRoleSwitcherWidget(user);
  },

  attachRoleSwitcherWidget(currentUser) {
    const userCard = document.querySelector('.user-card');
    if (!userCard) return;

    // Make sure container has relative positioning
    const footer = userCard.closest('.sidebar-footer');
    if (footer) {
      footer.style.position = 'relative';
    }

    // Create dropdown container if not already present
    let dropdown = document.getElementById('role-switcher-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'role-switcher-dropdown';
      dropdown.className = 'role-switcher-menu';
      dropdown.innerHTML = `
        <div class="role-menu-header">
          <div class="role-menu-title">Switch Account Persona</div>
          <div class="role-menu-sub">Test the platform as another user role</div>
        </div>
        <div class="role-menu-list">
          ${Object.values(MOCK_USERS).map(u => `
            <button type="button" class="role-menu-item ${u.key === currentUser.key ? 'active' : ''}" data-role-key="${u.key}">
              <div class="avatar avatar-sm ${u.key === currentUser.key ? 'avatar-active' : ''}">${u.avatar}</div>
              <div class="role-menu-info">
                <div class="role-menu-name">
                  <span>${u.name}</span>
                  <span class="role-badge-tag ${u.badgeClass}">${u.roleBadge}</span>
                </div>
                <div class="role-menu-desc">${u.roleTitle}</div>
              </div>
              ${u.key === currentUser.key ? '<i data-lucide="check" style="width:14px;height:14px;color:var(--color-accent);margin-left:auto;"></i>' : ''}
            </button>
          `).join('')}
        </div>
        <div class="role-menu-footer">
          <button type="button" id="btn-menu-logout" class="role-logout-btn">
            <i data-lucide="log-out" style="width:14px;height:14px;"></i> Log Out to Login Page
          </button>
        </div>
      `;

      if (footer) {
        footer.appendChild(dropdown);
      }
    }

    // Toggle dropdown on user-card click
    userCard.setAttribute('title', 'Click to switch roles or log out');
    userCard.style.cursor = 'pointer';
    userCard.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdown.classList.contains('show');
      dropdown.classList.toggle('show', !isVisible);
      if (window.lucide && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
      }
    });

    // Handle switching
    dropdown.querySelectorAll('[data-role-key]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roleKey = btn.getAttribute('data-role-key');
        Auth.switchRole(roleKey);
      });
    });

    // Handle logout
    const logoutBtn = dropdown.querySelector('#btn-menu-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        Auth.logout();
      });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !userCard.contains(e.target)) {
        dropdown.classList.remove('show');
      }
    });
  }
};

window.Auth = Auth;
window.MOCK_USERS = MOCK_USERS;

// Not signed in? Go to the login page right away (before the page is shown)
Auth.requireLogin();

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.initUI();
  Auth.verifySession();
});
