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
    document.querySelectorAll('.sidebar-footer strong, .user-name').forEach(el => {
      el.textContent = user.name;
    });

    // 2. Update all sidebar roles across any page
    document.querySelectorAll('.sidebar-footer span:not(.user-name), .user-role').forEach(el => {
      el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    });

    // 3. Update avatar initials across any page
    document.querySelectorAll('.sidebar-footer .avatar, .user-avatar').forEach(el => {
      const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      el.textContent = initials;
    });

    // 4. Update dashboard greeting if present
    const greetingH2 = document.querySelector('.dashboard-card h2, h2.welcome-title');
    if (greetingH2 && greetingH2.textContent.includes('Good day')) {
      greetingH2.textContent = `Good day, ${user.name.split(' ')[0]}`;
    }

    // 5. Enforce Student Viewer Mode (Hide action buttons globally)
    if (user.role === 'student') {
      document.querySelectorAll('.admin-only, .officer-only, #btn-add-club, #btn-create-announcement').forEach(el => {
        el.style.display = 'none';
      });
    }
  } else {
    // Not logged in, redirect to login page safely
    const isInsidePages = window.location.pathname.includes('/pages/');
    window.location.href = isInsidePages ? 'login.html' : 'pages/login.html';
  }
});