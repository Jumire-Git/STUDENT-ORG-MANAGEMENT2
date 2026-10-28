import sqlite3
import os

DB_NAME = "database.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row  # Allows accessing columns by name
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table with roles
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'officer', 'faculty', 'student')),
            student_id TEXT,
            year_level TEXT,
            course TEXT
        )
    ''')

    # 2. Clubs / Organizations table (Subsystem 1)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clubs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            contact_email TEXT
        )
    ''')

    # 3. Club Members table (Subsystem 1 - Linking users to clubs with approval status)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS club_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role_in_club TEXT DEFAULT 'Member',
            status TEXT DEFAULT 'Approved' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (club_id, user_id),
            FOREIGN KEY (club_id) REFERENCES clubs (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # 4. Announcements table (Subsystem 1)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            club_id INTEGER,
            user_id INTEGER,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            visibility TEXT DEFAULT 'public' CHECK(visibility IN ('public', 'members_only')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (club_id) REFERENCES clubs (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # 5. Venues & Equipment table (Subsystem 2)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS venues (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('Room', 'Equipment', 'Space')),
            capacity INTEGER,
            approver_email TEXT
        )
    ''')

    # 6. Bookings table (Subsystem 2)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venue_id INTEGER,
            user_id INTEGER,
            event_description TEXT,
            start_time TEXT,
            end_time TEXT,
            status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
            FOREIGN KEY (venue_id) REFERENCES venues (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # 7. Events table (Subsystem 3)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            speaker TEXT,
            start_time TEXT,
            venue TEXT
        )
    ''')

    # 8. Attendance table (Subsystem 3)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER,
            user_id INTEGER,
            scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES events (id),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    conn.commit()
    conn.close()
    print("All Phase 0 database tables initialized successfully!")

if __name__ == '__main__':
    init_db()