from flask import Blueprint, jsonify, request
from database import get_db_connection

directory_bp = Blueprint('directory', __name__)

@directory_bp.route('/api/clubs', methods=['GET'])
def get_clubs():
    conn = get_db_connection()
    clubs = conn.execute('SELECT * FROM clubs').fetchall()
    conn.close()
    return jsonify([dict(club) for club in clubs]), 200

@directory_bp.route('/api/clubs/<int:club_id>', methods=['GET'])
def get_club_profile(club_id):
    conn = get_db_connection()
    club = conn.execute('SELECT * FROM clubs WHERE id = ?', (club_id,)).fetchone()
    conn.close()
    
    if not club:
        return jsonify({"error": "Club not found"}), 404
        
    return jsonify(dict(club)), 200