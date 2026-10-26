from database import get_db_connection

def seed_data():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Insert sample clubs (Subsystem 1)
    cursor.execute('''
        INSERT INTO clubs (name, description, contact_email) 
        VALUES (?, ?, ?)
    ''', ("Information Technology Society", "The official organization for BSIT students focused on coding, tech workshops, and networking.", "itsociety@qcu.edu.ph"))

    cursor.execute('''
        INSERT INTO clubs (name, description, contact_email) 
        VALUES (?, ?, ?)
    ''', ("Student Council Alliance", "Central governing student body representing student welfare and campus activities.", "sc@qcu.edu.ph"))

    # Insert sample user for testing login
    cursor.execute('''
        INSERT OR IGNORE INTO users (name, email, password, role) 
        VALUES (?, ?, ?, ?)
    ''', ("Test Student", "student@qcu.edu.ph", "password123", "student"))
    
    conn.commit()
    conn.close()
    print("Sample clubs added successfully!")

if __name__ == '__main__':
    seed_data()