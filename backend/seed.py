from werkzeug.security import generate_password_hash
from database import get_db_connection, init_db


def seed_data():
    init_db()  # Ensure tables exist before seeding
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing data safely (in order of foreign key dependencies)
    cursor.execute('DELETE FROM club_members')
    cursor.execute('DELETE FROM announcements')
    cursor.execute('DELETE FROM clubs')
    cursor.execute('DELETE FROM users')

    # 1. Insert Clubs
    cursor.execute('INSERT INTO clubs (id, name, description, contact_email) VALUES (?, ?, ?, ?)',
                   (1, "Computer Science Society of the Philippines", "CSSG is the premier organization for computer science students on campus.", "cssg@qcu.edu.ph"))
    cursor.execute('INSERT INTO clubs (id, name, description, contact_email) VALUES (?, ?, ?, ?)',
                   (2, "Information Technology Society", "The official organization for BSIT students focused on coding and tech workshops.", "itsociety@qcu.edu.ph"))

    # 2. Insert Sample Users  (global role: admin or student; club powers come from club_members)
    #    id, name, email, plain password, global role, student_id, year, course
    users_data = [
        (1, "Carlo Reyes",   "carlo@qcu.edu.ph",  "password123", "student", "2022-0101", "4th Year", "BS Computer Science"),
        (2, "Ana Santos",    "ana@qcu.edu.ph",    "password123", "student", "2022-0102", "4th Year", "BS Computer Science"),
        (3, "Marco Rivera",  "marco@qcu.edu.ph",  "password123", "student", "2023-0215", "3rd Year", "BS Information Technology"),
        (4, "Lea Tan",       "lea@qcu.edu.ph",    "password123", "student", "2023-0230", "3rd Year", "BS Information Technology"),
        (5, "Paolo Dizon",   "paolo@qcu.edu.ph",  "password123", "student", "2024-0311", "2nd Year", "BS Computer Science"),
        (6, "Juan Miguel Repas", "admin@qcu.edu.ph", "admin123", "admin",  None, None, None),
        (7, "Dr. Roberto Diaz", "faculty@qcu.edu.ph", "password123", "faculty", None, None, None),
    ]
    cursor.executemany(
        'INSERT INTO users (id, name, email, password, role, student_id, year_level, course) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [(i, n, e, generate_password_hash(pw), r, s, y, c) for i, n, e, pw, r, s, y, c in users_data]
    )

    # 3. Link Users to Clubs:  (club_id, user_id, role_in_club)
    memberships = [
        (1, 1, 'President'),    # Carlo  -> CSSG president (but only a Member of IT Society)
        (1, 2, 'Secretary'),    # Ana    -> CSSG secretary
        (1, 3, 'VP External'),  # Marco  -> officer, but NOT a manager
        (1, 4, 'Treasurer'),    # Lea    -> officer, but NOT a manager
        (1, 5, 'Member'),       # Paolo  -> plain member
        (2, 1, 'Member'),       # Carlo  -> IT Society member
    ]
    cursor.executemany('INSERT INTO club_members (club_id, user_id, role_in_club) VALUES (?, ?, ?)', memberships)

    conn.commit()
    conn.close()
    print("Database seeded successfully with relational schema!")


if __name__ == '__main__':
    seed_data()
