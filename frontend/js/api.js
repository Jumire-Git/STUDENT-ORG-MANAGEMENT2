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
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    console.error(`[API] ${endpoint}:`, err.message);
    throw err;
  }
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
window.DirectoryAPI = DirectoryAPI;
window.BookingAPI   = BookingAPI;
window.EventsAPI    = EventsAPI;
