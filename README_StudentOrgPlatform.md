# Student Organization Management Platform

A web-based system that helps student groups manage their members, reserve campus facilities, and track event attendance, all in one place.

---

## Main Objective

The platform brings three everyday campus needs together:

- Managing student councils, organizations, and their members
- Booking campus rooms, equipment, and event spaces with faculty approval
- Scheduling events and tracking attendance with QR codes

Each subsystem is **modular**: it can run on its own, or be combined with the others as one platform.

---

## Subsystems

### Subsystem 1: Membership & Directory System

A simple campus network where student groups and councils can post updates and manage their members.

**Functions**
- Main list of student councils, organizations, and campus groups
- Club profile pages with officer contact info and member lists
- Tool for sending group updates or school-wide announcements

| | |
|---|---|
| **Input** | Club profile details, list of officers, announcement posts |
| **Output** | Public club pages, dashboard alerts, push notifications for members |
| **Standalone** | Works as an online directory and contact list. Admins can add student lists, post updates, and look up club info without venue bookings or event tracking. |

### Subsystem 2: Resource & Facility Booking System

Handles requests for reserving campus rooms, equipment, and event spaces, and routes them to faculty for approval.

**Functions**
- Calendar showing available venues and equipment
- Automatic routing of booking requests to the right faculty member or facility manager
- Email updates when a request is approved or denied

| | |
|---|---|
| **Input** | Booking forms (date, time, venue, equipment needed, event description) |
| **Output** | Approval or rejection emails, locked calendar slots, confirmation receipts |
| **Standalone** | Works as a venue reservation portal. Students or staff submit requests through a form, and managers handle approvals through email and calendar blocks without member rosters or attendance records. |

### Subsystem 3: Event Scheduler & QR Code Attendance

Makes it easy to create events and track who shows up at the door.

**Functions**
- Main calendar for campus and club events
- QR code generator for digital passes and door scanners
- Automatic attendance list generation and basic attendance stats

| | |
|---|---|
| **Input** | Event details (time, speaker, target audience) and QR code scans at the door |
| **Output** | Digital event passes, live attendance lists, summary reports after the event showing all attendees |
| **Standalone** | Works as an independent event check-in system. Organizers set up an event, hand out QR passes, scan IDs at the door, and download attendance spreadsheets without room booking or club directories. |

---

## Tech Stack

### Front End
- **HTML**: page structure
- **CSS**: styling and responsive layout
- **JavaScript**: interactivity, calendar views, API calls (`fetch`), QR scanning

### Back End
- **Python** with **Flask** (or FastAPI): REST API
- **SQLite** for development (can move to PostgreSQL later)

### Libraries / Tools
- `qrcode`: generate QR digital passes
- `html5-qrcode`: scan QR codes in the browser
- `smtplib` / `Flask-Mail`: approval and rejection emails
- `flask-cors`: let the front end call the API
- `openpyxl` or `csv`: export attendance spreadsheets
- FullCalendar (JavaScript): calendar UI

---

## System Architecture

```
┌─────────────────────────────────────────────┐
│          Front End (HTML / CSS / JS)        │
│  Directory  |  Facility Booking  |  Events  │
└──────────────────────┬──────────────────────┘
                       │  REST API (JSON)
┌──────────────────────▼──────────────────────┐
│             Back End (Python / Flask)       │
│  Clubs | Announcements | Bookings | Email   │
│  Events | QR Generation | Attendance        │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│                  Database                   │
└─────────────────────────────────────────────┘
```

Because each subsystem has its own routes and pages, any one can be deployed independently.

---

## Suggested Project Structure

```
student-org-platform/
├── frontend/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js
│   │   ├── directory.js
│   │   ├── booking.js
│   │   └── events.js
│   └── pages/
│       ├── directory.html
│       ├── club-profile.html
│       ├── booking.html
│       ├── events.html
│       └── scanner.html
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── routes/
│   │   ├── directory.py
│   │   ├── booking.py
│   │   └── events.py
│   ├── services/
│   │   ├── email_service.py
│   │   └── qr_service.py
│   └── requirements.txt
└── README.md
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- A modern web browser

### Back End

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The API runs at `http://localhost:5000`.

