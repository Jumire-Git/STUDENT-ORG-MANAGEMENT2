from werkzeug.security import generate_password_hash
from database import get_db_connection, init_db


def seed_data():
    init_db()  # Ensure tables exist before seeding
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing data safely (in order of foreign key dependencies)
    cursor.execute('DELETE FROM attendance')
    cursor.execute('DELETE FROM events')
    cursor.execute('DELETE FROM bookings')
    cursor.execute('DELETE FROM venues')
    cursor.execute('DELETE FROM club_members')
    cursor.execute('DELETE FROM announcements')
    cursor.execute('DELETE FROM clubs')
    cursor.execute('DELETE FROM users')

    # 1. Insert Clubs
    cursor.execute('INSERT INTO clubs (id, name, description, contact_email) VALUES (?, ?, ?, ?)',
                   (1, "Computer Science Society of the Philippines", "CSSG is the premier organization for computer science students on campus.", "cssg@qcu.edu.ph"))
    cursor.execute('INSERT INTO clubs (id, name, description, contact_email) VALUES (?, ?, ?, ?)',
                   (2, "Information Technology Society", "The official organization for BSIT students focused on coding and tech workshops.", "itsociety@qcu.edu.ph"))

    # 2. Insert Sample Users (Carlo & Ana updated to 'officer' system role)
    users_data = [
        (1, "Carlo Reyes",   "carlo@qcu.edu.ph",  "password123", "officer", "2022-0101", "4th Year", "BS Computer Science"),
        (2, "Ana Santos",    "ana@qcu.edu.ph",    "password123", "officer", "2022-0102", "4th Year", "BS Computer Science"),
        (3, "Marco Rivera",  "marco@qcu.edu.ph",  "password123", "student", "2023-0215", "3rd Year", "BS Information Technology"),
        (4, "Lea Tan",       "lea@qcu.edu.ph",    "password123", "student", "2023-0230", "3rd Year", "BS Information Technology"),
        (5, "Paolo Dizon",   "paolo@qcu.edu.ph",  "password123",     "student", "2024-0311", "2nd Year", "BS Computer Science"),
        (6, "Juan Miguel Repas", "admin@qcu.edu.ph", "admin123", "admin",  None, None, None),
        (7, "Dr. Roberto Diaz", "faculty@qcu.edu.ph", "password123", "faculty", None, None, None),
    ]
    cursor.executemany(
        'INSERT INTO users (id, name, email, password, role, student_id, year_level, course) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [(i, n, e, generate_password_hash(pw), r, s, y, c) for i, n, e, pw, r, s, y, c in users_data]
    )

    # 3. Link Users to Clubs
    memberships = [
        (1, 1, 'President'),
        (1, 2, 'Secretary'),
        (1, 3, 'VP External'),
        (1, 4, 'Treasurer'),
        (1, 5, 'Member'),
        (2, 1, 'Member'),
        (2, 3, 'President'),
    ]
    cursor.executemany('INSERT INTO club_members (club_id, user_id, role_in_club) VALUES (?, ?, ?)', memberships)

    # 4. Insert Venues & Equipment
    venues_data = [
        (1, 'Auditorium A', 'Room', 500, 'faculty@qcu.edu.ph'),
        (2, 'MPH Room B', 'Room', 120, 'faculty@qcu.edu.ph'),
        (3, 'MPH Room C', 'Room', 80, 'faculty@qcu.edu.ph'),
        (4, 'Computer Lab 3', 'Room', 40, 'faculty@qcu.edu.ph'),
        (5, 'Campus Quadrangle', 'Space', 2000, 'faculty@qcu.edu.ph'),
        (6, 'Projector Set', 'Equipment', 4, 'faculty@qcu.edu.ph'),
        (7, 'AVR Room', 'Room', 120, 'faculty@qcu.edu.ph'),
        (8, 'Audio Equipment', 'Equipment', 10, 'faculty@qcu.edu.ph'),
    ]
    cursor.executemany(
        'INSERT INTO venues (id, name, type, capacity, approver_email) VALUES (?, ?, ?, ?, ?)',
        venues_data
    )

    # 5. Insert Sample Bookings (venue_id, user_id, event_description, start_time, end_time, status)
    bookings_data = [
        (1, 1, 'Tech Summit Keynote', 'Nov 3, 2026 1:00 PM', 'Nov 3, 2026 5:00 PM', 'Pending'),
        (3, 2, 'Workshop: PCB Design', 'Nov 5, 2026 3:00 PM', 'Nov 5, 2026 6:00 PM', 'Pending'),
        (6, 3, 'First Aid Seminar', 'Nov 8, 2026 8:00 AM', 'Nov 8, 2026 12:00 PM', 'Pending'),
        (7, 4, 'CPA Review Webinar', 'Nov 22, 2026 1:00 PM', 'Nov 22, 2026 4:00 PM', 'Approved'),
        (4, 5, 'Robot Sprint', 'Nov 15, 2026 9:00 AM', 'Nov 15, 2026 5:00 PM', 'Approved'),
    ]
    cursor.executemany(
        'INSERT INTO bookings (venue_id, user_id, event_description, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)',
        bookings_data
    )

    conn.commit()
    conn.close()
    print("Database seeded successfully with venues, bookings, and relational schema!")


if __name__ == '__main__':
    seed_data()