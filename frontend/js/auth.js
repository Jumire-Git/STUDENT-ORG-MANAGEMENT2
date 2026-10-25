/**
 * auth.js — Role-based Authentication & Session Management
 * Handles mock login for Admin, Club Officer, Faculty, and Student personas.
 */

const MOCK_USERS = {
  admin: {
    key: 'admin',
    name: 'Juan Miguel R.',
    email: 'admin@campus.edu',
    password: 'password123',
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
    name: 'Maria Santos',
    email: 'officer@campus.edu',
    password: 'password123',
    role: 'officer',
    roleTitle: 'Vice President · IEEE Student Branch',
    roleBadge: 'Club Officer',
    badgeClass: 'badge-blue',
    avatar: 'MS',
    organization: 'IEEE Student Branch',
    department: 'College of Engineering',
    description: 'Can manage club profile, submit room/equipment booking requests, and create club events.',
    allowedPages: ['dashboard', 'directory', 'booking', 'events']
  },
  faculty: {
    key: 'faculty',
    name: 'Dr. Roberto Diaz',
    email: 'faculty@campus.edu',
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
    name: 'Alex Rivera',
    email: 'student@campus.edu',
    password: 'password123',
    role: 'student',
    roleTitle: 'Computer Science · 3rd Year',
    roleBadge: 'Student',
    badgeClass: 'badge-green',
    avatar: 'AR',
    studentId: '2024-08192',
    organization: 'General Student Body',
    department: 'College of Computer Studies',
    description: 'Can browse organizations, view public announcements, register for events, and download QR passes.',
    allowedPages: ['dashboard', 'directory', 'events']
  }
};

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

  login(email, password) {
    const found = Object.values(MOCK_USERS).find(
      u => u.email.toLowerCase() === (email || '').trim().toLowerCase() && u.password === password
    );
    if (found) {
      this.setCurrentUser(found.key);
      return { success: true, user: found };
    }
    return { success: false, message: 'Invalid email or password. Use one of the mock credentials below.' };
  },

  switchRole(roleKey) {
    if (MOCK_USERS[roleKey]) {
      this.setCurrentUser(roleKey);
      window.location.reload();
    }
  },

  logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
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
        Auth.setCurrentUser(roleKey);
        window.location.reload();
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

// Auto-run when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Auth.initUI();
});