### Front End

```bash
cd frontend
python -m http.server 8000
```

Then open `http://localhost:8000`.

---

## Example API Endpoints

| Subsystem | Method | Endpoint | Purpose |
|---|---|---|---|
| Directory | GET | `/api/clubs` | List all organizations |
| Directory | GET | `/api/clubs/<id>` | Club profile, officers, members |
| Directory | POST | `/api/announcements` | Post an update |
| Booking | GET | `/api/venues` | List venues and equipment |
| Booking | GET | `/api/bookings/availability` | Calendar availability |
| Booking | POST | `/api/bookings` | Submit a booking request |
| Booking | PATCH | `/api/bookings/<id>/status` | Approve or deny (sends email) |
| Events | GET | `/api/events` | Event calendar |
| Events | POST | `/api/events` | Create an event |
| Events | GET | `/api/events/<id>/pass/<student_id>` | Generate QR pass |
| Events | POST | `/api/events/<id>/scan` | Record attendance from a scan |
| Events | GET | `/api/events/<id>/attendance` | Live attendance list |
| Events | GET | `/api/events/<id>/export` | Download attendance spreadsheet |

---

## User Roles

| Role | What they can do |
|---|---|
| **Admin** | Manage clubs, student lists, venues, and all announcements |
| **Club Officer** | Edit club profile, post updates, request bookings, create events |
| **Faculty / Facility Manager** | Review and approve or deny booking requests |
| **Student** | Browse clubs and events, get QR passes |

---

## Development Roadmap (Phase by Phase)

Each subsystem must work standalone, so they are built one at a time on top of a shared foundation.

### Phase 0: Setup and Foundation
- [ ] Create the folder structure and a Flask app with a test route
- [ ] Design the database tables: `users`, `clubs`, `club_members`, `announcements`, `venues`, `bookings`, `events`, `attendance`
- [ ] Add login with roles (admin, officer, faculty, student)
- [ ] Build one shared layout (navbar, CSS) reused by all pages

**Done when:** you can log in and see an empty dashboard.

### Phase 1: Membership & Directory (Subsystem 1)
- [ ] Club list page with search
- [ ] Club profile page showing officers and members
- [ ] Admin and officer forms to add or edit clubs and members
- [ ] Announcements: officers post, members see them on their dashboard

**Done when:** it works as a standalone directory with no booking or events.

### Phase 2: Facility Booking (Subsystem 2)
- [ ] Venue and equipment list with an availability calendar
- [ ] Booking form (date, time, venue, equipment, description) with conflict checking
- [ ] Faculty approval page with approve and deny buttons
- [ ] Approval and denial emails (Gmail SMTP)
- [ ] Locked calendar slots and confirmation receipt

**Done when:** a student submits a request, faculty approves it, and the slot locks.

### Phase 3: Event Scheduler & QR Attendance (Subsystem 3)
- [ ] Event creation form and event calendar
- [ ] Student registration and QR pass generation
- [ ] Scanner page using the phone camera to record attendance
- [ ] Live attendance list, summary stats, and CSV export

**Done when:** you can run a mock event and download the attendance sheet.

### Phase 4: Integration
- [ ] Let officers book a venue from the event form (Subsystem 3 uses Subsystem 2)
- [ ] Link events to clubs from Subsystem 1 and auto-post announcements for new events
- [ ] Confirm each subsystem still runs when the others are switched off

### Phase 5: Testing, Polish, and Deployment
- [ ] Mobile-friendly design (the scanner runs on phones)
- [ ] Test with sample users for each role and fix bugs
- [ ] Deploy (back end on Render or PythonAnywhere, front end on GitHub Pages or Netlify)
- [ ] Finalize README and documentation

---

## Team

- Juan Miguel Repas
- *(add other members)*

## License

*(Add a license, e.g. MIT, or remove this section.)*
