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

    # 2. Insert Sample Users
    users_data = [
        (1, "Carlo Reyes", "carlo@qcu.edu.ph", "password123", "student"),
        (2, "Ana Santos", "ana@qcu.edu.ph", "password123", "student"),
        (3, "Marco Rivera", "marco@qcu.edu.ph", "password123", "student"),
        (4, "Lea Tan", "lea@qcu.edu.ph", "password123", "student")
    ]
    cursor.executemany('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)', users_data)

    # 3. Link Users to Clubs via club_members table
    memberships = [
        (1, 1, 'President'),   # Carlo -> CSSG
        (1, 2, 'Secretary'),   # Ana -> CSSG
        (1, 3, 'VP External'), # Marco -> CSSG
        (1, 4, 'Treasurer'),   # Lea -> CSSG
        (2, 1, 'Member')       # Carlo -> IT Society
    ]
    cursor.executemany('INSERT INTO club_members (club_id, user_id, role_in_club) VALUES (?, ?, ?)', memberships)

    conn.commit()
    conn.close()
    print("Database seeded successfully with relational schema!")

if __name__ == '__main__':
    seed_data()
 