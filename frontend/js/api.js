/**
 * api.js — Shared API utility layer
 * Wraps fetch calls to the Python/Flask backend at http://localhost:5000
 * All functions return Promises.
 */

const API_BASE = 'http://localhost:5000/api';

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint  - e.g. '/clubs'
 * @param {object} options   - fetch options (method, body, headers)
 * @returns {Promise<any>}
 */
async function apiFetch(endpoint, options = {}) {
  const defaultHeaders = { 'Content-Type': 'application/json' };

  // Attach the logged-in user's identity to every request (auth.js loads first)
  if (window.Auth && typeof Auth.getCurrentUser === 'function') {
    const u = Auth.getCurrentUser();
    if (u && u.email) defaultHeaders['X-User-Email'] = u.email;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    });
  } catch (networkErr) {
    // Server down, wrong port, or CORS blocked the request
    console.error(`[API] ${endpoint}: network error`, networkErr);
    throw new Error('Cannot reach the server. Is Flask running on port 5000?');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const reason = body.message || body.error || res.statusText || '';
    const msg = `HTTP ${res.status}${reason ? ' — ' + reason : ''}`;
    console.error(`[API] ${endpoint}:`, msg);
    throw new Error(msg);
  }

  // Handle empty responses (e.g. 204 No Content on DELETE)
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

/* ── Directory ──────────────────────────────────────────────── */
const DirectoryAPI = {
  getClubs:              ()      => apiFetch('/clubs'),
  getClub:               (id)    => apiFetch(`/clubs/${id}`),
  createClub:            (data)  => apiFetch('/clubs',          { method: 'POST',  body: JSON.stringify(data) }),
  updateClub:            (id, d) => apiFetch(`/clubs/${id}`,    { method: 'PUT',   body: JSON.stringify(d) }),
  deleteClub:            (id)    => apiFetch(`/clubs/${id}`,    { method: 'DELETE' }),
  getMembers:            (id)    => apiFetch(`/clubs/${id}/members`),
  addMember:             (id, d) => apiFetch(`/clubs/${id}/members`, { method: 'POST', body: JSON.stringify(d) }),
  removeMember:          (cid, mid) => apiFetch(`/clubs/${cid}/members/${mid}`, { method: 'DELETE' }),
  postAnnouncement:      (data)  => apiFetch('/announcements',  { method: 'POST',  body: JSON.stringify(data) }),
  getAnnouncements:      ()      => apiFetch('/announcements'),
  getClubAnnouncements:  (id)    => apiFetch(`/clubs/${id}/announcements`),
};

/* ── Booking ────────────────────────────────────────────────── */
const BookingAPI = {
  getVenues:         ()      => apiFetch('/venues'),
  getAvailability:   (params) => apiFetch('/bookings/availability?' + new URLSearchParams(params)),
  getBookings:       ()      => apiFetch('/bookings'),
  createBooking:     (data)  => apiFetch('/bookings',           { method: 'POST',  body: JSON.stringify(data) }),
  updateStatus:      (id, s) => apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) }),
};

/* ── Events ─────────────────────────────────────────────────── */
const EventsAPI = {
  getEvents:       ()        => apiFetch('/events'),
  getEvent:        (id)      => apiFetch(`/events/${id}`),
  createEvent:     (data)    => apiFetch('/events',             { method: 'POST',  body: JSON.stringify(data) }),
  getQRPass:       (eid, sid) => apiFetch(`/events/${eid}/pass/${sid}`),
  scanQR:          (eid, d)  => apiFetch(`/events/${eid}/scan`, { method: 'POST',  body: JSON.stringify(d) }),
  getAttendance:   (eid)     => apiFetch(`/events/${eid}/attendance`),
  exportAttendance:(eid)     => `${API_BASE}/events/${eid}/export`,  // direct download URL
};

/* ── Export ─────────────────────────────────────────────────── */
window.apiFetch     = apiFetch;
window.DirectoryAPI = DirectoryAPI;
window.BookingAPI   = BookingAPI;
window.EventsAPI    = EventsAPI;